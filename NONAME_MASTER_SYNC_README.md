# のなめマスター → Supabase 同期

## 概要

のなめマスターシートの注文情報をSupabase ordersテーブルに同期します。

## セットアップ

### 1. GAS Script Properties設定

GASプロジェクト（1QfteW9EHPYXOPqfW3wPJ3E_oDGMetv7G6bnQxrvBSmxg-HhwVTlAXgCD）で：

1. Script Editor → プロジェクト設定 → Script Properties
2. 以下を追加：
   - `SUPABASE_URL`: `https://your-project.supabase.co`
   - `SUPABASE_ANON_KEY`: `eyJ...（anonキー）`

### 2. 初回バックフィル

既存ののなめマスターデータを全てSupabaseに同期：

```javascript
// GAS Script Editorで実行

// 1. 行数確認
checkNonameMasterRowCount()

// 2. 全件同期（データ量に応じてバッチサイズを調整）
syncNonameMasterToSupabaseOneShot()

// または、100件ずつバッチ処理
syncNonameMasterToSupabase(0, 100)  // 1-100
syncNonameMasterToSupabase(100, 100) // 101-200
// ... 繰り返し
```

### 3. リアルタイム同期

Square webhookシートからのなめマスターに転記すると、**自動的にSupabaseにも同期されます**。

手動転記の手順：
1. Square Webhookシートで転記したい行を選択
2. メニュー「のなめツール」→「選択行を のなめマスター に転記」
3. → 自動的にSupabaseにも同期される

## データフロー

```
Square決済完了
  ↓
Square Webhook (Vercel)
  ↓
GAS (Square Webhook受信)
  ↓
Square Webhookシートに記録
  ↓
手動/自動転記
  ↓
のなめマスターシートに追記
  ↓ (自動)
Supabase ordersテーブルに同期
```

## トラブルシューティング

### Supabase同期エラー

GAS実行ログ（メニュー → 表示 → ログ）で確認：

```
[SyncToSupabase] Synced X orders to Supabase (errors: Y)
```

エラーがある場合：
1. Script Propertiesが正しく設定されているか確認
2. Supabase URLとキーが正しいか確認
3. Supabase ordersテーブルのスキーマを確認

### バックフィルの進捗確認

```javascript
// 現在の行数確認
checkNonameMasterRowCount()

// Supabaseの件数確認（Node.jsで）
node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);
const { count } = await supabase.from('orders').select('*', { count: 'exact', head: true });
console.log('Orders in Supabase:', count);
"
```

## ファイル構成

### GASプロジェクト (square-webhook)

- `コード.js`: メイン処理（Square webhook受信、のなめマスター転記）
- `supabase-sync-helper.gs`: Supabase同期ヘルパー関数
- `sync-noname-master-to-supabase.gs`: バックフィル処理

### のなめマスターシート列構成

- A: user_id
- B: 決済日時
- C: Name（配送先）
- D: Postal Code
- E: Address
- F: Email
- G: Phone
- H: Product Name
- I: Price
- J-M: 2.5mg/5mg/7.5mg/10mg
- N-O: cash/check
- **P: patient_id**
- **Q: payment_id** (Supabase orders.id として使用)
- R: product_code
- S: source
- T: shipping_status
- U: shipping_date
- V: tracking_number
- W-AH: payment_status, refund_status, etc.

## 注意事項

1. **payment_idが一意のキー**: Supabase ordersテーブルのidとして使用
2. **upsert処理**: 同じpayment_idで再実行しても重複しない
3. **配送情報の更新**: のなめマスターで配送情報を更新した場合、再度Supabaseバックフィルで同期
4. **キャッシュ無効化**: 新規決済時はSquare webhookで自動的にキャッシュ無効化済み
