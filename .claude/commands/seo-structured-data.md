# 構造化データ検証 — JSON-LDの整合性チェック

LP（`app/lp/`配下）に実装されているJSON-LD構造化データを検証し、schema.org仕様への準拠状況をチェックしてください。

## 検証手順

### 1. JSON-LDの抽出
以下のファイルからJSON-LDを抽出:
- `app/lp/layout.tsx` — Organization, SoftwareApplication, WebSite, BreadcrumbList
- `app/lp/components/FAQ.tsx` — FAQPage
- `app/lp/components/Pricing.tsx` — Product

### 2. 必須プロパティチェック
各スキーマタイプごとに、schema.orgの必須/推奨プロパティが設定されているか確認:

**Organization:**
- name ✓, url ✓, logo ✓, description ✓
- contactPoint, address, sameAs（SNSリンク）

**SoftwareApplication:**
- name ✓, applicationCategory ✓, operatingSystem ✓
- offers, featureList, description

**FAQPage:**
- mainEntity配列の各Questionに name と acceptedAnswer.text があるか

**Product:**
- name, description, brand, offers

**BreadcrumbList:**
- itemListElement の position, name, item

### 3. データ整合性チェック
- URLが実在するか（https://l-ope.jp/...）
- 価格情報がLP表示と一致するか
- ブランド名の表記ゆれがないか

## 出力フォーマット

```
## 構造化データ検証レポート

### スキーマ別チェック結果

#### Organization
- ✅ name: "Lオペ for CLINIC"
- ✅ url: "https://l-ope.jp"
- ⚠️ sameAs: 未設定（SNSアカウントがあれば追加推奨）

#### SoftwareApplication
- ✅ ...
- ❌ ...

[以下同様]

### Google Rich Results Test 予測
- FAQPage: リッチリザルト対象 ✅/❌
- Product: リッチリザルト対象 ✅/❌
- BreadcrumbList: リッチリザルト対象 ✅/❌

### 改善提案
1. [具体的な修正内容]
2. [追加すべきプロパティ]
```
