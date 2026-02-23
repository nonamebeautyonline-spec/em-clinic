# ドメイン境界マップ — Lオペ for CLINIC

> **目的**: 各ドメインの責務・SoT（Single Source of Truth）・API所有権を1枚で把握する
> **最終更新**: 2026-02-23

---

## 1. ドメイン一覧と責務

| # | ドメイン | 責務 | 主要APIプレフィックス |
|---|---------|------|---------------------|
| 1 | **患者** | 患者プロフィール、LINE連携、カスタムフィールド | `/api/register/`, `/api/mypage/`, `/api/admin/patients/` |
| 2 | **問診** | 問診フォーム管理、回答データ保存 | `/api/intake` |
| 3 | **予約** | 診察予約、スロット定員管理 | `/api/reservations`, `/api/admin/reservations/` |
| 4 | **決済** | 決済リンク生成、webhook処理、注文記録 | `/api/checkout`, `/api/square/`, `/api/gmo/`, `/api/bank-transfer/` |
| 5 | **再処方** | 再処方申請・承認・支払い・カルテ生成 | `/api/reorder/`, `/api/doctor/reorders/`, `/api/admin/reorders/` |
| 6 | **カルテ** | 診察記録、テンプレート、医師入力 | `/api/doctor/update`, `/api/admin/karte*` |
| 7 | **LINE運用** | メッセージング、友だち管理、自動化、分析 | `/api/line/`, `/api/admin/line/`, `/api/ai-reply/` |
| 8 | **配送** | 配送追跡、ヤマト連携、発送通知 | `/api/admin/shipping/` |
| 9 | **認証** | Admin/Platform ログイン、セッション、2FA | `/api/admin/login`, `/api/platform/login`, `/api/platform/totp/` |
| 10 | **プラットフォーム** | テナント管理、ビリング、メンバー管理 | `/api/platform/` |
| 11 | **定期処理** | Cron ジョブ（Step実行、リマインダー等） | `/api/cron/` |

---

## 2. SoT（Single Source of Truth）テーブルマップ

### 患者の真実
| テーブル | SoTドメイン | 書き込み許可 | 備考 |
|---------|-----------|------------|------|
| `patients` | 患者 | 患者, 問診, LINE | `patient_id` + `line_id` + `tel` |
| `patient_tags` | 患者/LINE | 患者, LINE | M2M: タグ付け |
| `friend_field_values` | 患者/LINE | 患者, LINE | カスタムフィールド値 |

### 問診・予約の真実
| テーブル | SoTドメイン | 書き込み許可 | 備考 |
|---------|-----------|------------|------|
| `intake` | 問診 | 問診, 予約, カルテ | **patient_idにユニーク制約なし** |
| `reservations` | 予約 | 予約 | RPC `create_reservation_atomic` でアトミック |
| `booking_open_settings` | 予約 | 予約（Admin） | 翌月開放日 |

### 決済・注文の真実
| テーブル | SoTドメイン | 書き込み許可 | 備考 |
|---------|-----------|------------|------|
| `orders` | 決済 | 決済, 配送 | `payment_status` + `shipping_status` |
| `reorders` | 再処方 | 再処方, 決済 | `status`: pending→confirmed→paid→shipped |
| `reorders.karte_note` | カルテ | カルテ（Dr承認時のみ） | 再処方カルテのSoT（intakeへのINSERTは廃止） |

### LINE運用の真実
| テーブル | SoTドメイン | 書き込み許可 | 備考 |
|---------|-----------|------------|------|
| `line_messages` | LINE | LINE | 会話履歴 |
| `message_templates` | LINE | LINE | テンプレート |
| `step_enrollments` | LINE | LINE, Cron | LINE Step シナリオ登録 |
| `ai_reply_drafts` | LINE | LINE, Cron | AI返信ドラフト |
| `broadcasts` | LINE | LINE | ブロードキャスト履歴 |

### 配送の真実
| テーブル | SoTドメイン | 書き込み許可 | 備考 |
|---------|-----------|------------|------|
| `orders.shipping_status` | 配送 | 配送 | pending→shipped |
| `orders.tracking_number` | 配送 | 配送 | ヤマト等の追跡番号 |

### プラットフォームの真実
| テーブル | SoTドメイン | 書き込み許可 | 備考 |
|---------|-----------|------------|------|
| `tenants` | プラットフォーム | プラットフォーム | テナント基本情報 |
| `tenant_members` | プラットフォーム | プラットフォーム | チームメンバー |
| `admin_users` | 認証 | 認証, プラットフォーム | 管理者アカウント |
| `admin_sessions` | 認証 | 認証 | セッション記録 |
| `audit_logs` | 認証 | 全ドメイン（fire-and-forget） | 監査ログ |

### 冪等性・排他の真実
| テーブル | SoTドメイン | 書き込み許可 | 備考 |
|---------|-----------|------------|------|
| `webhook_events` | 基盤 | 決済, LINE, 定期処理 | 冪等キー管理 |

---

## 3. ドメイン間依存関係

```
                    ┌──────────┐
                    │ プラットフォーム │  テナント管理・ビリング
                    └─────┬────┘
                          │ tenant_id
              ┌───────────┼───────────┐
              ▼           ▼           ▼
         ┌────────┐  ┌────────┐  ┌────────┐
         │  認証  │  │ LINE   │  │  CRM   │
         └────┬───┘  └───┬────┘  └────────┘
              │          │
              ▼          ▼
         ┌────────┐  ┌────────┐
         │  患者  │◄─┤ 友だち  │  LINE follow → patient自動作成
         └────┬───┘  │  追加  │
              │      └────────┘
              ▼
         ┌────────┐
         │  問診  │  intake.answers 保存
         └────┬───┘
              │ 問診完了が前提条件
              ▼
         ┌────────┐
         │  予約  │  reservations + intake.reserve_id
         └────┬───┘
              │
         ┌────┴────┐
         ▼         ▼
    ┌────────┐ ┌────────┐
    │  決済  │ │ カルテ  │  Dr入力 → intake.note/status
    └────┬───┘ └────────┘
         │
         ▼
    ┌────────┐
    │  配送  │  orders.shipping_status
    └────────┘

    ── 再処方ループ ──
    reorder/apply → Dr承認 → 決済 → 配送
```

---

## 4. 致命的なルール（絶対に間違えないこと）

### intake テーブル
- **patient_id にユニーク制約なし** → `upsert({ onConflict: "patient_id" })` は使用禁止
- **SELECT は `reserve_id` 優先**で問診本体を取得（カルテレコード混入防止）
- **UPDATE は `id` 指定**（`patient_id` 指定だと複数レコードを全上書き）
- **必ず `supabaseAdmin` を使う**（anon key → RLS ブロック → データ消失）

### NG 判定
- `intake.status` で NG 判定する際は `.not("status", "is", null)` 必須
- 適用箇所: checkout, bank-transfer/shipping, reorder/apply

### 再処方カルテ
- 承認時は `reorders.karte_note` のみに保存（intake に INSERT しない）
- 来院履歴: `patientbundle` API が intake + reorders.karte_note を統合して返す

### 電話番号
- 保存時は必ず `normalizeJPPhone()` (`lib/phone.ts`) を通す

### マルチテナント
- 全クエリに `withTenant(query, tenantId)` を適用
- 厳格版 `strictWithTenant()` は tenantId が null ならエラーを投げる

---

## 5. API 所有権マトリクス（どのモジュールがどのテーブルを触っていいか）

| テーブル＼ドメイン | 患者 | 問診 | 予約 | 決済 | 再処方 | カルテ | LINE | 配送 | 認証 | PF |
|----------------|:---:|:---:|:---:|:---:|:----:|:---:|:---:|:---:|:---:|:---:|
| patients       | RW  | R   | R   | R   | R    | R   | RW  |     |     |    |
| intake         |     | RW  | RW  | R   | R    | RW  |     |     |     |    |
| reservations   |     |     | RW  |     |      | R   |     |     |     |    |
| orders         |     |     |     | RW  | R    |     |     | RW  |     |    |
| reorders       |     |     |     | W   | RW   | R   |     |     |     |    |
| line_messages  |     |     |     |     |      |     | RW  |     |     |    |
| admin_users    |     |     |     |     |      |     |     |     | RW  | RW |
| tenants        |     |     |     |     |      |     |     |     |     | RW |
| webhook_events |     |     |     | W   |      |     | W   |     |     |    |
| audit_logs     | W   | W   | W   | W   | W    | W   | W   | W   | W   | W  |

> **R** = 読み取りのみ許可, **RW** = 読み書き許可, **W** = 書き込みのみ（fire-and-forget）

---

## 6. lib モジュール所属

| ドメイン | lib モジュール |
|---------|-------------|
| 患者 | `phone.ts`, `patient-dedup.ts`, `patient-segments.ts` |
| 問診 | `intake-form-defaults.ts` |
| 予約 | `reservation-flex.ts`, `auto-reminder.ts` |
| 決済 | `payment/square.ts`, `payment/gmo.ts`, `products.ts` |
| 再処方 | `reorder-karte.ts` |
| LINE | `line-push.ts`, `line-richmenu.ts`, `step-enrollment.ts`, `ai-reply*.ts` |
| 配送 | `shipping/*.ts` |
| 認証 | `admin-auth.ts`, `platform-auth.ts`, `session.ts`, `rate-limit.ts`, `totp.ts` |
| プラットフォーム | `tenant.ts`, `feature-flags.ts`, `plan-config.ts` |
| 基盤 | `redis.ts`, `distributed-lock.ts`, `idempotency.ts`, `audit.ts`, `supabase.ts` |
| セキュリティ | `validations/*.ts`, `security-alerts.ts` |

---

## 7. 状態遷移マシン

主要エンティティのステート遷移を定義する。遷移以外の更新は原則バグ。

### 7-1. intake.status

```
  null（初期/正常）
    │
    ├── Dr判定 ──→ "NG"        ※ Dr カルテ画面から
    │                          ※ NG判定時は .not("status","is",null) 必須
    └── (null のまま) ──→ 問診完了・予約紐付け
```

| 遷移 | From | To | アクター | ガード条件 | 副作用 |
|------|------|----|---------|-----------|--------|
| 問診保存 | — | null | 患者 | patient_id Cookie | intake レコード作成/更新 |
| 予約紐付け | null | null | 患者 | 問診完了（answers存在） | reserve_id 付与 |
| NG判定 | null | "NG" | Dr | 管理者セッション | checkout/reorder 拒否 |

### 7-2. orders.payment_status

```
  "pending" ──→ "paid"
```

| 遷移 | From | To | アクター | ガード条件 | 副作用 |
|------|------|----|---------|-----------|--------|
| 注文作成 | — | pending | checkout API | productCode有効 | orders レコード作成 |
| 決済完了 | pending | paid | Square/GMO webhook | 署名検証 + 冪等チェック | LINE通知送信 |

### 7-3. orders.shipping_status

```
  "pending" ──→ "shipped"
```

| 遷移 | From | To | アクター | ガード条件 | 副作用 |
|------|------|----|---------|-----------|--------|
| 発送完了 | pending | shipped | Admin | payment_status=paid | tracking_number保存, LINE通知 |

### 7-4. reorders.status

```
  "pending" ──→ "confirmed" ──→ "paid" ──→ "shipped"
      │
      └── "rejected"
```

| 遷移 | From | To | アクター | ガード条件 | 副作用 |
|------|------|----|---------|-----------|--------|
| 申請 | — | pending | 患者 | intake存在 + NG以外 | reorders レコード作成 |
| Dr承認 | pending | confirmed | Dr | 管理者セッション | karte_note 生成（冪等） |
| Dr却下 | pending | rejected | Dr | 管理者セッション | LINE通知 |
| 決済完了 | confirmed | paid | Square/GMO webhook | 署名 + 冪等 | LINE通知 |
| 発送 | paid | shipped | Admin | tracking_number | LINE通知 |

### 7-5. reservations

```
  (作成) ──→ "reserved" ──→ "cancelled"
```

| 遷移 | From | To | アクター | ガード条件 | 副作用 |
|------|------|----|---------|-----------|--------|
| 予約作成 | — | reserved | 患者 | 問診完了 + 枠空き + 開放日 | intake.reserve_id 付与（RPC） |
| キャンセル | reserved | cancelled | 患者/Admin | reserve_id 一致 | intake.reserve_id 解除 |

---

## 8. 外部イベント境界（Webhook / Cron）

外部から流入するイベントの入力・副作用・冪等性保証を定義する。

### 8-1. Webhook（受動イベント）

| イベント | ソース | エンドポイント | 入力 | 副作用 | 冪等性 |
|---------|-------|-------------|------|--------|--------|
| 決済完了 | Square | `/api/square/webhook` | event_id, payment | orders.payment_status→paid | `webhook_events(square, event_id)` |
| 決済完了 | GMO | `/api/gmo/webhook` | accessId, orderId, status | orders.payment_status→paid | `webhook_events(gmo, key)` |
| LINE follow | LINE | `/api/line/webhook` | userId, replyToken | patient+intake自動作成 | patient_id UNIQUE |
| LINE message | LINE | `/api/line/webhook` | messageId, text | line_messages保存 | messageId UNIQUE |

### 8-2. Cron（能動イベント）

| ジョブ | エンドポイント | 排他制御 | TTL | 副作用 | 冪等性 |
|-------|-------------|---------|-----|--------|--------|
| Step実行 | `/api/cron/process-steps` | `cron:process-steps` | 55秒 | LINE送信、enrollment更新 | ロック排他 |
| 予約送信 | `/api/cron/send-scheduled` | `cron:send-scheduled` | 55秒 | LINE一括送信 | ロック排他 |
| AI返信 | `/api/cron/ai-reply` | `cron:ai-reply` | 55秒 | ai_reply_drafts生成 | ロック排他 |
| リマインダー | `/api/cron/generate-reminders` | `cron:generate-reminders` | 55秒 | LINE送信 | ロック排他 |
| フォローアップ | `/api/cron/followup` | `cron:followup` | 55秒 | LINE送信 | ロック排他 |
| セグメント再計算 | `/api/cron/segment-recalculate` | `cron:segment-recalculate` | 55秒 | patient_segments更新 | ロック排他（副作用なし） |

### 8-3. 障害時のフォールバック方針

| コンポーネント | 障害時の挙動 | 理由 |
|-------------|-----------|------|
| Redis（分散ロック） | ロック取得成功として処理続行 | サービス可用性優先 |
| Redis（レート制限） | 制限なしとして処理続行 | 同上 |
| DB（冪等チェック） | 重複なしとして処理続行 | 同上 |
| Webhook署名検証 | 秘密鍵未設定ならスキップ | 段階導入 |

---

## 9. CRUD マトリクス（詳細版）

セクション5の R/W を C/R/U/D に分解。「特権」は管理者セッション経由のみ許可。

| テーブル＼ドメイン | 患者 | 問診 | 予約 | 決済 | 再処方 | カルテ | LINE | 配送 | 認証 | PF |
|----------------|:----:|:----:|:----:|:----:|:-----:|:----:|:----:|:----:|:----:|:----:|
| patients       | CRU  | R    | R    | R    | R     | R    | CRU  |      |      |     |
| intake         |      | CRU  | U†   | R    | R     | CRU  |      |      |      |     |
| reservations   |      |      | CRUD |      |       | R    |      |      |      |     |
| orders         |      |      |      | CRU  | R     |      |      | RU   |      |     |
| reorders       |      |      |      | U†   | CRUD  | R    |      |      |      |     |
| line_messages  |      |      |      |      |       |      | CR   |      |      |     |
| admin_users    |      |      |      |      |       |      |      |      | CRUD | CRU |
| tenants        |      |      |      |      |       |      |      |      |      | CRUD|
| tenant_members |      |      |      |      |       |      |      |      |      | CRUD|
| webhook_events |      |      |      | C    |       |      | C    |      |      |     |
| audit_logs     | C    | C    | C    | C    | C     | C    | C    | C    | C    | C   |

> **C** = Create, **R** = Read, **U** = Update, **D** = Delete
> **†** = 特権経路のみ（予約→intake.reserve_id更新、決済→reorders.status更新）
> patients の Delete は管理者画面（admin/delete-patient-data）からのみ

---

## 10. 禁止遷移（Forbidden Transitions）

以下の遷移は**絶対に起こしてはならない**。コードレビュー・テストで必ず検出すること。

| エンティティ | 禁止遷移 | 理由 |
|-----------|---------|------|
| orders.payment_status | paid → pending | 決済完了後の巻き戻しは二重課金リスク |
| orders.shipping_status | shipped → pending | 発送済み商品の巻き戻しは不可逆 |
| reorders.status | confirmed → pending | Dr承認を取り消すフローは存在しない |
| reorders.status | paid → confirmed | 決済完了後の巻き戻し禁止 |
| reorders.status | shipped → paid | 発送後の巻き戻し禁止 |
| reorders.status | rejected → * | 却下は最終状態（再申請は新規レコード） |
| intake.status | "NG" → null | NG判定の取り消しは管理者画面から別経路で行う |
| reservations | cancelled → reserved | キャンセル後の復元は新規予約で対応 |

---

## 11. エラー分類（Error Taxonomy）

全APIで統一するHTTPステータスコードの意味。E2Eアサートもこの分類に従う。

| ステータス | 分類 | 意味 | E2Eでの扱い |
|-----------|------|------|------------|
| 200 | 成功 | 正常完了 | 期待値と完全一致をアサート |
| 400 | 入力エラー | バリデーション失敗、パラメータ不足 | `error` フィールドの理由コードをアサート |
| 401 | 認証エラー | Cookie/トークン未設定・無効 | 厳密に401のみ期待 |
| 403 | 権限エラー | NG患者・テナント不一致・RLS拒否 | `error` フィールドをアサート |
| 404 | 不存在 | テナント・リソースが見つからない | サブドメイン解決失敗時など |
| 409 | 競合 | 枠満杯・冪等キー重複 | `error` の理由コード（`slot_full` 等） |
| 422 | 型エラー | Zodスキーマ不一致 | 400と同等に扱う |
| 429 | レート制限 | Upstash Redis によるブロック | `retryAfter` をアサート |
| 500 | 内部エラー | **バグ** — Smoke E2Eで許容しない | 環境依存（決済プロバイダ未接続）のみ例外的に許容 |

---

## 12. 唯一更新経路（Single Writer Principle）

各カラムの書き込み元を1つに限定する。複数経路からの更新はデータ不整合の温床。

| テーブル.カラム | 唯一の更新経路 | 備考 |
|---------------|-------------|------|
| orders.payment_status | Square/GMO webhook のみ | Admin画面からの手動変更は禁止 |
| orders.shipping_status | Admin配送操作のみ | webhook/Cronからの更新は禁止 |
| orders.tracking_number | Admin配送操作のみ | 発送完了時に1回だけ書き込み |
| reorders.status | 各遷移の専用API | apply→Dr承認→webhook→Admin発送 |
| reorders.karte_note | Dr承認時のみ（冪等: `.is("karte_note", null)`） | intakeへのINSERTは廃止済み |
| intake.reserve_id | 予約RPC のみ | 直接UPDATEは禁止 |
| intake.status | Dr カルテ画面のみ | 患者側からのstatus変更は不可 |
| patients.tel | register/complete のみ | webhook/問診からの上書きは禁止 |
