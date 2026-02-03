"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface DailyData {
  date: string;
  square: number;
  bank: number;
  refund: number;
  total: number;
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

const defaultData: FinancialData = {
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

export default function AccountingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [data, setData] = useState<FinancialData>({ ...defaultData, year_month: selectedMonth });
  const [recentMonths, setRecentMonths] = useState<FinancialData[]>([]);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [dailySummary, setDailySummary] = useState({ totalSquare: 0, totalBank: 0, totalRefund: 0, totalNet: 0 });
  const [costData, setCostData] = useState<{
    products: { code: string; count: number; revenue: number; cost: number }[];
    totalRevenue: number;
    totalCost: number;
    cardRevenue: number;
    processingFee: number;
    grossProfit: number;
    grossMargin: number;
    orderCount: number;
  } | null>(null);

  const loadData = useCallback(async (yearMonth: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/admin/financials?year_month=${yearMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("データ取得失敗");

      const json = await res.json();
      if (json.ok) {
        setData(json.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadRecentMonths = useCallback(async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch("/api/admin/financials", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setRecentMonths(json.data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const loadDailyData = useCallback(async (yearMonth: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/daily-revenue?year_month=${yearMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setDailyData(json.data);
          setDailySummary(json.summary);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const loadCostData = useCallback(async (yearMonth: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    try {
      const res = await fetch(`/api/admin/cost-calculation?year_month=${yearMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setCostData(json.data);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadData(selectedMonth);
    loadRecentMonths();
    loadDailyData(selectedMonth);
    loadCostData(selectedMonth);
  }, [selectedMonth, loadData, loadRecentMonths, loadDailyData, loadCostData]);

  const handleSave = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/financials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...data, year_month: selectedMonth }),
      });

      if (!res.ok) throw new Error("保存失敗");

      const json = await res.json();
      if (json.ok) {
        setSuccess("保存しました");
        loadRecentMonths();
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof FinancialData, value: number | string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  // 計算値
  const grossProfit = data.net_sales - (data.cost_of_goods_sold || data.drug_purchase);
  const sgaTotal =
    data.personnel_expense +
    data.advertising_expense +
    data.packaging_shipping +
    data.outsourcing_cost +
    data.rent +
    data.repairs +
    data.supplies +
    data.utilities +
    data.travel_expense +
    data.contractor_fee +
    data.taxes_duties +
    data.entertainment +
    data.insurance +
    data.communication +
    data.membership_fee +
    data.processing_fee +
    data.miscellaneous;
  const operatingProfit = grossProfit - sgaTotal;
  const ordinaryProfit = operatingProfit; // 営業外損益がない場合は同じ
  const netIncome = ordinaryProfit; // 特別損益がない場合は同じ

  // 月選択オプション生成（過去12ヶ月）
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    monthOptions.push({ value: val, label });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">経理</h1>
          <p className="text-slate-600 text-sm mt-1">月次損益計算</p>
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

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 日別売上グラフ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">日別売上</h2>
            <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-blue-600 text-xs">カード</div>
                <div className="font-bold text-blue-700">¥{dailySummary.totalSquare.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-green-600 text-xs">銀行振込</div>
                <div className="font-bold text-green-700">¥{dailySummary.totalBank.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="text-red-600 text-xs">返金</div>
                <div className="font-bold text-red-700">-¥{dailySummary.totalRefund.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-slate-100 rounded-lg">
                <div className="text-slate-600 text-xs">純売上</div>
                <div className="font-bold text-slate-900">¥{dailySummary.totalNet.toLocaleString()}</div>
              </div>
            </div>
            <DailyBarChart data={dailyData} />
          </div>

          {/* 売上原価計算 */}
          {costData && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">売上原価計算（自動計算）</h2>

              <div className="mb-6 p-4 bg-slate-50 rounded-lg text-xs text-slate-600">
                <div className="font-bold mb-2">原価設定（2本あたり）:</div>
                <div className="grid grid-cols-3 gap-2">
                  <div>2.5mg: ¥3,848</div>
                  <div>5mg: ¥7,696</div>
                  <div>7.5mg: ¥11,544</div>
                </div>
                <div className="mt-2 text-slate-500">※1ヶ月分=4本, 2ヶ月分=8本, 3ヶ月分=12本</div>
              </div>

              {/* 商品別内訳 */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-700 mb-2">商品別内訳</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="px-3 py-2 text-left">商品</th>
                        <th className="px-3 py-2 text-right">数量</th>
                        <th className="px-3 py-2 text-right">売上</th>
                        <th className="px-3 py-2 text-right">原価</th>
                        <th className="px-3 py-2 text-right">粗利</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costData.products.map((p) => (
                        <tr key={p.code} className="border-b border-slate-100">
                          <td className="px-3 py-2">{p.code}</td>
                          <td className="px-3 py-2 text-right">{p.count}</td>
                          <td className="px-3 py-2 text-right">¥{p.revenue.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-red-600">¥{p.cost.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-green-600">¥{(p.revenue - p.cost).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* サマリー */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="text-xs text-blue-600">売上高</div>
                  <div className="text-lg font-bold text-blue-700">¥{costData.totalRevenue.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="text-xs text-red-600">薬品仕入高</div>
                  <div className="text-lg font-bold text-red-700">¥{costData.totalCost.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <div className="text-xs text-orange-600">決済手数料（3.6%）</div>
                  <div className="text-lg font-bold text-orange-700">¥{costData.processingFee.toLocaleString()}</div>
                  <div className="text-xs text-orange-500">カード売上: ¥{costData.cardRevenue.toLocaleString()}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="text-xs text-green-600">売上総利益（薬品原価のみ）</div>
                  <div className="text-lg font-bold text-green-700">¥{costData.grossProfit.toLocaleString()}</div>
                  <div className="text-xs text-green-500">粗利率: {costData.grossMargin}%</div>
                </div>
              </div>

              {/* 純利益計算 */}
              <div className="mt-4 p-4 bg-slate-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">売上総利益 - 決済手数料</span>
                  <span className="text-lg font-bold text-slate-900">
                    ¥{(costData.grossProfit - costData.processingFee).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* 入力反映ボタン */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setData((prev) => ({
                      ...prev,
                      net_sales: costData.totalRevenue,
                      drug_purchase: costData.totalCost,
                      cost_of_goods_sold: costData.totalCost,
                      processing_fee: costData.processingFee,
                    }));
                    setSuccess("計算結果を入力欄に反映しました");
                    setTimeout(() => setSuccess(""), 3000);
                  }}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700"
                >
                  入力欄に反映
                </button>
              </div>
            </div>
          )}

          {/* 売上 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">売上</h2>
            <div className="space-y-3">
              <InputRow
                label="【純売上高】"
                value={data.net_sales}
                onChange={(v) => handleChange("net_sales", v)}
                highlight="blue"
              />
            </div>
          </div>

          {/* 売上原価 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">売上原価</h2>
            <div className="space-y-3">
              <InputRow
                label="薬品仕入高"
                value={data.drug_purchase}
                onChange={(v) => handleChange("drug_purchase", v)}
              />
              <InputRow
                label="【売上原価】"
                value={data.cost_of_goods_sold || data.drug_purchase}
                onChange={(v) => handleChange("cost_of_goods_sold", v)}
              />
              <DisplayRow label="〔売上総利益〕" value={grossProfit} highlight="green" />
            </div>
          </div>

          {/* 販売費及び一般管理費 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">販売費及び一般管理費</h2>
            <div className="space-y-3">
              <InputRow
                label="（販管人件費）"
                value={data.personnel_expense}
                onChange={(v) => handleChange("personnel_expense", v)}
              />
              <InputRow
                label="広告宣伝費"
                value={data.advertising_expense}
                onChange={(v) => handleChange("advertising_expense", v)}
              />
              <InputRow
                label="荷造運賃"
                value={data.packaging_shipping}
                onChange={(v) => handleChange("packaging_shipping", v)}
              />
              <InputRow
                label="外注費"
                value={data.outsourcing_cost}
                onChange={(v) => handleChange("outsourcing_cost", v)}
              />
              <InputRow
                label="賃借料"
                value={data.rent}
                onChange={(v) => handleChange("rent", v)}
              />
              <InputRow
                label="修繕費"
                value={data.repairs}
                onChange={(v) => handleChange("repairs", v)}
              />
              <InputRow
                label="消耗品費"
                value={data.supplies}
                onChange={(v) => handleChange("supplies", v)}
              />
              <InputRow
                label="水道光熱費"
                value={data.utilities}
                onChange={(v) => handleChange("utilities", v)}
              />
              <InputRow
                label="旅費交通費"
                value={data.travel_expense}
                onChange={(v) => handleChange("travel_expense", v)}
              />
              <InputRow
                label="業務委託費"
                value={data.contractor_fee}
                onChange={(v) => handleChange("contractor_fee", v)}
              />
              <InputRow
                label="租税公課"
                value={data.taxes_duties}
                onChange={(v) => handleChange("taxes_duties", v)}
              />
              <InputRow
                label="交際接待費"
                value={data.entertainment}
                onChange={(v) => handleChange("entertainment", v)}
              />
              <InputRow
                label="保険料"
                value={data.insurance}
                onChange={(v) => handleChange("insurance", v)}
              />
              <InputRow
                label="通信費"
                value={data.communication}
                onChange={(v) => handleChange("communication", v)}
              />
              <InputRow
                label="諸会費"
                value={data.membership_fee}
                onChange={(v) => handleChange("membership_fee", v)}
              />
              <InputRow
                label="支払手数料"
                value={data.processing_fee}
                onChange={(v) => handleChange("processing_fee", v)}
              />
              <InputRow
                label="雑費"
                value={data.miscellaneous}
                onChange={(v) => handleChange("miscellaneous", v)}
              />
              <DisplayRow label="【販売費及び一般管理費】" value={sgaTotal} highlight="orange" />
            </div>
          </div>

          {/* 利益 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">利益</h2>
            <div className="space-y-3">
              <DisplayRow label="〔営業利益〕" value={operatingProfit} highlight={operatingProfit >= 0 ? "green" : "red"} />
              <DisplayRow label="〔経常利益〕" value={ordinaryProfit} highlight={ordinaryProfit >= 0 ? "green" : "red"} />
              <DisplayRow label="〔差引所得〕" value={netIncome} highlight={netIncome >= 0 ? "green" : "red"} />
              <DisplayRow label="〔所得金額〕" value={netIncome} highlight={netIncome >= 0 ? "blue" : "red"} large />
            </div>
          </div>

          {/* メモ */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">メモ</h2>
            <textarea
              value={data.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="備考・メモ"
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>

          {/* 直近の月次サマリー */}
          {recentMonths.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 mt-8">
              <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">直近の月次推移</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left font-medium text-slate-600">月</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">純売上</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">売上原価</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">販管費</th>
                      <th className="px-3 py-2 text-right font-medium text-slate-600">営業利益</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentMonths.map((m) => {
                      const gp = m.net_sales - (m.cost_of_goods_sold || m.drug_purchase);
                      const sga =
                        m.personnel_expense + m.advertising_expense + m.packaging_shipping +
                        m.outsourcing_cost + m.rent + m.repairs + m.supplies + m.utilities +
                        m.travel_expense + m.contractor_fee + m.taxes_duties + m.entertainment +
                        m.insurance + m.communication + m.membership_fee + m.processing_fee + m.miscellaneous;
                      const op = gp - sga;
                      return (
                        <tr key={m.year_month} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium">{m.year_month}</td>
                          <td className="px-3 py-2 text-right">¥{m.net_sales.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">¥{(m.cost_of_goods_sold || m.drug_purchase).toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">¥{sga.toLocaleString()}</td>
                          <td className={`px-3 py-2 text-right font-bold ${op >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ¥{op.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface InputRowProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  highlight?: "blue" | "green" | "orange" | "red";
}

function InputRow({ label, value, onChange, highlight }: InputRowProps) {
  const bgClass = highlight
    ? {
        blue: "bg-blue-50",
        green: "bg-green-50",
        orange: "bg-orange-50",
        red: "bg-red-50",
      }[highlight]
    : "bg-slate-50";

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg ${bgClass}`}>
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-sm text-slate-500">¥</span>
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-32 px-2 py-1 text-right text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

interface DisplayRowProps {
  label: string;
  value: number;
  highlight?: "blue" | "green" | "orange" | "red";
  large?: boolean;
}

function DisplayRow({ label, value, highlight, large }: DisplayRowProps) {
  const colorClass = highlight
    ? {
        blue: "text-blue-700 bg-blue-50 border-blue-200",
        green: "text-green-700 bg-green-50 border-green-200",
        orange: "text-orange-700 bg-orange-50 border-orange-200",
        red: "text-red-700 bg-red-50 border-red-200",
      }[highlight]
    : "text-slate-700 bg-slate-50 border-slate-200";

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${colorClass}`}>
      <span className={`font-medium ${large ? "text-base" : "text-sm"}`}>{label}</span>
      <span className={`font-bold ${large ? "text-xl" : "text-sm"}`}>
        ¥{value.toLocaleString()}
      </span>
    </div>
  );
}

interface DailyBarChartProps {
  data: DailyData[];
}

function DailyBarChart({ data }: DailyBarChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-slate-500">データがありません</div>;
  }

  // 最大値を計算（グラフのスケール用）
  const maxValue = Math.max(...data.map((d) => d.square + d.bank), 1);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px]">
        {/* グラフエリア */}
        <div className="flex items-end gap-1 h-48 border-b border-slate-200 pb-2">
          {data.map((day) => {
            const squareHeight = (day.square / maxValue) * 100;
            const bankHeight = (day.bank / maxValue) * 100;
            const dayNum = parseInt(day.date.split("-")[2]);
            const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6;

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                {/* ツールチップ */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                  <div className="font-bold">{dayNum}日</div>
                  <div>カード: ¥{day.square.toLocaleString()}</div>
                  <div>振込: ¥{day.bank.toLocaleString()}</div>
                  {day.refund > 0 && <div className="text-red-300">返金: -¥{day.refund.toLocaleString()}</div>}
                  <div className="border-t border-slate-600 mt-1 pt-1">純売上: ¥{day.total.toLocaleString()}</div>
                </div>
                {/* バー */}
                <div className="w-full flex flex-col justify-end" style={{ height: "160px" }}>
                  {/* 銀行振込 */}
                  {bankHeight > 0 && (
                    <div
                      className="w-full bg-green-400 rounded-t-sm"
                      style={{ height: `${bankHeight}%`, minHeight: bankHeight > 0 ? "2px" : 0 }}
                    />
                  )}
                  {/* カード決済 */}
                  {squareHeight > 0 && (
                    <div
                      className="w-full bg-blue-500"
                      style={{ height: `${squareHeight}%`, minHeight: squareHeight > 0 ? "2px" : 0 }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {/* 日付ラベル */}
        <div className="flex gap-1 mt-1">
          {data.map((day) => {
            const dayNum = parseInt(day.date.split("-")[2]);
            const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6;
            return (
              <div
                key={day.date}
                className={`flex-1 text-center text-xs ${isWeekend ? "text-red-500" : "text-slate-500"}`}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
        {/* 凡例 */}
        <div className="flex justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
            <span className="text-slate-600">カード</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <span className="text-slate-600">銀行振込</span>
          </div>
        </div>
      </div>
    </div>
  );
}
