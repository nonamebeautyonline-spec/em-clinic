export interface StatRowProps {
  label: string;
  value: string;
  highlight?: "red" | "orange" | "green";
}

export function StatRow({ label, value, highlight }: StatRowProps) {
  const highlightClasses = {
    red: "text-red-600",
    orange: "text-orange-600",
    green: "text-green-600",
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-bold ${highlight ? highlightClasses[highlight] : "text-slate-900"}`}>
        {value}
      </span>
    </div>
  );
}
