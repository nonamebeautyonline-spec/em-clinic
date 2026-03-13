"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useSWR, { mutate } from "swr";
import { ErrorFallback } from "@/components/admin/ErrorFallback";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Breadcrumb } from "./_components/Breadcrumb";
import { ContextMenu } from "./_components/ContextMenu";
import { FolderEditModal } from "./_components/FolderEditModal";
import { ProductEditModal } from "./_components/ProductEditModal";
import type { Product, ProductCategory, DragItem } from "./_components/types";

type ViewMode = "grid" | "list";
type SortKey = "name" | "price" | "date" | "sort_order";
type SortDir = "asc" | "desc";

// 選択アイテムのキー形式: "folder-{id}" or "product-{id}"
type SelectionKey = string;

// ─── フォルダアイコンSVG ───
function FolderIcon({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 56" fill="none" className={className}>
      <path d="M4 8C4 5.79 5.79 4 8 4H24L30 12H56C58.21 12 60 13.79 60 16V48C60 50.21 58.21 52 56 52H8C5.79 52 4 50.21 4 48V8Z" fill="#FBBF24" />
      <path d="M4 16H60V48C60 50.21 58.21 52 56 52H8C5.79 52 4 50.21 4 48V16Z" fill="#F59E0B" />
    </svg>
  );
}

// ─── 商品アイコンSVG ───
function ProductIcon({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 56" fill="none" className={className}>
      <rect x="8" y="4" width="48" height="48" rx="6" fill="#E2E8F0" />
      <path d="M24 20h16M24 28h16M24 36h10" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ─── ドラッグ可能なフォルダ ───
function DraggableFolder({
  folder,
  onDoubleClick,
  onClick,
  onContextMenu,
  isDropTarget,
  isSelected,
  viewMode,
}: {
  folder: ProductCategory;
  onDoubleClick: () => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isDropTarget: boolean;
  isSelected: boolean;
  viewMode: ViewMode;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `folder-${folder.id}`,
    data: { type: "folder", id: folder.id } satisfies DragItem,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-folder-${folder.id}`,
    data: { type: "folder", id: folder.id },
  });

  const highlight = isOver || isDropTarget;

  if (viewMode === "list") {
    return (
      <div
        ref={(node) => { setDragRef(node); setDropRef(node); }}
        data-selection-key={`folder-${folder.id}`}
        {...attributes}
        {...listeners}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg border transition-all cursor-pointer select-none
          ${isDragging ? "opacity-30" : ""}
          ${highlight ? "border-blue-400 bg-blue-50" : ""}
          ${isSelected && !highlight ? "border-blue-300 bg-blue-50/60" : ""}
          ${!highlight && !isSelected ? "border-transparent hover:bg-slate-50" : ""}`}
        style={{ touchAction: "none" }}
      >
        <div className="w-8 h-7 shrink-0"><FolderIcon /></div>
        <span className="text-sm text-slate-700 font-medium truncate flex-1">{folder.name}</span>
        <span className="text-xs text-slate-400">フォルダ</span>
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 transition-opacity"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={(node) => { setDragRef(node); setDropRef(node); }}
      data-selection-key={`folder-${folder.id}`}
      {...attributes}
      {...listeners}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group relative flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer select-none
        ${isDragging ? "opacity-30" : ""}
        ${highlight
          ? "border-blue-400 bg-blue-50 scale-105"
          : isSelected
            ? "border-blue-300 bg-blue-50/60"
            : "border-transparent hover:border-slate-200 hover:bg-slate-50"
        }`}
      style={{ touchAction: "none" }}
    >
      <div className="w-16 h-14 relative mb-2"><FolderIcon /></div>
      <span className="text-sm text-slate-700 font-medium text-center leading-tight line-clamp-2 max-w-[120px]">
        {folder.name}
      </span>
      {isSelected && (
        <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
        className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 transition-opacity"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
    </div>
  );
}

// ─── ドラッグ可能な商品 ───
function DraggableProduct({
  product,
  onDoubleClick,
  onClick,
  onContextMenu,
  isSelected,
  viewMode,
}: {
  product: Product;
  onDoubleClick: () => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isSelected: boolean;
  viewMode: ViewMode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `product-${product.id}`,
    data: { type: "product", id: product.id } satisfies DragItem,
  });

  if (viewMode === "list") {
    return (
      <div
        ref={setNodeRef}
        data-selection-key={`product-${product.id}`}
        {...attributes}
        {...listeners}
        onDoubleClick={onDoubleClick}
        onClick={onClick}
        onContextMenu={onContextMenu}
        className={`group flex items-center gap-3 px-3 py-2 rounded-lg border transition-all cursor-pointer select-none
          ${isDragging ? "opacity-30" : ""}
          ${!product.is_active ? "opacity-50" : ""}
          ${isSelected ? "border-blue-300 bg-blue-50/60" : "border-transparent hover:bg-slate-50"}`}
        style={{ touchAction: "none" }}
      >
        <div className="w-8 h-7 shrink-0 flex items-center justify-center">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-7 h-7 object-cover rounded"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ) : (
            <ProductIcon className="w-8 h-7" />
          )}
        </div>
        <span className="text-sm text-slate-700 font-medium truncate flex-1">{product.title}</span>
        {product.code && (
          <span className="text-xs text-slate-400 font-mono hidden sm:block">{product.code}</span>
        )}
        <span className="text-sm text-slate-600 font-medium w-24 text-right">
          ¥{product.price.toLocaleString()}
        </span>
        {!product.is_active && (
          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded">無効</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
          className="p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 transition-opacity"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      data-selection-key={`product-${product.id}`}
      {...attributes}
      {...listeners}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`group relative flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer select-none
        ${isDragging ? "opacity-30" : ""}
        ${!product.is_active ? "opacity-50" : ""}
        ${isSelected
          ? "border-blue-300 bg-blue-50/60"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
        }`}
      style={{ touchAction: "none" }}
    >
      <div className="w-16 h-14 relative mb-2 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-14 h-14 object-cover rounded-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <ProductIcon />
        )}
      </div>
      <span className="text-sm text-slate-700 font-medium text-center leading-tight line-clamp-2 max-w-[120px]">
        {product.title}
      </span>
      <span className="text-xs text-slate-500 mt-0.5">
        ¥{product.price.toLocaleString()}
      </span>
      {!product.is_active && (
        <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded">
          無効
        </span>
      )}
      {isSelected && !(!product.is_active) && (
        <div className="absolute top-2 left-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); onContextMenu(e); }}
        className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 transition-opacity"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0zm6 0a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </button>
    </div>
  );
}

// ─── ルートドロップゾーン ───
function RootDropZone({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "drop-root",
    data: { type: "root" },
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] transition-colors rounded-xl ${isOver ? "bg-blue-50/50" : ""}`}
    >
      {children}
    </div>
  );
}

const CATEGORIES_KEY = "/api/admin/product-categories";
const PRODUCTS_KEY = "/api/admin/products";

// ─── メインページ ───
export default function ProductsPage() {
  const { data: catData, error: catError, isLoading: catLoading } = useSWR<{ categories: ProductCategory[] }>(CATEGORIES_KEY);
  const { data: prodData, error: prodError, isLoading: prodLoading } = useSWR<{ products: Product[] }>(PRODUCTS_KEY);
  const categories = catData?.categories ?? [];
  const products = prodData?.products ?? [];
  const loading = catLoading || prodLoading;
  const swrError = catError || prodError;

  // ナビゲーション
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // 選択
  const [selectedItems, setSelectedItems] = useState<Set<SelectionKey>>(new Set());

  // モーダル
  const [folderModal, setFolderModal] = useState<{ open: boolean; editing: ProductCategory | null }>({
    open: false,
    editing: null,
  });
  const [productModal, setProductModal] = useState<{ open: boolean; editing: Product | null }>({
    open: false,
    editing: null,
  });

  // コンテキストメニュー
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
  } | null>(null);

  // 表示モード・ソート
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [sortKey, setSortKey] = useState<SortKey>("sort_order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // DnD
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ─── 矩形選択（マーキー） ───
  const containerRef = useRef<HTMLDivElement>(null);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const marqueeActive = useRef(false);
  const marqueeStartPoint = useRef({ x: 0, y: 0 });
  // DnDがアクティブになったらマーキーを中断
  const dndActive = useRef(false);

  const rectsIntersect = (a: { left: number; top: number; right: number; bottom: number }, b: DOMRect) => {
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
  };

  const computeMarqueeSelection = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    if (!containerRef.current) return new Set<SelectionKey>();
    const rect = {
      left: Math.min(startX, endX),
      top: Math.min(startY, endY),
      right: Math.max(startX, endX),
      bottom: Math.max(startY, endY),
    };
    const items = containerRef.current.querySelectorAll<HTMLElement>("[data-selection-key]");
    const selected = new Set<SelectionKey>();
    items.forEach((el) => {
      const key = el.getAttribute("data-selection-key");
      if (key && rectsIntersect(rect, el.getBoundingClientRect())) {
        selected.add(key);
      }
    });
    return selected;
  }, []);

  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    // ボタン・リンク上ではマーキー開始しない
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    // 左クリックのみ
    if (e.button !== 0) return;

    marqueeActive.current = true;
    dndActive.current = false;
    marqueeStartPoint.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!marqueeActive.current || dndActive.current) return;
      const sx = marqueeStartPoint.current.x;
      const sy = marqueeStartPoint.current.y;
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      // 最低8px動いてから矩形表示（DnDのdistanceと同じ）
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;

      // マーキーが始まったらテキスト選択防止
      e.preventDefault();

      setMarquee({ startX: sx, startY: sy, endX: e.clientX, endY: e.clientY });
      setSelectedItems(computeMarqueeSelection(sx, sy, e.clientX, e.clientY));
    };

    const handleMouseUp = () => {
      marqueeActive.current = false;
      setMarquee(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [computeMarqueeSelection]);

  // ─── データ再検証 ───
  const revalidateAll = useCallback(() => {
    mutate(CATEGORIES_KEY);
    mutate(PRODUCTS_KEY);
  }, []);

  // フォルダ遷移時に選択をクリア
  useEffect(() => { setSelectedItems(new Set()); }, [currentFolderId]);

  // ─── ソート関数 ───
  const sortItems = useCallback(<T extends { sort_order: number }>(
    items: T[],
    getName: (item: T) => string,
    getPrice: (item: T) => number,
    getDate: (item: T) => string,
  ): T[] => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...items].sort((a, b) => {
      switch (sortKey) {
        case "name": return getName(a).localeCompare(getName(b)) * dir;
        case "price": return (getPrice(a) - getPrice(b)) * dir;
        case "date": return (getDate(a) < getDate(b) ? -1 : 1) * dir;
        case "sort_order":
        default: return (a.sort_order - b.sort_order) * dir;
      }
    });
  }, [sortKey, sortDir]);

  // ─── 現在のフォルダ配下のアイテム ───
  const currentFolders = useMemo(() =>
    sortItems(
      categories.filter((c) => c.parent_id === currentFolderId),
      (c) => c.name,
      () => 0,
      (c) => c.created_at,
    ),
  [categories, currentFolderId, sortItems]);

  const currentProducts = useMemo(() =>
    sortItems(
      products.filter((p) => p.category_id === currentFolderId),
      (p) => p.title,
      (p) => p.price,
      (p) => p.code,
    ),
  [products, currentFolderId, sortItems]);

  // ─── ソートトグル ───
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ─── 選択操作 ───
  const handleItemClick = (key: SelectionKey, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl+クリック: トグル
      setSelectedItems((prev) => {
        const next = new Set(prev);
        if (next.has(key)) { next.delete(key); } else { next.add(key); }
        return next;
      });
    } else if (e.shiftKey && selectedItems.size > 0) {
      // Shift+クリック: 範囲選択
      const allKeys = [
        ...currentFolders.map((f) => `folder-${f.id}`),
        ...currentProducts.map((p) => `product-${p.id}`),
      ];
      const lastSelected = [...selectedItems].pop();
      const lastIdx = allKeys.indexOf(lastSelected!);
      const currentIdx = allKeys.indexOf(key);
      if (lastIdx >= 0 && currentIdx >= 0) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const range = new Set(allKeys.slice(start, end + 1));
        setSelectedItems((prev) => new Set([...prev, ...range]));
      }
    } else {
      // 通常クリック: 単一選択
      setSelectedItems(new Set([key]));
    }
  };

  const clearSelection = () => setSelectedItems(new Set());

  // ─── フォルダ操作 ───
  const handleCreateFolder = async (name: string) => {
    const res = await fetch("/api/admin/product-categories", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, parent_id: currentFolderId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "作成に失敗しました");
    }
    revalidateAll();
  };

  const handleRenameFolder = async (id: string, name: string) => {
    const res = await fetch("/api/admin/product-categories", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "名前変更に失敗しました");
    }
    revalidateAll();
  };

  const handleDeleteFolder = async (id: string) => {
    if (!confirm("このフォルダを削除しますか？配下のサブフォルダも削除されます。商品はルートに移動します。")) return;
    const res = await fetch(`/api/admin/product-categories?id=${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.message || "削除に失敗しました");
      return;
    }
    revalidateAll();
  };

  // ─── 商品操作（Optimistic UI） ───
  const handleToggleActive = async (product: Product) => {
    const newActive = !product.is_active;
    await mutate(
      PRODUCTS_KEY,
      async (current: { products: Product[] } | undefined) => {
        if (newActive) {
          const res = await fetch("/api/admin/products", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: product.id, is_active: true }),
          });
          if (!res.ok) throw new Error("有効化に失敗しました");
        } else {
          const res = await fetch(`/api/admin/products?id=${product.id}`, {
            method: "DELETE",
            credentials: "include",
          });
          if (!res.ok) throw new Error("無効化に失敗しました");
        }
        return {
          products: (current?.products ?? []).map((p) =>
            p.id === product.id ? { ...p, is_active: newActive } : p
          ),
        };
      },
      {
        optimisticData: (current: { products: Product[] } | undefined) => ({
          products: (current?.products ?? []).map((p) =>
            p.id === product.id ? { ...p, is_active: newActive } : p
          ),
        }),
        rollbackOnError: true,
        revalidate: false,
      },
    );
  };

  // ─── コンテキストメニュー ───
  const openFolderContextMenu = (e: React.MouseEvent, folder: ProductCategory) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "開く",
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
          onClick: () => setCurrentFolderId(folder.id),
        },
        {
          label: "名前変更",
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
          onClick: () => setFolderModal({ open: true, editing: folder }),
        },
        {
          label: "削除",
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
          onClick: () => handleDeleteFolder(folder.id),
          danger: true,
        },
      ],
    });
  };

  const openProductContextMenu = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: "編集",
          icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
          onClick: () => setProductModal({ open: true, editing: product }),
        },
        {
          label: product.is_active ? "無効化" : "有効化",
          icon: product.is_active
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          onClick: () => handleToggleActive(product),
          danger: product.is_active,
        },
      ],
    });
  };

  // ─── DnD ───
  const handleDragStart = (event: DragStartEvent) => {
    // DnD開始時はマーキーを中断
    marqueeActive.current = false;
    dndActive.current = true;
    setMarquee(null);

    const data = event.active.data.current as DragItem;
    setActiveDrag(data);
    // ドラッグ開始時、対象が未選択なら選択をリセットしてそのアイテムだけ選択
    const key = `${data.type}-${data.id}`;
    if (!selectedItems.has(key)) {
      setSelectedItems(new Set([key]));
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const over = event.over;
    if (!over) {
      setDropTargetFolderId(null);
      return;
    }
    const overData = over.data.current as { type: string; id?: string } | undefined;
    if (overData?.type === "folder") {
      setDropTargetFolderId(overData.id ?? null);
    } else {
      setDropTargetFolderId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const draggedItems = [...selectedItems];
    setActiveDrag(null);
    setDropTargetFolderId(null);

    const { over } = event;
    if (!over) return;

    const dropData = over.data.current as { type: string; id?: string } | undefined;
    if (!dropData) return;

    let targetFolderId: string | null = null;
    if (dropData.type === "folder") {
      targetFolderId = dropData.id ?? null;
    } else if (dropData.type === "root") {
      targetFolderId = null;
    } else {
      return;
    }

    // 選択されたアイテムをまとめて移動
    const movePromises: Promise<Response>[] = [];

    for (const key of draggedItems) {
      const [type, id] = [key.split("-")[0], key.slice(key.indexOf("-") + 1)];

      // 自分自身にドロップした場合はスキップ
      if (type === "folder" && id === targetFolderId) continue;

      if (type === "folder") {
        movePromises.push(
          fetch("/api/admin/product-categories", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, parent_id: targetFolderId }),
          }),
        );
      } else {
        movePromises.push(
          fetch("/api/admin/products", {
            method: "PUT",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, category_id: targetFolderId }),
          }),
        );
      }
    }

    if (movePromises.length === 0) return;

    try {
      const results = await Promise.all(movePromises);
      const failed = results.filter((r) => !r.ok);
      if (failed.length > 0) throw new Error(`${failed.length}件の移動に失敗しました`);
      revalidateAll();
      setSelectedItems(new Set());
    } catch (err) {
      alert(err instanceof Error ? err.message : "移動に失敗しました");
    }
  };

  const handleDragCancel = () => {
    setActiveDrag(null);
    setDropTargetFolderId(null);
  };

  // ─── ドラッグオーバーレイ ───
  const renderDragOverlay = () => {
    if (!activeDrag) return null;

    const count = selectedItems.size;
    const label = count > 1 ? `${count}件を移動` : null;

    if (activeDrag.type === "folder") {
      const folder = categories.find((c) => c.id === activeDrag.id);
      if (!folder) return null;
      return (
        <div className="relative flex flex-col items-center p-4 bg-white rounded-xl shadow-2xl border-2 border-blue-400 opacity-90">
          <div className="w-16 h-14 mb-2"><FolderIcon /></div>
          <span className="text-sm font-medium">{label || folder.name}</span>
          {count > 1 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {count}
            </div>
          )}
        </div>
      );
    }

    const product = products.find((p) => p.id === activeDrag.id);
    if (!product) return null;
    return (
      <div className="relative flex flex-col items-center p-4 bg-white rounded-xl shadow-2xl border-2 border-blue-400 opacity-90">
        <div className="w-16 h-14 mb-2 flex items-center justify-center"><ProductIcon /></div>
        <span className="text-sm font-medium">{label || product.title}</span>
        {count > 1 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {count}
          </div>
        )}
      </div>
    );
  };

  // ─── エラー ───
  if (swrError) return <ErrorFallback error={swrError} retry={revalidateAll} />;

  // ─── ローディング ───
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-slate-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">商品管理</h1>
          <p className="text-slate-600 text-sm mt-1">
            フォルダで商品を整理・管理
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFolderModal({ open: true, editing: null })}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            新規フォルダ
          </button>
          <button
            onClick={() => setProductModal({ open: true, editing: null })}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            商品追加
          </button>
        </div>
      </div>

      {/* パンくずナビ + ツールバー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <Breadcrumb
            categories={categories}
            currentFolderId={currentFolderId}
            onNavigate={setCurrentFolderId}
          />
          {selectedItems.size > 0 && (
            <span className="shrink-0 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
              {selectedItems.size}件選択中
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* ソートメニュー */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400 hidden sm:block">並べ替え:</span>
            {([
              { key: "sort_order" as SortKey, label: "順番" },
              { key: "name" as SortKey, label: "名前" },
              { key: "price" as SortKey, label: "価格" },
              { key: "date" as SortKey, label: "日付" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  sortKey === key
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {label}
                {sortKey === key && (
                  <span className="ml-0.5">{sortDir === "asc" ? "\u2191" : "\u2193"}</span>
                )}
              </button>
            ))}
          </div>

          {/* 表示切替 */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden ml-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:bg-slate-100"
              }`}
              title="グリッド表示"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 transition-colors ${
                viewMode === "list" ? "bg-slate-200 text-slate-700" : "text-slate-400 hover:bg-slate-100"
              }`}
              title="リスト表示"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ファイルマネージャー本体 */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          ref={containerRef}
          className="bg-white rounded-xl shadow border border-slate-200 p-6 min-h-[400px] relative"
          onMouseDown={handleContainerMouseDown}
          onClick={(e) => {
            // 空エリアクリックで選択解除
            if (e.target === e.currentTarget) clearSelection();
          }}
        >
          {/* 戻るボタン（ルートでない場合） */}
          {currentFolderId && (
            <button
              onClick={() => {
                const current = categories.find((c) => c.id === currentFolderId);
                setCurrentFolderId(current?.parent_id ?? null);
              }}
              className="mb-4 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              上のフォルダへ
            </button>
          )}

          <RootDropZone>
            {currentFolders.length === 0 && currentProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-lg font-medium mb-1">このフォルダは空です</p>
                <p className="text-sm">「新規フォルダ」や「商品追加」で始めましょう</p>
              </div>
            ) : (
              <>
                {/* フォルダ一覧 */}
                {currentFolders.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      フォルダ ({currentFolders.length})
                    </h3>
                    <div className={viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2"
                      : "flex flex-col gap-0.5"
                    }>
                      {currentFolders.map((folder) => (
                        <DraggableFolder
                          key={folder.id}
                          folder={folder}
                          viewMode={viewMode}
                          isSelected={selectedItems.has(`folder-${folder.id}`)}
                          onDoubleClick={() => setCurrentFolderId(folder.id)}
                          onClick={(e) => handleItemClick(`folder-${folder.id}`, e)}
                          onContextMenu={(e) => openFolderContextMenu(e, folder)}
                          isDropTarget={dropTargetFolderId === folder.id}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* 商品一覧 */}
                {currentProducts.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      商品 ({currentProducts.length})
                    </h3>
                    <div className={viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2"
                      : "flex flex-col gap-0.5"
                    }>
                      {currentProducts.map((product) => (
                        <DraggableProduct
                          key={product.id}
                          product={product}
                          viewMode={viewMode}
                          isSelected={selectedItems.has(`product-${product.id}`)}
                          onDoubleClick={() => setProductModal({ open: true, editing: product })}
                          onClick={(e) => handleItemClick(`product-${product.id}`, e)}
                          onContextMenu={(e) => openProductContextMenu(e, product)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </RootDropZone>
        </div>

        <DragOverlay dropAnimation={null}>
          {renderDragOverlay()}
        </DragOverlay>
      </DndContext>

      {/* マーキー選択矩形 */}
      {marquee && (
        <div
          className="fixed pointer-events-none border border-blue-400 bg-blue-400/10 z-40"
          style={{
            left: Math.min(marquee.startX, marquee.endX),
            top: Math.min(marquee.startY, marquee.endY),
            width: Math.abs(marquee.endX - marquee.startX),
            height: Math.abs(marquee.endY - marquee.startY),
          }}
        />
      )}

      {/* コンテキストメニュー */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* フォルダ作成/名前変更モーダル */}
      <FolderEditModal
        isOpen={folderModal.open}
        initialName={folderModal.editing?.name || ""}
        title={folderModal.editing ? "フォルダ名を変更" : "新規フォルダ"}
        onSave={async (name) => {
          if (folderModal.editing) {
            await handleRenameFolder(folderModal.editing.id, name);
          } else {
            await handleCreateFolder(name);
          }
        }}
        onClose={() => setFolderModal({ open: false, editing: null })}
      />

      {/* 商品追加/編集モーダル */}
      <ProductEditModal
        isOpen={productModal.open}
        editingProduct={productModal.editing}
        products={products}
        categoryId={currentFolderId}
        onSave={revalidateAll}
        onClose={() => setProductModal({ open: false, editing: null })}
      />
    </div>
  );
}
