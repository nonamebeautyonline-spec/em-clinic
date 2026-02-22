require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const token = process.env.LINE_MESSAGING_API_CHANNEL_ACCESS_TOKEN;

const PRE_MENU = 'richmenu-a833fc4dab3495fc3eb421130675d37e';  // 個人情報入力前
const POST_MENU = 'richmenu-5267d56da481a7f0cb06a01d4a659f86'; // 個人情報入力後
const RX_MENU = 'richmenu-e002a4f2cbcd2063058cd58c55dae129';   // 処方後

(async () => {
  // 1. LINE_ プレフィックスの intake レコード（line_id あり）を取得
  const { data: intakes } = await supabase
    .from('intake')
    .select('patient_id, line_id, answers')
    .like('patient_id', 'LINE_%')
    .not('line_id', 'is', null);

  // patient_id ごとにユニークにする
  const byPid = {};
  for (const row of intakes || []) {
    if (!byPid[row.patient_id]) byPid[row.patient_id] = row;
  }
  const patients = Object.values(byPid);
  console.log('LINE_ プレフィックス患者数:', patients.length);

  // 2. answerers テーブルで該当する patient_id を確認
  const pids = patients.map(p => p.patient_id);
  const { data: answerers } = await supabase
    .from('answerers')
    .select('patient_id')
    .in('patient_id', pids);
  const hasAnswerer = new Set((answerers || []).map(a => a.patient_id));

  // 個人情報未登録の人だけに絞る
  const noInfo = patients.filter(p => !hasAnswerer.has(p.patient_id) && !p.answers);
  console.log('answerers なし & answers なし:', noInfo.length);

  // 3. LINE API で各ユーザーの現在のリッチメニューを確認
  const wrongMenu = [];
  let checked = 0;
  for (const p of noInfo) {
    try {
      const res = await fetch('https://api.line.me/v2/bot/user/' + p.line_id + '/richmenu', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      checked++;
      if (res.status === 200) {
        const data = await res.json();
        if (data.richMenuId !== PRE_MENU) {
          const menuName = data.richMenuId === POST_MENU ? '個人情報入力後'
            : data.richMenuId === RX_MENU ? '処方後'
            : data.richMenuId;
          wrongMenu.push({ pid: p.patient_id, line_id: p.line_id, menu: menuName });
        }
      }
      // 404 = 個別割当なし → デフォルトメニュー適用 → OK
    } catch (e) {
      // skip
    }
    // rate limit 回避
    if (checked % 50 === 0) await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n=== 間違ったメニューが割り当てられている人 ===');
  console.log('件数:', wrongMenu.length);
  for (const w of wrongMenu) {
    console.log(w.pid, '->', w.menu);
  }
})();
