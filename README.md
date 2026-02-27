# Lオペ for CLINIC

クリニック特化LINE運用プラットフォーム。LINE公式アカウントと連携し、患者の登録・問診・予約・診察・決済・配送までの一連のフローをワンストップで管理します。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | [Next.js 16](https://nextjs.org)（App Router） |
| スタイリング | [Tailwind CSS v4](https://tailwindcss.com) |
| データベース / 認証 | [Supabase](https://supabase.com)（PostgreSQL + RLS） |
| メッセージング | [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/) |
| 決済 | [Square](https://developer.squareup.com/)、GMO |
| SMS認証 | [Twilio Verify](https://www.twilio.com/ja/verify) |
| メール送信 | [Resend](https://resend.com) |
| キャッシュ / KV | [Upstash Redis](https://upstash.com) |
| AI（音声認識） | [Deepgram](https://deepgram.com)、[Anthropic Claude](https://anthropic.com) |
| エラー監視 | [Sentry](https://sentry.io) |
| ホスティング | [Vercel](https://vercel.com) |
| テスト | [Vitest](https://vitest.dev)、[Playwright](https://playwright.dev) |

## 前提条件

- **Node.js** 20 以上
- **npm** 10 以上
- Supabase プロジェクト（ローカル or クラウド）
- LINE Developers コンソールでのチャネル作成
- Square Developer アカウント（決済機能を使う場合）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/em-clinic.git
cd em-clinic
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、各値を設定してください。

```bash
cp .env.example .env.local
```

各変数の説明は `.env.example` 内のコメントを参照してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアプリケーションにアクセスできます。

## ディレクトリ構造

```
em-clinic/
├── app/                          # Next.js App Router
│   ├── admin/                    # 管理画面
│   │   ├── _components/          #   共通UIコンポーネント
│   │   ├── analytics/            #   分析ダッシュボード
│   │   ├── bank-transfer/        #   銀行振込管理
│   │   ├── dashboard/            #   管理トップ
│   │   ├── doctor/               #   簡易カルテ（管理側）
│   │   ├── ehr/                  #   電子カルテ（EHR）
│   │   ├── intake-form/          #   問診フォーム管理
│   │   ├── inventory/            #   在庫管理
│   │   ├── karte/                #   カルテ
│   │   ├── line/                 #   LINE運用（トーク・友だち・配信）
│   │   ├── patients/             #   患者管理
│   │   ├── products/             #   商品管理
│   │   ├── reorders/             #   再処方管理
│   │   ├── reservations/         #   予約管理
│   │   ├── schedule/             #   スケジュール管理
│   │   ├── segments/             #   患者セグメント
│   │   ├── settings/             #   設定
│   │   └── shipping/             #   配送管理
│   ├── api/                      # APIルート
│   │   ├── admin/                #   管理API
│   │   ├── checkout/             #   決済API
│   │   ├── cron/                 #   定期実行ジョブ
│   │   ├── intake/               #   問診API
│   │   ├── line/                 #   LINE Webhook / API
│   │   ├── mypage/               #   マイページAPI
│   │   ├── register/             #   患者登録API
│   │   ├── reorder/              #   再処方API
│   │   ├── reservations/         #   予約API
│   │   ├── square/               #   Square Webhook
│   │   └── ...
│   ├── doctor/                   # 医師画面（簡易カルテ）
│   ├── lp/                       # ランディングページ
│   ├── mypage/                   # 患者マイページ
│   ├── register/                 # 患者登録フロー
│   ├── reserve/                  # 予約画面
│   └── shipping/                 # 配送画面
├── components/                   # 共通コンポーネント
├── lib/                          # ビジネスロジック・ユーティリティ
│   ├── audit.ts                  #   監査ログ
│   ├── crypto.ts                 #   暗号化
│   ├── distributed-lock.ts       #   分散ロック（Redis）
│   ├── email.ts                  #   メール送信
│   ├── flex-message/             #   LINE Flex Message ビルダー
│   ├── idempotency.ts            #   冪等性チェック
│   ├── line-push.ts              #   LINEプッシュ送信
│   ├── patient-utils.ts          #   患者ユーティリティ
│   ├── phone.ts                  #   電話番号正規化
│   ├── rate-limit.ts             #   レートリミット
│   ├── redis.ts                  #   Redis クライアント
│   ├── session.ts                #   セッション管理
│   ├── supabase.ts               #   Supabase クライアント
│   ├── tenant.ts                 #   テナント管理
│   ├── types/                    #   型定義
│   ├── validations/              #   Zodバリデーション
│   └── ...
├── docs/                         # ドキュメント
│   ├── architecture.md           #   アーキテクチャ（ER図・データフロー）
│   ├── domain-boundaries.md      #   ドメイン境界マップ
│   ├── security-operations.md    #   セキュリティ運用
│   └── ...
├── __tests__/                    # テスト（Vitest）
├── e2e/                          # E2Eテスト（Playwright）
├── migrations/                   # DBマイグレーション
├── scripts/                      # 運用スクリプト
├── supabase/                     # Supabase設定
├── .env.example                  # 環境変数テンプレート
├── middleware.ts                 # Next.js Middleware（CSRF・認証）
├── vitest.config.ts              # Vitest設定
└── playwright.config.ts          # Playwright設定
```

## npm スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | プロダクションサーバー起動 |
| `npm run lint` | ESLint実行 |
| `npm run test` | Vitest（watchモード） |
| `npm run test:run` | Vitest（単発実行） |
| `npm run test:coverage` | Vitestカバレッジ計測 |
| `npm run test:e2e` | Playwright E2Eテスト |
| `npm run test:e2e:ui` | Playwright UIモード |

## テスト

### ユニットテスト（Vitest）

```bash
# 全テスト実行
npm run test:run

# 特定ファイルのみ
npx vitest run __tests__/api/checkout.test.ts

# カバレッジ付き
npm run test:coverage
```

- テスト数: 約5,130テスト / 195ファイル
- カバレッジ: Lines 70%+, Branches 58%+, Functions 69%+
- 設定: `vitest.config.ts`

### E2Eテスト（Playwright）

```bash
# 全テスト実行
npm run test:e2e

# UIモード（ブラウザで操作確認）
npm run test:e2e:ui

# 特定プロジェクトのみ
npx playwright test --project=patient-api
```

- 設定: `playwright.config.ts`
- プロジェクト: setup, chromium, patient-api

## デプロイ

Vercelでホスティングしています。

### 自動デプロイ

- `main` ブランチへのpushでプロダクション環境に自動デプロイ
- PRごとにプレビュー環境が作成される
- PRごとにE2E Smokeテストが自動実行（`.github/workflows/e2e-smoke.yml`）

### 手動デプロイ

```bash
# プロダクションデプロイ
npm run vercel:deploy

# 環境変数の確認
npm run vercel:env

# 環境変数の同期
npm run vercel:env:pull
```

## ドキュメント

| ファイル | 内容 |
|---------|------|
| [`docs/architecture.md`](docs/architecture.md) | ER図・コンポーネント図・データフロー |
| [`docs/domain-boundaries.md`](docs/domain-boundaries.md) | ドメイン境界・SoTテーブルマップ |
| [`docs/security-operations.md`](docs/security-operations.md) | セキュリティ運用ガイド |
| [`docs/incident-response.md`](docs/incident-response.md) | インシデント対応フロー |
| [`docs/data-protection-policy.md`](docs/data-protection-policy.md) | データ保護ポリシー |
| [`docs/sla.md`](docs/sla.md) | SLA定義 |

## ライセンス

プロプライエタリ（非公開）
