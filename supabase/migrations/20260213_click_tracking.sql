-- クリック計測リンク
CREATE TABLE IF NOT EXISTS click_tracking_links (
  id SERIAL PRIMARY KEY,
  tracking_code VARCHAR(20) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  label VARCHAR(200),
  broadcast_id INTEGER REFERENCES broadcasts(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_click_tracking_links_code ON click_tracking_links(tracking_code);

-- クリックイベント
CREATE TABLE IF NOT EXISTS click_tracking_events (
  id SERIAL PRIMARY KEY,
  link_id INTEGER NOT NULL REFERENCES click_tracking_links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  user_agent TEXT,
  ip_address VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_click_events_link_id ON click_tracking_events(link_id);

-- RLSポリシー
ALTER TABLE click_tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_click_links" ON click_tracking_links FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_click_events" ON click_tracking_events FOR ALL USING (auth.role() = 'service_role');
