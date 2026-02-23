-- ライフサイクルイベント設定を friend_add_settings に追加
-- 個人情報入力完了時・電話番号認証完了時のアクション設定
-- 注意: tenant_id は手動で設定する必要がある（既存テナントのIDを指定）
INSERT INTO friend_add_settings (setting_key, setting_value, enabled) VALUES
  ('personal_info_completed', '{"steps":[]}', FALSE),
  ('verification_completed', '{"steps":[]}', FALSE)
ON CONFLICT (setting_key) DO NOTHING;
