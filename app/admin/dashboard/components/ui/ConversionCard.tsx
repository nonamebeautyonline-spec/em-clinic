export interface ConversionCardProps {
  title: string;
  rate: number;
  description: string;
}

export function ConversionCard({ title, rate, description }: ConversionCardProps) {
  const getRateColor = (rate: number) => {
    if (rate >= 80) return "text-emerald-600";
    if (rate >= 60) return "text-claude-coral";
    return "text-claude-error";
  };

  const getBarColor = (rate: number) => {
    if (rate >= 80) return "bg-emerald-500";
    if (rate >= 60) return "bg-claude-coral";
    return "bg-claude-error";
  };

  return (
    <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-5 shadow-ring-warm hover:shadow-whisper transition-all duration-200">
      <p className="text-[13px] font-medium text-claude-stone mb-3">{title}</p>
      <div className="flex items-end gap-3 mb-3">
        <p className={`text-[32px] font-bold leading-none tracking-tight ${getRateColor(rate)}`}>{rate}<span className="text-lg">%</span></p>
      </div>
      {/* ミニプログレスバー */}
      <div className="w-full h-1.5 bg-claude-sand rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full transition-all duration-500 ${getBarColor(rate)}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <p className="text-[11px] text-claude-stone">{description}</p>
    </div>
  );
}
