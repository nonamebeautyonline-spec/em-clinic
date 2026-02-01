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

console.log('=== bt_55 を pending_confirmation に戻す ===\n');

const { data: bt55Before } = await supabase
  .from('orders')
  .select('*')
  .eq('id', 'bt_55')
  .single();

if (!bt55Before) {
  console.log('❌ bt_55 が見つかりません');
  process.exit(1);
}

console.log('現在の状態:');
console.log(`  ID: ${bt55Before.id}`);
console.log(`  ステータス: ${bt55Before.status}`);
console.log(`  決済日: ${bt55Before.paid_at || '(null)'}`);
console.log('');

// pending_confirmationに戻す（実際の未照合状態）
const { error: updateError } = await supabase
  .from('orders')
  .update({
    status: 'pending_confirmation',
    paid_at: null,
    payment_status: 'PENDING',
  })
  .eq('id', 'bt_55');

if (updateError) {
  console.error('❌ 更新エラー:', updateError);
  process.exit(1);
}

console.log('✅ bt_55 を pending_confirmation に戻しました');

const { data: bt55After } = await supabase
  .from('orders')
  .select('*')
  .eq('id', 'bt_55')
  .single();

console.log('');
console.log('変更後:');
console.log(`  ステータス: ${bt55After.status}`);
console.log(`  決済日: ${bt55After.paid_at || '(null)'}`);
console.log('');
console.log('キャッシュを無効化しています...');

// キャッシュ無効化
try {
  const response = await fetch(`${envVars.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/admin/invalidate-cache`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${envVars.ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ patient_id: bt55Before.patient_id }),
  });

  if (response.ok) {
    console.log('✅ キャッシュ無効化完了');
  } else {
    console.log('⚠️ キャッシュ無効化失敗');
  }
} catch (e) {
  console.error('⚠️ キャッシュ無効化エラー:', e.message);
}

console.log('');
console.log('=== 完了 ===');
console.log('この患者は未照合状態（pending_confirmation）に戻りました');
console.log('  - 決済マスター: （申請中）表示');
console.log('  - 銀行振込照合: リストに表示');
console.log('  - 本日の発送リスト: グレーアウト表示');
