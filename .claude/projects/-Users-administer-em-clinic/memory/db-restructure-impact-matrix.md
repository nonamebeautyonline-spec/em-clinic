# DB正規化 全影響マトリックス（2026-02-15 作成）

## 変更の種類

| コード | 変更内容 | 影響API数 |
|-------|---------|----------|
| **A** | answerers → patients リネーム | 36個 |
| **B** | intake 冗長カラム廃止（patient_name, line_id, reserved_date, reserved_time, prescription_menu） | 41個 |
| **C** | gas_row_number → reorder_number リネーム | 18個 |
| **D** | tenant_id フィルタ追加（全テーブル） | 151個 |

---

## API ルート 完全影響マップ（153ルート）

### 全変更(A+B+C+D)の影響を受けるAPI（13個）— 最優先

| ファイル | 参照テーブル |
|---------|-----------|
| `app/api/line/webhook/route.ts` | intake, message_log, friend_add_settings, patient_tags, tag_definitions, patient_marks, rich_menus, orders, answerers, keyword_auto_replies, message_templates, reorders |
| `app/api/admin/patientbundle/route.ts` | answerers, intake, orders, reorders |
| `app/api/admin/patient-lookup/route.ts` | intake, orders, reorders, answerers |
| `app/api/admin/reorders/approve/route.ts` | reorders, intake, message_log |
| `app/api/admin/reorders/route.ts` | reorders, intake |
| `app/api/admin/view-mypage/route.ts` | intake, orders, reorders |
| `app/api/bank-transfer/shipping/route.ts` | intake, orders, reorders |
| `app/api/doctor/reorders/approve/route.ts` | reorders, intake, message_log |
| `app/api/mypage/route.ts` | intake, orders, reorders |
| `app/api/reorder/apply/route.ts` | intake, reorders, orders |
| `app/api/admin/dashboard-stats-enhanced/route.ts` | reservations, orders, intake |
| `app/api/admin/dashboard-stats/route.ts` | reservations, orders, intake |
| `app/api/forms/[slug]/submit/route.ts` | actions, message_templates, patient_tags, answerers, forms, form_responses, intake, friend_field_values, message_log |

### A+B+D（answerers変更 + intake正規化 + tenant_id）（16個）

| ファイル | 参照テーブル |
|---------|-----------|
| `app/api/admin/bank-transfer/pending/route.ts` | orders, intake |
| `app/api/admin/delete-patient-data/route.ts` | reservations, intake |
| `app/api/admin/karte-edit/route.ts` | intake |
| `app/api/admin/karte-lock/route.ts` | intake |
| `app/api/admin/karte/route.ts` | answerers, intake |
| `app/api/admin/kartelist/route.ts` | answerers, intake |
| `app/api/admin/kartesearch/route.ts` | intake, answerers |
| `app/api/admin/line/broadcast/route.ts` | broadcasts, reservations, intake, patient_tags, patient_marks, friend_field_values, message_log |
| `app/api/admin/line/friends-list/route.ts` | intake, answerers, patient_marks, message_log |
| `app/api/admin/merge-patients/route.ts` | intake, reservations, answerers |
| `app/api/admin/patient-name-change/route.ts` | answerers, intake, reservations |
| `app/api/admin/refunds/route.ts` | orders, intake |
| `app/api/admin/reservations/route.ts` | reservations, intake |
| `app/api/admin/reservations/send-reminder/route.ts` | reservations, intake, message_log |
| `app/api/admin/reservations/reminder-preview/route.ts` | reservations, intake |
| `app/api/admin/shipping/notify-shipped/route.ts` | orders, intake, mark_definitions, rich_menus, patient_marks, message_log |

### A+B+D（intake参照あり、answerers直接参照なし）（追加）

| ファイル | 参照テーブル |
|---------|-----------|
| `app/api/admin/line/actions/execute/route.ts` | actions, intake, message_templates, patient_tags, patient_marks, rich_menus, tag_definitions, message_log |
| `app/api/admin/line/check-block/route.ts` | intake, answerers, message_log |
| `app/api/admin/line/dashboard/route.ts` | message_log, intake |
| `app/api/admin/line/marks/[id]/route.ts` | mark_definitions, patient_marks, intake |
| `app/api/admin/line/marks/route.ts` | mark_definitions, patient_marks, intake |
| `app/api/admin/line/refresh-profile/route.ts` | intake |
| `app/api/admin/line/rich-menus/[id]/route.ts` | orders, intake, rich_menus |
| `app/api/admin/line/rich-menus/route.ts` | rich_menus, intake, orders |
| `app/api/admin/line/schedule/route.ts` | scheduled_messages, intake |
| `app/api/admin/line/send-image/route.ts` | intake, message_log |
| `app/api/admin/line/send/route.ts` | intake, message_log, reservations |
| `app/api/admin/line/step-scenarios/[id]/enrollments/route.ts` | step_enrollments, intake |
| `app/api/admin/line/user-richmenu/route.ts` | rich_menus, intake |
| `app/api/admin/noname-master/bank-transfer/route.ts` | orders, intake |
| `app/api/admin/noname-master/route.ts` | orders, intake |
| `app/api/admin/noname-master/square/route.ts` | orders, intake |
| `app/api/admin/patientnote/route.ts` | intake |
| `app/api/admin/patients/bulk/action/route.ts` | actions, message_templates, intake, message_log, patient_tags, patient_marks, tag_definitions |
| `app/api/admin/patients/bulk/menu/route.ts` | rich_menus, intake |
| `app/api/admin/patients/bulk/send/route.ts` | message_templates, intake, message_log |
| `app/api/admin/shipping/export-lstep-tags/route.ts` | orders, intake |
| `app/api/admin/shipping/export-yamato-b2/route.ts` | orders, intake |
| `app/api/admin/shipping/history/route.ts` | orders, intake |
| `app/api/admin/shipping/pending/route.ts` | orders, intake |
| `app/api/admin/shipping/today-shipped/route.ts` | orders, intake |
| `app/api/admin/shipping/update-tracking/preview/route.ts` | orders, intake |
| `app/api/admin/tags/[id]/route.ts` | patient_tags, intake, tag_definitions |
| `app/api/admin/update-line-user-id/route.ts` | intake |
| `app/api/checkout/route.ts` | intake |
| `app/api/cron/process-steps/route.ts` | step_enrollments, step_items, intake, message_log, message_templates, patient_tags, patient_marks, step_scenarios |
| `app/api/cron/send-scheduled/route.ts` | scheduled_messages, intake, message_log |
| `app/api/doctor/callstatus/route.ts` | intake |
| `app/api/doctor/update/route.ts` | intake, reservations |
| `app/api/health/route.ts` | intake |
| `app/api/intake/has/route.ts` | intake |
| `app/api/intake/list/route.ts` | reservations, intake |
| `app/api/intake/route.ts` | intake, answerers, admin_users |
| `app/api/line/callback/route.ts` | intake |
| `app/api/register/check/route.ts` | intake, answerers |
| `app/api/register/complete-redirect/route.ts` | intake |
| `app/api/register/complete/route.ts` | intake, answerers, orders, rich_menus |
| `app/api/register/personal-info/route.ts` | intake, answerers, patient_tags, rich_menus |
| `app/api/repair/route.ts` | intake, answerers |
| `app/api/reservations/route.ts` | booking_open_settings, reservations, doctor_weekly_rules, doctor_date_overrides, intake |

### Cのみ（gas_row_number変更のみ + D）

| ファイル | 参照テーブル |
|---------|-----------|
| `app/api/admin/reorders/reject/route.ts` | reorders |
| `app/api/doctor/reorders/reject/route.ts` | reorders |
| `app/api/doctor/reorders/route.ts` | reorders |
| `app/api/gmo/webhook/route.ts` | reorders, orders |
| `app/api/reorder/cancel/route.ts` | reorders |
| `app/api/square/webhook/route.ts` | reorders, orders |

### Dのみ（tenant_idフィルタ追加のみ）（93個）

| ファイル | 参照テーブル |
|---------|-----------|
| `app/api/admin/analytics/export/route.ts` | orders |
| `app/api/admin/analytics/route.ts` | orders |
| `app/api/admin/bank-transfer-orders/route.ts` | orders |
| `app/api/admin/bank-transfer/manual-confirm/route.ts` | orders |
| `app/api/admin/bank-transfer/reconcile/confirm/route.ts` | orders |
| `app/api/admin/bank-transfer/reconcile/preview/route.ts` | orders |
| `app/api/admin/bank-transfer/reconcile/route.ts` | orders |
| `app/api/admin/booking-open/route.ts` | booking_open_settings |
| `app/api/admin/chat-reads/route.ts` | chat_reads |
| `app/api/admin/cost-calculation/route.ts` | orders |
| `app/api/admin/daily-revenue/route.ts` | orders |
| `app/api/admin/date_override/route.ts` | doctor_date_overrides |
| `app/api/admin/doctors/route.ts` | doctors |
| `app/api/admin/financials/route.ts` | monthly_financials |
| `app/api/admin/friend-fields/[id]/route.ts` | friend_field_definitions |
| `app/api/admin/friend-fields/route.ts` | friend_field_definitions |
| `app/api/admin/karte-templates/route.ts` | karte_templates |
| `app/api/admin/line/action-folders/route.ts` | action_folders, actions |
| `app/api/admin/line/actions/route.ts` | actions |
| `app/api/admin/line/broadcast/ab-test/route.ts` | broadcasts, reservations, message_log |
| `app/api/admin/line/click-track/route.ts` | click_tracking_links |
| `app/api/admin/line/click-track/stats/route.ts` | click_tracking_events, click_tracking_links |
| `app/api/admin/line/flex-presets/route.ts` | flex_presets |
| `app/api/admin/line/form-folders/route.ts` | form_folders, forms |
| `app/api/admin/line/forms/[id]/publish/route.ts` | forms |
| `app/api/admin/line/forms/[id]/responses/route.ts` | forms, form_responses |
| `app/api/admin/line/forms/[id]/route.ts` | forms |
| `app/api/admin/line/forms/route.ts` | forms |
| `app/api/admin/line/friend-settings/route.ts` | friend_add_settings, rich_menus |
| `app/api/admin/line/keyword-replies/route.ts` | keyword_auto_replies |
| `app/api/admin/line/keyword-replies/test/route.ts` | keyword_auto_replies |
| `app/api/admin/line/media-folders/route.ts` | media_folders, media_files |
| `app/api/admin/line/media/route.ts` | media_files |
| `app/api/admin/line/menu-rules/route.ts` | patients |
| `app/api/admin/line/segments/route.ts` | segments |
| `app/api/admin/line/step-scenarios/[id]/route.ts` | step_scenarios, step_items, step_enrollments |
| `app/api/admin/line/step-scenarios/route.ts` | step_scenarios, step_items |
| `app/api/admin/line/template-categories/route.ts` | template_categories |
| `app/api/admin/line/templates/[id]/route.ts` | message_templates |
| `app/api/admin/line/templates/route.ts` | message_templates |
| `app/api/admin/login/route.ts` | admin_users |
| `app/api/admin/messages/log/route.ts` | message_log |
| `app/api/admin/mypage-settings/route.ts` | mypage_settings |
| `app/api/admin/noname-master/add-to-shipping/route.ts` | orders |
| `app/api/admin/noname-master/recreate-label/route.ts` | orders |
| `app/api/admin/noname-master/update-tracking/route.ts` | orders |
| `app/api/admin/password-reset/confirm/route.ts` | password_reset_tokens, admin_users |
| `app/api/admin/password-reset/request/route.ts` | admin_users, password_reset_tokens |
| `app/api/admin/patients/[id]/fields/route.ts` | friend_field_values |
| `app/api/admin/patients/[id]/mark/route.ts` | patient_marks, mark_definitions |
| `app/api/admin/patients/[id]/tags/route.ts` | patient_tags |
| `app/api/admin/patients/bulk/fields/route.ts` | friend_field_definitions, friend_field_values |
| `app/api/admin/patients/bulk/mark/route.ts` | mark_definitions, patient_marks |
| `app/api/admin/patients/bulk/tags/route.ts` | patient_tags |
| `app/api/admin/pins/route.ts` | admin_users |
| `app/api/admin/products/route.ts` | products |
| `app/api/admin/reservations/today/route.ts` | reservations |
| `app/api/admin/schedule/route.ts` | doctors, doctor_weekly_rules, doctor_date_overrides |
| `app/api/admin/shipping/config/route.ts` | (設定) |
| `app/api/admin/shipping/export-yamato-b2-custom/route.ts` | orders |
| `app/api/admin/shipping/share/route.ts` | shipping_shares |
| `app/api/admin/shipping/update-tracking/confirm/route.ts` | orders |
| `app/api/admin/shipping/update-tracking/route.ts` | orders |
| `app/api/admin/tags/route.ts` | tag_definitions, patient_tags |
| `app/api/admin/unread-count/route.ts` | chat_reads, message_log |
| `app/api/admin/update-order-address/route.ts` | orders |
| `app/api/admin/users/route.ts` | admin_users, password_reset_tokens |
| `app/api/admin/weekly_rules/route.ts` | doctor_weekly_rules |
| `app/api/doctor/karte-images/route.ts` | karte_images |
| `app/api/forms/[slug]/route.ts` | forms, form_responses |
| `app/api/forms/[slug]/upload/route.ts` | forms, media |
| `app/api/mypage/orders/route.ts` | orders |
| `app/api/mypage/update-address/route.ts` | orders |
| `app/api/shipping/share/[id]/route.ts` | shipping_shares |
| `app/api/square/backfill-refunds/route.ts` | orders |

### DB参照なし（変更不要）

- `app/api/admin/invalidate-cache/route.ts`
- `app/api/admin/line/broadcast/preview/route.ts`
- `app/api/admin/line/column-settings/route.ts`
- `app/api/admin/line/followers/route.ts`
- `app/api/admin/line/upload-template-image/route.ts`
- `app/api/admin/logout/route.ts`
- `app/api/admin/session/route.ts`
- `app/api/admin/settings/route.ts`
- `app/api/admin/shipping/lstep-tag-csv/route.ts`
- `app/api/admin/reservations/reminder-csv/route.ts`
- `app/api/line/login/route.ts`
- `app/api/mypage/identity/route.ts`
- `app/api/mypage/profile/route.ts`
- `app/api/mypage/settings/route.ts`
- `app/api/profile/route.ts`
- `app/api/square/backfill/route.ts`
- `app/api/verify/check/route.ts`
- `app/api/verify/send/route.ts`
- `app/api/admin/flex-settings/route.ts`

---

## フロントエンドページ 影響マップ

### マイページ

| ファイル | A | B | C | D | 備考 |
|---------|---|---|---|---|------|
| `app/mypage/page.tsx` | ✓ | | | ✓ | answerers直接参照（行65-69）、intake.line_id参照 |
| `app/mypage/PatientDashboardInner.tsx` | | | ✓ | | gas_row_number参照（行65,529,1276,1282）、決済リンク生成 |
| `app/mypage/purchase/` 配下 | | | | | API経由のため直接影響なし |

### 管理画面

| ファイル | A | B | C | D | 備考 |
|---------|---|---|---|---|------|
| `app/admin/page.tsx` (ダッシュボード) | | | | | API経由 |
| `app/admin/patients/[patientId]/page.tsx` | | | | | patientbundle API経由 |
| `app/admin/reorders/page.tsx` | | | ✓ | | gas_row_number表示（API側で変換される場合もOK） |
| `app/admin/reservations/page.tsx` | | | | | API経由 |
| `app/admin/shipping/` 配下全ページ | | | | | API経由（orders参照） |
| `app/admin/noname-master/` 配下 | | | | | API経由（orders+intake参照） |
| `app/admin/bank-transfer/` 配下 | | | | | API経由 |
| `app/admin/refunds/page.tsx` | | | | | API経由 |
| `app/admin/merge-patients/page.tsx` | | | | | API経由（answerers→patients はAPI側で吸収） |
| `app/admin/patient-data/page.tsx` | | ✓ | | | 型定義に reserved_date/time あり |
| `app/admin/view-mypage/page.tsx` | | | | | API経由 |
| `app/admin/karte/page.tsx` | | | | | API経由 |
| `app/admin/kartesearch/page.tsx` | | | | | API経由 |
| `app/admin/doctor/page.tsx` | | | | | API経由 |
| `app/admin/products/page.tsx` | | | | | products API（tenant_id対応済み） |
| `app/admin/settings/page.tsx` | | | | | tenant_settings API（tenant_id対応済み） |
| `app/admin/line/talk/page.tsx` | | | | | API経由（friends-list等が内部でanswerers参照） |
| `app/admin/line/friends/[id]/page.tsx` | | | | | API経由 |
| `app/admin/line/` 配下全ページ | | | | | API経由 |
| `app/admin/accounting/` 配下 | | | | | API経由（orders参照） |
| `app/admin/analytics/page.tsx` | | | | | API経由 |
| `app/admin/schedule/` 配下 | | | | | API経由（doctors/rules参照） |

### Drカルテ

| ファイル | A | B | C | D | 備考 |
|---------|---|---|---|---|------|
| `app/doctor/page.tsx` | | | | | API経由（intake/list, doctor/reorders） |

### 患者登録

| ファイル | A | B | C | D | 備考 |
|---------|---|---|---|---|------|
| `app/register/page.tsx` | | | | | API経由 |

---

## ライブラリ 影響マップ

| ファイル | A | B | C | D | 備考 |
|---------|---|---|---|---|------|
| `lib/supabase.ts` | ✓ | | | | Intake型定義に冗長カラム、Patient型追加必要 |
| `lib/menu-auto-rules.ts` | | | | ✓ | patient_tags, patient_marks, friend_field_values, patients参照 |
| `lib/reorder-karte.ts` | | | | ✓ | reorders参照 |
| `lib/step-enrollment.ts` | | | | ✓ | step_scenarios, step_enrollments参照 |
| `lib/products.ts` | | | | ✅ | tenant_id対応済み |
| `lib/settings.ts` | | | | ✅ | tenant_id対応済み |
| `lib/payment/square.ts` | | | | | DB直接参照なし |
| `lib/line-richmenu.ts` | | | | | DB直接参照なし |
| `lib/phone.ts` | | | | | DB直接参照なし |

---

## 独自ロジック（リッチメニュー切替等）の影響

### リッチメニュー自動切替（lib/menu-auto-rules.ts）
- **参照テーブル**: patient_tags, patient_marks, friend_field_values, patients(line_id)
- **影響**: D（tenant_id追加）のみ。A/B/Cの影響なし
- **理由**: 既に patients テーブルから line_id を取得している

### LINE webhook の自動ステータス割り当て（app/api/line/webhook/route.ts）
- **autoAssignStatusByPatient()**: orders, answerers(name, tel) 参照
- **findPatientByLineUid()**: intake.line_id で逆引き → **B影響（patients.line_idに変更必要）**
- **handleFollow()**: intake INSERT（新規患者作成） → **B影響**
- **handleAdminPostback()**: reorders.gas_row_number で検索 → **C影響**
- **全体**: A+B+C+D 全て影響

### ステップ配信 cron（app/api/cron/process-steps/route.ts）
- intake.patient_name でテンプレート変数置換 → **B影響（patients.nameに変更必要）**

### 予約送信 cron（app/api/cron/send-scheduled/route.ts）
- intake.patient_name でテンプレート変数置換 → **B影響**

### フォーム送信時アクション（app/api/forms/[slug]/submit/route.ts）
- intake.line_id で患者逆引き → **B影響**
- answerers テーブル参照あり → **A影響**
- **バグ発見**: answerers.mark への update（patient_marks が正しい）

---

## 集計サマリ

| 変更 | API | フロント | ライブラリ | 合計 |
|------|-----|--------|----------|------|
| A (answerers→patients) | 36 | 1 | 1 | **38** |
| B (intake正規化) | 41 | 1 | 0 | **42** |
| C (gas_row_number) | 18 | 1 | 0 | **19** |
| D (tenant_id) | 151 | 1 | 3 | **155** |
| **変更不要** | 19 | 50+ | 3 | **72+** |
