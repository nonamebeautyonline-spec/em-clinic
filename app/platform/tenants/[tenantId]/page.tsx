"use client";

// app/platform/tenants/[tenantId]/page.tsx
// テナント詳細ページ — 概要/メンバー/設定/分析のタブ形式

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";

// Rechartsコンポーネントを動的インポート（SSR回避）
const AnalyticsChart = dynamic(() => import("./analytics-chart"), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-zinc-100 rounded-lg animate-pulse flex items-center justify-center">
      <span className="text-sm text-zinc-400">グラフを読み込み中...</span>
    </div>
  ),
});

// --- 型定義 ---
interface AdminUser {
  id: string;
  name: string;
  email: string;
  platform_role: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

interface TenantMember {
  id: string;
  role: string;
  created_at: string;
  admin_users: AdminUser;
}

interface TenantPlan {
  id: string;
  plan_name: string;
  monthly_fee: number;
  setup_fee: number;
  started_at: string | null;
  next_billing_at: string | null;
  created_at: string;
}

interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  industry: string;
  is_active: boolean;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  tenant_members: TenantMember[];
  tenant_plans: TenantPlan[];
}

interface TenantStats {
  patientsCount: number;
  reservationsCount: number;
  monthlyRevenue: number;
  lineFriendsCount: number;
}

interface MonthlyAnalytics {
  month: string;
  patients: number;
  revenue: number;
  reservations: number;
  lineFriends: number;
}

type TabKey = "overview" | "members" | "settings" | "analytics";

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // メンバータブ用
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "owner" | "viewer",
  });
  const [memberSubmitting, setMemberSubmitting] = useState(false);
  const [memberError, setMemberError] = useState("");

  // 設定タブ用
  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    notes: "",
    logoUrl: "",
    industry: "clinic",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // AIオプション管理用
  const [aiOptions, setAiOptions] = useState<{ key: string; label: string; monthlyPrice: number; isActive: boolean }[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsSaving, setOptionsSaving] = useState<string | null>(null);

  // トースト
  const [toast, setToast] = useState("");
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // 削除確認
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  // 分析タブ用
  const [analyticsData, setAnalyticsData] = useState<MonthlyAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // テナント詳細取得
  const fetchTenant = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "テナント情報の取得に失敗しました");
      }
      const data = await res.json();
      setTenant(data.tenant);

      // 編集フォームを初期化
      if (data.tenant) {
        setEditForm({
          name: data.tenant.name || "",
          slug: data.tenant.slug || "",
          contactEmail: data.tenant.contact_email || "",
          contactPhone: data.tenant.contact_phone || "",
          address: data.tenant.address || "",
          notes: data.tenant.notes || "",
          logoUrl: data.tenant.logo_url || "",
          industry: data.tenant.industry || "clinic",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // 統計取得
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/platform/tenants/${tenantId}/stats`,
        { credentials: "include" },
      );
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {
      // 統計取得失敗は無視
    }
  }, [tenantId]);

  // 分析データ取得
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(
        `/api/platform/tenants/${tenantId}/analytics?months=6`,
        { credentials: "include" },
      );
      if (res.ok) {
        const json = await res.json();
        if (json.ok) setAnalyticsData(json.monthly || []);
      }
    } catch {
      // 分析データ取得失敗は無視
    } finally {
      setAnalyticsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchTenant();
    fetchStats();
  }, [fetchTenant, fetchStats]);

  // AIオプション取得
  const fetchOptions = useCallback(async () => {
    if (!tenantId) return;
    setOptionsLoading(true);
    try {
      const res = await fetch(`/api/platform/billing/options?tenant_id=${tenantId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setAiOptions(data.options || []);
      }
    } catch {
      // 取得失敗は無視（UIには空配列が表示される）
    } finally {
      setOptionsLoading(false);
    }
  }, [tenantId]);

  // AIオプション切替
  const toggleOption = async (optionKey: string, isActive: boolean) => {
    setOptionsSaving(optionKey);
    try {
      const res = await fetch("/api/platform/billing/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tenantId, optionKey, isActive }),
      });
      if (res.ok) {
        await fetchOptions();
        showToast(`${isActive ? "有効化" : "無効化"}しました`);
      }
    } catch {
      showToast("オプションの更新に失敗しました");
    } finally {
      setOptionsSaving(null);
    }
  };

  // 分析タブ選択時にデータ取得
  useEffect(() => {
    if (activeTab === "analytics" && analyticsData.length === 0) {
      fetchAnalytics();
    }
  }, [activeTab, analyticsData.length, fetchAnalytics]);

  // 設定タブ選択時にAIオプション取得
  useEffect(() => {
    if (activeTab === "settings" && aiOptions.length === 0) {
      fetchOptions();
    }
  }, [activeTab, aiOptions.length, fetchOptions]);

  // 金額フォーマット
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("ja-JP", {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0,
    }).format(amount);

  // 日付フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  // 日時フォーマット
  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // プラン名表示
  const planLabel = (planName: string) => {
    const labels: Record<string, string> = {
      trial: "トライアル",
      standard: "スタンダード",
      premium: "プレミアム",
      enterprise: "エンタープライズ",
    };
    return labels[planName] || planName;
  };

  // ロール名表示
  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: "オーナー",
      admin: "管理者",
      viewer: "閲覧専用",
    };
    return labels[role] || role;
  };

  // ステータス切替
  const toggleStatus = async () => {
    if (!tenant) return;
    const newStatus = !tenant.is_active;
    try {
      const res = await fetch(
        `/api/platform/tenants/${tenantId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ isActive: newStatus }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "ステータス変更に失敗しました");
      }
      setTenant((prev) => (prev ? { ...prev, is_active: newStatus } : prev));
      showToast(newStatus ? "テナントを有効化しました" : "テナントを無効化しました");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  // テナント情報更新
  const handleUpdateTenant = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const payload: Record<string, string | null> = {};
      if (editForm.name !== tenant?.name) payload.name = editForm.name;
      if (editForm.slug !== tenant?.slug) payload.slug = editForm.slug;
      if (editForm.contactEmail !== (tenant?.contact_email || ""))
        payload.contactEmail = editForm.contactEmail || null;
      if (editForm.contactPhone !== (tenant?.contact_phone || ""))
        payload.contactPhone = editForm.contactPhone || null;
      if (editForm.address !== (tenant?.address || ""))
        payload.address = editForm.address || null;
      if (editForm.notes !== (tenant?.notes || ""))
        payload.notes = editForm.notes || null;
      if (editForm.logoUrl !== (tenant?.logo_url || ""))
        payload.logoUrl = editForm.logoUrl || null;
      if (editForm.industry !== (tenant?.industry || "clinic"))
        payload.industry = editForm.industry;

      if (Object.keys(payload).length === 0) {
        showToast("変更はありません");
        setSaving(false);
        return;
      }

      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "更新に失敗しました");
      }

      await fetchTenant();
      showToast("テナント情報を更新しました");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  // テナント削除
  const handleDelete = async () => {
    if (deleteInput !== tenant?.slug) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/platform/tenants/${tenantId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "削除に失敗しました");
      }
      showToast("テナントを削除しました");
      setTimeout(() => router.push("/platform/tenants"), 1000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setDeleting(false);
    }
  };

  // メンバー追加
  const handleAddMember = async () => {
    setMemberSubmitting(true);
    setMemberError("");
    try {
      const res = await fetch(
        `/api/platform/tenants/${tenantId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(memberForm),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "メンバーの追加に失敗しました");
      }

      setShowAddMember(false);
      setMemberForm({ name: "", email: "", password: "", role: "admin" });
      await fetchTenant();
      showToast("メンバーを追加しました");
    } catch (err) {
      setMemberError(
        err instanceof Error ? err.message : "エラーが発生しました",
      );
    } finally {
      setMemberSubmitting(false);
    }
  };

  // メンバーロール変更
  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(
        `/api/platform/tenants/${tenantId}/members/${memberId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ role: newRole }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "ロール変更に失敗しました");
      }
      await fetchTenant();
      showToast("ロールを変更しました");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  // メンバー削除
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`${memberName} をメンバーから削除しますか？`)) return;
    try {
      const res = await fetch(
        `/api/platform/tenants/${tenantId}/members/${memberId}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "メンバーの削除に失敗しました");
      }
      await fetchTenant();
      showToast("メンバーを削除しました");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "エラーが発生しました");
    }
  };

  // タブ定義
  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "概要" },
    { key: "members", label: "メンバー" },
    { key: "settings", label: "設定" },
    { key: "analytics", label: "分析" },
  ];

  // --- ローディング ---
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ヘッダースケルトン */}
          <div className="animate-pulse mb-8">
            <div className="h-4 bg-slate-200 rounded w-32 mb-4" />
            <div className="h-7 bg-slate-200 rounded w-64 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-48" />
          </div>
          {/* カードスケルトン */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-5 bg-slate-200 rounded w-48 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-4 bg-slate-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- エラー ---
  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-sm p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            {error || "テナントが見つかりません"}
          </h2>
          <button
            onClick={() => router.push("/platform/tenants")}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700"
          >
            テナント一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 成功トースト */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/platform/tenants")}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            テナント一覧
          </button>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  {tenant.name}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    tenant.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {tenant.is_active ? "有効" : "無効"}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 font-mono">
                {tenant.slug}.lope.jp
              </p>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                {tab.label}
                {tab.key === "members" && tenant.tenant_members && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                    {tenant.tenant_members.length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ===== 概要タブ ===== */}
        {activeTab === "overview" && (
          <div>
            {/* KPIカード（4列） */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KPICard
                label="患者数"
                value={stats?.patientsCount ?? "-"}
                unit="人"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
                color="blue"
              />
              <KPICard
                label="今月予約"
                value={stats?.reservationsCount ?? "-"}
                unit="件"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                color="emerald"
              />
              <KPICard
                label="今月売上"
                value={stats ? formatCurrency(stats.monthlyRevenue) : "-"}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                color="amber"
              />
              <KPICard
                label="LINE友だち"
                value={stats?.lineFriendsCount ?? "-"}
                unit="人"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
                color="green"
              />
            </div>

            {/* 基本情報カード */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">基本情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <InfoRow label="テナント名" value={tenant.name} />
                <InfoRow label="URL" value={`${tenant.slug}.lope.jp`} mono />
                <InfoRow label="連絡先メール" value={tenant.contact_email || "-"} />
                <InfoRow label="電話番号" value={tenant.contact_phone || "-"} />
                <InfoRow label="住所" value={tenant.address || "-"} />
                <InfoRow label="作成日" value={formatDate(tenant.created_at)} />
                <InfoRow label="最終更新" value={formatDateTime(tenant.updated_at)} />
                {tenant.tenant_plans?.[0] && (
                  <>
                    <InfoRow
                      label="プラン"
                      value={planLabel(tenant.tenant_plans[0].plan_name)}
                    />
                    <InfoRow
                      label="月額"
                      value={formatCurrency(tenant.tenant_plans[0].monthly_fee)}
                    />
                  </>
                )}
              </div>
              {tenant.notes && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-1">備考</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {tenant.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== メンバータブ ===== */}
        {activeTab === "members" && (
          <div>
            {/* メンバー追加ボタン */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowAddMember(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                メンバー追加
              </button>
            </div>

            {/* メンバー追加フォーム */}
            {showAddMember && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-slate-900">
                    メンバー追加
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setMemberError("");
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {memberError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {memberError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      名前 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={memberForm.name}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, name: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      メールアドレス <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={memberForm.email}
                      onChange={(e) =>
                        setMemberForm((p) => ({ ...p, email: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      パスワード <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      value={memberForm.password}
                      onChange={(e) =>
                        setMemberForm((p) => ({
                          ...p,
                          password: e.target.value,
                        }))
                      }
                      placeholder="8文字以上"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      ロール
                    </label>
                    <select
                      value={memberForm.role}
                      onChange={(e) =>
                        setMemberForm((p) => ({
                          ...p,
                          role: e.target.value as "admin" | "owner" | "viewer",
                        }))
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="admin">管理者</option>
                      <option value="owner">オーナー</option>
                      <option value="viewer">閲覧専用</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setShowAddMember(false);
                      setMemberError("");
                    }}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={memberSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {memberSubmitting ? "追加中..." : "追加"}
                  </button>
                </div>
              </div>
            )}

            {/* メンバー一覧テーブル */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              {tenant.tenant_members.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500">メンバーが登録されていません</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          名前
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          メール
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          ロール
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          ステータス
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          最終ログイン
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tenant.tenant_members.map((member) => {
                        const user = member.admin_users;
                        return (
                          <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-bold">
                                  {user?.name?.[0] || "?"}
                                </div>
                                <span className="text-sm font-medium text-slate-900">
                                  {user?.name || "-"}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {user?.email || "-"}
                            </td>
                            <td className="px-6 py-4">
                              <select
                                value={member.role}
                                onChange={(e) =>
                                  handleRoleChange(member.id, e.target.value)
                                }
                                className="text-sm border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="admin">管理者</option>
                                <option value="owner">オーナー</option>
                                <option value="viewer">閲覧専用</option>
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  user?.is_active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {user?.is_active ? "有効" : "無効"}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">
                              {formatDateTime(user?.last_login_at)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() =>
                                  handleRemoveMember(
                                    member.id,
                                    user?.name || "不明",
                                  )
                                }
                                className="text-sm text-red-500 hover:text-red-700 transition-colors"
                              >
                                削除
                              </button>
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
        )}

        {/* ===== 設定タブ ===== */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* 保存エラー */}
            {saveError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {saveError}
              </div>
            )}

            {/* テナント情報編集 */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-6">テナント情報</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    クリニック名
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    スラグ (URL)
                  </label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={editForm.slug}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, ""),
                        }))
                      }
                      className="flex-1 px-3 py-2.5 border border-slate-300 rounded-l-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="px-3 py-2.5 bg-slate-100 border border-l-0 border-slate-300 rounded-r-lg text-sm text-slate-500 font-mono">
                      .lope.jp
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    連絡先メール
                  </label>
                  <input
                    type="email"
                    value={editForm.contactEmail}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        contactEmail: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    電話番号
                  </label>
                  <input
                    type="tel"
                    value={editForm.contactPhone}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        contactPhone: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    ロゴURL
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="url"
                      value={editForm.logoUrl}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, logoUrl: e.target.value }))
                      }
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {editForm.logoUrl && (
                      <img
                        src={editForm.logoUrl}
                        alt="ロゴプレビュー"
                        className="h-10 w-10 object-contain rounded border border-slate-200"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">ログイン画面に表示されるロゴ画像</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    住所
                  </label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, address: e.target.value }))
                    }
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    備考
                  </label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, notes: e.target.value }))
                    }
                    rows={3}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              </div>
              <div className="flex justify-end mt-6 pt-4 border-t border-slate-100">
                <button
                  onClick={handleUpdateTenant}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      保存中...
                    </>
                  ) : (
                    "変更を保存"
                  )}
                </button>
              </div>
            </div>

            {/* 業種設定 */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-base font-semibold text-slate-900">業種</h2>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                  { clinic: "bg-blue-100 text-blue-700", salon: "bg-purple-100 text-purple-700", retail: "bg-emerald-100 text-emerald-700", other: "bg-slate-100 text-slate-600" }[editForm.industry] || "bg-slate-100 text-slate-600"
                }`}>
                  {{ clinic: "クリニック", salon: "サロン", retail: "小売", other: "その他" }[editForm.industry] || editForm.industry}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                テナントの業種を設定します。業種によってテナント管理画面の表示セクションが変わります。
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["clinic", "salon", "retail", "other"] as const).map((ind) => {
                  const labels: Record<string, string> = { clinic: "クリニック", salon: "サロン", retail: "小売", other: "その他" };
                  const icons: Record<string, string> = { clinic: "🏥", salon: "💇", retail: "🏪", other: "🏢" };
                  const isSelected = editForm.industry === ind;
                  return (
                    <button
                      key={ind}
                      onClick={() => setEditForm((p) => ({ ...p, industry: ind }))}
                      className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? "border-amber-500 bg-amber-50 text-amber-800"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xl">{icons[ind]}</span>
                      <span>{labels[ind]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AIオプション管理 */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-1">AIオプション</h2>
              <p className="text-sm text-slate-500 mb-5">テナントに付与するAIオプション機能を管理します。</p>
              {optionsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {aiOptions.map((opt) => (
                    <div key={opt.key} className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      opt.isActive ? "border-green-200 bg-green-50/50" : "border-slate-200 bg-slate-50/50"
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">
                          {{ ai_reply: "🤖", voice_input: "🎙️", ai_karte: "📋" }[opt.key] || "✨"}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{opt.label}</p>
                          <p className="text-xs text-slate-500">¥{opt.monthlyPrice.toLocaleString()}/月</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                          opt.isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {opt.isActive ? "有効" : "無効"}
                        </span>
                        <button
                          onClick={() => toggleOption(opt.key, !opt.isActive)}
                          disabled={optionsSaving === opt.key}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                            opt.isActive ? "bg-amber-500" : "bg-slate-300"
                          }`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                            opt.isActive ? "translate-x-5" : "translate-x-0"
                          }`} />
                        </button>
                      </div>
                    </div>
                  ))}
                  {aiOptions.length > 0 && (
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200 mt-2">
                      <span className="text-sm text-slate-600">オプション月額合計</span>
                      <span className="text-base font-bold text-slate-900">
                        ¥{aiOptions.filter((o) => o.isActive).reduce((s, o) => s + o.monthlyPrice, 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ステータス変更 */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-2">テナントステータス</h2>
              <p className="text-sm text-slate-500 mb-4">
                {tenant.is_active
                  ? "テナントは現在有効です。無効にすると、テナントのメンバーはログインできなくなります。"
                  : "テナントは現在無効です。有効にすると、テナントのメンバーがログインできるようになります。"}
              </p>
              <button
                onClick={toggleStatus}
                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  tenant.is_active
                    ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-300"
                    : "bg-green-100 text-green-700 hover:bg-green-200 border border-green-300"
                }`}
              >
                {tenant.is_active ? "テナントを無効化" : "テナントを有効化"}
              </button>
            </div>

            {/* 危険ゾーン: テナント削除 */}
            <div className="bg-white rounded-lg shadow-sm border-2 border-red-200 p-6">
              <h2 className="text-base font-semibold text-red-600 mb-2">テナント削除</h2>
              <p className="text-sm text-slate-600 mb-4">
                テナントを削除すると、すべてのメンバーが無効化されます。この操作は取り消せません。
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-5 py-2.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  テナントを削除
                </button>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700 mb-3">
                    確認のため、テナントのスラグ「
                    <span className="font-bold font-mono">{tenant.slug}</span>
                    」を入力してください。
                  </p>
                  <input
                    type="text"
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={tenant.slug}
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm font-mono mb-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteInput("");
                      }}
                      className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleteInput !== tenant.slug || deleting}
                      className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {deleting ? "削除中..." : "完全に削除する"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== 分析タブ ===== */}
        {activeTab === "analytics" && (
          <div>
            {analyticsLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                      <div className="h-3 bg-zinc-200 rounded w-1/2 mb-2" />
                      <div className="h-7 bg-zinc-200 rounded w-2/3" />
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
                  <div className="h-80 bg-zinc-100 rounded" />
                </div>
              </div>
            ) : analyticsData.length > 0 ? (
              <div className="space-y-6">
                {/* KPI前月比カード */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {(() => {
                    const current = analyticsData[analyticsData.length - 1];
                    const prev = analyticsData.length >= 2 ? analyticsData[analyticsData.length - 2] : null;
                    const metrics = [
                      { label: "患者数", current: current.patients, prev: prev?.patients ?? 0, unit: "人", color: "blue" as const },
                      { label: "売上", current: current.revenue, prev: prev?.revenue ?? 0, unit: "円", isCurrency: true, color: "amber" as const },
                      { label: "予約数", current: current.reservations, prev: prev?.reservations ?? 0, unit: "件", color: "emerald" as const },
                      { label: "LINE友だち", current: current.lineFriends, prev: prev?.lineFriends ?? 0, unit: "人", color: "green" as const },
                    ];
                    return metrics.map((m) => {
                      const diff = m.prev > 0 ? ((m.current - m.prev) / m.prev) * 100 : m.current > 0 ? 100 : 0;
                      const colorMap = {
                        blue: "border-l-blue-500",
                        amber: "border-l-amber-500",
                        emerald: "border-l-emerald-500",
                        green: "border-l-green-500",
                      };
                      return (
                        <div key={m.label} className={`bg-white rounded-lg shadow-sm border border-slate-200 border-l-4 ${colorMap[m.color]} p-5`}>
                          <p className="text-sm text-zinc-500 mb-1">{m.label}</p>
                          <div className="text-2xl font-bold text-zinc-900">
                            {m.isCurrency
                              ? `¥${m.current.toLocaleString()}`
                              : m.current.toLocaleString()}
                            {!m.isCurrency && <span className="text-sm text-zinc-400 ml-0.5">{m.unit}</span>}
                          </div>
                          {prev && (
                            <div className={`text-xs mt-1 font-medium ${diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-zinc-400"}`}>
                              {diff > 0 ? "+" : ""}{diff.toFixed(1)}% vs 前月
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* 月別推移グラフ */}
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                  <h2 className="text-base font-semibold text-zinc-900 mb-4">月別推移</h2>
                  <AnalyticsChart data={analyticsData} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-10 text-center">
                <p className="text-sm text-zinc-400">分析データがありません</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- サブコンポーネント ---

// KPIカード
function KPICard({
  label,
  value,
  unit,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "amber" | "green";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    green: "bg-green-50 text-green-600 border-green-100",
  };

  const iconBg = {
    blue: "bg-blue-100 text-blue-600",
    emerald: "bg-emerald-100 text-emerald-600",
    amber: "bg-amber-100 text-amber-600",
    green: "bg-green-100 text-green-600",
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-5 ${colorClasses[color]} border-opacity-60`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

// 情報行
function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </p>
    </div>
  );
}
