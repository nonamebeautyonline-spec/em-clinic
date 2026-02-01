# Vercel ログの確認方法

## 問診送信時のSupabase書き込み失敗ログを確認

### 1. Vercel Dashboardにアクセス
https://vercel.com/dashboard

### 2. プロジェクトを選択
em-clinic プロジェクト

### 3. "Logs" タブを開く

### 4. 以下の条件で検索

**検索キーワード**:
```
[CRITICAL] Supabase intake write FAILED
```

または

```
patient_id: 20251200228
```

または

```
patient_id: 20260101580
```

### 5. タイムスタンプで絞り込み

**20251200228**: 2026-01-29 13:46 頃（JST）
**20260101580**: 2026-01-29 13:54 頃（JST）

### 6. エラーメッセージを確認

以下のような情報が記録されているはず:
```
❌❌❌ [CRITICAL] Supabase intake write FAILED ❌❌❌
[Supabase Error Details] {
  patientId: '20251200228',
  error: 'エラーメッセージ',
  timestamp: '2026-01-29T13:46:...'
}
```

---

## 考えられる失敗理由

### 1. ネットワークタイムアウト
- Vercel → Supabase の接続タイムアウト
- エラー: `fetch failed` / `ETIMEDOUT`

### 2. レート制限
- Supabaseの無料プランの上限
- エラー: `429 Too Many Requests`

### 3. コネクションプール枯渇
- 同時接続数の上限
- エラー: `remaining connection slots reserved`

### 4. 一時的なサービス障害
- Supabaseのダウンタイム
- エラー: `503 Service Unavailable`

### 5. トランザクション競合
- 同時書き込みのデッドロック
- エラー: `deadlock detected`

---

## 対策

### 短期対策（完了済み）
✅ 欠落データを手動で同期

### 中期対策
- 定期同期スクリプトの実行（1日1回）
  ```bash
  node scripts/sync-missing-intake-cron.mjs
  ```

### 長期対策
1. リトライロジックの強化（現在3回→5回に増やす）
2. エラーログの詳細化
3. Webhookで失敗を通知（Slack/Discord）
4. Supabaseのプラン見直し（コネクション数増加）

