-- 配信別CVR算出用RPC関数
-- N+1クエリ（配信ごとに個別ordersカウント）を一括取得に置換
-- インデックス idx_orders_tenant_paid_at は 20260319_dashboard_stats_rpcs.sql で作成済み

CREATE OR REPLACE FUNCTION broadcast_cvr_stats(
  p_tenant_id uuid,
  p_broadcast_ids bigint[],
  p_window_hours int DEFAULT 48
)
RETURNS TABLE (broadcast_id bigint, order_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    b.id AS broadcast_id,
    COUNT(o.id) AS order_count
  FROM unnest(p_broadcast_ids) AS bid(id)
  JOIN broadcasts b ON b.id = bid.id
  LEFT JOIN orders o
    ON o.tenant_id = p_tenant_id
    AND o.paid_at >= COALESCE(b.sent_at, b.created_at)
    AND o.paid_at <= COALESCE(b.sent_at, b.created_at) + (p_window_hours || ' hours')::interval
  WHERE b.tenant_id = p_tenant_id
  GROUP BY b.id;
$$
SET search_path = 'public';
