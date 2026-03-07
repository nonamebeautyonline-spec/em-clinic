// lib/report-generator.ts — 定期レポートHTML生成
import { supabaseAdmin } from "@/lib/supabase";
import { withTenant } from "@/lib/tenant";

/** レポート期間 */
export interface ReportPeriod {
  start: Date; // UTC
  end: Date;   // UTC
  label: string; // 例: "2026年3月1日〜3月7日"
}

/** レポートデータ */
export interface ReportData {
  period: ReportPeriod;
  revenue: {
    total: number;
    card: number;
    bankTransfer: number;
  };
  patients: {
    total: number;
    newCount: number;
  };
  reservations: number;
  messages: {
    incoming: number;
    outgoing: number;
  };
}

// ---------- 期間計算 ----------

/** JST基準で直近1週間の期間を返す */
export function getWeeklyPeriod(now?: Date): ReportPeriod {
  const d = now ?? new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(d.getTime() + jstOffset);
  const end = new Date(jstNow.getFullYear(), jstNow.getMonth(), jstNow.getDate());
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = (dt: Date) => `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
  return {
    start: new Date(start.getTime() - jstOffset),
    end: new Date(end.getTime() - jstOffset),
    label: `${fmt(start)}〜${fmt(new Date(end.getTime() - 24 * 60 * 60 * 1000))}`,
  };
}

/** JST基準で直近1ヶ月の期間を返す */
export function getMonthlyPeriod(now?: Date): ReportPeriod {
  const d = now ?? new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(d.getTime() + jstOffset);
  // 前月1日〜前月末日
  const end = new Date(jstNow.getFullYear(), jstNow.getMonth(), 1);
  const start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
  const fmt = (dt: Date) => `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日`;
  const lastDay = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return {
    start: new Date(start.getTime() - jstOffset),
    end: new Date(end.getTime() - jstOffset),
    label: `${fmt(start)}〜${fmt(lastDay)}`,
  };
}

// ---------- データ取得 ----------

async function fetchReportData(
  period: ReportPeriod,
  tenantId: string | null,
): Promise<ReportData> {
  const startISO = period.start.toISOString();
  const endISO = period.end.toISOString();

  // 売上（カード）
  const { data: cardOrders } = await withTenant(
    supabaseAdmin
      .from("orders")
      .select("amount")
      .eq("payment_method", "credit_card")
      .in("status", ["pending_confirmation", "confirmed"])
      .gte("paid_at", startISO)
      .lt("paid_at", endISO),
    tenantId,
  );
  const cardRevenue = (cardOrders ?? []).reduce((s, o) => s + (Number(o.amount) || 0), 0);

  // 売上（銀行振込）
  const { data: bankOrders } = await withTenant(
    supabaseAdmin
      .from("orders")
      .select("amount")
      .eq("payment_method", "bank_transfer")
      .in("status", ["pending_confirmation", "confirmed"])
      .gte("paid_at", startISO)
      .lt("paid_at", endISO),
    tenantId,
  );
  const bankRevenue = (bankOrders ?? []).reduce((s, o) => s + (Number(o.amount) || 0), 0);

  // 患者数（総数）
  const { count: totalPatients } = await withTenant(
    supabaseAdmin
      .from("intake")
      .select("*", { count: "exact", head: true }),
    tenantId,
  );

  // 新規患者数（期間内）
  const { count: newPatients } = await withTenant(
    supabaseAdmin
      .from("intake")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startISO)
      .lt("created_at", endISO),
    tenantId,
  );

  // 予約件数
  const { count: reservationCount } = await withTenant(
    supabaseAdmin
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .gte("reserved_time", startISO)
      .lt("reserved_time", endISO)
      .neq("status", "cancelled"),
    tenantId,
  );

  // メッセージ数
  const { count: incoming } = await withTenant(
    supabaseAdmin
      .from("message_log")
      .select("*", { count: "exact", head: true })
      .eq("direction", "incoming")
      .gte("created_at", startISO)
      .lt("created_at", endISO),
    tenantId,
  );

  const { count: outgoing } = await withTenant(
    supabaseAdmin
      .from("message_log")
      .select("*", { count: "exact", head: true })
      .eq("direction", "outgoing")
      .gte("created_at", startISO)
      .lt("created_at", endISO),
    tenantId,
  );

  return {
    period,
    revenue: {
      total: cardRevenue + bankRevenue,
      card: cardRevenue,
      bankTransfer: bankRevenue,
    },
    patients: {
      total: totalPatients ?? 0,
      newCount: newPatients ?? 0,
    },
    reservations: reservationCount ?? 0,
    messages: {
      incoming: incoming ?? 0,
      outgoing: outgoing ?? 0,
    },
  };
}

// ---------- HTML生成 ----------

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("ja-JP").format(n);
}

function buildReportHtml(data: ReportData, type: "weekly" | "monthly"): string {
  const typeLabel = type === "weekly" ? "週次" : "月次";

  return `
<!DOCTYPE html>
<html lang="ja">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Hiragino Sans','Hiragino Kaku Gothic ProN',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;">
      <!-- ヘッダー -->
      <div style="background:linear-gradient(135deg,#3b82f6,#2563eb);padding:24px 28px;">
        <h1 style="margin:0;color:#fff;font-size:20px;font-weight:bold;">
          ${typeLabel}レポート
        </h1>
        <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">${data.period.label}</p>
      </div>

      <!-- 売上 -->
      <div style="padding:24px 28px;border-bottom:1px solid #f1f5f9;">
        <h2 style="margin:0 0 16px;font-size:15px;color:#64748b;font-weight:600;">売上サマリ</h2>
        <div style="display:flex;gap:12px;">
          <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#16a34a;">合計売上</p>
            <p style="margin:4px 0 0;font-size:22px;font-weight:bold;color:#15803d;">&yen;${formatCurrency(data.revenue.total)}</p>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px;">
          <div style="flex:1;background:#f8fafc;border-radius:8px;padding:12px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">カード</p>
            <p style="margin:2px 0 0;font-size:16px;font-weight:600;color:#1e293b;">&yen;${formatCurrency(data.revenue.card)}</p>
          </div>
          <div style="flex:1;background:#f8fafc;border-radius:8px;padding:12px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">振込</p>
            <p style="margin:2px 0 0;font-size:16px;font-weight:600;color:#1e293b;">&yen;${formatCurrency(data.revenue.bankTransfer)}</p>
          </div>
        </div>
      </div>

      <!-- 指標 -->
      <div style="padding:24px 28px;border-bottom:1px solid #f1f5f9;">
        <h2 style="margin:0 0 16px;font-size:15px;color:#64748b;font-weight:600;">主要指標</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569;">総患者数</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:16px;font-weight:600;color:#1e293b;text-align:right;">${formatCurrency(data.patients.total)}名</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569;">新規患者数</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:16px;font-weight:600;color:#1e293b;text-align:right;">${formatCurrency(data.patients.newCount)}名</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#475569;">予約件数</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:16px;font-weight:600;color:#1e293b;text-align:right;">${formatCurrency(data.reservations)}件</td>
          </tr>
        </table>
      </div>

      <!-- メッセージ -->
      <div style="padding:24px 28px;">
        <h2 style="margin:0 0 16px;font-size:15px;color:#64748b;font-weight:600;">メッセージ</h2>
        <div style="display:flex;gap:12px;">
          <div style="flex:1;background:#eff6ff;border-radius:8px;padding:14px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#3b82f6;">受信</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:#1e40af;">${formatCurrency(data.messages.incoming)}通</p>
          </div>
          <div style="flex:1;background:#fef3c7;border-radius:8px;padding:14px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#d97706;">送信</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:bold;color:#92400e;">${formatCurrency(data.messages.outgoing)}通</p>
          </div>
        </div>
      </div>
    </div>

    <!-- フッター -->
    <p style="text-align:center;font-size:11px;color:#94a3b8;margin-top:16px;">
      このメールは Lオペ for CLINIC から自動送信されています。
    </p>
  </div>
</body>
</html>`.trim();
}

// ---------- 公開API ----------

/** 週次レポートを生成 */
export async function generateWeeklyReport(
  tenantId: string | null,
  now?: Date,
): Promise<{ html: string; subject: string; data: ReportData }> {
  const period = getWeeklyPeriod(now);
  const data = await fetchReportData(period, tenantId);
  const html = buildReportHtml(data, "weekly");
  return {
    html,
    subject: `【Lオペ】週次レポート（${period.label}）`,
    data,
  };
}

/** 月次レポートを生成 */
export async function generateMonthlyReport(
  tenantId: string | null,
  now?: Date,
): Promise<{ html: string; subject: string; data: ReportData }> {
  const period = getMonthlyPeriod(now);
  const data = await fetchReportData(period, tenantId);
  const html = buildReportHtml(data, "monthly");
  return {
    html,
    subject: `【Lオペ】月次レポート（${period.label}）`,
    data,
  };
}
