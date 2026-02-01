#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkShippingDates() {
  console.log('\n=== orders テーブルの全注文確認 ===\n');

  // ★ 全件取得（1000件制限を回避）
  let allOrders = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('id, patient_id, paid_at, shipping_date, tracking_number, product_name, created_at')
      .order('paid_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('エラー:', error);
      return;
    }

    if (!orders || orders.length === 0) break;

    allOrders.push(...orders);
    console.log(`${allOrders.length}件取得中...`);

    if (orders.length < pageSize) break;
    page++;
  }

  const orders = allOrders;
  console.log(`\n全${orders.length}件の注文\n`);

  let hasShippingDate = 0;
  let noShippingDate = 0;

  orders.forEach((o, i) => {
    const paidAt = o.paid_at ? new Date(o.paid_at).toISOString().split('T')[0] : '(なし)';
    const createdAt = o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : '(なし)';
    const shippingDate = o.shipping_date || '❌ なし';
    const trackingNumber = o.tracking_number || '(未発送)';

    if (o.shipping_date) {
      hasShippingDate++;
    } else {
      noShippingDate++;
      console.log(`${i + 1}. PID: ${o.patient_id} | 決済: ${paidAt} | DB登録: ${createdAt} | 発送日: ${shippingDate} | 追跡: ${trackingNumber}`);
    }
  });

  console.log(`\n=== 集計 ===`);
  console.log(`発送日あり: ${hasShippingDate}件`);
  console.log(`発送日なし: ${noShippingDate}件`);
  
  if (noShippingDate > 0) {
    console.log(`\n⚠️  発送日が入っていない注文が${noShippingDate}件あります`);
  } else {
    console.log(`\n✅ 全注文に発送日が入っています`);
  }
}

checkShippingDates().catch(console.error);
