// 決済設定セクション（プロバイダー選択 + APIキー管理）
"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import type { SettingsMap, CategoryKey } from "../page";
import { SettingRow, SourceBadge } from "../page";
import { BANK_ACCOUNT_FIELDS, type BankAccount } from "@/lib/bank-account";
import { SQUARE_ACCOUNT_FIELDS, emptySquareAccount, type SquareAccount } from "@/lib/square-account";

const PROVIDER_OPTIONS: { value: string; label: string; description: string; category: CategoryKey }[] = [
  { value: "square", label: "Square", description: "クレジットカード決済（Payment Links API）", category: "square" },
  { value: "gmo", label: "GMO ペイメントゲートウェイ", description: "クレジットカード決済（PG マルチペイメント）", category: "gmo" },
];

interface Props {
  settings: SettingsMap | null;
  onSaved: (msg: string, type: "success" | "error") => void;
}

function PaymentSetupGuide({ provider, defaultOpen }: { provider: string; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📋</span>
          <span className="text-xs font-bold text-gray-700">設定手順を見る</span>
        </div>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-4">
          {provider === "square" ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">1</span>
                  <h4 className="text-xs font-bold text-gray-800">Squareアプリケーションを準備</h4>
                </div>
                <div className="ml-7 text-xs text-gray-600 space-y-1 leading-relaxed">
                  <p>
                    <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                      Square Developer Dashboard
                    </a>
                    {" "}にログイン
                  </p>
                  <p>「Applications」→ 対象のアプリを選択（なければ「+」で新規作成）</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">2</span>
                  <h4 className="text-xs font-bold text-gray-800">APIキーを取得</h4>
                </div>
                <div className="ml-7 text-xs text-gray-600 space-y-1 leading-relaxed">
                  <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                    <p>「<strong>Credentials</strong>」タブを開く</p>
                    <p className="text-amber-700">※ 上部で「<strong>Production</strong>」タブに切り替えること（Sandboxではなく）</p>
                    <p className="pl-3">「Access Token」→ 下の <strong>Access Token</strong> にコピー</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
                  <h4 className="text-xs font-bold text-gray-800">Location IDを取得</h4>
                </div>
                <div className="ml-7 text-xs text-gray-600 space-y-1 leading-relaxed">
                  <p>「<strong>Locations</strong>」タブ → 対象ロケーションのIDをコピー</p>
                  <p className="pl-3">→ 下の <strong>Location ID</strong> にコピー</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">4</span>
                  <h4 className="text-xs font-bold text-gray-800">Webhookを設定</h4>
                </div>
                <div className="ml-7 text-xs text-gray-600 space-y-1 leading-relaxed">
                  <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                    <p>「<strong>Webhooks</strong>」タブ → 「<strong>Add Endpoint</strong>」</p>
                    <p>URL に以下を入力:</p>
                    <code className="block bg-white px-2.5 py-1 rounded border border-gray-200 text-[11px] font-mono text-gray-800 select-all">
                      https://あなたのドメイン/api/square/webhook
                    </code>
                    <p>イベント: <strong>payment.completed</strong>, <strong>refund.created</strong> を選択</p>
                    <p>「Signature Key」→ 下の <strong>Webhook Signature Key</strong> にコピー</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">5</span>
                  <h4 className="text-xs font-bold text-gray-800">環境を設定</h4>
                </div>
                <div className="ml-7 text-xs text-gray-600 leading-relaxed">
                  <p>下の「<strong>環境</strong>」で <strong>production</strong> を入力して保存</p>
                </div>
              </div>
            </div>
          ) : provider === "gmo" ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">1</span>
                  <h4 className="text-xs font-bold text-gray-800">GMO PG管理画面にログイン</h4>
                </div>
                <div className="ml-7 text-xs text-gray-600 space-y-1 leading-relaxed">
                  <p>
                    <a href="https://kt01.mul-pay.jp/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                      GMO PG サイト管理画面
                    </a>
                    {" "}にログイン
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">2</span>
                  <h4 className="text-xs font-bold text-gray-800">ショップ情報を確認</h4>
                </div>
                <div className="ml-7 text-xs text-gray-600 space-y-1 leading-relaxed">
                  <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                    <p>「ショップ管理」を開く</p>
                    <p className="pl-3">「ショップID」→ 下の <strong>ショップID</strong> にコピー</p>
                    <p className="pl-3">「ショップパスワード」→ 下の <strong>ショップパスワード</strong> にコピー</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
                  <h4 className="text-xs font-bold text-gray-800">サイト情報を確認</h4>
                </div>
                <div className="ml-7 text-xs text-gray-600 space-y-1 leading-relaxed">
                  <div className="bg-gray-50 rounded-lg p-2.5 space-y-1.5">
                    <p>「サイト管理」を開く</p>
                    <p className="pl-3">「サイトID」→ 下の <strong>サイトID</strong> にコピー</p>
                    <p className="pl-3">「サイトパスワード」→ 下の <strong>サイトパスワード</strong> にコピー</p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="shrink-0 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">4</span>
                  <h4 className="text-xs font-bold text-gray-800">環境を設定</h4>
                </div>
                <div className="ml-7 text-xs text-gray-600 leading-relaxed">
                  <p>下の「<strong>環境</strong>」で <strong>production</strong> を入力して保存</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function emptyBankAccount(): BankAccount {
  return {
    id: `acc_${Date.now()}`,
    bank_name: "",
    bank_branch: "",
    bank_account_type: "",
    bank_account_number: "",
    bank_account_holder: "",
  };
}

const RECONCILE_MODE_OPTIONS = [
  {
    value: "order_based",
    label: "注文ベース照合",
    description: "共用口座向け。注文を基準にCSVからマッチを探す",
  },
  {
    value: "statement_based",
    label: "明細ベース照合",
    description: "専用口座向け。銀行明細の全入金に対応する注文を探す",
  },
];

export default function PaymentSection({ settings, onSaved }: Props) {
  const paymentSettings = settings?.payment ?? [];
  const squareSettings = settings?.square ?? [];
  const providerSetting = paymentSettings.find((s) => s.key === "provider");
  const checkoutModeSetting = paymentSettings.find((s) => s.key === "checkout_mode");
  const reconcileModeSetting = paymentSettings.find((s) => s.key === "reconcile_mode");
  const threeDsSetting = squareSettings.find((s) => s.key === "3ds_enabled");
  const currentProvider = providerSetting?.maskedValue || "";
  const currentCheckoutMode = checkoutModeSetting?.maskedValue || "";
  const currentReconcileMode = reconcileModeSetting?.maskedValue || "";
  const currentThreeDs = threeDsSetting?.maskedValue === "true";

  const [selected, setSelected] = useState<string>(
    currentProvider === "未設定" ? "" : currentProvider,
  );
  const [checkoutMode, setCheckoutMode] = useState<string>(
    !currentCheckoutMode || currentCheckoutMode === "未設定" ? "hosted" : currentCheckoutMode,
  );
  const [reconcileMode, setReconcileMode] = useState<string>(
    !currentReconcileMode || currentReconcileMode === "未設定" ? "order_based" : currentReconcileMode,
  );
  const [threeDsEnabled, setThreeDsEnabled] = useState(currentThreeDs);
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState(false);
  const [savingReconcile, setSavingReconcile] = useState(false);
  const [savingThreeDs, setSavingThreeDs] = useState(false);
  const [editing, setEditing] = useState(false);

  // Squareアカウント管理
  const [sqAccounts, setSqAccounts] = useState<SquareAccount[]>([]);
  const [activeSqId, setActiveSqId] = useState<string>("");
  const [savedSqAccounts, setSavedSqAccounts] = useState<SquareAccount[]>([]);
  const [savedActiveSqId, setSavedActiveSqId] = useState<string>("");
  const [savingSq, setSavingSq] = useState(false);
  const [showSqConfirm, setShowSqConfirm] = useState(false);
  const [editingSqAccount, setEditingSqAccount] = useState<SquareAccount | null>(null);
  const [isAddSqMode, setIsAddSqMode] = useState(false);

  // Squareアカウント取得（SWR）
  const SQ_KEY = "/api/admin/square-accounts";
  const { data: sqData, isLoading: sqLoading } = useSWR<{ accounts: SquareAccount[]; activeId: string }>(SQ_KEY);
  const [sqInitialized, setSqInitialized] = useState(false);

  useEffect(() => {
    if (sqData && !sqInitialized) {
      setSqAccounts(sqData.accounts || []);
      setActiveSqId(sqData.activeId || "");
      setSavedSqAccounts(JSON.parse(JSON.stringify(sqData.accounts || [])));
      setSavedActiveSqId(sqData.activeId || "");
      setSqInitialized(true);
    }
  }, [sqData, sqInitialized]);

  // 口座情報（複数口座対応）
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [savedAccounts, setSavedAccounts] = useState<BankAccount[]>([]);
  const [savedActiveId, setSavedActiveId] = useState<string>("");
  const [savingBank, setSavingBank] = useState(false);
  const [showBankConfirm, setShowBankConfirm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isAddMode, setIsAddMode] = useState(false);

  useEffect(() => {
    const val = providerSetting?.maskedValue || "";
    setSelected(val === "未設定" ? "" : val);
  }, [providerSetting?.maskedValue]);

  useEffect(() => {
    const val = checkoutModeSetting?.maskedValue || "";
    setCheckoutMode(!val || val === "未設定" ? "hosted" : val);
  }, [checkoutModeSetting?.maskedValue]);

  useEffect(() => {
    const val = reconcileModeSetting?.maskedValue || "";
    setReconcileMode(!val || val === "未設定" ? "order_based" : val);
  }, [reconcileModeSetting?.maskedValue]);

  useEffect(() => {
    setThreeDsEnabled(threeDsSetting?.maskedValue === "true");
  }, [threeDsSetting?.maskedValue]);

  // 口座情報の取得（SWR）
  const BANK_KEY = "/api/admin/bank-accounts";
  const { data: bankData, isLoading: bankLoading } = useSWR<{ accounts: BankAccount[]; activeId: string }>(BANK_KEY);
  const [bankInitialized, setBankInitialized] = useState(false);

  useEffect(() => {
    if (bankData && !bankInitialized) {
      setAccounts(bankData.accounts || []);
      setActiveId(bankData.activeId || "");
      setSavedAccounts(JSON.parse(JSON.stringify(bankData.accounts || [])));
      setSavedActiveId(bankData.activeId || "");
      setBankInitialized(true);
    }
  }, [bankData, bankInitialized]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "payment", key: "provider", value: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.message || data.error) || `保存に失敗しました (${res.status})`);
      }
      onSaved("決済プロバイダーを保存しました", "success");
    } catch (err) {
      onSaved((err instanceof Error ? err.message : null) || "保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReconcileMode = async () => {
    setSavingReconcile(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "payment", key: "reconcile_mode", value: reconcileMode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.message || data.error) || `保存に失敗しました (${res.status})`);
      }
      onSaved("振込照合モードを保存しました", "success");
    } catch (err) {
      onSaved((err instanceof Error ? err.message : null) || "保存に失敗しました", "error");
    } finally {
      setSavingReconcile(false);
    }
  };

  const handleSaveThreeDs = async (enabled: boolean) => {
    setSavingThreeDs(true);
    setThreeDsEnabled(enabled);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "square", key: "3ds_enabled", value: enabled ? "true" : "false" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.message || data.error) || `保存に失敗しました (${res.status})`);
      }
      onSaved(enabled ? "3Dセキュアを有効にしました" : "3Dセキュアを無効にしました", "success");
    } catch (err) {
      setThreeDsEnabled(!enabled);
      onSaved((err instanceof Error ? err.message : null) || "保存に失敗しました", "error");
    } finally {
      setSavingThreeDs(false);
    }
  };

  // Squareアカウント操作
  const handleSaveSqAccounts = async () => {
    setSavingSq(true);
    try {
      const res = await fetch("/api/admin/square-accounts", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts: sqAccounts, activeId: activeSqId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.message || data.error) || "Squareアカウントの保存に失敗しました");
      }
      setSavedSqAccounts(JSON.parse(JSON.stringify(sqAccounts)));
      setSavedActiveSqId(activeSqId);
      setShowSqConfirm(false);
      mutate(SQ_KEY);
      onSaved("Squareアカウントを保存しました", "success");
    } catch (err) {
      onSaved((err instanceof Error ? err.message : null) || "Squareアカウントの保存に失敗しました", "error");
    } finally {
      setSavingSq(false);
    }
  };

  const [connectingSqOAuth, setConnectingSqOAuth] = useState(false);
  const [revokingSqId, setRevokingSqId] = useState<string | null>(null);
  const [showLocationSelect, setShowLocationSelect] = useState<string | null>(null);
  const [sqLocations, setSqLocations] = useState<{ id: string; name: string }[]>([]);

  // URLクエリパラメータからOAuth結果を検知
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthResult = params.get("square_oauth");
    const oauthError = params.get("square_oauth_error");
    const selectAccountId = params.get("sq_account_id");

    if (oauthResult === "success") {
      onSaved("Squareアカウントを接続しました", "success");
      mutate(SQ_KEY);
      // URLからクエリパラメータを削除
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthResult === "select_location" && selectAccountId) {
      // Location選択が必要
      mutate(SQ_KEY);
      handleLoadLocations(selectAccountId);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthError) {
      const errorMessages: Record<string, string> = {
        auth_denied: "Square認可がキャンセルされました",
        invalid_state: "認証情報が無効です。もう一度お試しください",
        missing_params: "パラメータが不足しています",
        server_error: "接続中にエラーが発生しました",
      };
      onSaved(errorMessages[oauthError] || "Square接続エラー", "error");
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnectSquareOAuth = async () => {
    setConnectingSqOAuth(true);
    try {
      const res = await fetch("/api/admin/square-oauth/auth");
      const data = await res.json();
      if (data.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        onSaved("OAuth URL取得に失敗しました", "error");
        setConnectingSqOAuth(false);
      }
    } catch {
      onSaved("OAuth接続エラー", "error");
      setConnectingSqOAuth(false);
    }
  };

  const handleRevokeSqOAuth = async (accountId: string) => {
    if (!confirm("このSquareアカウントの接続を解除しますか？")) return;
    setRevokingSqId(accountId);
    try {
      const res = await fetch("/api/admin/square-oauth/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
      });
      if (res.ok) {
        onSaved("Squareアカウントの接続を解除しました", "success");
        mutate(SQ_KEY);
        setSqInitialized(false);
      } else {
        onSaved("接続解除に失敗しました", "error");
      }
    } catch {
      onSaved("接続解除エラー", "error");
    } finally {
      setRevokingSqId(null);
    }
  };

  const handleLoadLocations = async (accountId: string) => {
    try {
      const res = await fetch(`/api/admin/square-oauth/locations?account_id=${accountId}`);
      const data = await res.json();
      if (data.locations) {
        setSqLocations(data.locations);
        setShowLocationSelect(accountId);
      }
    } catch {
      onSaved("ロケーション取得に失敗しました", "error");
    }
  };

  const handleSelectLocation = async (accountId: string, locationId: string) => {
    try {
      const res = await fetch("/api/admin/square-oauth/locations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, locationId }),
      });
      if (res.ok) {
        onSaved("ロケーションを設定しました", "success");
        setShowLocationSelect(null);
        mutate(SQ_KEY);
        setSqInitialized(false);
      } else {
        onSaved("ロケーション設定に失敗しました", "error");
      }
    } catch {
      onSaved("ロケーション設定エラー", "error");
    }
  };

  const handleAddSqAccount = () => {
    setEditingSqAccount(emptySquareAccount());
    setIsAddSqMode(true);
  };

  const handleEditSqAccount = (acc: SquareAccount) => {
    setEditingSqAccount({ ...acc });
    setIsAddSqMode(false);
  };

  const handleDeleteSqAccount = (id: string) => {
    const updated = sqAccounts.filter((a) => a.id !== id);
    setSqAccounts(updated);
    if (activeSqId === id && updated.length > 0) {
      setActiveSqId(updated[0].id);
    }
  };

  const handleSaveSqEdit = () => {
    if (!editingSqAccount) return;
    if (isAddSqMode) {
      setSqAccounts((prev) => [...prev, editingSqAccount]);
      if (sqAccounts.length === 0) {
        setActiveSqId(editingSqAccount.id);
      }
    } else {
      setSqAccounts((prev) => prev.map((a) => (a.id === editingSqAccount.id ? editingSqAccount : a)));
    }
    setEditingSqAccount(null);
  };

  const sqHasChanges =
    JSON.stringify(sqAccounts) !== JSON.stringify(savedSqAccounts) ||
    activeSqId !== savedActiveSqId;

  function maskToken(token: string): string {
    if (!token || token.length <= 8) return token ? "****" : "";
    return "****" + token.slice(-4);
  }

  const handleSaveCheckoutMode = async () => {
    setSavingMode(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "payment", key: "checkout_mode", value: checkoutMode }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.message || data.error) || `保存に失敗しました (${res.status})`);
      }
      onSaved("チェックアウトモードを保存しました", "success");
    } catch (err) {
      onSaved((err instanceof Error ? err.message : null) || "保存に失敗しました", "error");
    } finally {
      setSavingMode(false);
    }
  };

  const handleSaveBankAccounts = async () => {
    setSavingBank(true);
    try {
      const res = await fetch("/api/admin/bank-accounts", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accounts, activeId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data.message || data.error) || "口座情報の保存に失敗しました");
      }
      setSavedAccounts(JSON.parse(JSON.stringify(accounts)));
      setSavedActiveId(activeId);
      setShowBankConfirm(false);
      mutate(BANK_KEY);
      onSaved("口座情報を保存しました", "success");
    } catch (err) {
      onSaved((err instanceof Error ? err.message : null) || "口座情報の保存に失敗しました", "error");
    } finally {
      setSavingBank(false);
    }
  };

  const handleAddAccount = () => {
    setEditingAccount(emptyBankAccount());
    setIsAddMode(true);
  };

  const handleEditAccount = (acc: BankAccount) => {
    setEditingAccount({ ...acc });
    setIsAddMode(false);
  };

  const handleDeleteAccount = (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    if (activeId === id && updated.length > 0) {
      setActiveId(updated[0].id);
    }
  };

  const handleSaveEdit = () => {
    if (!editingAccount) return;
    if (isAddMode) {
      setAccounts((prev) => [...prev, editingAccount]);
      if (accounts.length === 0) {
        setActiveId(editingAccount.id);
      }
    } else {
      setAccounts((prev) => prev.map((a) => (a.id === editingAccount.id ? editingAccount : a)));
    }
    setEditingAccount(null);
  };

  const bankHasChanges =
    JSON.stringify(accounts) !== JSON.stringify(savedAccounts) ||
    activeId !== savedActiveId;

  const selectedOption = PROVIDER_OPTIONS.find((o) => o.value === selected);
  const providerSettings = selectedOption ? (settings?.[selectedOption.category] ?? []) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-gray-800">決済設定</h2>
          <p className="text-xs text-gray-500 mt-0.5">決済プロバイダーの選択とAPIキーの管理</p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              キャンセル
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              編集する
            </button>
          )}
        </div>
      </div>

      {/* プロバイダー選択 */}
      <div className={`px-5 py-4 border-b border-gray-100 ${!editing ? "pointer-events-none opacity-60" : ""}`}>
        <p className="text-sm font-medium text-gray-900 mb-3">決済プロバイダー選択</p>
        <div className="space-y-3">
          {PROVIDER_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                selected === opt.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="payment_provider"
                value={opt.value}
                checked={selected === opt.value}
                onChange={(e) => setSelected(e.target.value)}
                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <SourceBadge source={providerSetting?.source ?? "未設定"} />
          <button
            onClick={handleSave}
            disabled={saving || !selected}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "保存中..." : "プロバイダーを保存"}
          </button>
        </div>
      </div>

      {/* チェックアウトモード（Squareの場合のみ表示） */}
      {selected === "square" && (
        <div className={`px-5 py-4 border-b border-gray-100 ${!editing ? "pointer-events-none opacity-60" : ""}`}>
          <p className="text-sm font-medium text-gray-900 mb-3">チェックアウトモード</p>
          <div className="space-y-3">
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                checkoutMode === "hosted"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="checkout_mode"
                value="hosted"
                checked={checkoutMode === "hosted"}
                onChange={() => setCheckoutMode("hosted")}
                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">ホスティング型</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Square/GMOの決済画面に遷移して決済（現行方式）
                </p>
              </div>
            </label>
            <label
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                checkoutMode === "inline"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="checkout_mode"
                value="inline"
                checked={checkoutMode === "inline"}
                onChange={() => setCheckoutMode("inline")}
                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">アプリ内決済</span>
                <p className="text-xs text-gray-500 mt-0.5">
                  サイト内でカード入力・決済（Web Payments SDK）。カード保存・再利用が可能
                </p>
              </div>
            </label>
          </div>
          <div className="mt-4">
            <button
              onClick={handleSaveCheckoutMode}
              disabled={savingMode}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {savingMode ? "保存中..." : "モードを保存"}
            </button>
          </div>
          {checkoutMode === "inline" && (
            <>
              <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                <p className="text-xs text-amber-800 leading-relaxed">
                  アプリ内決済を使用するには、Square Developer Dashboard で <strong>Application ID</strong> を取得し、
                  下の「Square API設定」セクションに入力してください。
                </p>
              </div>

              {/* 3Dセキュア設定 — アカウント管理で制御 */}
              <div className="mt-3 rounded-lg border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-900">3Dセキュア認証（SCA）</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      下の「Square API設定」セクションでアカウントごとに設定できます
                    </p>
                  </div>
                  {(() => {
                    const activeAcc = sqAccounts.find((a) => a.id === activeSqId);
                    const enabled = activeAcc?.three_ds_enabled ?? false;
                    return (
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                        enabled ? "text-blue-700 bg-blue-100" : "text-gray-500 bg-gray-100"
                      }`}>
                        {enabled ? "有効" : "無効"}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Square アカウント管理（カード形式） */}
      {selected === "square" && (
        <div className={`border-t border-gray-200 ${!editing ? "pointer-events-none opacity-60" : ""}`}>
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Square API設定
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">アカウント情報をまとめて管理。「使用中」のアカウントが決済に使用されます</p>
          </div>

          {/* 設定手順ガイド */}
          <PaymentSetupGuide
            provider="square"
            defaultOpen={sqAccounts.length === 0}
          />

          <div className="px-5 py-4">
            {sqLoading ? (
              <p className="text-xs text-gray-400 py-4">読み込み中...</p>
            ) : (
              <>
                <div className="space-y-3">
                  {sqAccounts.map((acc) => {
                    const isActive = acc.id === activeSqId;
                    return (
                      <div
                        key={acc.id}
                        className={`rounded-lg border-2 p-3 ${
                          isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-gray-900 truncate">{acc.name || "未命名"}</span>
                              {isActive && (
                                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 rounded">
                                  使用中
                                </span>
                              )}
                              {acc.oauth_connected && (
                                <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold text-purple-700 bg-purple-100 rounded">
                                  OAuth
                                </span>
                              )}
                              <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                acc.env === "sandbox" ? "text-amber-700 bg-amber-100" : "text-green-700 bg-green-100"
                              }`}>
                                {acc.env === "sandbox" ? "Sandbox" : "Production"}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 space-y-0.5">
                              <p>Token: {maskToken(acc.access_token)} / Location: {acc.location_id || <span className="text-amber-600 font-medium">未設定</span>}</p>
                              {acc.application_id && <p>App ID: {acc.application_id}</p>}
                              {acc.three_ds_enabled && <p className="text-blue-600">3Dセキュア有効</p>}
                              {acc.oauth_connected && acc.token_expires_at && (
                                <p className="text-gray-400">
                                  トークン期限: {new Date(acc.token_expires_at).toLocaleDateString("ja-JP")}
                                  {new Date(acc.token_expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 && (
                                    <span className="text-amber-600 font-medium ml-1">（更新予定）</span>
                                  )}
                                </p>
                              )}
                              {acc.oauth_connected && !acc.location_id && (
                                <button
                                  onClick={() => handleLoadLocations(acc.id)}
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  ロケーションを選択
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!isActive && (
                              <button
                                onClick={() => setActiveSqId(acc.id)}
                                className="px-2 py-1 text-[10px] font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                              >
                                使用する
                              </button>
                            )}
                            {!acc.oauth_connected && (
                              <button
                                onClick={() => handleEditSqAccount(acc)}
                                className="px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                              >
                                編集
                              </button>
                            )}
                            {acc.oauth_connected ? (
                              <button
                                onClick={() => handleRevokeSqOAuth(acc.id)}
                                disabled={revokingSqId === acc.id}
                                className="px-2 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                {revokingSqId === acc.id ? "切断中..." : "切断"}
                              </button>
                            ) : sqAccounts.length > 1 && (
                              <button
                                onClick={() => handleDeleteSqAccount(acc.id)}
                                className="px-2 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                              >
                                削除
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleConnectSquareOAuth}
                    disabled={connectingSqOAuth}
                    className="px-4 py-2 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {connectingSqOAuth ? "接続中..." : "Squareアカウントを接続"}
                  </button>
                  <button
                    onClick={handleAddSqAccount}
                    className="px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    + 手動で追加
                  </button>
                  {sqHasChanges && (
                    <button
                      onClick={() => setShowSqConfirm(true)}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      変更を保存
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* GMO等その他プロバイダーのAPI Key設定（従来形式） */}
      {selected && selected !== "square" && providerSettings.length > 0 && (
        <div className={`border-t border-gray-200 ${!editing ? "pointer-events-none opacity-60" : ""}`}>
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {selectedOption?.label} API設定
            </p>
          </div>

          <PaymentSetupGuide
            provider={selected}
            defaultOpen={providerSettings.every((i) => i.source === "未設定")}
          />

          {providerSettings.map((item) => (
            <SettingRow
              key={item.key}
              item={item}
              category={selectedOption!.category}
              onSaved={onSaved}
            />
          ))}
        </div>
      )}

      {selected && selected !== "square" && providerSettings.length === 0 && (
        <div className={`px-5 py-6 text-center text-gray-400 text-sm border-t border-gray-200 ${!editing ? "pointer-events-none opacity-60" : ""}`}>
          {selectedOption?.label} のAPI設定キーはまだ登録されていません。
          <br />
          上の保存ボタンを押してからページを再読み込みしてください。
        </div>
      )}

      {/* 振込照合モード */}
      <div className={`px-5 py-4 border-t border-gray-100 ${!editing ? "pointer-events-none opacity-60" : ""}`}>
        <p className="text-sm font-medium text-gray-900 mb-3">振込照合モード</p>
        <div className="space-y-3">
          {RECONCILE_MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                reconcileMode === opt.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="reconcile_mode"
                value={opt.value}
                checked={reconcileMode === opt.value}
                onChange={(e) => setReconcileMode(e.target.value)}
                className="w-4 h-4 mt-0.5 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <button
            onClick={handleSaveReconcileMode}
            disabled={savingReconcile}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingReconcile ? "保存中..." : "照合モードを保存"}
          </button>
        </div>
      </div>

      {/* 振込先口座情報 */}
      <div className={`px-5 py-4 border-t border-gray-100 ${!editing ? "pointer-events-none opacity-60" : ""}`}>
        <p className="text-sm font-medium text-gray-900 mb-1">振込先口座情報</p>
        <p className="text-xs text-gray-500 mb-3">患者マイページの銀行振込画面に表示される口座情報（複数登録可）</p>

        {bankLoading ? (
          <p className="text-xs text-gray-400 py-4">読み込み中...</p>
        ) : (
          <>
            <div className="space-y-3">
              {accounts.map((acc) => {
                const isActive = acc.id === activeId;
                return (
                  <div
                    key={acc.id}
                    className={`rounded-lg border-2 p-3 ${
                      isActive ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900 truncate">{acc.bank_name}</span>
                          {isActive && (
                            <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 bg-blue-100 rounded">
                              使用中
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <p>{acc.bank_branch} / {acc.bank_account_type} {acc.bank_account_number}</p>
                          <p>{acc.bank_account_holder}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!isActive && (
                          <button
                            onClick={() => setActiveId(acc.id)}
                            className="px-2 py-1 text-[10px] font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                          >
                            使用する
                          </button>
                        )}
                        <button
                          onClick={() => handleEditAccount(acc)}
                          className="px-2 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                        >
                          編集
                        </button>
                        {accounts.length > 1 && (
                          <button
                            onClick={() => handleDeleteAccount(acc.id)}
                            className="px-2 py-1 text-[10px] font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleAddAccount}
                className="px-3 py-2 text-xs font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                + 口座を追加
              </button>
              {bankHasChanges && (
                <button
                  onClick={() => setShowBankConfirm(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  変更を保存
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Squareアカウント編集モーダル */}
      {editingSqAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingSqAccount(null)}>
          <div className="bg-white rounded-xl shadow-xl mx-4 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">
                {isAddSqMode ? "Squareアカウントを追加" : "Squareアカウントを編集"}
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              {SQUARE_ACCOUNT_FIELDS.map((def) => (
                <div key={def.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{def.label}</label>
                  <input
                    type={def.secret ? "password" : "text"}
                    value={editingSqAccount[def.key] || ""}
                    onChange={(e) =>
                      setEditingSqAccount((prev) =>
                        prev ? { ...prev, [def.key]: e.target.value } : prev
                      )
                    }
                    placeholder={def.placeholder}
                    autoComplete="off"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
              {/* 3Dセキュア */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="text-xs font-medium text-gray-700">3Dセキュア認証（SCA）</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">アプリ内決済時の本人認証</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editingSqAccount.three_ds_enabled}
                  onClick={() =>
                    setEditingSqAccount((prev) =>
                      prev ? { ...prev, three_ds_enabled: !prev.three_ds_enabled } : prev
                    )
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    editingSqAccount.three_ds_enabled ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      editingSqAccount.three_ds_enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setEditingSqAccount(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveSqEdit}
                disabled={!editingSqAccount.name || !editingSqAccount.access_token || !editingSqAccount.location_id}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isAddSqMode ? "追加する" : "更新する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Location選択モーダル */}
      {showLocationSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowLocationSelect(null)}>
          <div className="bg-white rounded-xl shadow-xl mx-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">ロケーションを選択</h3>
              <p className="text-xs text-gray-500 mt-0.5">決済に使用するSquareロケーションを選択してください</p>
            </div>
            <div className="px-5 py-4 space-y-2 max-h-64 overflow-y-auto">
              {sqLocations.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">アクティブなロケーションがありません</p>
              ) : sqLocations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSelectLocation(showLocationSelect, loc.id)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-800">{loc.name}</p>
                  <p className="text-xs text-gray-400">{loc.id}</p>
                </button>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowLocationSelect(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Squareアカウント変更確認モーダル */}
      {showSqConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSqConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl mx-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">Squareアカウントの変更確認</h3>
              <p className="text-xs text-gray-500 mt-0.5">以下の内容で保存します。変更箇所をご確認ください。</p>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* アクティブアカウントの変更 */}
              {activeSqId !== savedActiveSqId && (
                <div className="rounded-lg p-3 bg-yellow-50 border border-yellow-200">
                  <div className="text-xs font-medium text-yellow-800 mb-1">使用アカウントの変更</div>
                  <div className="text-sm text-yellow-900">
                    {(() => {
                      const oldAcc = savedSqAccounts.find((a) => a.id === savedActiveSqId);
                      const newAcc = sqAccounts.find((a) => a.id === activeSqId);
                      return (
                        <>
                          <span className="line-through text-gray-400">{oldAcc?.name || "なし"}</span>
                          {" → "}
                          <span className="font-medium">{newAcc?.name || "なし"}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 各アカウントの状態 */}
              {sqAccounts.map((acc) => {
                const savedAcc = savedSqAccounts.find((a) => a.id === acc.id);
                const isNew = !savedAcc;
                const isChanged = savedAcc && JSON.stringify(acc) !== JSON.stringify(savedAcc);
                const isActive = acc.id === activeSqId;
                return (
                  <div
                    key={acc.id}
                    className={`rounded-lg p-3 ${
                      isNew ? "bg-green-50 border border-green-200" : isChanged ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{acc.name}</span>
                      {isActive && <span className="text-[10px] text-blue-600 font-bold">使用中</span>}
                      {isNew && <span className="text-[10px] text-green-600 font-bold">新規追加</span>}
                      {isChanged && <span className="text-[10px] text-blue-600 font-bold">変更あり</span>}
                    </div>
                    <div className="text-xs text-gray-600">
                      {acc.env} / Token: {maskToken(acc.access_token)} / Location: {acc.location_id || "未設定"}
                    </div>
                  </div>
                );
              })}

              {/* 削除されたアカウント */}
              {savedSqAccounts
                .filter((sa) => !sqAccounts.some((a) => a.id === sa.id))
                .map((deleted) => (
                  <div key={deleted.id} className="rounded-lg p-3 bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700 line-through">{deleted.name}</span>
                      <span className="text-[10px] text-red-600 font-bold">削除</span>
                    </div>
                    <div className="text-xs text-gray-400 line-through">
                      {deleted.env} / Token: {maskToken(deleted.access_token)}
                    </div>
                  </div>
                ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowSqConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveSqAccounts}
                disabled={savingSq}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingSq ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 口座編集モーダル */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setEditingAccount(null)}>
          <div className="bg-white rounded-xl shadow-xl mx-4 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">
                {isAddMode ? "口座を追加" : "口座を編集"}
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              {BANK_ACCOUNT_FIELDS.map((def) => (
                <div key={def.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{def.label}</label>
                  <input
                    type="text"
                    value={editingAccount[def.key] || ""}
                    onChange={(e) =>
                      setEditingAccount((prev) =>
                        prev ? { ...prev, [def.key]: e.target.value } : prev
                      )
                    }
                    placeholder={def.placeholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setEditingAccount(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editingAccount.bank_name || !editingAccount.bank_account_number}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isAddMode ? "追加する" : "更新する"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 口座情報変更確認モーダル */}
      {showBankConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowBankConfirm(false)}>
          <div className="bg-white rounded-xl shadow-xl mx-4 max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-800">口座情報の変更確認</h3>
              <p className="text-xs text-gray-500 mt-0.5">以下の内容で保存します。変更箇所をご確認ください。</p>
            </div>
            <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* アクティブ口座の変更 */}
              {activeId !== savedActiveId && (
                <div className="rounded-lg p-3 bg-yellow-50 border border-yellow-200">
                  <div className="text-xs font-medium text-yellow-800 mb-1">使用口座の変更</div>
                  <div className="text-sm text-yellow-900">
                    {(() => {
                      const oldAcc = savedAccounts.find((a) => a.id === savedActiveId);
                      const newAcc = accounts.find((a) => a.id === activeId);
                      return (
                        <>
                          <span className="line-through text-gray-400">{oldAcc?.bank_name || "なし"}</span>
                          {" → "}
                          <span className="font-medium">{newAcc?.bank_name || "なし"}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* 各口座の状態 */}
              {accounts.map((acc) => {
                const savedAcc = savedAccounts.find((a) => a.id === acc.id);
                const isNew = !savedAcc;
                const isChanged = savedAcc && JSON.stringify(acc) !== JSON.stringify(savedAcc);
                const isActive = acc.id === activeId;
                return (
                  <div
                    key={acc.id}
                    className={`rounded-lg p-3 ${
                      isNew ? "bg-green-50 border border-green-200" : isChanged ? "bg-blue-50 border border-blue-200" : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{acc.bank_name}</span>
                      {isActive && <span className="text-[10px] text-blue-600 font-bold">使用中</span>}
                      {isNew && <span className="text-[10px] text-green-600 font-bold">新規追加</span>}
                      {isChanged && <span className="text-[10px] text-blue-600 font-bold">変更あり</span>}
                    </div>
                    <div className="text-xs text-gray-600">
                      {acc.bank_branch} / {acc.bank_account_type} {acc.bank_account_number} / {acc.bank_account_holder}
                    </div>
                    {isChanged && savedAcc && (
                      <div className="mt-1 text-[10px] text-gray-400">
                        変更前: {savedAcc.bank_branch} / {savedAcc.bank_account_type} {savedAcc.bank_account_number} / {savedAcc.bank_account_holder}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 削除された口座 */}
              {savedAccounts
                .filter((sa) => !accounts.some((a) => a.id === sa.id))
                .map((deleted) => (
                  <div key={deleted.id} className="rounded-lg p-3 bg-red-50 border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700 line-through">{deleted.bank_name}</span>
                      <span className="text-[10px] text-red-600 font-bold">削除</span>
                    </div>
                    <div className="text-xs text-gray-400 line-through">
                      {deleted.bank_branch} / {deleted.bank_account_type} {deleted.bank_account_number}
                    </div>
                  </div>
                ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => setShowBankConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveBankAccounts}
                disabled={savingBank}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {savingBank ? "保存中..." : "保存する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
