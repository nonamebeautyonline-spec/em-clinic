-- AI返信の医学的質問への対応モード追加
-- confirm: 「確認いたします」等で断定を避ける（デフォルト・現行動作）
-- direct: 直接回答を生成する（スタッフが確認不要と判断した場合）
ALTER TABLE ai_reply_settings
  ADD COLUMN IF NOT EXISTS medical_reply_mode VARCHAR(20) NOT NULL DEFAULT 'confirm';
