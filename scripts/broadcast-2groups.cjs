// 2グループへの一斉配信スクリプト
// グループ1: 診察OK済み & 未決済（207人）
// グループ2: 未診察 & 未来アクティブ予約なし（1,324人）

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LINE_API = "https://api.line.me/v2/bot/message";
const LINE_TOKEN = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;
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

async function multicast(lineUserIds, message) {
  const results = [];
  for (let i = 0; i < lineUserIds.length; i += 500) {
    const batch = lineUserIds.slice(i, i + 500);
    console.log(`  バッチ ${Math.floor(i / 500) + 1}: ${batch.length}人に送信中...`);
    const res = await fetch(`${LINE_API}/multicast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify({
        to: batch,
        messages: [{ type: "text", text: message }],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`  エラー ${res.status}:`, text);
    } else {
      console.log(`  成功`);
    }
    results.push({ ok: res.ok, status: res.status, count: batch.length });
  }
  return results;
}

(async () => {
  const today = new Date().toISOString().split('T')[0];
  console.log('=== 一斉配信スクリプト ===');
  console.log('実行日:', today);
  console.log('');

  // データ取得
  const [{ data: allPatients }, { data: allReservations }, { data: allOrders }] = await Promise.all([
    supabase.from('patients').select('patient_id, name, line_id'),
    supabase.from('reservations').select('patient_id, status, reserved_date'),
    supabase.from('orders').select('patient_id'),
  ]);

  const orderedPatientIds = new Set((allOrders || []).map(o => o.patient_id));
  const patientMap = {};
  (allPatients || []).forEach(p => { patientMap[p.patient_id] = p; });

  // 予約ステータス
  const patientStatuses = {};
  (allReservations || []).forEach(r => {
    if (!patientStatuses[r.patient_id]) patientStatuses[r.patient_id] = new Set();
    patientStatuses[r.patient_id].add(r.status || 'pending');
  });

  // 未来アクティブ予約
  const futureActivePatientIds = new Set();
  (allReservations || []).forEach(r => {
    if (r.reserved_date >= today && r.status !== 'canceled') {
      futureActivePatientIds.add(r.patient_id);
    }
  });

  // グループ1: 診察OK済み & 決済なし & LINE IDあり
  const group1LineIds = Object.keys(patientStatuses)
    .filter(pid =>
      patientStatuses[pid].has('OK')
      && !orderedPatientIds.has(pid)
      && patientMap[pid] && patientMap[pid].line_id
    )
    .map(pid => patientMap[pid].line_id);

  // グループ2: 未診察 & 未来アクティブ予約なし & LINE IDあり
  const group2LineIds = (allPatients || [])
    .filter(p => {
      const pid = p.patient_id;
      const hasExamination = patientStatuses[pid] &&
        (patientStatuses[pid].has('OK') || patientStatuses[pid].has('NG'));
      const hasFutureActive = futureActivePatientIds.has(pid);
      return !hasExamination && !hasFutureActive && !!p.line_id;
    })
    .map(p => p.line_id);

  console.log('グループ1（診察OK済み & 未決済）:', group1LineIds.length, '人');
  console.log('グループ2（未診察 & 未来予約なし）:', group2LineIds.length, '人');
  console.log('');

  // --- グループ1 送信 ---
  console.log('>>> グループ1 送信開始');
  const g1Results = await multicast(group1LineIds, MSG_GROUP1);
  const g1Sent = g1Results.filter(r => r.ok).reduce((s, r) => s + r.count, 0);
  const g1Failed = g1Results.filter(r => !r.ok).reduce((s, r) => s + r.count, 0);
  console.log(`グループ1 完了: 成功=${g1Sent}, 失敗=${g1Failed}`);

  // broadcasts テーブルに記録
  await supabase.from('broadcasts').insert({
    tenant_id: TENANT_ID,
    name: '診察OK済み＆未決済リマインド配信',
    filter_rules: {},
    message_content: MSG_GROUP1,
    status: 'sent',
    sent_at: new Date().toISOString(),
    total_targets: group1LineIds.length,
    sent_count: g1Sent,
    failed_count: g1Failed,
    no_uid_count: 0,
    created_by: 'script',
  });

  console.log('');

  // --- グループ2 送信 ---
  console.log('>>> グループ2 送信開始');
  const g2Results = await multicast(group2LineIds, MSG_GROUP2);
  const g2Sent = g2Results.filter(r => r.ok).reduce((s, r) => s + r.count, 0);
  const g2Failed = g2Results.filter(r => !r.ok).reduce((s, r) => s + r.count, 0);
  console.log(`グループ2 完了: 成功=${g2Sent}, 失敗=${g2Failed}`);

  // broadcasts テーブルに記録
  await supabase.from('broadcasts').insert({
    tenant_id: TENANT_ID,
    name: '未診察＆未予約リマインド配信',
    filter_rules: {},
    message_content: MSG_GROUP2,
    status: 'sent',
    sent_at: new Date().toISOString(),
    total_targets: group2LineIds.length,
    sent_count: g2Sent,
    failed_count: g2Failed,
    no_uid_count: 0,
    created_by: 'script',
  });

  console.log('');
  console.log('=== 全完了 ===');
  console.log(`グループ1: ${g1Sent}人送信 / グループ2: ${g2Sent}人送信`);
})();
