export interface StatRowProps {
  label: string;
  value: string;
  highlight?: "red" | "orange" | "green";
}

export function StatRow({ label, value, highlight }: StatRowProps) {
  const highlightClasses = {
    red: "text-red-500",
    orange: "text-amber-500",
    green: "text-emerald-600",
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? highlightClasses[highlight] : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}
