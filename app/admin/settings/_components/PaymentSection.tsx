// 決済設定セクション（プロバイダー選択 + APIキー管理）
"use client";

import { useState, useEffect } from "react";
import type { SettingsMap, CategoryKey } from "../page";
import { SettingRow, SourceBadge } from "../page";

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

export default function PaymentSection({ settings, onSaved }: Props) {
  const paymentSettings = settings?.payment ?? [];
  const providerSetting = paymentSettings.find((s) => s.key === "provider");
  const checkoutModeSetting = paymentSettings.find((s) => s.key === "checkout_mode");
  const currentProvider = providerSetting?.maskedValue || "";
  const currentCheckoutMode = checkoutModeSetting?.maskedValue || "";

  const [selected, setSelected] = useState<string>(
    currentProvider === "未設定" ? "" : currentProvider,
  );
  const [checkoutMode, setCheckoutMode] = useState<string>(
    !currentCheckoutMode || currentCheckoutMode === "未設定" ? "hosted" : currentCheckoutMode,
  );
  const [saving, setSaving] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  useEffect(() => {
    const val = providerSetting?.maskedValue || "";
    setSelected(val === "未設定" ? "" : val);
  }, [providerSetting?.maskedValue]);

  useEffect(() => {
    const val = checkoutModeSetting?.maskedValue || "";
    setCheckoutMode(!val || val === "未設定" ? "hosted" : val);
  }, [checkoutModeSetting?.maskedValue]);

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
        throw new Error(data.error || `保存に失敗しました (${res.status})`);
      }
      onSaved("決済プロバイダーを保存しました", "success");
    } catch (err: any) {
      onSaved(err.message || "保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

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
        throw new Error(data.error || `保存に失敗しました (${res.status})`);
      }
      onSaved("チェックアウトモードを保存しました", "success");
    } catch (err: any) {
      onSaved(err.message || "保存に失敗しました", "error");
    } finally {
      setSavingMode(false);
    }
  };

  const selectedOption = PROVIDER_OPTIONS.find((o) => o.value === selected);
  const providerSettings = selectedOption ? (settings?.[selectedOption.category] ?? []) : [];

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-800">決済設定</h2>
        <p className="text-xs text-gray-500 mt-0.5">決済プロバイダーの選択とAPIキーの管理</p>
      </div>

      {/* プロバイダー選択 */}
      <div className="px-5 py-4 border-b border-gray-100">
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
        <div className="px-5 py-4 border-b border-gray-100">
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
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800 leading-relaxed">
                アプリ内決済を使用するには、Square Developer Dashboard で <strong>Application ID</strong> を取得し、
                下の「Square API設定」セクションに入力してください。
              </p>
            </div>
          )}
        </div>
      )}

      {/* 選択中プロバイダーのAPI Key設定 */}
      {selected && providerSettings.length > 0 && (
        <div className="border-t border-gray-200">
          <div className="px-5 py-3 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {selectedOption?.label} API設定
            </p>
          </div>

          {/* 設定手順ガイド */}
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

      {selected && providerSettings.length === 0 && (
        <div className="px-5 py-6 text-center text-gray-400 text-sm border-t border-gray-200">
          {selectedOption?.label} のAPI設定キーはまだ登録されていません。
          <br />
          上の保存ボタンを押してからページを再読み込みしてください。
        </div>
      )}
    </div>
  );
}
