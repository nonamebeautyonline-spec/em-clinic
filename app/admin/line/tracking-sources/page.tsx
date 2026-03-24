"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR, { mutate } from "swr";
import dynamic from "next/dynamic";
import { useConfirmModal } from "@/hooks/useConfirmModal";

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

// ─── アイコンコンポーネント ──────────────────────

const IconFolder = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
);
const IconPlus = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" /></svg>
);
const IconSearch = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
);
const IconEdit = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
);
const IconTrash = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
);
const IconQr = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
);
const IconCopy = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);
const IconClose = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
);
const IconLink = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
);
const IconChart = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
);
const IconList = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
);
const IconExternalLink = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
);

// ─── メインコンポーネント ──────────────────────

export default function TrackingSourcesPage() {
  const { confirm, ConfirmDialog } = useConfirmModal();
  const [selectedFolder, setSelectedFolder] = useState<number | "uncategorized" | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "stats">("list");

  const foldersKey = "/api/admin/line/tracking-source-folders";
  const sourcesKey = selectedFolder
    ? `/api/admin/line/tracking-sources?folder_id=${selectedFolder}`
    : "/api/admin/line/tracking-sources";
  const { data: foldersData } = useSWR<{ folders: Folder[] }>(foldersKey);
  const { data: sourcesData, isLoading } = useSWR<{ sources: TrackingSource[] }>(sourcesKey);

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
  const [formUtmSource, setFormUtmSource] = useState("");
  const [formUtmMedium, setFormUtmMedium] = useState("");
  const [formUtmCampaign, setFormUtmCampaign] = useState("");
  const [formUtmTerm, setFormUtmTerm] = useState("");
  const [formUtmContent, setFormUtmContent] = useState("");
  const [formCustomParams, setFormCustomParams] = useState<{ key: string; field: string }[]>([]);
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

  // コピー通知
  const [copiedId, setCopiedId] = useState<number | null>(null);

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
    const ok = await confirm({ title: "フォルダ削除", message: "フォルダを削除しますか？中の流入経路は未分類に移動されます。", variant: "danger", confirmLabel: "削除する" });
    if (!ok) return;
    await fetch(`/api/admin/line/tracking-source-folders?id=${id}`, { method: "DELETE", credentials: "include" });
    if (selectedFolder === id) setSelectedFolder(null);
    revalidate();
  };

  // ─── 流入経路操作 ──────────────────────────

  const resetForm = () => {
    setFormName(""); setFormDestUrl("");
    setFormFolderId(typeof selectedFolder === "number" ? selectedFolder : null);
    setFormQrText(""); setFormValidFrom(""); setFormValidUntil("");
    setFormMemo(""); setFormIsActive(true);
    setFormIgnoreFriendAdd(false); setFormActionExecution("always");
    setFormUtmSource(""); setFormUtmMedium(""); setFormUtmCampaign("");
    setFormUtmTerm(""); setFormUtmContent("");
    setFormCustomParams([]); setFormHeadTags(""); setFormBodyTags("");
    setActiveTab("basic");
  };

  const openNewSource = () => {
    setEditingSource(null);
    resetForm();
    setShowModal(true);
  };

  const openEditSource = (s: TrackingSource) => {
    setEditingSource(s);
    setFormName(s.name); setFormDestUrl(s.destination_url);
    setFormFolderId(s.folder_id); setFormQrText(s.qr_display_text || "");
    setFormValidFrom(s.valid_from ? s.valid_from.slice(0, 16) : "");
    setFormValidUntil(s.valid_until ? s.valid_until.slice(0, 16) : "");
    setFormMemo(s.memo || ""); setFormIsActive(s.is_active);
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
      name: formName, destination_url: formDestUrl, folder_id: formFolderId,
      qr_display_text: formQrText || null,
      valid_from: formValidFrom || null, valid_until: formValidUntil || null,
      is_active: formIsActive, ignore_friend_add_action: formIgnoreFriendAdd,
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
    const ok = await confirm({ title: "流入経路削除", message: "この流入経路を削除しますか？訪問記録も削除されます。", variant: "danger", confirmLabel: "削除する" });
    if (!ok) return;
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
    setQrSource(s); setQrSvg(""); setShowQrModal(true);
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

  const copyUrl = (url: string, id: number) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
        <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ─── 共通スタイル ──────────────────────────

  const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors placeholder:text-gray-300";
  const labelCls = "block text-[13px] font-semibold text-gray-600 mb-1.5";

  // ─── レンダリング ──────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
      {/* ─── ヘッダー ─── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">流入経路</h1>
          <p className="text-sm text-gray-400 mt-1">友だち追加の流入元を計測・分析</p>
        </div>
        <div className="flex items-center gap-2">
          {/* ビュー切り替え */}
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === "list" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <IconList className="w-3.5 h-3.5" />
              一覧
            </button>
            <button
              onClick={() => setViewMode("stats")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === "stats" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <IconChart className="w-3.5 h-3.5" />
              統計
            </button>
          </div>
        </div>
      </div>

      {/* ─── 統計ダッシュボード ─── */}
      {viewMode === "stats" && statsData && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* KPIカード */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { label: "総クリック数", value: statsData.summary.total_clicks.toLocaleString(), icon: "cursor", gradient: "from-blue-500 to-blue-600", bg: "bg-blue-50", text: "text-blue-700" },
              { label: "コンバージョン数", value: statsData.summary.total_conversions.toLocaleString(), icon: "check", gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-50", text: "text-emerald-700" },
              { label: "CVR", value: `${statsData.summary.cvr}%`, icon: "percent", gradient: "from-violet-500 to-violet-600", bg: "bg-violet-50", text: "text-violet-700" },
              { label: "アクティブ経路", value: String(statsData.summary.source_count), icon: "route", gradient: "from-amber-500 to-amber-600", bg: "bg-amber-50", text: "text-amber-700" },
            ] as const).map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${kpi.text}`}>{kpi.label}</span>
                  <span className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${kpi.gradient}`} />
                  </span>
                </div>
                <p className="text-3xl font-bold text-gray-900 tracking-tight">{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* 日別推移グラフ */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-gray-800">日別推移</h3>
              <span className="text-[11px] text-gray-400 font-medium">過去30日間</span>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={statsData.daily}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9CA3AF" }} tickFormatter={(v: string) => v.slice(5)} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="clicks" stroke="#3B82F6" strokeWidth={2} fill="url(#colorClicks)" name="クリック" />
                <Area type="monotone" dataKey="conversions" stroke="#10B981" strokeWidth={2} fill="url(#colorCv)" name="CV" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* 経路別 + UTM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-5">経路別クリック TOP10</h3>
              {statsData.by_source.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-12">データなし</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statsData.by_source.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 12 }} />
                    <Bar dataKey="clicks" fill="#3B82F6" name="クリック" radius={[0, 6, 6, 0]} />
                    <Bar dataKey="conversions" fill="#10B981" name="CV" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-800 mb-5">UTM Source 内訳</h3>
              {statsData.by_utm_source.length === 0 ? (
                <p className="text-sm text-gray-300 text-center py-12">データなし</p>
              ) : (
                <div className="space-y-3">
                  {statsData.by_utm_source.map((item, i) => {
                    const maxCount = statsData.by_utm_source[0]?.count || 1;
                    return (
                      <div key={i} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{item.name}</span>
                          <span className="text-sm font-bold text-gray-900">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                          />
                        </div>
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
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}

      {/* ─── 一覧ビュー ─── */}
      {viewMode === "list" && (
        <div className="animate-in fade-in duration-300">
          {/* ツールバー */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="経路名またはコードで検索"
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 placeholder:text-gray-300"
                />
              </div>
              <button
                onClick={() => setShowNewFolder(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors bg-white"
              >
                <IconFolder className="w-3.5 h-3.5" />
                フォルダ作成
              </button>
              <button
                onClick={openNewSource}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
              >
                <IconPlus className="w-4 h-4" />
                新しい経路
              </button>
              <div className="ml-auto bg-gray-50 text-gray-500 px-3 py-1.5 rounded-lg text-xs font-semibold">
                {filteredSources.length} 件
              </div>
            </div>
          </div>

          <div className="flex gap-5">
            {/* ─── フォルダサイドバー ─── */}
            <div className="w-52 flex-shrink-0 space-y-0.5">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                  selectedFolder === null
                    ? "bg-emerald-50 text-emerald-700 font-semibold shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <IconFolder className="w-4 h-4" />
                  すべて
                </span>
                <span className={`text-xs tabular-nums ${selectedFolder === null ? "text-emerald-500" : "text-gray-300"}`}>{totalSources}</span>
              </button>

              <button
                onClick={() => setSelectedFolder("uncategorized")}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                  selectedFolder === "uncategorized"
                    ? "bg-emerald-50 text-emerald-700 font-semibold shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <IconFolder className="w-4 h-4" />
                  未分類
                </span>
              </button>

              {folders.map(folder => (
                <div key={folder.id} className="group relative">
                  {editingFolder === folder.id ? (
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <input
                        type="text"
                        value={editFolderName}
                        onChange={e => setEditFolderName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") renameFolder(folder.id); if (e.key === "Escape") setEditingFolder(null); }}
                        className="flex-1 px-2.5 py-1.5 border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        autoFocus
                      />
                      <button onClick={() => renameFolder(folder.id)} className="text-emerald-600 text-xs font-semibold px-1.5">保存</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedFolder(folder.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                        selectedFolder === folder.id
                          ? "bg-emerald-50 text-emerald-700 font-semibold shadow-sm"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <IconFolder className="w-4 h-4" />
                        <span className="truncate">{folder.name}</span>
                      </span>
                      <span className={`text-xs tabular-nums ${selectedFolder === folder.id ? "text-emerald-500" : "text-gray-300"}`}>{folder.source_count}</span>
                    </button>
                  )}
                  {editingFolder !== folder.id && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-white/80 backdrop-blur-sm rounded-lg px-0.5">
                      <button
                        onClick={e => { e.stopPropagation(); setEditingFolder(folder.id); setEditFolderName(folder.name); }}
                        className="p-1.5 text-gray-300 hover:text-gray-600 transition-colors"
                      >
                        <IconEdit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteFolder(folder.id); }}
                        className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <IconTrash className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {showNewFolder && (
                <div className="flex items-center gap-1 px-2 py-1.5 mt-1">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
                    placeholder="フォルダ名"
                    className="flex-1 px-2.5 py-1.5 border border-emerald-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    autoFocus
                  />
                  <button onClick={createFolder} className="text-emerald-600 text-xs font-semibold px-1.5">作成</button>
                </div>
              )}
            </div>

            {/* ─── メインテーブル ─── */}
            <div className="flex-1 min-w-0">
              {filteredSources.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-50 rounded-2xl flex items-center justify-center">
                    <IconLink className="w-7 h-7 text-gray-200" />
                  </div>
                  <p className="text-sm font-medium text-gray-400 mb-1">流入経路がまだありません</p>
                  <p className="text-xs text-gray-300 mb-5">経路を作成してQRコードやトラッキングURLを発行しましょう</p>
                  <button
                    onClick={openNewSource}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
                  >
                    <IconPlus className="w-4 h-4" />
                    新しい経路を作成
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* テーブルヘッダー */}
                  <div className="grid grid-cols-[1fr_100px_80px_70px_80px_120px] items-center px-5 py-3 bg-gray-50/80 border-b border-gray-100">
                    {["経路名", "クリック", "CV", "CVR", "状態", ""].map(h => (
                      <span key={h} className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{h}</span>
                    ))}
                  </div>

                  {/* テーブル行 */}
                  {filteredSources.map(s => (
                    <div
                      key={s.id}
                      className="grid grid-cols-[1fr_100px_80px_70px_80px_120px] items-center px-5 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors group"
                    >
                      {/* 経路名 */}
                      <div className="min-w-0">
                        <button onClick={() => openEditSource(s)} className="text-left group/name">
                          <span className="text-sm font-semibold text-gray-800 group-hover/name:text-emerald-600 transition-colors">{s.name}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-gray-300 font-mono truncate">/s/{s.code}</span>
                            <button
                              onClick={e => { e.stopPropagation(); copyUrl(s.tracking_url, s.id); }}
                              className="text-gray-200 hover:text-emerald-500 transition-colors"
                              title="URLをコピー"
                            >
                              {copiedId === s.id ? (
                                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              ) : (
                                <IconCopy />
                              )}
                            </button>
                          </div>
                        </button>
                      </div>

                      {/* クリック */}
                      <span className="text-sm font-bold text-gray-900 tabular-nums">{s.visit_count.toLocaleString()}</span>

                      {/* CV */}
                      <span className="text-sm font-bold text-emerald-600 tabular-nums">{s.converted_count.toLocaleString()}</span>

                      {/* CVR */}
                      <span className="text-sm text-gray-500 tabular-nums">{s.cvr}%</span>

                      {/* 状態 */}
                      <div>
                        <button
                          onClick={() => toggleActive(s)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                            s.is_active
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? "bg-emerald-500" : "bg-gray-300"}`} />
                          {s.is_active ? "有効" : "停止"}
                        </button>
                      </div>

                      {/* 操作 */}
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => showQr(s)}
                          className="p-2 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="QRコード"
                        >
                          <IconQr className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditSource(s)}
                          className="p-2 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="編集"
                        >
                          <IconEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSource(s.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="削除"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 登録/編集モーダル ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingSource ? "流入経路を編集" : "新しい流入経路"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">トラッキングURLを発行して流入元を計測</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-300 hover:text-gray-500 hover:bg-gray-50 rounded-xl transition-colors">
                <IconClose />
              </button>
            </div>

            {/* タブ */}
            <div className="px-6 flex gap-0.5 border-b border-gray-100 bg-gray-50/50">
              {([
                { key: "basic" as const, label: "基本設定" },
                { key: "utm" as const, label: "広告連携" },
                { key: "html" as const, label: "HTMLタグ" },
              ]).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "text-emerald-700"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-emerald-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* タブコンテンツ */}
            <div className="px-6 py-5 overflow-y-auto" style={{ maxHeight: "calc(85vh - 200px)" }}>
              {activeTab === "basic" && (
                <div className="space-y-5">
                  <div>
                    <label className={labelCls}>
                      流入経路名 <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      maxLength={255}
                      placeholder="例: Instagram広告_春キャンペーン"
                      className={inputCls}
                      autoFocus
                    />
                    <p className="text-[11px] text-gray-300 mt-1 text-right tabular-nums">{formName.length}/255</p>
                  </div>

                  <div>
                    <label className={labelCls}>
                      リダイレクト先URL <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <IconExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="url"
                        value={formDestUrl}
                        onChange={e => setFormDestUrl(e.target.value)}
                        placeholder="https://lin.ee/xxxxx"
                        className={`${inputCls} pl-9`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>フォルダ</label>
                      <select
                        value={formFolderId ?? ""}
                        onChange={e => setFormFolderId(e.target.value ? Number(e.target.value) : null)}
                        className={inputCls}
                      >
                        <option value="">未分類</option>
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>QRコード表示テキスト</label>
                      <input
                        type="text"
                        value={formQrText}
                        onChange={e => setFormQrText(e.target.value)}
                        maxLength={10}
                        placeholder="例: 春割"
                        className={inputCls}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>有効期間（開始）</label>
                      <input type="datetime-local" value={formValidFrom} onChange={e => setFormValidFrom(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>有効期間（終了）</label>
                      <input type="datetime-local" value={formValidUntil} onChange={e => setFormValidUntil(e.target.value)} className={inputCls} />
                    </div>
                  </div>

                  {/* 状態 + アクション連携 */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <h3 className="text-[13px] font-semibold text-gray-600">オプション</h3>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <div className={`relative w-10 h-5 rounded-full transition-colors ${formIsActive ? "bg-emerald-500" : "bg-gray-300"}`} onClick={() => setFormIsActive(!formIsActive)}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${formIsActive ? "left-5" : "left-0.5"}`} />
                      </div>
                      <span className="text-sm text-gray-600">経路を有効にする</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={formIgnoreFriendAdd} onChange={e => setFormIgnoreFriendAdd(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500/30" />
                      <span className="text-sm text-gray-600">友だち追加時設定のアクションを無視する</span>
                    </label>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">アクション実行タイミング</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="action_execution" value="always" checked={formActionExecution === "always"} onChange={e => setFormActionExecution(e.target.value)} className="text-emerald-600 focus:ring-emerald-500/30" />
                          <span className="text-sm text-gray-600">いつでも</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name="action_execution" value="first_only" checked={formActionExecution === "first_only"} onChange={e => setFormActionExecution(e.target.value)} className="text-emerald-600 focus:ring-emerald-500/30" />
                          <span className="text-sm text-gray-600">初回のみ</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>メモ</label>
                    <textarea
                      value={formMemo}
                      onChange={e => setFormMemo(e.target.value)}
                      rows={2}
                      placeholder="社内メモ（管理用）"
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>
              )}

              {activeTab === "utm" && (
                <div className="space-y-5">
                  <p className="text-sm text-gray-400">
                    デフォルトのUTMパラメータを設定できます。トラッキングURLにパラメータが付いていない場合、ここで設定した値が使用されます。
                  </p>

                  <div className="space-y-4">
                    {[
                      { label: "utm_source", value: formUtmSource, setter: setFormUtmSource, placeholder: "例: instagram, google, facebook" },
                      { label: "utm_medium", value: formUtmMedium, setter: setFormUtmMedium, placeholder: "例: cpc, social, qr" },
                      { label: "utm_campaign", value: formUtmCampaign, setter: setFormUtmCampaign, placeholder: "例: spring_2026" },
                      { label: "utm_term", value: formUtmTerm, setter: setFormUtmTerm, placeholder: "例: 美容クリニック" },
                      { label: "utm_content", value: formUtmContent, setter: setFormUtmContent, placeholder: "例: banner_a" },
                    ].map(field => (
                      <div key={field.label}>
                        <label className={labelCls}>{field.label}</label>
                        <input
                          type="text"
                          value={field.value}
                          onChange={e => field.setter(e.target.value)}
                          placeholder={field.placeholder}
                          className={inputCls}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={labelCls}>カスタムパラメータ</h3>
                      <button
                        onClick={() => setFormCustomParams(prev => [...prev, { key: "", field: "" }])}
                        className="text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
                      >
                        + 追加
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
                          className={`flex-1 ${inputCls}`}
                        />
                        <span className="text-gray-300 text-sm">=</span>
                        <input
                          type="text"
                          value={param.field}
                          onChange={e => {
                            const updated = [...formCustomParams];
                            updated[i] = { ...updated[i], field: e.target.value };
                            setFormCustomParams(updated);
                          }}
                          placeholder="友だち情報欄名"
                          className={`flex-1 ${inputCls}`}
                        />
                        <button
                          onClick={() => setFormCustomParams(prev => prev.filter((_, j) => j !== i))}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <IconClose className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "html" && (
                <div className="space-y-5">
                  <p className="text-sm text-gray-400">
                    外部計測タグなどを埋め込むことができます。
                  </p>
                  <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-3.5 flex items-start gap-2.5">
                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p className="text-xs text-amber-700 leading-relaxed">HTMLタグ使用時は経路追跡機能が動作しなくなる可能性があります。編集後は必ず動作確認してください。</p>
                  </div>

                  <div>
                    <label className={labelCls}>&lt;head&gt; セクション</label>
                    <textarea
                      value={formHeadTags}
                      onChange={e => setFormHeadTags(e.target.value)}
                      rows={4}
                      placeholder={'<script src="https://example.com/tracking.js"></script>'}
                      className={`${inputCls} font-mono text-xs resize-none`}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>&lt;body&gt; セクション</label>
                    <textarea
                      value={formBodyTags}
                      onChange={e => setFormBodyTags(e.target.value)}
                      rows={4}
                      placeholder={'<noscript><img src="https://example.com/pixel" /></noscript>'}
                      className={`${inputCls} font-mono text-xs resize-none`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* フッター */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={saveSource}
                disabled={saving || !formName.trim() || !formDestUrl.trim()}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? "保存中..." : editingSource ? "更新する" : "作成する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QRコードモーダル ─── */}
      {showQrModal && qrSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={() => setShowQrModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className="px-6 pt-6 pb-2">
              <h3 className="text-lg font-bold text-gray-900">{qrSource.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-300 font-mono truncate">{qrSource.tracking_url}</span>
                <button
                  onClick={() => copyUrl(qrSource.tracking_url, qrSource.id)}
                  className="text-gray-300 hover:text-emerald-500 transition-colors flex-shrink-0"
                >
                  <IconCopy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* QRコード */}
            <div className="px-6 py-5">
              <div className="bg-gray-50 rounded-2xl p-6 flex justify-center">
                {qrSvg ? (
                  <div dangerouslySetInnerHTML={{ __html: qrSvg }} className="w-56 h-56" />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>
              {qrSource.qr_display_text && (
                <p className="text-center text-sm font-semibold text-gray-600 mt-3">{qrSource.qr_display_text}</p>
              )}
            </div>

            {/* ボタン */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => copyUrl(qrSource.tracking_url, qrSource.id)}
                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 font-medium transition-colors"
              >
                URLをコピー
              </button>
              <button
                onClick={downloadQrPng}
                className="flex-1 px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm shadow-emerald-200"
              >
                PNGダウンロード
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
