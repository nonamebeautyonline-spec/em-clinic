# データ整合性管理スクリプト

このディレクトリには、GASとSupabase間のデータ整合性を保つためのスクリプトがあります。

## 自動実行（推奨）

GitHub Actionsで毎日午前3時（JST）に自動実行されます。

- ワークフロー: [`.github/workflows/data-consistency-check.yml`](../.github/workflows/data-consistency-check.yml)
- データ不整合が検出された場合、自動補完後にIssueが作成されます

### 手動実行

GitHubリポジトリの Actions タブから手動実行できます：

1. Actions タブを開く
2. "Data Consistency Check" ワークフローを選択
3. "Run workflow" をクリック

## ローカル実行

```bash
# データ整合性をチェック＆自動補完
node scripts/check-and-fix-data-consistency.mjs

# GASにあってSupabaseにないレコードを検出のみ（補完しない）
node find-missing-in-supabase.mjs

# 最新100件の個人情報欠損を補完
node bulk-fix-missing-info.mjs
```

## スクリプト一覧

### `check-and-fix-data-consistency.mjs`（メインスクリプト）

**目的**: GASとSupabaseのデータ整合性をチェックし、不整合を自動補完

**処理内容**:
1. GASシートから全データ取得
2. Supabaseから全patient_idを取得
3. GASにあってSupabaseにないレコードを検出
4. 検出されたレコードを自動的にSupabaseに挿入
5. キャッシュを無効化

**終了コード**:
- `0`: データ整合性OK、または不整合なし
- `1`: データ不整合を検出し自動補完した（要確認）

**実行例**:
```bash
$ node scripts/check-and-fix-data-consistency.mjs

=== データ整合性チェック ===
開始時刻: 2026/1/29 18:00:00

1. GASシートから全データ取得中...
  取得: 2029件
2. Supabaseから全patient_idを取得中...
  取得: 2029件
3. 差分を検出中...
  欠損: 0件

✅ データ整合性OK：全てのGASレコードがSupabaseに存在します

完了時刻: 2026/1/29 18:00:15
```

## データ不整合が発生する原因

### 原因1: 問診再送信時のmasterInfo欠損（解決済み）

**症状**: intakeはSupabaseにあるが、patient_name/answerer_id/line_idが空

**根本原因**: GASのdedupロジックでmasterInfoを返していなかった

**修正**: GAS version 223で修正済み（2026/01/29）

### 原因2: 並列書き込みの完全失敗（まだ発生する可能性あり）

**症状**: GASにはあるがSupabaseに全く存在しない

**根本原因**:
- Supabaseへのネットワークタイムアウト
- Supabase側の一時的な障害
- レート制限

**対策**:
- 自動検出スクリプトで検出・補完（このスクリプト）
- リトライ機能の実装を検討（将来の改善）

## トラブルシューティング

### エラー: "Failed to parse URL from undefined"

`.env.local`に必要な環境変数が設定されていません。

```bash
# 確認
grep GAS_INTAKE_LIST_URL .env.local
grep NEXT_PUBLIC_SUPABASE .env.local

# 設定
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GAS_INTAKE_LIST_URL=https://script.google.com/...
ADMIN_TOKEN=...
APP_BASE_URL=https://...
EOF
```

### GitHub Actions Secret設定

GitHub Actionsで実行するには、以下のSecretsを設定：

1. GitHubリポジトリ → Settings → Secrets and variables → Actions
2. 以下のSecretsを追加:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GAS_INTAKE_LIST_URL`
   - `ADMIN_TOKEN`
   - `APP_BASE_URL`

### 大量の不整合が検出される場合

Supabase書き込みに恒常的な問題がある可能性があります。

**確認事項**:
1. Vercelログで `❌❌❌ [CRITICAL] Supabase intake write FAILED` を検索
2. Supabase Status: https://status.supabase.com/
3. ネットワーク遅延の確認

**対策**:
- リトライ機能の実装（SUPABASE_WRITE_FAILURE_ROOT_CAUSE.md参照）
- タイムアウト設定の追加

## 関連ドキュメント

- [SUPABASE_WRITE_FAILURE_ROOT_CAUSE.md](../SUPABASE_WRITE_FAILURE_ROOT_CAUSE.md) - 根本原因分析
- [INTAKE_WRITE_FAILURE_ANALYSIS.md](../INTAKE_WRITE_FAILURE_ANALYSIS.md) - 対策と実装計画
