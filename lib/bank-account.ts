// lib/bank-account.ts — 銀行口座の型定義・定数

export interface BankAccount {
  id: string;
  bank_name: string;
  bank_branch: string;
  bank_account_type: string;
  bank_account_number: string;
  bank_account_holder: string;
}

export const BANK_ACCOUNT_FIELDS = [
  { key: "bank_name" as const, label: "銀行名", placeholder: "例: 住信SBIネット銀行" },
  { key: "bank_branch" as const, label: "支店名", placeholder: "例: 法人第一支店（106）" },
  { key: "bank_account_type" as const, label: "口座種別", placeholder: "例: 普通" },
  { key: "bank_account_number" as const, label: "口座番号", placeholder: "例: 1234567" },
  { key: "bank_account_holder" as const, label: "口座名義", placeholder: "例: カ）コブシ" },
] as const;

/** デフォルト口座（住信SBI） */
export const DEFAULT_BANK_ACCOUNT: BankAccount = {
  id: "acc_default_sbi",
  bank_name: "住信SBIネット銀行",
  bank_branch: "法人第一支店（106）",
  bank_account_type: "普通",
  bank_account_number: "2931048",
  bank_account_holder: "カ）コブシ",
};
