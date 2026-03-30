-- =============================================================
-- Phase 0: Cost Guard / Anti-Spam マイグレーション
-- 2026-03-30
-- =============================================================

-- ai_reply_settings にコスト防御関連カラムを追加
ALTER TABLE ai_reply_settings
  ADD COLUMN IF NOT EXISTS debounce_sec INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS daily_cost_limit_usd NUMERIC(8,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS rate_limit_30s INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS rate_limit_1h INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS spam_filter_enabled BOOLEAN DEFAULT true;
