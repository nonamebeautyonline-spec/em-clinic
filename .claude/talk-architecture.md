# LINE 個別トーク機能 - アーキテクチャ

## 全体構成
```
/admin/line/talk
├─ 左カラム (300px): 友だちリスト
├─ 中央カラム (flex): メッセージ画面
└─ 右カラム (320px): 患者情報パネル
モバイル: タブ切り替え (リスト/メッセージ/情報)
```

## 左カラム
- **幅**: 300px (PC) / 100% (モバイル)
- **FriendItem**: アバター + 患者名 + 未読ドット + メッセージ2行 + 時刻 + マークバッジ + ピン
- **メッセージ表示優先度**: 顧客テキスト > テンプレ名 > 【友達追加】
- **未読ドット**: `last_text_at > readTimestamp` で判定、localStorage管理
- **検索**: ID / 氏名 / メッセージ内容(400msデバウンス)
- **ピン留め**: 最大15件、localStorage保存
- **無限スクロール**: 50件単位

## 中央カラム
- **メッセージ取得**: 25件単位ペーシネーション
- **ポーリング**: 5秒ごと `since` パラメータで差分取得
- **送信機能**: テキスト / 画像 / テンプレート / 通話フォーム / アクション実行
- **テンプレ変数**: `{name}`, `{patient_id}`, `{send_date}`, `{next_reservation_date}`, `{next_reservation_time}`

## 右カラム
- プロフィール / 個人情報 / 次回予約
- 対応マーク (ドロップダウン)
- タグ管理 (追加/削除)
- 友だち情報フィールド
- 問診事項 / 最新決済 / 処方履歴 / 再処方
- リッチメニュー変更

## API一覧
| API | 用途 |
|-----|------|
| `GET /api/admin/line/friends-list` | 友だちリスト (last_message, last_text_at含む) |
| `GET /api/admin/messages/log` | メッセージ履歴 (patient_id, limit, offset, since) |
| `POST /api/admin/line/send` | テキスト/Flex送信 |
| `POST /api/admin/line/send-image` | 画像送信 (FormData) |
| `GET/POST/DELETE /api/admin/patients/{id}/tags` | タグ管理 |
| `GET/PUT /api/admin/patients/{id}/mark` | 対応マーク |
| `GET /api/admin/patients/{id}/fields` | 友だち情報 |
| `GET /api/admin/patient-lookup` | 患者詳細 (問診・決済) |
| `GET /api/admin/line/templates` | テンプレート一覧 |
| `GET /api/admin/line/template-categories` | カテゴリ一覧 |
| `GET /api/admin/line/actions` | アクション一覧 |
| `POST /api/admin/line/actions/execute` | アクション実行 |
| `GET /api/admin/line/marks` | マーク定義一覧 |
| `GET/POST /api/admin/line/user-richmenu` | リッチメニュー取得/変更 |

## ポーリング
| 対象 | 間隔 | 条件 |
|------|------|------|
| 新着メッセージ | 5秒 | 患者選択中 |
| 友だちリスト | 30秒 | 常時 |

## localStorage
| キー | 用途 |
|-----|------|
| `talk_pinned_patients` | ピン留めID一覧 |
| `talk_read_timestamps` | 患者ごとの既読時刻 |
