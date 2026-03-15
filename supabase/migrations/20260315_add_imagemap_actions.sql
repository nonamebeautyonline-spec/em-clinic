-- リッチメッセージ（imagemap）テンプレート用カラム追加
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS imagemap_actions JSONB;

-- imagemap_actions の構造:
-- {
--   "baseSize": { "width": 1040, "height": 1040 },
--   "layout": "split_h" | "split_v" | "grid_4" | "cols_3" | "grid_6" | "full" | "custom",
--   "areas": [
--     {
--       "x": 0, "y": 0, "width": 520, "height": 1040,
--       "action": { "type": "uri" | "message", "value": "https://..." }
--     }
--   ]
-- }
