# Supabase書き込み失敗の根本原因分析

## 発生事象
3人の患者（20260101541, 20260101551, 20251200673）の問診送信時、GASには正常に書き込まれたがSupabaseへの書き込みが失敗。

## コード分析

### 1. 並列書き込みの実装 ([app/api/intake/route.ts:69-101](app/api/intake/route.ts#L69-L101))

```typescript
const [supabaseResult, gasResult] = await Promise.allSettled([
  // 1. Supabaseに直接書き込み
  supabase
    .from("intake")
    .upsert({
      patient_id: patientId,
      patient_name: name || null,
      answerer_id: answererId,  // ← ここが問題の可能性
      line_id: lineId || null,
      reserve_id: null,
      reserved_date: null,
      reserved_time: null,
      status: null,
      note: null,
      prescription_menu: null,
      answers: fullAnswers,
    }, {
      onConflict: "patient_id",
    }),

  // 2. GASにPOST
  fetch(GAS_INTAKE_URL, {...})
]);
```

### 2. 個人情報の抽出ロジック ([app/api/intake/route.ts:34-42](app/api/intake/route.ts#L34-L42))

```typescript
const name = body.name || answersObj.氏名 || answersObj.name || "";
const sex = body.sex || answersObj.性別 || answersObj.sex || "";
const birth = body.birth || answersObj.生年月日 || answersObj.birth || "";
const nameKana = body.name_kana || body.nameKana || answersObj.カナ || answersObj.name_kana || "";
const tel = body.tel || body.phone || answersObj.電話番号 || answersObj.tel || "";
const lineId = body.line_id || body.lineId || answersObj.line_id || "";
const answererId = body.answerer_id || answersObj.answerer_id || null;
```

## 考えられる失敗原因

### A. データ抽出の失敗（可能性: 低）

**仮説**: `body.answerer_id` が存在せず、`answersObj` にも存在しない場合、`answererId` が `null` になる。

**検証**: GASデータを確認したところ、3人とも `answerer_id` は正しく入っている（234558702, 234577208, 229919826）。
つまり、GAS側には正しく送信されているため、Next.js側でも取得できているはず。

**結論**: この可能性は低い。

### B. Supabase RLS（Row Level Security）ポリシー（可能性: 中）

**仮説**: anon key での `intake` テーブルへの書き込み権限が制限されている可能性。

**確認方法**:
1. Supabase Dashboard → Authentication → Policies
2. `intake` テーブルの INSERT/UPDATE ポリシーを確認
3. anon role に権限があるか確認

**対策**: RLSポリシーを確認し、必要に応じて anon role に権限を付与。

### C. ネットワークタイムアウト・接続エラー（可能性: 高）

**仮説**: Supabase APIへのリクエストがタイムアウトまたはネットワークエラーで失敗。

**根拠**:
- `Promise.allSettled` では個別のPromiseがrejectされても全体は成功
- Supabase SDKにはデフォルトのタイムアウト設定がない
- Vercelの関数タイムアウト（10秒）より長くかかった場合、Promiseがrejectされる可能性は低いが、ネットワークエラーでrejectされる

**確認方法**:
Vercelログで以下の時刻のエラーログを確認：
- 2026-01-28 05:04:03 UTC (20260101541)
- 2026-01-28 08:57:49 UTC (20260101551)
- 2025-12-22 11:05:08 UTC (20251200673) ← 古すぎて残っていない可能性

**ログに出るべきメッセージ**:
- `[Supabase] Intake write failed:` （修正前のログ）
- または Promise rejection のエラー

### D. Supabaseサービス障害（可能性: 中）

**仮説**: Supabase側で一時的な障害が発生していた。

**確認方法**:
- Supabase Status Page: https://status.supabase.com/
- 該当時刻にインシデントがあったか確認

### E. upsert の onConflict 処理の問題（可能性: 低）

**仮説**: `patient_id` が既に存在し、upsert が UPDATE を試みたが制約違反でエラー。

**検証**: 3人とも新規作成時に失敗しているため、この可能性は低い。

### F. データ型の不一致（可能性: 極低）

**仮説**: `patient_id` がstring型を期待しているが、数値が渡された。

**検証**: `patientId` は cookie から取得した文字列（[app/api/intake/route.ts:16-19](app/api/intake/route.ts#L16-L19)）なので、必ず string 型。

**結論**: この可能性は極めて低い。

## 最も可能性の高い原因

**1位: ネットワークタイムアウト・接続エラー (C)**
- 3人の患者が異なる時刻に失敗している
- GASは成功しているため、Next.js自体は動作している
- Supabase特有の問題の可能性が高い

**2位: RLSポリシーの制限 (B)**
- anon key での書き込みが制限されている可能性
- ただし、他の多くの患者は成功しているため、一時的な設定ミスの可能性

**3位: Supabaseサービス障害 (D)**
- 該当時刻にSupabase側で障害があった可能性

## 確認すべきこと

### 1. Vercelログの確認（最優先）

```
Vercel Dashboard → Functions → Logs
フィルタ: 2026-01-28 05:04:00 - 05:04:10 (20260101541)
検索: "Supabase" OR "intake" OR "error"
```

以下のログを探す：
- `[Supabase] Intake write failed:`
- `[Intake Debug]` シリーズのログ
- エラースタックトレース

### 2. Supabase RLSポリシーの確認

```sql
-- Supabase SQL Editor で実行
SELECT * FROM pg_policies WHERE tablename = 'intake';
```

anon role に INSERT/UPDATE 権限があるか確認。

### 3. Supabase Status の確認

https://status.supabase.com/ で以下の時刻にインシデントがあったか：
- 2026-01-28 05:04 UTC
- 2026-01-28 08:57 UTC

## 恒久対策

### 1. タイムアウト設定の追加

Supabase clientにタイムアウトを設定：

```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          signal: AbortSignal.timeout(8000) // 8秒でタイムアウト
        });
      }
    }
  }
);
```

### 2. リトライ機能の実装

Supabase書き込み失敗時に自動リトライ：

```typescript
async function upsertWithRetry(supabase, data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await supabase.from("intake").upsert(data, { onConflict: "patient_id" });
    if (!result.error) return result;

    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    } else {
      return result;
    }
  }
}
```

### 3. 詳細なエラーログ（実装済み）✅

```typescript
console.error("❌❌❌ [CRITICAL] Supabase intake write FAILED ❌❌❌");
console.error("[Supabase Error Details]", {
  patientId,
  error: error?.message || String(error),
  timestamp: new Date().toISOString()
});
```

### 4. 定期的なデータ整合性チェック（実装済み）✅

`scripts/check-and-fix-data-consistency.mjs` を毎日実行：
```bash
# crontab に追加（例：毎日午前3時）
0 3 * * * cd /path/to/em-clinic && node scripts/check-and-fix-data-consistency.mjs
```

## まとめ

Vercelログを確認して、実際のエラーメッセージを特定することが最優先です。それにより、ネットワークエラー、RLS問題、またはSupabase障害のいずれかを特定できます。

恒久対策として、タイムアウト設定とリトライ機能を実装し、定期的な整合性チェックでデータ不整合を早期検出します。
