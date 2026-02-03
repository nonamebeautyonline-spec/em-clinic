// app/api/reorder/apply/route.ts
// DB-first + バックグラウンドGAS同期
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

// バックグラウンドGAS同期
async function syncToGasInBackground(patientId: string, productCode: string, dbId: number) {
  if (!GAS_REORDER_URL) {
    console.log("[reorder/apply] GAS sync skipped (no URL)");
    return;
  }

  try {
    console.log(`[reorder/apply] Starting GAS sync for patient=${patientId}, dbId=${dbId}`);

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
      console.error(`[reorder/apply] GAS sync failed for dbId=${dbId}:`, gasRes.status, text);
      return;
    }

    // GASから行番号が返された場合、DBを更新
    if (gasJson.rowNumber) {
      const { error: updateError } = await supabaseAdmin
        .from("reorders")
        .update({ gas_row_number: gasJson.rowNumber })
        .eq("id", dbId);

      if (updateError) {
        console.error(`[reorder/apply] Failed to update gas_row_number for dbId=${dbId}:`, updateError);
      } else {
        console.log(`[reorder/apply] GAS sync complete: dbId=${dbId}, gasRow=${gasJson.rowNumber}`);
      }
    } else {
      console.log(`[reorder/apply] GAS sync complete (no rowNumber returned): dbId=${dbId}`);
    }
  } catch (err) {
    console.error(`[reorder/apply] GAS sync exception for dbId=${dbId}:`, err);
  }
}

export async function POST(req: NextRequest) {
  try {
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
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    if (existingReorder) {
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

    // ★ DB-first: まずDBに書き込み（gas_row_numberは後で更新）
    // 仮のgas_row_numberを生成（DBの最大値+1）
    const { data: maxRow } = await supabaseAdmin
      .from("reorders")
      .select("gas_row_number")
      .order("gas_row_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const tempRowNumber = (maxRow?.gas_row_number || 1) + 1;

    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from("reorders")
      .insert({
        patient_id: patientId,
        product_code: productCode,
        status: "pending",
        line_uid: lineUid || null,
        gas_row_number: tempRowNumber,
      })
      .select("id")
      .single();

    if (dbError || !insertedData) {
      console.error("[reorder/apply] DB insert error:", dbError);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    const dbId = insertedData.id;
    console.log(`[reorder/apply] DB insert success: id=${dbId}, patient=${patientId}`);

    // ★ キャッシュ削除（即時）
    await invalidateDashboardCache(patientId);

    // ★ バックグラウンドでGAS同期（レスポンスを待たない）
    syncToGasInBackground(patientId, productCode, dbId).catch((err) => {
      console.error("[reorder/apply] Background GAS sync error:", err);
    });

    // ★ 7.5mg初回申請チェック → LINE通知（非同期）
    if (productCode.includes("7.5mg")) {
      (async () => {
        try {
          const { data: prev75Orders, error: prev75Error } = await supabaseAdmin
            .from("orders")
            .select("id")
            .eq("patient_id", patientId)
            .like("product_code", "%7.5mg%")
            .limit(1);

          if (prev75Error) {
            console.error("[reorder/apply] 7.5mg history check error:", prev75Error);
          } else if (!prev75Orders || prev75Orders.length === 0) {
            console.log(`[reorder/apply] First 7.5mg request for patient=${patientId}`);
            const alertText = `⚠️【7.5mg 初回申請】⚠️

患者ID: ${patientId}
商品: ${productCode}

この患者は7.5mgの処方歴がありません。
承認前にご確認ください。`;

            await pushToAdminGroup(alertText);
          }
        } catch (err) {
          console.error("[reorder/apply] 7.5mg check exception:", err);
        }
      })();
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("POST /api/reorder/apply error", e);
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}
