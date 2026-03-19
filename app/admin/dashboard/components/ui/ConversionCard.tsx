export interface ConversionCardProps {
  title: string;
  rate: number;
  description: string;
}

export function ConversionCard({ title, rate, description }: ConversionCardProps) {
  const getRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 rounded-lg shadow-sm p-6 border border-slate-200">
      <div className="text-sm font-medium text-slate-600 mb-3">{title}</div>
      <div className={`text-4xl font-bold mb-2 ${getRateColor(rate)}`}>{rate}%</div>
      <div className="text-xs text-slate-500">{description}</div>
    </div>
  );
}
