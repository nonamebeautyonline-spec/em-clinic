/**
 * 音声波形描画ユーティリティ
 * AnalyserNode の周波数データを Canvas に描画する関数群
 */

/** 波形カラーテーマ */
export interface WaveformTheme {
  /** バーの色（CSSカラー） */
  barColor: string;
  /** バーの背景色（非アクティブ時） */
  barBackgroundColor: string;
  /** 背景色 */
  backgroundColor: string;
}

/** デフォルトテーマ */
export const DEFAULT_THEME: WaveformTheme = {
  barColor: "#6366f1",
  barBackgroundColor: "#e0e7ff",
  backgroundColor: "transparent",
};

/** 経過時間を mm:ss 形式にフォーマット */
export function formatElapsedTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 周波数データを Canvas に周波数バーとして描画
 * @param ctx - Canvas 2D コンテキスト
 * @param frequencyData - AnalyserNode.getByteFrequencyData の結果（0-255）
 * @param width - Canvas 幅
 * @param height - Canvas 高さ
 * @param theme - カラーテーマ
 * @param barCount - 表示するバー数（デフォルト: 32）
 * @param barGap - バー間の隙間（デフォルト: 2）
 */
export function drawFrequencyBars(
  ctx: CanvasRenderingContext2D,
  frequencyData: Uint8Array,
  width: number,
  height: number,
  theme: WaveformTheme = DEFAULT_THEME,
  barCount: number = 32,
  barGap: number = 2
): void {
  // 背景クリア
  ctx.clearRect(0, 0, width, height);
  if (theme.backgroundColor !== "transparent") {
    ctx.fillStyle = theme.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  const totalBarWidth = (width - barGap * (barCount - 1)) / barCount;
  const barWidth = Math.max(1, totalBarWidth);

  // 周波数データをバー数にリサンプリング
  const step = Math.floor(frequencyData.length / barCount) || 1;

  for (let i = 0; i < barCount; i++) {
    // 周波数帯域の平均値を取得
    let sum = 0;
    let count = 0;
    for (let j = i * step; j < (i + 1) * step && j < frequencyData.length; j++) {
      sum += frequencyData[j];
      count++;
    }
    const avg = count > 0 ? sum / count : 0;

    // 正規化（0-1）
    const normalized = avg / 255;

    // バーの高さ（最低2px）
    const barHeight = Math.max(2, normalized * height);

    const x = i * (barWidth + barGap);
    const y = height - barHeight;

    // 背景バー（非アクティブ領域）
    ctx.fillStyle = theme.barBackgroundColor;
    ctx.fillRect(x, 0, barWidth, height);

    // アクティブバー
    ctx.fillStyle = theme.barColor;
    // 角丸風に描画（上部のみ）
    const radius = Math.min(barWidth / 2, 3);
    drawRoundedBar(ctx, x, y, barWidth, barHeight, radius);
  }
}

/**
 * 角丸バーを描画するヘルパー
 */
function drawRoundedBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  if (height < radius * 2) {
    // 高さが角丸分に満たない場合は通常の矩形
    ctx.fillRect(x, y, width, height);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

/**
 * 静止状態の波形を描画（録音停止後の表示用）
 * 最後の周波数データのスナップショットを半透明で描画
 */
export function drawStaticBars(
  ctx: CanvasRenderingContext2D,
  frequencyData: Uint8Array,
  width: number,
  height: number,
  theme: WaveformTheme = DEFAULT_THEME,
  barCount: number = 32,
  barGap: number = 2
): void {
  // 半透明テーマで描画
  const staticTheme: WaveformTheme = {
    ...theme,
    barColor: theme.barColor + "80", // 50%透明
  };
  drawFrequencyBars(ctx, frequencyData, width, height, staticTheme, barCount, barGap);
}
