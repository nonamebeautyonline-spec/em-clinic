-- 問い合わせフォームの流入元トラッキング用カラム追加
ALTER TABLE inquiries
  ADD COLUMN IF NOT EXISTS referrer_page text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

COMMENT ON COLUMN inquiries.referrer_page IS '問い合わせ元ページ（例: /lp/column/clinic-line-case-studies）';
COMMENT ON COLUMN inquiries.utm_source IS 'UTMソース（例: google, twitter）';
COMMENT ON COLUMN inquiries.utm_medium IS 'UTMメディア（例: cpc, organic）';
COMMENT ON COLUMN inquiries.utm_campaign IS 'UTMキャンペーン名';
