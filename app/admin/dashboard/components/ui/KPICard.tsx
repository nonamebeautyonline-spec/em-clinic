export interface KPICardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: "blue" | "green" | "purple" | "orange" | "rose" | "sky";
}

export function KPICard({ title, value, subtitle, icon, color }: KPICardProps) {
  const colorClasses = {
    blue: "border-blue-500 bg-blue-50",
    green: "border-green-500 bg-green-50",
    purple: "border-purple-500 bg-purple-50",
    orange: "border-orange-500 bg-orange-50",
    rose: "border-rose-500 bg-rose-50",
    sky: "border-sky-500 bg-sky-50",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-medium text-slate-600">{title}</div>
        <div className="text-2xl">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
      <div className="text-xs text-slate-500">{subtitle}</div>
    </div>
  );
}
