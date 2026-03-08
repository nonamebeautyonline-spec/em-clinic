"use client";

import type { ProductCategory } from "./types";

type Props = {
  categories: ProductCategory[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
};

export function Breadcrumb({ categories, currentFolderId, onNavigate }: Props) {
  // 現在のフォルダからルートまでのパスを構築
  const path: ProductCategory[] = [];
  let current = currentFolderId;
  while (current) {
    const cat = categories.find((c) => c.id === current);
    if (!cat) break;
    path.unshift(cat);
    current = cat.parent_id;
  }

  return (
    <nav className="flex items-center gap-1 text-sm text-slate-600 mb-4 flex-wrap">
      <button
        onClick={() => onNavigate(null)}
        className={`px-2 py-1 rounded hover:bg-slate-100 transition-colors ${
          !currentFolderId ? "font-bold text-slate-900" : "hover:text-slate-900"
        }`}
      >
        すべての商品
      </button>
      {path.map((cat) => (
        <span key={cat.id} className="flex items-center gap-1">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <button
            onClick={() => onNavigate(cat.id)}
            className={`px-2 py-1 rounded hover:bg-slate-100 transition-colors ${
              cat.id === currentFolderId ? "font-bold text-slate-900" : "hover:text-slate-900"
            }`}
          >
            {cat.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
