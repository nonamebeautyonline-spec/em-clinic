# 従量課金制 実装進捗

## 概要

Lオペ for CLINIC を定額制から従量課金制SaaSに移行する。
Lステップの各プラン価格の2割減で、AI系3機能をオプション課金にする。

---

## 料金体系

### メッセージプラン（Lステップ2割減・税込）

| プラン | 込み通数 | 月額(税込) | 超過単価 | Lステップ対応 |
|--------|---------|----------|---------|-------------|
| ライト | 5,000 | ¥4,000 | ¥1.0 | スタート ¥5,000 |
| スタンダード | 30,000 | ¥17,000 | ¥0.7 | スタンダード ¥21,780 |
| プロ | 50,000 | ¥26,000 | ¥0.6 | プロ ¥32,780 |
| ビジネス | 100,000 | ¥70,000 | ¥0.5 | 大量10万 ¥87,780 |
| ビジネス30万 | 300,000 | ¥105,000 | ¥0.4 | 大量30万 ¥131,780 |
| ビジネス50万 | 500,000 | ¥115,000 | ¥0.3 | 大量50万 ¥142,780 |
| ビジネス100万 | 1,000,000 | ¥158,000 | ¥0.2 | 大量100万 ¥197,780 |

- 全プランで全機能利用可（AI系オプション除く）
- 超過分は従量請求（Stripe metered billing）
- 初期費用: ¥300,000〜（導入支援込み）

### AIオプション（定額アドオン）

| オプション | 月額(税込) | Feature Flag |
|-----------|----------|-------------|
| AI返信 | ¥20,000 | `ai_reply` |
| 音声入力 | ¥15,000 | `voice_input` |
| AIカルテ | ¥20,000 | `ai_karte` |

---

## 実装済み（Phase 1〜3）

### 新規作成ファイル

| ファイル | 内容 |
|---------|------|
| `lib/plan-config.ts` | 7プラン定義、3オプション定義、ヘルパー関数 |
| `lib/usage.ts` | message_log からの使用量集計ロジック |
| `supabase/migrations/20260223_usage_billing.sql` | DB マイグレーション |
| `app/api/platform/billing/usage/route.ts` | テナント別使用量API（GET） |
| `app/api/platform/billing/options/route.ts` | AIオプション管理API（GET/POST） |
| `lib/__tests__/plan-config.test.ts` | プラン定義テスト（19件） |
| `lib/__tests__/usage.test.ts` | 使用量集計テスト（5件） |

### 改修ファイル

| ファイル | 変更内容 |
|---------|---------|
| `lib/feature-flags.ts` | voice_input, ai_karte 追加。BASE_FEATURES（全プラン共通）+ AI_OPTION_FEATURES（tenant_optionsで管理）に分離 |
| `lib/feature-flags.test.ts` | 新ロジックに合わせてテスト全面改修（21件） |
| `lib/validations/platform-billing.ts` | updatePlanSchema拡張、toggleOptionSchema, usageQuerySchema 追加 |
| `app/platform/tenants/create/page.tsx` | 7プラン選択UI + AIオプションチェックボックス + 料金シミュレーション |
| `app/platform/billing/page.tsx` | 「使用量」タブ追加（テナント別送信数・超過量・プログレスバー表示） |
| `app/lp/page.tsx` | 料金セクション全面改修（4プランカード + 大量プラン表 + Lステップ比較表 + AIオプション） |

### DBマイグレーション内容

```sql
-- tenant_plans にカラム追加
ALTER TABLE tenant_plans ADD COLUMN message_quota INT DEFAULT 5000;
ALTER TABLE tenant_plans ADD COLUMN overage_unit_price NUMERIC(10,2) DEFAULT 1.0;
ALTER TABLE tenant_plans ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE tenant_plans ADD COLUMN stripe_customer_id TEXT;

-- tenant_options テーブル新規作成（AIオプション課金管理）
-- monthly_usage テーブル新規作成（月次使用量集計）
```

### テスト結果

- 全 192 ファイル / 4,843 テスト **全パス**

---

## 未実装（Phase 4: Stripe連携）

Stripe アカウント開設・設定後に着手する。

### 必要なStripe設定

1. Products 作成（7プラン + 3オプション = 10個）
2. Prices 作成（各Productに対応する月額Price）
3. Metered Price 作成（超過分の従量課金用）
4. Webhook Endpoint 登録
5. `lib/plan-config.ts` の `stripePriceId` を実際のIDで埋める

### 実装予定ファイル

| ファイル | 内容 |
|---------|------|
| `lib/stripe.ts` | Stripe SDK ラッパー（Customer作成、Subscription管理、Usage報告） |
| `app/api/stripe/webhook/route.ts` | Stripe Webhook受信（subscription.created/updated/deleted, invoice.paid/payment_failed） |
| `app/api/stripe/checkout/route.ts` | Checkout Session 作成 |
| `app/api/stripe/portal/route.ts` | Customer Portal URL 生成 |
| `app/api/cron/monthly-usage/route.ts` | 月次使用量集計 + Stripe への超過分報告 |

### 既存ファイルの追加改修

| ファイル | 変更内容 |
|---------|---------|
| `app/api/platform/tenants/route.ts` POST | テナント作成時に Stripe Customer 自動作成 |
| テナント設定画面 | 使用量ダッシュボード + プラン変更ボタン（→ Stripe Portal） |

### 環境変数（追加予定）

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_...  # フロント用（必要に応じて）
```

---

## 決済代行サービス

**Stripe Billing** を採用。理由:
- SaaS向けサブスクリプション管理に最適
- Metered billing（従量課金）ネイティブ対応
- Customer Portal（顧客自身がプラン変更・支払い方法管理）
- Webhook で自動連携
- 日本語対応、円建て対応済み
- 手数料: 3.6%（国内カード）
