// 配信済み2グループのメッセージログをmessage_logテーブルに記録するスクリプト

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TENANT_ID = "00000000-0000-0000-0000-000000000001";

const MSG_GROUP1 = `当院で診察を受けて決済がお済みでない方に配信しています。
既に決済を済ませていて行き違いの場合は申し訳ありません。

マイページより決済が可能となっております。
ご確認いただけますと幸いです。

何かわからないことがありましたらお気軽にご相談ください🌸`;

const MSG_GROUP2 = `当院でまだ診察を受けていない方に配信しています。
既に予約を取られていて行き違いの場合は申し訳ありません。

マイページより予約が可能となっております。
今週は比較的に予約が取りやすくなっておりますが、来週以降予約が早めに埋まることが予想されます。
処方を希望される場合はお早めに予約を取ることをお勧めします。

何かわからないことがありましたらお気軽にご相談ください🌸`;

(async () => {
  const today = new Date().toISOString().split('T')[0];

  // データ取得
  const [{ data: allPatients }, { data: allReservations }, { data: allOrders }] = await Promise.all([
    supabase.from('patients').select('patient_id, name, line_id'),
    supabase.from('reservations').select('patient_id, status, reserved_date'),
    supabase.from('orders').select('patient_id'),
  ]);

  const orderedPatientIds = new Set((allOrders || []).map(o => o.patient_id));
  const patientMap = {};
  (allPatients || []).forEach(p => { patientMap[p.patient_id] = p; });

  const patientStatuses = {};
  (allReservations || []).forEach(r => {
    if (!patientStatuses[r.patient_id]) patientStatuses[r.patient_id] = new Set();
    patientStatuses[r.patient_id].add(r.status || 'pending');
  });

  const futureActivePatientIds = new Set();
  (allReservations || []).forEach(r => {
    if (r.reserved_date >= today && r.status !== 'canceled') {
      futureActivePatientIds.add(r.patient_id);
    }
  });

  // グループ1
  const group1 = Object.keys(patientStatuses)
    .filter(pid =>
      patientStatuses[pid].has('OK')
      && !orderedPatientIds.has(pid)
      && patientMap[pid] && patientMap[pid].line_id
    );

  // グループ2
  const group2 = (allPatients || [])
    .filter(p => {
      const pid = p.patient_id;
      const hasExamination = patientStatuses[pid] &&
        (patientStatuses[pid].has('OK') || patientStatuses[pid].has('NG'));
      const hasFutureActive = futureActivePatientIds.has(pid);
      return !hasExamination && !hasFutureActive && !!p.line_id;
    })
    .map(p => p.patient_id);

  // 直近のbroadcastレコードを取得（さっき作ったもの）
  const { data: broadcasts } = await supabase
    .from('broadcasts')
    .select('id, name')
    .eq('created_by', 'script')
    .order('created_at', { ascending: false })
    .limit(2);

  // name で判別
  let g1BroadcastId = null;
  let g2BroadcastId = null;
  for (const b of broadcasts || []) {
    if (b.name.includes('未決済')) g1BroadcastId = b.id;
    if (b.name.includes('未診察')) g2BroadcastId = b.id;
  }

  console.log('グループ1 broadcast_id:', g1BroadcastId);
  console.log('グループ2 broadcast_id:', g2BroadcastId);
  console.log('グループ1:', group1.length, '人');
  console.log('グループ2:', group2.length, '人');
  console.log('');

  // バッチINSERT（Supabaseは1回1000行まで）
  async function insertLogs(pids, message, campaignId, label) {
    const rows = pids.map(pid => ({
      tenant_id: TENANT_ID,
      patient_id: pid,
      line_uid: patientMap[pid]?.line_id || null,
      event_type: 'message',
      message_type: 'broadcast',
      content: message,
      status: 'sent',
      campaign_id: campaignId,
      direction: 'outgoing',
    }));

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error } = await supabase.from('message_log').insert(batch);
      if (error) {
        console.error(`  ${label} バッチ${Math.floor(i / 500) + 1} エラー:`, error.message);
      } else {
        inserted += batch.length;
        console.log(`  ${label} バッチ${Math.floor(i / 500) + 1}: ${batch.length}件 INSERT 成功`);
      }
    }
    return inserted;
  }

  console.log('>>> グループ1 メッセージログ記録');
  const g1Count = await insertLogs(group1, MSG_GROUP1, g1BroadcastId, 'G1');

  console.log('');
  console.log('>>> グループ2 メッセージログ記録');
  const g2Count = await insertLogs(group2, MSG_GROUP2, g2BroadcastId, 'G2');

  console.log('');
  console.log('=== 完了 ===');
  console.log(`グループ1: ${g1Count}件 / グループ2: ${g2Count}件 のメッセージログを記録`);
})();
