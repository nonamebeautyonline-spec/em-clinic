"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type MouseEvent,
  type TouchEvent,
} from "react";
import type {
  AnnotationType,
  AnnotationData,
  Point,
} from "@/lib/annotation";
import {
  ANNOTATION_COLORS,
  LINE_WIDTHS,
  createHistory,
  pushAnnotation,
  undo as historyUndo,
  redo as historyRedo,
  clearAll as historyClearAll,
  canvasToNormalized,
  normalizedToCanvas,
  arrowHeadPoints,
} from "@/lib/annotation";

// === Props ===
type Props = {
  imageUrl: string;
  annotations?: AnnotationData[];
  onSave: (annotations: AnnotationData[], imageDataUrl: string) => void;
  onCancel?: () => void;
};

export default function ImageAnnotator({
  imageUrl,
  annotations: initialAnnotations,
  onSave,
  onCancel,
}: Props) {
  // --- 状態 ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [history, setHistory] = useState(() =>
    createHistory(initialAnnotations || [])
  );
  const [tool, setTool] = useState<AnnotationType>("freehand");
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [textInput, setTextInput] = useState("");
  const [textPosition, setTextPosition] = useState<Point | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // --- 画像読み込み ---
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // --- キャンバスサイズ調整 ---
  const updateCanvasSize = useCallback(() => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;

    const maxW = container.clientWidth;
    const maxH = container.clientHeight;
    const ratio = img.width / img.height;

    let w: number, h: number;
    if (maxW / maxH > ratio) {
      h = maxH;
      w = h * ratio;
    } else {
      w = maxW;
      h = w / ratio;
    }

    setCanvasSize({ width: Math.floor(w), height: Math.floor(h) });
  }, []);

  useEffect(() => {
    if (imageLoaded) updateCanvasSize();
  }, [imageLoaded, updateCanvasSize]);

  useEffect(() => {
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [updateCanvasSize]);

  // --- 描画 ---
  const drawAll = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;
    if (!canvas || !ctx || !img) return;

    const { width: cw, height: ch } = canvasSize;
    canvas.width = cw;
    canvas.height = ch;

    // 背景画像
    ctx.drawImage(img, 0, 0, cw, ch);

    // 保存済みアノテーション描画
    for (const ann of history.items) {
      drawAnnotation(ctx, ann, cw, ch);
    }

    // 描画中のアノテーション
    if (isDrawing && currentPoints.length > 0) {
      drawAnnotation(
        ctx,
        { type: tool, points: currentPoints, color, lineWidth },
        cw,
        ch
      );
    }
  }, [canvasSize, history.items, isDrawing, currentPoints, tool, color, lineWidth]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  // --- アノテーション描画関数 ---
  function drawAnnotation(
    ctx: CanvasRenderingContext2D,
    ann: AnnotationData,
    cw: number,
    ch: number
  ) {
    const pts = ann.points.map((p) => normalizedToCanvas(p.x, p.y, cw, ch));
    ctx.strokeStyle = ann.color;
    ctx.fillStyle = ann.color;
    ctx.lineWidth = ann.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (ann.type) {
      case "freehand": {
        if (pts.length < 2) break;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        break;
      }
      case "arrow": {
        if (pts.length < 2) break;
        const from = pts[0];
        const to = pts[pts.length - 1];
        // 線
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        // 矢印の頭（正規化座標で計算してからキャンバス座標に戻す）
        const normFrom = ann.points[0];
        const normTo = ann.points[ann.points.length - 1];
        const [left, right] = arrowHeadPoints(normFrom, normTo);
        const lp = normalizedToCanvas(left.x, left.y, cw, ch);
        const rp = normalizedToCanvas(right.x, right.y, cw, ch);
        ctx.beginPath();
        ctx.moveTo(lp.x, lp.y);
        ctx.lineTo(to.x, to.y);
        ctx.lineTo(rp.x, rp.y);
        ctx.stroke();
        break;
      }
      case "circle": {
        if (pts.length < 2) break;
        const cx = (pts[0].x + pts[pts.length - 1].x) / 2;
        const cy = (pts[0].y + pts[pts.length - 1].y) / 2;
        const rx = Math.abs(pts[pts.length - 1].x - pts[0].x) / 2;
        const ry = Math.abs(pts[pts.length - 1].y - pts[0].y) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case "rect": {
        if (pts.length < 2) break;
        const x = Math.min(pts[0].x, pts[pts.length - 1].x);
        const y = Math.min(pts[0].y, pts[pts.length - 1].y);
        const w = Math.abs(pts[pts.length - 1].x - pts[0].x);
        const h = Math.abs(pts[pts.length - 1].y - pts[0].y);
        ctx.strokeRect(x, y, w, h);
        break;
      }
      case "text": {
        if (pts.length === 0 || !ann.text) break;
        const fs = ann.fontSize || 16;
        ctx.font = `bold ${fs}px sans-serif`;
        // 背景付きテキスト
        const metrics = ctx.measureText(ann.text);
        const textH = fs * 1.2;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(
          pts[0].x - 2,
          pts[0].y - textH + 2,
          metrics.width + 4,
          textH + 4
        );
        ctx.fillStyle = ann.color;
        ctx.fillText(ann.text, pts[0].x, pts[0].y);
        break;
      }
    }
  }

  // --- イベントハンドラ ---
  function getCanvasPoint(
    e: MouseEvent<HTMLCanvasElement> | globalThis.Touch
  ): Point {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : 0) - rect.left;
    const y = ("clientY" in e ? e.clientY : 0) - rect.top;
    return canvasToNormalized(x, y, canvasSize.width, canvasSize.height);
  }

  function handlePointerDown(e: MouseEvent<HTMLCanvasElement>) {
    if (tool === "text") {
      const pt = getCanvasPoint(e);
      setTextPosition(pt);
      return;
    }
    setIsDrawing(true);
    setCurrentPoints([getCanvasPoint(e)]);
  }

  function handlePointerMove(e: MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const pt = getCanvasPoint(e);
    if (tool === "freehand") {
      setCurrentPoints((prev) => [...prev, pt]);
    } else {
      // 図形ツール: 始点と現在点の2点のみ
      setCurrentPoints((prev) => [prev[0], pt]);
    }
  }

  function handlePointerUp() {
    if (!isDrawing || currentPoints.length < 1) {
      setIsDrawing(false);
      return;
    }
    const annotation: AnnotationData = {
      type: tool,
      points: currentPoints,
      color,
      lineWidth,
    };
    setHistory((h) => pushAnnotation(h, annotation));
    setIsDrawing(false);
    setCurrentPoints([]);
  }

  // タッチイベント
  function handleTouchStart(e: TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    if (tool === "text") {
      const pt = getCanvasPoint(e.touches[0]);
      setTextPosition(pt);
      return;
    }
    setIsDrawing(true);
    setCurrentPoints([getCanvasPoint(e.touches[0])]);
  }

  function handleTouchMove(e: TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing || e.touches.length !== 1) return;
    const pt = getCanvasPoint(e.touches[0]);
    if (tool === "freehand") {
      setCurrentPoints((prev) => [...prev, pt]);
    } else {
      setCurrentPoints((prev) => [prev[0], pt]);
    }
  }

  function handleTouchEnd(e: TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    handlePointerUp();
  }

  // テキスト追加確定
  function confirmText() {
    if (!textPosition || !textInput.trim()) {
      setTextPosition(null);
      setTextInput("");
      return;
    }
    const annotation: AnnotationData = {
      type: "text",
      points: [textPosition],
      color,
      lineWidth,
      text: textInput.trim(),
      fontSize: 16,
    };
    setHistory((h) => pushAnnotation(h, annotation));
    setTextPosition(null);
    setTextInput("");
  }

  // 保存: 合成画像を生成
  function handleSave() {
    const img = imageRef.current;
    if (!img) return;

    // フルサイズキャンバスで合成
    const offscreen = document.createElement("canvas");
    offscreen.width = img.width;
    offscreen.height = img.height;
    const ctx = offscreen.getContext("2d")!;
    ctx.drawImage(img, 0, 0);

    for (const ann of history.items) {
      drawAnnotation(ctx, ann, img.width, img.height);
    }

    const dataUrl = offscreen.toDataURL("image/png");
    onSave(history.items, dataUrl);
  }

  // === ツールボタン ===
  const TOOLS: { key: AnnotationType; label: string; icon: string }[] = [
    { key: "freehand", label: "フリーハンド", icon: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" },
    { key: "arrow", label: "矢印", icon: "M4 20l8-8m0 0l8-8m-8 8h8m-8 0V4" },
    { key: "text", label: "テキスト", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
    { key: "circle", label: "円", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" },
    { key: "rect", label: "矩形", icon: "M3 3h18v18H3z" },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* ツールバー */}
      <div className="flex flex-wrap items-center gap-1 px-3 py-2 bg-slate-800 border-b border-slate-700">
        {/* ツール選択 */}
        <div className="flex gap-0.5 mr-2">
          {TOOLS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTool(t.key)}
              className={`p-1.5 rounded-lg transition-colors ${
                tool === t.key
                  ? "bg-pink-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title={t.label}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} />
              </svg>
            </button>
          ))}
        </div>

        {/* 色選択 */}
        <div className="flex gap-1 mr-2">
          {ANNOTATION_COLORS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                color === c.value
                  ? "border-white scale-110"
                  : "border-slate-600 hover:border-slate-400"
              }`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
        </div>

        {/* 線幅選択 */}
        <div className="flex gap-1 mr-2">
          {LINE_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setLineWidth(w)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                lineWidth === w
                  ? "bg-pink-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
              title={`線幅 ${w}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: w + 2, height: w + 2 }}
              />
            </button>
          ))}
        </div>

        {/* Undo/Redo/全消去 */}
        <div className="flex gap-0.5 ml-auto">
          <button
            type="button"
            onClick={() => setHistory((h) => historyUndo(h))}
            disabled={history.undoStack.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="元に戻す"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a5 5 0 015 5v2M3 10l4-4m-4 4l4 4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setHistory((h) => historyRedo(h))}
            disabled={history.redoStack.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="やり直し"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setHistory((h) => historyClearAll(h))}
            disabled={history.items.length === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            title="全消去"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* キャンバスエリア */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-hidden bg-slate-950 relative"
      >
        {imageLoaded ? (
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{ width: canvasSize.width, height: canvasSize.height }}
            className="cursor-crosshair"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        ) : (
          <div className="text-slate-500 text-sm">画像を読み込み中...</div>
        )}

        {/* テキスト入力ポップアップ */}
        {textPosition && (
          <div
            className="absolute bg-white rounded-lg shadow-xl p-3 z-10"
            style={{
              left: `calc(50% - ${canvasSize.width / 2}px + ${textPosition.x * canvasSize.width}px)`,
              top: `calc(50% - ${canvasSize.height / 2}px + ${textPosition.y * canvasSize.height}px)`,
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmText();
                if (e.key === "Escape") {
                  setTextPosition(null);
                  setTextInput("");
                }
              }}
              placeholder="テキストを入力"
              className="text-sm border border-slate-300 rounded px-2 py-1 w-48"
              autoFocus
            />
            <div className="flex gap-1 mt-1">
              <button
                type="button"
                onClick={confirmText}
                className="px-2 py-0.5 rounded bg-pink-600 text-white text-xs"
              >
                追加
              </button>
              <button
                type="button"
                onClick={() => {
                  setTextPosition(null);
                  setTextInput("");
                }}
                className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-xs"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>

      {/* フッター（保存/キャンセル） */}
      <div className="flex items-center justify-end gap-2 px-3 py-2 bg-slate-800 border-t border-slate-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-slate-700"
          >
            キャンセル
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="px-4 py-1.5 rounded-lg text-sm bg-pink-600 text-white hover:bg-pink-700"
        >
          保存
        </button>
      </div>
    </div>
  );
}
