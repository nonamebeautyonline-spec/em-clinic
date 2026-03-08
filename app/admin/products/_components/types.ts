// 商品管理ファイルマネージャーの共通型定義

export type ProductCategory = {
  id: string;
  tenant_id: string | null;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Product = {
  id: string;
  code: string;
  title: string;
  drug_name: string;
  dosage: string | null;
  duration_months: number | null;
  quantity: number | null;
  price: number;
  is_active: boolean;
  sort_order: number;
  category: string;
  category_id: string | null;
  image_url: string | null;
  stock_quantity: number | null;
  discount_price: number | null;
  discount_until: string | null;
  description: string | null;
  parent_id: string | null;
  stock_alert_threshold: number | null;
  stock_alert_enabled: boolean;
};

export type DragItem = {
  id: string;
  type: "folder" | "product";
};
