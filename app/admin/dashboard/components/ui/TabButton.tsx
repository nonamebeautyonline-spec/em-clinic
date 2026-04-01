export interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

export function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all duration-150 ${
        active
          ? "bg-slate-800 text-white shadow-sm"
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
