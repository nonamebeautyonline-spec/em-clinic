# 問診データ同期の恒久対策

## 問題の根本原因

1. 問診送信時にSupabase書き込みが失敗するケースがある
   - `skipSupabase=true`フラグ
   - Supabase APIエラー
   - ネットワークタイムアウト

2. dedup機能により、同一patient_idは1回のみ登録
   - GASシートには存在するが、Supabaseには存在しないケースが発生

3. `backfillAllIntakeDataToSupabase`は既存レコードの補完のみ
   - 新規レコード挿入機能がない

## 実装した対策

### 1. 全件同期スクリプトの作成

**ファイル**: `/scripts/sync-4patients-from-gas.mjs`

- GAS問診シートから対象患者を取得
- Supabaseに存在しない場合は新規挿入
- 存在する場合は更新

### 2. 今後の恒久対策

#### オプション A: GAS関数の修正（推奨）

**ファイル**: `gas/intake/code.js`

**修正内容**:

1. `backfillAllIntakeDataToSupabase` を `syncAllIntakeDataToSupabase` に変更
2. 既存レコードの補完だけでなく、新規レコードの挿入も実行
3. 全patient_idについて、Supabaseに存在しない場合は挿入

**実装方法**:

```javascript
function syncAllIntakeDataToSupabase() {
  Logger.log("=== syncAllIntakeDataToSupabase START ===");

  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const supabaseKey = props.getProperty("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    Logger.log("[SyncAll] ERROR: Missing SUPABASE_URL or SUPABASE_ANON_KEY");
    return;
  }

  // 1. Supabaseから全patient_idを取得
  const getUrl = supabaseUrl + "/rest/v1/intake?select=patient_id&order=created_at.desc&limit=10000";

  let existingPids = new Set();
  try {
    const getRes = UrlFetchApp.fetch(getUrl, {
      method: "get",
      headers: {
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey
      },
      muteHttpExceptions: true
    });

    if (getRes.getResponseCode() === 200) {
      const allRecords = JSON.parse(getRes.getContentText());
      allRecords.forEach(rec => {
        if (rec.patient_id) existingPids.add(normPid_(rec.patient_id));
      });
    }

    Logger.log("[SyncAll] Existing records in Supabase: " + existingPids.size);
  } catch (e) {
    Logger.log("[SyncAll] ERROR fetching from Supabase: " + e);
    return;
  }

  // 2. 問診シートから全データ取得
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const qSheet = ss.getSheetByName(SHEET_NAME_INTAKE);
  if (!qSheet) {
    Logger.log("[SyncAll] ERROR: Sheet not found: " + SHEET_NAME_INTAKE);
    return;
  }

  const lastRow = qSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("[SyncAll] No data rows in intake sheet");
    return;
  }

  const allData = qSheet.getRange(2, 1, lastRow - 1, 27).getValues();

  // 3. Supabaseに存在しないpatient_idを抽出して挿入
  let insertedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const pid = normPid_(row[25]); // Z列 (patient_id)
    if (!pid) continue;

    // Supabaseに存在するかチェック
    const exists = existingPids.has(pid);

    // データを構築（既存のバックフィルロジックと同じ）
    const reserveId = (row[1] || "").toString().trim();
    const name = (row[3] || "").toString().trim();
    // ... (以下、既存のバックフィルロジックと同じ)

    if (!exists) {
      // 新規挿入
      try {
        const insertUrl = supabaseUrl + "/rest/v1/intake";
        const res = UrlFetchApp.fetch(insertUrl, {
          method: "post",
          contentType: "application/json",
          headers: {
            "apikey": supabaseKey,
            "Authorization": "Bearer " + supabaseKey,
            "Prefer": "resolution=merge-duplicates"
          },
          payload: JSON.stringify(payload),
          muteHttpExceptions: true
        });

        if (res.getResponseCode() >= 200 && res.getResponseCode() < 300) {
          insertedCount++;
          Logger.log("[SyncAll] Inserted: " + pid);
        } else {
          errorCount++;
          Logger.log("[SyncAll] Insert failed: " + pid + " code=" + res.getResponseCode());
        }
      } catch (e) {
        errorCount++;
        Logger.log("[SyncAll] Insert error: " + pid + " " + e);
      }
    } else {
      // 既存レコードの補完（既存のバックフィルロジック）
      // ...
    }
  }

  Logger.log("[SyncAll] Complete: inserted=" + insertedCount + " updated=" + updatedCount + " errors=" + errorCount);
}
```

**デプロイ方法**:
```bash
cd gas/intake
clasp push
```

**GAS Script Propertiesに追加**:
- 既に存在: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ADMIN_TOKEN`

#### オプション B: Vercel Cronジョブ（簡易版）

**ファイル**: `/app/api/cron/sync-missing-intake/route.ts`

**実装内容**:

1. 毎日1回実行
2. GAS問診シートから全データ取得
3. Supabaseに存在しないpatient_idを挿入

**Vercel Cron設定** (`vercel.json`):

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-missing-intake",
      "schedule": "0 3 * * *"
    }
  ]
}
```

#### オプション C: GASトリガー（最も確実）

**GASエディタで設定**:

1. `syncAllIntakeDataToSupabase`関数を作成
2. トリガーを設定:
   - イベントソース: 時間主導型
   - 時間ベースのトリガーのタイプ: 日タイマー
   - 時刻: 午前3時〜4時

## 推奨実装順序

1. **即時**: Option Aの`syncAllIntakeDataToSupabase`関数を実装
2. **短期**: GASトリガーで毎日実行（Option C）
3. **中期**: Vercel Cronでバックアップ（Option B）

## エラーハンドリング強化

**ファイル**: `gas/intake/code.js`

**line 2069-2082** を以下のように修正:

```javascript
// ★ Supabaseに書き込み（skipSupabaseフラグがない場合のみ）
const skipSupabase = body.skipSupabase === true;
if (!skipSupabase) {
  try {
    // answersに個人情報も含める（既に抽出した値を使用）
    const fullAnswers = Object.assign({}, answersObj);
    fullAnswers["氏名"] = name;
    fullAnswers["name"] = name;
    fullAnswers["性別"] = sex;
    fullAnswers["sex"] = sex;
    fullAnswers["生年月日"] = birth;
    fullAnswers["birth"] = birth;
    fullAnswers["カナ"] = nameKana;
    fullAnswers["name_kana"] = nameKana;
    fullAnswers["電話番号"] = tel;
    fullAnswers["tel"] = tel;

    const supabaseWriteResult = writeToSupabaseIntake_({
      reserve_id: reserveId,
      patient_id: pid,
      answerer_id: answererId || null,
      line_id: lineId || null,
      patient_name: name || null,
      answers: fullAnswers
    });

    // ★ エラーログを強化
    if (!supabaseWriteResult || !supabaseWriteResult.success) {
      Logger.log("[Supabase] ⚠️ FAILED to write intake for patient_id=" + pid);
      Logger.log("[Supabase] ⚠️ This patient will need manual sync later");
    }
  } catch (e) {
    Logger.log("[Supabase] ❌ EXCEPTION during intake write for patient_id=" + pid);
    Logger.log("[Supabase] Error: " + e);
    Logger.log("[Supabase] ⚠️ This patient will need manual sync later");
  }
} else {
  Logger.log("[Supabase] intake write skipped (skipSupabase=true) for patient_id=" + pid);
}
```

また、`writeToSupabaseIntake_`関数もreturn値を追加:

```javascript
function writeToSupabaseIntake_(data) {
  // ... (existing code)

  const code = res.getResponseCode();
  const body = res.getContentText();

  if (code >= 200 && code < 300) {
    Logger.log("[Supabase] intake written: reserve_id=" + data.reserve_id + ", patient_id=" + data.patient_id);
    return { success: true };
  } else {
    Logger.log("[Supabase] intake write failed: code=" + code + " body=" + body);
    return { success: false, code: code, body: body };
  }
} catch (e) {
  Logger.log("[Supabase] intake write exception: " + e);
  return { success: false, error: String(e) };
}
```

## 監視とアラート

### GASログ監視

- GASエディタ → Executions
- `[Supabase] ⚠️ FAILED` または `[Supabase] ❌ EXCEPTION` を検索

### Supabase監視

- 定期的に以下のクエリを実行:

```sql
-- 問診シートにあるがSupabaseにない患者を検出
SELECT DISTINCT o.patient_id, o.shipping_name
FROM orders o
LEFT JOIN intake i ON o.patient_id = i.patient_id
WHERE i.patient_id IS NULL
AND o.patient_id IS NOT NULL
ORDER BY o.paid_at DESC
LIMIT 100;
```

## まとめ

**実装済み**:
- ✅ 4名の手動同期完了

**実装予定**:
1. `syncAllIntakeDataToSupabase`関数の作成（GAS）
2. 毎日実行トリガーの設定（GAS）
3. エラーハンドリング強化
4. 監視クエリの定期実行

これにより、今後は同様の問題が発生しても自動的に修正されます。
