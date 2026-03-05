# コントリビューションガイド

Lオペ for CLINIC への開発参加ガイドです。

## 開発環境セットアップ

`README.md` の「セットアップ」セクションを参照してください。

## ブランチ命名規則

```
feat/機能名      # 新機能
fix/修正内容     # バグ修正
docs/対象        # ドキュメント
refactor/対象    # リファクタリング
security/対象    # セキュリティ修正
```

## コミットメッセージ

```
feat: 決済マスターに返金機能を追加（Square対応）
fix: 予約作成時のintake SELECT エラーを検知してリトライ対象にする
docs: CONTRIBUTING.md 追加
security: セキュリティアドバイザー指摘事項の修正
```

- **日本語**で記述（コード内コメントも日本語）
- 接頭辞: `feat:` / `fix:` / `docs:` / `refactor:` / `security:`
- 1行目に変更内容を簡潔に記載

## コード規約

### 必須ルール

1. **`supabaseAdmin` を使用する**（anon key は RLS でブロックされデータ消失の原因になる）
2. **intake テーブルへの `upsert({ onConflict: "patient_id" })` は禁止**（patient_id にユニーク制約がないため全レコード破壊）
3. **新規カラムを SELECT/INSERT する前に、DB にそのカラムが存在するか必ず確認する**（存在しないカラムはサイレントにクエリ全体を壊す）
4. **`tenant_id` を必ず設定する**（スクリプト・シード・手動 SQL ではデフォルト `00000000-0000-0000-0000-000000000001` を指定）
5. **電話番号は `normalizeJPPhone()` (`lib/phone.ts`) を通す**

### Zod v4 注意事項

- `errors` → `issues`
- `errorMap` → `error`
- 詳細は [Zod v4 移行ガイド](https://zod.dev/v4/changelog) を参照

### バリデーション

- 外部入力は必ず `parseBody(req, schema)` (`lib/validations/helpers.ts`) で検証
- スキーマは `lib/validations/` 配下に配置

### テナント対応

API では以下の3点セットを使用:

```typescript
const tenantId = resolveTenantId(req);           // リクエストからテナントID解決
const { data } = await withTenant(query, tenantId); // クエリにフィルタ追加
const payload = tenantPayload(tenantId);           // INSERT 用ペイロード
```

## マイグレーション手順

1. `supabase/migrations/` にマイグレーション SQL ファイルを作成
2. **Supabase ダッシュボードで手動実行**（ファイル作成 ≠ DB 適用）
3. DB に適用されたことを確認してからコード変更をデプロイ
4. 新テーブルには必ず RLS を有効化 + `service_role_full_access` ポリシーを追加
5. 新関数には `SET search_path = 'public'` を付ける（`''` は禁止）

## テスト

```bash
# 全テスト実行
npx vitest run

# 個別ファイル
npx vitest run __tests__/api/reservations.test.ts

# E2E テスト
npm run test:e2e

# カバレッジ確認
npx vitest run --coverage
```

### テスト配置

- API テスト: `__tests__/api/`
- lib テスト: `lib/__tests__/`
- E2E テスト: `e2e/`
- アーキテクチャルール: `__tests__/architecture-rules.test.ts`

### カバレッジ閾値

- Lines: 70%, Branches: 58%, Functions: 69%

## PR テンプレート

```markdown
## Summary
- 変更内容を箇条書きで記載

## Test plan
- [ ] `npx vitest run` 全パス
- [ ] 関連するテストケースを追加
- [ ] 手動テスト: 具体的な確認手順
```

## セキュリティ

- 新テーブル: `ENABLE ROW LEVEL SECURITY` + `USING (auth.role() = 'service_role')` ポリシー必須
- ビュー: `SET (security_invoker = on)` 必須
- `USING(true)` ポリシーは使わない
- `.env` やクレデンシャルファイルは絶対にコミットしない
