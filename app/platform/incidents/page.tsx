"use client";

// app/platform/incidents/page.tsx
// プラットフォーム管理: インシデント管理ページ

import { useState, useEffect, useRef } from "react";
import useSWR, { mutate } from "swr";

// ---- 型定義 ----

interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: "critical" | "major" | "minor";
  status: "investigating" | "identified" | "monitoring" | "resolved";
  started_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string | null;
}

type IncidentFormData = {
  title: string;
  description: string;
  severity: "critical" | "major" | "minor";
  status: "investigating" | "identified" | "monitoring" | "resolved";
};

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "major", label: "Major", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "minor", label: "Minor", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
] as const;

const STATUS_OPTIONS = [
  { value: "investigating", label: "調査中", color: "bg-red-100 text-red-700 border-red-200" },
  { value: "identified", label: "原因特定", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "monitoring", label: "監視中", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "resolved", label: "解決済み", color: "bg-green-100 text-green-700 border-green-200" },
] as const;

const SWRKEY = "/api/platform/incidents?limit=100";

// ---- メインコンポーネント ----

export default function PlatformIncidentsPage() {
  const { data, error: swrError, isLoading } = useSWR<{ incidents: Incident[] }>(SWRKEY);

  // フィルター
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");

  // モーダル
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<Incident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);

  // フォーム
  const [form, setForm] = useState<IncidentFormData>({
    title: "",
    description: "",
    severity: "minor",
    status: "investigating",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const incidents = data?.incidents || [];

  // フィルター適用
  const filtered = incidents.filter((inc) => {
    if (statusFilter && inc.status !== statusFilter) return false;
    if (severityFilter && inc.severity !== severityFilter) return false;
    return true;
  });

  // 集計
  const activeCount = incidents.filter((i) => i.status !== "resolved").length;
  const criticalCount = incidents.filter((i) => i.severity === "critical" && i.status !== "resolved").length;

  // 作成
  const handleCreate = async () => {
    if (!form.title.trim()) {
      setFormError("タイトルは必須です");
      return;
    }
    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch("/api/platform/incidents", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "作成に失敗しました");
        return;
      }
      setShowCreate(false);
      resetForm();
      setSuccessMsg("インシデントを作成しました");
      mutate(SWRKEY);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setFormLoading(false);
    }
  };

  // 更新
  const handleUpdate = async () => {
    if (!editTarget) return;
    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch(`/api/platform/incidents/${editTarget.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "更新に失敗しました");
        return;
      }
      setEditTarget(null);
      resetForm();
      setSuccessMsg("インシデントを更新しました");
      mutate(SWRKEY);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setFormLoading(false);
    }
  };

  // 削除
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch(`/api/platform/incidents/${deleteTarget.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "削除に失敗しました");
        return;
      }
      setDeleteTarget(null);
      setSuccessMsg("インシデントを削除しました");
      mutate(SWRKEY);
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setFormLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ title: "", description: "", severity: "minor", status: "investigating" });
    setFormError("");
  };

  const openEdit = (inc: Incident) => {
    setForm({
      title: inc.title,
      description: inc.description || "",
      severity: inc.severity,
      status: inc.status,
    });
    setFormError("");
    setEditTarget(inc);
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const getSeverityBadge = (severity: string) => {
    const opt = SEVERITY_OPTIONS.find((o) => o.value === severity);
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full font-medium border ${opt?.color || "bg-slate-100 text-slate-600"}`}>
        {opt?.label || severity}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find((o) => o.value === status);
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full font-medium border ${opt?.color || "bg-slate-100 text-slate-600"}`}>
        {opt?.label || status}
      </span>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-8 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white text-lg shadow-lg shadow-red-500/25">
            <span>!</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">インシデント管理</h1>
            <p className="text-sm text-slate-500">障害・インシデントの記録と管理</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          インシデントを報告
        </button>
      </div>

      {/* 成功メッセージ */}
      {successMsg && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-r-lg text-green-700 text-sm">
          {successMsg}
        </div>
      )}

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">合計</p>
          <p className="text-2xl font-bold text-slate-900">{incidents.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">未解決</p>
          <p className={`text-2xl font-bold ${activeCount > 0 ? "text-orange-600" : "text-slate-900"}`}>{activeCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Critical（未解決）</p>
          <p className={`text-2xl font-bold ${criticalCount > 0 ? "text-red-600" : "text-slate-900"}`}>{criticalCount}</p>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">全ステータス</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          >
            <option value="">全重大度</option>
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <span className="text-xs text-slate-500 ml-auto">
            {filtered.length}件表示
          </span>
        </div>
      </div>

      {/* SWRエラー */}
      {swrError && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-red-700 text-sm">
          データの取得に失敗しました
        </div>
      )}

      {/* インシデント一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-5 py-4 animate-pulse">
                <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium text-slate-500 mb-1">インシデントがありません</p>
            <p className="text-xs text-slate-400">フィルターを変更するか、新しいインシデントを報告してください</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((inc) => (
              <div key={inc.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityBadge(inc.severity)}
                      {getStatusBadge(inc.status)}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">{inc.title}</h3>
                    {inc.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{inc.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                      <span>発生: {formatDate(inc.started_at || inc.created_at)}</span>
                      {inc.resolved_at && <span>解決: {formatDate(inc.resolved_at)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(inc)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => setDeleteTarget(inc)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 作成/編集モーダル */}
      {(showCreate || editTarget) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editTarget ? "インシデントを編集" : "インシデントを報告"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">タイトル</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="障害の概要"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">説明</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="詳細な説明、影響範囲、対応状況など"
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">重大度</label>
                  <select
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value as IncidentFormData["severity"] })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {SEVERITY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">ステータス</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as IncidentFormData["status"] })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowCreate(false); setEditTarget(null); resetForm(); }}
                disabled={formLoading}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={editTarget ? handleUpdate : handleCreate}
                disabled={formLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {formLoading ? "処理中..." : editTarget ? "更新" : "作成"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">インシデントを削除</h3>
            <p className="text-sm text-slate-600 mb-1">
              「{deleteTarget.title}」を削除しますか？
            </p>
            <p className="text-xs text-slate-500 mb-4">この操作は取り消せません。</p>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {formError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => { setDeleteTarget(null); setFormError(""); }}
                disabled={formLoading}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleDelete}
                disabled={formLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {formLoading ? "削除中..." : "削除する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
