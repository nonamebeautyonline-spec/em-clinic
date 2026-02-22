# 電子カルテ機能強化計画（medicalforce参考）

## 現状分析

### 現在のカルテ機能
- **入力**: 6行テキストエリア + 5種の定型文ボタン（日時/副作用/使用方法/処方許可/不通）
- **処方選択**: マンジャロ 2.5mg / 5mg / 7.5mg のみ
- **下書き**: localStorage（端末依存、他端末で共有不可）
- **画像**: 非対応
- **テンプレート**: ハードコード済みの定型文のみ
- **ロック**: なし（確定後も自由に編集可能）
- **監査**: なし（誰がいつ変更したか追跡不可）

### 既存インフラ
- Supabase Storage 稼働中（`line-images` / `media` バケット）
- 画像アップロードAPIパターン確立済み（FormData → storage.upload → getPublicUrl）
- メディア管理UI（`app/admin/line/media/`）完成済み

---

## 実装フェーズ

### Phase 1: カルテ画像・経過写真（最優先）

medicalforce最大の差別化ポイント。施術前後の比較写真はクリニック運営で必須。

#### 1-1. DB: `karte_images` テーブル作成
```sql
CREATE TABLE karte_images (
  id BIGSERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL,
  intake_id BIGINT REFERENCES intake(id) ON DELETE SET NULL,
  reserve_id TEXT,
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  label TEXT DEFAULT '',          -- 「施術前」「施術後」「経過1ヶ月」等
  category TEXT DEFAULT 'progress', -- progress / before_after / other
  memo TEXT DEFAULT '',
  taken_at TIMESTAMPTZ,           -- 撮影日時
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT                  -- 記録者
);
CREATE INDEX idx_karte_images_patient ON karte_images(patient_id);
CREATE INDEX idx_karte_images_intake ON karte_images(intake_id);
```

#### 1-2. API: `app/api/doctor/karte-images/route.ts`
- **POST**: 画像アップロード（FormData受付、Supabase Storage `karte-images` バケットへ保存）
- **GET**: 患者ID指定で画像一覧取得
- **DELETE**: 画像削除（ストレージ + DB）

#### 1-3. UI: ドクターカルテモーダルに画像セクション追加
- カルテテキストエリアの下に画像アップロードエリア
- ドラッグ&ドロップ / ファイル選択
- サムネイルプレビュー + ラベル入力
- 既存画像の一覧表示（タイムライン形式）
- `app/doctor/page.tsx` と `app/admin/doctor/page.tsx` 両方に実装

#### 1-4. カルテ検索画面で画像表示
- `app/admin/kartesearch/page.tsx` の問診詳細展開時に画像一覧表示

---

### Phase 2: カルテテンプレート拡充

#### 2-1. DB: `karte_templates` テーブル
```sql
CREATE TABLE karte_templates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,              -- テンプレート名
  category TEXT DEFAULT 'general', -- general / glp1 / skin / injection 等
  body TEXT NOT NULL,              -- テンプレート本文（プレースホルダ {{date}} 等対応）
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2-2. API: `app/api/admin/karte-templates/route.ts`
- CRUD操作
- 初期データ: 現在の5種 + 追加テンプレート（初診カルテ全文、再診カルテ全文、BMI記録等）

#### 2-3. UI: テンプレート管理画面
- `app/admin/settings/` 内にテンプレート管理タブ追加
- テンプレート名・カテゴリ・本文の編集
- 並び順変更

#### 2-4. ドクターUI: テンプレートピッカー
- 現在のハードコード定型文ボタン → DB読み込み式に切替
- カテゴリ別フィルタ（「GLP-1」「美容」「一般」等）
- ワンクリックでテキストエリアに挿入（既存の insertTemplateToNote を活用）

---

### Phase 3: カルテロック＆サーバー下書き

#### 3-1. カルテロック
- intake テーブルに `locked_at TIMESTAMPTZ`, `locked_by TEXT` 追加
- OK/NG 保存時に自動ロック
- ロック後はUIで編集不可（グレーアウト）
- 管理者のみロック解除可能（API: `app/api/admin/karte-unlock/route.ts`）

#### 3-2. サーバー下書き
- `karte_drafts` テーブル（reserve_id, note, prescription_menu, updated_at）
- 30秒ごとにサーバーへ自動保存（debounce）
- localStorage は廃止 → サーバー下書きに統一
- 他端末でもカルテ下書きが引き継がれる

---

### Phase 4: 監査ログ（将来）

#### 4-1. `karte_audit_log` テーブル
- action: create / update / lock / unlock
- actor: 操作者
- changes: JSON差分
- created_at

---

## 変更対象ファイル一覧

### 新規作成
| ファイル | 内容 |
|---------|------|
| `app/api/doctor/karte-images/route.ts` | 画像アップロード/取得/削除API |
| `app/api/admin/karte-templates/route.ts` | テンプレートCRUD API |
| `app/api/admin/karte-unlock/route.ts` | カルテロック解除API |
| `app/api/doctor/karte-draft/route.ts` | サーバー下書き保存/取得API |

### 既存修正
| ファイル | 変更内容 |
|---------|---------|
| `app/doctor/page.tsx` | 画像セクション追加、テンプレートDB化、ロック表示、サーバー下書き |
| `app/admin/doctor/page.tsx` | 同上（両方に同じ修正） |
| `app/admin/kartesearch/page.tsx` | 画像表示追加 |
| `app/api/doctor/update/route.ts` | ロック処理追加 |

### DB マイグレーション
- `karte_images` テーブル
- `karte_templates` テーブル + 初期データ
- intake テーブル: `locked_at`, `locked_by` カラム追加
- `karte_drafts` テーブル

---

## 実装順序（推奨）

1. **Phase 1: カルテ画像** → 即座に価値が出る。medicalforceとの最大差分を埋める
2. **Phase 2: テンプレート** → Dr.の入力効率が大幅向上
3. **Phase 3: ロック＆下書き** → 運用安全性向上
4. **Phase 4: 監査ログ** → コンプライアンス対応

Phase 1 から着手でよろしいですか？
