import { readFileSync } from "fs";
import { resolve } from "path";
import fetch from "node-fetch";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const url = `${envVars.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/dashboard-stats-enhanced?range=today`;

console.log('=== ダッシュボードKPI テスト（今日） ===\n');

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${envVars.ADMIN_TOKEN}`,
  },
});

if (!response.ok) {
  console.error(`❌ API エラー: ${response.status}`);
  const text = await response.text();
  console.error(text);
  process.exit(1);
}

const data = await response.json();

console.log('■ 予約統計:');
console.log(`  総数: ${data.reservations.total}件`);
console.log(`  完了: ${data.reservations.completed}件`);
console.log(`  キャンセル: ${data.reservations.cancelled}件`);
console.log(`  キャンセル率: ${data.reservations.cancelRate}%`);
console.log('');

console.log('■ 転換率KPI:');
console.log(`  診療後の決済率: ${data.kpi.paymentRateAfterConsultation}%`);
console.log(`  問診後の予約率: ${data.kpi.reservationRateAfterIntake}%`);
console.log(`  予約後の受診率: ${data.kpi.consultationCompletionRate}%`);
console.log('');

console.log('■ 本日の活動KPI:');
console.log(`  LINE登録者数: ${data.kpi.lineRegisteredCount}人`);
console.log(`  本日の予約数: ${data.kpi.todayNewReservations}件`);
console.log(`  本日の決済人数: ${data.kpi.todayPaidCount}人`);
console.log('');

console.log('■ 患者統計:');
console.log(`  総患者数: ${data.patients.total}人`);
console.log(`  アクティブ患者: ${data.patients.active}人`);
console.log(`  新規患者: ${data.patients.new}人`);
console.log(`  リピート率: ${data.patients.repeatRate}%`);
console.log('');

console.log('■ 売上統計:');
console.log(`  総売上: ¥${data.revenue.total.toLocaleString()}`);
console.log(`  カード決済: ¥${data.revenue.square.toLocaleString()}`);
console.log(`  銀行振込: ¥${data.revenue.bankTransfer.toLocaleString()}`);
console.log(`  平均注文額: ¥${data.revenue.avgOrderAmount.toLocaleString()}`);
console.log('');

console.log('✅ KPI計算成功');
