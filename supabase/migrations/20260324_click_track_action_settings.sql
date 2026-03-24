-- クリック計測リンクにアクション設定カラム追加
ALTER TABLE click_tracking_links ADD COLUMN IF NOT EXISTS action_settings JSONB DEFAULT '{"enabled": false, "steps": []}'::jsonb;

-- クリックイベントに患者紐付けカラム追加
ALTER TABLE click_tracking_events ADD COLUMN IF NOT EXISTS line_uid VARCHAR(100);
ALTER TABLE click_tracking_events ADD COLUMN IF NOT EXISTS patient_id VARCHAR(50);
