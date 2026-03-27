-- billing_invoices テーブルに不足カラムを追加
-- generate-invoice.ts が使用する invoice_number, stripe_invoice_id, total_amount
-- 実行日: 2026-03-27

-- 請求書番号（Stripeの invoice.number または自動生成）
ALTER TABLE billing_invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- Stripe請求書ID（Webhook連携・照合用）
ALTER TABLE billing_invoices ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;

-- 税込合計金額（amount + tax_amount の冗長保存、集計・表示用）
ALTER TABLE billing_invoices ADD COLUMN IF NOT EXISTS total_amount INT;

-- stripe_invoice_id で検索するためのインデックス
CREATE INDEX IF NOT EXISTS idx_billing_invoices_stripe ON billing_invoices(stripe_invoice_id) WHERE stripe_invoice_id IS NOT NULL;
