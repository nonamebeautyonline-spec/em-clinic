-- coupons テーブルに RLS を有効化
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- coupons: service_role のみフルアクセス
CREATE POLICY service_role_full_access ON coupons
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- coupon_issues テーブルに RLS を有効化
ALTER TABLE coupon_issues ENABLE ROW LEVEL SECURITY;

-- coupon_issues: service_role のみフルアクセス
CREATE POLICY service_role_full_access ON coupon_issues
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
