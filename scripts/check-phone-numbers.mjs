import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return;
  const [key, ...valueParts] = trimmed.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=").trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== 電話番号データの確認 ===\n');

const { data: orders, error } = await supabase
  .from('orders')
  .select('id, patient_id, phone, payment_method, created_at')
  .not('phone', 'is', null)
  .order('created_at', { ascending: false })
  .limit(100);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

console.log('ordersテーブルの電話番号（最新100件）:\n');

const phonePatterns = {
  '00で始まる': [],
  '0で始まる（正常）': [],
  '9/8/7で始まる（先頭0欠落）': [],
  'その他': []
};

for (const order of orders) {
  const phone = order.phone || '';
  const length = phone.length;
  
  if (phone.startsWith('00')) {
    phonePatterns['00で始まる'].push({ ...order, phone, length });
  } else if (phone.startsWith('0')) {
    phonePatterns['0で始まる（正常）'].push({ ...order, phone, length });
  } else if (phone.match(/^[789]/)) {
    phonePatterns['9/8/7で始まる（先頭0欠落）'].push({ ...order, phone, length });
  } else {
    phonePatterns['その他'].push({ ...order, phone, length });
  }
}

console.log('パターン別集計:\n');
for (const [pattern, items] of Object.entries(phonePatterns)) {
  console.log(`${pattern}: ${items.length}件`);
  if (items.length > 0) {
    const examples = items.slice(0, 5).map(i => `${i.phone} (${i.payment_method})`).join(', ');
    console.log(`  例: ${examples}`);
  }
}

const needsFix = [...phonePatterns['00で始まる'], ...phonePatterns['9/8/7で始まる（先頭0欠落）']];
console.log(`\n修正が必要なデータ: ${needsFix.length}件\n`);

if (needsFix.length > 0) {
  console.log('修正サンプル:\n');
  for (const item of needsFix.slice(0, 10)) {
    let fixed = item.phone;
    if (fixed.startsWith('00')) {
      fixed = fixed.slice(2);
    }
    if (fixed.match(/^[789]/)) {
      fixed = '0' + fixed;
    }
    console.log(`ID: ${item.id} (${item.payment_method}) 患者ID: ${item.patient_id}`);
    console.log(`  現在: ${item.phone} (${item.length}桁) -> 修正後: ${fixed} (${fixed.length}桁)`);
  }
}
