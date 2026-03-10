"use client";

// app/platform/applications/page.tsx — 申し込み一覧＋テナント作成への連携

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Application = {
  id: string;
  company_name: string;
  platform_name: string | null;
  industry: string;
  contact_phone: string;
  email: string;
  plan: string;
  ai_options: string[];
  extra_options: string[];
  setup_options: string[];
  monthly_estimate: number;
  initial_estimate: number;
  note: string | null;
  status: string;
  created_at: string;
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "未対応", color: "bg-amber-100 text-amber-800" },
  approved: { label: "承認済み", color: "bg-green-100 text-green-800" },
  rejected: { label: "却下", color: "bg-red-100 text-red-800" },
};

const fmt = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

export default function ApplicationsPage() {
  const router = useRouter();
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/applications?status=${filter}`, { credentials: "include" });
      const data = await res.json();
      if (data.ok) setApps(data.applications);
    } catch {
      // エラー時は空配列のまま
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setUpdating(id);
    try {
      const res = await fetch("/api/platform/applications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      if ((await res.json()).ok) {
        setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      }
    } finally {
      setUpdating(null);
    }
  };

  // 申し込みデータからテナント作成ページへ遷移（クエリパラメータで渡す）
  const createTenant = (app: Application) => {
    const params = new URLSearchParams({
      from_application: app.id,
      name: app.company_name,
      contactEmail: app.email,
      contactPhone: app.contact_phone,
      industry: "clinic",
      plan: app.plan,
      ai_options: app.ai_options.join(","),
      extra_options: (app.extra_options || []).join(","),
    });
    router.push(`/platform/tenants/create?${params.toString()}`);
  };

  const pendingCount = apps.filter((a) => a.status === "pending").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">申し込み管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            LPからの申し込みを確認し、テナントを立ち上げます
          </p>
        </div>

        {/* フィルター + 件数 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {[
              { key: "all", label: "すべて" },
              { key: "pending", label: `未対応${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
              { key: "approved", label: "承認済み" },
              { key: "rejected", label: "却下" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  filter === f.key
                    ? "bg-amber-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-slate-400">{apps.length}件</p>
        </div>

        {/* テーブル */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20 text-slate-400">申し込みはありません</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">会社名</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">プラン</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">月額</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">初期費用</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">ステータス</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">申込日</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((app) => {
                  const st = STATUS_MAP[app.status] || STATUS_MAP.pending;
                  const isExpanded = expanded === app.id;
                  return (
                    <tr key={app.id} className="border-b border-slate-100 last:border-b-0">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : app.id)}
                          className="text-left hover:text-blue-600 transition-colors"
                        >
                          <p className="font-medium text-slate-900">{app.company_name}</p>
                          <p className="text-xs text-slate-400">{app.email}</p>
                        </button>
                        {isExpanded && (
                          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-1.5">
                            <p><span className="text-slate-400">電話:</span> {app.contact_phone}</p>
                            <p><span className="text-slate-400">業種:</span> {app.industry}</p>
                            {app.platform_name && <p><span className="text-slate-400">PF名:</span> {app.platform_name}</p>}
                            {app.ai_options.length > 0 && <p><span className="text-slate-400">AI:</span> {app.ai_options.join(", ")}</p>}
                            {app.setup_options.length > 0 && <p><span className="text-slate-400">構築:</span> {app.setup_options.join(", ")}</p>}
                            {app.note && <p><span className="text-slate-400">備考:</span> {app.note}</p>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{app.plan}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{fmt(app.monthly_estimate)}</td>
                      <td className="px-4 py-3 text-slate-700">{fmt(app.initial_estimate)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(app.created_at).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {app.status !== "approved" && (
                            <button
                              onClick={() => updateStatus(app.id, "approved")}
                              disabled={updating === app.id}
                              className="px-2.5 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              承認
                            </button>
                          )}
                          {app.status !== "rejected" && (
                            <button
                              onClick={() => updateStatus(app.id, "rejected")}
                              disabled={updating === app.id}
                              className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                            >
                              却下
                            </button>
                          )}
                          {app.status === "approved" && (
                            <button
                              onClick={() => createTenant(app)}
                              className="px-3 py-1 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 flex items-center gap-1"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              テナント作成
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
