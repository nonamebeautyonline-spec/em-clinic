# Intake Supabase書き込み失敗の分析と対策

## 発生した問題

3人の患者（20260101541, 20260101551, 20251200673）がGASシートには存在するがSupabaseには存在しない状態が発生しました。

### 影響を受けた患者

1. **20260101541: 久保田　理恵**
   - 問診送信: 2026-01-28T05:04:03.374Z
   - 予約: 2026-01-30 18:15
   - LINE UID: U7715cc5a6cc0933ac9277fa1c2883f10
   - Answerer ID: 234558702

2. **20260101551: 成瀬美愛**
   - 問診送信: 2026-01-28T08:57:49.684Z
   - 予約: 2026-01-29 17:30
   - LINE UID: U3aaa031895f4af0ccfc5084eedccbd8a
   - Answerer ID: 234577208

3. **20251200673: 久保　美那保**
   - 問診送信: 2025-12-22T11:05:08.143Z
   - 予約: 2026-01-29 17:15
   - LINE UID: Ue5c7d5c313cd7174bd3eba22df44f73a
   - Answerer ID: 229919826

## 根本原因

### コード分析: `/app/api/intake/route.ts` (lines 69-118)

```typescript
const [supabaseResult, gasResult] = await Promise.allSettled([
  // 1. Supabaseに直接書き込み
  supabase.from("intake").upsert({...}),

  // 2. GASにPOST
  fetch(GAS_INTAKE_URL, {...})
]);

// ❌ Supabase失敗時の処理
if (supabaseResult.status === "rejected" || ...) {
  console.error("[Supabase] Intake write failed:", error);
  // ⚠️ エラーログのみで処理続行
}

// ✅ GAS失敗時の処理
if (gasResult.status === "rejected" || ...) {
  console.error("[GAS] Intake write failed:", error);
  return NextResponse.json({ ok: false, error: "gas_error" }, { status: 500 });
  // ✅ エラーレスポンスを返して処理中断
}
```

### 問題点

1. **非対称なエラーハンドリング**
   - GAS失敗 → ユーザーにエラー通知、処理中断
   - Supabase失敗 → エラーログのみ、ユーザーには成功通知

2. **データ不整合の発生**
   - `Promise.allSettled` により、片方が失敗してももう片方は成功
   - Supabase失敗 + GAS成功 = データはGASのみに存在
   - ユーザーは成功と認識するが、実際にはSupabaseにデータなし

3. **影響範囲**
   - マイページでデータが表示されない
   - ダッシュボードに患者が表示されない
   - 決済・診察履歴が利用できない

## 想定される失敗原因

以下のいずれかが考えられます：

1. **ネットワークエラー**
   - Supabaseへの接続タイムアウト
   - 一時的なネットワーク障害

2. **Supabaseサービス障害**
   - Supabase側のダウンタイム
   - レート制限（rate limiting）

3. **バリデーションエラー**
   - データ型の不一致
   - 必須フィールドの欠損
   - 制約違反

4. **認証エラー**
   - Supabase APIキーの問題
   - 権限不足

## 対策

### 1. 即時対策（緊急修正）

**エラーハンドリングの統一**

```typescript
// Supabase結果チェック
if (supabaseResult.status === "rejected" || (supabaseResult.status === "fulfilled" && supabaseResult.value.error)) {
  const error = supabaseResult.status === "rejected"
    ? supabaseResult.reason
    : supabaseResult.value.error;
  console.error("[Supabase] Intake write failed:", error);

  // ★ GASと同様にエラーレスポンスを返す
  return NextResponse.json({
    ok: false,
    error: "supabase_error",
    details: error?.message || String(error)
  }, { status: 500 });
}
```

**メリット:**
- データ不整合を防止
- ユーザーに正確なエラー通知
- 再送信により正しくデータが保存される

**デメリット:**
- 一時的なSupabase障害でユーザー体験が悪化
- GASには書き込まれないため、GASのみに依存する機能が影響を受ける可能性

### 2. 中期対策（リトライ機能）

**Supabase書き込みにリトライロジックを追加**

```typescript
async function writeToSupabaseWithRetry(supabase, data, maxRetries = 3) {
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await supabase.from("intake").upsert(data, {
        onConflict: "patient_id",
      });

      if (!result.error) {
        if (i > 0) {
          console.log(`[Supabase] Write succeeded on retry ${i + 1}`);
        }
        return result;
      }

      lastError = result.error;

      // エクスポネンシャルバックオフ
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    } catch (err) {
      lastError = err;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  return { error: lastError };
}
```

### 3. 長期対策（監視とアラート）

1. **Supabase書き込み失敗の監視**
   - エラーログを集計
   - 失敗率が閾値を超えたらアラート
   - Slackやメール通知

2. **定期的なデータ整合性チェック**
   - `find-missing-in-supabase.mjs` を定期実行（毎日）
   - 不整合が見つかったら自動補完 + アラート

3. **デッドレターキュー（DLQ）の実装**
   - 失敗したSupabase書き込みを別のテーブルに記録
   - バックグラウンドジョブで自動リトライ

## 実装計画

### Phase 1: 緊急修正（今すぐ）
- [x] 3人の欠損患者をSupabaseに手動挿入（完了）
- [ ] エラーハンドリングの統一（即時実施）

### Phase 2: リトライ実装（1週間以内）
- [ ] Supabase書き込みリトライ機能の実装
- [ ] テスト環境での動作確認
- [ ] 本番デプロイ

### Phase 3: 監視強化（2週間以内）
- [ ] エラーログ監視の自動化
- [ ] データ整合性チェックの定期実行
- [ ] アラート通知の設定

## 検証方法

1. **エラーハンドリング修正後のテスト**
   - Supabase接続を意図的に失敗させる
   - エラーレスポンスが返ることを確認
   - GASにもデータが書き込まれないことを確認

2. **リトライ機能のテスト**
   - 一時的なネットワークエラーをシミュレート
   - リトライで成功することを確認
   - リトライ回数とバックオフ時間の検証

3. **本番環境での監視**
   - Vercelログで `[Supabase] Intake write failed` を監視
   - 1日1回 `find-missing-in-supabase.mjs` を実行
   - 不整合が発生していないことを確認

## まとめ

今回の問題は、並列書き込みアーキテクチャにおける非対称なエラーハンドリングが原因でした。Supabase書き込み失敗時にユーザーに成功を通知してしまうため、データ不整合が発生しました。

即時対策として、Supabase失敗時もGAS同様にエラーレスポンスを返すようにします。中長期的には、リトライ機能と監視体制を強化し、データ整合性を保証します。
