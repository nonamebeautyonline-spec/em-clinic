// app/api/reorder/apply/route.ts
// DB + LINE完結（GAS同期なし）
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantId, withTenant, tenantPayload } from "@/lib/tenant";
import { getSettingOrEnv } from "@/lib/settings";

// LINE Flex Message（承認・却下ボタン付き）を送信
async function sendReorderNotification(
  patientId: string,
  patientName: string,
  productCode: string,
  reorderNumber: number,
  history: string,
  notifyToken: string,
  adminGroupId: string
) {
  if (!notifyToken || !adminGroupId) {
    console.log("[reorder/apply] LINE notification skipped (missing config)");
    return;
  }

  try {
    // 商品名を見やすく
    const productLabel = productCode
      .replace("MJL_", "マンジャロ ")
      .replace("_", " ")
      .replace("1m", "1ヶ月")
      .replace("2m", "2ヶ月")
      .replace("3m", "3ヶ月");

    const flexMessage = {
      type: "flex",
      altText: `【再処方申請】${patientName}`,
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: "再処方申請",
              weight: "bold",
              size: "lg",
              color: "#1DB446"
            }
          ],
          backgroundColor: "#F0FFF0"
        },
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: `氏名: ${patientName}`,
              size: "md",
              weight: "bold",
              wrap: true
            },
            {
              type: "text",
              text: `患者ID: ${patientId}`,
              size: "sm",
              color: "#666666",
              margin: "sm"
            },
            {
              type: "text",
              text: `申請: ${productLabel}`,
              size: "md",
              wrap: true,
              margin: "md"
            },
            {
              type: "separator",
              margin: "md"
            },
            {
              type: "text",
              text: "過去の処方歴:",
              size: "sm",
              color: "#666666",
              margin: "md"
            },
            {
              type: "text",
              text: history || "なし",
              size: "sm",
              wrap: true,
              margin: "sm"
            },
            {
              type: "text",
              text: `申請ID: ${reorderNumber}`,
              size: "xs",
              color: "#999999",
              margin: "md"
            }
          ]
        },
        footer: {
          type: "box",
          layout: "horizontal",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#1DB446",
              action: {
                type: "postback",
                label: "承認",
                data: `reorder_action=approve&reorder_id=${reorderNumber}`
              }
            },
            {
              type: "button",
              style: "secondary",
              action: {
                type: "postback",
                label: "却下",
                data: `reorder_action=reject&reorder_id=${reorderNumber}`
              }
            }
          ]
        }
      }
    };

    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notifyToken}`,
      },
      body: JSON.stringify({
        to: adminGroupId,
        messages: [flexMessage],
      }),
      cache: "no-store",
    });

    const body = await res.text();
    console.log(`[reorder/apply] LINE flex push status=${res.status} reorderNum=${reorderNumber}`);
    if (!res.ok) {
      console.error("[reorder/apply] LINE push failed:", body);
    }
  } catch (err) {
    console.error("[reorder/apply] LINE push error:", err);
  }
}

// テキスト通知（7.5mg警告用）
async function pushTextToAdminGroup(text: string, notifyToken: string, adminGroupId: string) {
  if (!notifyToken || !adminGroupId) {
    return;
  }

  try {
    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${notifyToken}`,
      },
      body: JSON.stringify({
        to: adminGroupId,
        messages: [{ type: "text", text }],
      }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[reorder/apply] LINE text push error:", err);
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

    const tenantId = resolveTenantId(req);
    const tid = tenantId ?? undefined;

    // LINE通知用トークンを動的取得
    const LINE_NOTIFY_TOKEN = (await getSettingOrEnv("line", "notify_channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tid)) || "";
    const LINE_ADMIN_GROUP_ID = (await getSettingOrEnv("line", "admin_group_id", "LINE_ADMIN_GROUP_ID", tid)) || "";

    const body = await req.json().catch(() => ({} as any));
    const productCode = body.productCode as string | undefined;
    if (!productCode) {
      return NextResponse.json({ ok: false, error: "productCode_required" }, { status: 400 });
    }

    // ★ NG患者は再処方申請不可（statusがnullのレコードを除外）
    {
      const { data: intakeRow } = await withTenant(
        supabaseAdmin
          .from("intake")
          .select("status")
          .eq("patient_id", patientId)
          .not("status", "is", null),
        tenantId
      )
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intakeRow?.status === "NG") {
        console.log(`[reorder/apply] NG患者の再処方申請をブロック: patient_id=${patientId}`);
        return NextResponse.json(
          { ok: false, error: "ng_patient", message: "処方不可と判定されているため、再処方を申請できません。再度診察予約をお取りください。" },
          { status: 403 }
        );
      }
    }

    // ★ 重複申請チェック: pending or confirmed の申請があれば拒否
    const { data: existingReorder, error: checkError } = await withTenant(
      supabaseAdmin
        .from("reorders")
        .select("id, status, product_code")
        .eq("patient_id", patientId)
        .in("status", ["pending", "confirmed"]),
      tenantId
    )
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

    // ★ DB: reorder_numberを生成（DBの最大値+1）
    const { data: maxRow } = await withTenant(
      supabaseAdmin
        .from("reorders")
        .select("reorder_number"),
      tenantId
    )
      .order("reorder_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const reorderNumber = (maxRow?.reorder_number || 1) + 1;

    const { data: insertedData, error: dbError } = await supabaseAdmin
      .from("reorders")
      .insert({
        patient_id: patientId,
        product_code: productCode,
        status: "pending",
        line_uid: lineUid || null,
        reorder_number: reorderNumber,
        ...tenantPayload(tenantId),
      })
      .select("id")
      .single();

    if (dbError || !insertedData) {
      console.error("[reorder/apply] DB insert error:", dbError);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    const dbId = insertedData.id;
    console.log(`[reorder/apply] DB insert success: id=${dbId}, reorder_num=${reorderNumber}, patient=${patientId}`);

    // ★ キャッシュ削除（即時）
    await invalidateDashboardCache(patientId);

    // ★ 患者名と処方歴を取得してLINE通知を送信（非同期）
    (async () => {
      try {
        // 患者名を取得（patientsテーブルから）
        const { data: patientData } = await withTenant(
          supabaseAdmin
            .from("patients")
            .select("name")
            .eq("patient_id", patientId),
          tenantId
        ).maybeSingle();
        const patientName = patientData?.name || patientId;

        // 過去の処方歴を取得（最新5件）
        const { data: historyData } = await withTenant(
          supabaseAdmin
            .from("orders")
            .select("product_code, shipping_date")
            .eq("patient_id", patientId),
          tenantId
        )
          .order("created_at", { ascending: false })
          .limit(5);

        let history = "";
        if (historyData && historyData.length > 0) {
          history = historyData.map(o => {
            const product = (o.product_code || "")
              .replace("MJL_", "")
              .replace("_", " ");
            const date = o.shipping_date || "";
            return `${date} ${product}`;
          }).join("\n");
        }

        await sendReorderNotification(patientId, patientName, productCode, reorderNumber, history, LINE_NOTIFY_TOKEN, LINE_ADMIN_GROUP_ID);
      } catch (err) {
        console.error("[reorder/apply] LINE notification error:", err);
      }
    })();

    // ★ 7.5mg初回申請チェック → 追加警告（非同期）
    if (productCode.includes("7.5mg")) {
      (async () => {
        try {
          const { data: prev75Orders, error: prev75Error } = await withTenant(
            supabaseAdmin
              .from("orders")
              .select("id")
              .eq("patient_id", patientId)
              .like("product_code", "%7.5mg%"),
            tenantId
          ).limit(1);

          if (prev75Error) {
            console.error("[reorder/apply] 7.5mg history check error:", prev75Error);
          } else if (!prev75Orders || prev75Orders.length === 0) {
            console.log(`[reorder/apply] First 7.5mg request for patient=${patientId}`);
            const alertText = `⚠️【7.5mg 初回申請】⚠️\n患者ID: ${patientId}\n\nこの患者は7.5mgの処方歴がありません。\n承認前にご確認ください。`;
            await pushTextToAdminGroup(alertText, LINE_NOTIFY_TOKEN, LINE_ADMIN_GROUP_ID);
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
