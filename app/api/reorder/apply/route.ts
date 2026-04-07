// app/api/reorder/apply/route.ts
// DB + LINE完結（GAS同期なし）
import { NextRequest, NextResponse } from "next/server";
import { badRequest, forbidden, serverError, unauthorized } from "@/lib/api-error";
import { verifyPatientSession } from "@/lib/patient-session";
import { invalidateDashboardCache } from "@/lib/redis";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveTenantIdOrThrow, strictWithTenant, tenantPayload } from "@/lib/tenant";
import { getSetting, getSettingOrEnv } from "@/lib/settings";
import { getBusinessRules } from "@/lib/business-rules";
import { extractDose, buildKarteNote } from "@/lib/reorder-karte";
import { parseBody } from "@/lib/validations/helpers";
import { reorderApplySchema } from "@/lib/validations/reorder";
import { isMultiFieldEnabled } from "@/lib/medical-fields";
import { getProductByCode } from "@/lib/products";

// LINE Flex Message（承認・却下ボタン付き）を送信
async function sendReorderNotification(
  patientId: string,
  patientName: string,
  productCode: string,
  productLabel: string,
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
    // productLabelはパラメータから取得（DB商品マスタのtitle）

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
    const session = await verifyPatientSession(req);
    if (!session) return unauthorized();
    const patientId = session.patientId;
    const lineUid = session.lineUserId;

    const tenantId = resolveTenantIdOrThrow(req);
    const tid = tenantId ?? undefined;

    // LINE通知用トークンを動的取得
    const LINE_NOTIFY_TOKEN = (await getSettingOrEnv("line", "notify_channel_access_token", "LINE_NOTIFY_CHANNEL_ACCESS_TOKEN", tid)) || "";
    const LINE_ADMIN_GROUP_ID = (await getSettingOrEnv("line", "admin_group_id", "LINE_ADMIN_GROUP_ID", tid)) || "";

    const parsed = await parseBody(req, reorderApplySchema);
    if ("error" in parsed) return parsed.error;
    // カートモード: productCodes配列 → カンマ区切りで product_code に保存
    const productCode = parsed.data.productCodes?.length
      ? parsed.data.productCodes.join(",")
      : parsed.data.productCode || "";

    // ★ NG患者は再処方申請不可（statusがnullのレコードを除外）
    // マルチ分野モード: 商品の field_id で NG 判定を分離
    {
      let ngQuery = strictWithTenant(
        supabaseAdmin
          .from("intake")
          .select("status")
          .eq("patient_id", patientId)
          .not("status", "is", null),
        tenantId
      );

      const multiField = await isMultiFieldEnabled(tenantId);
      if (multiField) {
        const product = await getProductByCode(productCode, tenantId);
        if (product?.field_id) {
          ngQuery = ngQuery.eq("field_id", product.field_id);
        }
      }

      const { data: intakeRow } = await ngQuery
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (intakeRow?.status === "NG") {
        console.log(`[reorder/apply] NG患者の再処方申請をブロック: patient_id=${patientId}`);
        return NextResponse.json({ ok: false, error: "ng_patient", message: "処方不可と判定されているため、再処方を申請できません。再度診察予約をお取りください。" }, { status: 403 });
      }
    }

    // ★ 予約必須テナントの場合: 過去の予約済みチェック
    {
      const requiresReservation = (await getSetting("consultation", "reorder_requires_reservation", tid)) === "true";
      if (requiresReservation) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: pastReservation } = await strictWithTenant(
          supabaseAdmin
            .from("reservations")
            .select("reserve_id")
            .eq("patient_id", patientId)
            .neq("status", "canceled")
            .lte("reserved_date", today)
            .order("reserved_date", { ascending: false })
            .limit(1),
          tenantId
        ).maybeSingle();

        if (!pastReservation) {
          console.log(`[reorder/apply] 予約歴なしの再処方申請をブロック: patient_id=${patientId}`);
          return NextResponse.json({ ok: false, error: "reservation_required", message: "再処方には事前の予約・診察が必要です。先に予約を取得してください。" }, { status: 403 });
        }
      }
    }

    // ★ 重複申請チェック: confirmed（承認済み・決済待ち）はブロック、pendingは自動キャンセル
    const { data: existingReorders, error: checkError } = await strictWithTenant(
      supabaseAdmin
        .from("reorders")
        .select("id, status, product_code")
        .eq("patient_id", patientId)
        .in("status", ["pending", "confirmed"]),
      tenantId
    )
      .order("created_at", { ascending: false });

    if (checkError) {
      console.error("[reorder/apply] Duplicate check error:", checkError);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    // confirmed（承認済み・決済待ち）があればブロック
    const confirmedReorder = existingReorders?.find(r => r.status === "confirmed");
    if (confirmedReorder) {
      console.log(`[reorder/apply] Blocked: confirmed reorder exists for patient=${patientId}`);
      return NextResponse.json({ ok: false, error: "duplicate_confirmed", message: "承認済みの再処方申請があります。決済完了後に再度お申し込みください。" }, { status: 400 });
    }

    // pending（未承認）は自動キャンセル → 新規申請で上書き
    const pendingReorders = existingReorders?.filter(r => r.status === "pending") ?? [];
    if (pendingReorders.length > 0) {
      for (const pr of pendingReorders) {
        await strictWithTenant(
          supabaseAdmin.from("reorders").update({ status: "canceled" }).eq("id", pr.id),
          tenantId
        );
        console.log(`[reorder/apply] Auto-canceled pending reorder: id=${pr.id}, product=${pr.product_code}`);
      }
    }

    // ★ ビジネスルール取得
    const rules = await getBusinessRules(tid);

    // ★ 再処方間隔チェック
    if (rules.minReorderIntervalDays > 0) {
      const { data: lastPaid } = await strictWithTenant(
        supabaseAdmin
          .from("reorders")
          .select("paid_at")
          .eq("patient_id", patientId)
          .eq("status", "paid")
          .not("paid_at", "is", null)
          .order("paid_at", { ascending: false })
          .limit(1),
        tenantId
      ).maybeSingle();

      if (lastPaid?.paid_at) {
        const daysSince = Math.floor((Date.now() - new Date(lastPaid.paid_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < rules.minReorderIntervalDays) {
          const remaining = rules.minReorderIntervalDays - daysSince;
          console.log(`[reorder/apply] Interval blocked: patient=${patientId}, daysSince=${daysSince}, required=${rules.minReorderIntervalDays}`);
          return NextResponse.json({ ok: false, error: "interval_too_short", message: `前回の決済から${rules.minReorderIntervalDays}日以上経過する必要があります。あと${remaining}日お待ちください。` }, { status: 400 });
        }
      }
    }

    // ★ DB: reorder_numberを生成（DBの最大値+1、衝突時リトライ）
    const { data: maxRow } = await strictWithTenant(
      supabaseAdmin
        .from("reorders")
        .select("reorder_number"),
      tenantId
    )
      .order("reorder_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    let reorderNumber = (maxRow?.reorder_number || 1) + 1;

    // 商品から field_id を取得（reorderレコードに保存）
    const reorderProduct = await getProductByCode(productCode, tenantId);
    const reorderFieldId = reorderProduct?.field_id ?? null;

    // INSERT（ユニーク制約違反時はリトライ or 重複エラー返却）
    let insertedData: { id: number } | null = null;
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const { data, error: dbError } = await supabaseAdmin
        .from("reorders")
        .insert({
          patient_id: patientId,
          product_code: productCode,
          status: "pending",
          line_uid: lineUid || null,
          reorder_number: reorderNumber,
          field_id: reorderFieldId,
          ...tenantPayload(tenantId),
        })
        .select("id")
        .single();

      if (!dbError && data) {
        insertedData = data;
        break;
      }

      // ユニーク制約違反: 23505 = unique_violation
      if (dbError?.code === "23505") {
        if (dbError.message?.includes("idx_reorders_one_active_per_patient")) {
          // 自動キャンセルしたはずだが制約違反 → 再度キャンセルを試みてリトライ
          console.warn(`[reorder/apply] Unique constraint hit after auto-cancel, retrying cancel+insert (attempt ${attempt + 1})`);
          await strictWithTenant(
            supabaseAdmin.from("reorders").update({ status: "canceled" }).eq("patient_id", patientId).eq("status", "pending"),
            tenantId
          );
          await strictWithTenant(
            supabaseAdmin.from("reorders").update({ status: "canceled" }).eq("patient_id", patientId).eq("status", "confirmed").is("paid_at", null),
            tenantId
          );
          reorderNumber++;
          continue;
        }
        // reorder_number の衝突 → 番号をインクリメントしてリトライ
        reorderNumber++;
        console.log(`[reorder/apply] reorder_number collision, retrying with ${reorderNumber} (attempt ${attempt + 1})`);
        continue;
      }

      console.error("[reorder/apply] DB insert error:", dbError?.code, dbError?.message, dbError);
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    if (!insertedData) {
      console.error("[reorder/apply] DB insert failed after retries");
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }

    const dbId = insertedData.id;
    console.log(`[reorder/apply] DB insert success: id=${dbId}, reorder_num=${reorderNumber}, patient=${patientId}`);

    // ★ キャッシュ削除（即時）
    await invalidateDashboardCache(patientId);

    // ★ 自動承認チェック: 同量再処方かつ autoApproveSameDose が有効
    let autoApproved = false;
    if (rules.autoApproveSameDose) {
      const currentDose = extractDose(productCode);
      if (currentDose !== null) {
        const { data: lastPaidReorder } = await strictWithTenant(
          supabaseAdmin
            .from("reorders")
            .select("product_code")
            .eq("patient_id", patientId)
            .eq("status", "paid")
            .order("paid_at", { ascending: false })
            .limit(1),
          tenantId
        ).maybeSingle();

        if (lastPaidReorder) {
          const prevDose = extractDose(lastPaidReorder.product_code || "");
          if (prevDose !== null && currentDose === prevDose) {
            // 同量 → 自動承認（status を confirmed に更新 + カルテ生成）
            const note = buildKarteNote(productCode, prevDose, currentDose);
            await supabaseAdmin
              .from("reorders")
              .update({ status: "confirmed", karte_note: note })
              .eq("id", dbId);
            autoApproved = true;
            console.log(`[reorder/apply] Auto-approved (same dose ${currentDose}mg): patient=${patientId}, reorder=${reorderNumber}`);
          }
        }
      }
    }

    // ★ 患者名と処方歴を取得してLINE通知を送信（非同期）
    if (rules.notifyReorderApply) {
      (async () => {
        try {
          const { data: patientData } = await strictWithTenant(
            supabaseAdmin
              .from("patients")
              .select("name")
              .eq("patient_id", patientId),
            tenantId
          ).maybeSingle();
          const patientName = patientData?.name || patientId;

          const { data: historyData } = await strictWithTenant(
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
            // 履歴の商品名はproductsテーブルから取得（フォールバック: product_codeそのまま）
            const historyCodes = [...new Set(historyData.map(o => o.product_code).filter(Boolean))];
            const productTitleMap: Record<string, string> = {};
            for (const code of historyCodes) {
              const p = await getProductByCode(code!, tenantId);
              if (p?.title) productTitleMap[code!] = p.title;
            }
            history = historyData.map(o => {
              const product = productTitleMap[o.product_code || ""] || o.product_code || "";
              const date = o.shipping_date || "";
              return `${date} ${product}`;
            }).join("\n");
          }

          // カートモード（カンマ区切り）の場合は各商品名を取得して結合
          let notifyProductLabel: string;
          if (productCode.includes(",")) {
            const codes = productCode.split(",");
            const names: string[] = [];
            for (const code of codes) {
              const p = await getProductByCode(code.trim(), tenantId);
              names.push(p?.title || code);
            }
            notifyProductLabel = names.join("\n");
          } else {
            notifyProductLabel = reorderProduct?.title || productCode;
          }
          await sendReorderNotification(patientId, patientName, productCode, notifyProductLabel, reorderNumber, history, LINE_NOTIFY_TOKEN, LINE_ADMIN_GROUP_ID);

          // 自動承認された場合はその旨も通知
          if (autoApproved) {
            await pushTextToAdminGroup(`✅ 再処方 #${reorderNumber} は同量のため自動承認されました`, LINE_NOTIFY_TOKEN, LINE_ADMIN_GROUP_ID);
          }
        } catch (err) {
          console.error("[reorder/apply] LINE notification error:", err);
        }
      })();
    }

    // ★ 用量変更通知（汎用）: 増量申請時に管理者へ警告
    if (rules.dosageChangeNotify) {
      (async () => {
        try {
          const currentDose = extractDose(productCode);
          if (currentDose === null) return;

          // 前回の決済済みreorderの用量を取得
          const { data: prevPaid } = await strictWithTenant(
            supabaseAdmin
              .from("reorders")
              .select("product_code")
              .eq("patient_id", patientId)
              .eq("status", "paid")
              .order("paid_at", { ascending: false })
              .limit(1),
            tenantId
          ).maybeSingle();

          if (!prevPaid) return; // 初回は通知しない
          const prevDose = extractDose(prevPaid.product_code || "");
          if (prevDose === null || currentDose <= prevDose) return; // 同量・減量は通知しない

          const alertText = `⚠️【用量変更申請】\n患者ID: ${patientId}\n${prevDose}mg → ${currentDose}mg（増量）\n\n承認前にご確認ください。`;
          await pushTextToAdminGroup(alertText, LINE_NOTIFY_TOKEN, LINE_ADMIN_GROUP_ID);
        } catch (err) {
          console.error("[reorder/apply] dosage change notify error:", err);
        }
      })();
    } else {
      // 用量変更通知OFFでも既存の7.5mg初回チェックは維持
      if (productCode.includes("7.5mg")) {
        (async () => {
          try {
            const { data: prev75Orders, error: prev75Error } = await strictWithTenant(
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
    }

    return NextResponse.json({ ok: true, autoApproved }, { status: 200 });
  } catch (e) {
    console.error("POST /api/reorder/apply error", e);
    return NextResponse.json({ ok: false, error: "unexpected_error" }, { status: 500 });
  }
}
