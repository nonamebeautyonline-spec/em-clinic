# データ同期の概要

## Supabaseテーブル（データベース）

現在使用中のテーブル:

| テーブル名 | レコード数 | 説明 |
|-----------|-----------|------|
| **intake** | 1,995件 | 問診データ（患者情報、問診回答、予約情報、不通フラグ） |
| **reservations** | 42件 | 予約データ（予約ID、日時、ステータス） |
| **orders** | 1,809件 | 注文データ（Square決済、配送情報） |
| **reorders** | 0件 | 再注文データ（使用準備中） |

---

## GASプロジェクト → Google Sheets → Supabase の同期関係

### 1. **intake GAS** (問診管理)
- **スクリプトID**: `1gNsoGGlCJ2UVgrxCIyjTfllXMW9FYTo4IBGpzBUb3RHwIfmBwIwjJfK8`
- **環境変数**:
  - `GAS_MYPAGE_URL`
  - `GAS_INTAKE_LIST_URL`
  - `GAS_PATIENT_LINK_URL`
- **Google Sheets**:
  - **問診シート**（"問診"）: メイン問診データ
  - **予約シート**（"予約"）: 予約一覧
  - **問診マスターシート**（"問診マスター"）: 患者マスターデータ
- **Supabase同期先**:
  - ✅ `intake` テーブル
  - ✅ `reservations` テーブル（予約データも書き込み）
- **同期タイミング**:
  - 問診回答送信時: `writeToSupabaseIntake_()` で `intake` テーブルに書き込み
  - 予約作成/変更時: `updateSupabaseIntakeReservation_()` で `intake` テーブル更新
  - バックフィル: `backfillAllIntakeDataToSupabase()` で全データ同期

### 2. **reservations GAS** (予約管理)
- **スクリプトID**: （確認必要）
- **環境変数**: （同じく `GAS_MYPAGE_URL` を共有している可能性）
- **Google Sheets**:
  - **予約シート**（"予約"）: 予約カレンダーデータ
  - **問診シート**（"問診"）: 氏名などの参照用
- **Supabase同期先**:
  - ✅ `reservations` テーブル
  - ✅ `intake` テーブル（予約情報の更新）
- **同期タイミング**:
  - 予約作成: `createReservation` → `writeToSupabaseReservation_()` + `updateSupabaseIntakeReservation_()`
  - 予約変更: `updateReservation` → 同上
  - 予約キャンセル: `cancelReservation` → 同上
  - バックフィル: `backfill_reservations` ハンドラで既存予約を一括同期

### 3. **mypage-orders GAS** (注文管理)
- **スクリプトID**: （確認必要）
- **環境変数**: `GAS_MYPAGE_ORDERS_URL`
- **Google Sheets**:
  - **注文シート**: Square決済データ、配送情報
- **Supabase同期先**:
  - ✅ `orders` テーブル
- **同期タイミング**:
  - Square Webhook経由で注文作成時
  - 配送情報更新時

### 4. **reorder-line-bot GAS** (再注文管理)
- **スクリプトID**: （確認必要）
- **環境変数**: `GAS_REORDER_URL`
- **Google Sheets**:
  - **再注文シート**: LINE経由の再注文リクエスト
- **Supabase同期先**:
  - ⏳ `reorders` テーブル（準備中）
- **同期タイミング**:
  - LINEボットからの再注文時

### 5. **square-webhook GAS** (決済処理)
- **スクリプトID**: （確認必要）
- **環境変数**: （Square Webhookから直接呼び出し）
- **Google Sheets**:
  - **noname-masterシート**: 問診マスターデータ（別スプレッドシート）
- **Supabase同期先**:
  - ✅ `orders` テーブル（決済情報）
- **同期タイミング**:
  - Square決済完了時のWebhook

---

## 主要な同期フロー

### 📝 問診〜予約フロー
```
1. 患者がマイページで問診回答
   ↓
2. 問診シート（"問診"）に書き込み
   ↓
3. Supabase `intake` テーブルに同期
   ↓
4. 患者が予約を取得
   ↓
5. 予約シート（"予約"）に書き込み
   ↓
6. Supabase `reservations` + `intake` テーブルに同期
```

### 🩺 診察フロー
```
1. 医師がカルテUIで診察（/doctor）
   ↓
2. OK/NG ボタンを押す
   ↓
3. `/api/doctor/update` → GAS（問診シート更新）
   ↓
4. Supabase `intake` テーブル更新（status, note, prescription_menu）
   ↓
5. マイページキャッシュ無効化
```

### 📞 不通フロー
```
1. 医師が「不通」ボタンを押す
   ↓
2. `/api/doctor/callstatus` → GAS（問診シート更新）
   ↓
3. Supabase `intake` テーブル更新（call_status, call_status_updated_at）
   ↓
4. カルテUIに「不通」バッジ表示
```

### 💳 決済フロー
```
1. Square決済完了
   ↓
2. Square Webhook → GAS
   ↓
3. 注文シートに書き込み
   ↓
4. Supabase `orders` テーブルに同期
```

---

## データの一貫性を保つための仕組み

### ✅ 現在実装済み
1. **問診データ**: 問診シート → Supabase `intake` （双方向同期）
2. **予約データ**: 予約シート → Supabase `reservations` + `intake` （双方向同期）
3. **診察結果**: カルテUI → GAS → Supabase `intake` （即時同期）
4. **不通フラグ**: カルテUI → GAS → Supabase `intake` （即時同期）
5. **患者氏名**: 3段階フォールバック（問診シート → 問診マスター → reservations）

### ⏳ 今後の改善予定
1. **reordersテーブル**: 再注文データの本格的な同期
2. **shippingテーブル**: 配送データの分離管理
3. **キャッシュ戦略**: Redisキャッシュの最適化

---

## 重要な環境変数

```bash
# 問診・予約・患者管理（intake GAS）
GAS_MYPAGE_URL="..."
GAS_INTAKE_LIST_URL="..."  # 同じGAS
GAS_PATIENT_LINK_URL="..."  # 同じGAS

# 注文管理
GAS_MYPAGE_ORDERS_URL="..."

# 再注文管理
GAS_REORDER_URL="..."

# カルテ検索
GAS_KARTE_URL="..."

# 管理者機能
GAS_ADMIN_URL="..."

# 問診マスター書き込み
GAS_UPSERT_URL="..."
```

---

## データ確認方法

### Supabaseテーブルのレコード数確認
```bash
node --env-file=.env.local check-all-supabase-tables.mjs
```

### 特定日付の予約データ確認
```bash
node --env-file=.env.local check-intake-20260128.mjs
node --env-file=.env.local check-reservations-20260128.mjs
```

### 不通データ確認
```bash
node --env-file=.env.local check-no-answer-in-supabase.mjs
```

### バックフィル実行
```bash
# 全問診データを同期
node --env-file=.env.local backfill-all-intake.mjs

# 予約データを同期
node --env-file=.env.local backfill-reservations.mjs

# 不通データを同期
node --env-file=.env.local sync-call-status-to-supabase.mjs
```
