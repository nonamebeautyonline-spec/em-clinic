"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import dynamic from "next/dynamic";

const AreaChart = dynamic(() => import("recharts").then(m => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(m => m.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });

interface StatsData {
  summary: { total_clicks: number; total_conversions: number; cvr: number; source_count: number };
  daily: { date: string; clicks: number; conversions: number }[];
  by_source: { source_id: number; name: string; clicks: number; conversions: number; cvr: number }[];
  by_utm_source: { name: string; count: number }[];
}

// ─── 型定義 ───────────────────────────────

interface Folder {
  id: number;
  name: string;
  source_count: number;
}

interface TrackingSource {
  id: number;
  code: string;
  name: string;
  folder_id: number | null;
  destination_url: string;
  qr_display_text: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  action_settings: { enabled: boolean; steps: unknown[] };
  ignore_friend_add_action: boolean;
  action_execution: string;
  utm_defaults: Record<string, string>;
  custom_params: { key: string; field: string }[];
  html_head_tags: string | null;
  html_body_tags: string | null;
  memo: string | null;
  visit_count: number;
  converted_count: number;
  cvr: number;
  tracking_url: string;
  created_at: string;
}

// ─── メインコンポーネント ──────────────────────

export default function TrackingSourcesPage() {
  const [selectedFolder, setSelectedFolder] = useState<number | "uncategorized" | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "stats">("list");

  // データ取得
  const foldersKey = "/api/admin/line/tracking-source-folders";
  const sourcesKey = selectedFolder
    ? `/api/admin/line/tracking-sources?folder_id=${selectedFolder}`
    : "/api/admin/line/tracking-sources";
  const { data: foldersData } = useSWR<{ folders: Folder[] }>(foldersKey);
  const { data: sourcesData, isLoading } = useSWR<{ sources: TrackingSource[] }>(sourcesKey);

  // 統計データ（statsモード時のみ取得）
  const statsFrom = useMemo(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), []);
  const statsTo = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const statsKey = viewMode === "stats" ? `/api/admin/line/tracking-sources/stats?from=${statsFrom}&to=${statsTo}` : null;
  const { data: statsData } = useSWR<StatsData>(statsKey);

  const folders = foldersData?.folders ?? [];
  const sources = sourcesData?.sources ?? [];

  // モーダル状態
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "utm" | "html">("basic");
  const [editingSource, setEditingSource] = useState<TrackingSource | null>(null);
  const [saving, setSaving] = useState(false);

  // フォーム状態
  const [formName, setFormName] = useState("");
  const [formDestUrl, setFormDestUrl] = useState("");
  const [formFolderId, setFormFolderId] = useState<number | null>(null);
  const [formQrText, setFormQrText] = useState("");
  const [formValidFrom, setFormValidFrom] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formIgnoreFriendAdd, setFormIgnoreFriendAdd] = useState(false);
  const [formActionExecution, setFormActionExecution] = useState("always");
  // UTM
  const [formUtmSource, setFormUtmSource] = useState("");
  const [formUtmMedium, setFormUtmMedium] = useState("");
  const [formUtmCampaign, setFormUtmCampaign] = useState("");
  const [formUtmTerm, setFormUtmTerm] = useState("");
  const [formUtmContent, setFormUtmContent] = useState("");
  const [formCustomParams, setFormCustomParams] = useState<{ key: string; field: string }[]>([]);
  // HTML
  const [formHeadTags, setFormHeadTags] = useState("");
  const [formBodyTags, setFormBodyTags] = useState("");

  // QRモーダル
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSource, setQrSource] = useState<TrackingSource | null>(null);
  const [qrSvg, setQrSvg] = useState("");

  // フォルダ操作
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [editingFolder, setEditingFolder] = useState<number | null>(null);
  const [editFolderName, setEditFolderName] = useState("");

  const revalidate = useCallback(() => {
    mutate(sourcesKey);
    mutate(foldersKey);
  }, [sourcesKey]);

  // ─── フォルダ操作 ──────────────────────────

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    await fetch("/api/admin/line/tracking-source-folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newFolderName }),
    });
    setNewFolderName("");
    setShowNewFolder(false);
    revalidate();
  };

  const renameFolder = async (id: number) => {
    if (!editFolderName.trim()) return;
    await fetch("/api/admin/line/tracking-source-folders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id, name: editFolderName }),
    });
    setEditingFolder(null);
    revalidate();
  };

  const deleteFolder = async (id: number) => {
    if (!confirm("フォルダを削除しますか？中の流入経路は未分類に移動されます。")) return;
    await fetch(`/api/admin/line/tracking-source-folders?id=${id}`, { method: "DELETE", credentials: "include" });
    if (selectedFolder === id) setSelectedFolder(null);
    revalidate();
  };

  // ─── 流入経路操作 ──────────────────────────

  const resetForm = () => {
    setFormName("");
    setFormDestUrl("");
    setFormFolderId(typeof selectedFolder === "number" ? selectedFolder : null);
    setFormQrText("");
    setFormValidFrom("");
    setFormValidUntil("");
    setFormMemo("");
    setFormIsActive(true);
    setFormIgnoreFriendAdd(false);
    setFormActionExecution("always");
    setFormUtmSource("");
    setFormUtmMedium("");
    setFormUtmCampaign("");
    setFormUtmTerm("");
    setFormUtmContent("");
    setFormCustomParams([]);
    setFormHeadTags("");
    setFormBodyTags("");
    setActiveTab("basic");
  };

  const openNewSource = () => {
    setEditingSource(null);
    resetForm();
    setShowModal(true);
  };

  const openEditSource = (s: TrackingSource) => {
    setEditingSource(s);
    setFormName(s.name);
    setFormDestUrl(s.destination_url);
    setFormFolderId(s.folder_id);
    setFormQrText(s.qr_display_text || "");
    setFormValidFrom(s.valid_from ? s.valid_from.slice(0, 16) : "");
    setFormValidUntil(s.valid_until ? s.valid_until.slice(0, 16) : "");
    setFormMemo(s.memo || "");
    setFormIsActive(s.is_active);
    setFormIgnoreFriendAdd(s.ignore_friend_add_action);
    setFormActionExecution(s.action_execution);
    setFormUtmSource(s.utm_defaults?.utm_source || "");
    setFormUtmMedium(s.utm_defaults?.utm_medium || "");
    setFormUtmCampaign(s.utm_defaults?.utm_campaign || "");
    setFormUtmTerm(s.utm_defaults?.utm_term || "");
    setFormUtmContent(s.utm_defaults?.utm_content || "");
    setFormCustomParams(s.custom_params || []);
    setFormHeadTags(s.html_head_tags || "");
    setFormBodyTags(s.html_body_tags || "");
    setActiveTab("basic");
    setShowModal(true);
  };

  const saveSource = async () => {
    if (!formName.trim() || !formDestUrl.trim()) return;
    setSaving(true);

    const body = {
      id: editingSource?.id,
      name: formName,
      destination_url: formDestUrl,
      folder_id: formFolderId,
      qr_display_text: formQrText || null,
      valid_from: formValidFrom || null,
      valid_until: formValidUntil || null,
      is_active: formIsActive,
      ignore_friend_add_action: formIgnoreFriendAdd,
      action_execution: formActionExecution,
      utm_defaults: {
        ...(formUtmSource && { utm_source: formUtmSource }),
        ...(formUtmMedium && { utm_medium: formUtmMedium }),
        ...(formUtmCampaign && { utm_campaign: formUtmCampaign }),
        ...(formUtmTerm && { utm_term: formUtmTerm }),
        ...(formUtmContent && { utm_content: formUtmContent }),
      },
      custom_params: formCustomParams.filter(p => p.key.trim()),
      html_head_tags: formHeadTags || null,
      html_body_tags: formBodyTags || null,
      memo: formMemo || null,
    };

    await fetch("/api/admin/line/tracking-sources", {
      method: editingSource ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    setSaving(false);
    setShowModal(false);
    revalidate();
  };

  const deleteSource = async (id: number) => {
    if (!confirm("この流入経路を削除しますか？訪問記録も削除されます。")) return;
    await fetch(`/api/admin/line/tracking-sources?id=${id}`, { method: "DELETE", credentials: "include" });
    revalidate();
  };

  const toggleActive = async (s: TrackingSource) => {
    await fetch("/api/admin/line/tracking-sources", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ id: s.id, is_active: !s.is_active }),
    });
    revalidate();
  };

  // ─── QRコード ──────────────────────────

  const showQr = async (s: TrackingSource) => {
    setQrSource(s);
    setQrSvg("");
    setShowQrModal(true);
    try {
      const QRCode = (await import("qrcode")).default;
      const svg = await QRCode.toString(s.tracking_url, { type: "svg", margin: 2, width: 256 });
      setQrSvg(svg);
    } catch {
      setQrSvg("<p>QRコード生成に失敗しました</p>");
    }
  };

  const downloadQrPng = async () => {
    if (!qrSource) return;
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(qrSource.tracking_url, { margin: 2, width: 512 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qr_${qrSource.code}.png`;
      a.click();
    } catch { /* ignore */ }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  // ─── フィルタ ──────────────────────────

  const filteredSources = sources.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.includes(search)
  );

  const totalSources = folders.reduce((sum, f) => sum + f.source_count, 0);

  // ─── ローディング ──────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
      </div>
    );
  }

  // ─── レンダリング ──────────────────────────

  return (
    <div className="max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">流入経路</h1>
          <p className="text-sm text-gray-400 mt-1">友だち追加の流入元を計測・分析できます。経路ごとにQRコードやトラッキングURLを発行し、クリック数・CV数を追跡します。</p>
        </div>
      </div>

      {/* ビュー切り替え */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "list" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            一覧
          </button>
          <button
            onClick={() => setViewMode("stats")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === "stats" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            統計
          </button>
        </div>

        {viewMode === "list" && (
          <>
            <button
              onClick={() => setShowNewFolder(true)}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              新しいフォルダ
            </button>
            <button
              onClick={openNewSource}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00B900] text-white rounded-lg text-sm font-medium hover:bg-[#009900] transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              新しい流入経路
            </button>
            <div className="ml-auto">
              <div className="relative">
                <svg className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="検索"
                  className="w-48 pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* 統計ダッシュボード */}
      {viewMode === "stats" && statsData && (
        <div className="space-y-6 mb-8">
          {/* KPIカード */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "総クリック数", value: statsData.summary.total_clicks.toLocaleString(), color: "text-blue-600" },
              { label: "コンバージョン数", value: statsData.summary.total_conversions.toLocaleString(), color: "text-green-600" },
              { label: "CVR", value: `${statsData.summary.cvr}%`, color: "text-purple-600" },
              { label: "経路数", value: String(statsData.summary.source_count), color: "text-orange-600" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* 日別推移グラフ */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">日別クリック数・CV数（過去30日）</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={statsData.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="clicks" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} name="クリック" />
                <Area type="monotone" dataKey="conversions" stroke="#10B981" fill="#10B981" fillOpacity={0.15} name="CV" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 経路別比較 + UTM内訳 */}
          <div className="grid grid-cols-2 gap-6">
            {/* 経路別 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-4">経路別クリック数 TOP10</h3>
              {statsData.by_source.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">データなし</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={statsData.by_source.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="clicks" fill="#3B82F6" name="クリック" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="conversions" fill="#10B981" name="CV" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* UTM Source別 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-medium text-gray-700 mb-4">UTM Source別</h3>
              {statsData.by_utm_source.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">データなし</p>
              ) : (
                <div className="space-y-2">
                  {statsData.by_utm_source.map((item, i) => {
                    const maxCount = statsData.by_utm_source[0]?.count || 1;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-24 truncate">{item.name}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-full rounded-full transition-all"
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">{item.count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === "stats" && !statsData && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
        </div>
      )}

      {viewMode === "list" && <div className="flex gap-6">
        {/* フォルダサイドバー */}
        <div className="w-56 flex-shrink-0">
          <button
            onClick={() => setSelectedFolder(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors flex items-center justify-between ${selectedFolder === null ? "bg-[#00B900]/10 text-[#00B900] font-medium" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              すべて
            </span>
            <span className="text-xs text-gray-400">{totalSources}</span>
          </button>

          <button
            onClick={() => setSelectedFolder("uncategorized")}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors flex items-center justify-between ${selectedFolder === "uncategorized" ? "bg-[#00B900]/10 text-[#00B900] font-medium" : "text-gray-600 hover:bg-gray-50"}`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
              未分類
            </span>
          </button>

          {folders.map(folder => (
            <div key={folder.id} className="group relative">
              {editingFolder === folder.id ? (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    type="text"
                    value={editFolderName}
                    onChange={e => setEditFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") renameFolder(folder.id); if (e.key === "Escape") setEditingFolder(null); }}
                    className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#00B900]"
                    autoFocus
                  />
                  <button onClick={() => renameFolder(folder.id)} className="text-[#00B900] text-xs font-medium">保存</button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition-colors flex items-center justify-between ${selectedFolder === folder.id ? "bg-[#00B900]/10 text-[#00B900] font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                    {folder.name}
                  </span>
                  <span className="text-xs text-gray-400">{folder.source_count}</span>
                </button>
              )}
              {editingFolder !== folder.id && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); setEditingFolder(folder.id); setEditFolderName(folder.name); }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="名前変更"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="削除"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* 新規フォルダ入力 */}
          {showNewFolder && (
            <div className="flex items-center gap-1 px-2 py-1 mt-1">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                placeholder="フォルダ名"
                className="flex-1 px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#00B900]"
                autoFocus
              />
              <button onClick={createFolder} className="text-[#00B900] text-xs font-medium">作成</button>
            </div>
          )}
        </div>

        {/* メイン: 経路テーブル */}
        <div className="flex-1 min-w-0">
          {filteredSources.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              <p className="text-sm">流入経路がまだありません</p>
              <button onClick={openNewSource} className="mt-3 text-[#00B900] text-sm font-medium hover:underline">+ 新規作成</button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-500">経路名</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 w-28">クリック数</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">CV数</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 w-20">CVR</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 w-24">状態</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500 w-32">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSources.map(s => (
                    <tr key={s.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <button onClick={() => openEditSource(s)} className="text-left hover:text-[#00B900] transition-colors">
                          <div className="font-medium text-gray-800">{s.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                            <span className="font-mono">/s/{s.code}</span>
                            <button
                              onClick={e => { e.stopPropagation(); copyUrl(s.tracking_url); }}
                              className="text-gray-300 hover:text-[#00B900]"
                              title="URLをコピー"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </button>
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 font-medium">{s.visit_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 font-medium">{s.converted_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{s.cvr}%</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(s)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? "bg-green-500" : "bg-gray-300"}`} />
                          {s.is_active ? "有効" : "無効"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => showQr(s)}
                            className="p-1.5 text-gray-400 hover:text-[#00B900] transition-colors"
                            title="QRコード"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                          </button>
                          <button
                            onClick={() => openEditSource(s)}
                            className="p-1.5 text-gray-400 hover:text-[#00B900] transition-colors"
                            title="編集"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button
                            onClick={() => deleteSource(s.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                            title="削除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>}

      {/* ─── 登録/編集モーダル ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* モーダルヘッダー */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800">
                {editingSource ? "流入経路を編集" : "新しい流入経路"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* タブ */}
            <div className="px-6 pt-3 flex gap-1 border-b border-gray-100">
              {([
                { key: "basic" as const, label: "基本設定" },
                { key: "utm" as const, label: "広告連携" },
                { key: "html" as const, label: "HTMLタグ" },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${activeTab === tab.key ? "bg-[#00B900]/10 text-[#00B900] border-b-2 border-[#00B900]" : "text-gray-500 hover:text-gray-700"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* タブコンテンツ */}
            <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: "calc(85vh - 200px)" }}>
              {activeTab === "basic" && (
                <div className="space-y-4">
                  {/* 経路名 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      流入経路名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      maxLength={255}
                      placeholder="例: Instagram広告_春キャンペーン"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                      autoFocus
                    />
                    <p className="text-xs text-gray-400 mt-1 text-right">{formName.length}/255</p>
                  </div>

                  {/* リダイレクト先URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      リダイレクト先URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={formDestUrl}
                      onChange={e => setFormDestUrl(e.target.value)}
                      placeholder="https://lin.ee/xxxxx（LINE友だち追加URL）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                    />
                  </div>

                  {/* フォルダ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">フォルダ</label>
                    <select
                      value={formFolderId ?? ""}
                      onChange={e => setFormFolderId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                    >
                      <option value="">未分類</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* QRテキスト + 有効期間 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">QRコード表示用テキスト</label>
                      <input
                        type="text"
                        value={formQrText}
                        onChange={e => setFormQrText(e.target.value)}
                        maxLength={10}
                        placeholder="例: 春割"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                      />
                      <p className="text-xs text-gray-400 mt-1 text-right">{formQrText.length}/10</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">状態</label>
                      <label className="flex items-center gap-2 mt-2">
                        <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} className="rounded" />
                        <span className="text-sm text-gray-600">有効</span>
                      </label>
                    </div>
                  </div>

                  {/* 有効期間 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">有効期間（開始）</label>
                      <input
                        type="datetime-local"
                        value={formValidFrom}
                        onChange={e => setFormValidFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">有効期間（終了）</label>
                      <input
                        type="datetime-local"
                        value={formValidUntil}
                        onChange={e => setFormValidUntil(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                      />
                    </div>
                  </div>

                  {/* アクション連携設定 */}
                  <div className="border-t border-gray-100 pt-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">アクション連携</h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formIgnoreFriendAdd}
                          onChange={e => setFormIgnoreFriendAdd(e.target.checked)}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-600">友だち追加時設定のアクションを無視する</span>
                      </label>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">アクションの実行タイミング</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-1.5">
                            <input type="radio" name="action_execution" value="always" checked={formActionExecution === "always"} onChange={e => setFormActionExecution(e.target.value)} />
                            <span className="text-sm text-gray-600">いつでも</span>
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input type="radio" name="action_execution" value="first_only" checked={formActionExecution === "first_only"} onChange={e => setFormActionExecution(e.target.value)} />
                            <span className="text-sm text-gray-600">初回の友だち追加時のみ</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* メモ */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">メモ</label>
                    <textarea
                      value={formMemo}
                      onChange={e => setFormMemo(e.target.value)}
                      rows={2}
                      placeholder="社内メモ（管理用）"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] resize-none"
                    />
                  </div>
                </div>
              )}

              {activeTab === "utm" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    デフォルトのUTMパラメータを設定できます。トラッキングURL にパラメータが付いていない場合、ここで設定した値が使用されます。
                  </p>

                  {/* UTMフィールド */}
                  {[
                    { label: "utm_source", value: formUtmSource, setter: setFormUtmSource, placeholder: "例: instagram, google, facebook" },
                    { label: "utm_medium", value: formUtmMedium, setter: setFormUtmMedium, placeholder: "例: cpc, social, qr" },
                    { label: "utm_campaign", value: formUtmCampaign, setter: setFormUtmCampaign, placeholder: "例: spring_2026" },
                    { label: "utm_term", value: formUtmTerm, setter: setFormUtmTerm, placeholder: "例: 美容クリニック" },
                    { label: "utm_content", value: formUtmContent, setter: setFormUtmContent, placeholder: "例: banner_a" },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                      <input
                        type="text"
                        value={field.value}
                        onChange={e => field.setter(e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                      />
                    </div>
                  ))}

                  {/* カスタムパラメータ */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-700">カスタムパラメータ</h3>
                      <button
                        onClick={() => setFormCustomParams(prev => [...prev, { key: "", field: "" }])}
                        className="text-xs text-[#00B900] font-medium hover:underline"
                      >
                        + パラメータを追加
                      </button>
                    </div>
                    {formCustomParams.map((param, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input
                          type="text"
                          value={param.key}
                          onChange={e => {
                            const updated = [...formCustomParams];
                            updated[i] = { ...updated[i], key: e.target.value };
                            setFormCustomParams(updated);
                          }}
                          placeholder="パラメータ名"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                        />
                        <span className="text-gray-400 text-sm">=</span>
                        <input
                          type="text"
                          value={param.field}
                          onChange={e => {
                            const updated = [...formCustomParams];
                            updated[i] = { ...updated[i], field: e.target.value };
                            setFormCustomParams(updated);
                          }}
                          placeholder="友だち情報欄名"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
                        />
                        <button
                          onClick={() => setFormCustomParams(prev => prev.filter((_, j) => j !== i))}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "html" && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    外部システム発行の計測タグなどを埋め込むことができます。
                  </p>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                    HTMLタグ使用時は経路追跡機能が動作しなくなる可能性があります。編集後は必ず動作をご確認ください。
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">&lt;head&gt;セクション</label>
                    <textarea
                      value={formHeadTags}
                      onChange={e => setFormHeadTags(e.target.value)}
                      rows={4}
                      placeholder={'<script src="https://example.com/foo.js"></script>'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">&lt;body&gt;セクション</label>
                    <textarea
                      value={formBodyTags}
                      onChange={e => setFormBodyTags(e.target.value)}
                      rows={4}
                      placeholder={'<script src="https://example.com/foo.js"></script>'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* フッターボタン */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={saveSource}
                disabled={saving || !formName.trim() || !formDestUrl.trim()}
                className="px-6 py-2 bg-[#00B900] text-white rounded-lg text-sm font-medium hover:bg-[#009900] transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : editingSource ? "更新" : "登録"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QRコードモーダル ─── */}
      {showQrModal && qrSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowQrModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-800 mb-1">{qrSource.name}</h3>
            <p className="text-xs text-gray-400 mb-4 font-mono">{qrSource.tracking_url}</p>

            {/* QRコード */}
            <div className="flex justify-center mb-3">
              {qrSvg ? (
                <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* QRテキスト */}
            {qrSource.qr_display_text && (
              <p className="text-center text-sm font-medium text-gray-600 mb-4">{qrSource.qr_display_text}</p>
            )}

            {/* ボタン */}
            <div className="flex gap-2">
              <button
                onClick={() => copyUrl(qrSource.tracking_url)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                URLをコピー
              </button>
              <button
                onClick={downloadQrPng}
                className="flex-1 px-3 py-2 bg-[#00B900] text-white rounded-lg text-sm font-medium hover:bg-[#009900] transition-colors"
              >
                PNGダウンロード
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
