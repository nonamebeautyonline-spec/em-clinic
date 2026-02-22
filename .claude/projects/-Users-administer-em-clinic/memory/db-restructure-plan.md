# DB正規化 + マルチテナント化 計画

## 決定事項（2026-02-15 確定）

1. **intake 正規化**: 他テーブルにデータが確実に存在することを検証してから冗長カラムを廃止
2. **answerers → patients**: リネーム実施（VIEW で互換維持）
3. **gas_row_number → reorder_number**: リネーム実施
4. **実行順序**: Phase 0 から順番に
5. **bank_transfer_orders**: コード参照ゼロ（2026-02-05に移行済み）、テーブルは当面残置

---

## 現状のDB構成

### 主要テーブル（業務コア: 5テーブル）

| テーブル | 役割 | tenant_id |
|---------|------|-----------|
| **answerers** (→ patients にリネーム予定) | 患者マスタ。patient_id ユニーク | なし |
| **intake** | 問診回答 + 冗長キャッシュ。patient_id ユニーク制約なし | なし |
| **reservations** | 診察予約。reserve_id で一意 | なし |
| **orders** | 注文・決済・配送（bank_transfer統合済み） | なし |
| **reorders** | 再処方申請。gas_row_number → reorder_number | なし |

### LINE プラットフォーム系（14テーブル）
- message_log, message_templates, broadcasts, scheduled_messages
- rich_menus
- tag_definitions, patient_tags
- patient_marks, mark_definitions
- friend_field_definitions, friend_field_values
- friend_add_settings, template_categories

### 自動化系（6テーブル）
- keyword_auto_replies
- step_scenarios, step_items, step_enrollments
- actions, action_folders

### その他（12テーブル）
- forms, form_responses, form_file_uploads, form_folders
- media_folders, media_files
- products (tenant_id対応済み), tenant_settings (tenant_id対応済み)
- flex_presets
- click_tracking_links, click_tracking_events
- chat_reads, shipping_shares
- doctors, doctor_weekly_rules, doctor_date_overrides, booking_open_settings
- admin_users, password_reset_tokens

---

## intake テーブルの冗長カラム（正規化対象）

| カラム | 本来のソース | 参照ファイル数 | 用途 |
|-------|-----------|-------------|------|
| patient_name | answerers.name | 6+ API | 患者氏名表示 |
| line_id | answerers.line_id | 7+ API | LINE通知送信 |
| reserved_date | reservations.reserved_date | 10+ API | 予約日表示 |
| reserved_time | reservations.reserved_time | 10+ API | 予約時刻表示 |
| prescription_menu | reservations.prescription_menu | 2+ API | 処方メニュー表示 |
| **reserve_id** | **削除禁止** | 全API | reservationsとの結合キー |
| **answerer_id** | **削除禁止** | 管理画面 | Lステップ UID として使用中 |

### 書き込み同期の現状（廃止予定）

予約作成/変更/キャンセル時に reservations と intake の両方に書き込んでいる：
- `app/api/reservations/route.ts` 行 584-612（予約作成時）
- `app/api/reservations/route.ts` 行 676-689（キャンセル時）
- `app/api/reservations/route.ts` 行 826 付近（変更時）

---

## reorders テーブルの整理対象

| カラム | 状態 | 方針 |
|-------|------|------|
| gas_row_number | 12+ファイルで使用中 | reorder_number にリネーム |
| lstep_uid | reordersテーブルに存在しない | 作業不要 |
| timestamp | admin/reorders表示ソートに使用 | 維持 |

### gas_row_number 参照ファイル一覧（12ファイル）
- `app/api/reorder/apply/route.ts` — 採番
- `app/api/doctor/reorders/approve/route.ts` — 承認
- `app/api/admin/reorders/approve/route.ts` — 承認
- `app/api/admin/reorders/route.ts` — 一覧表示
- `app/api/square/webhook/route.ts` — 決済マッチング
- `app/api/gmo/webhook/route.ts` — 同上
- `app/api/bank-transfer/shipping/route.ts` — 同上
- `app/api/reorder/cancel/route.ts` — キャンセル
- `app/mypage/PatientDashboardInner.tsx` — 表示
- `app/api/doctor/reorders/route.ts` — 一覧
- `app/api/doctor/reorders/reject/route.ts` — 却下
- `app/api/admin/reorders/reject/route.ts` — 却下

---

## GAS 残骸

### 環境変数（14個、.env.local に残存）
GAS_ADMIN_URL, GAS_INTAKE_LIST_URL, GAS_INTAKE_URL, GAS_KARTE_URL,
GAS_MYPAGE_ORDERS_URL, GAS_MYPAGE_URL, GAS_PATIENT_LINK_URL,
GAS_REGISTER_URL, GAS_REORDER_URL, GAS_RESERVATIONS_URL,
GAS_UPSERT_URL, GAS_BANK_TRANSFER_URL, GAS_SQUARE_WEBHOOK_URL

### フォールバックコード（4ファイル）
- `app/api/intake/list/route.ts` — GAS フォールバック
- `app/api/doctor/callstatus/route.ts` — GAS バックグラウンド同期
- `app/api/square/backfill/route.ts` — GAS_UPSERT_URL
- `app/api/square/backfill-refunds/route.ts` — 同上

---

## Phase 別計画

### Phase 0: 不要物の撤去（1-2日）
- GAS 環境変数14個削除
- GAS フォールバックコード4ファイル削除
- `npm run build` 確認

### Phase 1: answerers → patients リネーム（1日）
- `ALTER TABLE answerers RENAME TO patients;`
- `CREATE VIEW answerers AS SELECT * FROM patients;`
- 16ファイルの `.from("answerers")` → `.from("patients")`
- ビルド + ガーディアン検証

### Phase 2: intake テーブル正規化（3-5日）
1. データ整合性検証スクリプト実行
2. 不一致データの修復（intake → patients/reservations に転記）
3. API の読み取り元切り替え（intake → patients/reservations）
4. 書き込み同期廃止（reservations → intake への二重書き込みをやめる）
5. 冗長カラム DROP（全検証後）

### Phase 3: reorders 整理（1日）
- `ALTER TABLE reorders RENAME COLUMN gas_row_number TO reorder_number;`
- 12ファイルの gas_row_number → reorder_number

### Phase 4: 全テーブルに tenant_id 追加（5-7日）
- 30+テーブルに `tenant_id UUID` カラム追加
- `lib/tenant.ts` にテナント解決 + withTenant() ヘルパー
- 175 APIルートに withTenant() 適用

### Phase 5: 環境変数のテナント化（2-3日）
- LINE/Square/Twilio の設定を tenant_settings テーブルに移行

### 総見積もり: 13-19日

---

## マイページ表示項目チェックリスト（27項目）

| # | 項目 | データ取得元（現状） | 修正後の取得元 |
|---|------|---------------|-------------|
| 1 | 患者氏名 | intake.patient_name | patients.name |
| 2 | 患者ID | patient_id | patient_id |
| 3 | 問診状態 | intake.answers | intake.answers |
| 4 | 予約ボタン有効/無効 | intake.status + 予約有無 | intake.status + reservations |
| 5 | 初回購入ボタン | orders有無 + intake.status | 変更なし |
| 6 | 再処方申請ボタン | orders有無 + reorders.status | 変更なし |
| 7 | 次回予約日時 | intake.reserved_date/time | reservations.reserved_date/time |
| 8 | 予約ステータス | intake(status未設定=予約中) | reservations.status |
| 9 | 日時変更ボタン | intake.reserve_id | reservations.reserve_id |
| 10 | キャンセルボタン | intake.reserve_id | reservations.reserve_id |
| 11 | 注文決済日 | orders.paid_at | 変更なし |
| 12 | 注文商品名 | orders.product_name | 変更なし |
| 13 | 発送ステータス | orders.shipping_status | 変更なし |
| 14 | 決済ステータス | orders.payment_status | 変更なし |
| 15 | 追跡番号 | orders.tracking_number | 変更なし |
| 16 | 配送先名義 | orders.shipping_name | 変更なし |
| 17 | 郵便番号・住所 | orders.postal_code/address | 変更なし |
| 18 | 届け先変更ボタン | orders.shipping_list_created_at | 変更なし |
| 19 | 再処方ステータス | reorders.status | 変更なし |
| 20 | 再処方商品名 | reorders.product_code | 変更なし |
| 21 | 決済ボタン(confirmed) | reorders.gas_row_number | reorders.reorder_number |
| 22 | キャンセルボタン | reorders.id | 変更なし |
| 23 | 処方歴決済日 | orders.paid_at | 変更なし |
| 24 | 処方歴商品名 | orders.product_name | 変更なし |
| 25 | 処方歴返金情報 | orders.refund_status/at/amount | 変更なし |
| 26 | サポートセクション | マイページ設定 | 変更なし |
| 27 | NG患者バナー | intake.status | intake.status |

## 管理画面表示項目チェックリスト

### ダッシュボード
- 予約統計: reservations(reserved_date, status)
- 配送統計: orders(shipping_date, created_at, patient_id)
- 売上: orders(amount, paid_at, payment_method, refund_status)
- 商品別売上: orders(product_code, amount)
- 患者統計: intake(created_at, patient_id), orders(patient_id, created_at)
- KPI: intake(status, line_id), reservations(status), orders(paid_at)

### 患者詳細 (patientbundle API)
- 基本情報: answerers→patients(name, name_kana, tel, sex, birthday, line_id)
- 来院履歴: intake(status, note, answers, created_at) + reservations(reserved_date/time, prescription_menu)
- Dr.Note: intake.note
- 医療情報: intake.answers (JSON)
- 購入履歴: orders(product_code, paid_at, amount, payment_method, tracking_number, refund_status)
- 再処方: reorders(status, created_at, approved_at, paid_at, karte_note)

### 予約管理
- 予約一覧: reservations(patient_id, patient_name, reserved_time, status)
- リマインド: reservations + LINE API

### 再処方管理
- 申請一覧: reorders(id→reorder_number, timestamp, patient_id, product_code, status, line_notify_result)
- 患者情報: intake(patient_name, answerer_id)

### 発送管理
- 全て orders テーブルから取得

### Dr.カルテ（両ページ: app/doctor + app/admin/doctor）
- 診察一覧: intake(answers, status, note, prescription_menu) + reservations(reserved_date/time)
- ステータス更新: intake(status, note, prescription_menu)

---

## データ検証 SQL（Phase 2-0 で使用）

```sql
-- 1. reserve_id オーファン
SELECT COUNT(*) FROM intake i
LEFT JOIN reservations r ON i.reserve_id = r.reserve_id
WHERE i.reserve_id IS NOT NULL AND r.reserve_id IS NULL;

-- 2. patients 未対応
SELECT COUNT(DISTINCT i.patient_id) FROM intake i
LEFT JOIN patients p ON i.patient_id = p.patient_id
WHERE p.patient_id IS NULL;

-- 3. reserved_date/time 不一致
SELECT COUNT(*) FROM intake i
INNER JOIN reservations r ON i.reserve_id = r.reserve_id
WHERE i.reserved_date != r.reserved_date OR i.reserved_time != r.reserved_time;

-- 4. patient_name 不一致
WITH latest AS (
  SELECT patient_id, patient_name,
    ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
  FROM intake
)
SELECT COUNT(*) FROM latest li
INNER JOIN patients p ON li.patient_id = p.patient_id
WHERE li.rn = 1 AND li.patient_name IS NOT NULL AND p.name IS NOT NULL
  AND li.patient_name != p.name;

-- 5. line_id 不一致
SELECT COUNT(*) FROM intake i
INNER JOIN patients p ON i.patient_id = p.patient_id
WHERE i.line_id IS NOT NULL AND p.line_id IS NOT NULL
  AND i.line_id != p.line_id AND i.reserve_id IS NOT NULL;
```

## データ修復 SQL（Phase 2-1 で使用）

```sql
-- intake にしかない patient_name を patients に転記
INSERT INTO patients (patient_id, name)
SELECT DISTINCT i.patient_id, i.patient_name
FROM intake i
LEFT JOIN patients p ON i.patient_id = p.patient_id
WHERE p.patient_id IS NULL AND i.patient_name IS NOT NULL
ON CONFLICT (patient_id) DO NOTHING;

-- intake にしかない line_id を patients に転記
UPDATE patients p
SET line_id = i.line_id
FROM (
  SELECT patient_id, line_id,
    ROW_NUMBER() OVER (PARTITION BY patient_id ORDER BY created_at DESC) AS rn
  FROM intake WHERE line_id IS NOT NULL
) i
WHERE p.patient_id = i.patient_id AND i.rn = 1 AND p.line_id IS NULL;
```
