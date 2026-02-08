# 自前登録フォーム（Lステップ脱却）

## ステータス: ローカル実装済み・未デプロイ
- LINE機能充実 + リッチメニュー切替後に本番反映予定
- ユーザーから指示があるまでpushしない

## 概要
Lステップの回答フォーム（個人情報入力）を自前のNext.jsフォームに置き換え。
患者の導線: `/register` → `/mypage/init`（SMS認証） → `/mypage`

## 変更ファイル

### 1. `/app/register/page.tsx`
- 個人情報フォーム（氏名・カナ・性別・生年月日）
- 電話番号フィールドなし（SMS認証は別ページ `/mypage/init` で実施）
- カタカナバリデーション付き
- 送信後 → 成功画面 → `/mypage/init` へ自動リダイレクト
- POST先: `/api/register/personal-info`

### 2. `/app/api/register/personal-info/route.ts`
- 電話番号不要のAPI
- patient_id 3段階解決:
  1. `line_user_id` で `intake` テーブル検索（LINE再ログイン時）
  2. cookie の `patient_id` を使用（既存セッション）
  3. 新規 → `answerers` テーブルの最大数値ID + 1（10001〜）
- `answerers` + `intake` 両テーブルにupsert
- `__Host-patient_id` / `patient_id` cookie を設定

### 3. `/app/api/register/complete/route.ts`
- SMS認証完了後の紐付けAPI（`/mypage/init` から呼ばれる）
- 3段階フォールバックで患者検索:
  1. GAS (`GAS_REGISTER_URL`) で電話番号検索 — 既存Lステップ患者の後方互換
  2. Supabase `answerers.tel` で検索 — スマホ変更時の再紐付け
  3. cookie `patient_id` を `intake` テーブルで確認 — 新規患者
- 見つかったら: `answerers.tel` + `intake.line_id` + `intake.answers.電話番号` を更新

## 設計思想

### Patient Identity Architecture
```
patient_id (不変・永続キー)
  ├── line_user_id (変更可能リンク) — LINEアカウント変更時に更新
  └── phone/tel (変更可能リンク) — スマホ変更時に更新
```

- patient_id = Supabase自動採番（数値連番）
- line_user_id / phone はどちらも変わりうる
- どちらか一方で患者を特定 → もう一方を再紐付け

### GAS脱却の段階的移行
1. 現状: Lステップ → GAS → スプレッドシート → Supabase
2. 移行後: 自前フォーム → Supabase直接（GASはフォールバックのみ）
3. 最終: GAS完全不要

## 既存の患者導線（変更なし）
```
LINE友だち追加 → リッチメニュー → Lステップ回答フォーム → 問診 → 予約
```
この導線はLINE機能が十分になるまで変更しない。
