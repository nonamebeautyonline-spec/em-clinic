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

async function check() {
  const fixTime = '2026-01-30T04:00:00Z';
  
  const { data: reservations } = await supabase
    .from('reservations')
    .select('patient_id, reserve_id, created_at, status')
    .gte('created_at', fixTime)
    .neq('status', 'canceled'); // キャンセル済み予約を除外
  
  console.log('1/30以降のreservations:', reservations.length, '件\n');
  
  // ★ 全件取得（1000件制限を回避）
  let allIntake = [];
  let page = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('intake')
      .select('patient_id, reserve_id')
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) {
      console.error('Error fetching intake:', error);
      break;
    }

    if (!data || data.length === 0) break;

    allIntake = allIntake.concat(data);

    if (data.length < pageSize) break;
    page++;
  }

  console.log('intake総取得件数:', allIntake.length, '件\n');
  
  const intakeMap = new Map();
  allIntake.forEach(r => intakeMap.set(r.patient_id, r));

  console.log('【デバッグ】Map構築確認');
  console.log('intake総件数:', allIntake.length);
  console.log('Map size:', intakeMap.size);
  console.log('\nSample intake Map entries (最初の5件):');
  const entries = Array.from(intakeMap.entries()).slice(0, 5);
  entries.forEach(([key, val]) => {
    console.log(`  Key: "${key}" (type: ${typeof key}), reserve_id: ${val.reserve_id}`);
  });

  console.log('\nSample reservations (最初の5件):');
  reservations.slice(0, 5).forEach(r => {
    console.log(`  patient_id: "${r.patient_id}" (type: ${typeof r.patient_id}), has in Map: ${intakeMap.has(r.patient_id)}`);
  });

  const missingInIntake = reservations.filter(r => !intakeMap.has(r.patient_id));

  if (missingInIntake.length > 0) {
    console.log('\n【デバッグ】"Missing"とされた最初の3件を詳細確認:');
    for (const r of missingInIntake.slice(0, 3)) {
      console.log(`\n  patient_id: "${r.patient_id}" (type: ${typeof r.patient_id})`);
      console.log(`  intakeMap.has(): ${intakeMap.has(r.patient_id)}`);
      console.log(`  intakeMap.get(): ${JSON.stringify(intakeMap.get(r.patient_id))}`);

      // 念のため全intakeから直接検索
      const found = allIntake.find(i => i.patient_id === r.patient_id);
      console.log(`  allIntake.find()で検索: ${found ? '見つかった' : '見つからない'}`);
      if (found) {
        console.log(`    → patient_id: "${found.patient_id}", reserve_id: ${found.reserve_id}`);
      }
    }
  }

  const inIntakeButNotUpdated = reservations.filter(r => {
    const intake = intakeMap.get(r.patient_id);
    return intake && (!intake.reserve_id || intake.reserve_id !== r.reserve_id);
  });
  
  console.log('【結果】');
  console.log('reservationsにあり、intakeにもある:', reservations.length - missingInIntake.length, '件');
  console.log('reservationsにあり、intakeにない:', missingInIntake.length, '件');
  console.log('intakeにあるがreserve_id未更新:', inIntakeButNotUpdated.length, '件\n');
  
  if (missingInIntake.length === 0 && inIntakeButNotUpdated.length === 0) {
    console.log('✅ 修正後は全て正常に同期されています！');
  } else {
    if (missingInIntake.length > 0) {
      console.log('❌ intakeに存在しない:', missingInIntake.slice(0, 5).map(r => r.patient_id));
    }
    if (inIntakeButNotUpdated.length > 0) {
      console.log('⚠️ reserve_id未更新:', inIntakeButNotUpdated.slice(0, 5).map(r => r.patient_id));
    }
  }
}

check().catch(console.error);
