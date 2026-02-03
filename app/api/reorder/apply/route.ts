// app/api/reorder/apply/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";

const GAS_REORDER_URL = process.env.GAS_REORDER_URL;
const LINE_NOTIFY_CHANNEL_ACCESS_TOKEN = process.env.LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || "";
const LINE_ADMIN_GROUP_ID = process.env.LINE_ADMIN_GROUP_ID || "";

// LINE通知送信
async function pushToAdminGroup(text: string) {
  if (!LINE_NOTIFY_CHANNEL_ACCESS_TOKEN || !LINE_ADMIN_GROUP_ID) {
    console.log("[reorder/apply] LINE notification skipped (missing config)");
    return;
  }

  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_NOTIFY_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: LINE_ADMIN_GROUP_ID,
        messages: [{ type: "text", text }],
      }),
      cache: "no-store",
    });

    const body = await res.text();
    console.log("[reorder/apply] LINE push status=", res.status, "body=", body);
  } catch (err) {
    console.error("[reorder/apply] LINE push error:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!GAS_REORDER_URL) {
      console.error("GAS_REORDER_URL missing");
      return NextResponse.json(
        { ok: false, error: "server_config_error" },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const patientId =
      cookieStore.get("__Host-patient_id")?.value ||
      cookieStore.get("patient_id")?.value ||
      "";
    const lineUid =
      cookieStore.get("__Host-line_user_id")?.value ||
      cookieStore.get("line_user_id")?.value ||
      "";

    if (!patientId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({} as any));
    const productCode = body.productCode as string | undefined;
    if (!productCode) {
      return NextResponse.json({ ok: false, error: "productCode_required" }, { status: 400 });
    }

    // ★ 重複申請チェック: pending or confirmed の申請があれば拒否
    try {
      const { data: existingReorder, error: checkError } = await supabaseAdmin
        .from("reorders")
        .select("id, status, product_code")
        .eq("patient_id", patientId)
        .in("status", ["pending", "confirmed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkError) {
        console.error("[reorder/apply] Duplicate check error:", checkError);
      } else if (existingReorder) {
        console.log(`[reorder/apply] Duplicate blocked: patient=${patientId}, existing status=${existingReorder.status}`);
        return NextResponse.json(
          {
            ok: false,
            error: "duplicate_pending",
            message: "すでに処理中の再処方申請があります。キャンセルまたは決済完了後に再度お申し込みください。"
          },
          { status: 400 }
        );
      }
    } catch (dupErr) {
      console.error("[reorder/apply] Duplicate check exception:", dupErr);
    }

    // ★ GASに書き込み（既存処理）
    const gasRes = await fetch(GAS_REORDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "apply",
        patient_id: patientId,
        product_code: productCode,
      }),
      cache: "no-store",
    });

    const text = await gasRes.text().catch(() => "");
    let gasJson: any = {};
    try {
      gasJson = text ? JSON.parse(text) : {};
    } catch {
      gasJson = {};
    }

    if (!gasRes.ok || gasJson.ok === false) {
      console.error("GAS reorder apply error:", gasRes.status);
      return NextResponse.json({ ok: false, error: "gas_error" }, { status: 500 });
    }

    // ★ Supabaseにも書き込み（並列管理）
    try {
      // GASから行番号が返される場合はそれを使用、なければDBの最大値+1
      let rowNumber = gasJson.rowNumber;
      if (!rowNumber) {
        const { data: maxRow } = await supabaseAdmin
          .from("reorders")
          .select("gas_row_number")
          .order("gas_row_number", { ascending: false })
          .limit(1)
          .single();
        rowNumber = (maxRow?.gas_row_number || 1) + 1;
      }

      const { error: dbError } = await supabaseAdmin
        .from("reorders")
        .insert({
          patient_id: patientId,
          product_code: productCode,
          status: "pending",
          line_uid: lineUid || null,
          gas_row_number: rowNumber,
        });

      if (dbError) {
        console.error("[reorder/apply] Supabase insert error:", dbError);
      } else {
        console.log(`[reorder/apply] Supabase insert success, row=${rowNumber}`);
      }
    } catch (dbErr) {
      console.error("[reorder/apply] Supabase exception:", dbErr);
    }

    // ★ 7.5mg初回申請チェック → LINE通知
    if (productCode.includes("7.5mg")) {
      try {
        // 過去の7.5mg注文履歴を確認
        const { data: prev75Orders, error: prev75Error } = await supabaseAdmin
          .from("orders")
          .select("id")
          .eq("patient_id", patientId)
          .like("product_code", "%7.5mg%")
          .limit(1);

        if (prev75Error) {
          console.error("[reorder/apply] 7.5mg history check error:", prev75Error);
        } else if (!prev75Orders || prev75Orders.length === 0) {
          // 7.5mg初回申請 → 警告付きLINE通知
          console.log(`[reorder/apply] First 7.5mg request for patient=${patientId}`);
          const alertText = `⚠️【7.5mg 初回申請】⚠️

患者ID: ${patientId}
商品: ${productCode}

この患者は7.5mgの処方歴がありません。
承認前にご確認ください。`;

          pushToAdminGroup(alertText).catch(() => {});
        }
      } catch (err) {
        console.error("[reorder/apply] 7.5mg check exception:", err);
      }
    }

    // ★ キャッシュ削除（再処方申請時）
    await invalidateDashboardCache(patientId);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    console.error("POST /api/reorder/apply error");
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}
