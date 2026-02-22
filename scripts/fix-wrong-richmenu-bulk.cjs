// 77人のリッチメニューを「個人情報入力前」に一括修正
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const token = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const PRE_MENU = 'richmenu-a833fc4dab3495fc3eb421130675d37e'; // 個人情報入力前

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
  // intake から line_id を取得
  const { data: intakes } = await supabase
    .from('intake')
    .select('patient_id, line_id')
    .in('patient_id', WRONG_PIDS)
    .not('line_id', 'is', null);

  const byPid = {};
  for (const row of intakes || []) {
    if (!byPid[row.patient_id]) byPid[row.patient_id] = row;
  }

  let ok = 0;
  let fail = 0;

  for (const pid of WRONG_PIDS) {
    const row = byPid[pid];
    if (!row) {
      console.log(`  スキップ: ${pid} (line_id なし)`);
      continue;
    }

    const res = await fetch(
      `https://api.line.me/v2/bot/user/${row.line_id}/richmenu/${PRE_MENU}`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.ok) {
      ok++;
    } else {
      fail++;
      const text = await res.text();
      console.log(`  失敗: ${pid} ${res.status} ${text}`);
    }

    if (ok % 50 === 0) await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n完了: 成功=${ok}, 失敗=${fail}`);
})();
