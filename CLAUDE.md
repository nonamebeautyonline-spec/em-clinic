# CLAUDE.md

## 言語ルール（最重要）
- **常に日本語で回答すること**（コード内コメント・コミットメッセージ・説明文すべて日本語）
- context compaction 後も必ず日本語を維持する

## DB操作の鉄則
- **SELECT/INSERTに新規カラム追加前にDBに存在するか必ず確認**（存在しないとサイレント障害）
- **マイグレーションファイル作成 ≠ DB適用**（Supabaseダッシュボードで手動実行が必要）
- **intake `upsert({ onConflict: "patient_id" })` 使用禁止**
- **intake/route.tsは`supabaseAdmin`必須**（anon keyだとRLSでブロック）

## DB SQL実行（毎回検証するな）
- スクリプト: `node scripts/run-sql.js <sqlファイル>`
- マイグレーション適用: memoryの `feedback_db_migration.md` 参照

## git add 禁止ファイル
- `app/register/`, `app/api/register/personal-info/`, `app/api/register/complete/route.ts`
- ユーザーから明示的に指示があるまで絶対にgit add/commitしない
