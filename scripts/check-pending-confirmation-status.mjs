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

console.log('=== pending_confirmation ステータスの確認 ===\n');

// pending_confirmationのレコード数
const { data: pendingOrders, error: pendingError } = await supabase
  .from('orders')
  .select('*')
  .eq('payment_method', 'bank_transfer')
  .eq('status', 'pending_confirmation')
  .order('created_at', { ascending: false });

console.log(`■ pending_confirmation: ${pendingOrders?.length || 0}件\n`);

if (pendingOrders && pendingOrders.length > 0) {
  for (const order of pendingOrders) {
    console.log(`ID: ${order.id}`);
    console.log(`  患者ID: ${order.patient_id}`);
    console.log(`  ステータス: ${order.status}`);
    console.log(`  作成日: ${order.created_at}`);
    console.log(`  決済日: ${order.paid_at || '(null)'}`);
    console.log('');
  }
} else {
  console.log('pending_confirmation のレコードはありません\n');
}

// confirmedのレコード数
const { data: confirmedOrders } = await supabase
  .from('orders')
  .select('id, patient_id, status, created_at, paid_at')
  .eq('payment_method', 'bank_transfer')
  .eq('status', 'confirmed')
  .order('created_at', { ascending: false })
  .limit(5);

console.log(`■ confirmed: ${confirmedOrders?.length || 0}件（最新5件）\n`);

if (confirmedOrders && confirmedOrders.length > 0) {
  for (const order of confirmedOrders) {
    console.log(`ID: ${order.id}`);
    console.log(`  患者ID: ${order.patient_id}`);
    console.log(`  作成日: ${order.created_at}`);
    console.log(`  決済日: ${order.paid_at || '(null)'}`);
    console.log('');
  }
}

// テスト: bt_55を一時的にpending_confirmationに変更
console.log('=== テスト: bt_55 を pending_confirmation に変更 ===\n');

const { data: bt55Before } = await supabase
  .from('orders')
  .select('*')
  .eq('id', 'bt_55')
  .single();

if (bt55Before) {
  console.log('変更前:');
  console.log(`  ID: ${bt55Before.id}`);
  console.log(`  ステータス: ${bt55Before.status}`);
  console.log(`  決済日: ${bt55Before.paid_at || '(null)'}`);
  console.log('');

  // pending_confirmationに変更
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'pending_confirmation',
      paid_at: null,
      payment_status: 'PENDING',
    })
    .eq('id', 'bt_55');

  if (updateError) {
    console.error('更新エラー:', updateError);
  } else {
    console.log('✅ bt_55 を pending_confirmation に変更しました');

    const { data: bt55After } = await supabase
      .from('orders')
      .select('*')
      .eq('id', 'bt_55')
      .single();

    console.log('変更後:');
    console.log(`  ステータス: ${bt55After.status}`);
    console.log(`  決済日: ${bt55After.paid_at || '(null)'}`);
    console.log('');
    console.log('管理画面で確認してください:');
    console.log('  - 決済マスター: 2026/02/01 12:38（申請中）と表示されるはず');
    console.log('  - 銀行振込ページ: 振込確認待ちバッジが表示されるはず');
    console.log('  - 本日の発送リスト: グレーアウトで「振込確認待ち」バッジが表示されるはず');
    console.log('');
    console.log('確認後、元に戻す場合は以下のスクリプトを実行してください:');
    console.log('  node scripts/restore-bt55-to-confirmed.mjs');
  }
}

if (pendingError) {
  console.error('エラー:', pendingError);
}
