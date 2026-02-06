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

const MARK_OPTIONS = [
  { value: "red", label: "要対応" },
  { value: "yellow", label: "対応中" },
  { value: "green", label: "対応済み" },
  { value: "blue", label: "重要" },
  { value: "gray", label: "保留" },
];

export default function SendPage() {
  const [mode, setMode] = useState<"individual" | "broadcast">("individual");
  const [tags, setTags] = useState<Tag[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // 個別送信
  const [patientId, setPatientId] = useState("");
  const [patientName, setPatientName] = useState("");

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

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tags", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/templates", { credentials: "include" }).then(r => r.json()),
    ]).then(([tagsData, templatesData]) => {
      if (tagsData.tags) setTags(tagsData.tags);
      if (templatesData.templates) setTemplates(templatesData.templates);
    });
  }, []);

  // フィルタ条件追加
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

  // プレビュー
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

  // 送信
  const handleSend = async () => {
    setSending(true);
    setResult(null);
    setShowConfirm(false);

    if (mode === "individual") {
      const res = await fetch("/api/admin/line/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patient_id: patientId, message }),
      });
      const data = await res.json();
      setResult(data.ok ? `${patientName || patientId} に送信しました` : `送信失敗: ${data.error}`);
    } else {
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
    }
    setSending(false);
  };

  // テンプレート保存
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

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">メッセージ送信</h1>

      {/* モード切替 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("individual")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "individual" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
        >
          個別送信
        </button>
        <button
          onClick={() => setMode("broadcast")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${mode === "broadcast" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
        >
          一斉配信
        </button>
      </div>

      {/* 個別送信: 患者選択 */}
      {mode === "individual" && (
        <div className="bg-white border rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">患者ID</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="例: P123456789"
              className="flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {patientName && <p className="mt-1 text-sm text-gray-500">{patientName}</p>}
        </div>
      )}

      {/* 一斉配信: フィルタ */}
      {mode === "broadcast" && (
        <div className="space-y-4 mb-4">
          <div className="bg-white border rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">配信名（任意）</label>
            <input
              type="text"
              value={broadcastName}
              onChange={(e) => setBroadcastName(e.target.value)}
              placeholder="例: 2月キャンペーン"
              className="w-full px-3 py-2 border rounded text-sm"
            />
          </div>

          {/* 絞り込み条件 */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">絞り込み条件</h3>
              <button onClick={() => addCondition("include")} className="text-xs text-blue-600 hover:text-blue-800">
                + 条件追加
              </button>
            </div>
            {includeConditions.length === 0 && (
              <p className="text-xs text-gray-400">条件なし（全員が対象）</p>
            )}
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

          {/* 除外条件 */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-red-600">除外条件</h3>
              <button onClick={() => addCondition("exclude")} className="text-xs text-red-600 hover:text-red-800">
                + 除外条件追加
              </button>
            </div>
            {excludeConditions.length === 0 && (
              <p className="text-xs text-gray-400">除外なし</p>
            )}
            {excludeConditions.map((c, i) => (
              <ConditionRow
                key={i}
                condition={c}
                tags={tags}
                onUpdate={(updates) => updateCondition("exclude", i, updates)}
                onRemove={() => removeCondition("exclude", i)}
              />
            ))}
          </div>

          {/* プレビュー */}
          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            {loadingPreview ? "確認中..." : "対象者をプレビュー"}
          </button>

          {preview && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-4 text-sm mb-2">
                <span>対象: <strong>{preview.total}</strong>人</span>
                <span className="text-green-600">送信可能: <strong>{preview.sendable}</strong></span>
                <span className="text-gray-400">UID無し: <strong>{preview.no_uid}</strong></span>
              </div>
              {preview.patients.length > 0 && (
                <div className="max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-1">
                    {preview.patients.slice(0, 20).map(p => (
                      <span key={p.patient_id} className={`text-xs px-2 py-0.5 rounded ${p.has_line ? "bg-green-100" : "bg-gray-100"}`}>
                        {p.patient_name || p.patient_id}
                      </span>
                    ))}
                    {preview.patients.length > 20 && (
                      <span className="text-xs text-gray-400">... 他{preview.patients.length - 20}名</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* メッセージ入力 */}
      <div className="bg-white border rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">メッセージ</label>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            テンプレート
          </button>
        </div>

        {/* テンプレート選択 */}
        {showTemplates && (
          <div className="mb-3 border rounded p-3 bg-gray-50">
            <div className="text-xs font-semibold text-gray-500 mb-2">テンプレートから選択</div>
            {templates.length === 0 ? (
              <p className="text-xs text-gray-400">テンプレートがありません</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-white px-3 py-2 rounded border hover:bg-blue-50">
                    <button
                      onClick={() => { setMessage(t.content); setShowTemplates(false); }}
                      className="text-sm text-left flex-1"
                    >
                      {t.name}
                    </button>
                    <button onClick={() => handleDeleteTemplate(t.id)} className="text-xs text-red-400 hover:text-red-600 ml-2">
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="現在のメッセージをテンプレートとして保存"
                className="flex-1 px-2 py-1 border rounded text-xs"
              />
              <button
                onClick={handleSaveTemplate}
                disabled={!newTemplateName.trim() || !message.trim() || savingTemplate}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50"
              >
                保存
              </button>
            </div>
          </div>
        )}

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="メッセージを入力してください&#10;&#10;テンプレート変数: {name}, {patient_id}"
          className="w-full px-3 py-2 border rounded text-sm h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-xs text-gray-400 mt-1">{message.length}文字</div>
      </div>

      {/* 送信ボタン */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={sending || !message.trim() || (mode === "individual" && !patientId.trim())}
        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
      >
        {mode === "individual" ? "送信する" : "一斉配信する"}
      </button>

      {/* 送信結果 */}
      {result && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${result.includes("失敗") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {result}
        </div>
      )}

      {/* 確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="font-bold text-lg mb-4">送信確認</h3>
            {mode === "individual" ? (
              <p className="text-sm text-gray-600 mb-4">{patientId} にメッセージを送信します。</p>
            ) : (
              <div className="text-sm text-gray-600 mb-4">
                <p className="font-semibold">一斉配信</p>
                {preview && <p>対象: {preview.sendable}人に送信されます</p>}
                {!preview && <p className="text-yellow-600">プレビュー未実行です。対象者数を確認してください。</p>}
              </div>
            )}
            <div className="bg-gray-50 rounded p-3 mb-4 max-h-24 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                {sending ? "送信中..." : "送信する"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
              >
                キャンセル
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
}: {
  condition: FilterCondition;
  tags: Tag[];
  onUpdate: (updates: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <select
        value={condition.type}
        onChange={(e) => onUpdate({ type: e.target.value })}
        className="px-2 py-1.5 border rounded text-sm"
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
            className="px-2 py-1.5 border rounded text-sm flex-1"
          >
            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            value={condition.match || "has"}
            onChange={(e) => onUpdate({ match: e.target.value })}
            className="px-2 py-1.5 border rounded text-sm"
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
          className="px-2 py-1.5 border rounded text-sm flex-1"
        >
          {MARK_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      )}

      {condition.type === "has_line_uid" && (
        <span className="text-sm text-gray-500 flex-1">LINE UIDあり</span>
      )}

      <button onClick={onRemove} className="text-red-400 hover:text-red-600 text-sm">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
