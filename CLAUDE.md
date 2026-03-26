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

## コラム記事サムネイル画像生成
- **新規記事追加時は必ずサムネイル画像も生成すること**
- スクリプト: `npx tsx scripts/generate-column-thumbnails.ts`
- 仕組み: Gemini Imagen 4.0 Fast API で背景画像生成 → Sharp + SVG でタイトルテキストをオーバーレイ
- 出力先: `public/lp/column/thumbnails/{slug}.png`（1200×630px）
- 背景キャッシュ: `public/lp/column/thumbnails/_backgrounds/` に保存（再利用可能）
- 環境変数: `GEMINI_API_KEY`（`.env.local`に設定済み）
- API制限: Paid Tier 1 で1プロジェクト70回/日。大量生成時は複数APIキーが必要
- テキスト設計:
  - タイトルは「 — 」区切りでpart1（白色）とpart2（水色）に分離
  - 3レイアウト（center/left-bottom/left-top）をインデックス順に循環
  - 日本語文節を考慮した自動改行（孤立文字防止・中黒優先度調整済み）
  - フォントサイズは行数と幅に応じて70〜36pxで自動調整
- ロゴ+ブランド名: アイコン80px（角丸20px）、テキスト45px（変更するな）
- カテゴリバッジ: 高さ56px、フォント28px、角丸28px（変更するな）
- `--force`で既存PNG上書き再生成、`--test`で1枚だけテスト生成
- コンポーネント: `app/lp/column/_components/article-thumbnail.tsx`
  - PNG画像を`next/image`で表示、未生成時はSVGフォールバック

## git add 禁止ファイル
- `app/register/`, `app/api/register/personal-info/`, `app/api/register/complete/route.ts`
- ユーザーから明示的に指示があるまで絶対にgit add/commitしない
