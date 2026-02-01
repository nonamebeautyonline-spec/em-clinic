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

const problemPatients = ['20260100043', '20260100379', '20260100903', '20260100482'];

async function syncFromGAS() {
  console.log('=== GAS問診シートから4名のデータを取得してSupabaseに同期 ===\n');

  const gasUrl = process.env.GAS_MYPAGE_URL;
  if (!gasUrl) {
    console.error('❌ GAS_MYPAGE_URL が設定されていません');
    return;
  }

  console.log('【1】GASから4名のデータを取得中...\n');

  try {
    // GAS問診シートから全データ取得
    const res = await fetch(`${gasUrl}`, {
      method: 'GET',
    });

    if (!res.ok) {
      console.error(`❌ GAS API呼び出し失敗: ${res.status}`);
      const text = await res.text();
      console.error('Response:', text);
      return;
    }

    const allData = await res.json();
    console.log(`✅ GASから${allData.length}件取得\n`);

    // 問題の4名をフィルタ（Patient_ID（string）またはpatient_id（number）で検索）
    const targetData = allData.filter(row => {
      const pidStr = row.Patient_ID || String(row.patient_id || '');
      return problemPatients.includes(pidStr);
    });

    console.log(`【2】対象患者: ${targetData.length}件\n`);

    if (targetData.length === 0) {
      console.error('❌ GAS問診シートに4名のデータが見つかりません');
      console.log('   確認してください:');
      problemPatients.forEach((id, i) => {
        console.log(`   ${i + 1}. ${id}`);
      });
      return;
    }

    // 見つかった患者を表示
    targetData.forEach((row, i) => {
      const pidStr = row.Patient_ID || String(row.patient_id || '');
      console.log(`${i + 1}. ${pidStr}`);
      console.log(`   氏名: "${row.name || row['氏名']}"`);
      console.log(`   ステータス: ${row.status}`);
      console.log(`   予約日: ${row.reserved_date || row['予約日']}`);
      console.log('');
    });

    // 見つからなかった患者を表示
    const foundIds = new Set(targetData.map(r => r.patient_id));
    const notFound = problemPatients.filter(id => !foundIds.has(id));

    if (notFound.length > 0) {
      console.log('⚠️ GASシートに見つからなかった患者:');
      notFound.forEach((id, i) => {
        console.log(`  ${i + 1}. ${id}`);
      });
      console.log('');
    }

    console.log('【3】Supabase intakeテーブルに挿入中...\n');

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const row of targetData) {
      try {
        // patient_idを文字列として取得
        const pidStr = row.Patient_ID || String(row.patient_id || '');

        // 既存レコード確認
        const { data: existing } = await supabase
          .from('intake')
          .select('id, patient_id')
          .eq('patient_id', pidStr)
          .maybeSingle();

        // answersオブジェクトを構築（GASの問診データから）
        const answers = {
          name: row.name || row['氏名'] || '',
          sex: row.sex || '',
          birth: row.birth || '',
          ng_check: row.ng_check || '',
          current_disease_yesno: row.current_disease_yesno || '',
          current_disease_detail: row.current_disease_detail || '',
          glp_history: row.glp_history || '',
          med_yesno: row.med_yesno || '',
          med_detail: row.med_detail || '',
          allergy_yesno: row.allergy_yesno || '',
          allergy_detail: row.allergy_detail || '',
          entry_route: row.entry_route || '',
          entry_other: row.entry_other || '',
          name_kana: row.name_kana || '',
          tel: row.tel || '',
        };

        const intakeData = {
          reserve_id: row.reserveId || row.reserved || null,
          patient_id: pidStr,
          answerer_id: row.answerer_id || null,
          line_id: row.line_id || null,
          patient_name: row.name || row['氏名'] || '',
          answers: answers,
          reserved_date: row.reserved_date || row['予約日'] || null,
          reserved_time: row.reserved_time || row['予約時間'] || null,
          status: row.status || 'pending',
          note: row.doctor_note || null,
          prescription_menu: row.prescription_menu || null,
          call_status: row.call_status || null,
          call_status_updated_at: row.call_status_updated_at || null,
        };

        if (existing) {
          // 更新
          const { error: updateError } = await supabase
            .from('intake')
            .update(intakeData)
            .eq('id', existing.id);

          if (updateError) {
            console.error(`❌ 更新エラー [${pidStr}]:`, updateError.message);
            errors++;
          } else {
            console.log(`✅ 更新成功 [${pidStr}]: ${intakeData.patient_name}`);
            updated++;
          }
        } else {
          // 新規挿入
          const { error: insertError } = await supabase
            .from('intake')
            .insert(intakeData);

          if (insertError) {
            console.error(`❌ 挿入エラー [${pidStr}]:`, insertError.message);
            errors++;
          } else {
            console.log(`✅ 挿入成功 [${pidStr}]: ${intakeData.patient_name}`);
            inserted++;
          }
        }

      } catch (e) {
        console.error(`❌ 例外 [${pidStr}]:`, e.message);
        errors++;
      }
    }

    console.log('\n【4】同期完了');
    console.log('─'.repeat(60));
    console.log(`新規挿入: ${inserted}件`);
    console.log(`更新: ${updated}件`);
    console.log(`エラー: ${errors}件`);
    console.log('');

    // 最終確認
    const { data: checkData } = await supabase
      .from('intake')
      .select('patient_id, patient_name, status')
      .in('patient_id', problemPatients);

    console.log('【5】最終確認');
    console.log('─'.repeat(60));
    console.log(`Supabase intakeに存在: ${checkData?.length || 0}/4件\n`);

    if (checkData && checkData.length > 0) {
      checkData.forEach((row, i) => {
        console.log(`${i + 1}. ${row.patient_id}`);
        console.log(`   氏名: "${row.patient_name}"`);
        console.log(`   ステータス: ${row.status}`);
        console.log('');
      });
    }

    const finalFoundIds = new Set((checkData || []).map(r => r.patient_id));
    const stillMissing = problemPatients.filter(id => !finalFoundIds.has(id));

    if (stillMissing.length > 0) {
      console.log('⚠️ まだ存在しない患者:');
      stillMissing.forEach((id, i) => {
        console.log(`  ${i + 1}. ${id}`);
      });
    } else {
      console.log('🎉 全4名の同期が完了しました！');
    }

  } catch (e) {
    console.error('❌ エラー:', e.message);
  }
}

syncFromGAS().catch(console.error);
