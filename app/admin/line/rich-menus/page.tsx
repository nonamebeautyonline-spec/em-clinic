"use client";

import { useState, useEffect } from "react";

interface RichMenu {
  id: number;
  name: string;
  chat_bar_text: string;
  selected: boolean;
  size_type: string;
  areas: RichMenuArea[];
  image_url: string | null;
  line_rich_menu_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RichMenuArea {
  bounds: { x: number; y: number; width: number; height: number };
  action: { type: string; uri?: string; text?: string; label?: string };
}

const TEMPLATE_LAYOUTS = [
  { id: "2x3", label: "2×3", cols: 3, rows: 2, description: "6ボタン" },
  { id: "2x2", label: "2×2", cols: 2, rows: 2, description: "4ボタン" },
  { id: "1x3", label: "1×3", cols: 3, rows: 1, description: "3ボタン" },
  { id: "1x2", label: "1×2", cols: 2, rows: 1, description: "2ボタン" },
  { id: "1x1", label: "1×1", cols: 1, rows: 1, description: "1ボタン" },
];

const ACTION_TYPES = [
  { value: "uri", label: "URL" },
  { value: "message", label: "ユーザーメッセージ" },
  { value: "postback", label: "アクション" },
];

export default function RichMenuManagementPage() {
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState<RichMenu | null>(null);

  // 作成フォーム
  const [name, setName] = useState("");
  const [chatBarText, setChatBarText] = useState("メニュー");
  const [selectedLayout, setSelectedLayout] = useState("2x3");
  const [areas, setAreas] = useState<{ actionType: string; actionValue: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [editingAreaIndex, setEditingAreaIndex] = useState<number | null>(null);

  const fetchMenus = async () => {
    const res = await fetch("/api/admin/line/rich-menus", { credentials: "include" });
    const data = await res.json();
    if (data.menus) setMenus(data.menus);
    setLoading(false);
  };

  useEffect(() => { fetchMenus(); }, []);

  const getLayout = () => TEMPLATE_LAYOUTS.find(t => t.id === selectedLayout) || TEMPLATE_LAYOUTS[0];

  const initAreas = (layoutId: string) => {
    const layout = TEMPLATE_LAYOUTS.find(t => t.id === layoutId) || TEMPLATE_LAYOUTS[0];
    const count = layout.cols * layout.rows;
    setAreas(Array.from({ length: count }, () => ({ actionType: "uri", actionValue: "", label: "" })));
  };

  const handleLayoutChange = (layoutId: string) => {
    setSelectedLayout(layoutId);
    initAreas(layoutId);
    setEditingAreaIndex(null);
  };

  const handleCreateNew = () => {
    setEditingMenu(null);
    setName("");
    setChatBarText("メニュー");
    setSelectedLayout("2x3");
    initAreas("2x3");
    setEditingAreaIndex(null);
    setShowModal(true);
  };

  const handleEdit = (menu: RichMenu) => {
    setEditingMenu(menu);
    setName(menu.name);
    setChatBarText(menu.chat_bar_text);

    // areasからlayoutを復元
    const areaCount = menu.areas.length || 6;
    const layout = TEMPLATE_LAYOUTS.find(t => t.cols * t.rows === areaCount) || TEMPLATE_LAYOUTS[0];
    setSelectedLayout(layout.id);

    setAreas(
      menu.areas.length > 0
        ? menu.areas.map(a => ({
            actionType: a.action.type || "uri",
            actionValue: a.action.uri || a.action.text || "",
            label: a.action.label || "",
          }))
        : Array.from({ length: areaCount }, () => ({ actionType: "uri", actionValue: "", label: "" }))
    );
    setEditingAreaIndex(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);

    const layout = getLayout();
    const richMenuAreas: RichMenuArea[] = areas.map((area, i) => {
      const col = i % layout.cols;
      const row = Math.floor(i / layout.cols);
      const cellWidth = 2500 / layout.cols;
      const cellHeight = (layout.rows === 1 ? 843 : 1686) / layout.rows;

      return {
        bounds: {
          x: Math.round(col * cellWidth),
          y: Math.round(row * cellHeight),
          width: Math.round(cellWidth),
          height: Math.round(cellHeight),
        },
        action: {
          type: area.actionType,
          ...(area.actionType === "uri" ? { uri: area.actionValue } : { text: area.actionValue }),
          label: area.label,
        },
      };
    });

    const body = {
      name: name.trim(),
      chat_bar_text: chatBarText || "メニュー",
      size_type: layout.rows === 1 ? "half" : "full",
      areas: richMenuAreas,
    };

    const url = editingMenu ? `/api/admin/line/rich-menus/${editingMenu.id}` : "/api/admin/line/rich-menus";
    const method = editingMenu ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (res.ok) {
      await fetchMenus();
      setShowModal(false);
    } else {
      const data = await res.json();
      alert(data.error || "保存失敗");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/line/rich-menus/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      await fetchMenus();
      setDeleteConfirm(null);
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                リッチメニュー
              </h1>
              <p className="text-sm text-gray-400 mt-1">トーク画面下に表示されるメニューを管理</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="px-5 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-medium hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all duration-200 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規作成
            </button>
          </div>
        </div>
      </div>

      {/* メニュー一覧 */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">読み込み中...</span>
            </div>
          </div>
        ) : menus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <p className="text-gray-400 text-sm">リッチメニューがまだありません</p>
            <p className="text-gray-300 text-xs mt-1">「新規作成」ボタンからメニューを作成しましょう</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {menus.map((menu) => (
              <div
                key={menu.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
              >
                {/* メニューカードヘッダー */}
                <div className="px-5 py-4 border-b border-gray-50">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-800 text-sm">{menu.name}</h3>
                    <div className="flex items-center gap-1">
                      {menu.is_active && (
                        <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium border border-green-100">有効</span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">作成日: {formatDate(menu.created_at)}</div>
                </div>

                {/* メニューグリッドプレビュー */}
                <div className="px-5 py-4">
                  <div className="bg-gray-50 rounded-xl p-3">
                    {(() => {
                      const areaCount = menu.areas.length || 6;
                      const layout = TEMPLATE_LAYOUTS.find(t => t.cols * t.rows === areaCount) || TEMPLATE_LAYOUTS[0];
                      return (
                        <div
                          className="grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}
                        >
                          {menu.areas.map((area, i) => (
                            <div
                              key={i}
                              className="bg-white rounded-lg border border-gray-200 px-2 py-3 text-center"
                            >
                              <span className="text-lg font-bold text-gray-300">{i + 1}</span>
                              {area.action.label && (
                                <p className="text-[10px] text-gray-500 mt-1 truncate">{area.action.label}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* トークルームメニューテキスト */}
                  <div className="mt-3 flex items-center justify-center gap-2 bg-gray-100 rounded-lg py-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="text-xs text-gray-500 font-medium">{menu.chat_bar_text}</span>
                  </div>
                </div>

                {/* アクションバー */}
                <div className="px-5 py-3 border-t border-gray-50 flex gap-2">
                  <button
                    onClick={() => handleEdit(menu)}
                    className="flex-1 px-3 py-2 text-xs font-medium bg-[#06C755] text-white rounded-lg hover:bg-[#05b34d] transition-colors"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(menu.id)}
                    className="px-3 py-2 text-xs font-medium border border-gray-200 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* リッチメニュー作成/編集モーダル - Lステップ風 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[95vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-lg">
                {editingMenu ? "リッチメニュー編集" : "リッチメニュー編集"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="px-6 py-5 space-y-6">
                {/* タイトル */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 text-right">
                    タイトル <span className="text-red-500 text-xs px-1 py-0.5 bg-red-50 rounded">必須</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="管理画面に表示するメニューの名前"
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50"
                  />
                </div>

                {/* トークルームメニュー */}
                <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                  <label className="text-sm font-medium text-gray-700 text-right">
                    メニューテキスト <span className="text-red-500 text-xs px-1 py-0.5 bg-red-50 rounded">必須</span>
                  </label>
                  <input
                    type="text"
                    value={chatBarText}
                    onChange={(e) => setChatBarText(e.target.value)}
                    placeholder="トークルームに表示されるテキスト(14文字以内)"
                    maxLength={14}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50"
                  />
                </div>

                {/* テンプレート選択 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">テンプレート</label>
                  <div className="flex gap-3 flex-wrap">
                    {TEMPLATE_LAYOUTS.map(layout => (
                      <button
                        key={layout.id}
                        onClick={() => handleLayoutChange(layout.id)}
                        className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all min-w-[90px] ${
                          selectedLayout === layout.id
                            ? "border-[#06C755] bg-green-50 shadow-sm"
                            : "border-gray-200 hover:border-gray-300 bg-white"
                        }`}
                      >
                        {/* ミニグリッド */}
                        <div
                          className="grid gap-0.5 mb-1.5 w-16"
                          style={{ gridTemplateColumns: `repeat(${layout.cols}, 1fr)` }}
                        >
                          {Array.from({ length: layout.cols * layout.rows }).map((_, i) => (
                            <div
                              key={i}
                              className={`h-5 rounded-sm ${
                                selectedLayout === layout.id ? "bg-[#06C755]/20 border border-[#06C755]/30" : "bg-gray-100 border border-gray-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-gray-500">{layout.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* コンテンツ設定 - Lステップ風 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">コンテンツ設定</label>
                  <div className="flex gap-4">
                    {/* グリッドビジュアル */}
                    <div className="flex-shrink-0">
                      <div
                        className="grid gap-1 w-48"
                        style={{ gridTemplateColumns: `repeat(${getLayout().cols}, 1fr)` }}
                      >
                        {areas.map((area, i) => (
                          <button
                            key={i}
                            onClick={() => setEditingAreaIndex(i)}
                            className={`aspect-[4/3] rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                              editingAreaIndex === i
                                ? "border-[#06C755] bg-green-50 shadow-sm"
                                : area.actionValue
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <span className="text-lg font-bold text-gray-300">{i + 1}</span>
                            {area.label && (
                              <span className="text-[9px] text-gray-500 mt-0.5 truncate max-w-full px-1">{area.label}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ボタン設定 */}
                    <div className="flex-1 min-w-0">
                      {editingAreaIndex !== null ? (
                        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-gray-700">
                              ボタン{editingAreaIndex + 1}
                              <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">領域編集</span>
                            </h3>
                          </div>

                          {/* アクションタイプ */}
                          <div className="flex gap-2">
                            {ACTION_TYPES.map(at => (
                              <label key={at.value} className="flex items-center gap-1.5">
                                <input
                                  type="radio"
                                  name="actionType"
                                  checked={areas[editingAreaIndex].actionType === at.value}
                                  onChange={() => {
                                    const next = [...areas];
                                    next[editingAreaIndex] = { ...next[editingAreaIndex], actionType: at.value };
                                    setAreas(next);
                                  }}
                                  className="accent-[#06C755]"
                                />
                                <span className="text-xs text-gray-600">{at.label}</span>
                              </label>
                            ))}
                          </div>

                          {/* ラベル */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">ラベル</label>
                            <input
                              type="text"
                              value={areas[editingAreaIndex].label}
                              onChange={(e) => {
                                const next = [...areas];
                                next[editingAreaIndex] = { ...next[editingAreaIndex], label: e.target.value };
                                setAreas(next);
                              }}
                              placeholder="ボタンの表示名"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                            />
                          </div>

                          {/* アクション値 */}
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">
                              {areas[editingAreaIndex].actionType === "uri" ? "URL" : "テキスト"}
                            </label>
                            <input
                              type="text"
                              value={areas[editingAreaIndex].actionValue}
                              onChange={(e) => {
                                const next = [...areas];
                                next[editingAreaIndex] = { ...next[editingAreaIndex], actionValue: e.target.value };
                                setAreas(next);
                              }}
                              placeholder={areas[editingAreaIndex].actionType === "uri" ? "https://..." : "送信するテキスト"}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-300 text-sm">
                          左のボタンを選択して設定してください
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3 flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-gray-500 hover:text-gray-700 text-sm font-medium">
                一覧へ戻る
              </button>
              <div className="flex-1" />
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="px-10 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-bold hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all disabled:opacity-40"
              >
                {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-1">リッチメニューを削除</h3>
              <p className="text-sm text-gray-500 mb-5">このリッチメニューを削除しますか？</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">
                  キャンセル
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25"
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
