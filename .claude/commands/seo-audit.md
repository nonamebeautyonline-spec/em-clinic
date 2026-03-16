# SEO監査 — LP全体のSEO対策状況を分析

LPページ（`app/lp/`配下）のSEO対策の現状を包括的に監査し、改善点をレポートしてください。

## 分析手順

### 1. メタデータ確認
- `app/lp/layout.tsx` の Metadata 設定を読む
- title, description, keywords, canonical, OGP, Twitter Card が正しく設定されているか確認
- サブページ（terms, privacy, cancel）のメタデータも確認

### 2. 構造化データ確認
- `app/lp/layout.tsx` のJSON-LDを確認（Organization, SoftwareApplication, WebSite, BreadcrumbList）
- `app/lp/components/FAQ.tsx` のFAQPage JSON-LDを確認
- `app/lp/components/Pricing.tsx` のProduct JSON-LDを確認
- 各JSON-LDがschema.org仕様に準拠しているか検証

### 3. セマンティックHTML確認
- h1→h2→h3の見出し階層が正しいか（Heroのh1から各セクションのh2まで）
- `<main>`, `<nav>`, `<footer>`, `<section>`, `<article>` の使用状況
- ARIA属性（aria-expanded, aria-controls, role="tablist"等）の設定状況
- `<ol>`/`<li>` の使用（Flow.tsx）

### 4. テクニカルSEO確認
- `app/robots.ts` の設定内容
- `app/sitemap.ts` の設定内容
- `app/lp/page.tsx` が Server Component かどうか（"use client" がないこと）
- 画像のalt属性の設定状況

### 5. パフォーマンス要因
- 大きな画像や不要なJavaScriptの有無
- フォントの最適化状況
- next.config.ts のパフォーマンス関連設定

## 出力フォーマット

以下の形式でレポートしてください:

```
## SEO監査レポート — YYYY/MM/DD

### スコア: XX/100

### ✅ 実装済み（問題なし）
- [項目名]: [詳細]

### ⚠️ 改善推奨
- [項目名]: [現状] → [推奨対応]

### ❌ 未実装（要対応）
- [項目名]: [説明]

### キーワード分析
- ピラーKW: [キーワード一覧]
- h1に含まれるKW: [キーワード]
- descriptionに含まれるKW: [キーワード]
- 不足しているKW: [キーワード]

### 次のアクション（優先順）
1. [施策]
2. [施策]
3. [施策]
```
