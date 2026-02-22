# Lオペ for CLINIC — アプリケーション仕様書

> 最終更新: 2026-02-22（v2 — AI返信・名寄せ・E2E・プラットフォーム追記）

---

## 目次

1. [サービス概要](#1-サービス概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [ページ一覧](#3-ページ一覧)
4. [API一覧](#4-api一覧)
5. [データベース設計](#5-データベース設計)
6. [共通ライブラリ](#6-共通ライブラリ)
7. [外部サービス連携](#7-外部サービス連携)
8. [セキュリティ](#8-セキュリティ)
9. [主要業務フロー](#9-主要業務フロー)
10. [運用注意事項](#10-運用注意事項)
11. [AI自動返信](#11-ai自動返信)
12. [患者名寄せ（重複検出・統合）](#12-患者名寄せ重複検出統合)
13. [音声カルテ自動生成](#13-音声カルテ自動生成)
14. [フォローアップ自動配信](#14-フォローアップ自動配信)
15. [Undo（操作取り消し）](#15-undo操作取り消し)
16. [プラットフォーム管理](#16-プラットフォーム管理)
17. [Cronジョブ](#17-cronジョブ)
18. [Middleware](#18-middleware)
19. [E2Eテスト](#19-e2eテスト)
20. [テスト一覧](#20-テスト一覧)
21. [デモ環境](#21-デモ環境)

---

## 1. サービス概要

### サービス名

**Lオペ for CLINIC**（クリニック特化 LINE 運用プラットフォーム）

### コンセプト

クリニック向けのオンライン診療・LINE運用を一元管理するプラットフォーム。
患者の問診・予約・決済・配送・再処方の全フローをLINE上で完結させ、管理者向けにはトーク・友だち管理・タグ・リッチメニュー・ステップ配信・分析機能を提供する。
AIによる音声カルテ自動生成・医学用語補正・自動返信機能も搭載し、診察業務の効率化を支援する。

### 技術スタック

| 要素 | 技術 |
|------|------|
| フレームワーク | Next.js 16（App Router） |
| UI | Tailwind CSS v4 |
| データベース | Supabase（PostgreSQL） |
| メッセージング | LINE Messaging API |
| 決済 | Square / GMO ペイメントゲートウェイ |
| キャッシュ / レート制限 | Upstash Redis |
| メール | Resend |
| AI / LLM | Anthropic Claude API（カルテ生成・医学用語補正・AI返信） |
| 音声認識 | Deepgram Nova-3（メイン）/ Groq Whisper-Turbo（フォールバック） |
| エラー監視 | Sentry |
| デプロイ | Vercel |

### デプロイ構成

- **本番**: Vercel（自動デプロイ: `main` ブランチ）
- **マルチテナント**: サブドメイン方式（`{slug}.lope.jp`）
- **Cron ジョブ**: Vercel Cron（ヘルスレポート、統計収集、リマインダー、ステップ配信）

---

## 2. システムアーキテクチャ

### ディレクトリ構成

```
em-clinic/
├── app/                    # Next.js App Router ページ & API
│   ├── admin/              # 管理画面
│   │   ├── line/           # LINE管理（Lオペ）機能群
│   │   ├── shipping/       # 配送管理
│   │   ├── schedule/       # スケジュール管理
│   │   └── ...
│   ├── api/                # APIルート
│   │   ├── admin/          # 管理者向けAPI
│   │   ├── cron/           # 定期実行ジョブ
│   │   ├── line/           # LINE連携API
│   │   └── ...
│   ├── doctor/             # 医師向け画面
│   ├── mypage/             # 患者マイページ
│   ├── lp/                 # ランディングページ
│   └── ...
├── components/             # 共通コンポーネント
├── lib/                    # 共通ライブラリ・ユーティリティ
│   ├── payment/            # 決済プロバイダー
│   ├── shipping/           # 配送関連
│   ├── validations/        # Zodバリデーション
│   └── ...
├── middleware.ts            # CSRF検証・Basic認証・テナント解決
├── supabase/               # マイグレーション
└── docs/                   # ドキュメント
```

### マルチテナント構成

- **方式**: サブドメイン（`{slug}.lope.jp`）
- **テナント解決**: `middleware.ts` で JWT の `tenantId` またはサブドメインから解決し、`x-tenant-id` ヘッダーに設定
- **クエリ**: `withTenant()` ヘルパーが全クエリに `.eq("tenant_id", tid)` を自動付与
- **設定**: `tenant_settings` テーブルに AES-256-GCM で暗号化保存

### 認証方式

| 対象 | 方式 | 詳細 |
|------|------|------|
| 管理者 | メール + パスワード | JWT Cookie（`admin_session`）、サーバー側セッション管理 |
| 医師 | Basic 認証 | `middleware.ts` で `/doctor` 配下をガード |
| 患者 | LINE OAuth | LINE ログイン → `line_id` で識別 |
| 外部 Webhook | 署名検証 | Square: HMAC SHA256、LINE: 署名検証 |

---

## 3. ページ一覧

### 3.1 患者向けページ

| パス | 役割 |
|------|------|
| `/mypage` | マイページ（ダッシュボード、来院履歴・再処方一覧） |
| `/mypage/init` | 初回登録：個人情報入力 |
| `/mypage/purchase` | 初回購入：商品選択 |
| `/mypage/purchase/confirm` | 購入確認 |
| `/mypage/purchase/complete` | 購入完了 |
| `/mypage/purchase/bank-transfer` | 銀行振込決済 |
| `/mypage/purchase/bank-transfer/shipping` | 銀行振込→配送情報入力 |
| `/mypage/purchase/reorder` | 再処方申請（商品選択） |
| `/intake` | 初回問診フォーム |
| `/questionnaire` | 再処方問診フォーム |
| `/reserve` | 診察予約（スロット選択） |
| `/slots` | 診察スロット表示 |
| `/register` | LINE非連携ユーザーの初回登録 |
| `/repair` | 患者情報修正（フリガナ・性別・生年月日・電話番号） |
| `/forms/[slug]` | 汎用フォーム（LINE Liff 内表示） |
| `/nps/[id]` | NPS調査回答フォーム |
| `/shipping/view` | 配送状況確認（パスワード保護） |

### 3.2 医師向けページ

| パス | 役割 |
|------|------|
| `/doctor` | カルテ画面（個別患者のカルテ・再処方判定） |
| `/doctor/reorders` | 再処方申請一覧 |

> **注意**: `/admin/doctor` にも同等の画面がある。機能追加・バグ修正時は両方に適用すること。

### 3.3 管理画面 — ダッシュボード・設定

| パス | 役割 |
|------|------|
| `/admin` | 管理画面ホーム（ダッシュボード統計） |
| `/admin/login` | 管理画面ログイン |
| `/admin/setup` | 初期セットアップ |
| `/admin/forgot-password` | パスワード忘却 |
| `/admin/reset-password` | パスワードリセット |
| `/admin/dashboard` | ダッシュボード詳細（売上・予約・配送統計） |
| `/admin/settings` | 一般設定（クリニック名、営業時間等） |
| `/admin/settings/voice` | AIカルテ設定（医療辞書管理） |
| `/admin/analytics` | 分析・レポート |

### 3.4 管理画面 — 患者管理

| パス | 役割 |
|------|------|
| `/admin/patients/[patientId]` | 患者個別ページ（詳細情報、メモ、タグ） |
| `/admin/line/friends` | LINE友だち管理（一覧・検索・一括操作） |
| `/admin/line/friends/[id]` | LINE友だち詳細 |
| `/admin/line/friends/fields` | カスタムフィールド定義 |
| `/admin/merge-patients` | 患者情報統合ツール |
| `/admin/patient-data` | 患者データ削除（GDPR対応） |
| `/admin/dedup-patients` | 患者名寄せ（重複候補検出・統合・無視管理） |

### 3.5 管理画面 — LINE管理（Lオペ）

| パス | 役割 |
|------|------|
| `/admin/line` | LINE機能ハブ |
| `/admin/line/talk` | トーク（チャット） |
| `/admin/line/messages` | メッセージログ |
| `/admin/line/send` | 手動メッセージ送信 |
| `/admin/line/broadcasts` | ブロードキャスト配信 |
| `/admin/line/tags` | タグ管理 |
| `/admin/line/marks` | マーク管理 |
| `/admin/line/rich-menus` | リッチメニュー管理 |
| `/admin/line/menu-rules` | リッチメニュー表示ルール |
| `/admin/line/templates` | メッセージテンプレート |
| `/admin/line/keyword-replies` | キーワード自動返信 |
| `/admin/line/step-scenarios` | ステップシナリオ配信 |
| `/admin/line/step-scenarios/[id]` | シナリオ詳細・編集 |
| `/admin/line/reminder-rules` | リマインダールール |
| `/admin/line/coupons` | クーポン管理 |
| `/admin/line/nps` | NPS調査管理 |
| `/admin/line/ab-test` | ABテスト |
| `/admin/line/click-analytics` | クリック分析 |
| `/admin/line/forms` | フォーム管理 |
| `/admin/line/forms/[id]` | フォーム編集 |
| `/admin/line/forms/[id]/responses` | フォーム回答一覧 |
| `/admin/line/media` | メディア管理 |
| `/admin/line/flex-builder` | Flex Messageビルダー |
| `/admin/line/actions` | カスタムアクション |
| `/admin/line/column-settings` | 友だち一覧カラム設定 |
| `/admin/line/friend-settings` | 友だち管理設定 |
| `/admin/line/followup-rules` | フォローアップルール管理 |
| `/admin/line/ai-reply-settings` | AI返信設定（モード・日次上限・知識ベース・カスタム指示） |
| `/admin/line/ai-reply-stats` | AI返信統計ダッシュボード |
| `/admin/line/analytics` | LINE配信分析（ブロードキャスト成功率・CVR等） |

### 3.6 管理画面 — 問診・カルテ

| パス | 役割 |
|------|------|
| `/admin/intake-form` | 問診フォーム設定 |
| `/admin/karte` | カルテ管理 |
| `/admin/kartesearch` | カルテ高度検索 |
| `/admin/doctor` | 医師用カルテ画面（管理者版） |

### 3.7 管理画面 — 予約管理

| パス | 役割 |
|------|------|
| `/admin/reservations` | 予約リスト |
| `/admin/schedule` | 診察スケジュール |
| `/admin/schedule/weekly` | 週間スケジュール |
| `/admin/schedule/monthly` | 月間スケジュール |
| `/admin/schedule/doctors` | 医師マスタ |
| `/admin/schedule/overrides` | スケジュール例外（臨時休診等） |

### 3.8 管理画面 — 配送管理

| パス | 役割 |
|------|------|
| `/admin/shipping` | 配送管理ハブ |
| `/admin/shipping/pending` | 発送待ち一覧 |
| `/admin/shipping/today` | 本日発送予定 |
| `/admin/shipping/create-list` | 配送リスト作成（CSV） |
| `/admin/shipping/tracking` | 追跡情報更新 |
| `/admin/shipping/update-tracking` | 追跡番号一括更新 |
| `/admin/shipping/settings` | 配送設定 |

### 3.9 管理画面 — 決済・会計

| パス | 役割 |
|------|------|
| `/admin/accounting` | 売上・会計ダッシュボード |
| `/admin/accounting/input` | 売上手動入力 |
| `/admin/accounting/statement` | 月次売上報告書 |
| `/admin/bank-transfer` | 銀行振込一覧 |
| `/admin/bank-transfer/reconcile` | 銀行振込照合ツール |
| `/admin/refunds` | 返金管理 |
| `/admin/reorders` | 再処方申請管理 |
| `/admin/noname-master` | 本社決済マスタ |
| `/admin/noname-master/square` | Square設定 |
| `/admin/noname-master/bank-transfer` | 銀行振込設定 |

### 3.10 管理画面 — 商品・在庫

| パス | 役割 |
|------|------|
| `/admin/products` | 商品マスタ管理 |
| `/admin/inventory` | 在庫管理 |

### 3.11 プラットフォーム管理画面

| パス | 役割 |
|------|------|
| `/platform` | プラットフォーム統合ダッシュボード |
| `/platform/login` | プラットフォームログイン |
| `/platform/password-reset` | パスワードリセット申請 |
| `/platform/password-reset/confirm` | リセット確認 |
| `/platform/health` | ヘルスチェック・システムステータス |
| `/platform/tenants` | テナント一覧・検索 |
| `/platform/tenants/create` | 新規テナント作成ウィザード |
| `/platform/tenants/[tenantId]` | テナント詳細・設定 |
| `/platform/tenants/[tenantId]/analytics` | テナント別分析 |
| `/platform/members` | プラットフォーム管理者一覧 |
| `/platform/audit` | 監査ログ閲覧 |
| `/platform/alerts` | システムアラート・通知 |
| `/platform/errors` | エラー監視・ログ |
| `/platform/analytics` | 全テナント横断分析 |
| `/platform/billing` | 請求・サブスクリプション管理 |
| `/platform/system` | システム設定・メンテナンス |
| `/platform/settings` | プラットフォーム全体設定 |
| `/platform/settings/sessions` | 全管理者セッション管理 |

### 3.12 公開ページ

| パス | 役割 |
|------|------|
| `/lp` | サービスLP |
| `/rules` | 利用規約・プライバシーポリシー |

---

## 4. API一覧

### 4.1 認証系

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/admin/login` | POST | 管理画面ログイン |
| `/api/admin/logout` | POST | 管理画面ログアウト |
| `/api/admin/session` | GET | セッション情報取得・検証 |
| `/api/admin/password-reset/request` | POST | パスワードリセットメール送信 |
| `/api/admin/password-reset/confirm` | GET | リセット確認 |
| `/api/line/login` | GET | LINE OAuthログイン開始 |
| `/api/line/callback` | GET | LINE OAuthコールバック |
| `/api/csrf-token` | GET/POST | CSRFトークン取得 |

### 4.2 患者登録・プロフィール

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/register/check` | GET | 登録済み判定 |
| `/api/register/personal-info` | POST | 個人情報登録 |
| `/api/register/complete` | POST | 登録完了 |
| `/api/profile` | GET | プロフィール取得 |
| `/api/verify/send` | POST | 検証コード送信 |
| `/api/verify/check` | POST | 検証コード確認 |
| `/api/repair` | POST | 患者情報修復 |

### 4.3 マイページ

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/mypage` | GET | マイページデータ取得 |
| `/api/mypage/profile` | GET/PATCH | プロフィール |
| `/api/mypage/identity` | GET | 本人確認情報 |
| `/api/mypage/settings` | GET/PATCH | 設定 |
| `/api/mypage/orders` | GET | 注文履歴 |
| `/api/mypage/update-address` | PATCH | 配送先更新 |

### 4.4 決済系

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/checkout` | POST | 決済セッション開始 |
| `/api/square/webhook` | POST | Square Webhook |
| `/api/square/backfill` | POST | Square過去データ復元 |
| `/api/square/backfill-refunds` | POST | Square返金データ復元 |
| `/api/gmo/webhook` | POST | GMO Webhook |
| `/api/bank-transfer/shipping` | POST | 銀行振込配送手続き |
| `/api/coupon/validate` | POST | クーポン検証 |
| `/api/coupon/redeem` | POST | クーポン使用 |

### 4.5 問診・カルテ

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/intake` | POST/PATCH | 問診入力・更新 |
| `/api/intake/form-definition` | GET | 問診フォーム定義取得 |
| `/api/intake/has` | GET | 問診未回答判定 |
| `/api/intake/list` | GET | 問診一覧（管理者） |
| `/api/admin/karte` | GET/POST/PATCH/DELETE | カルテCRUD |
| `/api/admin/karte-edit` | PATCH | カルテ編集 |
| `/api/admin/karte-lock` | POST | カルテロック |
| `/api/admin/kartelist` | GET | カルテ一覧 |
| `/api/admin/kartesearch` | POST | カルテ検索 |
| `/api/admin/karte-templates` | GET/POST/PATCH/DELETE | カルテテンプレート |
| `/api/doctor/karte-images` | POST | カルテ画像アップロード |
| `/api/voice/transcribe` | POST | 音声文字起こし（Deepgram/Groq + Claude補正） |
| `/api/voice/generate-karte` | POST | 音声からSOAP形式カルテ自動生成（Claude） |
| `/api/admin/voice/vocabulary` | GET/POST/PUT/DELETE | 医療辞書CRUD（テナント別） |

### 4.6 再処方

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/reorder/apply` | POST | 再処方申請（患者側） |
| `/api/reorder/cancel` | POST | 再処方キャンセル |
| `/api/admin/reorders` | GET | 再処方一覧（管理者） |
| `/api/admin/reorders/approve` | POST | 再処方承認 |
| `/api/admin/reorders/reject` | POST | 再処方却下 |
| `/api/doctor/reorders` | GET | 再処方一覧（医師） |
| `/api/doctor/reorders/approve` | POST | 再処方承認（医師） |
| `/api/doctor/reorders/reject` | POST | 再処方却下（医師） |

### 4.7 LINE管理

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/line/webhook` | POST | LINE Webhook（メッセージ受信） |
| `/api/admin/line/send` | POST | メッセージ送信 |
| `/api/admin/line/send-image` | POST | 画像メッセージ送信 |
| `/api/admin/line/broadcast` | POST | ブロードキャスト配信 |
| `/api/admin/line/broadcast/preview` | POST | 配信プレビュー |
| `/api/admin/line/broadcast/ab-test` | POST | ABテスト配信 |
| `/api/admin/line/rich-menus` | GET/POST | リッチメニュー管理 |
| `/api/admin/line/rich-menus/[id]` | GET/PATCH/DELETE | リッチメニュー詳細 |
| `/api/admin/line/richmenu-image` | POST | リッチメニュー画像アップロード |
| `/api/admin/line/user-richmenu` | POST | リッチメニュー割り当て |
| `/api/admin/line/tags` | GET/POST | タグ管理 |
| `/api/admin/line/tags/[id]` | PATCH/DELETE | タグ詳細 |
| `/api/admin/line/marks` | GET/POST | マーク管理 |
| `/api/admin/line/marks/[id]` | PATCH/DELETE | マーク詳細 |
| `/api/admin/line/templates` | GET/POST | テンプレート管理 |
| `/api/admin/line/templates/[id]` | PATCH/DELETE | テンプレート詳細 |
| `/api/admin/line/keyword-replies` | GET/POST | キーワード自動返信 |
| `/api/admin/line/keyword-replies/test` | POST | 返信テスト |
| `/api/admin/line/step-scenarios` | GET/POST | ステップシナリオ |
| `/api/admin/line/step-scenarios/[id]` | GET/PATCH/DELETE | シナリオ詳細 |
| `/api/admin/line/step-scenarios/[id]/enrollments` | GET/POST/DELETE | エンロール管理 |
| `/api/admin/line/nps` | GET/POST | NPS管理 |
| `/api/admin/line/nps/[id]` | GET/PATCH/DELETE | NPS詳細 |
| `/api/admin/line/nps/[id]/distribute` | POST | NPS配信 |
| `/api/admin/line/coupons` | GET/POST | クーポン管理 |
| `/api/admin/line/coupons/[id]/distribute` | POST | クーポン配信 |
| `/api/admin/line/click-track` | POST | クリックトラッキング |
| `/api/admin/line/click-track/stats` | GET | クリック統計 |
| `/api/admin/line/flex-presets` | GET | Flexプリセット |
| `/api/admin/line/menu-rules` | GET/POST | メニュー表示ルール |
| `/api/admin/line/reminder-rules` | GET/POST | リマインダールール |
| `/api/admin/line/reminder-rules/logs` | GET | リマインダーログ |
| `/api/admin/line/forms` | GET/POST | フォーム管理 |
| `/api/admin/line/forms/[id]` | GET/PATCH/DELETE | フォーム詳細 |
| `/api/admin/line/forms/[id]/publish` | POST | フォーム公開 |
| `/api/admin/line/forms/[id]/responses` | GET | フォーム回答 |
| `/api/admin/line/friends-list` | GET | 友だち一覧 |
| `/api/admin/line/followers` | GET | フォロワー一覧 |
| `/api/admin/line/refresh-profile` | POST | プロフィール更新 |
| `/api/admin/line/check-block` | POST | ブロック判定 |
| `/api/admin/line/dashboard` | GET | LINEダッシュボード統計 |
| `/api/admin/line/media` | GET/POST | メディア管理 |
| `/api/admin/line/actions` | GET/POST | アクション管理 |
| `/api/admin/line/actions/execute` | POST | アクション実行 |
| `/api/admin/line/schedule` | GET/POST | スケジュール配信 |
| `/api/admin/line/schedule/[id]` | PATCH/DELETE | スケジュール詳細 |
| `/api/admin/line/segments` | GET | セグメント取得 |
| `/api/admin/line/column-settings` | GET/PATCH | カラム設定 |
| `/api/admin/line/friend-settings` | GET/PATCH | 友だち設定 |
| `/api/admin/line/action-folders` | GET/POST | アクションフォルダ |
| `/api/admin/line/form-folders` | GET/POST | フォームフォルダ |
| `/api/admin/line/media-folders` | GET/POST | メディアフォルダ |
| `/api/admin/line/template-categories` | GET | テンプレートカテゴリ |
| `/api/admin/line/upload-template-image` | POST | テンプレート画像アップロード |
| `/api/admin/line/ai-reply-settings` | GET/PATCH | AI自動返信設定 |
| `/api/admin/line/ai-reply-stats` | GET | AI返信統計 |
| `/api/ai-reply/[draftId]/regenerate` | POST | AI返信の再生成 |
| `/api/ai-reply/[draftId]` | GET | ドラフト詳細取得 |
| `/api/ai-reply/[draftId]/reject` | POST | ドラフト却下 |
| `/api/ai-reply/[draftId]/send` | POST | ドラフト手動送信 |
| `/api/admin/line/followup-rules` | GET/POST | フォローアップルール管理 |
| `/api/admin/line/followup-rules/[id]` | PATCH/DELETE | フォローアップルール詳細 |
| `/api/admin/line/analytics` | GET | LINE配信分析 |

### 4.8 予約・スケジュール

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/reservations` | GET/POST | 予約管理 |
| `/api/admin/reservations` | GET | 予約一覧 |
| `/api/admin/reservations/today` | GET | 本日の予約 |
| `/api/admin/reservations/reminder-preview` | POST | リマインダープレビュー |
| `/api/admin/reservations/send-reminder` | POST | リマインダー送信 |
| `/api/admin/schedule` | GET/POST | スケジュール管理 |
| `/api/admin/date_override` | POST | 休診日設定 |
| `/api/admin/weekly_rules` | GET/POST/PATCH/DELETE | 週間ルール |
| `/api/admin/doctors` | GET/POST | 医師マスタ |
| `/api/admin/booking-open` | GET/PATCH | 予約受付状態 |

### 4.9 患者管理（管理者）

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/admin/patientbundle` | GET | 患者情報統合取得（問診+カルテ） |
| `/api/admin/patientnote` | GET/POST/PATCH | 患者メモ |
| `/api/admin/patient-lookup` | GET | 患者検索 |
| `/api/admin/patient-name-change` | PATCH | 患者名変更 |
| `/api/admin/patients/[id]/fields` | GET/PATCH | カスタムフィールド |
| `/api/admin/patients/[id]/tags` | GET/PATCH | タグ管理 |
| `/api/admin/patients/[id]/mark` | PATCH | マーク管理 |
| `/api/admin/patients/bulk/action` | POST | 一括操作 |
| `/api/admin/patients/bulk/fields` | PATCH | 一括フィールド更新 |
| `/api/admin/patients/bulk/tags` | PATCH | 一括タグ更新 |
| `/api/admin/patients/bulk/mark` | PATCH | 一括マーク更新 |
| `/api/admin/patients/bulk/menu` | PATCH | 一括メニュー割り当て |
| `/api/admin/patients/bulk/send` | POST | 一括メッセージ送信 |
| `/api/admin/merge-patients` | POST | 患者統合 |
| `/api/admin/delete-patient-data` | DELETE | 患者データ削除 |
| `/api/admin/dedup-patients` | GET/POST | 名寄せ候補検出・無視管理 |
| `/api/admin/dedup-patients/merge` | POST | 名寄せ統合実行 |
| `/api/admin/friend-fields` | GET/POST | フィールド定義 |
| `/api/admin/friend-fields/[id]` | PATCH/DELETE | フィールド詳細 |

### 4.10 配送管理

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/admin/shipping/pending` | GET | 発送待ち一覧 |
| `/api/admin/shipping/today-shipped` | GET | 本日発送済み |
| `/api/admin/shipping/history` | GET | 配送履歴 |
| `/api/admin/shipping/update-tracking` | POST | 追跡番号更新 |
| `/api/admin/shipping/update-tracking/preview` | POST | 更新プレビュー |
| `/api/admin/shipping/update-tracking/confirm` | POST | 更新実行 |
| `/api/admin/shipping/notify-shipped` | POST | 発送通知LINE送信 |
| `/api/admin/shipping/share` | POST | 配送シェアリンク生成 |
| `/api/admin/shipping/config` | GET/PATCH | 配送設定 |
| `/api/admin/shipping/export-yamato-b2` | POST | ヤマトB2 CSV生成 |
| `/api/admin/shipping/export-yamato-b2-custom` | POST | ヤマトカスタムCSV |
| `/api/admin/shipping/export-lstep-tags` | POST | LステップタグCSV |

### 4.11 会計・分析

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/admin/dashboard-stats` | GET | ダッシュボード統計 |
| `/api/admin/dashboard-stats-enhanced` | GET | 拡張統計 |
| `/api/admin/daily-revenue` | GET | 日別売上 |
| `/api/admin/financials` | GET | 財務統計 |
| `/api/admin/analytics` | GET | 分析データ |
| `/api/admin/analytics/export` | POST | 分析エクスポート |
| `/api/admin/cost-calculation` | POST | 原価計算 |
| `/api/admin/bank-transfer-orders` | GET | 銀行振込注文 |

### 4.12 設定・管理

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/admin/account` | GET/PATCH | 管理者アカウント |
| `/api/admin/settings` | GET/PATCH | 一般設定 |
| `/api/admin/mypage-settings` | GET/PATCH | マイページ設定 |
| `/api/admin/flex-settings` | GET/PATCH | Flex Message設定 |
| `/api/admin/intake-form` | GET/POST | 問診フォーム設定 |
| `/api/admin/intake-form/reset` | POST | 問診リセット |
| `/api/admin/products` | GET/POST/PATCH | 商品管理 |
| `/api/admin/inventory` | GET/PATCH | 在庫管理 |
| `/api/admin/users` | GET/POST | 管理者ユーザー |
| `/api/admin/pins` | GET/POST/PATCH/DELETE | PIN管理 |
| `/api/admin/tags` | GET/POST | タグマスタ |
| `/api/admin/invalidate-cache` | POST | キャッシュ無効化 |
| `/api/admin/refunds` | GET/POST/DELETE | 返金管理 |

### 4.13 銀行振込管理

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/admin/bank-transfer/pending` | GET | 入金待ち一覧 |
| `/api/admin/bank-transfer/manual-confirm` | POST | 手動確認 |
| `/api/admin/bank-transfer/reconcile` | GET/POST | 照合 |
| `/api/admin/bank-transfer/reconcile/preview` | POST | 照合プレビュー |
| `/api/admin/bank-transfer/reconcile/confirm` | POST | 照合実行 |

### 4.14 フォーム（汎用・患者向け）

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/forms/[slug]` | GET | フォーム定義取得 |
| `/api/forms/[slug]/submit` | POST | フォーム回答送信 |
| `/api/forms/[slug]/upload` | POST | ファイルアップロード |
| `/api/nps/[id]` | GET/POST | NPS回答 |

### 4.15 Cronジョブ

| エンドポイント | メソッド | 頻度 | 役割 |
|---------------|---------|------|------|
| `/api/cron/ai-reply` | POST | **毎分** | AI返信デバウンス処理・Claude呼び出し |
| `/api/cron/health-report` | POST | 日次 | ヘルスレポート |
| `/api/cron/collect-line-stats` | POST | 日次 | LINE統計収集 |
| `/api/cron/generate-reminders` | POST | 日次 | リマインダー生成 |
| `/api/cron/send-scheduled` | POST | 日次 | スケジュール配信実行 |
| `/api/cron/process-steps` | POST | 日次 | ステップシナリオ処理 |
| `/api/cron/followup` | POST | 日次 | フォローアップメッセージ送信 |

### 4.16 プラットフォーム管理

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/platform/login` | POST | プラットフォームログイン |
| `/api/platform/health` | GET | ヘルスチェック |
| `/api/platform/sessions` | GET/POST | セッション一覧・削除 |
| `/api/platform/sessions/[sessionId]` | DELETE | セッション削除 |
| `/api/platform/members` | GET/POST | 管理者一覧・追加 |
| `/api/platform/password-reset/request` | POST | リセット申請 |
| `/api/platform/password-reset/reset` | POST | リセット実行 |
| `/api/platform/totp/setup` | POST | TOTP設定開始 |
| `/api/platform/totp/verify` | POST | TOTP検証 |
| `/api/platform/totp/login` | POST | TOTPログイン |
| `/api/platform/totp/disable` | POST | TOTP無効化 |
| `/api/platform/tenants` | GET/POST | テナント一覧・作成 |
| `/api/platform/tenants/[tenantId]` | GET/PATCH/DELETE | テナント詳細・更新・削除 |
| `/api/platform/tenants/[tenantId]/members` | GET/POST | テナント管理者一覧・追加 |
| `/api/platform/tenants/[tenantId]/members/[memberId]` | PATCH/DELETE | 管理者更新・削除 |
| `/api/platform/tenants/[tenantId]/stats` | GET | テナント統計 |
| `/api/platform/tenants/[tenantId]/status` | GET | テナント稼働状況 |
| `/api/platform/tenants/[tenantId]/analytics` | GET | テナント分析 |
| `/api/platform/tenants/[tenantId]/features` | GET | テナント機能フラグ |
| `/api/platform/audit` | GET | 監査ログ |
| `/api/platform/alerts` | GET/POST | アラート一覧・作成 |
| `/api/platform/alerts/[alertId]/ack` | POST | アラート確認 |
| `/api/platform/errors` | GET | エラーログ |
| `/api/platform/analytics/financial` | GET | 財務分析 |
| `/api/platform/analytics/churn` | GET | チャーン分析 |
| `/api/platform/analytics/retention` | GET | リテンション分析 |
| `/api/platform/analytics/feature-usage` | GET | 機能利用分析 |
| `/api/platform/billing/plans` | GET/POST | プラン一覧・作成 |
| `/api/platform/billing/plans/[tenantId]` | GET | テナントプラン取得 |
| `/api/platform/billing/invoices` | GET | 請求書一覧 |
| `/api/platform/billing/invoices/[invoiceId]` | GET | 請求書詳細 |
| `/api/platform/billing/invoices/[invoiceId]/pdf` | GET | PDFダウンロード |
| `/api/platform/system/settings` | GET/PATCH | システム設定 |
| `/api/platform/system/maintenance` | POST | メンテナンスモード |
| `/api/platform/impersonate` | POST | テナント切り替え（なりすまし） |
| `/api/platform/impersonate/exit` | POST | なりすまし終了 |
| `/api/platform/dashboard-stats` | GET | ダッシュボード統計 |

### 4.17 Undo・その他

| エンドポイント | メソッド | 役割 |
|---------------|---------|------|
| `/api/health` | GET | ヘルスチェック |
| `/api/admin/undo` | GET/POST | Undo履歴取得・取り消し実行 |

---

## 5. データベース設計

### 5.1 コア患者・診療テーブル

| テーブル | 用途 | 主要カラム |
|---------|------|----------|
| `patients` | 患者マスター（旧 answerers） | `patient_id`, `line_id`, `name`, `tel`, `line_display_name` |
| `intake` | 初回問診データ | `patient_id`, `reserve_id`, `status`(OK/NG/null), `answerer_id`, `line_id` |
| `reservations` | 診察予約 | `patient_id`, `reserve_id`, `status`(pending/canceled) |
| `orders` | 商品注文（クレジット・GMO） | `patient_id`, `status`, `payment_id`, `paid_at`, `shipping_date`, `tracking_number` |
| `bank_transfer_orders` | 銀行振込注文 | `patient_id`, `status`(pending_confirmation/confirmed/shipped) |
| `reorders` | 再処方申請・承認 | `patient_id`, `reserve_id`, `status`, `karte_note`, `approved_at` |
| `products` | 商品マスター | `code`, `title`, `drug_name`, `dosage`, `price`, `is_active` |

### 5.2 LINE統合テーブル

| テーブル | 用途 |
|---------|------|
| `tag_definitions` | タグ定義（カラー・自動ルール） |
| `patient_tags` | 患者×タグ紐付け |
| `patient_marks` | 患者の対応状態マーク |
| `friend_field_definitions` | カスタムフィールド定義 |
| `friend_field_values` | 患者×フィールド値 |
| `friend_add_settings` | LINE友だち追加設定 |
| `message_log` | メッセージ送受信履歴 |
| `message_templates` | メッセージテンプレート |
| `broadcasts` | 一斉配信履歴 |
| `scheduled_messages` | 予約送信キュー |
| `mark_definitions` | マーク定義マスター |
| `rich_menus` | リッチメニュー |

### 5.3 ステップ配信テーブル

| テーブル | 用途 |
|---------|------|
| `step_scenarios` | シナリオ定義（トリガー: follow/tag_add/keyword/manual） |
| `step_items` | 各ステップのアクション |
| `step_enrollments` | 対象者進捗（status: active/completed/exited/paused） |
| `keyword_auto_replies` | キーワード自動応答ルール |

### 5.4 スケジュール管理テーブル

| テーブル | 用途 |
|---------|------|
| `doctors` | 医師マスター |
| `doctor_weekly_rules` | 週間勤務ルール |
| `doctor_date_overrides` | 特定日変更 |
| `booking_open_settings` | 診察枠管理 |

### 5.5 リマインダー・クーポン

| テーブル | 用途 |
|---------|------|
| `reminder_rules` | リマインド送信ルール |
| `reminder_sent_log` | 送信ログ（二重防止） |
| `coupons` | クーポン定義 |
| `coupon_issues` | クーポン配布・利用記録 |

### 5.6 フォーム・アクション

| テーブル | 用途 |
|---------|------|
| `intake_form_definitions` | 問診フォーム定義（テナント別） |
| `forms` | 汎用フォーム |
| `form_folders` | フォームフォルダ |
| `form_responses` | フォーム回答 |
| `form_file_uploads` | フォーム添付ファイル |
| `actions` | アクション定義 |
| `action_folders` | アクションフォルダ |
| `flex_presets` | Flexメッセージプリセット |

### 5.7 メディア・テンプレート

| テーブル | 用途 |
|---------|------|
| `media_files` | メディアファイル（image/pdf） |
| `media_folders` | メディアフォルダ |
| `media` | 汎用メディア |
| `karte_templates` | カルテテンプレート |
| `karte_images` | カルテ画像 |
| `template_categories` | テンプレートカテゴリ |

### 5.8 調査・統計

| テーブル | 用途 |
|---------|------|
| `nps_surveys` | NPS調査定義 |
| `nps_responses` | NPS回答 |
| `line_daily_stats` | LINE友だち数日次統計 |
| `click_tracking_links` | クリック追跡リンク |
| `click_tracking_events` | クリック追跡イベント |

### 5.9 管理・テナント

| テーブル | 用途 |
|---------|------|
| `admin_users` | 管理者ユーザー |
| `admin_sessions` | セッション管理 |
| `audit_logs` | 監査ログ |
| `password_reset_tokens` | パスワードリセットトークン |
| `verify_codes` | 認証コード |
| `chat_reads` | チャット既読管理 |
| `tenants` | テナント定義 |
| `tenant_members` | テナントメンバー |
| `tenant_settings` | テナント別設定（暗号化） |

### 5.10 AI・音声

| テーブル | 用途 | 主要カラム |
|---------|------|----------|
| `medical_vocabulary` | 医療辞書（音声認識精度向上・テナント別） | `term`, `reading`, `category`(drug/symptom/procedure/anatomy/lab/general), `specialty`(common/beauty/internal等), `boost_weight`(1.0-3.0), `is_default` |

### 5.11 その他

| テーブル | 用途 |
|---------|------|
| `shipping_shares` | 配送情報共有 |
| `inventory_logs` | 在庫ログ |
| `monthly_financials` | 月次財務データ |

### 5.12 ER関係図

```
patients（患者マスター）
  ├── 1:N → intake（問診）
  ├── 1:N → reservations（予約）
  ├── 1:N → orders（注文）
  ├── 1:N → bank_transfer_orders（銀行振込）
  ├── 1:N → reorders（再処方）
  ├── 1:N → patient_tags → tag_definitions
  ├── 1:N → patient_marks → mark_definitions
  └── 1:N → friend_field_values → friend_field_definitions

step_scenarios（シナリオ）
  ├── 1:N → step_items（ステップ）
  └── 1:N → step_enrollments（進捗）

forms（フォーム）
  ├── 1:N → form_responses（回答）
  └── 1:N → form_file_uploads（添付）

coupons → 1:N → coupon_issues
reminder_rules → 1:N → reminder_sent_log
nps_surveys → 1:N → nps_responses
admin_users → 1:N → admin_sessions
admin_users → 1:N → tenant_members → tenants
doctors → 1:N → doctor_weekly_rules
doctors → 1:N → doctor_date_overrides
```

### 5.13 重要な設計制約

- **`intake.patient_id` にユニーク制約なし** — 同一患者に複数レコードを持つ設計。`upsert({ onConflict: "patient_id" })` は使用禁止（サイレント失敗）
- **全テーブルに `tenant_id`** — マルチテナント対応（2026-02-25追加）、NULL はシングルテナント互換
- **RLS**: 全テーブルで `service_role_only` — APIは `supabaseAdmin` でアクセス

---

## 6. 共通ライブラリ

### 6.1 認証・セッション

| ファイル | 役割 | 主要 export |
|---------|------|------------|
| `lib/admin-auth.ts` | 管理者認証 | `verifyAdminAuth()`, `getAdminUserId()`, `getAdminTenantId()` |
| `lib/session.ts` | セッション管理 | `createSession()`, `validateSession()`, `revokeSession()` |
| `lib/rate-limit.ts` | レート制限 | `checkRateLimit()`, `resetRateLimit()`, `getClientIp()` |
| `lib/fetch-with-csrf.ts` | CSRF付きfetch | `fetchWithCsrf()`, `getCsrfToken()` |

### 6.2 データベース・テナント

| ファイル | 役割 | 主要 export |
|---------|------|------------|
| `lib/supabase.ts` | Supabaseクライアント | `supabase`, `supabaseAdmin` |
| `lib/tenant.ts` | テナント解決 | `resolveTenantId()`, `withTenant()`, `tenantPayload()` |
| `lib/settings.ts` | テナント設定 | `getSetting()`, `getSettingOrEnv()`, `setSetting()` |
| `lib/crypto.ts` | 暗号化 | `encrypt()`, `decrypt()`, `maskValue()` |
| `lib/redis.ts` | Redisクライアント | `redis`, `invalidateDashboardCache()` |

### 6.3 決済

| ファイル | 役割 | 主要 export |
|---------|------|------------|
| `lib/payment/index.ts` | プロバイダーファクトリ | `getPaymentProvider()` |
| `lib/payment/square.ts` | Square実装 | `SquarePaymentProvider` |
| `lib/payment/gmo.ts` | GMO実装 | `GmoPaymentProvider` |
| `lib/payment/types.ts` | 共通型 | `PaymentProvider`, `CheckoutParams`, `WebhookEvent` |

### 6.4 LINE連携

| ファイル | 役割 | 主要 export |
|---------|------|------------|
| `lib/line-push.ts` | Push/Multicast送信 | `pushMessage()`, `multicastMessage()` |
| `lib/line-richmenu.ts` | リッチメニュー管理 | `createLineRichMenu()`, `linkRichMenuToUser()`, `bulkLinkRichMenu()` |
| `lib/menu-auto-rules.ts` | メニュー自動切替 | `evaluateMenuRules()`, `evaluateMenuRulesForMany()` |
| `lib/step-enrollment.ts` | ステップ配信制御 | `checkFollowTriggerScenarios()`, `enrollPatient()` |
| `lib/behavior-filters.ts` | 行動データフィルタ | `getVisitCounts()`, `getPurchaseAmounts()`, `matchBehaviorCondition()` |

### 6.5 配送

| ファイル | 役割 | 主要 export |
|---------|------|------------|
| `lib/shipping/japanpost.ts` | ゆうパックCSV | `generateJapanPostCsv()` |
| `lib/shipping-flex.ts` | 配送通知Flex | Flexメッセージ生成 |

### 6.6 患者・商品

| ファイル | 役割 | 主要 export |
|---------|------|------------|
| `lib/phone.ts` | 電話番号正規化 | `normalizeJPPhone()` |
| `lib/products.ts` | 商品マスタ | `getProducts()`, `getProductByCode()` |
| `lib/patient-utils.ts` | 患者フォーマッタ | `formatProductCode()`, `formatDateJST()`, `calcAge()` |
| `lib/reorder-karte.ts` | 再処方カルテ | `buildKarteNote()`, `createReorderPaymentKarte()` |

### 6.7 AI・音声

| ファイル | 役割 | 主要 export |
|---------|------|------------|
| `lib/voice/medical-refine.ts` | Claude APIによる医学用語自動補正 | `refineMedicalText()` |
| `lib/voice/default-vocabulary.ts` | 診療科別デフォルト辞書データ | `COMMON`, `BEAUTY`, `INTERNAL`, `SURGERY` 等 |
| `lib/voice/use-voice-recorder.ts` | 音声録音 React フック | `useVoiceRecorder()` |
| `components/voice-karte-button.tsx` | AIカルテ生成ボタン（医師画面用） | `VoiceKarteButton` |

### 6.8 バリデーション

| ファイル | 役割 |
|---------|------|
| `lib/validations/helpers.ts` | `parseBody()` — Zodスキーマ検証 |
| `lib/validations/admin-login.ts` | ログインスキーマ |
| `lib/validations/checkout.ts` | 決済スキーマ |
| `lib/validations/reorder.ts` | 再処方スキーマ |
| `lib/validations/intake-form.ts` | 問診スキーマ |

### 6.8 その他

| ファイル | 役割 |
|---------|------|
| `lib/audit.ts` | 監査ログ記録（fire-and-forget） |
| `lib/logger.ts` | 構造化ログ（Sentry統合） |
| `lib/email.ts` | メール送信（Resend） |
| `lib/auto-reminder.ts` | リマインダー共通関数 |
| `lib/reservation-flex.ts` | 予約確認Flex |

---

## 7. 外部サービス連携

### 7.1 LINE Messaging API

| 機能 | 実装箇所 | エンドポイント |
|------|---------|--------------|
| Push/Multicast送信 | `lib/line-push.ts` | `api.line.me/v2/bot/message/{push,multicast}` |
| Webhook受信 | `app/api/line/webhook/route.ts` | — |
| リッチメニュー管理 | `lib/line-richmenu.ts` | `api.line.me/v2/bot/richmenu` |
| OAuth認証 | `app/api/line/login`, `callback` | LINE Login |

### 7.2 Square

| 機能 | 実装箇所 | エンドポイント |
|------|---------|--------------|
| チェックアウトリンク | `lib/payment/square.ts` | `connect.squareup.com/v2/online-checkout/payment-links` |
| Webhook検証 | `lib/payment/square.ts` | HMAC SHA256 署名検証 |
| 返金 | `lib/payment/square.ts` | `connect.squareup.com/v2/refunds` |

### 7.3 GMO ペイメントゲートウェイ

| 機能 | 実装箇所 | エンドポイント |
|------|---------|--------------|
| リンク型決済 | `lib/payment/gmo.ts` | `p01.mul-pay.jp/link/tran/credit` |
| 取引管理 | `lib/payment/gmo.ts` | `p01.mul-pay.jp/payment/` |
| 返金 | `lib/payment/gmo.ts` | `AlterTran.idPass` |

### 7.4 Supabase

- **Anon Key**: クライアント側（RLS有効）
- **Service Role Key**: サーバー側（RLS バイパス） — API処理は必ず `supabaseAdmin` を使用

### 7.5 Upstash Redis

| 用途 | 実装箇所 |
|------|---------|
| レート制限 | `lib/rate-limit.ts` |
| ダッシュボードキャッシュ | `lib/redis.ts` |

### 7.6 Resend

| 用途 | 実装箇所 |
|------|---------|
| パスワードリセットメール | `lib/email.ts` |
| ウェルカムメール | `lib/email.ts` |

### 7.7 Deepgram（音声認識）

| 用途 | 実装箇所 |
|------|---------|
| 音声文字起こし（メインエンジン） | `app/api/voice/transcribe/route.ts` |

- **モデル**: Nova-3
- **機能**: Keyterm Prompting（医療辞書から動的キーワード生成）、confidence スコア判定
- **依存**: `@deepgram/sdk`

### 7.8 Groq（音声認識フォールバック）

| 用途 | 実装箇所 |
|------|---------|
| 音声文字起こし（フォールバック） | `app/api/voice/transcribe/route.ts` |

- **モデル**: Whisper-Turbo
- **トリガー**: Deepgram の confidence が閾値未満の場合に自動切替
- **依存**: `groq-sdk`

### 7.9 Anthropic Claude API

| 用途 | 実装箇所 | モデル |
|------|---------|--------|
| カルテ自動生成（SOAP形式） | `app/api/voice/generate-karte/route.ts` | claude-sonnet-4-5 |
| 医学用語自動補正 | `lib/voice/medical-refine.ts` | claude-haiku-4-5 |
| AI自動返信 | LINE AI返信機能 | — |

- **依存**: `@anthropic-ai/sdk`

### 7.10 Sentry

- エラートラッキング: `lib/logger.ts` で自動送信
- Next.js自動計測: `next.config.ts` で設定

---

## 8. セキュリティ

### 8.1 CSRF保護

- **方式**: Double Submit Cookie
- **実装**: `middleware.ts`
- **対象**: POST/PUT/PATCH/DELETE の `/api/` リクエスト
- **除外**: Webhook、患者向けAPI（フォーム送信・決済・マイページ等）

### 8.2 レート制限

- **実装**: `lib/rate-limit.ts`（Upstash Redis）
- **ログイン**: メール単位 5回/5分、IP単位 15回/10分

### 8.3 CSP（Content Security Policy）

- **実装**: `next.config.ts` headers
- **主要設定**: `default-src 'self'`、Square/Supabase/LINE/Sentry を許可

### 8.4 監査ログ

- **実装**: `lib/audit.ts`
- **記録先**: `audit_logs` テーブル
- **方式**: Fire-and-forget（ビジネス処理をブロックしない）
- **記録内容**: 操作種別、対象リソース、IP、User-Agent、詳細JSON

### 8.5 セッション管理

- **実装**: `lib/session.ts` + `admin_sessions` テーブル
- **有効期限**: 24時間
- **同時セッション上限**: 3（最古を自動削除）
- **last_activity**: 5分おきに更新

### 8.6 その他

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## 9. 主要業務フロー

### 9.1 患者登録→購入フロー

```
1. LINE ログイン（/api/line/login → callback）
   ↓
2. 初回登録判定（/api/register/check）
   ↓
3. 個人情報入力（/mypage/init → /api/register/personal-info）
   ↓
4. 商品選択（/mypage/purchase）
   ↓
5. 購入確認（/mypage/purchase/confirm）
   ↓
6. 決済方式選択
   ├── クレジット → /api/checkout → Square/GMO
   └── 銀行振込 → /mypage/purchase/bank-transfer
   ↓
7. Webhook で決済完了通知
   ↓
8. 購入完了（/mypage/purchase/complete）
   ↓
9. 配送処理開始
```

### 9.2 問診→診察→処方フロー

```
1. 初回問診入力（/intake → /api/intake POST）
   ↓
2. 診察予約（/reserve → /api/reservations POST）
   ↓
3. リマインダー送信（cron/generate-reminders）
   ↓
4. 来院・診察
   ↓
5. 医師がカルテ記入（/doctor → /api/admin/karte POST）
   ↓
6. 問診ステータス更新（OK/NG）
   ↓
7. OK → 商品購入フローへ
   NG → 診察終了
```

### 9.3 再処方申請→承認フロー

```
1. 患者が再処方問診回答（/questionnaire）
   ↓
2. 再処方申請（/api/reorder/apply）
   ↓
3. 管理者に通知
   ↓
4. 医師が再処方一覧を確認（/doctor/reorders）
   ↓
5. 承認 or 却下
   ├── 承認 → /api/doctor/reorders/approve
   │   └── reorders.karte_note に自動カルテ生成
   └── 却下 → /api/doctor/reorders/reject
   ↓
6. 承認時 → 決済リンク送信 → 購入フローへ
```

### 9.4 配送フロー

```
1. 決済完了（orders or bank_transfer_orders に記録）
   ↓
2. 発送待ち一覧に表示（/admin/shipping/pending）
   ↓
3. 配送リスト作成（CSV生成: ヤマトB2/ゆうパック形式）
   ↓
4. 追跡番号登録（/admin/shipping/update-tracking）
   ↓
5. 発送通知（LINE Flexメッセージ）
   ↓
6. 配送状況確認（/shipping/view）
```

### 9.5 ステップ配信フロー

```
1. トリガー発火
   ├── follow（友だち追加時）
   ├── tag_add（タグ追加時）
   ├── keyword（キーワード受信時）
   └── manual（手動エンロール）
   ↓
2. 患者をシナリオにエンロール（lib/step-enrollment.ts）
   ↓
3. Cron でステップ処理（/api/cron/process-steps）
   ├── 遅延判定（next_at を比較）
   ├── メッセージ送信 / アクション実行
   └── 次ステップへ進行 or 完了
```

### 9.6 AIカルテ生成フロー

```
1. 医師が診察中にカルテ画面の音声入力ボタンを押下
   ↓
2. ブラウザ MediaRecorder で会話を録音（最大5分）
   ↓
3. 録音完了 → /api/voice/transcribe へ音声送信
   ├── Deepgram Nova-3 で文字起こし
   ├── confidence 不足時 → Groq Whisper-Turbo にフォールバック
   └── ?refine=true → Claude Haiku で医学用語補正
   ↓
4. 文字起こし結果 → /api/voice/generate-karte へ送信
   ├── Claude Sonnet でSOAP形式に構造化
   └── { S（主訴）, O（所見）, A（評価）, P（計画）, summary, medications }
   ↓
5. 生成結果をカルテ入力欄に自動挿入
   ↓
6. 医師が確認・編集後、カルテ保存
```

---

## 10. 運用注意事項

### 10.1 電話番号正規化ルール

- **保存時は必ず `normalizeJPPhone()`（`lib/phone.ts`）を通す**
- 正規化パターン:
  - `0080/0090/0070` → `080/090/070`（余分な0除去）
  - `00XX...` → `0XX...`（先頭0を1つだけ除去）
  - `81XXXXXXXXX`（11桁以上）→ 国際プレフィックス除去 → `0XX...`
  - `70/80/90` 始まり → `070/080/090`（先頭0追加）
- **適用箇所**: intake保存、Square webhook、bank-transfer、patientbundle表示

### 10.2 intake テーブルの制約

- `patient_id` にユニーク制約なし（同一患者に複数レコードを持つ設計）
- `upsert({ onConflict: "patient_id" })` は**使用禁止**（サイレント失敗）
- `select → insert/update` パターンを使用
- intake UPDATE は `id` 指定（`patient_id` 指定だと複数レコードを全上書き）
- **必ず `supabaseAdmin` を使う**（anon key だと RLS でデータ消失）
- `intake.status` で NG 判定する際は `.not("status", "is", null)` 必須

### 10.3 Drカルテ画面の二重管理

- **医師が使用**: `app/doctor/page.tsx`（URL: `admin.noname-beauty.jp/doctor`）
- **管理者用**: `app/admin/doctor/page.tsx`（URL: `app.noname-beauty.jp/admin/doctor`）
- **機能追加・バグ修正時は両方に同じ修正を入れること**

### 10.4 再処方カルテの保存ルール

- 承認時は `reorders.karte_note` のみに保存（冪等: `.is("karte_note", null)`）
- **intake にはカルテを INSERT しない**（重複レコード問題の原因）
- 来院履歴の表示は `patientbundle` API が intake + reorders.karte_note を統合
- 用量比較ロジック（`lib/reorder-karte.ts` の `buildKarteNote`）:
  - 増量: 「副作用がなく、効果を感じづらくなり増量処方」
  - 減量: 「副作用がなく、効果も十分にあったため減量処方」
  - 同量/初回: 「副作用がなく、継続使用のため処方」

### 10.5 過去の障害事例

| 日付 | 事象 | 原因 | 対策 |
|------|------|------|------|
| 2026-02-08 | 23人のintakeデータ消失 | ユニーク制約ドロップ後に全 upsert が壊れた | upsert 禁止、select→insert/update パターンに統一 |
| 2026-02-09 | 665件の answerer.name が null に | anon key で SELECT → RLS ブロック → null 上書き | 全 intake 処理で `supabaseAdmin` 必須化 |

---

## 11. AI自動返信

### 11.1 アーキテクチャ

デバウンス方式（Webhook → Redis → Cron処理）で動作する。

```
患者がLINEメッセージ送信
  ↓
webhook handleMessage → scheduleAiReply()
  ↓
Redis保存（ai_debounce:{patientId}、TTL 180秒）
  ↓
（60秒以内に追加メッセージ → デバウンス更新）
  ↓
Cron毎分実行 → processPendingAiReplies()
  ↓
Claude API呼び出し → draft_reply生成
  ↓
settings.mode に応じて分岐:
  ├─ "pending" → 管理グループに承認Flex送信
  └─ "auto"    → 直接LINE送信
```

### 11.2 主要ファイル

| ファイル | 役割 |
|---------|------|
| `lib/ai-reply.ts` | メイン処理：デバウンス・Claude API・返信案生成・暗黙フィードバック |
| `lib/ai-reply-approval.ts` | 承認用Flex Message生成・管理グループ送信 |
| `lib/ai-reply-filter.ts` | フィルタリング：短文・絵文字のみ・スキップパターン |
| `lib/ai-reply-sign.ts` | HMAC署名による修正ページURL生成・検証 |
| `app/api/cron/ai-reply/route.ts` | Vercel Cron（毎分実行） |

### 11.3 フィルタリング（`shouldProcessWithAI()`）

- テキストメッセージのみ処理
- 5文字未満 → スキップ
- 返信不要パターン（「了解」「ありがとう」等）→ スキップ
- 絵文字のみ → スキップ

### 11.4 処理ステップ

1. **AI返信設定取得** — `ai_reply_settings` テーブルから
2. **日次上限チェック** — `daily_limit`（デフォルト100）超過時は処理中止
3. **会話コンテキスト取得** — 直近15件のメッセージログ
4. **未返信メッセージ収集** — 最後のスタッフ返信以降のincoming
5. **却下パターン取得** — `ai_reply_drafts`からstatus="rejected"の直近10件
6. **Claude API呼び出し** — `claude-sonnet-4-5-20250929`
7. **カテゴリ判定** — greeting なら返信不要で終了
8. **ドラフト保存** — `ai_reply_drafts`テーブルへINSERT
9. **送信/承認依頼** — mode に応じて分岐

### 11.5 Claude API 出力形式

```json
{
  "category": "operational | medical | greeting | other",
  "confidence": 0.0 - 1.0,
  "reply": "返信テキスト（greetingの場合はnull）",
  "reason": "判定理由"
}
```

### 11.6 承認Flex Message

管理グループに送信される承認依頼Flex：
- ヘッダー: 「AI返信案」+ カテゴリラベル（medical は赤色）
- ボディ: 患者名、タイムスタンプ付きメッセージ一覧、AI返信案、信頼度（★表示）
- フッター: [承認して送信] / [修正する]（署名付きURL）/ [却下]

### 11.7 暗黙フィードバック（`handleImplicitAiFeedback()`）

スタッフが手動返信した際の自動学習：
1. 同一患者のpendingドラフトを `status="expired"` に更新
2. スタッフ返信内容をナレッジベースに自動追記（`Q: 元メッセージ / A: スタッフ返信`）
3. fire-and-forget で実行（失敗しても送信処理は続行）

### 11.8 却下学習

- 却下時のカテゴリ・理由を `ai_reply_drafts` に記録
- 次回のシステムプロンプトに「過去の却下パターン」として直近10件を注入
- 同じ間違いを繰り返さない仕組み

---

## 12. 患者名寄せ（重複検出・統合）

### 12.1 主要ファイル

| ファイル | 役割 |
|---------|------|
| `lib/patient-dedup.ts` | 検出アルゴリズム・統合処理（533行） |
| `app/admin/dedup-patients/page.tsx` | 名寄せ管理画面 |
| `lib/merge-tables.ts` | マージ対象テーブル定義 |

### 12.2 検出アルゴリズム（3フェーズ）

| フェーズ | 条件 | 類似度スコア |
|---------|------|------------|
| 1. 電話番号重複 | `normalizeJPPhone()` 後の完全一致 | 90-95% |
| 2. 名前+生年月日 | レーベンシュタイン距離 ≤ 2 かつ birthday 一致 | 80% |
| 3. カナ読み+性別 | name_kana + sex 完全一致 | 70% |

### 12.3 保持推奨ロジック（`suggestKeep()`）

優先順位: LINE連携有無 → 予約数 → 注文数 → 作成日（古い方）

### 12.4 統合処理（`mergePatients()`）

1. `MERGE_TABLES`（reservations, orders, reorders, message_log, patient_tags, patient_marks, friend_field_values）の `patient_id` を一括更新
2. intake テーブルの `patient_id` を更新
3. 統合元患者を `merged_into = keepId` で soft delete
4. 重複キー制約（23505）発生時は重複分を削除してリトライ

### 12.5 UI機能

- 左右2カラムの患者比較表示
- 確度バッジ色分け（95%以上=赤、90-95%=オレンジ、80-90%=黄、70-80%=グレー）
- 「この候補を無視する」→ `dedup_ignored` テーブルに記録

---

## 13. 音声カルテ自動生成

### 13.1 2段階STT（Speech-to-Text）

```
1. Deepgram Nova-3（メイン）
   ├── Keyterm Prompting: medical_vocabulary から動的キーワード生成
   ├── 最大100キーワード（重み順ソート、形式: "用語:重み"）
   └── Redis キャッシュ: vocab:{tenantId}（TTL 5分）
   ↓
2. Groq Whisper-Large-v3-Turbo（フォールバック）
   └── confidence < 閾値 or Deepgramエラー時に自動切替
```

### 13.2 医学用語補正（`refineMedicalText()`）

- **モデル**: Claude Haiku
- 医療辞書（用語+読み）を参照し、音が近い誤認識を修正
- 元の文意・構造・句読点は保持
- APIキー未設定 or 辞書空の場合は補正スキップ

### 13.3 カルテ自動生成（SOAP形式）

- **モデル**: Claude Sonnet
- **入力**: transcript（音声認識結果）
- **出力**: `{ S（主訴）, O（所見）, A（評価）, P（計画）, summary, medications }`
- JSON抽出失敗時はフリーテキスト形式で返却

### 13.4 医療辞書管理

| カテゴリ | 例 |
|---------|-----|
| `drug`（薬剤） | マンジャロ、フィナステリド |
| `symptom`（症状） | 嘔気、低血糖 |
| `procedure`（処置） | 採血、注射 |
| `anatomy`（解剖） | 前頭部、側頭部 |
| `lab`（検査値） | 血圧、SpO2 |
| `general`（その他） | バイタルサイン、副作用 |

診療科別: common（共通）/ beauty（美容）/ internal（内科）/ surgery（外科）/ orthopedics（整形）/ dermatology（皮膚科）

---

## 14. フォローアップ自動配信

### 14.1 テーブル

- `followup_rules` — ルール定義（trigger_event, delay_days, message_template, flex_json）
- `followup_logs` — 送信ログ（scheduled_at, sent_at, status: pending/sent/failed/skipped）

### 14.2 処理フロー

```
1. 決済完了時 → scheduleFollowups()
   各ルール毎に followup_log 作成（scheduled_at = now + delay_days + 10:00 JST）
   ↓
2. Cron日次実行 → processFollowups()
   status=pending かつ scheduled_at<=now のログを最大50件処理
   ↓
3. テンプレート変数置換（{name}, {patient_id}, {send_date}）
   → Flex Message or テキストで LINE送信
   → message_log に記録、status=sent
```

---

## 15. Undo（操作取り消し）

### 15.1 テーブル

`undo_history` — action_type(update/delete/insert), resource_type, resource_id, previous_data, current_data, admin_user_id, undone, expires_at(24時間)

### 15.2 取り消し処理

| 操作種別 | 取り消し動作 |
|---------|------------|
| `update` | previous_data で上書き UPDATE |
| `delete` | previous_data を再 INSERT |
| `insert` | 対象レコードを DELETE |

- id/created_at/tenant_id は復元対象から除外
- 有効期限: 24時間
- 取り消し済みフラグ: `undone=true`

---

## 16. プラットフォーム管理

### 16.1 アクセス制限

- `admin.lope.jp` サブドメイン または localhost のみアクセス可能
- 他テナントからは 403 Forbidden

### 16.2 主要機能

| 機能 | 説明 |
|------|------|
| テナント管理 | CRUD・ステータス確認・機能フラグ |
| 請求管理 | プラン・請求書・PDF生成 |
| 監査ログ | 全テナント横断の操作ログ |
| 分析 | churn/retention/feature-usage/財務 |
| アラート | システムアラート・確認 |
| エラー監視 | エラーログ閲覧 |
| メンバー管理 | プラットフォーム管理者 |
| TOTP | 2要素認証（設定・検証・無効化） |
| テナント切替 | impersonate（なりすまし）機能 |
| メンテナンス | メンテナンスモード切替 |

---

## 17. Cronジョブ

全Cronは `CRON_SECRET` 環境変数による Bearer トークン認証。

| ジョブ | 頻度 | 処理内容 |
|-------|------|---------|
| `ai-reply` | **毎分** | Redisからデバウンス通過エントリを取得→Claude API→ドラフト生成 |
| `followup` | 日次 | フォローアップルールに基づくLINEメッセージ自動送信 |
| `generate-reminders` | 日次 | 予約リマインダー自動生成・LINE送信 |
| `send-scheduled` | 日次 | 予約済みスケジュール配信の実行 |
| `process-steps` | 日次 | ステップシナリオの進行管理・メッセージ送信 |
| `collect-line-stats` | 日次 | LINE API経由で友だち数・ブロック数等を収集 |
| `health-report` | 日次 | システムヘルスレポート生成 |

---

## 18. Middleware

### 18.1 処理一覧（`middleware.ts`）

| 処理 | 内容 |
|------|------|
| 旧サブドメイン移行 | `noname-beauty.jp/*` → `noname-beauty.l-ope.jp` へリダイレクト/rewrite |
| Basic認証 | `/doctor` 配下で Basic認証ガード（`DR_BASIC_USER`/`DR_BASIC_PASS`） |
| プラットフォーム制限 | `/platform` は `admin.lope.jp` または localhost のみ |
| CSRF検証 | POST/PUT/PATCH/DELETE API で Double Submit Cookie 検証 |
| テナントID解決 | JWT→サブドメインの順で tenantId を解決→ `x-tenant-id` ヘッダー設定 |

### 18.2 CSRF除外パス

- Webhook: `/api/line/webhook`, `/api/square/webhook`, `/api/gmo/webhook`
- Cron: `/api/cron/*`
- 認証: `/api/admin/login`, `/api/admin/logout`, `/api/platform/login`, `/api/platform/totp/*`
- 患者向け: `/api/intake`, `/api/checkout`, `/api/reorder/*`, `/api/reservations`, `/api/mypage/*`, `/api/forms/*/submit`

### 18.3 テナントID解決フロー

```
1. admin_session Cookie → JWT tenantId 抽出
2. JWT に tenantId がなければ → サブドメインから resolveSlugToTenantId()
3. slugCache（プロセス内メモリ、TTL 5分）で高速化
4. 解決成功 → x-tenant-id ヘッダーを設定
```

予約slug（無視リスト）: `["app", "admin", "www", "localhost", "127", "l-ope"]`

---

## 19. E2Eテスト

### 19.1 設定

- **フレームワーク**: Playwright
- **設定ファイル**: `playwright.config.ts`
- **認証方式**: Storage State パターン（`e2e/.auth/admin.json`）
- **環境変数**: `e2e/.env.test`（`E2E_ADMIN_USERNAME`, `E2E_ADMIN_PASSWORD`）
- **ブラウザ**: Chromium

### 19.2 テストシナリオ

| ファイル | テスト内容 |
|---------|----------|
| `e2e/admin-auth.spec.ts` | ログインUI表示・正常ログイン・セッション永続化 |
| `e2e/admin-patients.spec.ts` | 患者一覧ページ・検索フィルター・サイドバーナビ |
| `e2e/admin-doctor.spec.ts` | Drカルテ画面表示・日付タブ切替・ステータスフィルター |
| `e2e/admin-shipping.spec.ts` | 配送管理ページ・ステータス表示 |
| `e2e/admin-reorders.spec.ts` | 再処方一覧・承認ボタン表示 |
| `e2e/admin-broadcast.spec.ts` | ブロードキャスト送信フロー |

---

## 20. テスト一覧

### 20.1 概要

| 指標 | 数値 |
|------|------|
| Vitest テストファイル | 75ファイル |
| Vitest テスト行数 | 18,694行 |
| E2E テストファイル | 6ファイル |
| テストフレームワーク | Vitest + Playwright |

### 20.2 APIテスト（`__tests__/api/`）

| ファイル | テスト対象 |
|---------|----------|
| `admin-auth.test.ts` | 管理画面ログイン・セッション |
| `csrf-token.test.ts` | CSRFトークン生成・検証 |
| `patient-dedup.test.ts` | 患者名寄せ・重複検出 |
| `merge-patients.test.ts` | 患者統合API |
| `dedup-patients.test.ts` | 名寄せページAPI |
| `delete-patient-data.test.ts` | 患者データ削除 |
| `intake.test.ts` / `intake-advanced.test.ts` | 問診CRUD |
| `intake-form.test.ts` | 問診フォーム定義 |
| `karte.test.ts` | カルテ基本操作 |
| `doctor-routes.test.ts` | Drカルテ画面API |
| `patient-bulk-karte.test.ts` | カルテ一括操作 |
| `undo.test.ts` | Undo機能 |
| `voice-transcribe.test.ts` | 音声文字起こし |
| `voice-vocabulary.test.ts` | 医療辞書CRUD |
| `voice-generate-karte.test.ts` | SOAPカルテ生成 |
| `ai-reply.test.ts` | AI返信デバウンス・生成 |
| `ai-reply-edit.test.ts` | AI返信修正ページ |
| `line-webhook.test.ts` | LINE Webhook |
| `line-friends.test.ts` | 友だち管理 |
| `line-admin.test.ts` | LINE管理API |
| `line-broadcast.test.ts` | ブロードキャスト |
| `line-detailed.test.ts` | LINE詳細機能 |
| `checkout.test.ts` / `checkout-advanced.test.ts` | 決済 |
| `square-webhook.test.ts` | Square Webhook |
| `gmo-webhook.test.ts` | GMO Webhook |
| `reorder.test.ts` / `reorder-advanced.test.ts` | 再処方 |
| `bank-transfer.test.ts` | 銀行振込 |
| `shipping-routes.test.ts` / `shipping-advanced.test.ts` | 配送API |
| `inventory.test.ts` | 在庫管理 |
| `reservations.test.ts` | 予約API |
| `schedule.test.ts` | スケジュール |
| `auto-reminder.test.ts` | 自動リマインダー |
| `mypage.test.ts` / `mypage-register.test.ts` | マイページ |
| `form-submit.test.ts` | フォーム投稿 |
| `products.test.ts` | 商品管理 |
| `tags.test.ts` | タグ管理 |
| `analytics-financials.test.ts` | 財務分析 |
| `security.test.ts` | セキュリティ |
| `middleware.test.ts` | Middleware |
| `multi-tenant.test.ts` | マルチテナント |
| `tenant-isolation.test.ts` | テナント分離検証（549行、静的解析ベース） |
| `cron.test.ts` / `cron-advanced.test.ts` | Cron処理 |
| `features.test.ts` | 機能フラグ |

### 20.3 ライブラリテスト（`lib/__tests__/`）

| ファイル | テスト対象 |
|---------|----------|
| `phone.test.ts` | 電話番号正規化 |
| `reorder-karte.test.ts` | 再処方カルテ |
| `tenant.test.ts` | テナント解決 |
| `patient-utils.test.ts` | 患者ユーティリティ |
| `step-enrollment.test.ts` | ステップ登録 |
| `flex-message.test.ts` | Flex Message生成 |
| `menu-auto-rules.test.ts` | メニュー自動ルール |
| `line-richmenu.test.ts` | リッチメニュー |
| `crypto.test.ts` | 暗号化 |
| `payment-gmo.test.ts` / `payment-square.test.ts` | 決済ライブラリ |
| `shipping-flex.test.ts` | 配送Flex Message |
| `reservation-flex.test.ts` | 予約Flex Message |
| `settings.test.ts` | 設定ライブラリ |
| `line-push.test.ts` | LINE送信 |
| `japanpost.test.ts` | 日本郵便API |
| `session.test.ts` | セッション管理 |
| `admin-auth.test.ts` | 管理者認証 |
| `fetch-with-csrf.test.ts` | CSRF付きFetch |
| `behavior-filters.test.ts` | 行動フィルター |
| `audit.test.ts` | 監査ログ |
| `email.test.ts` | メール送信 |
| `validations.test.ts` | Zodバリデーション |
| `medical-refine.test.ts` | 医学用語補正 |
| `feature-flags.test.ts` | 機能フラグ |

---

## 21. デモ環境

契約検討中のクリニックに個別共有するインタラクティブデモ。全機能フロントエンド完結（API・DB接続不要）。

### 21.1 アクセス情報

| 項目 | 値 |
|------|-----|
| URL | `/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/login` |
| ユーザーID | `DEMO-001` |
| パスワード | `demo1234` |

※ URLは推測困難なハッシュ付きパス。契約希望者にのみ直接共有する。

### 21.2 実装構成

| ファイル | 内容 |
|---------|------|
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/_data/mock.ts` | モックデータ（患者20人・メッセージ・予約・配信・発送） |
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/layout.tsx` | デモ用レイアウト（サイドバー・認証ガード・DEMO バッジ） |
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/login/page.tsx` | ログイン画面（localStorage認証） |
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/page.tsx` | ダッシュボード（KPI・グラフ・通知） |
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/talk/page.tsx` | LINEトーク（メッセージ送受信・テンプレート・自動返信） |
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/friends/page.tsx` | 友だち管理（検索・タグフィルタ・詳細パネル） |
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/broadcasts/page.tsx` | メッセージ配信（作成・LINEプレビュー・履歴） |
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/calendar/page.tsx` | 予約カレンダー（月間表示・予約一覧） |
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/karte/page.tsx` | Drカルテ（週間タブ・処方モーダル・定型文） |
| `app/d-7a0ab13dc2fb7e342cb6794e10cda90582d4c73005982cd7/shipping/page.tsx` | 発送管理（ステータス・追跡番号付与） |

### 21.3 認証方式

- `localStorage("demo_session")` で管理（API・DB不要）
- ログイン成功時に `"true"` を保存、ログアウト時に削除
- 未認証アクセスは自動的にログイン画面へリダイレクト
