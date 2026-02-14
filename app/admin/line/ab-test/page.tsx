"use client";

import { useState, useEffect } from "react";

interface TagDef { id: number; name: string; color: string }
interface MarkDef { value: string; label: string; color: string }
interface PreviewResult {
  total: number;
  sendable: number;
  no_uid: number;
}

export default function ABTestPage() {
  const [tags, setTags] = useState<TagDef[]>([]);
  const [marks, setMarks] = useState<MarkDef[]>([]);

  // フィルタ（簡易版: タグとマークのみ）
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [selectedMarks, setSelectedMarks] = useState<string[]>([]);

  // テスト設定
  const [testName, setTestName] = useState("");
  const [messageA, setMessageA] = useState("");
  const [messageB, setMessageB] = useState("");
  const [splitRatio, setSplitRatio] = useState(50);

  // 状態
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/tags", { credentials: "include" }).then(r => r.json()),
      fetch("/api/admin/line/marks", { credentials: "include" }).then(r => r.json()),
    ]).then(([t, m]) => {
      if (t.tags) setTags(t.tags);
      if (m.marks) setMarks(m.marks);
    });
  }, []);

  const buildFilterRules = () => {
    const conditions = [];
    if (selectedTagIds.length > 0) {
      conditions.push({ type: "tag", tag_ids: selectedTagIds, tag_match: "any_include" });
    }
    if (selectedMarks.length > 0) {
      conditions.push({ type: "mark", values: selectedMarks, mark_match: "any_match" });
    }
    return conditions.length > 0
      ? { include: { operator: "AND", conditions } }
      : {};
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    const res = await fetch("/api/admin/line/broadcast/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ filter_rules: buildFilterRules() }),
    });
    const data = await res.json();
    setPreview(data);
    setLoadingPreview(false);
  };

  const handleSend = async () => {
    if (!messageA.trim() || !messageB.trim()) return;
    if (!confirm(`A/Bテストを実行します。よろしいですか？`)) return;
    setSending(true);
    setResult(null);
    const res = await fetch("/api/admin/line/broadcast/ab-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: testName || undefined,
        filter_rules: buildFilterRules(),
        message_a: messageA,
        message_b: messageB,
        split_ratio: splitRatio,
      }),
    });
    const data = await res.json();
    setResult(data);
    setSending(false);
  };

  return (
    <div className="min-h-full bg-gray-50/50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            A/Bテスト配信
          </h1>
          <p className="text-sm text-gray-400 mt-1">2パターンのメッセージを配信して効果を比較</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* テスト名 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">テスト名（任意）</label>
          <input
            type="text"
            value={testName}
            onChange={e => setTestName(e.target.value)}
            placeholder="例: 2月キャンペーン A/B"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 bg-gray-50/50"
          />
        </div>

        {/* 配信先 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">配信先</label>

          {/* タグ選択 */}
          {tags.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-gray-500 mb-1.5 block">タグ（いずれかを持つ）</span>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <label key={t.id} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(t.id)}
                      onChange={e => setSelectedTagIds(prev =>
                        e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                      )}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-purple-500"
                    />
                    <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: t.color + "22", color: t.color }}>
                      {t.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* マーク選択 */}
          {marks.length > 0 && (
            <div className="mb-3">
              <span className="text-xs text-gray-500 mb-1.5 block">マーク（いずれか一致）</span>
              <div className="flex flex-wrap gap-2">
                {marks.map(m => (
                  <label key={m.value} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMarks.includes(m.value)}
                      onChange={e => setSelectedMarks(prev =>
                        e.target.checked ? [...prev, m.value] : prev.filter(v => v !== m.value)
                      )}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-purple-500"
                    />
                    <span className="text-xs font-medium" style={{ color: m.color }}>{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* プレビュー */}
          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            className="mt-2 px-4 py-2 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
          >
            {loadingPreview ? "確認中..." : "対象者数を確認"}
          </button>
          {preview && (
            <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
              <span className="text-sm font-bold text-purple-700">{preview.sendable}人</span>
              <span className="text-xs text-purple-600 ml-1">に配信可能</span>
              {preview.no_uid > 0 && <span className="text-xs text-gray-400 ml-2">（UID無し{preview.no_uid}人）</span>}
            </div>
          )}
        </div>

        {/* メッセージ A/B */}
        <div className="grid grid-cols-2 gap-4">
          {/* パターンA */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">A</div>
              <span className="text-sm font-semibold text-gray-700">パターンA</span>
              <span className="text-xs text-gray-400 ml-auto">{splitRatio}%に配信</span>
            </div>
            <textarea
              value={messageA}
              onChange={e => setMessageA(e.target.value)}
              placeholder="メッセージA"
              rows={6}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
            <div className="text-right text-[10px] text-gray-400 mt-1">{messageA.length}文字</div>
          </div>
          {/* パターンB */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center text-xs font-bold text-rose-600">B</div>
              <span className="text-sm font-semibold text-gray-700">パターンB</span>
              <span className="text-xs text-gray-400 ml-auto">{100 - splitRatio}%に配信</span>
            </div>
            <textarea
              value={messageB}
              onChange={e => setMessageB(e.target.value)}
              placeholder="メッセージB"
              rows={6}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
            />
            <div className="text-right text-[10px] text-gray-400 mt-1">{messageB.length}文字</div>
          </div>
        </div>

        {/* 分割比率 */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <label className="text-sm font-semibold text-gray-700 mb-3 block">分割比率</label>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium text-blue-600 w-12">A: {splitRatio}%</span>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={splitRatio}
              onChange={e => setSplitRatio(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-xs font-medium text-rose-600 w-12 text-right">B: {100 - splitRatio}%</span>
          </div>
          <div className="flex mt-2 h-3 rounded-full overflow-hidden">
            <div className="bg-blue-400" style={{ width: `${splitRatio}%` }} />
            <div className="bg-rose-400" style={{ width: `${100 - splitRatio}%` }} />
          </div>
        </div>

        {/* 送信ボタン */}
        <button
          onClick={handleSend}
          disabled={sending || !messageA.trim() || !messageB.trim()}
          className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              送信中...
            </>
          ) : "A/Bテスト配信を実行"}
        </button>

        {/* 結果 */}
        {result && (
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">テスト結果</h3>
            {result.ok ? (
              <div className="space-y-3">
                <div className="text-xs text-gray-500 mb-2">
                  合計: {result.total}人に配信 {result.no_uid > 0 && `（UID無し${result.no_uid}人）`}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700">A</div>
                      <span className="text-xs font-bold text-blue-800">パターンA</span>
                    </div>
                    <div className="text-lg font-bold text-blue-700">{result.variant_a.sent}人</div>
                    <div className="text-[10px] text-blue-500">送信成功</div>
                    {result.variant_a.failed > 0 && (
                      <div className="text-[10px] text-red-400 mt-1">失敗: {result.variant_a.failed}人</div>
                    )}
                  </div>
                  <div className="bg-rose-50 rounded-lg p-4 border border-rose-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-rose-200 flex items-center justify-center text-[10px] font-bold text-rose-700">B</div>
                      <span className="text-xs font-bold text-rose-800">パターンB</span>
                    </div>
                    <div className="text-lg font-bold text-rose-700">{result.variant_b.sent}人</div>
                    <div className="text-[10px] text-rose-500">送信成功</div>
                    {result.variant_b.failed > 0 && (
                      <div className="text-[10px] text-red-400 mt-1">失敗: {result.variant_b.failed}人</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-red-600">{result.error}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
