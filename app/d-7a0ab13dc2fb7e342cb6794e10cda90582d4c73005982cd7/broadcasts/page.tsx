"use client";

import { useState } from "react";
import { DEMO_BROADCASTS } from "../_data/mock";

const SEGMENTS = [
  { value: "all", label: "全員", count: 2847 },
  { value: "recent", label: "来院1ヶ月以内", count: 342 },
  { value: "no-reservation", label: "未予約患者", count: 85 },
];

export default function DemoBroadcastsPage() {
  const [tab, setTab] = useState<"create" | "history">("history");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [showPreview, setShowPreview] = useState(false);
  const [sent, setSent] = useState(false);

  const selectedSegment = SEGMENTS.find((s) => s.value === segment)!;

  const handleSend = () => {
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setTitle("");
      setBody("");
      setTab("history");
    }, 2000);
  };

  return (
    <div className="p-6 pb-16 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">メッセージ配信</h1>
        <p className="text-sm text-slate-500 mt-1">セグメント配信・配信履歴管理</p>
      </div>

      {/* タブ切替 */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "history" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          配信履歴
        </button>
        <button
          onClick={() => setTab("create")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "create" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          新規配信
        </button>
      </div>

      {tab === "history" ? (
        /* 配信履歴 */
        <div className="space-y-4">
          {DEMO_BROADCASTS.map((bc) => (
            <div key={bc.id} className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">{bc.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{bc.sentAt} / {bc.segment}</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">配信済み</span>
              </div>
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">{bc.body}</p>
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-slate-500">配信数: </span>
                  <span className="font-semibold text-slate-700">{bc.targetCount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-500">開封率: </span>
                  <span className="font-semibold text-emerald-600">{bc.openRate}%</span>
                </div>
                <div>
                  <span className="text-slate-500">クリック率: </span>
                  <span className="font-semibold text-blue-600">{bc.clickRate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* 新規配信作成 */
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">配信内容</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">タイトル</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="配信タイトルを入力..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">本文</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="メッセージ本文を入力..."
                  rows={6}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">配信対象</label>
                <div className="space-y-2">
                  {SEGMENTS.map((seg) => (
                    <label key={seg.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      segment === seg.value ? "bg-blue-50 border-blue-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}>
                      <input
                        type="radio"
                        name="segment"
                        value={seg.value}
                        checked={segment === seg.value}
                        onChange={(e) => setSegment(e.target.value)}
                        className="accent-blue-500"
                      />
                      <span className="text-sm text-slate-700">{seg.label}</span>
                      <span className="ml-auto text-xs text-slate-500">{seg.count.toLocaleString()}人</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
                >
                  プレビュー
                </button>
                <button
                  onClick={handleSend}
                  disabled={!title.trim() || !body.trim() || sent}
                  className="flex-1 py-2.5 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                >
                  {sent ? "配信しました!" : `${selectedSegment.count.toLocaleString()}人に配信`}
                </button>
              </div>
            </div>
          </div>

          {/* プレビュー */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">プレビュー</h3>
            <div className="bg-[#7494C0] rounded-2xl p-4 min-h-[400px]">
              {/* LINEヘッダー */}
              <div className="bg-[#6B8CB8] rounded-t-xl px-4 py-3 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-white text-sm font-medium">デモクリニック</span>
              </div>
              {body || title ? (
                <div className="flex justify-start mb-2">
                  <div className="bg-white rounded-2xl rounded-tl-md px-4 py-3 max-w-[85%] shadow-sm">
                    {title && <p className="text-sm font-bold text-slate-800 mb-1">{title}</p>}
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{body || "本文を入力してください"}</p>
                    <p className="text-[10px] text-slate-400 mt-1 text-right">12:00</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p className="text-white/60 text-sm">タイトルと本文を入力するとプレビューが表示されます</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
