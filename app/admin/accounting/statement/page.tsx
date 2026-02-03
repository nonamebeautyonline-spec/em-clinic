"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

interface CostData {
  totalRevenue: number;
  totalCost: number;
  cardRevenue: number;
  processingFee: number;
  grossProfit: number;
  grossMargin: number;
  orderCount: number;
}

export default function AccountingStatementPage() {
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
  const [data, setData] = useState<FinancialData | null>(null);
  const [costData, setCostData] = useState<CostData | null>(null);

  const loadData = useCallback(async (yearMonth: string) => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    setLoading(true);

    try {
      const [financialRes, costRes] = await Promise.all([
        fetch(`/api/admin/financials?year_month=${yearMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/admin/cost-calculation?year_month=${yearMonth}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (financialRes.ok) {
        const json = await financialRes.json();
        if (json.ok) {
          setData(json.data);
        }
      }

      if (costRes.ok) {
        const costJson = await costRes.json();
        if (costJson.ok) {
          setCostData(costJson.data);
        }
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData(selectedMonth);
  }, [selectedMonth, loadData]);

  // 月選択オプション生成（過去12ヶ月）
  const monthOptions = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    monthOptions.push({ value: val, label });
  }

  // 計算
  const netSales = data?.net_sales || costData?.totalRevenue || 0;
  const costOfGoodsSold = data?.cost_of_goods_sold || data?.drug_purchase || costData?.totalCost || 0;
  const grossProfit = netSales - costOfGoodsSold;

  // 販管費合計
  const sgaExpenses = data
    ? (data.personnel_expense || 0) +
      (data.advertising_expense || 0) +
      (data.packaging_shipping || 0) +
      (data.outsourcing_cost || 0) +
      (data.rent || 0) +
      (data.repairs || 0) +
      (data.supplies || 0) +
      (data.utilities || 0) +
      (data.travel_expense || 0) +
      (data.contractor_fee || 0) +
      (data.taxes_duties || 0) +
      (data.entertainment || 0) +
      (data.insurance || 0) +
      (data.communication || 0) +
      (data.membership_fee || 0) +
      (data.processing_fee || 0) +
      (data.miscellaneous || 0)
    : 0;

  const operatingProfit = grossProfit - sgaExpenses;
  const grossMarginRate = netSales > 0 ? ((grossProfit / netSales) * 100).toFixed(1) : "0.0";
  const operatingMarginRate = netSales > 0 ? ((operatingProfit / netSales) * 100).toFixed(1) : "0.0";

  const formatYen = (value: number) => {
    if (value < 0) {
      return `△¥${Math.abs(value).toLocaleString()}`;
    }
    return `¥${value.toLocaleString()}`;
  };

  const formatMonthLabel = (yearMonth: string) => {
    const [year, month] = yearMonth.split("-");
    return `${year}年${parseInt(month)}月`;
  };

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
            <h1 className="text-2xl font-bold text-slate-900">月次収支表</h1>
            <p className="text-slate-600 text-sm mt-1">損益計算書</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
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
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-100"
          >
            印刷
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow print:shadow-none">
          {/* タイトル */}
          <div className="text-center py-6 border-b">
            <h2 className="text-xl font-bold text-slate-900">損益計算書</h2>
            <p className="text-slate-600 mt-1">{formatMonthLabel(selectedMonth)}</p>
          </div>

          {/* 収支表本体 */}
          <div className="p-6">
            <table className="w-full text-sm">
              <tbody>
                {/* 売上高 */}
                <StatementSection title="売上高" />
                <StatementRow label="純売上高" value={netSales} isTotal />

                {/* 売上原価 */}
                <StatementSection title="売上原価" />
                <StatementRow label="薬品仕入高" value={data?.drug_purchase || 0} />
                <StatementRow
                  label="売上原価計"
                  value={costOfGoodsSold}
                  isSubtotal
                />

                {/* 売上総利益 */}
                <StatementRow
                  label="売上総利益"
                  value={grossProfit}
                  isTotal
                  highlight
                  note={`(粗利率 ${grossMarginRate}%)`}
                />

                {/* 販売費及び一般管理費 */}
                <StatementSection title="販売費及び一般管理費" />
                {data && (
                  <>
                    {data.personnel_expense > 0 && (
                      <StatementRow label="販管人件費" value={data.personnel_expense} />
                    )}
                    {data.advertising_expense > 0 && (
                      <StatementRow label="広告宣伝費" value={data.advertising_expense} />
                    )}
                    {data.packaging_shipping > 0 && (
                      <StatementRow label="荷造運賃" value={data.packaging_shipping} />
                    )}
                    {data.outsourcing_cost > 0 && (
                      <StatementRow label="外注費" value={data.outsourcing_cost} />
                    )}
                    {data.rent > 0 && <StatementRow label="賃借料" value={data.rent} />}
                    {data.repairs > 0 && <StatementRow label="修繕費" value={data.repairs} />}
                    {data.supplies > 0 && (
                      <StatementRow label="消耗品費" value={data.supplies} />
                    )}
                    {data.utilities > 0 && (
                      <StatementRow label="水道光熱費" value={data.utilities} />
                    )}
                    {data.travel_expense > 0 && (
                      <StatementRow label="旅費交通費" value={data.travel_expense} />
                    )}
                    {data.contractor_fee > 0 && (
                      <StatementRow label="業務委託費" value={data.contractor_fee} />
                    )}
                    {data.taxes_duties > 0 && (
                      <StatementRow label="租税公課" value={data.taxes_duties} />
                    )}
                    {data.entertainment > 0 && (
                      <StatementRow label="交際接待費" value={data.entertainment} />
                    )}
                    {data.insurance > 0 && (
                      <StatementRow label="保険料" value={data.insurance} />
                    )}
                    {data.communication > 0 && (
                      <StatementRow label="通信費" value={data.communication} />
                    )}
                    {data.membership_fee > 0 && (
                      <StatementRow label="諸会費" value={data.membership_fee} />
                    )}
                    {data.processing_fee > 0 && (
                      <StatementRow label="支払手数料" value={data.processing_fee} />
                    )}
                    {data.miscellaneous > 0 && (
                      <StatementRow label="雑費" value={data.miscellaneous} />
                    )}
                  </>
                )}
                <StatementRow label="販管費計" value={sgaExpenses} isSubtotal />

                {/* 営業利益 */}
                <StatementRow
                  label="営業利益"
                  value={operatingProfit}
                  isTotal
                  highlight
                  isFinal
                  note={`(営業利益率 ${operatingMarginRate}%)`}
                />
              </tbody>
            </table>
          </div>

          {/* 参考情報 */}
          {costData && (
            <div className="p-6 border-t bg-slate-50 print:hidden">
              <h3 className="text-sm font-bold text-slate-700 mb-3">参考データ（システム自動計算）</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">注文数</div>
                  <div className="font-medium">{costData.orderCount}件</div>
                </div>
                <div>
                  <div className="text-slate-500">カード売上</div>
                  <div className="font-medium">{formatYen(costData.cardRevenue)}</div>
                </div>
                <div>
                  <div className="text-slate-500">カード手数料(3.6%)</div>
                  <div className="font-medium">{formatYen(costData.processingFee)}</div>
                </div>
                <div>
                  <div className="text-slate-500">薬品原価（計算値）</div>
                  <div className="font-medium">{formatYen(costData.totalCost)}</div>
                </div>
              </div>
            </div>
          )}

          {/* メモ */}
          {data?.notes && (
            <div className="p-6 border-t">
              <h3 className="text-sm font-bold text-slate-700 mb-2">メモ</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{data.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StatementSectionProps {
  title: string;
}

function StatementSection({ title }: StatementSectionProps) {
  return (
    <tr>
      <td colSpan={2} className="pt-6 pb-2">
        <div className="text-sm font-bold text-slate-700 border-b border-slate-200 pb-1">
          {title}
        </div>
      </td>
    </tr>
  );
}

interface StatementRowProps {
  label: string;
  value: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  highlight?: boolean;
  isFinal?: boolean;
  note?: string;
}

function StatementRow({
  label,
  value,
  isSubtotal,
  isTotal,
  highlight,
  isFinal,
  note,
}: StatementRowProps) {
  const formatValue = (v: number) => {
    if (v < 0) {
      return `△${Math.abs(v).toLocaleString()}`;
    }
    return v.toLocaleString();
  };

  return (
    <tr
      className={`${highlight ? "bg-blue-50" : ""} ${isFinal ? "border-t-2 border-slate-900" : ""}`}
    >
      <td
        className={`py-2 ${isSubtotal ? "pl-4" : isTotal ? "" : "pl-8"} ${
          isTotal || isSubtotal ? "font-medium" : ""
        }`}
      >
        {label}
        {note && <span className="text-xs text-slate-500 ml-2">{note}</span>}
      </td>
      <td
        className={`py-2 text-right ${isTotal || isSubtotal ? "font-bold" : ""} ${
          value < 0 ? "text-red-600" : ""
        }`}
      >
        ¥{formatValue(value)}
      </td>
    </tr>
  );
}
