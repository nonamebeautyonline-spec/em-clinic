# EM Clinic - Project Memory

## Architecture
- Next.js App Router + Supabase + LINE Messaging API（GAS連携は全撤去済み）
- Admin: `/app/admin/` - 管理画面（LINE管理、予約管理等）
- Patient: `/app/mypage/` - 患者マイページ
- `supabaseAdmin` (service_role) for API routes, `supabase` (anon) for client-side
- LINE OAuth login → `line_user_id` cookie → patient lookup

## Key Tables
- `intake`: patient_id, answers (JSONB), reserve_id, status, etc.（patient_idにユニーク制約なし）
- `answerers`: patient_id (PK), name, name_kana, sex, birthday, tel, line_id, answerer_id
- `message_log`: LINE message history
- `message_templates` / `template_categories`: LINE template management
- `audit_logs`: 管理操作の監査ログ
- `admin_sessions`: サーバー側セッション管理

## Pending Features (Not Yet Deployed)
- See [self-hosted-register.md](self-hosted-register.md) — Lステップ脱却用の自前登録フォーム
- **git add 禁止**: 以下のファイルはユーザーから明示的に指示があるまで絶対に git add / commit しない
  - `app/register/` (新規)
  - `app/api/register/personal-info/` (新規)
  - `app/api/register/complete/route.ts` (変更済み)

## Patterns
- Cookie: `__Host-patient_id` (secure) + `patient_id` (fallback) — both httpOnly, sameSite=none
- LINE push: `lib/line-push.ts` — text, image, flex message types

## DB Query Rules
- **Supabaseのデフォルトは1000行制限**: `.select()` で全件取得する場合は必ず `.limit(100000)` 等を明示すること
- 大量データを取得する場合はページネーション（`.range(from, to)`）を使用する
- フィルタ済みクエリ（`.eq()`, `.in()` 等）でも、結果が1000件を超える場合は同様に制限にかかる

## テスト（Vitest）
- **テスト数**: 1729テスト / 68ファイル（2026-02-17時点）
- **実行**: `npx vitest run`（全体）、`npx vitest run __tests__/api/security.test.ts`（個別）
- **テスト方針**: 純粋ロジック抽出型（DBモックなし、ビジネスロジックを関数として抽出してテスト）
- **ファイル構成**:
  - `__tests__/api/` — APIルートのビジネスロジックテスト
  - `lib/__tests__/` — ユーティリティ関数テスト
  - `__tests__/shipping/` — 配送CSV生成テスト
  - `__tests__/architecture-rules.test.ts` — アーキテクチャルール検証
- **主要テストファイル**:
  - `security.test.ts` — CSRF・Rate Limiting・セッション・監査ログ・Zodバリデーション
  - `checkout-advanced.test.ts` — 決済異常系・境界値
  - `intake-advanced.test.ts` — 問診API異常系（upsert禁止、supabaseAdmin必須など事故防止）
  - `reorder-advanced.test.ts` — 再処方カルテ保存・冪等性・権限チェック
  - `cron-advanced.test.ts` — テンプレート変数置換・シナリオ無効化・認証
  - `shipping-advanced.test.ts` — 追跡番号フォーマット・CSV解析・BOM除去
  - `admin-advanced.test.ts` — ログアウト・パスワードリセット・管理者作成
  - `delete-patient-data.test.ts` — 患者データ削除
  - `patientbundle.test.ts` — カルテ統合表示
- **Zod v4 注意点**: `errors` → `issues`、`errorMap` → `error` パラメータ

## セキュリティ機能（2026-02-17 実装済み）
- **CSRF対策**: Double Submit Cookie パターン（`middleware.ts`）、管理画面は `window.fetch` パッチで自動付与
- **Rate Limiting**: `lib/rate-limit.ts`（Upstash Redis）、ログイン5回/30分、パスワードリセット1回/10分
- **Zod バリデーション**: `lib/validations/` に各スキーマ（admin-login, intake, checkout, reorder）
- **監査ログ**: `lib/audit.ts` → `audit_logs` テーブル（fire-and-forget）
- **セッション管理**: `lib/session.ts` → `admin_sessions` テーブル（同時3セッション上限、5分間隔でlast_activity更新）
- **CSP ヘッダー**: `next.config.ts` で設定
- **CSRF 除外パス**: webhook, cron, OAuth, Dr API（Basic auth保護）, 患者向けAPI
