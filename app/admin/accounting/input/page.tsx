"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface CostData {
  totalRevenue: number;
  totalCost: number;
  cardRevenue: number;
  processingFee: number;
  grossProfit: number;
  grossMargin: number;
  orderCount: number;
  products: { code: string; count: number; revenue: number; cost: number }[];
}

interface FinancialData {
  year_month: string;
  net_sales: number;
  drug_purchase: number;
  cost_of_goods_sold: number;
  personnel_expense: number;
  advertising_expense: number;
  packaging_shipping: number;
  outsourcing_cost: number;
  rent: number;
  repairs: number;
  supplies: number;
  utilities: number;
  travel_expense: number;
  contractor_fee: number;
  taxes_duties: number;
  entertainment: number;
  insurance: number;
  communication: number;
  membership_fee: number;
  processing_fee: number;
  miscellaneous: number;
  notes: string;
}

const defaultFinancialData: FinancialData = {
  year_month: "",
  net_sales: 0,
  drug_purchase: 0,
  cost_of_goods_sold: 0,
  personnel_expense: 0,
  advertising_expense: 0,
  packaging_shipping: 0,
  outsourcing_cost: 0,
  rent: 0,
  repairs: 0,
  supplies: 0,
  utilities: 0,
  travel_expense: 0,
  contractor_fee: 0,
  taxes_duties: 0,
  entertainment: 0,
  insurance: 0,
  communication: 0,
  membership_fee: 0,
  processing_fee: 0,
  miscellaneous: 0,
  notes: "",
};

export default function AccountingInputPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const monthParam = searchParams.get("month");

  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      return monthParam;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [costData, setCostData] = useState<CostData | null>(null);
  const [formData, setFormData] = useState<FinancialData>(defaultFinancialData);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = useCallback(async (yearMonth: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // コスト計算データと保存済みデータを並行取得
      const [costRes, financialRes] = await Promise.all([
        fetch(`/api/admin/cost-calculation?year_month=${yearMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/financials?year_month=${yearMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (costRes.ok) {
        const costJson = await costRes.json();
        if (costJson.ok) {
          setCostData(costJson.data);
        }
      }

      if (financialRes.ok) {
        const financialJson = await financialRes.json();
        if (financialJson.ok) {
          setFormData({ ...defaultFinancialData, ...financialJson.data, year_month: yearMonth });
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      setMessage({ type: "error", text: "データの読み込みに失敗しました" });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData(selectedMonth);
  }, [selectedMonth, loadData]);

  const handleSave = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/financials", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, year_month: selectedMonth }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setMessage({ type: "success", text: "保存しました" });
        } else {
          setMessage({ type: "error", text: "保存に失敗しました" });
        }
      } else {
        setMessage({ type: "error", text: "保存に失敗しました" });
      }
    } catch (err) {
      console.error("Failed to save:", err);
      setMessage({ type: "error", text: "保存に失敗しました" });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof FinancialData, value: string) => {
    const numericValue = parseInt(value.replace(/,/g, ""), 10) || 0;
    setFormData((prev) => ({ ...prev, [field]: numericValue }));
  };

  const handleNotesChange = (value: string) => {
    setFormData((prev) => ({ ...prev, notes: value }));
  };

  // 原価計算値をフォームに反映
  const applyCostData = () => {
    if (costData) {
      setFormData((prev) => ({
        ...prev,
        net_sales: costData.totalRevenue,
        drug_purchase: costData.totalCost,
        processing_fee: costData.processingFee,
      }));
    }
  };

  // 月選択オプション生成（過去12ヶ月）
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    monthOptions.push({ value: val, label });
  }

  const formatYen = (value: number) => `¥${value.toLocaleString()}`;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/admin/accounting")}
            className="text-slate-600 hover:text-slate-900"
          >
            ← 戻る
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">月次詳細入力</h1>
            <p className="text-slate-600 text-sm mt-1">売上原価・経費の入力</p>
          </div>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {monthOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* メッセージ */}
          {message && (
            <div
              className={`p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* 自動計算データ（参考値） */}
          {costData && (
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-blue-900">システム自動計算（参考値）</h2>
                <button
                  onClick={applyCostData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  下の入力欄に反映
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-blue-600">総売上</div>
                  <div className="font-bold text-blue-900">{formatYen(costData.totalRevenue)}</div>
                </div>
                <div>
                  <div className="text-blue-600">薬品原価</div>
                  <div className="font-bold text-blue-900">{formatYen(costData.totalCost)}</div>
                </div>
                <div>
                  <div className="text-blue-600">カード手数料(3.6%)</div>
                  <div className="font-bold text-blue-900">{formatYen(costData.processingFee)}</div>
                </div>
                <div>
                  <div className="text-blue-600">注文数</div>
                  <div className="font-bold text-blue-900">{costData.orderCount}件</div>
                </div>
              </div>
            </div>
          )}

          {/* 売上セクション */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">売上</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="純売上高"
                value={formData.net_sales}
                onChange={(v) => handleInputChange("net_sales", v)}
              />
            </div>
          </div>

          {/* 売上原価セクション */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">売上原価</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="薬品仕入高"
                value={formData.drug_purchase}
                onChange={(v) => handleInputChange("drug_purchase", v)}
              />
              <InputField
                label="売上原価（計）"
                value={formData.cost_of_goods_sold}
                onChange={(v) => handleInputChange("cost_of_goods_sold", v)}
                hint="上記と同じなら空欄可"
              />
            </div>
          </div>

          {/* 販売費及び一般管理費セクション */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">販売費及び一般管理費</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InputField
                label="販管人件費"
                value={formData.personnel_expense}
                onChange={(v) => handleInputChange("personnel_expense", v)}
              />
              <InputField
                label="広告宣伝費"
                value={formData.advertising_expense}
                onChange={(v) => handleInputChange("advertising_expense", v)}
              />
              <InputField
                label="荷造運賃"
                value={formData.packaging_shipping}
                onChange={(v) => handleInputChange("packaging_shipping", v)}
              />
              <InputField
                label="外注費"
                value={formData.outsourcing_cost}
                onChange={(v) => handleInputChange("outsourcing_cost", v)}
              />
              <InputField
                label="賃借料"
                value={formData.rent}
                onChange={(v) => handleInputChange("rent", v)}
              />
              <InputField
                label="修繕費"
                value={formData.repairs}
                onChange={(v) => handleInputChange("repairs", v)}
              />
              <InputField
                label="消耗品費"
                value={formData.supplies}
                onChange={(v) => handleInputChange("supplies", v)}
              />
              <InputField
                label="水道光熱費"
                value={formData.utilities}
                onChange={(v) => handleInputChange("utilities", v)}
              />
              <InputField
                label="旅費交通費"
                value={formData.travel_expense}
                onChange={(v) => handleInputChange("travel_expense", v)}
              />
              <InputField
                label="業務委託費"
                value={formData.contractor_fee}
                onChange={(v) => handleInputChange("contractor_fee", v)}
              />
              <InputField
                label="租税公課"
                value={formData.taxes_duties}
                onChange={(v) => handleInputChange("taxes_duties", v)}
              />
              <InputField
                label="交際接待費"
                value={formData.entertainment}
                onChange={(v) => handleInputChange("entertainment", v)}
              />
              <InputField
                label="保険料"
                value={formData.insurance}
                onChange={(v) => handleInputChange("insurance", v)}
              />
              <InputField
                label="通信費"
                value={formData.communication}
                onChange={(v) => handleInputChange("communication", v)}
              />
              <InputField
                label="諸会費"
                value={formData.membership_fee}
                onChange={(v) => handleInputChange("membership_fee", v)}
              />
              <InputField
                label="支払手数料"
                value={formData.processing_fee}
                onChange={(v) => handleInputChange("processing_fee", v)}
              />
              <InputField
                label="雑費"
                value={formData.miscellaneous}
                onChange={(v) => handleInputChange("miscellaneous", v)}
              />
            </div>
          </div>

          {/* メモ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">メモ</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="備考など"
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => router.push("/admin/accounting")}
              className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (value: string) => void;
  hint?: string;
}

function InputField({ label, value, onChange, hint }: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
        {hint && <span className="text-xs text-slate-400 ml-2">({hint})</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">¥</span>
        <input
          type="text"
          value={value === 0 ? "" : value.toLocaleString()}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
          placeholder="0"
        />
      </div>
    </div>
  );
}
