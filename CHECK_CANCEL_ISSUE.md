# キャンセル処理がSupabaseに反映されない問題

## 現状
- **予約シート**: ステータス=「キャンセル」 ✅
- **問診シート**: reserve_id/日時が残っている可能性 ❌
- **Supabase**: reserve_id/日時が残っている ❌
  ```json
  {
    "reserve_id": "resv-1769424226395",
    "reserved_date": "2026-01-30",
    "reserved_time": "10:00"
  }
  ```
- **Dr.カルテUI**: 古い予約情報が表示される ❌

## 考えられる原因

### 1. GAS Script Propertiesが未設定
gas/reservations のScript Propertiesで以下が設定されているか確認が必要:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

### 2. デプロイバージョンが古い
現在2つのデプロイメントが存在:
- `@HEAD` (最新)
- `@42` (古いバージョン)

Webアプリが@42を使用している場合、最新のコードが反映されていない可能性があります。

### 3. 問診シートで該当のreserve_idが見つからない
キャンセル処理のコード:
```javascript
// 問診シートでreserveIdを検索
const rid = String(intakeValues[r][COL_RESERVE_ID_INTAKE - 1] || "").trim();
if (rid === reserveId) {
  // クリア処理
}
```

もし問診シートのreserve_id列が空、または別の値になっている場合、該当行が見つからずクリア処理が実行されません。

## 確認手順

### ステップ1: GAS Script Propertiesを確認
1. Apps Script エディタを開く
   - URL: https://script.google.com/home/projects/{SCRIPT_ID}/settings
2. 「プロジェクトの設定」→「スクリプト プロパティ」を確認
3. 以下が設定されているか確認:
   - `SUPABASE_URL`: `https://fzfkgemtaxsrocbucmza.supabase.co`
   - `SUPABASE_ANON_KEY`: `eyJhbGci...` (長いトークン)

**もし未設定の場合**: 設定を追加

### ステップ2: デプロイバージョンを確認
1. Apps Script エディタ →「デプロイ」→「デプロイを管理」
2. 現在のWebアプリデプロイがどのバージョンを使用しているか確認
3. もし@42または古いバージョンを使用している場合:
   - 「新しいデプロイ」→「ウェブアプリ」
   - または既存デプロイを編集して@HEADに変更

### ステップ3: GAS実行ログを確認
1. Apps Script エディタ →「実行数」
2. 最近のcancelReservation実行ログを確認
3. 以下のログが出ているか確認:
   - `intake cleared for canceled reserveId at row XXX`
   - `[Supabase] Updated reservation for patient_id=20251200128`
   - または `[Supabase] Cancel update failed: ...`

### ステップ4: 問診シートを直接確認
1. 問診シート（「問診」タブ）を開く
2. patient_id=20251200128 の行を探す
3. 以下の列を確認:
   - 予約ID列 (COL_RESERVE_ID_INTAKE): 空になっているべき
   - 予約日列 (COL_RESERVED_DATE_INTAKE): 空になっているべき
   - 予約時間列 (COL_RESERVED_TIME_INTAKE): 空になっているべき

**もし残っている場合**: 手動でクリアして、Supabaseも手動で更新

## 一時的な修正方法

### Supabaseを手動で更新
```bash
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d= -f2)
SUPABASE_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)

curl -X PATCH "${SUPABASE_URL}/rest/v1/intake?patient_id=eq.20251200128" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"reserve_id": null, "reserved_date": null, "reserved_time": null}'
```

実行後、Dr.カルテUIをリロード（Cmd+Shift+R）して確認。

## 根本的な修正

確認後、以下のいずれかが原因と判明した場合:

### 原因1: Script Properties未設定
→ 設定を追加後、再度キャンセルをテスト

### 原因2: 古いデプロイバージョン
→ @HEADで新規デプロイ、URLを更新

### 原因3: 問診シートで該当レコードが見つからない
→ コードのデバッグが必要（COL_RESERVE_ID_INTAKEの列番号が正しいか確認）

### 原因4: その他のエラー
→ GAS実行ログのエラーメッセージから特定
