# 発送管理システム テスト手順

## 概要

発送管理システムのテスト用データをセットアップして、実際の業務フローをシミュレートします。

## テストデータ

- **クレカ決済**: 47件
- **銀行振込**: 7件（bt_45, bt_47-51）

## テストフロー

### 1. テストデータのセットアップ

```bash
# テストデータをクリーンアップ（既存のテストデータを削除）
node scripts/shipping-test-setup.mjs cleanup

# テストデータを作成
node scripts/shipping-test-setup.mjs setup

# または、クリーンアップ→作成を一度に実行
node scripts/shipping-test-setup.mjs reset
```

**実行内容:**
- `bank_transfer_orders` に7件のテストデータを作成（`status='confirmed'`）
  - まだ `orders` テーブルには入っていない（照合前の状態）
- `orders` に47件のクレカテストデータを作成（`shipping_date=NULL`）

### 2. 発送待ちリストの確認（銀行振込照合前）

1. ブラウザで `/admin/shipping/pending` にアクセス
2. **クレカ47件のみ**が表示されることを確認
3. 銀行振込はまだ表示されない（`orders` に入っていないため）

**確認項目:**
- ✅ 表示範囲: 昨日15時以降の注文
- ✅ クレカ47件が表示される
- ✅ 患者名、LステップID、住所などが表示される
- ✅ まとめ配送候補が強調表示される（同一患者の複数注文）

### 3. 銀行振込の照合（テスト）

```bash
# bank_transfer_orders → orders に転記
node scripts/bank-transfer-reconcile-test.mjs
```

**実行内容:**
- `bank_transfer_orders` の `status='confirmed'` データを取得
- `orders` テーブルに `payment_method='bank_transfer'` で登録
- payment_id は `bt_45`, `bt_47`-`bt_51` の形式

### 4. 発送待ちリストの確認（銀行振込照合後）

1. ブラウザで `/admin/shipping/pending` にアクセス（リロード）
2. **クレカ47件 + 銀行振込7件 = 54件**が表示されることを確認

**確認項目:**
- ✅ クレカ47件 + 銀行振込7件 = 54件
- ✅ 決済方法が「クレジットカード」「銀行振込」で色分け表示
- ✅ 全ての注文が選択可能

### 5. ヤマトB2 CSVのエクスポート

1. チェックボックスで注文を選択（全選択または一部選択）
2. 「📦 ヤマトB2 CSV出力」ボタンをクリック
3. CSVファイルがダウンロードされることを確認

**確認項目:**
- ✅ CSVヘッダーが正しい（55列）
- ✅ 住所が分割されている（町番地 / 建物部屋）
- ✅ 電話番号の先頭0が補完されている
- ✅ 郵便番号が7桁ゼロ埋めされている
- ✅ お客様管理番号にpayment_idが入っている
- ✅ 通知メール設定が正しい（予定通知ON、完了通知OFF）

### 6. クリーンアップ

テスト完了後、テストデータを削除する場合:

```bash
node scripts/shipping-test-setup.mjs cleanup
```

## 注意事項

- このテストは**読み取り専用**です
- DBへの書き込みは以下のみ:
  - ✅ テストデータの作成/削除（`shipping-test-setup.mjs`）
  - ✅ 銀行振込の照合（`bank-transfer-reconcile-test.mjs`）
  - ❌ 発送日の設定（未実装）
  - ❌ 追跡番号の反映（未実装）

## トラブルシューティング

### テストデータが表示されない

1. テストデータが作成されているか確認:
   ```bash
   node scripts/shipping-test-setup.mjs setup
   ```

2. 表示範囲を確認:
   - デフォルトは「昨日15時以降」
   - テストデータの `paid_at` が昨日15時以降になっているか確認

### 銀行振込が表示されない

1. 照合を実行したか確認:
   ```bash
   node scripts/bank-transfer-reconcile-test.mjs
   ```

2. `orders` テーブルに `payment_method='bank_transfer'` のデータがあるか確認

### CSVの内容がおかしい

1. `utils/yamato-b2-formatter.ts` のロジックを確認
2. テストデータの住所・電話番号が正しいか確認

## 次のステップ

CSVの内容が正しいことを確認できたら:

1. **発送日の設定機能**を実装
2. **追跡番号の反映機能**を実装
3. 実際のデータでテスト
4. GASからの完全移行を検討
