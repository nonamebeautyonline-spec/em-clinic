"use client";

// ダッシュボード円グラフウィジェット
// 1. 患者ファネル 2. 新規/再処方 3. 予約結果内訳

import useSWR from "swr";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ファネルの色（ステップ順にグラデーション）
const FUNNEL_COLORS = [
  "#94A3B8", // LINE追加のみ — グレー
  "#60A5FA", // 個人情報入力済み — ライトブルー
  "#3B82F6", // 電話番号認証済み — ブルー
  "#8B5CF6", // 問診済み — パープル
  "#F59E0B", // 予約済み — アンバー
  "#10B981", // 診察済み — エメラルド
  "#059669", // 決済済み — グリーン
];

// 処方の色
const PRESCRIPTION_COLORS = ["#3B82F6", "#F97316"]; // ブルー, オレンジ

// 決済方法の色
const PAYMENT_COLORS = ["#6366F1", "#F59E0B"]; // インディゴ（カード）, アンバー（振込）

interface FunnelItem {
  label: string;
  count: number;
}

interface PieChartData {
  funnel: FunnelItem[];
  prescription: { newPrescription: number; rePrescription: number };
  paymentMethod: { creditCard: number; bankTransfer: number; creditCardAmount: number; bankTransferAmount: number };
}

// カスタムツールチップ
function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; value: number; color: string; percent?: number } }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="font-semibold text-slate-900">{data.name}</span>
      </div>
      <div className="mt-1 text-slate-600">
        {data.value.toLocaleString()}人
        {data.percent !== undefined && ` (${(data.percent * 100).toFixed(1)}%)`}
      </div>
    </div>
  );
}

// 決済方法ツールチップ（金額付き）
function PaymentTooltip({ active, payload, creditCardAmount, bankTransferAmount }: {
  active?: boolean;
  payload?: { payload: { name: string; value: number; color: string; percent?: number } }[];
  creditCardAmount: number;
  bankTransferAmount: number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  const amount = data.name === "銀行振込" ? bankTransferAmount : creditCardAmount;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
        <span className="font-semibold text-slate-900">{data.name}</span>
      </div>
      <div className="mt-1 space-y-0.5 text-slate-600">
        <div>{data.value.toLocaleString()}件{data.percent !== undefined && ` (${(data.percent * 100).toFixed(1)}%)`}</div>
        <div>¥{amount.toLocaleString()}</div>
      </div>
    </div>
  );
}

// カスタムラベル（円グラフ内に人数表示）
function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }: {
  cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; value?: number; percent?: number;
}) {
  if (!percent || percent < 0.05) return null; // 5%未満は非表示
  if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {value}
    </text>
  );
}

// 凡例レンダラー — recharts の Legend content prop に渡すため any 型を使用
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderLegend(props: any) {
  const payload = props?.payload as { value: string; color: string; payload?: { value: number } }[] | undefined;
  if (!payload) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 text-xs">
      {payload.map((entry: { value: string; color: string; payload?: { value: number } }, i: number) => (
        <div key={i} className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-600">{entry.value}</span>
          <span className="text-slate-400 font-medium">{entry.payload?.value ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

// 個別の円グラフカード
function PieChartCard({ title, subtitle, children, isEmpty }: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 flex flex-col">
      <div className="mb-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {isEmpty ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
          データがありません
        </div>
      ) : (
        <div className="flex-1 min-h-0">{children}</div>
      )}
    </div>
  );
}

export default function PieChartsWidget() {
  const { data, error, isLoading } = useSWR<PieChartData>("/api/admin/dashboard-pie-charts");

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse">
            <div className="h-4 w-32 bg-slate-200 rounded mb-4" />
            <div className="h-52 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
        円グラフの読み込みに失敗しました
      </div>
    );
  }

  if (!data) return null;

  // ファネルデータ変換
  const funnelData = data.funnel.map((item, i) => ({
    name: item.label,
    value: item.count,
    color: FUNNEL_COLORS[i],
  }));
  const funnelTotal = funnelData.reduce((sum, d) => sum + d.value, 0);
  const funnelDataWithPercent = funnelData.map(d => ({
    ...d,
    percent: funnelTotal > 0 ? d.value / funnelTotal : 0,
  }));

  // 処方データ変換
  const prescriptionData = [
    { name: "新規処方", value: data.prescription.newPrescription, color: PRESCRIPTION_COLORS[0] },
    { name: "再処方", value: data.prescription.rePrescription, color: PRESCRIPTION_COLORS[1] },
  ];
  const prescriptionTotal = prescriptionData.reduce((sum, d) => sum + d.value, 0);
  const prescriptionDataWithPercent = prescriptionData.map(d => ({
    ...d,
    percent: prescriptionTotal > 0 ? d.value / prescriptionTotal : 0,
  }));

  // 決済方法データ変換
  const paymentData = [
    { name: "クレジットカード", value: data.paymentMethod.creditCard, color: PAYMENT_COLORS[0] },
    { name: "銀行振込", value: data.paymentMethod.bankTransfer, color: PAYMENT_COLORS[1] },
  ];
  const paymentTotal = paymentData.reduce((sum, d) => sum + d.value, 0);
  const paymentDataWithPercent = paymentData.map(d => ({
    ...d,
    percent: paymentTotal > 0 ? d.value / paymentTotal : 0,
  }));
  const totalAmount = data.paymentMethod.creditCardAmount + data.paymentMethod.bankTransferAmount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. 患者ファネル */}
      <PieChartCard
        title="患者ファネル"
        subtitle={`全${funnelTotal.toLocaleString()}人`}
        isEmpty={funnelTotal === 0}
      >
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={funnelDataWithPercent}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              outerRadius={80}
              labelLine={false}
              label={renderLabel}
            >
              {funnelDataWithPercent.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </PieChartCard>

      {/* 2. 今月の新規処方 vs 再処方 */}
      <PieChartCard
        title="今月の処方内訳"
        subtitle={`合計${prescriptionTotal.toLocaleString()}人`}
        isEmpty={prescriptionTotal === 0}
      >
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={prescriptionDataWithPercent}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              outerRadius={80}
              labelLine={false}
              label={renderLabel}
            >
              {prescriptionDataWithPercent.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </PieChartCard>

      {/* 3. 今月の決済方法内訳 */}
      <PieChartCard
        title="今月の決済方法"
        subtitle={`${paymentTotal.toLocaleString()}件 / ¥${totalAmount.toLocaleString()}`}
        isEmpty={paymentTotal === 0}
      >
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={paymentDataWithPercent}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              outerRadius={80}
              labelLine={false}
              label={renderLabel}
            >
              {paymentDataWithPercent.map((entry, i) => (
                <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip content={<PaymentTooltip creditCardAmount={data.paymentMethod.creditCardAmount} bankTransferAmount={data.paymentMethod.bankTransferAmount} />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </PieChartCard>
    </div>
  );
}
