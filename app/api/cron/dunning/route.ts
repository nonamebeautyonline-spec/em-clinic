// app/api/cron/dunning/route.ts — 未払い自動督促（dunning）Cron
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";
import { acquireLock } from "@/lib/distributed-lock";
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant, tenantPayload } from "@/lib/tenant";
import { pushMessage } from "@/lib/line-push";

export const dynamic = "force-dynamic";

// 督促ステップ定義
const DUNNING_STEPS = [
  { step: 1, daysAfter: 3, message: "お振込みのご確認をお願いいたします。ご注文のお支払いがまだ確認できておりません。お手数ですが、お振込み状況をご確認ください。" },
  { step: 2, daysAfter: 7, message: "お振込み期限が近づいています。まだお支払いが確認できておりません。お早めにお振込みをお願いいたします。" },
  { step: 3, daysAfter: 14, message: "お振込み期限を過ぎています。お支払いが確認できない場合、ご注文をキャンセルさせていただく場合がございます。至急ご対応をお願いいたします。" },
] as const;

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御
  const lock = await acquireLock("cron:dunning", 120);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    // テナント一覧取得
    const { data: tenants } = await supabaseAdmin.from("tenants").select("id");
    const tenantIds = (tenants || []).map((t: { id: string }) => t.id);

    // 未払い注文を取得（銀行振込のpending/unpaid）— テナントごとに処理
    const allOrders: { id: string; patient_id: string; tenant_id: string; created_at: string; payment_method: string; status: string; payment_status: string }[] = [];
    for (const tid of tenantIds) {
      const { data } = await withTenant(
        supabaseAdmin.from("orders")
          .select("id, patient_id, tenant_id, created_at, payment_method, status, payment_status")
          .eq("payment_method", "bank_transfer")
          .in("payment_status", ["pending", "unpaid"]),
        tid
      );
      if (data) allOrders.push(...data);
    }
    const pendingOrders = allOrders;
    const ordersError = null;

    if (ordersError) {
      console.error("[Cron/Dunning] 注文取得エラー:", ordersError);
      return serverError("注文データの取得に失敗しました");
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, skipped: 0, message: "対象注文なし" });
    }

    const now = new Date();

    for (const order of pendingOrders) {
      const orderDate = new Date(order.created_at);
      const daysSinceOrder = Math.floor(
        (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      for (const stepDef of DUNNING_STEPS) {
        if (daysSinceOrder < stepDef.daysAfter) continue;

        // 重複チェック（dunning_logs）
        const { data: existing } = await supabaseAdmin
          .from("dunning_logs")
          .select("id")
          .eq("order_id", order.id)
          .eq("dunning_step", stepDef.step)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // 患者のline_idを取得
        const { data: patient } = await withTenant(
          supabaseAdmin
            .from("patients")
            .select("line_id")
            .eq("patient_id", order.patient_id)
            .maybeSingle(),
          order.tenant_id
        );

        const lineUid = patient?.line_id;

        // LINE送信
        let messageStatus: "sent" | "failed" | "no_uid" = "no_uid";
        if (lineUid) {
          try {
            const res = await pushMessage(
              lineUid,
              [{ type: "text", text: stepDef.message }],
              order.tenant_id
            );
            messageStatus = res?.ok ? "sent" : "failed";
          } catch (err) {
            console.error(`[Cron/Dunning] LINE送信エラー: order=${order.id}, step=${stepDef.step}`, err);
            messageStatus = "failed";
          }
        }

        // message_log に記録
        await supabaseAdmin.from("message_log").insert({
          patient_id: order.patient_id,
          line_uid: lineUid || null,
          message_type: "individual",
          content: stepDef.message,
          status: messageStatus,
          direction: "outgoing",
          ...tenantPayload(order.tenant_id),
        });

        // dunning_logs に記録
        const { error: logError } = await supabaseAdmin
          .from("dunning_logs")
          .insert({
            tenant_id: order.tenant_id,
            patient_id: order.patient_id,
            order_id: order.id,
            dunning_step: stepDef.step,
          });

        if (logError) {
          // UNIQUE違反は重複実行なのでスキップ扱い
          if (logError.code === "23505") {
            skipped++;
          } else {
            console.error(`[Cron/Dunning] ログ記録エラー: order=${order.id}`, logError);
            failed++;
          }
        } else if (messageStatus === "sent") {
          sent++;
        } else {
          failed++;
        }
      }
    }

    console.log(`[Cron/Dunning] 完了: sent=${sent}, failed=${failed}, skipped=${skipped}`);
    return NextResponse.json({ ok: true, sent, failed, skipped });
  } catch (err) {
    console.error("[Cron/Dunning] エラー:", err);
    notifyCronFailure("dunning", err).catch(() => {});
    return serverError(err instanceof Error ? err.message : "Unknown error");
  } finally {
    await lock.release();
  }
}
