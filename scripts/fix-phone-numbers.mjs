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

function normalizePhone(phone) {
  if (!phone) return phone;
  let digits = phone.trim();
  
  // 00プレフィックスを削除
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }
  
  // 81（国際番号）を削除して0を追加
  if (digits.startsWith('81')) {
    digits = '0' + digits.slice(2);
  }
  
  // 先頭に0がなく、9/8/7で始まる場合は0を追加
  if (!digits.startsWith('0') && digits.match(/^[789]/)) {
    digits = '0' + digits;
  }
  
  return digits;
}

console.log('=== 電話番号の修正 ===\n');

const { data: orders, error } = await supabase
  .from('orders')
  .select('id, patient_id, phone, payment_method')
  .not('phone', 'is', null)
  .order('created_at', { ascending: false });

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

const toFix = orders.filter(o => {
  const phone = o.phone || '';
  return phone.startsWith('00') || phone.match(/^[789]/);
});

console.log(`修正対象: ${toFix.length}件\n`);

let successCount = 0;
let errorCount = 0;

for (const order of toFix) {
  const originalPhone = order.phone;
  const normalizedPhone = normalizePhone(originalPhone);
  
  if (originalPhone === normalizedPhone) continue;
  
  console.log(`ID: ${order.id}`);
  console.log(`  患者ID: ${order.patient_id}`);
  console.log(`  ${originalPhone} (${originalPhone.length}桁) -> ${normalizedPhone} (${normalizedPhone.length}桁)`);
  
  const { error: updateError } = await supabase
    .from('orders')
    .update({ phone: normalizedPhone })
    .eq('id', order.id);
  
  if (updateError) {
    console.log(`  ❌ エラー: ${updateError.message}`);
    errorCount++;
  } else {
    console.log(`  ✅ 更新完了`);
    successCount++;
  }
}

console.log(`\n=== 修正完了 ===`);
console.log(`成功: ${successCount}件`);
console.log(`失敗: ${errorCount}件`);
