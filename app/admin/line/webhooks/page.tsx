"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";

/* ---------- 型定義 ---------- */
interface IncomingWebhook {
  id: number;
  name: string;
  source_type: string;
  receive_url: string;
  secret: string | null;
  is_active: boolean;
  created_at: string;
}

interface OutgoingWebhook {
  id: number;
  name: string;
  url: string;
  event_types: string[];
  secret: string | null;
  is_active: boolean;
  created_at: string;
}

const ALL_EVENT_TYPES = [
  { value: "follow", label: "友だち追加" },
  { value: "unfollow", label: "ブロック" },
  { value: "tag_added", label: "タグ追加" },
  { value: "tag_removed", label: "タグ削除" },
  { value: "reservation_made", label: "予約完了" },
  { value: "checkout_completed", label: "決済完了" },
  { value: "reorder_approved", label: "再処方承認" },
  { value: "form_submitted", label: "フォーム送信" },
  { value: "cv_tracked", label: "CV計測" },
  { value: "*", label: "すべて" },
];

/* ---------- ヘルパー ---------- */
function getEventLabel(type: string): string {
  return ALL_EVENT_TYPES.find((t) => t.value === type)?.label ?? type;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

/* ---------- メインページ ---------- */
const INCOMING_KEY = "/api/admin/webhooks/incoming";
const OUTGOING_KEY = "/api/admin/webhooks/outgoing";

export default function WebhooksPage() {
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");

  const { data: inData, isLoading: inLoading } = useSWR<{ webhooks: IncomingWebhook[] }>(INCOMING_KEY);
  const incoming = inData?.webhooks ?? [];

  const { data: outData, isLoading: outLoading } = useSWR<{ webhooks: OutgoingWebhook[] }>(OUTGOING_KEY);
  const outgoing = outData?.webhooks ?? [];

  /* --- インカミング --- */
  const [showInModal, setShowInModal] = useState(false);
  const [inForm, setInForm] = useState({ name: "", source_type: "", secret: "" });
  const [inSaving, setInSaving] = useState(false);

  const handleCreateIncoming = () => {
    setInForm({ name: "", source_type: "", secret: "" });
    setShowInModal(true);
  };

  const handleSaveIncoming = async () => {
    if (!inForm.name.trim()) return;
    setInSaving(true);
    try {
      const res = await fetch(INCOMING_KEY, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inForm.name,
          source_type: inForm.source_type,
          secret: inForm.secret || null,
        }),
      });
      if (res.ok) {
        setShowInModal(false);
        mutate(INCOMING_KEY);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
      }
    } finally {
      setInSaving(false);
    }
  };

  const handleDeleteIncoming = async (id: number) => {
    if (!confirm("このインカミングWebhookを削除しますか？")) return;
    await fetch(`${INCOMING_KEY}?id=${id}`, { method: "DELETE", credentials: "include" });
    mutate(INCOMING_KEY);
  };

  /* --- アウトゴーイング --- */
  const [showOutModal, setShowOutModal] = useState(false);
  const [outEdit, setOutEdit] = useState<Partial<OutgoingWebhook> & { secret_input?: string } | null>(null);
  const [outSaving, setOutSaving] = useState(false);

  const handleCreateOutgoing = () => {
    setOutEdit({ name: "", url: "", event_types: [], is_active: true, secret_input: "" });
    setShowOutModal(true);
  };

  const handleEditOutgoing = (wh: OutgoingWebhook) => {
    setOutEdit({ ...wh, secret_input: "" });
    setShowOutModal(true);
  };

  const handleSaveOutgoing = async () => {
    if (!outEdit?.name?.trim() || !outEdit?.url?.trim()) return;
    setOutSaving(true);
    try {
      const method = outEdit.id ? "PUT" : "POST";
      const payload: Record<string, unknown> = {
        ...outEdit,
        secret: outEdit.secret_input || outEdit.secret || null,
      };
      delete payload.secret_input;
      const res = await fetch(OUTGOING_KEY, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowOutModal(false);
        setOutEdit(null);
        mutate(OUTGOING_KEY);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error || "保存に失敗しました");
      }
    } finally {
      setOutSaving(false);
    }
  };

  const handleToggleOutgoing = async (wh: OutgoingWebhook) => {
    await fetch(OUTGOING_KEY, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...wh, is_active: !wh.is_active }),
    });
    mutate(OUTGOING_KEY);
  };

  const handleDeleteOutgoing = async (id: number) => {
    if (!confirm("このアウトゴーイングWebhookを削除しますか？")) return;
    await fetch(`${OUTGOING_KEY}?id=${id}`, { method: "DELETE", credentials: "include" });
    mutate(OUTGOING_KEY);
  };

  const toggleEventType = (type: string) => {
    if (!outEdit) return;
    const current = outEdit.event_types ?? [];
    if (type === "*") {
      setOutEdit({ ...outEdit, event_types: current.includes("*") ? [] : ["*"] });
      return;
    }
    const filtered = current.filter((t) => t !== "*");
    const next = filtered.includes(type) ? filtered.filter((t) => t !== type) : [...filtered, type];
    setOutEdit({ ...outEdit, event_types: next });
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                Webhook設定
              </h1>
              <p className="text-sm text-gray-400 mt-1">外部サービスとの連携。インカミング（受信）とアウトゴーイング（送信）を管理します。</p>
            </div>
          </div>

          {/* タブ */}
          <div className="flex gap-1 mt-6 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("incoming")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === "incoming"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              インカミング（受信）
              {incoming.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-indigo-100 text-indigo-700 rounded-full font-bold">
                  {incoming.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("outgoing")}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === "outgoing"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              アウトゴーイング（送信）
              {outgoing.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-violet-100 text-violet-700 rounded-full font-bold">
                  {outgoing.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
        {/* ---------- インカミング ---------- */}
        {activeTab === "incoming" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">インカミングWebhook</h2>
              <button
                onClick={handleCreateIncoming}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                追加
              </button>
            </div>

            {inLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">読み込み中...</span>
                </div>
              </div>
            ) : incoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">インカミングWebhookはまだありません</p>
                <p className="text-gray-300 text-xs mt-1">外部サービスからのデータ受信用エンドポイントを作成しましょう</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {incoming.map((wh) => (
                  <div
                    key={wh.id}
                    className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group ${
                      !wh.is_active ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          wh.is_active
                            ? "bg-gradient-to-br from-indigo-500 to-violet-600"
                            : "bg-gray-200"
                        }`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[15px] font-semibold text-gray-900 truncate">{wh.name}</h3>
                            {wh.source_type && (
                              <span className="shrink-0 px-2 py-0.5 text-[10px] bg-indigo-50 text-indigo-700 rounded-full font-medium">
                                {wh.source_type}
                              </span>
                            )}
                            {!wh.is_active && (
                              <span className="shrink-0 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full font-medium">
                                停止中
                              </span>
                            )}
                          </div>

                          {/* 受信URL */}
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-[11px] text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 truncate flex-1">
                              {wh.receive_url}
                            </code>
                            <button
                              onClick={() => copyToClipboard(wh.receive_url)}
                              className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors"
                              title="URLをコピー"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleDeleteIncoming(wh.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---------- アウトゴーイング ---------- */}
        {activeTab === "outgoing" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700">アウトゴーイングWebhook</h2>
              <button
                onClick={handleCreateOutgoing}
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                追加
              </button>
            </div>

            {outLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
                  <span className="text-sm text-gray-400">読み込み中...</span>
                </div>
              </div>
            ) : outgoing.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-violet-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">アウトゴーイングWebhookはまだありません</p>
                <p className="text-gray-300 text-xs mt-1">外部サービスへのイベント通知を設定しましょう</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {outgoing.map((wh) => (
                  <div
                    key={wh.id}
                    className={`bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md hover:border-gray-200 transition-all duration-200 group ${
                      !wh.is_active ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          wh.is_active
                            ? "bg-gradient-to-br from-violet-500 to-purple-600"
                            : "bg-gray-200"
                        }`}>
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-[15px] font-semibold text-gray-900 truncate">{wh.name}</h3>
                            {!wh.is_active && (
                              <span className="shrink-0 px-2 py-0.5 text-[10px] bg-gray-100 text-gray-500 rounded-full font-medium">
                                停止中
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-gray-500 truncate mb-2">{wh.url}</div>

                          {/* イベントバッジ */}
                          <div className="flex flex-wrap gap-1">
                            {wh.event_types.map((et) => (
                              <span
                                key={et}
                                className="px-2 py-0.5 text-[10px] font-medium bg-violet-50 text-violet-700 rounded-full"
                              >
                                {getEventLabel(et)}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditOutgoing(wh)}
                          className="px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDeleteOutgoing(wh.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleOutgoing(wh)}
                          className={`w-10 h-5 rounded-full relative transition-colors ${
                            wh.is_active ? "bg-[#06C755]" : "bg-gray-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              wh.is_active ? "translate-x-5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* インカミング作成モーダル */}
      {showInModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowInModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  インカミングWebhook追加
                </h2>
                <button onClick={() => setShowInModal(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook名</label>
                <input
                  type="text"
                  value={inForm.name}
                  onChange={(e) => setInForm({ ...inForm, name: e.target.value })}
                  placeholder="例: Shopify注文受信"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">ソースタイプ</label>
                <input
                  type="text"
                  value={inForm.source_type}
                  onChange={(e) => setInForm({ ...inForm, source_type: e.target.value })}
                  placeholder="例: shopify, stripe, custom"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-gray-50/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">シークレット <span className="text-gray-400 font-normal">任意</span></label>
                <input
                  type="text"
                  value={inForm.secret}
                  onChange={(e) => setInForm({ ...inForm, secret: e.target.value })}
                  placeholder="署名検証用シークレット"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-gray-50/50 transition-all font-mono"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowInModal(false)} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSaveIncoming}
                disabled={inSaving || !inForm.name.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-medium hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inSaving ? "保存中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* アウトゴーイング作成/編集モーダル */}
      {showOutModal && outEdit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowOutModal(false); setOutEdit(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  {outEdit.id ? "Webhook編集" : "アウトゴーイングWebhook追加"}
                </h2>
                <button onClick={() => { setShowOutModal(false); setOutEdit(null); }} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Webhook名</label>
                <input
                  type="text"
                  value={outEdit.name || ""}
                  onChange={(e) => setOutEdit({ ...outEdit, name: e.target.value })}
                  placeholder="例: Slack通知"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-gray-50/50 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">送信先URL</label>
                <input
                  type="url"
                  value={outEdit.url || ""}
                  onChange={(e) => setOutEdit({ ...outEdit, url: e.target.value })}
                  placeholder="https://example.com/webhook"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-gray-50/50 transition-all font-mono"
                />
              </div>

              {/* イベントタイプ選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">対象イベント</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_EVENT_TYPES.map((et) => {
                    const isAll = (outEdit.event_types ?? []).includes("*");
                    const checked = et.value === "*" ? isAll : isAll || (outEdit.event_types ?? []).includes(et.value);
                    return (
                      <label
                        key={et.value}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                          checked
                            ? "bg-violet-50 border-violet-200 text-violet-700"
                            : "bg-gray-50/50 border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEventType(et.value)}
                          className="rounded border-gray-300 text-violet-600 focus:ring-violet-500/30"
                        />
                        {et.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">シークレット <span className="text-gray-400 font-normal">任意</span></label>
                <input
                  type="text"
                  value={outEdit.secret_input ?? ""}
                  onChange={(e) => setOutEdit({ ...outEdit, secret_input: e.target.value })}
                  placeholder={outEdit.id ? "変更する場合のみ入力" : "署名用シークレット"}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-gray-50/50 transition-all font-mono"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => { setShowOutModal(false); setOutEdit(null); }} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                キャンセル
              </button>
              <button
                onClick={handleSaveOutgoing}
                disabled={outSaving || !outEdit.name?.trim() || !outEdit.url?.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {outSaving ? "保存中..." : outEdit.id ? "更新" : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
