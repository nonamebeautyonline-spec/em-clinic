export interface ConversionCardProps {
  title: string;
  rate: number;
  description: string;
}

export function ConversionCard({ title, rate, description }: ConversionCardProps) {
  const getRateColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-500";
    if (rate >= 60) return "text-amber-500";
    return "text-red-400";
  };

  const getBarColor = (rate: number) => {
    if (rate >= 80) return "bg-emerald-400";
    if (rate >= 60) return "bg-amber-400";
    return "bg-red-300";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md hover:shadow-slate-100 transition-all duration-200">
      <p className="text-[13px] font-medium text-slate-400 mb-3">{title}</p>
      <div className="flex items-end gap-3 mb-3">
        <p className={`text-[32px] font-bold leading-none tracking-tight ${getRateColor(rate)}`}>{rate}<span className="text-lg">%</span></p>
      </div>
      {/* ミニプログレスバー */}
      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(rate)}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <p className="text-[11px] text-slate-400">{description}</p>
    </div>
  );
}
