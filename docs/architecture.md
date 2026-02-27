# アーキテクチャドキュメント — Lオペ for CLINIC

> **最終更新**: 2026-02-27

---

## 目次

1. [システム概要](#1-システム概要)
2. [ER図（主要テーブル）](#2-er図主要テーブル)
3. [患者フロー（コンポーネント図）](#3-患者フローコンポーネント図)
4. [データフロー図](#4-データフロー図)
5. [API層アーキテクチャ](#5-api層アーキテクチャ)
6. [インフラ構成](#6-インフラ構成)
7. [Cronジョブ一覧](#7-cronジョブ一覧)
8. [セキュリティレイヤー](#8-セキュリティレイヤー)

---

## 1. システム概要

```mermaid
graph TB
    subgraph "クライアント"
        Patient["患者<br/>(LINE / ブラウザ)"]
        Admin["管理者<br/>(ブラウザ)"]
        Doctor["医師<br/>(ブラウザ)"]
        Platform["プラットフォーム管理者<br/>(ブラウザ)"]
    end

    subgraph "Vercel"
        Next["Next.js 16<br/>App Router"]
        MW["middleware.ts<br/>(CSRF, 認証, テナント解決)"]
        API["API Routes<br/>/api/*"]
        Cron["Cron Jobs<br/>/api/cron/*"]
    end

    subgraph "外部サービス"
        LINE["LINE Messaging API"]
        Square["Square 決済"]
        GMO["GMO 決済"]
        Twilio["Twilio Verify<br/>(SMS認証)"]
        Deepgram["Deepgram<br/>(音声認識)"]
        Claude["Anthropic Claude<br/>(AI返信)"]
        Resend["Resend<br/>(メール送信)"]
        Sentry["Sentry<br/>(エラー監視)"]
    end

    subgraph "データストア"
        Supabase["Supabase<br/>(PostgreSQL + RLS)"]
        Redis["Upstash Redis<br/>(キャッシュ, ロック, KV)"]
    end

    Patient --> LINE
    Patient --> Next
    Admin --> Next
    Doctor --> Next
    Platform --> Next

    Next --> MW --> API
    API --> Supabase
    API --> Redis
    API --> LINE
    API --> Square
    API --> GMO
    API --> Twilio
    API --> Deepgram
    API --> Claude
    API --> Resend
    API --> Sentry

    LINE -->|"Webhook"| API
    Square -->|"Webhook"| API
    GMO -->|"Webhook"| API
    Cron --> API
```

---

## 2. ER図（主要テーブル）

```mermaid
erDiagram
    tenants {
        uuid id PK
        text slug UK "サブドメイン"
        text name "クリニック名"
        boolean is_active
        timestamptz created_at
    }

    admin_users {
        uuid id PK
        uuid tenant_id FK
        text username UK
        text password_hash
        text platform_role "tenant_admin / platform_admin"
        timestamptz created_at
    }

    tenant_members {
        uuid id PK
        uuid tenant_id FK
        uuid admin_user_id FK
        text role "admin / owner"
    }

    patients {
        serial id PK
        varchar patient_id UK "例: 20260100001"
        text name
        text name_kana
        varchar tel "normalizeJPPhone適用"
        varchar sex
        date birthday
        varchar line_id
        uuid tenant_id FK
        timestamptz created_at
    }

    intake {
        serial id PK
        varchar reserve_id "予約紐付け"
        varchar patient_id FK "ユニーク制約なし"
        varchar answerer_id "LステップUID"
        varchar line_id
        jsonb answers "問診回答データ"
        date reserved_date
        time reserved_time
        varchar status "null / NG"
        text note "カルテメモ"
        text prescription_menu
        uuid tenant_id FK
        timestamptz created_at
    }

    reservations {
        serial id PK
        varchar reserve_id UK
        varchar patient_id FK
        date reserved_date
        time reserved_time
        varchar status "reserved / cancelled"
        text prescription_menu
        uuid tenant_id FK
        timestamptz created_at
    }

    orders {
        serial id PK
        varchar patient_id FK
        varchar payment_id "Square/GMO決済ID"
        varchar payment_status "pending / paid"
        varchar shipping_status "pending / shipped"
        varchar tracking_number "ヤマト追跡番号"
        integer amount
        jsonb items
        uuid tenant_id FK
        timestamptz created_at
    }

    reorders {
        serial id PK
        varchar patient_id FK
        varchar status "pending / confirmed / paid / shipped / rejected"
        text karte_note "再処方カルテ(SoT)"
        varchar payment_id
        integer amount
        jsonb items
        uuid tenant_id FK
        timestamptz created_at
    }

    line_messages {
        serial id PK
        varchar patient_id FK
        varchar line_id
        varchar direction "incoming / outgoing"
        text message_text
        varchar message_type "text / image / flex"
        uuid tenant_id FK
        timestamptz created_at
    }

    message_templates {
        serial id PK
        text name
        text content
        varchar template_type "text / flex"
        uuid tenant_id FK
        timestamptz created_at
    }

    tag_definitions {
        serial id PK
        varchar name UK
        varchar color
        boolean is_auto
        jsonb auto_rule
        uuid tenant_id FK
    }

    patient_tags {
        serial id PK
        varchar patient_id FK
        integer tag_id FK
        timestamptz assigned_at
    }

    step_enrollments {
        serial id PK
        varchar patient_id FK
        integer scenario_id FK
        integer current_step
        varchar status "active / completed / cancelled"
        uuid tenant_id FK
        timestamptz created_at
    }

    webhook_events {
        serial id PK
        varchar provider "square / gmo / line"
        varchar event_key UK "冪等キー"
        jsonb payload
        timestamptz created_at
    }

    audit_logs {
        uuid id PK
        text action
        text actor
        text target_type
        text target_id
        jsonb details
        uuid tenant_id FK
        timestamptz created_at
    }

    admin_sessions {
        uuid id PK
        uuid admin_user_id FK
        text session_token UK
        timestamptz expires_at
        uuid tenant_id FK
    }

    tenants ||--o{ admin_users : "所属"
    tenants ||--o{ tenant_members : "メンバー"
    admin_users ||--o{ tenant_members : "参加"
    admin_users ||--o{ admin_sessions : "セッション"

    tenants ||--o{ patients : "所属"
    patients ||--o{ intake : "問診(複数可)"
    patients ||--o{ reservations : "予約"
    patients ||--o{ orders : "注文"
    patients ||--o{ reorders : "再処方"
    patients ||--o{ line_messages : "LINE会話"
    patients ||--o{ patient_tags : "タグ"
    patients ||--o{ step_enrollments : "Step登録"
    tag_definitions ||--o{ patient_tags : "タグ定義"
```

---

## 3. 患者フロー（コンポーネント図）

LINE友だち追加から発送までの一連のフローを示します。

```mermaid
sequenceDiagram
    actor P as 患者
    participant LINE as LINE
    participant WH as Webhook<br/>/api/line/webhook
    participant REG as 登録<br/>/register/*
    participant VER as SMS認証<br/>/api/verify
    participant INT as 問診<br/>/intake
    participant RES as 予約<br/>/reserve
    participant DR as 医師画面<br/>/doctor
    participant PAY as 決済<br/>/api/checkout
    participant SQ as Square/GMO
    participant SHIP as 配送管理<br/>/admin/shipping
    participant DB as Supabase

    Note over P,DB: ステップ0: LINE友だち追加
    P->>LINE: 友だち追加
    LINE->>WH: follow イベント
    WH->>DB: patient作成(LINE仮ID) + intake自動作成
    WH->>LINE: 登録案内メッセージ送信

    Note over P,DB: ステップ1: 個人情報登録
    P->>REG: 氏名・生年月日等を入力
    REG->>DB: patient_id統合(仮ID→正式ID), intake更新

    Note over P,DB: ステップ2: 電話番号認証
    P->>VER: 電話番号入力
    VER->>P: SMS送信(Twilio Verify)
    P->>VER: 認証コード入力
    VER->>DB: patients.tel保存(normalizeJPPhone)

    Note over P,DB: ステップ3: 問診記入
    P->>INT: 問診フォーム入力
    INT->>DB: intake.answers更新

    Note over P,DB: ステップ4: 予約
    P->>RES: 日時選択
    RES->>DB: reservations作成 + intake.reserve_id付与(RPC)

    Note over P,DB: ステップ5: 診察(Dr)
    DR->>DB: intake.note / intake.status更新
    DR->>DB: NG判定の場合はstatus="NG"

    Note over P,DB: ステップ6: 決済
    PAY->>SQ: 決済リンク生成
    P->>SQ: 決済実行
    SQ->>PAY: Webhook(決済完了)
    PAY->>DB: orders.payment_status="paid"
    PAY->>LINE: 決済完了通知

    Note over P,DB: ステップ7: 発送
    SHIP->>DB: orders.shipping_status="shipped" + tracking_number
    SHIP->>LINE: 発送通知(追跡番号付き)
```

### 再処方フロー

```mermaid
sequenceDiagram
    actor P as 患者
    participant APP as マイページ<br/>/mypage
    participant API as 再処方API<br/>/api/reorder
    participant DR as 医師<br/>/doctor
    participant PAY as 決済<br/>Square/GMO
    participant SHIP as 配送<br/>/admin/shipping
    participant DB as Supabase
    participant LINE as LINE

    P->>APP: 再処方申請
    APP->>API: POST /api/reorder/apply
    API->>DB: reorders作成(status=pending)
    API->>LINE: 管理者通知

    DR->>DB: reorders確認
    alt 承認
        DR->>DB: status=confirmed + karte_note生成
        DR->>LINE: 決済案内送信
        P->>PAY: 決済実行
        PAY->>API: Webhook(決済完了)
        API->>DB: status=paid
        API->>LINE: 決済完了通知
        SHIP->>DB: status=shipped + tracking_number
        SHIP->>LINE: 発送通知
    else 却下
        DR->>DB: status=rejected
        DR->>LINE: 却下通知
    end
```

---

## 4. データフロー図

### 4-1. Webhook データフロー

```mermaid
flowchart LR
    subgraph "外部イベント"
        LW["LINE Webhook"]
        SW["Square Webhook"]
        GW["GMO Webhook"]
    end

    subgraph "入口処理"
        SV["署名検証"]
        IK["冪等キーチェック<br/>(webhook_events)"]
    end

    subgraph "ビジネスロジック"
        LP["LINE処理<br/>(message/follow/unfollow)"]
        SP["Square決済処理<br/>(payment.completed)"]
        GP["GMO決済処理<br/>(決済完了)"]
    end

    subgraph "データストア"
        DB["Supabase"]
        RD["Redis"]
    end

    subgraph "通知"
        LN["LINE通知送信"]
    end

    LW --> SV --> IK --> LP --> DB
    SW --> SV --> IK --> SP --> DB
    GW --> SV --> IK --> GP --> DB

    LP --> LN
    SP --> LN
    GP --> LN

    IK --> RD
```

### 4-2. 認証・セッションフロー

```mermaid
flowchart TD
    subgraph "クライアント"
        BW["ブラウザ"]
    end

    subgraph "middleware.ts"
        TN["テナント解決<br/>(サブドメイン→tenant_id)"]
        CS["CSRF検証<br/>(Double Submit Cookie)"]
        SS["セッション検証<br/>(admin_sessions)"]
    end

    subgraph "API Routes"
        LG["ログインAPI<br/>/api/admin/login"]
        PT["Protected API<br/>/api/admin/*"]
    end

    subgraph "データストア"
        DB["Supabase"]
        RD["Redis<br/>(Rate Limit)"]
    end

    BW -->|"リクエスト"| TN
    TN --> CS
    CS --> SS
    SS -->|"認証済み"| PT
    SS -->|"未認証"| LG

    LG -->|"認証成功"| DB
    LG -->|"セッション作成"| DB
    PT --> DB

    LG --> RD
    PT --> RD
```

### 4-3. Cronジョブ実行フロー

```mermaid
flowchart TD
    VC["Vercel Cron<br/>(vercel.json)"]

    subgraph "排他制御"
        DL["分散ロック取得<br/>(Redis SET NX EX)"]
    end

    subgraph "Cronジョブ"
        PS["process-steps<br/>(Stepシナリオ実行)"]
        SS["send-scheduled<br/>(予約送信)"]
        AR["ai-reply<br/>(AI返信ドラフト生成)"]
        GR["generate-reminders<br/>(リマインダー送信)"]
        FU["followup<br/>(フォローアップ)"]
        SR["segment-recalculate<br/>(セグメント再計算)"]
    end

    subgraph "出力"
        DB["Supabase<br/>(状態更新)"]
        LN["LINE<br/>(メッセージ送信)"]
    end

    VC --> DL
    DL -->|"ロック成功"| PS & SS & AR & GR & FU & SR
    DL -->|"ロック失敗(他インスタンス実行中)"| SKIP["スキップ"]

    PS --> DB & LN
    SS --> DB & LN
    AR --> DB
    GR --> LN
    FU --> LN
    SR --> DB
```

---

## 5. API層アーキテクチャ

### ルーティング構造

```
/api/
├── admin/              管理画面API（セッション認証必須）
│   ├── login           ログイン・ログアウト
│   ├── patients/       患者CRUD
│   ├── reservations/   予約管理
│   ├── shipping/       配送管理
│   ├── line/           LINE運用（トーク・友だち・配信）
│   ├── karte/          カルテ管理
│   ├── reorders/       再処方管理
│   └── ...
├── checkout            決済リンク生成
├── cron/               Cronジョブ（Vercel Cron）
├── doctor/             医師API（Basic認証）
├── gmo/                GMO Webhook
├── intake              問診保存
├── line/               LINE Webhook
├── mypage/             患者マイページAPI
├── platform/           プラットフォームAPI
├── register/           患者登録
├── reorder/            再処方申請
├── reservations        予約作成
├── square/             Square Webhook
└── verify/             SMS認証（Twilio）
```

### 認証方式一覧

| エンドポイント | 認証方式 | 備考 |
|-------------|---------|------|
| `/api/admin/*` | セッションCookie + CSRF | admin_sessions テーブル |
| `/api/doctor/*` | Basic認証 | DR_BASIC_USER / DR_BASIC_PASS |
| `/api/platform/*` | セッションCookie + TOTP(2FA) | platform_role = platform_admin |
| `/api/line/webhook` | LINE署名検証 | X-Line-Signature |
| `/api/square/webhook` | Square署名検証 | SQUARE_WEBHOOK_SIGNATURE_KEY |
| `/api/gmo/webhook` | GMO署名検証(SHA256) | 段階導入: ShopPass未設定時スキップ |
| `/api/cron/*` | Vercel Cron認証 | CRON_SECRET |
| `/api/mypage/*` | patient_id Cookie | LINEログイン経由で設定 |
| `/api/register/*` | patient_id Cookie | 登録フロー中に設定 |
| `/api/intake` | patient_id Cookie | 問診フォームから送信 |
| `/api/reservations` | patient_id Cookie | 予約画面から送信 |

---

## 6. インフラ構成

```mermaid
graph TB
    subgraph "DNS"
        CF["Cloudflare / Vercel DNS"]
    end

    subgraph "Vercel"
        EDGE["Edge Network<br/>(CDN + Middleware)"]
        SF["Serverless Functions<br/>(API Routes)"]
        SSR["SSR / ISR<br/>(ページ)"]
    end

    subgraph "Supabase"
        PG["PostgreSQL<br/>(RLS有効)"]
        AUTH["Supabase Auth<br/>(未使用 — 独自セッション)"]
        STOR["Supabase Storage<br/>(画像)"]
    end

    subgraph "Upstash"
        REDIS["Redis<br/>(分散ロック / レート制限 / KV)"]
    end

    subgraph "外部API"
        LINEAPI["LINE Messaging API"]
        SQAPI["Square API"]
        GMAPI["GMO API"]
        TWAPI["Twilio API"]
        DGAPI["Deepgram API"]
        ANAPI["Anthropic API"]
    end

    subgraph "監視"
        SENT["Sentry<br/>(エラー監視)"]
    end

    CF --> EDGE
    EDGE --> SF
    EDGE --> SSR
    SF --> PG
    SF --> REDIS
    SF --> LINEAPI
    SF --> SQAPI
    SF --> GMAPI
    SF --> TWAPI
    SF --> DGAPI
    SF --> ANAPI
    SF --> SENT
    SSR --> PG
```

### マルチテナントアーキテクチャ

- **テナント識別**: サブドメイン方式 `{slug}.lope.jp`
- **データ分離**: RLS（Row Level Security）+ `tenant_id` カラム
- **テナント解決**: `middleware.ts` でサブドメインから `tenant_id` を解決
- **クエリフィルタ**: `withTenant(query, tenantId)` を全クエリに適用

---

## 7. Cronジョブ一覧

| ジョブ名 | エンドポイント | 実行間隔 | 排他制御 | 概要 |
|---------|-------------|---------|---------|------|
| Step実行 | `/api/cron/process-steps` | 毎分 | `cron:process-steps` (55秒TTL) | LINEステップシナリオの自動送信 |
| 予約送信 | `/api/cron/send-scheduled` | 毎分 | `cron:send-scheduled` (55秒TTL) | 予約済みブロードキャストの送信 |
| AI返信 | `/api/cron/ai-reply` | 毎分 | `cron:ai-reply` (55秒TTL) | 未返信メッセージのAIドラフト生成 |
| リマインダー | `/api/cron/generate-reminders` | 毎分 | `cron:generate-reminders` (55秒TTL) | 予約リマインダーのLINE送信 |
| フォローアップ | `/api/cron/followup` | 毎分 | `cron:followup` (55秒TTL) | 来院後フォローアップメッセージ |
| セグメント再計算 | `/api/cron/segment-recalculate` | 1時間 | `cron:segment-recalculate` (55秒TTL) | 患者セグメントの再分類 |
| 使用量チェック | `/api/cron/usage-check` | 1時間 | - | テナント使用量の集計 |
| 監査アーカイブ | `/api/cron/audit-archive` | 日次 | - | 古い監査ログのアーカイブ |
| ヘルスレポート | `/api/cron/health-report` | 日次 | - | システムヘルスレポート生成 |
| LINE統計 | `/api/cron/collect-line-stats` | 日次 | - | LINE配信統計の収集 |

---

## 8. セキュリティレイヤー

```mermaid
flowchart TD
    REQ["リクエスト"]

    subgraph "Layer 1: Edge"
        RL["レートリミット<br/>(Upstash Redis)"]
        CSRF["CSRF検証<br/>(Double Submit Cookie)"]
        CSP["CSP ヘッダー<br/>(next.config.ts)"]
    end

    subgraph "Layer 2: 認証"
        SESS["セッション検証<br/>(admin_sessions)"]
        TOTP["TOTP 2FA<br/>(プラットフォーム)"]
        SIG["Webhook署名検証<br/>(LINE/Square/GMO)"]
    end

    subgraph "Layer 3: 認可"
        TEN["テナント分離<br/>(RLS + withTenant)"]
        PERM["権限チェック<br/>(permissions.ts)"]
        FF["機能フラグ<br/>(feature-flags.ts)"]
    end

    subgraph "Layer 4: バリデーション"
        ZOD["Zodスキーマ検証<br/>(validations/)"]
        SAN["入力サニタイズ"]
    end

    subgraph "Layer 5: 監査"
        AUDIT["監査ログ<br/>(audit_logs)"]
        ALERT["セキュリティアラート<br/>(security-alerts.ts)"]
    end

    REQ --> RL --> CSRF --> CSP
    CSP --> SESS --> TOTP --> SIG
    SIG --> TEN --> PERM --> FF
    FF --> ZOD --> SAN
    SAN --> AUDIT --> ALERT
```

### セキュリティ対策一覧

| 対策 | 実装 | 適用範囲 |
|------|------|---------|
| レートリミット | `lib/rate-limit.ts` (Upstash Redis) | 管理API全般 |
| CSRF防止 | `middleware.ts` (Double Submit Cookie) | 管理API（患者API除外） |
| CSP | `next.config.ts` ヘッダー | 全ページ |
| セッション管理 | `lib/session.ts` + `admin_sessions` | 管理画面 |
| 2FA (TOTP) | `lib/totp.ts` | プラットフォーム管理者 |
| 入力検証 | `lib/validations/` (Zod v4) | 全API |
| 監査ログ | `lib/audit.ts` (fire-and-forget) | 全ドメイン |
| 暗号化 | `lib/crypto.ts` (AES) | 設定値の保存 |
| Webhook署名 | LINE/Square/GMO各SDK | Webhookエンドポイント |
| RLS | Supabase PostgreSQL | 全テーブル |
| 分散ロック | `lib/distributed-lock.ts` (Redis) | Cronジョブ |
| 冪等性 | `lib/idempotency.ts` + `webhook_events` | Webhook処理 |

---

## 関連ドキュメント

- [ドメイン境界マップ](./domain-boundaries.md) — ドメイン責務・SoTテーブル・CRUD権限
- [セキュリティ運用](./security-operations.md) — セキュリティ運用ガイド
- [インシデント対応](./incident-response.md) — インシデント対応フロー
- [データ保護ポリシー](./data-protection-policy.md) — 個人情報取り扱い
- [SLA](./sla.md) — サービスレベル合意
