import { getContrastColor } from "@/lib/color-utils";

interface TagBadgeProps {
  name: string;
  color: string;
  size?: "sm" | "md";
  onRemove?: () => void;
}

export function TagBadge({ name, color, size = "md", onRemove }: TagBadgeProps) {
  const textColor = getContrastColor(color);
  const sizeClass = size === "sm"
    ? "px-1.5 py-0.5 text-[10px]"
    : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg font-medium ${sizeClass}`}
      style={{ backgroundColor: color, color: textColor }}
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
          style={{ color: textColor }}
        >
          ×
        </button>
      )}
    </span>
  );
}
