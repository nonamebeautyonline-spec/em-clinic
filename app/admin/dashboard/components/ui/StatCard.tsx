export interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <p className="text-[11px] font-medium text-slate-400 mb-1.5">{label}</p>
      <p className="text-xl font-bold text-slate-800">{value}</p>
    </div>
  );
}
