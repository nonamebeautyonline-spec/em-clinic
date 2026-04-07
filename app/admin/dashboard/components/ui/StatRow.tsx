export interface StatRowProps {
  label: string;
  value: string;
  highlight?: "red" | "orange" | "green";
}

export function StatRow({ label, value, highlight }: StatRowProps) {
  const highlightClasses = {
    red: "text-claude-error",
    orange: "text-claude-coral",
    green: "text-emerald-600",
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-claude-border-cream last:border-b-0">
      <span className="text-sm text-claude-olive">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? highlightClasses[highlight] : "text-claude-near-black"}`}>
        {value}
      </span>
    </div>
  );
}
