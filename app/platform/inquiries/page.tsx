"use client";

// app/platform/inquiries/page.tsx — お問い合わせ一覧管理

import { useState } from "react";
import useSWR, { mutate } from "swr";

type Inquiry = {
  id: string;
  company_name: string | null;
  contact_name: string;
  service_name: string | null;
  implementation_timing: string | null;
  has_existing_line: boolean;
  existing_line_detail: string | null;
  message: string | null;
  email: string;
  phone: string | null;
  status: string;
  note: string | null;
  created_at: string;
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  unread: { label: "未読", color: "bg-red-100 text-red-800" },
  read: { label: "確認済み", color: "bg-amber-100 text-amber-800" },
  replied: { label: "返信済み", color: "bg-green-100 text-green-800" },
};

export default function InquiriesPage() {
  const [filter, setFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<{ id: string; note: string } | null>(null);

  const apiKey = `/api/platform/inquiries?status=${filter}`;
  const { data, isLoading } = useSWR<{ ok: boolean; inquiries: Inquiry[] }>(apiKey);
  const inquiries = data?.inquiries || [];

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/platform/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, status }),
      });
      if ((await res.json()).ok) {
        await mutate(apiKey);
      }
    } finally {
      setUpdating(null);
    }
  };

  const saveNote = async (id: string, note: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/platform/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id, note }),
      });
      if ((await res.json()).ok) {
        setEditingNote(null);
        await mutate(apiKey);
      }
    } finally {
      setUpdating(null);
    }
  };

  const unreadCount = inquiries.filter((i) => i.status === "unread").length;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">お問い合わせ管理</h1>
          <p className="mt-1 text-sm text-slate-500">
            LPからのお問い合わせを確認し、対応状況を管理します
          </p>
        </div>

        {/* フィルター */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            {[
              { key: "all", label: "すべて" },
              { key: "unread", label: `未読${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
              { key: "read", label: "確認済み" },
              { key: "replied", label: "返信済み" },
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
          <p className="text-sm text-slate-400">{inquiries.length}件</p>
        </div>

        {/* テーブル */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : inquiries.length === 0 ? (
          <div className="text-center py-20 text-slate-400">お問い合わせはありません</div>
        ) : (
          <div className="space-y-3">
            {inquiries.map((inq) => {
              const st = STATUS_MAP[inq.status] || STATUS_MAP.unread;
              const isExpanded = expanded === inq.id;
              return (
                <div key={inq.id} className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                  {/* サマリー行 */}
                  <button
                    onClick={() => {
                      setExpanded(isExpanded ? null : inq.id);
                      // 未読→確認済みに自動更新
                      if (!isExpanded && inq.status === "unread") {
                        updateStatus(inq.id, "read");
                      }
                    }}
                    className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{inq.contact_name}</span>
                        {inq.company_name && (
                          <span className="text-xs text-slate-400 truncate">({inq.company_name})</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {inq.email}{inq.phone ? ` / ${inq.phone}` : ""}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${st.color}`}>
                      {st.label}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {new Date(inq.created_at).toLocaleDateString("ja-JP")}
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* 詳細 */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 px-5 py-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {inq.service_name && (
                          <div><span className="text-slate-400">サービス名:</span> <span className="text-slate-700">{inq.service_name}</span></div>
                        )}
                        {inq.implementation_timing && (
                          <div><span className="text-slate-400">導入希望時期:</span> <span className="text-slate-700">{inq.implementation_timing}</span></div>
                        )}
                        <div>
                          <span className="text-slate-400">既存LINEシステム:</span>{" "}
                          <span className="text-slate-700">{inq.has_existing_line ? "あり" : "なし"}</span>
                        </div>
                        {inq.existing_line_detail && (
                          <div><span className="text-slate-400">LINEシステム詳細:</span> <span className="text-slate-700">{inq.existing_line_detail}</span></div>
                        )}
                      </div>

                      {inq.message && (
                        <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                          {inq.message}
                        </div>
                      )}

                      {/* 管理者メモ */}
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">管理者メモ</label>
                        {editingNote?.id === inq.id ? (
                          <div className="flex gap-2">
                            <textarea
                              value={editingNote.note}
                              onChange={(e) => setEditingNote({ ...editingNote, note: e.target.value })}
                              rows={2}
                              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm resize-y focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                            />
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => saveNote(inq.id, editingNote.note)}
                                disabled={updating === inq.id}
                                className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingNote(null)}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingNote({ id: inq.id, note: inq.note || "" })}
                            className="text-sm text-slate-500 hover:text-blue-600 transition-colors"
                          >
                            {inq.note || "メモを追加..."}
                          </button>
                        )}
                      </div>

                      {/* ステータス操作 */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                        {inq.status !== "read" && (
                          <button
                            onClick={() => updateStatus(inq.id, "read")}
                            disabled={updating === inq.id}
                            className="px-3 py-1.5 text-xs font-medium bg-amber-100 text-amber-800 rounded hover:bg-amber-200 disabled:opacity-50"
                          >
                            確認済みにする
                          </button>
                        )}
                        {inq.status !== "replied" && (
                          <button
                            onClick={() => updateStatus(inq.id, "replied")}
                            disabled={updating === inq.id}
                            className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            返信済みにする
                          </button>
                        )}
                        {inq.status !== "unread" && (
                          <button
                            onClick={() => updateStatus(inq.id, "unread")}
                            disabled={updating === inq.id}
                            className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                          >
                            未読に戻す
                          </button>
                        )}
                        <a
                          href={`mailto:${inq.email}`}
                          className="ml-auto px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          メールで返信
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
