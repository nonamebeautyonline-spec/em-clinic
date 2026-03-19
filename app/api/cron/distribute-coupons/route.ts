// app/api/cron/distribute-coupons/route.ts — クーポン自動配布 Cron（毎日実行）
// トリガータイプ別に対象患者を判定し、クーポンを自動配布する
import { NextRequest, NextResponse } from "next/server";
import { serverError, unauthorized } from "@/lib/api-error";
import { supabaseAdmin } from "@/lib/supabase";
import { pushMessage } from "@/lib/line-push";
import { tenantPayload } from "@/lib/tenant";
import { acquireLock } from "@/lib/distributed-lock";
import { notifyCronFailure } from "@/lib/notifications/cron-failure";

// トリガー設定の型
interface TriggerConfig {
  days_after?: number;
  visit_count?: number;
  tag_name?: string;
}

// ルール型
interface DistributionRule {
  id: string;
  tenant_id: string;
  coupon_id: number;
  name: string;
  trigger_type: "birthday" | "first_purchase_days" | "nth_visit" | "tag_added";
  trigger_config: TriggerConfig;
  is_active: boolean;
}

// クーポン型
interface Coupon {
  id: number;
  name: string;
  code: string;
  discount_type: "fixed" | "percent";
  discount_value: number;
  valid_until: string | null;
  is_active: boolean;
}

// 対象患者型
interface TargetPatient {
  patient_id: string;
  line_id: string | null;
}

export async function GET(req: NextRequest) {
  // Vercel Cron認証
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return unauthorized();
  }

  // 排他制御
  const lock = await acquireLock("cron:distribute-coupons", 120);
  if (!lock.acquired) {
    return NextResponse.json({ ok: true, skipped: "別のプロセスが実行中" });
  }

  try {
    // 全テナントのアクティブなルールを取得
    const { data: rules, error: rulesErr } = await supabaseAdmin
      .from("coupon_distribution_rules")
      .select("*")
      .eq("is_active", true);

    if (rulesErr) {
      console.error("[Cron/distribute-coupons] ルール取得エラー:", rulesErr.message);
      return serverError(rulesErr.message);
    }

    if (!rules?.length) {
      return NextResponse.json({ ok: true, processed: 0, message: "アクティブなルールなし" });
    }

    let totalDistributed = 0;
    let totalSkipped = 0;

    for (const rule of rules as DistributionRule[]) {
      try {
        // クーポンの有効性チェック
        const { data: coupon } = await supabaseAdmin
          .from("coupons")
          .select("id, name, code, discount_type, discount_value, valid_until, is_active")
          .eq("id", rule.coupon_id)
          .eq("tenant_id", rule.tenant_id)
          .single();

        if (!coupon || !(coupon as Coupon).is_active) {
          continue;
        }

        // トリガータイプ別に対象患者を取得
        const targets = await getTargetPatients(rule);

        if (targets.length === 0) continue;

        // 既に配布済みの患者を除外
        const patientIds = targets.map(t => t.patient_id);
        const { data: existingLogs } = await supabaseAdmin
          .from("coupon_distribution_logs")
          .select("patient_id")
          .eq("rule_id", rule.id)
          .in("patient_id", patientIds);

        const alreadyDistributed = new Set(
          (existingLogs || []).map((l: { patient_id: string }) => l.patient_id)
        );
        const newTargets = targets.filter(t => !alreadyDistributed.has(t.patient_id));

        if (newTargets.length === 0) {
          totalSkipped += targets.length;
          continue;
        }

        // バッチ配布（10件ずつ）
        const BATCH_SIZE = 10;
        for (let i = 0; i < newTargets.length; i += BATCH_SIZE) {
          const batch = newTargets.slice(i, i + BATCH_SIZE);
          await Promise.allSettled(
            batch.map(target => distributeToPatient(rule, coupon as Coupon, target))
          );
        }

        totalDistributed += newTargets.length;
        totalSkipped += targets.length - newTargets.length;
      } catch (err) {
        console.error(`[Cron/distribute-coupons] ルール ${rule.id} 処理エラー:`, err);
      }
    }

    console.log(`[Cron/distribute-coupons] 完了: distributed=${totalDistributed}, skipped=${totalSkipped}`);
    return NextResponse.json({
      ok: true,
      processed: rules.length,
      distributed: totalDistributed,
      skipped: totalSkipped,
    });
  } catch (e) {
    console.error("[distribute-coupons] エラー:", e);
    notifyCronFailure("distribute-coupons", e).catch(() => {});
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  } finally {
    await lock.release();
  }
}

// トリガータイプ別に対象患者を取得
async function getTargetPatients(rule: DistributionRule): Promise<TargetPatient[]> {
  const tenantId = rule.tenant_id;

  switch (rule.trigger_type) {
    case "birthday": {
      // 今日が誕生日の患者
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const birthdayPattern = `%-${month}-${day}%`;

      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("patient_id, line_id")
        .eq("tenant_id", tenantId)
        .like("birthday", birthdayPattern);

      return (patients || []).map((p: { patient_id: string; line_id: string | null }) => ({
        patient_id: p.patient_id,
        line_id: p.line_id,
      }));
    }

    case "first_purchase_days": {
      // 初回購入からN日経過した患者
      const daysAfter = rule.trigger_config.days_after || 0;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - daysAfter);
      const targetDateStr = targetDate.toISOString().slice(0, 10);

      // 初回決済日がちょうどN日前の患者を取得
      const { data: orders } = await supabaseAdmin
        .from("orders")
        .select("patient_id")
        .eq("tenant_id", tenantId)
        .eq("status", "paid")
        .gte("created_at", targetDateStr + "T00:00:00")
        .lt("created_at", targetDateStr + "T23:59:59");

      if (!orders?.length) return [];

      // 初回購入かチェック（それより前の注文がない患者のみ）
      const firstPurchasePatients: string[] = [];
      for (const order of orders) {
        const { count } = await supabaseAdmin
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .eq("patient_id", order.patient_id)
          .eq("status", "paid")
          .lt("created_at", targetDateStr + "T00:00:00");

        if (count === 0) {
          firstPurchasePatients.push(order.patient_id);
        }
      }

      if (firstPurchasePatients.length === 0) return [];

      // LINE IDを取得
      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("patient_id, line_id")
        .eq("tenant_id", tenantId)
        .in("patient_id", firstPurchasePatients);

      return (patients || []).map((p: { patient_id: string; line_id: string | null }) => ({
        patient_id: p.patient_id,
        line_id: p.line_id,
      }));
    }

    case "nth_visit": {
      // N回目来院の患者（予約の完了数で判定）
      const visitCount = rule.trigger_config.visit_count || 1;

      // 予約テーブルから完了済み予約数がちょうどN回の患者を取得
      const { data: reservations } = await supabaseAdmin
        .from("reservations")
        .select("patient_id")
        .eq("tenant_id", tenantId)
        .eq("status", "completed");

      if (!reservations?.length) return [];

      // 患者ごとの来院回数を集計
      const visitCounts = new Map<string, number>();
      for (const r of reservations) {
        visitCounts.set(r.patient_id, (visitCounts.get(r.patient_id) || 0) + 1);
      }

      // ちょうどN回目の患者を抽出
      const targetPatientIds = [...visitCounts.entries()]
        .filter(([, count]) => count === visitCount)
        .map(([id]) => id);

      if (targetPatientIds.length === 0) return [];

      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("patient_id, line_id")
        .eq("tenant_id", tenantId)
        .in("patient_id", targetPatientIds);

      return (patients || []).map((p: { patient_id: string; line_id: string | null }) => ({
        patient_id: p.patient_id,
        line_id: p.line_id,
      }));
    }

    case "tag_added": {
      // 直近24時間以内に特定タグが付与された患者
      const tagName = rule.trigger_config.tag_name;
      if (!tagName) return [];

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // タグ名からタグIDを取得
      const { data: tag } = await supabaseAdmin
        .from("tags")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("name", tagName)
        .single();

      if (!tag) return [];

      // 直近24時間以内にタグが付与された患者
      const { data: tagAssignments } = await supabaseAdmin
        .from("patient_tags")
        .select("patient_id")
        .eq("tag_id", tag.id)
        .gte("created_at", since);

      if (!tagAssignments?.length) return [];

      const patientIds = [...new Set(tagAssignments.map((ta: { patient_id: string }) => ta.patient_id))];

      const { data: patients } = await supabaseAdmin
        .from("patients")
        .select("patient_id, line_id")
        .eq("tenant_id", tenantId)
        .in("patient_id", patientIds);

      return (patients || []).map((p: { patient_id: string; line_id: string | null }) => ({
        patient_id: p.patient_id,
        line_id: p.line_id,
      }));
    }

    default:
      return [];
  }
}

// 個別患者にクーポンを配布
async function distributeToPatient(
  rule: DistributionRule,
  coupon: Coupon,
  target: TargetPatient
): Promise<void> {
  const tenantId = rule.tenant_id;

  // 配布ログ記録
  await supabaseAdmin.from("coupon_distribution_logs").insert({
    ...tenantPayload(tenantId),
    rule_id: rule.id,
    patient_id: target.patient_id,
    coupon_id: coupon.id,
  });

  // coupon_issues にも記録（手動配布と同じ形式）
  await supabaseAdmin.from("coupon_issues").insert({
    ...tenantPayload(tenantId),
    coupon_id: coupon.id,
    patient_id: target.patient_id,
    status: "issued",
  });

  // LINE通知
  if (target.line_id) {
    const discountText = coupon.discount_type === "percent"
      ? `${coupon.discount_value}%OFF`
      : `¥${coupon.discount_value.toLocaleString()}OFF`;

    const msg = `クーポンをお届けします\n\n【${coupon.name}】\n${discountText}\nコード: ${coupon.code}${coupon.valid_until ? `\n有効期限: ${new Date(coupon.valid_until).toLocaleDateString("ja-JP")}` : ""}`;

    try {
      const pushRes = await pushMessage(target.line_id, [{
        type: "text",
        text: msg,
      }], tenantId ?? undefined);

      if (pushRes?.ok) {
        await supabaseAdmin.from("message_log").insert({
          ...tenantPayload(tenantId),
          patient_id: target.patient_id,
          line_uid: target.line_id,
          direction: "outgoing",
          event_type: "message",
          message_type: "text",
          content: msg,
          status: "sent",
        });
      }
    } catch (err) {
      console.error(`[Cron/distribute-coupons] LINE送信エラー (${target.patient_id}):`, err);
    }
  }
}
