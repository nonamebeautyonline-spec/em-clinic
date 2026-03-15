"use client";

import type { CarouselPanel, PanelButton } from "./template-types";
import { EMPTY_BUTTON, EMPTY_PANEL, EMPTY_QA_PANEL, QA_COLOR_PRESETS } from "./template-types";

interface CarouselEditorProps {
  panels: CarouselPanel[];
  setPanels: (panels: CarouselPanel[]) => void;
}

export function CarouselEditor({ panels, setPanels }: CarouselEditorProps) {
  const isQaMode = panels.some(p => p.qaMode);

  if (isQaMode) {
    return <QaCarouselEditor panels={panels} setPanels={setPanels} />;
  }
  return <NormalCarouselEditor panels={panels} setPanels={setPanels} />;
}

/* ---------- Q&A カルーセルエディタ ---------- */

function QaCarouselEditor({ panels, setPanels }: CarouselEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Q&Aカード {panels.length}枚（末尾に「すべて見る」が自動付与）</p>
        {panels.length < 10 && (
          <button
            onClick={() => setPanels([...panels, { ...EMPTY_QA_PANEL }])}
            className="text-xs text-[#06C755] hover:text-[#05a648] font-medium flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            カード追加
          </button>
        )}
      </div>

      {panels.map((panel, pi) => (
        <div key={pi} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100" style={{ backgroundColor: panel.headerColor || "#ec4899" }}>
            <span className="text-xs font-bold text-white">カード {pi + 1} — {panel.title || "未設定"}</span>
            <PanelControls panels={panels} setPanels={setPanels} index={pi} isWhite />
          </div>

          <div className="p-4 space-y-3">
            {/* ヘッダー色 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ヘッダー色</label>
              <div className="flex gap-2">
                {QA_COLOR_PRESETS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => { const n = [...panels]; n[pi] = { ...n[pi], headerColor: c.value }; setPanels(n); }}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${panel.headerColor === c.value ? "border-gray-800 scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* タイトル */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">タイトル</label>
              <input
                type="text"
                value={panel.title}
                onChange={(e) => { const n = [...panels]; n[pi] = { ...n[pi], title: e.target.value }; setPanels(n); }}
                placeholder="例: ご利用の流れ"
                maxLength={40}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* サブタイトル */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">サブタイトル</label>
              <input
                type="text"
                value={panel.subtitle || ""}
                onChange={(e) => { const n = [...panels]; n[pi] = { ...n[pi], subtitle: e.target.value }; setPanels(n); }}
                placeholder="例: 初めての方はこちら"
                maxLength={40}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            {/* 箇条書き項目 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">箇条書き項目</label>
                <button
                  onClick={() => { const n = [...panels]; n[pi] = { ...n[pi], items: [...(n[pi].items || []), ""] }; setPanels(n); }}
                  className="text-[10px] text-[#06C755] hover:text-[#05a648] font-medium"
                >
                  + 追加
                </button>
              </div>
              {(panel.items || []).map((item, ii) => (
                <div key={ii} className="flex items-start gap-2 mb-2">
                  <span className="text-xs mt-2.5 flex-shrink-0" style={{ color: panel.headerColor || "#ec4899" }}>●</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => {
                      const n = [...panels];
                      const items = [...(n[pi].items || [])];
                      items[ii] = e.target.value;
                      n[pi] = { ...n[pi], items };
                      setPanels(n);
                    }}
                    placeholder="項目を入力"
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {(panel.items || []).length > 1 && (
                    <button
                      onClick={() => {
                        const n = [...panels];
                        n[pi] = { ...n[pi], items: (n[pi].items || []).filter((_, i) => i !== ii) };
                        setPanels(n);
                      }}
                      className="p-1 text-gray-400 hover:text-red-500 mt-0.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* カテゴリID */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリID（QAページリンク用）</label>
              <input
                type="text"
                value={panel.categoryId || ""}
                onChange={(e) => { const n = [...panels]; n[pi] = { ...n[pi], categoryId: e.target.value }; setPanels(n); }}
                placeholder="例: getting-started, payment, shipping"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>
          </div>
        </div>
      ))}

      {/* Q&Aプレビュー */}
      {panels.some(p => p.title) && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-600">プレビュー</span>
          </div>
          <div className="p-4 bg-[#7494c0]">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {panels.filter(p => p.title).map((panel, i) => (
                <div key={i} className="flex-shrink-0 w-[220px] bg-white rounded-xl overflow-hidden shadow-lg">
                  <div className="px-3 py-2" style={{ backgroundColor: panel.headerColor || "#ec4899" }}>
                    <p className="text-sm font-bold text-white">{panel.title}</p>
                    {panel.subtitle && <p className="text-[10px] text-white/80 mt-0.5">{panel.subtitle}</p>}
                  </div>
                  <div className="px-3 py-2 space-y-1">
                    {(panel.items || []).filter(Boolean).map((item, ii) => (
                      <div key={ii} className="flex gap-1.5 items-start">
                        <span className="text-[8px] mt-0.5 flex-shrink-0" style={{ color: panel.headerColor || "#ec4899" }}>●</span>
                        <p className="text-[10px] text-gray-600 leading-tight">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-3 pb-2">
                    <div className="py-1 text-center text-[10px] font-medium rounded" style={{ color: panel.headerColor || "#ec4899" }}>
                      詳しく見る →
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex-shrink-0 w-[220px] bg-white rounded-xl overflow-hidden shadow-lg flex flex-col items-center justify-center py-6 px-3">
                <span className="text-2xl">💬</span>
                <p className="text-xs font-bold text-gray-800 mt-2">すべてのQ&Aを見る</p>
                <p className="text-[9px] text-gray-400 mt-1 text-center">自動付与</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 通常カルーセルエディタ ---------- */

function NormalCarouselEditor({ panels, setPanels }: CarouselEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          パネル {panels.length}/10（1枚ならボタン型、複数枚でカルーセル）
        </p>
        {panels.length < 10 && (
          <button
            onClick={() => setPanels([...panels, { ...EMPTY_PANEL, buttons: [{ ...EMPTY_BUTTON }] }])}
            className="text-xs text-[#06C755] hover:text-[#05a648] font-medium flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            パネル追加
          </button>
        )}
      </div>

      {panels.map((panel, pi) => (
        <div key={pi} className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-bold text-gray-600">パネル {pi + 1}/{panels.length}</span>
            <PanelControls panels={panels} setPanels={setPanels} index={pi} />
          </div>

          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">画像URL</label>
              <input type="url" value={panel.imageUrl} onChange={(e) => { const n = [...panels]; n[pi] = { ...n[pi], imageUrl: e.target.value }; setPanels(n); }} placeholder="https://example.com/image.jpg" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">タイトル</label>
              <input type="text" value={panel.title} onChange={(e) => { const n = [...panels]; n[pi] = { ...n[pi], title: e.target.value }; setPanels(n); }} placeholder="タイトルを入力" maxLength={40} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30" />
              <div className="text-right text-[10px] text-gray-400 mt-0.5">{panel.title.length}/40</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">本文</label>
              <textarea value={panel.body} onChange={(e) => { const n = [...panels]; n[pi] = { ...n[pi], body: e.target.value }; setPanels(n); }} placeholder="本文を入力" rows={2} maxLength={60} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30 resize-none" />
              <div className="text-right text-[10px] text-gray-400 mt-0.5">{panel.body.length}/60</div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600">ボタン</label>
                {panel.buttons.length < (panels.length === 1 ? 4 : 3) && (
                  <button onClick={() => { const n = [...panels]; n[pi] = { ...n[pi], buttons: [...n[pi].buttons, { ...EMPTY_BUTTON }] }; setPanels(n); }} className="text-[10px] text-[#06C755] hover:text-[#05a648] font-medium">+ 追加</button>
                )}
              </div>
              {panel.buttons.map((btn, bi) => (
                <div key={bi} className="flex items-center gap-2 mb-2">
                  <input type="text" value={btn.label} onChange={(e) => { const n = [...panels]; const btns = [...n[pi].buttons]; btns[bi] = { ...btns[bi], label: e.target.value }; n[pi] = { ...n[pi], buttons: btns }; setPanels(n); }} placeholder="ボタン名" maxLength={20} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  <select value={btn.actionType} onChange={(e) => { const n = [...panels]; const btns = [...n[pi].buttons]; btns[bi] = { ...btns[bi], actionType: e.target.value as PanelButton["actionType"] }; n[pi] = { ...n[pi], buttons: btns }; setPanels(n); }} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
                    <option value="url">URL</option>
                    <option value="postback">ポストバック</option>
                    <option value="message">メッセージ</option>
                  </select>
                  <input type="text" value={btn.actionValue} onChange={(e) => { const n = [...panels]; const btns = [...n[pi].buttons]; btns[bi] = { ...btns[bi], actionValue: e.target.value }; n[pi] = { ...n[pi], buttons: btns }; setPanels(n); }} placeholder={btn.actionType === "url" ? "https://..." : btn.actionType === "postback" ? "action=xxx" : "返信テキスト"} className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-green-500/30" />
                  {panel.buttons.length > 1 && (
                    <button onClick={() => { const n = [...panels]; n[pi] = { ...n[pi], buttons: n[pi].buttons.filter((_, i) => i !== bi) }; setPanels(n); }} className="p-1 text-gray-400 hover:text-red-500">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* 通常カルーセルプレビュー */}
      {panels.some(p => p.title || p.body || p.imageUrl) && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-600">プレビュー</span>
          </div>
          <div className="p-4 bg-[#7494c0]">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {panels.filter(p => p.title || p.body || p.imageUrl).map((panel, i) => (
                <div key={i} className="flex-shrink-0 w-[220px] bg-white rounded-xl overflow-hidden shadow-lg">
                  {panel.imageUrl && (
                    <div className="w-full h-28 bg-gray-200 bg-cover bg-center" style={{ backgroundImage: `url(${panel.imageUrl})` }} />
                  )}
                  <div className="px-3 py-2">
                    {panel.title && <p className="text-sm font-bold text-gray-900">{panel.title}</p>}
                    {panel.body && <p className="text-xs text-gray-500 mt-0.5">{panel.body}</p>}
                  </div>
                  {panel.buttons.filter(b => b.label).length > 0 && (
                    <div className="px-3 pb-2 space-y-1">
                      {panel.buttons.filter(b => b.label).map((btn, bi) => (
                        <div key={bi} className="py-1.5 text-center text-xs font-medium text-white rounded-lg" style={{ backgroundColor: "#06C755" }}>
                          {btn.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- パネル操作ボタン（上下移動・削除） ---------- */

function PanelControls({ panels, setPanels, index: pi, isWhite }: { panels: CarouselPanel[]; setPanels: (p: CarouselPanel[]) => void; index: number; isWhite?: boolean }) {
  const base = isWhite ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-gray-600";
  const delBase = isWhite ? "text-white/70 hover:text-white" : "text-gray-400 hover:text-red-500";
  return (
    <div className="flex items-center gap-1">
      {pi > 0 && (
        <button onClick={() => { const n = [...panels]; [n[pi-1], n[pi]] = [n[pi], n[pi-1]]; setPanels(n); }} className={`p-1 ${base} rounded`} title="前に移動">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
        </button>
      )}
      {pi < panels.length - 1 && (
        <button onClick={() => { const n = [...panels]; [n[pi], n[pi+1]] = [n[pi+1], n[pi]]; setPanels(n); }} className={`p-1 ${base} rounded`} title="後に移動">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
      )}
      {panels.length > 1 && (
        <button onClick={() => setPanels(panels.filter((_, i) => i !== pi))} className={`p-1 ${delBase} rounded`} title="削除">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      )}
    </div>
  );
}
