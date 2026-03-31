// app/api/cron/salon-birthday/route.ts — バースデークーポン自動配信 Cron（日次実行）
// SALONテナントの今月誕生日の顧客にバースデークーポンを発行・LINE送信
import { NextRequest, NextResponse } from "next/server";
import { unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { tenantPayload } from "@/lib/tenant";
import { acquireLock } from "@/lib/distributed-lock";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";
import { findBirthdayCustomers, buildBirthdayMessage } from "@/lib/salon-lifecycle";

const BATCH_SIZE = 10;
const BIRTHDAY_COUPON_NAME = "バースデークーポン";
const BIRTHDAY_COUPON_DISCOUNT_PERCENT = 10;
const BIRTHDAY_COUPON_VALID_DAYS = 30;

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御
  const lock = await acquireLock("cron:salon-birthday", 120);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    // SALONテナント一覧を取得
    const { data: salonTenants, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("industry", "salon")
      .eq("is_active", true);

    if (tenantErr) {
      console.error("[Cron/salon-birthday] テナント取得エラー:", tenantErr.message);
      return NextResponse.json({ ok: false, error: tenantErr.message }, { status: 500 });
    }

    if (!salonTenants?.length) {
      return NextResponse.json({ ok: true, sent: 0, message: "SALONテナントなし" });
    }

    let totalSent = 0;
    let totalErrors = 0;

    for (const tenant of salonTenants) {
      try {
        const customers = await findBirthdayCustomers(tenant.id);
        if (customers.length === 0) continue;

        console.log(
          `[Cron/salon-birthday] tenant=${tenant.id} 対象=${customers.length}件`
        );

        // バースデークーポンテンプレートを取得 or 作成
        const coupon = await getOrCreateBirthdayCoupon(tenant.id);
        if (!coupon) {
          console.error(`[Cron/salon-birthday] tenant=${tenant.id} クーポン作成失敗`);
          totalErrors++;
          continue;
        }

        const discountText = `${BIRTHDAY_COUPON_DISCOUNT_PERCENT}%OFF`;
        const validUntil = new Date();
        validUntil.setDate(validUntil.getDate() + BIRTHDAY_COUPON_VALID_DAYS);
        const validUntilStr = validUntil.toLocaleDateString("ja-JP");

        // バッチ送信
        for (let i = 0; i < customers.length; i += BATCH_SIZE) {
          const batch = customers.slice(i, i + BATCH_SIZE);
          const results = await Promise.allSettled(
            batch.map(async (c) => {
              // coupon_issues に発行記録
              const { error: issueErr } = await supabaseAdmin
                .from("coupon_issues")
                .insert({
                  ...tenantPayload(tenant.id),
                  coupon_id: coupon.id,
                  patient_id: c.patientId,
                  status: "issued",
                });

              if (issueErr) {
                // ユニーク制約違反（既に発行済み）の場合はスキップ
                if (issueErr.code === "23505") return;
                console.error(
                  `[Cron/salon-birthday] coupon_issues INSERT エラー:`,
                  issueErr.message
                );
                return;
              }

              // LINEメッセージ送信
              const msg = buildBirthdayMessage(
                c.name,
                coupon.code,
                discountText,
                validUntilStr
              );

              if (msg.type !== "text") return;

              const pushRes = await pushMessage(c.lineId, [msg], tenant.id);
              if (pushRes?.ok) {
                // message_log に記録
                await supabaseAdmin.from("message_log").insert({
                  ...tenantPayload(tenant.id),
                  patient_id: c.patientId,
                  line_uid: c.lineId,
                  direction: "outgoing",
                  event_type: "message",
                  message_type: "text",
                  content: msg.text,
                  status: "sent",
                });
                totalSent++;
              }
            })
          );

          for (const r of results) {
            if (r.status === "rejected") {
              totalErrors++;
              console.error("[Cron/salon-birthday] 送信エラー:", r.reason);
            }
          }
        }
      } catch (err) {
        console.error(`[Cron/salon-birthday] tenant=${tenant.id} エラー:`, err);
        totalErrors++;
      }
    }

    console.log(
      `[Cron/salon-birthday] 完了: sent=${totalSent}, errors=${totalErrors}`
    );

    return NextResponse.json({
      ok: true,
      tenants: salonTenants.length,
      sent: totalSent,
      errors: totalErrors,
    });
  } catch (e) {
    console.error("[Cron/salon-birthday] エラー:", e);
    notifyCronFailure("salon-birthday", e).catch(() => {});
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  } finally {
    await lock.release();
  }
}

// ── バースデークーポンテンプレート取得 or 作成 ──────

interface CouponRecord {
  id: number;
  code: string;
}

async function getOrCreateBirthdayCoupon(
  tenantId: string
): Promise<CouponRecord | null> {
  // 既存のバースデークーポンテンプレートを探す
  const { data: existing } = await supabaseAdmin
    .from("coupons")
    .select("id, code")
    .eq("tenant_id", tenantId)
    .eq("name", BIRTHDAY_COUPON_NAME)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (existing) return existing as CouponRecord;

  // なければ自動生成（10%OFF、有効期限30日、無制限利用可）
  const code = `BD-${tenantId.slice(0, 8).toUpperCase()}`;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + BIRTHDAY_COUPON_VALID_DAYS);

  const { data: created, error: createErr } = await supabaseAdmin
    .from("coupons")
    .insert({
      ...tenantPayload(tenantId),
      name: BIRTHDAY_COUPON_NAME,
      code,
      discount_type: "percent",
      discount_value: BIRTHDAY_COUPON_DISCOUNT_PERCENT,
      min_purchase: 0,
      max_uses: null, // 無制限
      max_uses_per_patient: 1,
      valid_from: new Date().toISOString(),
      valid_until: null, // テンプレートは無期限（個別発行で有効期限管理）
      is_active: true,
      description: "お誕生月の方へ自動配信されるバースデークーポンです",
    })
    .select("id, code")
    .single();

  if (createErr) {
    console.error("[salon-birthday] クーポン作成エラー:", createErr.message);
    return null;
  }

  return created as CouponRecord;
}
