import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GASのSquare WebhookシートからordersテーブルにバックフィルするAPI
 * GAS APIを呼び出して全データを取得し、ordersテーブルに住所情報含めて保存
 *
 * ★ 重要: DBの既存 shipping 情報（tracking_number, shipping_date, shipping_status）は上書きしない
 */
async function backfillSquareOrders() {
  console.log('=== Square決済データのバックフィル（GAS→Supabase） ===\n');
  console.log('★ DBの既存shipping情報（tracking_number等）は保持されます\n');

  const gasUrl = process.env.GAS_SQUARE_WEBHOOK_URL;
  if (!gasUrl) {
    console.error('❌ GAS_SQUARE_WEBHOOK_URL が設定されていません');
    console.log('   .env.local に GAS_SQUARE_WEBHOOK_URL を追加してください');
    return;
  }

  console.log('1. GAS APIから全Square決済データを取得中...\n');

  try {
    // GAS APIを呼び出して全データ取得
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'list_all' }),
    });

    if (!res.ok) {
      console.error(`❌ GAS API呼び出し失敗: ${res.status}`);
      const text = await res.text();
      console.error('   Response:', text);
      return;
    }

    const data = await res.json();
    const rows = data.rows || [];

    if (rows.length === 0) {
      console.log('⚠️  GASに決済データがありません');
      return;
    }

    console.log(`✅ ${rows.length}件のデータを取得しました\n`);

    // ★ DBの既存注文でtracking_numberがあるものを取得（これらはスキップ）
    console.log('2. DBの既存shipping情報を確認中...\n');
    const existingWithTracking = new Set();
    let offset = 0;
    while (true) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .not('tracking_number', 'is', null)
        .neq('tracking_number', '')
        .range(offset, offset + 999);
      if (!existing || existing.length === 0) break;
      existing.forEach(o => existingWithTracking.add(o.id));
      offset += 1000;
    }
    console.log(`   tracking_numberあり: ${existingWithTracking.size}件（これらはスキップ）\n`);

    console.log('3. ordersテーブルに保存中...\n');

    let inserted = 0;
    let skippedNoId = 0;
    let skippedHasTracking = 0;
    let errors = 0;

    // バッチ処理（100件ずつ）
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      const ordersToInsert = batch
        .map((row) => {
          const [
            order_datetime,
            shipping_name,
            postal_code,
            address,
            email,
            phone,
            items,
            amount,
            billing_name,
            payment_id,
            product_code,
            patient_id,
            order_id,
            payment_status,
            refund_status,
            refunded_amount,
            refunded_at,
            refund_id,
          ] = row;

          // payment_idとpatient_idが必須
          if (!payment_id || !patient_id) {
            skippedNoId++;
            return null;
          }

          // ★ DBに既存のtracking_numberがある注文はスキップ
          if (existingWithTracking.has(String(payment_id))) {
            skippedHasTracking++;
            return null;
          }

          // 金額をパース
          let parsedAmount = 0;
          if (amount) {
            const cleanAmount = String(amount).replace(/[,円]/g, '');
            parsedAmount = parseFloat(cleanAmount) || 0;
          }

          // 日付をISO形式に変換
          let paidAt = new Date().toISOString();
          if (order_datetime) {
            try {
              paidAt = new Date(order_datetime).toISOString();
            } catch (e) {
              console.warn(`日付変換失敗: ${order_datetime}`);
            }
          }

          return {
            id: String(payment_id),
            patient_id: String(patient_id),
            product_code: product_code || null,
            product_name: items || null,
            amount: parsedAmount,
            paid_at: paidAt,
            payment_status: payment_status || 'COMPLETED',
            payment_method: 'credit_card',
            status: 'confirmed',
            shipping_status: 'pending',
            shipping_name: shipping_name || null,
            postal_code: postal_code || null,
            address: address || null,
            phone: phone || null,
            email: email || null,
            refund_status: refund_status || null,
            refunded_amount: refunded_amount ? parseFloat(String(refunded_amount)) : null,
            refunded_at: refunded_at || null,
            created_at: paidAt,
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (ordersToInsert.length === 0) continue;

      // Supabaseにupsert
      const { error } = await supabase
        .from('orders')
        .upsert(ordersToInsert, { onConflict: 'id' });

      if (error) {
        console.error(`❌ バッチ ${Math.floor(i / BATCH_SIZE) + 1} エラー:`, error.message);
        errors += ordersToInsert.length;
      } else {
        inserted += ordersToInsert.length;
        console.log(`   バッチ ${Math.floor(i / BATCH_SIZE) + 1}: ${ordersToInsert.length}件処理完了`);
      }
    }

    console.log('\n=== バックフィル完了 ===');
    console.log(`処理済み: ${inserted}件`);
    console.log(`スキップ（ID不足）: ${skippedNoId}件`);
    console.log(`スキップ（tracking保持）: ${skippedHasTracking}件`);
    console.log(`エラー: ${errors}件\n`);

    // 確認クエリ
    console.log('4. 確認: ordersテーブルのレコード数を確認中...\n');
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ ordersテーブル総件数: ${count}件\n`);

  } catch (e) {
    console.error('❌ エラー:', e.message);
  }
}

backfillSquareOrders().catch(console.error);
