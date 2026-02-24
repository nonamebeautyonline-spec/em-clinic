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

## 患者PID重複問題（2026-02-17 対応済み）
- **原因**: GAS→DB移行時に `patients.tel` が null のままだった（938人）。LINE変更や再登録時に電話番号マッチングが失敗し、新PIDが発行された
- **対応**:
  1. GAS問診シートから938人の `patients.tel` をバックフィル済み（`normalizeJPPhone()` で正規化）
  2. LINE UID null による重複PID 12組を統合（うち3件は LINE_xxx 第3PIDも処理）
  3. 電話番号一致による重複PID 5組を統合
  4. 岩満春香の予約データ部分移行
- **再発防止策**:
  - `register/complete`: 電話番号保存時に同一telの別PIDを検出 → console.warn でログ出力
  - `cron/health-report`: 同一電話番号で複数PIDが存在する場合に Sentry アラート
- **統合時の注意**:
  - 同一患者に **3つ以上のPID** が存在するケースあり（数字旧PID + 数字新PID + LINE_xxxPID）
  - 統合後は必ず `LINE_{UID末尾8文字}` 形式の孤立PIDも確認すること
  - 統合方向: LINE+tel がある側を残す。両方ある場合は臨床データ（orders, intake status=OK）が多い側を残す
  - フィールドマージ: 残す側に null のフィールドがあれば削除側から補完（name_kana, sex, birthday, tel, line_id 等）
- **統合対象テーブル**: intake, orders, reservations, reorders, message_log, patient_tags, patient_marks, friend_field_values, coupon_issues, nps_responses, form_responses, step_enrollments, bank_transfer_orders, chat_reads
- **patient_tags / patient_marks / chat_reads**: ユニーク制約があるため、update失敗時は旧PID側を削除
- **統合API**: `app/api/admin/merge-patients/route.ts`（ただし上記追加テーブルの一部は未対応）
- **データ移行時の必須事項**: `patients.tel` を必ず含めること（tel=null → 電話番号マッチング不能 → 重複PID発生の原因）

## patients プロフィール欠損バックフィル（2026-02-18 対応済み）
- **原因**: GAS→DB移行時に intake.answers の個人情報（カナ・性別・生年月日）が patients テーブルに転記されなかった
- **影響範囲**:
  - name_kana=null: 2,817人（全4,116人中68%）
  - sex=null: 789人
  - birthday=null: 789人
- **内訳**:
  - 1月の患者（~2,032人）: GAS移行時の転記漏れ → intake.answers から復元
  - 2/15 のLINE友だち一括取り込み（~724人）: 問診未完了のため正常にnull
  - 2月その他: 問診保存時に反映済みで問題なし
- **対応**: `scripts/backfill-patients-profile.cjs` で intake.answers → patients に穴埋め
  - name_kana: 2,583人復元
  - sex: 556人復元
  - birthday: 556人復元
  - 既存データは上書きせず null のみ埋める
  - エラー0件
- **残り null（233〜234人）**: LINE一括取り込みの問診未完了者。問診入力時に自動で入る
- **補足**: patient-lookup API にフォールバックロジックあり（`answers?.カナ || answerer?.name_kana`）ため表示上は問題なかったが、patients テーブルをマスターとするDB正規化の一環としてバックフィル実施

## Supabase CLI マイグレーション適用方法
- `supabase db push` は順序問題で失敗しやすい（既存マイグレーションとの順序不整合）
- **確実な方法**: Management API で直接 SQL 実行:
  ```bash
  TOKEN_RAW=$(security find-generic-password -s "Supabase CLI" -w)
  TOKEN=$(echo "$TOKEN_RAW" | sed 's/go-keyring-base64://' | base64 -d)
  SQL=$(cat supabase/migrations/XXXX.sql)
  curl -s -X POST "https://api.supabase.com/v1/projects/fzfkgemtaxsrocbucmza/database/query" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg q "$SQL" '{query: $q}')"
  ```
- トークンは macOS Keychain に保存（`security find-generic-password -s "Supabase CLI" -w`）
- Base64 プレフィックス `go-keyring-base64:` を除去してデコードが必要
- 成功時は `[]` が返る。エラー時は `{"message": "..."}` 形式
- **PostgreSQL注意**: `DISTINCT ON` + `ORDER BY` を `UNION ALL` で使う場合、各 SELECT を `()` で囲む

## LINE webhook name=displayName インシデント（2026-02-19 修正）
- **原因**: `webhook/route.ts` の `findOrCreatePatient` が `name: displayName` で patients レコードを作成していた
- **影響**:
  - LINE友だち追加時に `patients.name` = LINEディスプレイネーム（ニックネーム等）がセットされる
  - 個人情報フォーム（`register/personal-info`）が正常に動作すれば上書きされるが、LINE_仮ID患者の一部で上書きされず残存
  - mypage ガード `!answerer?.name` を通過してしまう（name がnullではないため）
- **修正**:
  - `webhook/route.ts`: `name: displayName` の行を削除（`line_display_name` に別途保存済み）
  - `mypage/page.tsx`, `mypage/init/page.tsx`: LINE_プレフィックスガード追加
  - `register/personal-info/route.ts`: LINE_→数値ID移行テーブルに reservations/orders/reorders 追加
- **データ修正**: name=displayName だった7名を intake.answers の本名で復元
- **教訓**: patients.name の変更前に必ず intake の氏名データを確認すること。安易に null リセットしない

## 個別トーク未読フィルターバグ（2026-02-19 修正）
- **原因**: 未読カウントは `filteredFriends`（全件）から算出、フィルター表示は `visibleUnpinned`（ページネーション後）から絞っていた
- **修正**: 未読フィルター有効時は `unpinnedFriends`（全件）を使用、「さらに表示」ボタンを非表示に

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

## 運用ドキュメント（2026-02-24 作成）
- **`docs/security-operations.md`**: セキュリティ運用チェックリスト（認証・セッション・RLS・暗号化・監査ログ・レート制限・CSRF・Webhook署名検証・日次/週次/月次チェックリスト）
- **`docs/incident-response.md`**: 障害対応ランブック（P0/P1/P2定義・初動フロー・顧客連絡テンプレート・過去事故記録・ロールバック手順・再発防止報告書テンプレ）
- **`docs/data-protection-policy.md`**: データ保護ポリシー（個人情報種類・保存期間・削除ポリシー・アクセス制限・持ち出し禁止・AI連携時のマスク方針）
- **`.github/dependabot.yml`**: 依存パッケージ自動更新（npm週次・GitHub Actions週次・グルーピング設定）
- **CI強化**: `npm audit --audit-level=high` でhigh/criticalはCI失敗（moderateは警告のみ）
