# EM Clinic - Project Memory

## Architecture
- Next.js App Router + Supabase + GAS (Google Apps Script) + LINE Messaging API
- Admin: `/app/admin/` - 管理画面（LINE管理、予約管理等）
- Patient: `/app/mypage/` - 患者マイページ
- `supabaseAdmin` (service_role) for API routes, `supabase` (anon) for client-side
- LINE OAuth login → `line_user_id` cookie → patient lookup

## Key Tables
- `intake`: patient_id (PK), patient_name, line_id, answers (JSONB), reserve_id, status, etc.
- `answerers`: patient_id (PK), name, name_kana, sex, birthday, tel, line_id, answerer_id
- `message_log`: LINE message history
- `message_templates` / `template_categories`: LINE template management

## Pending Features (Not Yet Deployed)
- See [self-hosted-register.md](self-hosted-register.md) — Lステップ脱却用の自前登録フォーム
- Deploy timing: LINE機能が充実してリッチメニュー切替後に本番反映
- **git add 禁止**: 以下のファイルはユーザーから明示的に指示があるまで絶対に git add / commit しない
  - `app/register/` (新規)
  - `app/api/register/personal-info/` (新規)
  - `app/api/register/complete/route.ts` (変更済み)

## Patterns
- Cookie: `__Host-patient_id` (secure) + `patient_id` (fallback) — both httpOnly, sameSite=none
- LINE push: `lib/line-push.ts` — text, image, flex message types
- GAS backward compat: GAS_REGISTER_URL for existing Lステップ patients

## DB Query Rules
- **Supabaseのデフォルトは1000行制限**: `.select()` で全件取得する場合は必ず `.limit(100000)` 等を明示すること
- 大量データを取得する場合はページネーション（`.range(from, to)`）を使用する
- 件数が増える可能性のあるテーブル（intake, patient_tags, patient_marks, message_log 等）は特に注意
- フィルタ済みクエリ（`.eq()`, `.in()` 等）でも、結果が1000件を超える場合は同様に制限にかかる
