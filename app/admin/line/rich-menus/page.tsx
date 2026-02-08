"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  action: {
    type: string;
    uri?: string;
    text?: string;
    label?: string;
    displayMethod?: string;
    tel?: string;
    actions?: ActionItem[];
    userMessage?: string;
    formSlug?: string;
  };
}

interface ActionItem {
  type: string;
  value: string;
  timing?: string;
  conditionEnabled?: boolean;
  mode?: string;
  fieldName?: string;
  valueType?: string;
  operation?: string;
}

interface TemplateOption {
  id: number;
  name: string;
}

interface MarkDefinition {
  id: number;
  value: string;
  label: string;
  color: string;
  icon: string;
}

interface ButtonConfig {
  actionType: "uri" | "tel" | "message" | "action" | "form" | "other";
  uri: string;
  tel: string;
  text: string;
  label: string;
  displayMethod: string;
  actions: ActionItem[];
  userMessage: string;
  formSlug: string;
  bounds: { x: number; y: number; width: number; height: number };
}

interface FormOption {
  id: number;
  name: string;
  slug: string;
  is_published: boolean;
}

const DISPLAY_METHODS = [
  { value: "browser_tall", label: "トーク内ブラウザ（大）" },
  { value: "browser_compact", label: "トーク内ブラウザ（小）" },
  { value: "browser_full", label: "トーク内ブラウザ（全画面）" },
  { value: "external", label: "外部ブラウザ" },
];

const ACTION_CATALOG = [
  { type: "text_send", label: "テキスト送信" },
  { type: "template_send", label: "テンプレート送信" },
  { type: "tag_op", label: "タグ操作" },
  { type: "friend_info", label: "友だち情報操作" },
  { type: "scenario", label: "シナリオ操作" },
  { type: "menu_op", label: "メニュー操作" },
  { type: "reminder", label: "リマインダ操作" },
  { type: "mark_display", label: "対応マーク・表示操作" },
  { type: "event_reservation", label: "イベント予約操作" },
  { type: "shared_info", label: "共通情報操作" },
  { type: "phase", label: "フェーズ操作" },
];

const TEMPLATE_PRESETS = [
  { label: "6分割", cols: 3, rows: 2 },
  { label: "4分割", cols: 2, rows: 2 },
  { label: "3分割", cols: 3, rows: 1 },
  { label: "2分割", cols: 2, rows: 1 },
];

const DEFAULT_BOUNDS = { x: 0, y: 0, width: 2500, height: 1686 };

function createDefaultButton(index: number, total: number): ButtonConfig {
  // 自動的にグリッド分割
  const cols = total <= 2 ? total : total <= 4 ? 2 : 3;
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const w = Math.round(2500 / cols);
  const h = Math.round(1686 / rows);
  return {
    actionType: "uri",
    uri: "",
    tel: "",
    text: "",
    label: "",
    displayMethod: "browser_tall",
    actions: [],
    userMessage: "",
    formSlug: "",
    bounds: { x: col * w, y: row * h, width: w, height: h },
  };
}

export default function RichMenuManagementPage() {
  const [menus, setMenus] = useState<RichMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingMenu, setEditingMenu] = useState<RichMenu | null>(null);

  // エディターステート
  const [name, setName] = useState("");
  const [chatBarText, setChatBarText] = useState("メニュー");
  const [menuInitialState, setMenuInitialState] = useState<"show" | "hide">("show");
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // 画像選択
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [mediaImages, setMediaImages] = useState<{ id: number; name: string; file_url: string }[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  // LINE同期オーバーレイ
  const [syncStatus, setSyncStatus] = useState<{ show: boolean; step: string; done: boolean; error: string | null }>({ show: false, step: "", done: false, error: null });

  // アクション設定モーダル
  const [actionModalIndex, setActionModalIndex] = useState<number | null>(null);
  const [tempActions, setTempActions] = useState<ActionItem[]>([]);
  const [repeatActions, setRepeatActions] = useState(true);

  // 回答フォーム一覧
  const [allForms, setAllForms] = useState<FormOption[]>([]);

  // テンプレート一覧
  const [allTemplates, setAllTemplates] = useState<TemplateOption[]>([]);

  // 対応マーク定義
  const [allMarks, setAllMarks] = useState<MarkDefinition[]>([]);

  // 領域設定モーダル
  const [boundsModalIndex, setBoundsModalIndex] = useState<number | null>(null);
  const [tempBounds, setTempBounds] = useState(DEFAULT_BOUNDS);
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const fetchMenus = async () => {
    const res = await fetch("/api/admin/line/rich-menus", { credentials: "include" });
    const data = await res.json();
    if (data.menus) setMenus(data.menus);
    setLoading(false);
  };

  useEffect(() => {
    fetchMenus();
    fetch("/api/admin/line/forms", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (data.forms) setAllForms(data.forms); });
    fetch("/api/admin/line/templates", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (data.templates) setAllTemplates(data.templates.map((t: { id: number; name: string }) => ({ id: t.id, name: t.name }))); });
    fetch("/api/admin/line/marks", { credentials: "include" })
      .then(r => r.json())
      .then(data => { if (data.marks) setAllMarks(data.marks.filter((m: MarkDefinition) => m.value !== "none")); });
  }, []);

  // --- Editor helpers ---
  const handleCreateNew = () => {
    setEditingMenu(null);
    setName("");
    setChatBarText("メニュー");
    setMenuInitialState("show");
    setImageUrl(null);
    // デフォルト6ボタン
    const initial: ButtonConfig[] = [];
    for (let i = 0; i < 6; i++) initial.push(createDefaultButton(i, 6));
    setButtons(initial);
    setShowEditor(true);
  };

  const handleEdit = (menu: RichMenu) => {
    setEditingMenu(menu);
    setName(menu.name);
    setChatBarText(menu.chat_bar_text);
    setMenuInitialState(menu.selected ? "show" : "hide");
    setImageUrl(menu.image_url);

    if (menu.areas.length > 0) {
      setButtons(menu.areas.map(a => ({
        actionType: (a.action.type as ButtonConfig["actionType"]) || "uri",
        uri: a.action.uri || "",
        tel: a.action.tel || "",
        text: a.action.text || "",
        label: a.action.label || "",
        displayMethod: a.action.displayMethod || "browser_tall",
        actions: a.action.actions || [],
        userMessage: a.action.userMessage || "",
        formSlug: a.action.formSlug || "",
        bounds: a.bounds || DEFAULT_BOUNDS,
      })));
    } else {
      const initial: ButtonConfig[] = [];
      for (let i = 0; i < 6; i++) initial.push(createDefaultButton(i, 6));
      setButtons(initial);
    }
    setShowEditor(true);
  };

  const addButton = () => {
    setButtons(prev => [...prev, createDefaultButton(prev.length, prev.length + 1)]);
  };

  const removeButton = (index: number) => {
    setButtons(prev => prev.filter((_, i) => i !== index));
  };

  const copyButton = (index: number) => {
    setButtons(prev => {
      const copy = { ...prev[index], bounds: { ...prev[index].bounds } };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const moveButton = (index: number, dir: -1 | 1) => {
    setButtons(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateButton = (index: number, patch: Partial<ButtonConfig>) => {
    setButtons(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const openImagePicker = async () => {
    setShowImagePicker(true);
    setLoadingMedia(true);
    const res = await fetch("/api/admin/line/media?file_type=menu_image", { credentials: "include" });
    const data = await res.json();
    // menu_image以外も画像なら表示
    if (!data.files || data.files.length === 0) {
      const resAll = await fetch("/api/admin/line/media", { credentials: "include" });
      const dataAll = await resAll.json();
      setMediaImages((dataAll.files || []).filter((f: { file_type: string }) => f.file_type === "image" || f.file_type === "menu_image"));
    } else {
      setMediaImages(data.files);
    }
    setLoadingMedia(false);
  };

  const applyPreset = (cols: number, rows: number) => {
    const total = cols * rows;
    const newButtons: ButtonConfig[] = [];
    for (let i = 0; i < total; i++) {
      newButtons.push(createDefaultButton(i, total));
    }
    setButtons(newButtons);
  };

  // --- 領域設定ドラッグ ---
  const CANVAS_W = 600;
  const CANVAS_H = 405; // 2500:1686 aspect ratio
  const scaleX = CANVAS_W / 2500;
  const scaleY = CANVAS_H / 1686;

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    isDragging.current = true;
    dragStart.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = Math.max(0, Math.min(CANVAS_W, e.clientX - rect.left));
    const cy = Math.max(0, Math.min(CANVAS_H, e.clientY - rect.top));
    const sx = dragStart.current.x;
    const sy = dragStart.current.y;

    setTempBounds({
      x: Math.round(Math.min(sx, cx) / scaleX),
      y: Math.round(Math.min(sy, cy) / scaleY),
      width: Math.round(Math.abs(cx - sx) / scaleX),
      height: Math.round(Math.abs(cy - sy) / scaleY),
    });
  }, [scaleX, scaleY]);

  const handleCanvasMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // --- Save ---
  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setSyncStatus({ show: true, step: "保存中...", done: false, error: null });

    const richMenuAreas: RichMenuArea[] = buttons.map(btn => ({
      bounds: btn.bounds,
      action: {
        type: btn.actionType,
        uri: btn.actionType === "uri" ? btn.uri : undefined,
        tel: btn.actionType === "tel" ? btn.tel : undefined,
        text: btn.actionType === "message" ? btn.text : undefined,
        label: btn.label,
        displayMethod: btn.actionType === "uri" ? btn.displayMethod : undefined,
        actions: btn.actionType === "action" ? btn.actions : undefined,
        userMessage: btn.userMessage || undefined,
        formSlug: btn.actionType === "form" ? btn.formSlug : undefined,
      },
    }));

    const body = {
      name: name.trim(),
      chat_bar_text: chatBarText || "メニュー",
      selected: menuInitialState === "show",
      size_type: "full",
      areas: richMenuAreas,
      image_url: imageUrl || null,
    };

    const url = editingMenu ? `/api/admin/line/rich-menus/${editingMenu.id}` : "/api/admin/line/rich-menus";
    const method = editingMenu ? "PUT" : "POST";

    setSyncStatus({ show: true, step: "LINEに反映中...", done: false, error: null });

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.sync_error) {
          setSyncStatus({ show: true, step: "", done: true, error: `LINE同期エラー: ${data.sync_error}` });
        } else {
          setSyncStatus({ show: true, step: "", done: true, error: null });
          setTimeout(() => {
            setSyncStatus({ show: false, step: "", done: false, error: null });
            setShowEditor(false);
          }, 1500);
        }
        await fetchMenus();
      } else {
        const data = await res.json().catch(() => ({}));
        setSyncStatus({ show: true, step: "", done: true, error: data.error || "保存に失敗しました" });
      }
    } catch (e: any) {
      console.error("handleSave error:", e);
      setSyncStatus({ show: true, step: "", done: true, error: "通信エラーが発生しました。再度お試しください。" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`/api/admin/line/rich-menus/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) { await fetchMenus(); setDeleteConfirm(null); }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  };

  // --- 一覧表示 ---
  if (!showEditor) {
    return (
      <div className="min-h-full bg-gray-50/50">
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
              <button onClick={handleCreateNew} className="px-5 py-2.5 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-medium hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                新規作成
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
            </div>
          ) : menus.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-teal-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <p className="text-gray-400 text-sm">リッチメニューがまだありません</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {menus.map(menu => (
                <div key={menu.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  <div className="px-5 py-4 border-b border-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-800 text-sm">{menu.name}</h3>
                      {menu.is_active && <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium border border-green-100">有効</span>}
                    </div>
                    <div className="text-xs text-gray-400">ボタン数: {menu.areas.length} / 作成日: {formatDate(menu.created_at)}</div>
                  </div>
                  <div className="px-5 py-4">
                    <div className="relative bg-gray-100 rounded-xl overflow-hidden" style={{ aspectRatio: "2500/1686" }}>
                      {menu.image_url && (
                        <img src={menu.image_url} alt={menu.name} className="absolute inset-0 w-full h-full object-cover" />
                      )}
                      {menu.areas.map((area, i) => (
                        <div
                          key={i}
                          className="absolute border border-white/60 bg-white/20 flex items-center justify-center text-sm font-bold text-gray-500"
                          style={{
                            left: `${(area.bounds.x / 2500) * 100}%`,
                            top: `${(area.bounds.y / 1686) * 100}%`,
                            width: `${(area.bounds.width / 2500) * 100}%`,
                            height: `${(area.bounds.height / 1686) * 100}%`,
                          }}
                        >
                          {i + 1}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2 bg-gray-100 rounded-lg py-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                      <span className="text-xs text-gray-500 font-medium">{menu.chat_bar_text}</span>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-gray-50 flex gap-2">
                    <button onClick={() => handleEdit(menu)} className="flex-1 px-3 py-2 text-xs font-medium bg-[#06C755] text-white rounded-lg hover:bg-[#05b34d]">編集</button>
                    <button onClick={() => setDeleteConfirm(menu.id)} className="px-3 py-2 text-xs font-medium border border-gray-200 text-gray-500 rounded-lg hover:bg-red-50 hover:text-red-500">削除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 削除確認 */}
        {deleteConfirm !== null && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-1">リッチメニューを削除</h3>
                <p className="text-sm text-gray-500 mb-5">このリッチメニューを削除しますか？</p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setDeleteConfirm(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium">キャンセル</button>
                  <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 text-sm font-medium shadow-lg shadow-red-500/25">削除する</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- エディター画面 (Lステップ風) ---
  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-5">
          <h1 className="text-lg font-bold text-gray-900">リッチメニュー編集</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* 画像 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="grid grid-cols-[120px_1fr] items-start gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 text-right pt-2">画像</label>
            <div className="flex items-center gap-4">
              <button onClick={openImagePicker} className="px-4 py-2 bg-[#06C755] text-white text-sm rounded-lg hover:bg-[#05b34d] w-fit flex-shrink-0">
                メニュー画像選択
              </button>
              {imageUrl && (
                <div className="flex items-center gap-3">
                  <img src={imageUrl} alt="メニュー画像" className="h-16 rounded-lg border border-gray-200 object-cover" style={{ aspectRatio: "2500/1686" }} />
                  <button onClick={() => setImageUrl(null)} className="text-xs text-red-500 hover:text-red-700">解除</button>
                </div>
              )}
            </div>
          </div>

          {/* タイトル */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 text-right">
              タイトル <span className="text-red-500 text-xs bg-red-50 px-1.5 py-0.5 rounded ml-1">必須</span>
            </label>
            <div>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="管理画面に表示するメニューの名前を入力します"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
              <p className="text-xs text-gray-400 mt-1">管理画面に表示するメニューの名前を入力します</p>
            </div>
          </div>

          {/* フォルダ */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 text-right">フォルダ</label>
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-white">
              <option>未分類</option>
            </select>
          </div>

          {/* トークルームメニュー */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 text-right">
              トークルームメニュー <span className="text-red-500 text-xs bg-red-50 px-1.5 py-0.5 rounded ml-1">必須</span>
            </label>
            <div>
              <input type="text" value={chatBarText} onChange={e => setChatBarText(e.target.value)} maxLength={14}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400" />
              <p className="text-xs text-gray-400 mt-1">トークルームに表示されるメニューのテキストを設定します(14文字以内)</p>
            </div>
          </div>

          {/* メニューの初期状態 */}
          <div className="grid grid-cols-[120px_1fr] items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 text-right">メニューの初期状態</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="menuState" checked={menuInitialState === "hide"} onChange={() => setMenuInitialState("hide")} className="accent-[#06C755]" />
                表示しない
              </label>
              <label className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="menuState" checked={menuInitialState === "show"} onChange={() => setMenuInitialState("show")} className="accent-[#06C755]" />
                表示する
              </label>
            </div>
          </div>

          {/* テンプレートプリセット */}
          <div className="grid grid-cols-[120px_1fr] items-start gap-4 mb-4">
            <label className="text-sm font-medium text-gray-700 text-right pt-2">テンプレート</label>
            <div className="flex gap-2 flex-wrap">
              {TEMPLATE_PRESETS.map(preset => (
                <button key={preset.label} onClick={() => applyPreset(preset.cols, preset.rows)}
                  className="flex flex-col items-center p-2.5 rounded-lg border border-gray-200 hover:border-[#06C755] hover:bg-green-50 transition-all min-w-[70px]">
                  <div className="grid gap-px mb-1" style={{ gridTemplateColumns: `repeat(${preset.cols}, 1fr)` }}>
                    {Array.from({ length: preset.cols * preset.rows }).map((_, i) => (
                      <div key={i} className="w-4 h-3 bg-gray-200 rounded-[2px]" />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-500">{preset.label}</span>
                </button>
              ))}
              <button onClick={() => applyPreset(1, 1)}
                className="flex items-center justify-center p-2.5 rounded-lg border border-gray-200 hover:border-red-300 hover:bg-red-50 text-xs text-gray-500 hover:text-red-500 min-w-[70px]">
                リセット
              </button>
            </div>
          </div>
        </div>

        {/* コンテンツ設定 - ボタン一覧 */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-700 mb-4">コンテンツ設定</h2>

          <div className="space-y-4">
            {buttons.map((btn, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                {/* ボタンヘッダー */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-700">ボタン{idx + 1}</span>
                    <button onClick={() => { setBoundsModalIndex(idx); setTempBounds(btn.bounds); }}
                      className="text-[10px] bg-green-500 text-white px-2.5 py-0.5 rounded-full font-medium hover:bg-green-600">
                      領域編集
                    </button>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <button onClick={() => moveButton(idx, -1)} disabled={idx === 0}
                      className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 flex items-center gap-0.5">
                      <span>↑</span> 上へ
                    </button>
                    <button onClick={() => moveButton(idx, 1)} disabled={idx === buttons.length - 1}
                      className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-30 flex items-center gap-0.5">
                      <span>↓</span> 下へ
                    </button>
                    <button onClick={() => copyButton(idx)}
                      className="px-2 py-1 border border-gray-300 rounded hover:bg-gray-100 flex items-center gap-0.5">
                      コピー
                    </button>
                    <button onClick={() => removeButton(idx)}
                      className="px-2 py-1 border border-gray-300 rounded hover:bg-red-50 hover:text-red-500 hover:border-red-300 flex items-center gap-0.5">
                      ✕ 削除
                    </button>
                  </div>
                </div>

                {/* ボタン設定本体 */}
                <div className="p-4 space-y-4">
                  {/* アクションタイプ選択 */}
                  <div className="flex flex-wrap gap-3">
                    {([
                      { value: "uri", label: "URL" },
                      { value: "tel", label: "TEL" },
                      { value: "message", label: "ユーザーメッセージ" },
                      { value: "action", label: "アクション" },
                      { value: "form", label: "回答フォーム" },
                      { value: "other", label: "その他" },
                    ] as const).map(at => (
                      <label key={at.value} className="flex items-center gap-1.5">
                        <input type="radio" name={`actionType_${idx}`} checked={btn.actionType === at.value}
                          onChange={() => updateButton(idx, { actionType: at.value })} className="accent-[#06C755]" />
                        <span className="text-sm text-gray-700">{at.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* URL設定 */}
                  {btn.actionType === "uri" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 flex-shrink-0 w-16">表示方法</label>
                        <select value={btn.displayMethod} onChange={e => updateButton(idx, { displayMethod: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white">
                          {DISPLAY_METHODS.map(dm => <option key={dm.value} value={dm.value}>{dm.label}</option>)}
                        </select>
                        <input type="text" value={btn.uri} onChange={e => updateButton(idx, { uri: e.target.value })}
                          placeholder="https://..." className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                      </div>
                    </div>
                  )}

                  {/* TEL設定 */}
                  {btn.actionType === "tel" && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600 flex-shrink-0 w-16">電話番号</label>
                      <input type="text" value={btn.tel} onChange={e => updateButton(idx, { tel: e.target.value })}
                        placeholder="tel:+8190XXXXXXXX" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                    </div>
                  )}

                  {/* ユーザーメッセージ設定 */}
                  {btn.actionType === "message" && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm text-gray-600 flex-shrink-0 w-16">テキスト</label>
                      <input type="text" value={btn.text} onChange={e => updateButton(idx, { text: e.target.value })}
                        placeholder="ユーザーが送信するテキスト" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                    </div>
                  )}

                  {/* アクション設定 */}
                  {btn.actionType === "action" && (
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setActionModalIndex(idx); setTempActions(btn.actions || []); setRepeatActions(true); }}
                          className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-white rounded-lg text-sm font-medium hover:from-amber-500 hover:to-yellow-600 flex items-center justify-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          アクション設定
                        </button>
                        <button onClick={() => updateButton(idx, { actions: [] })}
                          className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                          設定解除
                        </button>
                      </div>
                      {/* 設定済みアクション表示 */}
                      {btn.actions.length > 0 && (
                        <div className="space-y-1">
                          {btn.actions.map((a, ai) => (
                            <div key={ai} className="text-xs text-gray-500 flex items-center gap-1">
                              <span className="text-gray-400">{ACTION_CATALOG.find(ac => ac.type === a.type)?.label || a.type}</span>
                              {a.value && <span className="text-gray-400">: {a.value}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* ユーザーメッセージ(任意) */}
                      <div>
                        <label className="text-sm text-gray-600">ユーザーメッセージ(任意)</label>
                        <input type="text" value={btn.userMessage} onChange={e => updateButton(idx, { userMessage: e.target.value })}
                          maxLength={60} className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                        <p className="text-[11px] text-gray-400 mt-0.5">60文字以内</p>
                      </div>
                    </div>
                  )}

                  {/* 回答フォーム */}
                  {btn.actionType === "form" && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 flex-shrink-0 w-16">フォーム</label>
                        <select
                          value={btn.formSlug}
                          onChange={e => updateButton(idx, { formSlug: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                        >
                          <option value="">フォームを選択</option>
                          {allForms.filter(f => f.is_published).map(f => (
                            <option key={f.id} value={f.slug}>{f.name}</option>
                          ))}
                        </select>
                      </div>
                      {btn.formSlug && (
                        <p className="text-xs text-gray-400">URL: {typeof window !== "undefined" ? window.location.origin : ""}/forms/{btn.formSlug}</p>
                      )}
                    </div>
                  )}

                  {/* その他 */}
                  {btn.actionType === "other" && (
                    <div className="text-sm text-gray-400 py-2">
                      その他の設定は今後追加予定です
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* ボタン追加 */}
            <button onClick={addButton}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-[#06C755] hover:text-[#06C755] hover:bg-green-50 transition-all flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              ボタンを追加
            </button>
          </div>
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between">
          <button onClick={() => setShowEditor(false)} className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
            一覧へ戻る
          </button>
          <button onClick={handleSave} disabled={saving || !name.trim()}
            className="px-16 py-3 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-bold hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25 transition-all disabled:opacity-40">
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>

      {/* LINE同期オーバーレイ */}
      {syncStatus.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
            {!syncStatus.done ? (
              <>
                <div className="w-14 h-14 mx-auto mb-4 relative">
                  <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
                  <div className="absolute inset-0 border-4 border-transparent border-t-[#06C755] rounded-full animate-spin" />
                </div>
                <p className="text-base font-bold text-gray-800 mb-1">{syncStatus.step}</p>
                <p className="text-sm text-gray-400">メニューの作成・画像アップロード・ユーザー反映を行っています。この画面を閉じないでください。</p>
              </>
            ) : syncStatus.error ? (
              <>
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-base font-bold text-gray-800 mb-1">同期に失敗しました</p>
                <p className="text-sm text-red-500 mb-4">{syncStatus.error}</p>
                <button
                  onClick={() => setSyncStatus({ show: false, step: "", done: false, error: null })}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
                >
                  閉じる
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-[#06C755]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-base font-bold text-gray-800">反映が完了しました</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* アクション設定モーダル (Lステップ風) */}
      {actionModalIndex !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setActionModalIndex(null)}>
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-lg">アクション設定</h2>
              <button onClick={() => setActionModalIndex(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-6 overflow-y-auto">
              {/* 設定済みアクション一覧 (上部) */}
              {tempActions.length > 0 && (
                <div className="space-y-4 mb-6">
                  {tempActions.map((a, ai) => {
                    const catalog = ACTION_CATALOG.find(ac => ac.type === a.type);
                    const placeholder: Record<string, string> = {
                      text_send: "送信するテキストを入力",
                      template_send: "テンプレート名を入力",
                      tag_op: "タグ名を入力（例: VIP, 新規）",
                      friend_info: "フィールド名=値（例: メモ=重要顧客）",
                      scenario: "シナリオ名を入力",
                      menu_op: "メニュー名またはIDを入力",
                      reminder: "リマインダ内容を入力",
                      mark_display: "マーク（red/yellow/green/blue/gray）",
                      event_reservation: "イベント名を入力",
                      shared_info: "キー=値を入力",
                      phase: "フェーズ名を入力",
                    };
                    return (
                      <div key={ai} className="border border-gray-200 rounded-xl overflow-hidden">
                        {/* アクションヘッダー */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 cursor-grab select-none text-lg leading-none">≡</span>
                            <span className="text-sm font-bold text-gray-700">{`${ai + 1}. ${catalog?.label || a.type}`}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, conditionEnabled: !item.conditionEnabled } : item))}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs border transition-all ${
                                a.conditionEnabled
                                  ? "border-[#06C755] bg-green-50 text-[#06C755]"
                                  : "border-gray-300 text-gray-500 hover:bg-gray-100"
                              }`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                              {a.conditionEnabled ? "条件ON" : "条件OFF"}
                            </button>
                            <button
                              onClick={() => setTempActions(prev => {
                                if (ai === 0) return prev;
                                const next = [...prev];
                                [next[ai - 1], next[ai]] = [next[ai], next[ai - 1]];
                                return next;
                              })}
                              disabled={ai === 0}
                              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                            </button>
                            <button
                              onClick={() => setTempActions(prev => {
                                if (ai === prev.length - 1) return prev;
                                const next = [...prev];
                                [next[ai], next[ai + 1]] = [next[ai + 1], next[ai]];
                                return next;
                              })}
                              disabled={ai === tempActions.length - 1}
                              className="p-1.5 rounded border border-gray-300 hover:bg-gray-100 text-gray-400 disabled:opacity-30 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                            <button onClick={() => setTempActions(prev => prev.filter((_, idx) => idx !== ai))}
                              className="p-1.5 rounded border border-gray-300 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>

                        {/* アクション設定本体 */}
                        <div className="p-4 space-y-3">
                          {a.type === "template_send" ? (
                            <>
                              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label className="text-sm text-gray-600 text-right">テンプレート</label>
                                <select
                                  value={a.value}
                                  onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, value: e.target.value } : item))}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                                >
                                  <option value="">テンプレート名を入力</option>
                                  {allTemplates.map(t => (
                                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label className="text-sm text-gray-600 text-right">送信タイミング</label>
                                <select
                                  value={a.timing || "immediate"}
                                  onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, timing: e.target.value } : item))}
                                  className="w-fit px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                                >
                                  <option value="immediate">すぐに送信する</option>
                                  <option value="after_1min">1分後に送信</option>
                                  <option value="after_5min">5分後に送信</option>
                                  <option value="after_30min">30分後に送信</option>
                                  <option value="after_1hour">1時間後に送信</option>
                                  <option value="after_1day">1日後に送信</option>
                                </select>
                              </div>
                            </>
                          ) : a.type === "tag_op" ? (
                            <>
                              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label className="text-sm text-gray-600 text-right">タグ操作</label>
                                <div className="flex items-center gap-6">
                                  <label className="flex items-center gap-1.5 text-sm">
                                    <input type="radio" checked={(a.mode || "add") === "add"}
                                      onChange={() => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, mode: "add" } : item))}
                                      className="accent-[#06C755]" />
                                    タグを追加
                                  </label>
                                  <label className="flex items-center gap-1.5 text-sm">
                                    <input type="radio" checked={a.mode === "remove"}
                                      onChange={() => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, mode: "remove" } : item))}
                                      className="accent-[#06C755]" />
                                    タグをはずす
                                  </label>
                                </div>
                              </div>
                              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label className="text-sm text-gray-600 text-right">タグ選択</label>
                                <input
                                  type="text"
                                  value={a.value}
                                  onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, value: e.target.value } : item))}
                                  placeholder="タグ名を入力"
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                                />
                              </div>
                            </>
                          ) : a.type === "friend_info" ? (
                            <>
                              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label className="text-sm text-gray-600 text-right">友だち情報選択</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={a.fieldName || ""}
                                    onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, fieldName: e.target.value } : item))}
                                    placeholder="友だち情報名を入力"
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                                  />
                                  <span className="text-sm text-gray-600 flex-shrink-0">に</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label className="text-sm text-gray-600 text-right">操作内容</label>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={a.valueType || "constant"}
                                    onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, valueType: e.target.value } : item))}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                                  >
                                    <option value="constant">定数</option>
                                    <option value="friend_info">友だち情報</option>
                                  </select>
                                  <input
                                    type="text"
                                    value={a.value}
                                    onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, value: e.target.value } : item))}
                                    placeholder=""
                                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                                  />
                                  <span className="text-sm text-gray-600 flex-shrink-0">を</span>
                                  <select
                                    value={a.operation || "assign"}
                                    onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, operation: e.target.value } : item))}
                                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                                  >
                                    <option value="assign">← (代入)</option>
                                    <option value="append">+ (追加)</option>
                                    <option value="delete">× (削除)</option>
                                  </select>
                                  <span className="text-sm text-gray-600 flex-shrink-0">する</span>
                                </div>
                              </div>
                            </>
                          ) : a.type === "mark_display" ? (
                            <>
                              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label className="text-sm text-gray-600 text-right">対応マーク</label>
                                <select
                                  value={a.value}
                                  onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, value: e.target.value } : item))}
                                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                                >
                                  <option value="">変更しない</option>
                                  {allMarks.map(m => (
                                    <option key={m.id} value={m.value}>{m.icon} {m.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                                <label className="text-sm text-gray-600 text-right">表示状態</label>
                                <select
                                  value={a.mode || ""}
                                  onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, mode: e.target.value } : item))}
                                  className="w-fit px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                                >
                                  <option value="">変更しない</option>
                                  <option value="show">表示</option>
                                  <option value="hide">非表示</option>
                                </select>
                              </div>
                            </>
                          ) : a.type === "menu_op" ? (
                            <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                              <label className="text-sm text-gray-600 text-right">メニュー変更</label>
                              <select
                                value={a.value}
                                onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, value: e.target.value } : item))}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 bg-white"
                              >
                                <option value="">リッチメニュー名を入力</option>
                                {menus.map(m => (
                                  <option key={m.id} value={String(m.id)}>{m.name}</option>
                                ))}
                              </select>
                            </div>
                          ) : a.type === "text_send" ? (
                            <div className="grid grid-cols-[100px_1fr] items-start gap-3">
                              <label className="text-sm text-gray-600 text-right pt-2">テキスト</label>
                              <textarea
                                value={a.value}
                                onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, value: e.target.value } : item))}
                                placeholder={placeholder[a.type]}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 resize-y"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-[100px_1fr] items-center gap-3">
                              <label className="text-sm text-gray-600 text-right">{catalog?.label || a.type}</label>
                              <input
                                type="text"
                                value={a.value}
                                onChange={e => setTempActions(prev => prev.map((item, idx) => idx === ai ? { ...item, value: e.target.value } : item))}
                                placeholder={placeholder[a.type] || "値を入力"}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 動作追加ボタン (下部) */}
              <p className="text-sm text-gray-500 text-center mb-3">動作を更に追加できます</p>
              <div className="flex flex-wrap justify-center gap-2">
                {ACTION_CATALOG.map(ac => (
                  <button key={ac.type}
                    onClick={() => setTempActions(prev => [...prev, { type: ac.type, value: "", timing: ac.type === "template_send" ? "immediate" : undefined, mode: ac.type === "tag_op" ? "add" : undefined }])}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-all">
                    {ac.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" checked={repeatActions} onChange={e => setRepeatActions(e.target.checked)}
                    className="accent-[#06C755] w-4 h-4" />
                  発動2回目以降も各動作を実行する
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
              <button onClick={() => {
                updateButton(actionModalIndex, { actions: tempActions });
                setActionModalIndex(null);
              }}
                className="w-full py-3 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-xl text-sm font-bold hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25">
                この条件で決定する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 領域設定モーダル */}
      {boundsModalIndex !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setBoundsModalIndex(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">領域設定</h2>
              <button onClick={() => setBoundsModalIndex(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-6">
              {/* 画像エリア（ドラッグ選択可能） */}
              <div
                ref={canvasRef}
                className="relative bg-gray-200 rounded-xl overflow-hidden cursor-crosshair select-none mx-auto"
                style={{ width: CANVAS_W, height: CANVAS_H }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              >
                {imageUrl && <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                {/* 全ボタン領域表示 */}
                {buttons.map((b, i) => (
                  <div key={i}
                    className={`absolute border ${i === boundsModalIndex ? "border-transparent" : "border-white/40 bg-white/10"}`}
                    style={{
                      left: b.bounds.x * scaleX,
                      top: b.bounds.y * scaleY,
                      width: b.bounds.width * scaleX,
                      height: b.bounds.height * scaleY,
                    }}>
                    <span className="absolute inset-0 flex items-center justify-center text-white/60 text-sm font-bold">{i + 1}</span>
                  </div>
                ))}
                {/* 選択中の領域 */}
                <div className="absolute bg-red-400/30 border-2 border-red-400"
                  style={{
                    left: tempBounds.x * scaleX,
                    top: tempBounds.y * scaleY,
                    width: Math.max(tempBounds.width * scaleX, 2),
                    height: Math.max(tempBounds.height * scaleY, 2),
                  }} />
              </div>

              {/* 座標入力 */}
              <div className="flex items-center gap-3 mt-4 justify-center">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded-l-lg border border-gray-200">X座標</label>
                  <input type="number" value={tempBounds.x} onChange={e => setTempBounds(prev => ({ ...prev, x: Number(e.target.value) }))}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-r-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded-l-lg border border-gray-200">Y座標</label>
                  <input type="number" value={tempBounds.y} onChange={e => setTempBounds(prev => ({ ...prev, y: Number(e.target.value) }))}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-r-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded-l-lg border border-gray-200">幅</label>
                  <input type="number" value={tempBounds.width} onChange={e => setTempBounds(prev => ({ ...prev, width: Number(e.target.value) }))}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-r-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-500 bg-gray-100 px-2 py-1.5 rounded-l-lg border border-gray-200">高さ</label>
                  <input type="number" value={tempBounds.height} onChange={e => setTempBounds(prev => ({ ...prev, height: Number(e.target.value) }))}
                    className="w-16 px-2 py-1.5 border border-gray-200 rounded-r-lg text-sm text-center focus:outline-none focus:ring-1 focus:ring-green-500" />
                </div>
                <button onClick={() => {
                  updateButton(boundsModalIndex, { bounds: { ...tempBounds } });
                  setBoundsModalIndex(null);
                }}
                  className="px-6 py-2 bg-gradient-to-r from-[#06C755] to-[#05a648] text-white rounded-lg text-sm font-bold hover:from-[#05b34d] hover:to-[#049a42] shadow-lg shadow-green-500/25">
                  確定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 画像ピッカーモーダル */}
      {showImagePicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowImagePicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">メニュー画像を選択</h2>
                <p className="text-xs text-gray-400 mt-0.5">メディアに登録済みの画像から選択（推奨: 2500x1686px または 2500x843px）</p>
              </div>
              <button onClick={() => setShowImagePicker(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {loadingMedia ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-green-200 border-t-green-500 rounded-full animate-spin" />
                </div>
              ) : mediaImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">画像がありません</p>
                  <p className="text-xs text-gray-400 mt-1">メディア管理から先に画像をアップロードしてください</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {mediaImages.map(img => (
                    <button
                      key={img.id}
                      onClick={() => { setImageUrl(img.file_url); setShowImagePicker(false); }}
                      className={`relative rounded-xl overflow-hidden border-2 transition-all hover:shadow-md ${
                        imageUrl === img.file_url ? "border-[#06C755] ring-2 ring-[#06C755]/30" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="aspect-video bg-gray-50">
                        <img src={img.file_url} alt={img.name} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      <div className="px-2 py-1.5 bg-white">
                        <p className="text-[11px] text-gray-600 truncate">{img.name}</p>
                      </div>
                      {imageUrl === img.file_url && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-[#06C755] rounded-full flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
