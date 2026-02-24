"use client";

// Step 2: 決済設定
import { useState } from "react";
import { StepNavigation } from "./Step1Line";

type Provider = "square" | "gmo";

interface Props {
  completed: boolean;
  onNext: () => void;
  onBack: () => void;
}

export default function Step2Payment({ completed, onNext, onBack }: Props) {
  const [provider, setProvider] = useState<Provider>("square");
  // Square
  const [squareAccessToken, setSquareAccessToken] = useState("");
  const [squareLocationId, setSquareLocationId] = useState("");
  // GMO
  const [gmoShopId, setGmoShopId] = useState("");
  const [gmoShopPass, setGmoShopPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const validate = (): string | null => {
    if (provider === "square") {
      if (!squareAccessToken.trim()) return "Square Access Token は必須です";
    } else {
      if (!gmoShopId.trim()) return "GMO ショップID は必須です";
      if (!gmoShopPass.trim()) return "GMO ショップパスワード は必須です";
    }
    return null;
  };

  const handleSave = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    try {
      // プロバイダーを保存
      const settings: { category: string; key: string; value: string }[] = [
        { category: "payment", key: "provider", value: provider },
      ];

      if (provider === "square") {
        settings.push({ category: "square", key: "access_token", value: squareAccessToken.trim() });
        if (squareLocationId.trim()) {
          settings.push({ category: "square", key: "location_id", value: squareLocationId.trim() });
        }
      } else {
        settings.push({ category: "gmo", key: "shop_id", value: gmoShopId.trim() });
        settings.push({ category: "gmo", key: "shop_pass", value: gmoShopPass.trim() });
      }

      for (const setting of settings) {
        const res = await fetch("/api/admin/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(setting),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || "設定の保存に失敗しました");
        }
      }

      setSaved(true);
      setTimeout(() => onNext(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  // 完了済みの場合
  if (completed && !saved) {
    return (
      <div className="p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 mb-2">決済設定</h2>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-green-800">決済サービスは設定済みです</p>
          </div>
          <p className="text-xs text-green-600 mt-1 ml-7">設定を変更する場合は、後から設定ページで編集できます</p>
        </div>
        <StepNavigation onBack={onBack} onNext={onNext} nextLabel="次へ（スキップ）" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <h2 className="text-lg font-bold text-slate-900 mb-1">決済設定</h2>
      <p className="text-sm text-slate-500 mb-6">
        決済サービスを選択してAPIキーを入力してください
      </p>

      {/* エラー */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 保存成功 */}
      {saved && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          設定を保存しました
        </div>
      )}

      {/* プロバイダー選択 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-3">決済プロバイダー</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setProvider("square")}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              provider === "square"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">Square</span>
            <p className="text-xs text-slate-500 mt-1">クレジットカード決済</p>
          </button>
          <button
            type="button"
            onClick={() => setProvider("gmo")}
            className={`p-4 rounded-lg border-2 text-left transition-all ${
              provider === "gmo"
                ? "border-blue-500 bg-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="text-sm font-bold text-slate-900">GMO</span>
            <p className="text-xs text-slate-500 mt-1">GMOペイメント</p>
          </button>
        </div>
      </div>

      {/* Square入力 */}
      {provider === "square" && (
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Access Token <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={squareAccessToken}
              onChange={(e) => setSquareAccessToken(e.target.value)}
              placeholder="Square Access Token"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Square Developer Dashboard &gt; Applications &gt; Production Access Token
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Location ID
            </label>
            <input
              type="text"
              value={squareLocationId}
              onChange={(e) => setSquareLocationId(e.target.value)}
              placeholder="Location ID（任意）"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* GMO入力 */}
      {provider === "gmo" && (
        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ショップID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={gmoShopId}
              onChange={(e) => setGmoShopId(e.target.value)}
              placeholder="GMO ショップID"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ショップパスワード <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={gmoShopPass}
              onChange={(e) => setGmoShopPass(e.target.value)}
              placeholder="GMO ショップパスワード"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      <StepNavigation
        onBack={onBack}
        onNext={handleSave}
        nextLabel={saving ? "保存中..." : "保存して次へ"}
        nextDisabled={saving}
        showSkip
        onSkip={onNext}
      />
    </div>
  );
}
