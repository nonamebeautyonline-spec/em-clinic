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
          ? "bg-claude-near-black text-claude-ivory shadow-sm"
          : "text-claude-stone hover:text-claude-charcoal hover:bg-claude-sand"
      }`}
    >
      {label}
    </button>
  );
}
