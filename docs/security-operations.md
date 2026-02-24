# セキュリティ運用チェックリスト

最終更新: 2026-02-24

## 1. 認証方式

| 項目 | 設定値 |
|------|--------|
| アルゴリズム | HS256 (HMAC-SHA256) |
| ライブラリ | jose (SignJWT / jwtVerify) |
| JWT有効期限 | 24時間 (86,400秒) |
| 署名鍵 | 環境変数 `JWT_SECRET` または `ADMIN_TOKEN` |
| トークン保存 | HttpOnly Cookie (`admin_session`) |
| Dr認証 | Basic認証 (`DR_BASIC_USER` / `DR_BASIC_PASS`) |
| プラットフォーム管理者 | TOTP 2FA (RFC 6238準拠、Google Authenticator対応) |
| 患者認証 | LINE OAuth → JWT |

### JWTペイロード

```
userId, email, name, username, tenantId,
platformRole ('platform_admin' | 'tenant_admin'),
tenantRole ('admin' | 'viewer' | 'owner')
```

## 2. セッション管理方針

| 項目 | 設定値 |
|------|--------|
| 保存先 | `admin_sessions` テーブル (Supabase) |
| 最大同時セッション数 | 3 (超過分は古い順に削除) |
| タイムアウト | 24時間で自動期限切れ |
| アクティビティ更新 | 5分以上経過時のみDB更新 (負荷軽減) |
| トークン保存方式 | SHA256ハッシュのみDB保存 (平文保存なし) |
| RLS | service_role のみアクセス可能 |

### セッション操作

- `createSession()` — ログイン時。超過セッション自動削除
- `validateSession()` — JWT有効期限 + DB存在チェック
- `revokeSession()` — ログアウト時
- `revokeAllSessions()` — 強制ログアウト (全セッション削除)
- `cleanExpiredSessions()` — 期限切れセッション定期削除

## 3. RLS (Row Level Security) 設計方針

### 原則

- **管理系テーブル**: `service_role` のみアクセス (admin_sessions, audit_logs, admin_users, tenants 等)
- **患者向けAPI**: `supabaseAdmin` (Service Role Key) を使用
- **anon key は原則使用禁止** — RLSでSELECTがブロックされ、null上書き事故の原因となった (2026-02-09 事故)

### テナント分離

- サブドメイン方式: `{slug}.lope.jp`
- middleware で slug → `tenant_id` を解決し、全APIに `x-tenant-id` ヘッダーを挿入
- `withTenant()` ヘルパーで全クエリにテナントフィルタを適用
- テナント分離テスト (549行) で静的解析ベースの隔離チェック

## 4. データ暗号化方針

### 暗号化対象

| 対象 | 方式 | 保存先 |
|------|------|--------|
| テナント設定 (APIキー・シークレット) | AES-256-GCM | `tenant_settings` テーブル |
| セッショントークン | SHA256ハッシュ | `admin_sessions.token_hash` |
| パスワード | bcrypt | `admin_users.password_hash` |

### AES-256-GCM 仕様

- 鍵: 環境変数 `SETTINGS_ENCRYPTION_KEY` (256bit / 32バイト)
- IV: 12バイト (GCM標準、毎回ランダム生成)
- 認証タグ: 16バイト
- 保存形式: `{iv(hex)}:{tag(hex)}:{ciphertext(hex)}`

### 暗号化されないデータ

- 患者個人情報 (patients.name, tel, email) — Supabase側の暗号化 (at-rest encryption) に依存
- 問診回答 (intake.answers) — JSON平文
- カルテ (reorders.karte_note) — JSON平文

### 通信暗号化

- 全通信: TLS 1.2以上 (Vercel + Supabase)
- Supabase接続: SSL必須

## 5. CSRF対策

| 項目 | 設定値 |
|------|--------|
| 方式 | Double Submit Cookie |
| 検証 | `x-csrf-token` ヘッダー === `csrf_token` Cookie |
| 保護対象 | 管理画面の POST/PUT/PATCH/DELETE |

### 除外パス

```
/api/line/webhook      — LINE Webhook
/api/square/webhook    — Square Webhook
/api/gmo/webhook       — GMO Webhook
/api/cron/             — Cronジョブ
/api/health            — ヘルスチェック
/api/admin/login       — ログイン
/api/admin/logout      — ログアウト
/api/intake            — 患者問診
/api/checkout          — 患者決済
/api/reorder/          — 患者再処方
/api/reservations      — 患者予約
/api/mypage            — 患者マイページ
/api/register/         — 患者登録
/api/doctor/           — Dr API
```

## 6. レート制限

| エンドポイント | 制限 | キー |
|--------------|------|------|
| ログイン (ユーザー単位) | 5回 / 30分 | `login:user:{username}` |
| ログイン (IP単位) | 15回 / 10分 | `login:ip:{ip}` |

- インフラ: Upstash Redis
- ログイン成功時: カウントリセット
- Redis障害時: 制限スキップ (サービス継続優先)

## 7. 入力バリデーション

- 全APIエンドポイントで Zod v4 によるスキーマ検証
- `parseBody()` ヘルパーで統一的にパース・検証
- バリデーション定義: `lib/validations/` (32ファイル、1,965行)
- 不正入力時は 400 Bad Request を返却

## 8. 監査ログ

### 記録内容

```
tenant_id, admin_user_id, admin_name,
action (例: 'admin.login.success', 'patient.delete'),
resource_type, resource_id,
details (JSONB),
ip_address, user_agent,
created_at
```

### 運用方針

| 項目 | 設定値 |
|------|--------|
| 記録方式 | fire-and-forget (非同期、業務処理を止めない) |
| 保存先 | `audit_logs` テーブル |
| 閲覧権限 | プラットフォーム管理者のみ (`/platform/audit`) |
| RLS | service_role のみアクセス |
| 保管期間 | 無期限 (手動削除まで保持) |

### 推奨: 保管期間ポリシー

- 通常ログ: 1年保持
- セキュリティイベント (login.failure等): 3年保持
- 法令要件に応じて延長

## 9. セキュリティアラート

| アラート種別 | 重要度 |
|-------------|--------|
| ログイン試行超過 | high |
| 不審なIPからのアクセス | medium |
| セッション盗難検知 | critical |
| 大量API呼び出し | high |

- 保存先: `security_alerts` テーブル
- 確認: プラットフォーム管理画面 (`/platform/alerts`)
- 通知方法: 管理画面表示 + 将来的にメール/LINE通知

## 10. エラー監視 (Sentry)

| 項目 | 設定値 |
|------|--------|
| 有効環境 | 本番環境のみ (NODE_ENV === 'production') |
| トレースサンプリング | 10% |
| エラー時セッション記録 | 100% |
| 通常セッション記録 | 0% |

### フィルター (ノイズ除去)

- ブラウザ拡張エラー (ResizeObserver loop)
- ネットワークエラー (Failed to fetch, Load failed)
- Supabase一時接続エラー (FetchError, ECONNRESET)

## 11. バックアップ

| 項目 | 方式 |
|------|------|
| データベース | Supabase自動バックアップ (Proプラン: 日次、7日保持) |
| ファイルストレージ | Supabase Storage (自動レプリケーション) |
| ソースコード | GitHub (main ブランチ保護) |
| 環境変数 | Vercelプロジェクト設定 (手動バックアップ推奨) |

### 推奨: 追加バックアップ

- 月1回: Supabase pg_dump による手動バックアップ
- 環境変数一覧の暗号化保存 (1Password等)

## 12. 冪等性・排他制御

### 分散ロック

- 方式: Redis SET NX EX (アトミック取得)
- TTL: ジョブごとに指定 (例: 300秒)
- 障害時: ロックなしで続行
- 適用: Cron 6本 + Webhook AI返信処理

### 冪等チェック

- 方式: `webhook_events` テーブル UNIQUE制約
- 適用: Square/GMO/LINE Webhook、リマインダー送信
- クリーンアップ: 30日以上前のレコード定期削除

## 13. CSP (Content Security Policy)

- `next.config.ts` headers で設定
- script-src, style-src, img-src 等を制限
- inline script は nonce ベース

## 14. 依存パッケージ監査

- CI: `npm audit --audit-level=moderate` (全PR実行)
- 状態: continue-on-error (警告のみ、ブロックなし)

## 15. Webhook署名検証

| サービス | アルゴリズム | タイミング攻撃対策 |
|---------|-------------|:------------------:|
| LINE | HMAC-SHA256 → Base64 | crypto.timingSafeEqual |
| Square | HMAC-SHA1 → Base64 | crypto.timingSafeEqual |
| GMO | SHA256 (CheckString) | — |

## 16. 定期セキュリティ運用

### 日次

- [ ] Sentry アラート確認
- [ ] ヘルスレポート (Cron自動実行) の LINE通知確認

### 週次

- [ ] セキュリティアラート (`/platform/alerts`) の確認・対応
- [ ] 監査ログの異常パターン確認

### 月次

- [ ] 依存パッケージ更新 (`npm update` + テスト実行)
- [ ] npm audit の脆弱性対応
- [ ] 期限切れセッションのクリーンアップ確認
- [ ] バックアップ復元テスト (推奨)

### 四半期

- [ ] アクセス権限の棚卸し (不要アカウント削除)
- [ ] セキュリティポリシーの見直し
- [ ] 外部セキュリティレビュー (推奨)
