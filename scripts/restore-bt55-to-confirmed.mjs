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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    envVars[key.trim()] = value;
  }
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== bt_55 を confirmed に戻す ===\n');

const { data: bt55Before } = await supabase
  .from('orders')
  .select('*')
  .eq('id', 'bt_55')
  .single();

if (!bt55Before) {
  console.log('bt_55 が見つかりません');
  process.exit(1);
}

console.log('現在の状態:');
console.log(`  ID: ${bt55Before.id}`);
console.log(`  ステータス: ${bt55Before.status}`);
console.log(`  決済日: ${bt55Before.paid_at || '(null)'}`);
console.log('');

// confirmedに戻す
const { error: updateError } = await supabase
  .from('orders')
  .update({
    status: 'confirmed',
    paid_at: bt55Before.created_at, // 作成日時を決済日時として設定
    payment_status: 'COMPLETED',
  })
  .eq('id', 'bt_55');

if (updateError) {
  console.error('❌ 更新エラー:', updateError);
  process.exit(1);
}

console.log('✅ bt_55 を confirmed に戻しました');

const { data: bt55After } = await supabase
  .from('orders')
  .select('*')
  .eq('id', 'bt_55')
  .single();

console.log('');
console.log('変更後:');
console.log(`  ステータス: ${bt55After.status}`);
console.log(`  決済日: ${bt55After.paid_at}`);
