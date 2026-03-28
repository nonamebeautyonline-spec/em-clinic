// 銀行振込照合ページの型定義

export interface MatchedItem {
  transfer: {
    date: string;
    description: string;
    amount: number;
  };
  order: {
    patient_id: string;
    product_code: string;
    amount: number;
    created_at?: string;
  };
  newPaymentId: string;
  updateSuccess: boolean;
}

export interface AmountMismatchItem {
  transfer: {
    date: string;
    description: string;
    amount: number;
  };
  order: {
    id: string;
    patient_id: string;
    product_code: string;
    product_name?: string;
    amount: number;
    created_at?: string;
  };
  difference: number;
}

export interface UnmatchedItem {
  date: string;
  description: string;
  amount: number;
  reason: string;
}

export interface SplitMatchedGroup {
  transfers: Array<{ date: string; description: string; amount: number }>;
  order: {
    patient_id: string;
    product_code: string;
    amount: number;
  };
  totalAmount: number;
}

export interface ReconcileResult {
  mode?: "order_based" | "statement_based";
  matched: MatchedItem[];
  splitMatched?: SplitMatchedGroup[];
  amountMismatch?: AmountMismatchItem[];
  unmatched: UnmatchedItem[];
  summary: {
    total: number;
    matched: number;
    splitMatched?: number;
    amountMismatch?: number;
    unmatched: number;
    updated: number;
  };
  debug?: {
    csvTransfers: Array<{ date: string; description: string; amount: number; descNormalized: string }>;
    pendingOrders: Array<{ id: string; patient_id: string; amount: number; account_name: string; accountNormalized: string }>;
    totalTransfers: number;
    totalPendingOrders: number;
  };
}

export interface BankStatement {
  id: number;
  transaction_date: string;
  description: string;
  deposit: number;
  withdrawal: number;
  balance: number | null;
  reconciled: boolean;
  matched_order_id: string | null;
  csv_filename: string;
  uploaded_at: string;
}

export interface PendingOrder {
  id: string;
  patient_id: string;
  patient_name: string;
  product_code: string;
  product_name: string;
  amount: number;
  shipping_name: string;
  account_name: string;
  address: string;
  postal_code: string;
  phone: string;
  created_at: string;
  status: string;
}

export interface Product {
  code: string;
  title: string;
  price: number;
}

export interface UnlinkedOrder {
  id: string;
  patient_id: string;
  amount: number;
  account_name: string;
  shipping_name: string;
  product_code: string;
  created_at: string;
}
