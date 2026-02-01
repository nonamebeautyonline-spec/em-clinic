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

const url = `${envVars.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/bank-transfer/pending`;

console.log('=== 銀行振込照合ページ - pending_confirmation リスト確認 ===\n');

const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${envVars.ADMIN_TOKEN}`,
  },
});

const data = await response.json();

console.log(`件数: ${data.orders?.length || 0}件\n`);

if (data.orders && data.orders.length > 0) {
  const bt55 = data.orders.find(o => o.id === 'bt_55');

  if (bt55) {
    console.log('✅ bt_55 が銀行振込照合リストに表示されています\n');
    console.log(`ID: ${bt55.id}`);
    console.log(`  患者ID: ${bt55.patient_id}`);
    console.log(`  申請日: ${bt55.created_at}`);
    console.log(`  配送先: ${bt55.shipping_name}`);
    console.log(`  金額: ¥${bt55.amount?.toLocaleString()}`);
    console.log('');
  } else {
    console.log('❌ bt_55 が銀行振込照合リストに見つかりません\n');
  }

  console.log('全ての pending_confirmation レコード:');
  data.orders.forEach(order => {
    console.log(`  - ${order.id} (患者ID: ${order.patient_id}, ${order.created_at})`);
  });
} else {
  console.log('pending_confirmation のレコードがありません');
}
