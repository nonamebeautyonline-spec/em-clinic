// app/api/cron/sync-intake/route.ts
// Vercel Cronで定期実行：GASからSupabaseへ問診データを同期

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 最大60秒

const GAS_INTAKE_URL = process.env.GAS_INTAKE_URL || process.env.GAS_INTAKE_LIST_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  try {
    // Cron認証チェック
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Cron] Starting intake sync...');

    if (!GAS_INTAKE_URL || !SUPABASE_URL || !SUPABASE_KEY) {
      return NextResponse.json(
        { error: 'Missing environment variables' },
        { status: 500 }
      );
    }

    // 1. GASから全データ取得
    console.log('[Cron] Fetching from GAS...');
    const gasResponse = await fetch(GAS_INTAKE_URL, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!gasResponse.ok) {
      throw new Error(`GAS fetch failed: ${gasResponse.status}`);
    }

    const gasData = await gasResponse.json();

    let gasRows: any[];
    if (gasData.ok && Array.isArray(gasData.rows)) {
      gasRows = gasData.rows;
    } else if (Array.isArray(gasData)) {
      gasRows = gasData;
    } else {
      throw new Error('Invalid GAS response');
    }

    console.log(`[Cron] Fetched ${gasRows.length} rows from GAS`);

    // 2. Supabaseから既存のpatient_idリストを取得
    console.log('[Cron] Fetching existing patient IDs from Supabase...');
    const existingIdsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/intake?select=patient_id,reserve_id,reserved_date,reserved_time`,
      {
        method: 'GET',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Range: '0-9999', // 最大10000件
        },
      }
    );

    if (!existingIdsResponse.ok) {
      throw new Error(`Supabase fetch failed: ${existingIdsResponse.status}`);
    }

    const existingRecords = await existingIdsResponse.json();
    console.log(`[Cron] Found ${existingRecords.length} existing records in Supabase`);

    // 既存レコードのマップを作成（patient_id → record）
    const existingMap = new Map(
      existingRecords.map((r: any) => [r.patient_id, r])
    );

    // 3. 差分を検出（新規または更新が必要なレコード）
    const toInsert: any[] = [];
    const toUpdate: any[] = [];

    for (const row of gasRows) {
      const pid = String(row.patient_id || '').trim();
      if (!pid) continue;

      const record = {
        patient_id: pid,
        reserve_id: String(row.reserveId || row.reserve_id || '').trim() || null,
        reserved_date: String(row.reserved_date || '').trim() || null,
        reserved_time: String(row.reserved_time || '').trim() || null,
        patient_name: String(row.patient_name || row.name || row['氏名'] || '').trim() || null,
        status: String(row.status || '').trim() || null,
        note: String(row.note || '').trim() || null,
        prescription_menu: String(row.prescription_menu || '').trim() || null,
        line_id: String(row.line_id || '').trim() || null,
        answerer_id: String(row.answerer_id || '').trim() || null,
        answers: extractAnswers(row),
      };

      const existing = existingMap.get(pid);

      if (!existing) {
        // 新規レコード
        toInsert.push(record);
      } else {
        // 既存レコードと比較
        const needsUpdate =
          existing.reserve_id !== record.reserve_id ||
          existing.reserved_date !== record.reserved_date ||
          existing.reserved_time !== record.reserved_time;

        if (needsUpdate) {
          toUpdate.push(record);
        }
      }
    }

    console.log(`[Cron] To insert: ${toInsert.length}, To update: ${toUpdate.length}`);

    let inserted = 0;
    let updated = 0;

    // 4. 新規レコードを挿入
    if (toInsert.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < toInsert.length; i += batchSize) {
        const batch = toInsert.slice(i, i + batchSize);

        const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/intake`, {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify(batch),
        });

        if (!insertResponse.ok) {
          const errorText = await insertResponse.text();
          console.error(`[Cron] Insert batch ${i} failed: ${errorText}`);
          // 続行する（部分的な成功でも記録）
        } else {
          inserted += batch.length;
          console.log(`[Cron] Inserted batch: ${inserted}/${toInsert.length}`);
        }
      }
    }

    // 5. 既存レコードを更新（予約情報のみ）
    if (toUpdate.length > 0) {
      for (const record of toUpdate) {
        const updateResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/intake?patient_id=eq.${encodeURIComponent(record.patient_id)}`,
          {
            method: 'PATCH',
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              reserve_id: record.reserve_id,
              reserved_date: record.reserved_date,
              reserved_time: record.reserved_time,
              patient_name: record.patient_name,
            }),
          }
        );

        if (updateResponse.ok) {
          updated++;
        } else {
          console.error(`[Cron] Update failed for ${record.patient_id}`);
        }
      }
      console.log(`[Cron] Updated ${updated}/${toUpdate.length} records`);
    }

    console.log('[Cron] Sync completed successfully');

    return NextResponse.json({
      ok: true,
      gasTotal: gasRows.length,
      supabaseExisting: existingRecords.length,
      inserted,
      updated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}

// 問診回答を抽出
function extractAnswers(row: any): Record<string, any> {
  const answers: Record<string, any> = {};

  for (const key of Object.keys(row)) {
    if (
      ![
        'patient_id',
        'reserve_id',
        'reserved_date',
        'reserved_time',
        'patient_name',
        'status',
        'note',
        'prescription_menu',
        'line_id',
        'answerer_id',
        '予約時間',
        'reserveId',
      ].includes(key) &&
      row[key] !== undefined &&
      row[key] !== null &&
      row[key] !== ''
    ) {
      answers[key] = row[key];
    }
  }

  return answers;
}
