"use client";

// app/platform/richmenu-generator/page.tsx
// プラットフォーム管理者向け リッチメニュー画像AI生成ツール

import { useState } from "react";

type LayoutTemplate = {
  id: string;
  label: string;
  desc: string;
  buttonCount: number;
  cells: { x: number; y: number; w: number; h: number }[];
};

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  { id: "2x3", label: "2行×3列", desc: "均等6分割", buttonCount: 6, cells: [
    { x: 0, y: 0, w: 833, h: 843 }, { x: 833, y: 0, w: 834, h: 843 }, { x: 1667, y: 0, w: 833, h: 843 },
    { x: 0, y: 843, w: 833, h: 843 }, { x: 833, y: 843, w: 834, h: 843 }, { x: 1667, y: 843, w: 833, h: 843 },
  ]},
  { id: "2big-3small", label: "上2大+下3小", desc: "上段大きめ2つ+下段3つ", buttonCount: 5, cells: [
    { x: 0, y: 0, w: 1250, h: 843 }, { x: 1250, y: 0, w: 1250, h: 843 },
    { x: 0, y: 843, w: 833, h: 843 }, { x: 833, y: 843, w: 834, h: 843 }, { x: 1667, y: 843, w: 833, h: 843 },
  ]},
  { id: "2x2", label: "2行×2列", desc: "均等4分割", buttonCount: 4, cells: [
    { x: 0, y: 0, w: 1250, h: 843 }, { x: 1250, y: 0, w: 1250, h: 843 },
    { x: 0, y: 843, w: 1250, h: 843 }, { x: 1250, y: 843, w: 1250, h: 843 },
  ]},
  { id: "1big-3small", label: "左1大+右3小", desc: "左に大きなエリア+右に3段", buttonCount: 4, cells: [
    { x: 0, y: 0, w: 1250, h: 1686 },
    { x: 1250, y: 0, w: 1250, h: 562 }, { x: 1250, y: 562, w: 1250, h: 562 }, { x: 1250, y: 1124, w: 1250, h: 562 },
  ]},
  { id: "1x3", label: "1行×3列", desc: "横3分割", buttonCount: 3, cells: [
    { x: 0, y: 0, w: 833, h: 1686 }, { x: 833, y: 0, w: 834, h: 1686 }, { x: 1667, y: 0, w: 833, h: 1686 },
  ]},
  { id: "1x2", label: "1行×2列", desc: "横2分割", buttonCount: 2, cells: [
    { x: 0, y: 0, w: 1250, h: 1686 }, { x: 1250, y: 0, w: 1250, h: 1686 },
  ]},
];

function renderLayoutSvg(layout: LayoutTemplate, selected: boolean) {
  const w = 150, h = 101;
  const scaleX = w / 2500, scaleY = h / 1686;
  const rects = layout.cells.map((c) => {
    const gap = 2;
    return `<rect x="${c.x * scaleX + gap}" y="${c.y * scaleY + gap}" width="${c.w * scaleX - gap * 2}" height="${c.h * scaleY - gap * 2}" rx="3" fill="${selected ? '#818CF8' : '#CBD5E1'}" stroke="${selected ? '#4F46E5' : '#94A3B8'}" stroke-width="1"/>`;
  });
  return `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg"><rect width="${w}" height="${h}" rx="4" fill="${selected ? '#EEF2FF' : '#F8FAFC'}"/>${rects.join("")}</svg>`;
}

export default function RichMenuGeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [buttonLabels, setButtonLabels] = useState("");
  const [style, setStyle] = useState<"card" | "gradient" | "banner">("card");
  const [layout, setLayout] = useState<string | null>("2x3");
  const [generating, setGenerating] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setPreviewSvg(null);
    setDownloadUrl(null);
    try {
      const labels = buttonLabels.split(",").map(s => s.trim()).filter(Boolean);
      const layoutHint = layout ? LAYOUT_TEMPLATES.find(l => l.id === layout) : null;
      const res = await fetch("/api/admin/line/rich-menus/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prompt,
          sizeType: "full",
          buttonCount: layoutHint?.buttonCount ?? (labels.length || 6),
          buttonLabels: labels.length > 0 ? labels : undefined,
          style,
          layoutCells: layoutHint?.cells,
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error((json.message || json.error) || "生成失敗");
      setPreviewSvg(json.svg);
    } catch (e) {
      alert(`AI生成エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!previewSvg) return;
    try {
      const width = 2500;
      const height = 1686;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas不可");

      const svgBlob = new Blob([previewSvg], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(svgUrl);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error("SVG読み込み失敗"));
        };
        img.src = svgUrl;
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("PNG変換失敗")), "image/png");
      });

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      // 自動ダウンロード
      const a = document.createElement("a");
      a.href = url;
      a.download = `richmenu-${Date.now()}.png`;
      a.click();
    } catch (e) {
      alert(`PNG変換エラー: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">リッチメニュー画像 AI生成</h1>
        <p className="text-sm text-zinc-500 mt-1">テナント向けリッチメニュー画像をAIで生成するツールです</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 設定パネル */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
          {/* スタイル選択 */}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-2 block">デザインスタイル</label>
            <div className="flex items-center gap-3">
              {([
                { value: "card" as const, label: "カード型", desc: "白パネル+影" },
                { value: "gradient" as const, label: "グラデーション型", desc: "鮮やかな背景" },
                { value: "banner" as const, label: "バナー型", desc: "上部バナー+下部ボタン" },
              ]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStyle(opt.value)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    style === opt.value
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-zinc-700 border-zinc-300 hover:border-indigo-400"
                  }`}
                  title={opt.desc}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* レイアウトテンプレート */}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-2 block">レイアウト</label>
            <div className="flex items-center gap-3 flex-wrap">
              {LAYOUT_TEMPLATES.map(lt => (
                <button
                  key={lt.id}
                  onClick={() => setLayout(layout === lt.id ? null : lt.id)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors ${
                    layout === lt.id
                      ? "border-indigo-500 bg-indigo-50"
                      : "border-zinc-200 bg-white hover:border-indigo-300"
                  }`}
                  title={`${lt.label} (${lt.buttonCount}ボタン)`}
                >
                  <div
                    style={{ width: 90, height: 61 }}
                    dangerouslySetInnerHTML={{ __html: renderLayoutSvg(lt, layout === lt.id) }}
                  />
                  <span className={`text-xs ${layout === lt.id ? "text-indigo-700 font-medium" : "text-zinc-500"}`}>
                    {lt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* プロンプト */}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-2 block">デザインの要望</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="例: 美容クリニック向け、ピンク系のエレガントなデザイン"
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              rows={3}
            />
          </div>

          {/* ボタンラベル */}
          <div>
            <label className="text-sm font-medium text-zinc-700 mb-2 block">ボタンラベル（カンマ区切り）</label>
            <input
              type="text"
              value={buttonLabels}
              onChange={e => setButtonLabels(e.target.value)}
              placeholder="予約, 問診, マイページ, お問合せ, 料金, アクセス"
              className="w-full px-4 py-3 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* 生成ボタン */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full px-6 py-3 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            {generating ? "生成中..." : "AIで画像を生成"}
          </button>
        </div>

        {/* プレビューパネル */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6">
          <label className="text-sm font-medium text-zinc-700 mb-3 block">プレビュー</label>
          {previewSvg ? (
            <div className="space-y-4">
              <div
                className="border border-zinc-200 rounded-lg overflow-hidden bg-white"
                style={{ aspectRatio: "2500/1686" }}
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadPng}
                  className="px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-500 transition-colors"
                >
                  PNGダウンロード
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="px-5 py-2.5 bg-zinc-100 text-zinc-700 text-sm rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                >
                  再生成
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-zinc-50 rounded-lg border-2 border-dashed border-zinc-200">
              <p className="text-sm text-zinc-400">
                {generating ? "生成中..." : "左の設定で「AIで画像を生成」を押してください"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
