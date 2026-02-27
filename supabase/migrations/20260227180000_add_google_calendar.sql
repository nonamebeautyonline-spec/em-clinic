-- Google Calendar連携用カラムをdoctorsテーブルに追加
-- 医師ごとにGoogleカレンダーのOAuth2トークンとカレンダーIDを保持する

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS google_calendar_id TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS google_access_token TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS google_token_expires_at TIMESTAMPTZ;

COMMENT ON COLUMN doctors.google_calendar_id IS 'GoogleカレンダーID（例: primary, user@gmail.com）';
COMMENT ON COLUMN doctors.google_access_token IS 'Google OAuth2 アクセストークン';
COMMENT ON COLUMN doctors.google_refresh_token IS 'Google OAuth2 リフレッシュトークン';
COMMENT ON COLUMN doctors.google_token_expires_at IS 'アクセストークンの有効期限';
