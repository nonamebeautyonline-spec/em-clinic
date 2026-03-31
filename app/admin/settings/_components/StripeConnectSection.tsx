"use client";

import { useState } from "react";
import useSWR from "swr";

interface StripeConnectStatus {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  connectedAt?: string;
}

interface Props {
  onToast: (message: string, type: "success" | "error") => void;
}

export default function StripeConnectSection({ onToast }: Props) {
  const { data, isLoading, error } = useSWR<StripeConnectStatus>(
    "/api/admin/stripe-connect/status"
  );
  const [connecting, setConnecting] = useState(false);

  // Stripe Connect OAuth開始
  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch("/api/admin/stripe-connect/auth", {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (json.connectUrl) {
        window.location.href = json.connectUrl;
      } else {
        onToast(json.error || "接続URLの取得に失敗しました", "error");
      }
    } catch {
      onToast("通信エラーが発生しました", "error");
    } finally {
      setConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center gap-3 text-gray-400">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          <span className="text-sm">読み込み中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <p className="text-sm text-red-600">Stripe Connect状態の取得に失敗しました</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Stripe Connect</h2>
        <p className="text-sm text-gray-500 mt-1">
          Stripe Connectを接続して、ECサイトの決済を受け付けます
        </p>
      </div>

      {/* 接続状態カード */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6">
          {data?.connected ? (
            /* 接続済み */
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700">接続済み</p>
                  <p className="text-xs text-gray-500 font-mono">{data.accountId}</p>
                </div>
              </div>

              {/* ステータスバッジ */}
              <div className="flex flex-wrap gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                    data.chargesEnabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${data.chargesEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                  決済受付 {data.chargesEnabled ? "有効" : "無効"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                    data.payoutsEnabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${data.payoutsEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
                  入金 {data.payoutsEnabled ? "有効" : "無効"}
                </span>
              </div>

              {/* 接続日時 */}
              {data.connectedAt && (
                <p className="text-xs text-gray-400">
                  接続日時: {new Date(data.connectedAt).toLocaleString("ja-JP")}
                </p>
              )}
            </div>
          ) : (
            /* 未接続 */
            <div className="text-center py-4">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-1">Stripe Connectが未接続です</p>
              <p className="text-xs text-slate-400 mb-5">
                接続するとEC商品の決済処理が可能になります
              </p>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    接続中...
                  </>
                ) : (
                  "Stripe Connectに接続"
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
