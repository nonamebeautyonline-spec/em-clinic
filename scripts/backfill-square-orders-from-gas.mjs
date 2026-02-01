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
 */
async function backfillSquareOrders() {
  console.log('=== Square決済データのバックフィル（GAS→Supabase） ===\n');

  const gasUrl = process.env.GAS_SQUARE_WEBHOOK_URL;
  if (!gasUrl) {
    console.error('❌ GAS_SQUARE_WEBHOOK_URL が設定されていません');
    console.log('   .env.local に GAS_SQUARE_WEBHOOK_URL を追加してください');
    return;
  }

  console.log('1. GAS APIから全Square決済データを取得中...\n');

  try {
    // GAS APIを呼び出して全データ取得
    // kind=list_all で全レコード取得
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

    // ヘッダーマッピング（GASのヘッダー順序）
    // order_datetime, name（配送先）, postal, address, email, phone, items, amount,
    // name（請求先）, payment_id, productCode, patientId, order_id, payment_status,
    // refund_status, refunded_amount, refunded_at, refund_id

    console.log('2. ordersテーブルに保存中...\n');

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
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
            skipped++;
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
            status: 'confirmed', // クレカは常に確認済み
            shipping_status: 'pending', // デフォルトは発送待ち
            // ★ 住所情報
            shipping_name: shipping_name || null,
            postal_code: postal_code || null,
            address: address || null,
            phone: phone || null,
            email: email || null,
            // 返金情報
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
      const { data, error } = await supabase
        .from('orders')
        .upsert(ordersToInsert, { onConflict: 'id' });

      if (error) {
        console.error(`❌ バッチ ${Math.floor(i / BATCH_SIZE) + 1} エラー:`, error.message);
        errors += ordersToInsert.length;
      } else {
        // upsertは更新/挿入を区別できないので、とりあえず成功数としてカウント
        inserted += ordersToInsert.length;
        console.log(`   バッチ ${Math.floor(i / BATCH_SIZE) + 1}: ${ordersToInsert.length}件処理完了`);
      }
    }

    console.log('\n=== バックフィル完了 ===');
    console.log(`処理済み: ${inserted}件`);
    console.log(`スキップ: ${skipped}件 (payment_id または patient_id なし)`);
    console.log(`エラー: ${errors}件\n`);

    // 確認クエリ
    console.log('3. 確認: ordersテーブルのレコード数を確認中...\n');
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ ordersテーブル総件数: ${count}件\n`);

  } catch (e) {
    console.error('❌ エラー:', e.message);
  }
}

backfillSquareOrders().catch(console.error);
