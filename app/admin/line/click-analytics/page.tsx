"use client";

import { useState, useEffect, useCallback } from "react";

interface TrackingLink {
  id: number;
  tracking_code: string;
  original_url: string;
  label: string | null;
  broadcast_id: number | null;
  created_at: string;
  click_count: number;
}

interface ClickEvent {
  id: number;
  clicked_at: string;
  user_agent: string;
  ip_address: string;
}

export default function ClickAnalyticsPage() {
  const [links, setLinks] = useState<TrackingLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // クリック詳細
  const [selectedLink, setSelectedLink] = useState<TrackingLink | null>(null);
  const [events, setEvents] = useState<ClickEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const loadLinks = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/line/click-track/stats", { credentials: "include" });
    const data = await res.json();
    if (data.stats) setLinks(data.stats);
    setLoading(false);
  }, []);

  useEffect(() => { loadLinks(); }, [loadLinks]);

  const handleCreate = async () => {
    if (!newUrl.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/line/click-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ original_url: newUrl.trim(), label: newLabel.trim() || undefined }),
    });
    if (res.ok) {
      const data = await res.json();
      // クリップボードにコピー
      await navigator.clipboard.writeText(data.tracking_url);
      setNewUrl("");
      setNewLabel("");
      setShowCreate(false);
      await loadLinks();
    }
    setCreating(false);
  };

  const handleCopyUrl = async (code: string, id: number) => {
    const baseUrl = window.location.origin;
    await navigator.clipboard.writeText(`${baseUrl}/r/${code}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShowDetail = async (link: TrackingLink) => {
    setSelectedLink(link);
    setLoadingEvents(true);
    const res = await fetch(`/api/admin/line/click-track/stats?link_id=${link.id}`, { credentials: "include" });
    const data = await res.json();
    setEvents(data.events || []);
    setLoadingEvents(false);
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-[#06C755] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">クリック分析</h1>
          <p className="text-sm text-gray-500 mt-1">配信メッセージ内のURLクリック数を計測</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-xs font-medium text-white bg-[#06C755] hover:bg-[#05b04a] rounded-lg transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          計測リンク作成
        </button>
      </div>

      {/* 作成フォーム */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">計測リンク作成</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">リダイレクト先URL</label>
              <input
                type="url"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">ラベル（任意）</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="例: 2月キャンペーンLP"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newUrl.trim()}
              className="px-4 py-2 text-xs font-medium text-white bg-[#06C755] hover:bg-[#05b04a] disabled:bg-gray-300 rounded-lg transition-colors"
            >
              {creating ? "作成中..." : "作成してURLをコピー"}
            </button>
          </div>
        </div>
      )}

      {/* リンク一覧 */}
      {links.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">計測リンクがありません</p>
          <p className="text-xs text-gray-400 mt-1">計測リンクを作成して配信メッセージに埋め込んでください</p>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map(link => (
            <div
              key={link.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                {/* クリック数 */}
                <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 flex flex-col items-center justify-center">
                  <span className="text-xl font-bold text-emerald-700">{link.click_count}</span>
                  <span className="text-[9px] text-emerald-500 font-medium">クリック</span>
                </div>

                <div className="flex-1 min-w-0">
                  {/* ラベル */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">
                      {link.label || "ラベルなし"}
                    </span>
                    <span className="text-[10px] text-gray-400">{formatDate(link.created_at)}</span>
                  </div>

                  {/* URL */}
                  <div className="text-xs text-gray-500 mt-1 truncate">{link.original_url}</div>

                  {/* 操作 */}
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleCopyUrl(link.tracking_code, link.id)}
                      className="px-2.5 py-1 text-[10px] font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1"
                    >
                      {copiedId === link.id ? (
                        <>
                          <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          コピー済み
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          URLコピー
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleShowDetail(link)}
                      className="px-2.5 py-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                    >
                      詳細
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 使い方 */}
      <div className="mt-8 bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h3 className="text-xs font-bold text-blue-700 mb-2">使い方</h3>
        <ol className="text-xs text-blue-600 space-y-1">
          <li>1. 「計測リンク作成」でリダイレクト先URLを登録</li>
          <li>2. 生成された計測URLを一斉送信やステップ配信のメッセージに貼り付け</li>
          <li>3. ユーザーがクリックするとカウントされ、元のURLにリダイレクトされます</li>
        </ol>
      </div>

      {/* クリック詳細モーダル */}
      {selectedLink && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-gray-900">{selectedLink.label || "クリック詳細"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{selectedLink.click_count}クリック</p>
              </div>
              <button onClick={() => setSelectedLink(null)} className="p-1 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {loadingEvents ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-gray-600" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">クリックがありません</p>
              ) : (
                <div className="space-y-2">
                  {events.map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-600 font-mono">{formatDate(ev.clicked_at)}</span>
                      <span className="text-[10px] text-gray-400 truncate flex-1">{ev.user_agent?.slice(0, 60)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
