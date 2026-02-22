require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const WRONG_PIDS = [
  'LINE_be3a1312','LINE_49188dff','LINE_27c1a91f','LINE_2ee30f20','LINE_f9b0483d',
  'LINE_473a4ab1','LINE_045fc8d1','LINE_8c58cabe','LINE_43f4bafa','LINE_8a8fd99e',
  'LINE_cde22afd','LINE_f2e98de9','LINE_68f65d22','LINE_fca57da1','LINE_febb565a',
  'LINE_ed755a1f','LINE_4046522a','LINE_9ad524ed','LINE_848e685b','LINE_0384e55c',
  'LINE_fa81dda7','LINE_12209df8','LINE_93e9059c','LINE_129915a6','LINE_821d38d0',
  'LINE_0501d6c7','LINE_cd706144','LINE_eb2426e2','LINE_d5c019c8','LINE_aadb72a1',
  'LINE_9d3fde47','LINE_6cd9af2c','LINE_a1b35b01','LINE_a166a9ee','LINE_4e4188c2',
  'LINE_1f8c2160','LINE_d0a1c1b1','LINE_619027ff','LINE_51788ef3','LINE_896b1e93',
  'LINE_a1cc9dc2','LINE_b4625256','LINE_7a112fb1','LINE_c7b6604e','LINE_5c962dd5',
  'LINE_06ada8c8','LINE_e1ce2ffe','LINE_f85d1506','LINE_002cfebf','LINE_88cff35f',
  'LINE_d8a3babe','LINE_9e61e686','LINE_083ea138','LINE_2a244257','LINE_68f4daff',
  'LINE_b36edb09','LINE_53c5c3d4','LINE_a1bcb73c','LINE_88901cdb','LINE_f6704cb0',
  'LINE_d83ea586','LINE_e3858e6c','LINE_7ebda3df','LINE_0aa5b6ab','LINE_bb899468',
  'LINE_050a61c6','LINE_45dbc4a4','LINE_75eb7cdd','LINE_a8da9021','LINE_3c0a2bff',
  'LINE_8e761111','LINE_af4b8238','LINE_581d665b','LINE_5714b4b9','LINE_e55ee334',
  'LINE_c73da66e','LINE_fd006095',
];

(async () => {
  // 1. 予約があるか
  const { data: reservations } = await supabase
    .from('reservations')
    .select('patient_id')
    .in('patient_id', WRONG_PIDS);
  const hasReservation = new Set((reservations || []).map(r => r.patient_id));
  console.log('予約ありの人:', hasReservation.size, [...hasReservation]);

  // 2. answerers があるか（再確認）
  const { data: answerers } = await supabase
    .from('answerers')
    .select('patient_id, name, tel')
    .in('patient_id', WRONG_PIDS);
  const hasAnswerer = new Set((answerers || []).map(a => a.patient_id));
  console.log('answerers ありの人:', hasAnswerer.size, [...hasAnswerer]);

  // 3. intake に answers があるか
  const { data: intakes } = await supabase
    .from('intake')
    .select('patient_id, answers, status, reserve_id, reserved_date')
    .in('patient_id', WRONG_PIDS)
    .not('answers', 'is', null);
  const hasAnswers = new Set((intakes || []).map(i => i.patient_id));
  console.log('intake.answers ありの人:', hasAnswers.size, [...hasAnswers]);

  // 4. orders があるか
  const { data: orders } = await supabase
    .from('orders')
    .select('patient_id')
    .in('patient_id', WRONG_PIDS);
  const hasOrders = new Set((orders || []).map(o => o.patient_id));
  console.log('orders ありの人:', hasOrders.size, [...hasOrders]);

  // 全部なしの人
  const trulyEmpty = WRONG_PIDS.filter(pid =>
    !hasReservation.has(pid) && !hasAnswerer.has(pid) && !hasAnswers.has(pid) && !hasOrders.has(pid)
  );
  console.log('\n完全に何もない人:', trulyEmpty.length, '/', WRONG_PIDS.length);

  // 何かある人の内訳
  const hasAnything = WRONG_PIDS.filter(pid =>
    hasReservation.has(pid) || hasAnswerer.has(pid) || hasAnswers.has(pid) || hasOrders.has(pid)
  );
  if (hasAnything.length > 0) {
    console.log('\n何かデータがある人:');
    for (const pid of hasAnything) {
      const parts = [];
      if (hasReservation.has(pid)) parts.push('予約');
      if (hasAnswerer.has(pid)) parts.push('answerer');
      if (hasAnswers.has(pid)) parts.push('answers');
      if (hasOrders.has(pid)) parts.push('orders');
      console.log(' ', pid, '->', parts.join(', '));
    }
  }
})();
