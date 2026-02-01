#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listMissingShippingDates() {
  console.log('\n=== shipping_date欠損データの詳細 ===\n');

  // ★ 全件取得（1000件制限を回避）
  let allOrders = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, patient_id, paid_at, shipping_date, tracking_number, created_at, shipping_status')
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('エラー:', error);
      return;
    }

    if (!orders || orders.length === 0) break;

    allOrders.push(...orders);
    if (orders.length < pageSize) break;
    page++;
  }

  // ★ 1/27以降にDB登録されたのにshipping_dateが空の注文を抽出
  const cutoffDate = new Date('2026-01-27T00:00:00Z');

  const realtimeSyncFailed = allOrders.filter(o => {
    if (o.shipping_date) return false; // shipping_dateがあるものは除外
    if (!o.created_at) return false;

    const createdAt = new Date(o.created_at);
    return createdAt >= cutoffDate;
  });

  // ★ 1/27より前にDB登録されたもの（初期バックフィル分）
  const backfillMissing = allOrders.filter(o => {
    if (o.shipping_date) return false;
    if (!o.created_at) return false;

    const createdAt = new Date(o.created_at);
    return createdAt < cutoffDate;
  });

  console.log('## 1. リアルタイム同期失敗（1/27以降DB登録）\n');
  console.log(`合計: ${realtimeSyncFailed.length}件\n`);

  if (realtimeSyncFailed.length > 0) {
    console.log('| payment_id | patient_id | 決済日 | DB登録日 | 追跡番号 | shipping_status |');
    console.log('|------------|------------|--------|----------|----------|-----------------|');

    realtimeSyncFailed.forEach(o => {
      const paidAt = o.paid_at ? new Date(o.paid_at).toISOString().split('T')[0] : '-';
      const createdAt = o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : '-';
      const tracking = o.tracking_number || '-';
      const status = o.shipping_status || 'pending';

      console.log(`| ${o.id} | ${o.patient_id} | ${paidAt} | ${createdAt} | ${tracking} | ${status} |`);
    });
  }

  console.log('\n## 2. 初期バックフィル欠損（1/27より前DB登録）\n');
  console.log(`合計: ${backfillMissing.length}件\n`);

  if (backfillMissing.length > 0) {
    console.log('| payment_id | patient_id | 決済日 | DB登録日 | 追跡番号 | shipping_status |');
    console.log('|------------|------------|--------|----------|----------|-----------------|');

    backfillMissing.forEach(o => {
      const paidAt = o.paid_at ? new Date(o.paid_at).toISOString().split('T')[0] : '-';
      const createdAt = o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : '-';
      const tracking = o.tracking_number || '-';
      const status = o.shipping_status || 'pending';

      console.log(`| ${o.id} | ${o.patient_id} | ${paidAt} | ${createdAt} | ${tracking} | ${status} |`);
    });
  }

  console.log('\n=== まとめ ===');
  console.log(`リアルタイム同期失敗: ${realtimeSyncFailed.length}件`);
  console.log(`初期バックフィル欠損: ${backfillMissing.length}件`);
  console.log(`合計欠損: ${realtimeSyncFailed.length + backfillMissing.length}件`);
}

listMissingShippingDates().catch(console.error);
