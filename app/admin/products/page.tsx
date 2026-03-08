"use client";

import { useState, useEffect, useCallback } from "react";
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

// ─── ドラッグ可能なフォルダ ───
function DraggableFolder({
  folder,
  onDoubleClick,
  onContextMenu,
  isDropTarget,
}: {
  folder: ProductCategory;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isDropTarget: boolean;
}) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `folder-${folder.id}`,
    data: { type: "folder", id: folder.id } satisfies DragItem,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-folder-${folder.id}`,
    data: { type: "folder", id: folder.id },
  });

  return (
    <div
      ref={(node) => { setDragRef(node); setDropRef(node); }}
      {...attributes}
      {...listeners}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={`group relative flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer select-none
        ${isDragging ? "opacity-30" : ""}
        ${isOver || isDropTarget
          ? "border-blue-400 bg-blue-50 scale-105"
          : "border-transparent hover:border-slate-200 hover:bg-slate-50"
        }`}
      style={{ touchAction: "none" }}
    >
      {/* フォルダアイコン */}
      <div className="w-16 h-14 relative mb-2">
        <svg viewBox="0 0 64 56" fill="none" className="w-full h-full">
          <path d="M4 8C4 5.79 5.79 4 8 4H24L30 12H56C58.21 12 60 13.79 60 16V48C60 50.21 58.21 52 56 52H8C5.79 52 4 50.21 4 48V8Z" fill="#FBBF24" />
          <path d="M4 16H60V48C60 50.21 58.21 52 56 52H8C5.79 52 4 50.21 4 48V16Z" fill="#F59E0B" />
        </svg>
      </div>
      <span className="text-sm text-slate-700 font-medium text-center leading-tight line-clamp-2 max-w-[120px]">
        {folder.name}
      </span>
      {/* アクションボタン */}
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
  onContextMenu,
}: {
  product: Product;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `product-${product.id}`,
    data: { type: "product", id: product.id } satisfies DragItem,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={`group relative flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer select-none
        ${isDragging ? "opacity-30" : ""}
        ${!product.is_active ? "opacity-50" : ""}
        border-transparent hover:border-slate-200 hover:bg-slate-50`}
      style={{ touchAction: "none" }}
    >
      {/* 商品アイコン */}
      <div className="w-16 h-14 relative mb-2 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-14 h-14 object-cover rounded-lg"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <svg viewBox="0 0 64 56" fill="none" className="w-full h-full">
            <rect x="8" y="4" width="48" height="48" rx="6" fill="#E2E8F0" />
            <path d="M24 20h16M24 28h16M24 36h10" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-700 font-medium text-center leading-tight line-clamp-2 max-w-[120px]">
        {product.title}
      </span>
      <span className="text-xs text-slate-500 mt-0.5">
        ¥{product.price.toLocaleString()}
      </span>
      {/* ステータスバッジ */}
      {!product.is_active && (
        <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-600 rounded">
          無効
        </span>
      )}
      {/* アクションボタン */}
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

// ─── ルートドロップゾーン（パンくずの「すべての商品」やフォルダ外エリア）───
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

// ─── メインページ ───
export default function ProductsPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ナビゲーション
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

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

  // DnD
  const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  // ─── データ取得 ───
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [catRes, prodRes] = await Promise.all([
        fetch("/api/admin/product-categories", { credentials: "include" }),
        fetch("/api/admin/products", { credentials: "include" }),
      ]);
      if (!catRes.ok) throw new Error(`カテゴリ取得失敗 (${catRes.status})`);
      if (!prodRes.ok) throw new Error(`商品取得失敗 (${prodRes.status})`);
      const [catData, prodData] = await Promise.all([catRes.json(), prodRes.json()]);
      setCategories(catData.categories || []);
      setProducts(prodData.products || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── 現在のフォルダ配下のアイテム ───
  const currentFolders = categories
    .filter((c) => c.parent_id === currentFolderId)
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const currentProducts = products
    .filter((p) => p.category_id === currentFolderId)
    .sort((a, b) => a.sort_order - b.sort_order);

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
    await fetchData();
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
    await fetchData();
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
    await fetchData();
  };

  // ─── 商品操作 ───
  const handleToggleActive = async (product: Product) => {
    try {
      if (product.is_active) {
        const res = await fetch(`/api/admin/products?id=${product.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) throw new Error("無効化に失敗しました");
      } else {
        const res = await fetch("/api/admin/products", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: product.id, is_active: true }),
        });
        if (!res.ok) throw new Error("有効化に失敗しました");
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作に失敗しました");
    }
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
    const data = event.active.data.current as DragItem;
    setActiveDrag(data);
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
    setActiveDrag(null);
    setDropTargetFolderId(null);

    const { active, over } = event;
    if (!over) return;

    const dragData = active.data.current as DragItem;
    const dropData = over.data.current as { type: string; id?: string } | undefined;
    if (!dropData) return;

    // ドロップ先を決定
    let targetFolderId: string | null = null;
    if (dropData.type === "folder") {
      targetFolderId = dropData.id ?? null;
    } else if (dropData.type === "root") {
      targetFolderId = null;
    } else {
      return;
    }

    // 自分自身にドロップした場合は何もしない
    if (dragData.type === "folder" && dragData.id === targetFolderId) return;

    try {
      if (dragData.type === "folder") {
        // フォルダをフォルダに移動
        const res = await fetch("/api/admin/product-categories", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: dragData.id, parent_id: targetFolderId }),
        });
        if (!res.ok) throw new Error("移動に失敗しました");
      } else {
        // 商品をフォルダに移動
        const res = await fetch("/api/admin/products", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: dragData.id, category_id: targetFolderId }),
        });
        if (!res.ok) throw new Error("移動に失敗しました");
      }
      await fetchData();
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

    if (activeDrag.type === "folder") {
      const folder = categories.find((c) => c.id === activeDrag.id);
      if (!folder) return null;
      return (
        <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-2xl border-2 border-blue-400 opacity-90">
          <div className="w-16 h-14 mb-2">
            <svg viewBox="0 0 64 56" fill="none" className="w-full h-full">
              <path d="M4 8C4 5.79 5.79 4 8 4H24L30 12H56C58.21 12 60 13.79 60 16V48C60 50.21 58.21 52 56 52H8C5.79 52 4 50.21 4 48V8Z" fill="#FBBF24" />
              <path d="M4 16H60V48C60 50.21 58.21 52 56 52H8C5.79 52 4 50.21 4 48V16Z" fill="#F59E0B" />
            </svg>
          </div>
          <span className="text-sm font-medium">{folder.name}</span>
        </div>
      );
    }

    const product = products.find((p) => p.id === activeDrag.id);
    if (!product) return null;
    return (
      <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-2xl border-2 border-blue-400 opacity-90">
        <div className="w-16 h-14 mb-2 flex items-center justify-center">
          <svg viewBox="0 0 64 56" fill="none" className="w-full h-full">
            <rect x="8" y="4" width="48" height="48" rx="6" fill="#E2E8F0" />
            <path d="M24 20h16M24 28h16M24 36h10" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-sm font-medium">{product.title}</span>
      </div>
    );
  };

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

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>
      )}

      {/* パンくずナビ */}
      <Breadcrumb
        categories={categories}
        currentFolderId={currentFolderId}
        onNavigate={setCurrentFolderId}
      />

      {/* ファイルマネージャー本体 */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6 min-h-[400px]">
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                      {currentFolders.map((folder) => (
                        <DraggableFolder
                          key={folder.id}
                          folder={folder}
                          onDoubleClick={() => setCurrentFolderId(folder.id)}
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                      {currentProducts.map((product) => (
                        <DraggableProduct
                          key={product.id}
                          product={product}
                          onDoubleClick={() => setProductModal({ open: true, editing: product })}
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
        onSave={fetchData}
        onClose={() => setProductModal({ open: false, editing: null })}
      />
    </div>
  );
}
