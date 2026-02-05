"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface DailyData {
  date: string;
  square: number;
  bank: number;
  refund: number;
  total: number;
  squareCount: number;
  bankCount: number;
}

interface TodaySummary {
  totalSquare: number;
  totalBank: number;
  totalRefund: number;
  totalNet: number;
  squareCount: number;
  bankCount: number;
}

export default function AccountingPage() {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [dailySummary, setDailySummary] = useState({
    totalSquare: 0,
    totalBank: 0,
    totalRefund: 0,
    totalNet: 0,
    totalSquareCount: 0,
    totalBankCount: 0,
    totalCount: 0,
    avgOrderValue: 0,
  });
  const [todaySummary, setTodaySummary] = useState<TodaySummary>({
    totalSquare: 0,
    totalBank: 0,
    totalRefund: 0,
    totalNet: 0,
    squareCount: 0,
    bankCount: 0,
  });

  const loadDailyData = useCallback(async (yearMonth: string) => {
    try {
      const res = await fetch(`/api/admin/daily-revenue?year_month=${yearMonth}`, {
        credentials: "include",
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

  const loadSelectedDateData = useCallback(async (dateStr: string) => {
    try {
      const res = await fetch(`/api/admin/daily-revenue?year_month=${dateStr.slice(0, 7)}`, {
        credentials: "include",
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          const dateData = json.data.find((d: DailyData) => d.date === dateStr);
          if (dateData) {
            setTodaySummary({
              totalSquare: dateData.square,
              totalBank: dateData.bank,
              totalRefund: dateData.refund,
              totalNet: dateData.total,
              squareCount: dateData.squareCount,
              bankCount: dateData.bankCount,
            });
          } else {
            // データがない日
            setTodaySummary({
              totalSquare: 0,
              totalBank: 0,
              totalRefund: 0,
              totalNet: 0,
              squareCount: 0,
              bankCount: 0,
            });
          }
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadDailyData(selectedMonth);
  }, [selectedMonth, loadDailyData]);

  useEffect(() => {
    loadSelectedDateData(selectedDate);
  }, [selectedDate, loadSelectedDateData]);

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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* 日次サマリー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-bold text-slate-900">日別サマリー</h2>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-xs mb-1">カード決済</div>
            <div className="text-xl font-bold text-blue-700">¥{todaySummary.totalSquare.toLocaleString()}</div>
            <div className="text-xs text-blue-500 mt-1">{todaySummary.squareCount}件</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 text-xs mb-1">銀行振込</div>
            <div className="text-xl font-bold text-green-700">¥{todaySummary.totalBank.toLocaleString()}</div>
            <div className="text-xs text-green-500 mt-1">{todaySummary.bankCount}件</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-red-600 text-xs mb-1">返金</div>
            <div className="text-xl font-bold text-red-700">-¥{todaySummary.totalRefund.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-slate-100 rounded-lg">
            <div className="text-slate-600 text-xs mb-1">純売上</div>
            <div className="text-xl font-bold text-slate-900">¥{todaySummary.totalNet.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 月次サマリー */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4 border-b pb-2">
          <h2 className="text-lg font-bold text-slate-900">月次サマリー</h2>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-blue-600 text-xs mb-1">カード決済</div>
            <div className="text-xl font-bold text-blue-700">¥{dailySummary.totalSquare.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-green-600 text-xs mb-1">銀行振込</div>
            <div className="text-xl font-bold text-green-700">¥{dailySummary.totalBank.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-red-600 text-xs mb-1">返金</div>
            <div className="text-xl font-bold text-red-700">-¥{dailySummary.totalRefund.toLocaleString()}</div>
          </div>
          <div className="p-4 bg-slate-100 rounded-lg">
            <div className="text-slate-600 text-xs mb-1">純売上</div>
            <div className="text-xl font-bold text-slate-900">¥{dailySummary.totalNet.toLocaleString()}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-purple-600 text-xs mb-1">決済数</div>
            <div className="text-xl font-bold text-purple-700">
              {dailySummary.totalCount.toLocaleString()}件
              <span className="text-xs font-normal ml-2 text-purple-500">
                (カード{dailySummary.totalSquareCount} / 振込{dailySummary.totalBankCount})
              </span>
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-orange-600 text-xs mb-1">顧客単価</div>
            <div className="text-xl font-bold text-orange-700">¥{dailySummary.avgOrderValue.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* 日別売上グラフ */}
      <div className="bg-white rounded-lg shadow p-6 overflow-visible">
        <h2 className="text-lg font-bold text-slate-900 mb-4 border-b pb-2">日別売上</h2>
        <DailyBarChart data={dailyData} />
      </div>

      {/* アクションボタン */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => router.push(`/admin/accounting/input?month=${selectedMonth}`)}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-blue-500 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">📝</span>
            <div>
              <div className="text-lg font-bold text-slate-900">月次詳細入力</div>
              <div className="text-sm text-slate-600">売上原価・経費の入力</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push(`/admin/accounting/statement?month=${selectedMonth}`)}
          className="p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-2 border-green-500 text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <div className="text-lg font-bold text-slate-900">収支表</div>
              <div className="text-sm text-slate-600">月次損益計算書</div>
            </div>
          </div>
        </button>
      </div>
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

  const maxValue = Math.max(...data.map((d) => d.square + d.bank), 1);

  return (
    <div className="overflow-x-auto overflow-y-visible">
      <div className="min-w-[800px] pt-24">
        <div className="flex items-end gap-1 h-48 border-b border-slate-200 pb-2 relative">
          {data.map((day) => {
            const squareHeight = (day.square / maxValue) * 100;
            const bankHeight = (day.bank / maxValue) * 100;
            const dayNum = parseInt(day.date.split("-")[2]);
            const totalCount = day.squareCount + day.bankCount;

            return (
              <div key={day.date} className="flex-1 flex flex-col items-center group relative">
                <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-20 shadow-lg">
                  <div className="font-bold">{dayNum}日</div>
                  <div>カード: ¥{day.square.toLocaleString()} ({day.squareCount}件)</div>
                  <div>振込: ¥{day.bank.toLocaleString()} ({day.bankCount}件)</div>
                  {day.refund > 0 && <div className="text-red-300">返金: -¥{day.refund.toLocaleString()}</div>}
                  <div className="border-t border-slate-600 mt-1 pt-1">純売上: ¥{day.total.toLocaleString()}</div>
                  <div className="text-slate-300">計{totalCount}件</div>
                </div>
                <div className="w-full flex flex-col justify-end" style={{ height: "160px" }}>
                  {bankHeight > 0 && (
                    <div
                      className="w-full bg-green-400 rounded-t-sm"
                      style={{ height: `${bankHeight}%`, minHeight: bankHeight > 0 ? "2px" : 0 }}
                    />
                  )}
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
