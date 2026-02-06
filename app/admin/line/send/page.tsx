"use client";

import { useState, useEffect } from "react";

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Template {
  id: number;
  name: string;
  content: string;
  category: string | null;
}

interface PreviewResult {
  total: number;
  sendable: number;
  no_uid: number;
  patients: { patient_id: string; patient_name: string; has_line: boolean }[];
}

interface FilterCondition {
  type: string;
  tag_id?: number;
  match?: string;
  values?: string[];
  field_id?: number;
  operator?: string;
  value?: string;
}

interface Broadcast {
  id: number;
  name: string;
  message_content: string;
  status: string;
  total_targets: number;
  sent_count: number;
  failed_count: number;
  no_uid_count: number;
  created_at: string;
  sent_at: string | null;
}

const MARK_OPTIONS = [
  { value: "red", label: "要対応", color: "#EF4444" },
  { value: "yellow", label: "対応中", color: "#EAB308" },
  { value: "green", label: "対応済み", color: "#22C55E" },
  { value: "blue", label: "重要", color: "#3B82F6" },
  { value: "gray", label: "保留", color: "#6B7280" },
];

const BROADCAST_STATUS: Record<string, { text: string; bg: string; textColor: string; dot: string }> = {
  draft: { text: "下書き", bg: "bg-gray-50", textColor: "text-gray-600", dot: "bg-gray-400" },
  scheduled: { text: "予約済み", bg: "bg-blue-50", textColor: "text-blue-700", dot: "bg-blue-500" },
  sending: { text: "送信中", bg: "bg-amber-50", textColor: "text-amber-700", dot: "bg-amber-500 animate-pulse" },
  sent: { text: "送信完了", bg: "bg-emerald-50", textColor: "text-emerald-700", dot: "bg-emerald-500" },
  failed: { text: "失敗", bg: "bg-red-50", textColor: "text-red-700", dot: "bg-red-500" },
};

export default function BroadcastSendPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // 一斉配信フィルタ
  const [includeConditions, setIncludeConditions] = useState<FilterCondition[]>([]);
  const [excludeConditions, setExcludeConditions] = useState<FilterCondition[]>([]);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // メッセージ
  const [message, setMessage] = useState("");
  const [broadcastName, setBroadcastName] = useState("");

  // 送信状態
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // テンプレート管理
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // 配信履歴
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tags", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/templates", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/broadcast", { credentials: "include" }).then(r => r.json()),
    ]).then(([tagsData, templatesData, broadcastData]) => {
      if (tagsData.tags) setTags(tagsData.tags);
      if (templatesData.templates) setTemplates(templatesData.templates);
      if (broadcastData.broadcasts) setBroadcasts(broadcastData.broadcasts);
      setLoadingHistory(false);
    });
  }, []);

  const addCondition = (target: "include" | "exclude") => {
    const newCond: FilterCondition = { type: "tag", tag_id: tags[0]?.id, match: "has" };
    if (target === "include") setIncludeConditions(prev => [...prev, newCond]);
    else setExcludeConditions(prev => [...prev, newCond]);
  };

  const updateCondition = (target: "include" | "exclude", index: number, updates: Partial<FilterCondition>) => {
    const setter = target === "include" ? setIncludeConditions : setExcludeConditions;
    setter(prev => prev.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const removeCondition = (target: "include" | "exclude", index: number) => {
    const setter = target === "include" ? setIncludeConditions : setExcludeConditions;
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    const res = await fetch("/api/admin/line/broadcast/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        filter_rules: {
          include: { operator: "AND", conditions: includeConditions },
          exclude: { conditions: excludeConditions },
        },
      }),
    });
    const data = await res.json();
    setPreview(data);
    setLoadingPreview(false);
  };

  const handleSend = async () => {
    setSending(true);
    setResult(null);
    setShowConfirm(false);

    const res = await fetch("/api/admin/line/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: broadcastName || undefined,
        filter_rules: {
          include: { operator: "AND", conditions: includeConditions },
          exclude: { conditions: excludeConditions },
        },
        message,
      }),
    });
    const data = await res.json();
    setResult(data.ok
      ? `配信完了: 送信${data.sent}件 / 失敗${data.failed}件 / UID無${data.no_uid}件`
      : `配信失敗: ${data.error}`);

    // 配信履歴を再取得
    if (data.ok) {
      const histRes = await fetch("/api/admin/line/broadcast", { credentials: "include" });
      const histData = await histRes.json();
      if (histData.broadcasts) setBroadcasts(histData.broadcasts);
    }
    setSending(false);
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim() || !message.trim() || savingTemplate) return;
    setSavingTemplate(true);
    const res = await fetch("/api/admin/line/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ name: newTemplateName.trim(), content: message }),
    });
    if (res.ok) {
      const data = await res.json();
      setTemplates(prev => [data.template, ...prev]);
      setNewTemplateName("");
    }
    setSavingTemplate(false);
  };

  const handleDeleteTemplate = async (id: number) => {
    await fetch(`/api/admin/line/templates/${id}`, { method: "DELETE", credentials: "include" });
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            一斉送信
          </h1>
          <p className="text-sm text-gray-400 mt-1">タグ・マークで絞り込んでLINEメッセージを一斉配信</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* 配信名 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            配信名（任意）
          </label>
          <input
            type="text"
            value={broadcastName}
            onChange={(e) => setBroadcastName(e.target.value)}
            placeholder="例: 2月キャンペーン"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50 transition-all"
          />
        </div>

        {/* 絞り込み条件 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              絞り込み条件
            </label>
            <button
              onClick={() => addCondition("include")}
              className="px-3 py-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              条件追加
            </button>
          </div>
          {includeConditions.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              条件なし（全員が対象）
            </div>
          ) : (
            <div className="space-y-2">
              {includeConditions.map((c, i) => (
                <ConditionRow
                  key={i}
                  condition={c}
                  tags={tags}
                  onUpdate={(updates) => updateCondition("include", i, updates)}
                  onRemove={() => removeCondition("include", i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 除外条件 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              除外条件
            </label>
            <button
              onClick={() => addCondition("exclude")}
              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              除外条件追加
            </button>
          </div>
          {excludeConditions.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              除外なし
            </div>
          ) : (
            <div className="space-y-2">
              {excludeConditions.map((c, i) => (
                <ConditionRow
                  key={i}
                  condition={c}
                  tags={tags}
                  onUpdate={(updates) => updateCondition("exclude", i, updates)}
                  onRemove={() => removeCondition("exclude", i)}
                  isExclude
                />
              ))}
            </div>
          )}
        </div>

        {/* プレビュー */}
        <button
          onClick={handlePreview}
          disabled={loadingPreview}
          className="w-full py-3 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 rounded-xl text-sm font-medium text-gray-700 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          {loadingPreview ? (
            <>
              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              確認中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              対象者をプレビュー
            </>
          )}
        </button>

        {preview && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100/50">
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-800">{preview.total}</div>
                <div className="text-[10px] text-gray-500">対象</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-600">{preview.sendable}</div>
                <div className="text-[10px] text-emerald-500">送信可能</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-400">{preview.no_uid}</div>
                <div className="text-[10px] text-gray-400">UID無し</div>
              </div>
            </div>
            {preview.patients.length > 0 && (
              <div className="max-h-28 overflow-y-auto mt-3 pt-3 border-t border-blue-100">
                <div className="flex flex-wrap gap-1.5">
                  {preview.patients.slice(0, 20).map(p => (
                    <span
                      key={p.patient_id}
                      className={`text-[11px] px-2 py-1 rounded-lg font-medium ${
                        p.has_line
                          ? "bg-white/80 text-emerald-700 border border-emerald-200/50"
                          : "bg-white/50 text-gray-500 border border-gray-200/50"
                      }`}
                    >
                      {p.patient_name || p.patient_id}
                    </span>
                  ))}
                  {preview.patients.length > 20 && (
                    <span className="text-[11px] text-gray-400 px-2 py-1">... 他{preview.patients.length - 20}名</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* メッセージ入力 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              メッセージ
            </label>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                showTemplates
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              テンプレート
            </button>
          </div>

          {/* テンプレート選択 */}
          {showTemplates && (
            <div className="mb-4 border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500">テンプレートから選択</span>
              </div>
              {templates.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400">テンプレートがありません</div>
              ) : (
                <div className="max-h-36 overflow-y-auto divide-y divide-gray-50">
                  {templates.map(t => (
                    <div key={t.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50/50 transition-colors">
                      <button
                        onClick={() => { setMessage(t.content); setShowTemplates(false); }}
                        className="text-sm text-left flex-1 text-gray-700 hover:text-blue-600 transition-colors"
                      >
                        {t.name}
                      </button>
                      <button onClick={() => handleDeleteTemplate(t.id)} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors ml-2">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="現在のメッセージをテンプレートとして保存"
                  className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white transition-all"
                />
                <button
                  onClick={handleSaveTemplate}
                  disabled={!newTemplateName.trim() || !message.trim() || savingTemplate}
                  className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-blue-600 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={"メッセージを入力してください\n\nテンプレート変数: {name}, {patient_id}"}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm h-36 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 bg-gray-50/50 resize-none transition-all leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex gap-2">
              <span className="text-[10px] text-gray-300 bg-gray-50 px-2 py-0.5 rounded">{"{name}"}</span>
              <span className="text-[10px] text-gray-300 bg-gray-50 px-2 py-0.5 rounded">{"{patient_id}"}</span>
            </div>
            <span className="text-xs text-gray-400">{message.length}文字</span>
          </div>
        </div>

        {/* 送信ボタン */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={sending || !message.trim()}
          className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-40 font-medium shadow-lg shadow-green-500/25 transition-all text-sm flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          一斉配信する
        </button>

        {/* 送信結果 */}
        {result && (
          <div className={`p-4 rounded-xl text-sm flex items-center gap-2 ${
            result.includes("失敗")
              ? "bg-red-50 text-red-700 border border-red-100"
              : "bg-emerald-50 text-emerald-700 border border-emerald-100"
          }`}>
            {result.includes("失敗") ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {result}
          </div>
        )}

        {/* ── 配信履歴 ── */}
        <div className="pt-6 border-t border-gray-200 mt-8">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            配信履歴
          </h2>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
            </div>
          ) : broadcasts.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">配信履歴がまだありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcasts.map(b => {
                const st = BROADCAST_STATUS[b.status] || { text: b.status, bg: "bg-gray-50", textColor: "text-gray-600", dot: "bg-gray-400" };
                const rate = b.total_targets > 0 ? Math.round((b.sent_count / b.total_targets) * 100) : 0;
                return (
                  <div key={b.id} className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{b.name || "無題の配信"}</h3>
                        <span className="text-xs text-gray-400">{formatDate(b.created_at)}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-medium ${st.bg} ${st.textColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                        {st.text}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1 mb-2">{b.message_content}</p>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-gray-500">送信 {b.sent_count}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        <span className="text-gray-500">失敗 {b.failed_count}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        <span className="text-gray-500">UID無 {b.no_uid_count}</span>
                      </span>
                      <span className="ml-auto text-gray-400">
                        対象 {b.total_targets}人 ({rate}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">送信確認</h3>
                  <p className="text-xs text-gray-400">一斉配信</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="mb-4">
                {preview ? (
                  <div className="bg-blue-50 rounded-lg px-3 py-2 flex items-center gap-3">
                    <span className="text-sm font-bold text-blue-700">{preview.sendable}人</span>
                    <span className="text-xs text-blue-500">に送信されます</span>
                  </div>
                ) : (
                  <div className="bg-amber-50 rounded-lg px-3 py-2">
                    <span className="text-xs text-amber-600">プレビュー未実行です。対象者数を確認してください。</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-4 max-h-32 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{message}</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-40 text-sm font-medium shadow-lg shadow-green-500/25 transition-all"
              >
                {sending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    送信中...
                  </span>
                ) : "送信する"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// フィルタ条件行コンポーネント
function ConditionRow({
  condition,
  tags,
  onUpdate,
  onRemove,
  isExclude,
}: {
  condition: FilterCondition;
  tags: Tag[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
  isExclude?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 p-3 rounded-xl border transition-colors ${
      isExclude ? "bg-red-50/30 border-red-100" : "bg-emerald-50/30 border-emerald-100"
    }`}>
      <select
        value={condition.type}
        onChange={(e) => onUpdate({ type: e.target.value })}
        className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
      >
        <option value="tag">タグ</option>
        <option value="mark">対応マーク</option>
        <option value="has_line_uid">LINE有無</option>
      </select>

      {condition.type === "tag" && (
        <>
          <select
            value={condition.tag_id || ""}
            onChange={(e) => onUpdate({ tag_id: Number(e.target.value) })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          >
            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            value={condition.match || "has"}
            onChange={(e) => onUpdate({ match: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          >
            <option value="has">を持つ</option>
            <option value="not_has">を持たない</option>
          </select>
        </>
      )}

      {condition.type === "mark" && (
        <select
          value={condition.values?.[0] || ""}
          onChange={(e) => onUpdate({ values: [e.target.value] })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white flex-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
        >
          {MARK_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      )}

      {condition.type === "has_line_uid" && (
        <span className="flex items-center gap-1.5 text-xs text-gray-500 flex-1 px-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          LINE UIDあり
        </span>
      )}

      <button onClick={onRemove} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
