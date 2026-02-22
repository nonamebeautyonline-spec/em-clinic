-- AI返信ドラフトに却下フィードバック用カラムを追加
-- reject_reason: 却下理由（自由記述）
-- reject_category: 却下理由カテゴリ（inaccurate/inappropriate/not_answering/insufficient_info/other）

ALTER TABLE ai_reply_drafts
  ADD COLUMN IF NOT EXISTS reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS reject_category VARCHAR(30);
