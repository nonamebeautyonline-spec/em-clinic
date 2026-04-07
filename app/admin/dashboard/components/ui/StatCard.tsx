export interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-claude-ivory rounded-2xl border border-claude-border-cream p-5">
      <p className="text-[11px] font-medium text-claude-stone mb-1.5">{label}</p>
      <p className="text-xl font-bold text-claude-near-black">{value}</p>
    </div>
  );
}
