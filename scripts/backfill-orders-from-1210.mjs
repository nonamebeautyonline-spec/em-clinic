import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) {
    let val = vals.join('=').trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key.trim()] = val;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * GASのSquare WebhookシートからordersテーブルにバックフィルするAPI
 * 12/10以降のデータを対象に、以下のフィールドを保存:
 * - id (payment_id)
 * - patient_id
 * - product_code / product_name
 * - amount
 * - paid_at
 * - payment_status / payment_method / status
 * - shipping_name / postal_code / address / phone / email
 * - shipping_status / shipping_date / tracking_number
 */
async function backfillOrdersFrom1210() {
  console.log('=== 12/10以降のSquare決済データのバックフィル（GAS→Supabase） ===\n');

  const gasUrl = env.GAS_SQUARE_WEBHOOK_URL;
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

    console.log(`✅ GASから ${rows.length}件のデータを取得しました\n`);

    // 2025年12月10日以降のデータをフィルタ
    const startDate = new Date('2025-12-10T00:00:00+09:00');

    // ヘッダーマッピング（GASのヘッダー順序）
    // 0: order_datetime
    // 1: name（配送先）
    // 2: postal
    // 3: address
    // 4: email
    // 5: phone
    // 6: items
    // 7: amount
    // 8: name（請求先）
    // 9: payment_id
    // 10: productCode
    // 11: patientId
    // 12: order_id
    // 13: payment_status
    // 14: refund_status
    // 15: refunded_amount
    // 16: refunded_at
    // 17: refund_id
    // 18+: shipping_status, shipping_date, tracking_number（もしあれば）

    console.log('2. 12/10以降のデータをフィルタ中...\n');

    const filteredRows = rows.filter((row) => {
      const order_datetime = row[0];
      if (!order_datetime) return false;

      try {
        const orderDate = new Date(order_datetime);
        return orderDate >= startDate;
      } catch (e) {
        return false;
      }
    });

    console.log(`✅ 12/10以降のデータ: ${filteredRows.length}件\n`);

    if (filteredRows.length === 0) {
      console.log('⚠️  12/10以降のデータがありません');
      return;
    }

    // サンプル行を表示してカラム構造を確認
    console.log('サンプル行の確認（最初の1件）:');
    const sampleRow = filteredRows[0];
    console.log(`  カラム数: ${sampleRow.length}`);
    sampleRow.forEach((val, idx) => {
      console.log(`  [${idx}]: ${String(val).substring(0, 50)}`);
    });
    console.log('');

    console.log('3. ordersテーブルに保存中...\n');

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // バッチ処理（100件ずつ）
    const BATCH_SIZE = 100;
    for (let i = 0; i < filteredRows.length; i += BATCH_SIZE) {
      const batch = filteredRows.slice(i, i + BATCH_SIZE);

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
            shipping_status,
            shipping_date,
            tracking_number,
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

          // 返金金額パース
          let parsedRefundedAmount = null;
          if (refunded_amount) {
            const cleanRefund = String(refunded_amount).replace(/[,円]/g, '');
            parsedRefundedAmount = parseFloat(cleanRefund) || null;
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
            // 住所情報
            shipping_name: shipping_name || null,
            postal_code: postal_code || null,
            address: address || null,
            phone: phone || null,
            email: email || null,
            // 発送情報
            shipping_status: shipping_status || 'pending',
            shipping_date: shipping_date || null,
            tracking_number: tracking_number || null,
            // 返金情報
            refund_status: refund_status || null,
            refunded_amount: parsedRefundedAmount,
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
        inserted += ordersToInsert.length;
        console.log(`   バッチ ${Math.floor(i / BATCH_SIZE) + 1}: ${ordersToInsert.length}件処理完了`);
      }
    }

    console.log('\n=== バックフィル完了 ===');
    console.log(`処理済み: ${inserted}件`);
    console.log(`スキップ: ${skipped}件 (payment_id または patient_id なし)`);
    console.log(`エラー: ${errors}件\n`);

    // 確認クエリ
    console.log('4. 確認: ordersテーブルのレコード数を確認中...\n');

    // 12/10以降のカード決済件数
    const { count: cardCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_method', 'credit_card')
      .gte('paid_at', '2025-12-10T00:00:00+09:00');

    console.log(`✅ 12/10以降のカード決済: ${cardCount}件`);

    // 1月のカード決済件数
    const { count: janCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_method', 'credit_card')
      .gte('paid_at', '2026-01-01T00:00:00+09:00')
      .lt('paid_at', '2026-02-01T00:00:00+09:00');

    console.log(`✅ 2026年1月のカード決済: ${janCount}件\n`);

  } catch (e) {
    console.error('❌ エラー:', e.message);
  }
}

backfillOrdersFrom1210().catch(console.error);
