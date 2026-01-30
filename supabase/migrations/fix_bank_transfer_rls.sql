-- Fix RLS policies for bank_transfer_orders
-- Allow anonymous inserts for bank transfer orders

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own bank transfer orders" ON bank_transfer_orders;
DROP POLICY IF EXISTS "Anyone can insert bank transfer orders" ON bank_transfer_orders;
DROP POLICY IF EXISTS "Service role can update bank transfer orders" ON bank_transfer_orders;

-- Recreate with correct permissions
-- SELECT: 患者は自分のレコードのみ、service_roleは全て
CREATE POLICY "Users can view their own bank transfer orders"
  ON bank_transfer_orders
  FOR SELECT
  USING (
    auth.uid()::text = patient_id
    OR auth.role() = 'service_role'
    OR auth.role() = 'anon'  -- Anonymous can view (for API)
  );

-- INSERT: 誰でも挿入可能（匿名含む）
CREATE POLICY "Allow all inserts"
  ON bank_transfer_orders
  FOR INSERT
  TO public, anon, authenticated
  WITH CHECK (true);

-- UPDATE: service_roleのみ
CREATE POLICY "Service role can update bank transfer orders"
  ON bank_transfer_orders
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- DELETE: service_roleのみ
CREATE POLICY "Service role can delete bank transfer orders"
  ON bank_transfer_orders
  FOR DELETE
  TO service_role
  USING (true);
