import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const missingPatients = [
  { pid: '20260100043', source: 'クレカ' },
  { pid: '20260100379', source: '銀行振込' },
  { pid: '20260100903', source: '銀行振込' },
  { pid: '20260100482', source: '銀行振込' },
];

async function checkGASIntake() {
  console.log('=== GAS問診シートで4名の患者を確認 ===\n');

  const gasUrl = process.env.GAS_INTAKE_URL;
  if (!gasUrl) {
    console.log('⚠️ GAS_INTAKE_URL が設定されていません');
    return;
  }

  const patientIds = missingPatients.map(p => p.pid);

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'get_intake_by_patient_ids',
        patient_ids: patientIds,
      }),
    });

    if (!res.ok) {
      console.error(`❌ GAS API呼び出し失敗: ${res.status}`);
      const text = await res.text();
      console.error('Response:', text);
      return;
    }

    const gasData = await res.json();
    console.log(`GASから取得件数: ${gasData?.data?.length || 0}件\n`);

    if (gasData?.data && gasData.data.length > 0) {
      console.log('【GAS問診シートに存在するデータ】');
      console.log('─'.repeat(60));
      gasData.data.forEach((row, i) => {
        const source = missingPatients.find(p => p.pid === row.patient_id)?.source;
        console.log(`${i + 1}. ${source} - ${row.patient_id}`);
        console.log(`   氏名: "${row.patient_name}"`);
        console.log(`   ステータス: ${row.status}`);
        console.log(`   予約日: ${row.reserved_date}`);
        console.log('');
      });
    }

    // GASに存在しない患者IDを特定
    const gasFoundIds = new Set((gasData?.data || []).map(r => r.patient_id));
    const gasMissingIds = patientIds.filter(id => !gasFoundIds.has(id));

    if (gasMissingIds.length > 0) {
      console.log('\n【GAS問診シートに存在しない患者】');
      console.log('─'.repeat(60));
      gasMissingIds.forEach((id, i) => {
        const source = missingPatients.find(p => p.pid === id)?.source;
        console.log(`${i + 1}. ${source} - ${id}`);
      });
      console.log('');
    }

  } catch (e) {
    console.error('❌ GAS APIエラー:', e.message);
  }
}

checkGASIntake().catch(console.error);
