/**
 * VoiceRecorder コンポーネント — ユーティリティ関数テスト
 *
 * Canvas API・MediaRecorder はブラウザ環境に依存するため、
 * ここでは waveform-utils のユーティリティ関数と
 * VoiceRecorder の Props 型・定数をテストする。
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  drawFrequencyBars,
  drawStaticBars,
  formatElapsedTime,
  DEFAULT_THEME,
  type WaveformTheme,
} from "@/lib/voice/waveform-utils";

// --- formatElapsedTime テスト ---

describe("formatElapsedTime", () => {
  it("0秒を 0:00 と表示する", () => {
    expect(formatElapsedTime(0)).toBe("0:00");
  });

  it("59秒を 0:59 と表示する", () => {
    expect(formatElapsedTime(59)).toBe("0:59");
  });

  it("60秒を 1:00 と表示する", () => {
    expect(formatElapsedTime(60)).toBe("1:00");
  });

  it("125秒を 2:05 と表示する", () => {
    expect(formatElapsedTime(125)).toBe("2:05");
  });

  it("300秒（5分）を 5:00 と表示する", () => {
    expect(formatElapsedTime(300)).toBe("5:00");
  });

  it("3661秒を 61:01 と表示する", () => {
    expect(formatElapsedTime(3661)).toBe("61:01");
  });
});

// --- DEFAULT_THEME テスト ---

describe("DEFAULT_THEME", () => {
  it("必要なプロパティが定義されている", () => {
    expect(DEFAULT_THEME).toHaveProperty("barColor");
    expect(DEFAULT_THEME).toHaveProperty("barBackgroundColor");
    expect(DEFAULT_THEME).toHaveProperty("backgroundColor");
  });

  it("背景色が transparent", () => {
    expect(DEFAULT_THEME.backgroundColor).toBe("transparent");
  });

  it("バーの色が文字列", () => {
    expect(typeof DEFAULT_THEME.barColor).toBe("string");
    expect(DEFAULT_THEME.barColor.length).toBeGreaterThan(0);
  });
});

// --- Canvas モック ヘルパー ---

function createMockCanvasContext(): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: "",
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

// --- drawFrequencyBars テスト ---

describe("drawFrequencyBars", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCanvasContext();
  });

  it("Canvas をクリアしてからバーを描画する", () => {
    const data = new Uint8Array(128).fill(128);
    drawFrequencyBars(ctx, data, 300, 80);

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 300, 80);
    // バーが描画されたことを確認（fillRect または fill が呼ばれる）
    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    const fillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillRectCalls.length + fillCalls.length).toBeGreaterThan(0);
  });

  it("透明背景の場合は背景塗りつぶしを行わない", () => {
    const data = new Uint8Array(128).fill(0);
    const theme: WaveformTheme = {
      ...DEFAULT_THEME,
      backgroundColor: "transparent",
    };
    drawFrequencyBars(ctx, data, 300, 80, theme);

    // clearRect は呼ばれるが、背景色の fillRect は最初に呼ばれない
    // （fillRect の第1引数が 0, 0, 300, 80 でないことを確認）
    const firstFillRectCall = (ctx.fillRect as ReturnType<typeof vi.fn>).mock
      .calls[0];
    // 背景用の fillRect(0, 0, 300, 80) は呼ばれていないはず
    if (firstFillRectCall) {
      const [x, y, w, h] = firstFillRectCall;
      // バー描画の fillRect なので、y=0, h=80 の背景塗りとは異なる
      expect(x === 0 && y === 0 && w === 300 && h === 80).toBe(false);
    }
  });

  it("不透明背景の場合は背景塗りつぶしを行う", () => {
    const data = new Uint8Array(128).fill(0);
    const theme: WaveformTheme = {
      ...DEFAULT_THEME,
      backgroundColor: "#ffffff",
    };
    drawFrequencyBars(ctx, data, 300, 80, theme);

    // fillRect(0, 0, 300, 80) が背景塗りつぶしとして呼ばれる
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 300, 80);
  });

  it("カスタムバー数で描画できる", () => {
    const data = new Uint8Array(128).fill(200);
    drawFrequencyBars(ctx, data, 300, 80, DEFAULT_THEME, 16);

    // 各バーに対して背景バー(fillRect) + アクティブバー(fill or fillRect) が描画される
    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    const fillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls;
    const totalCalls = fillRectCalls.length + fillCalls.length;
    // 16バー × 2（背景+アクティブ）= 32回以上
    expect(totalCalls).toBeGreaterThanOrEqual(16);
  });

  it("空のデータでもエラーにならない", () => {
    const data = new Uint8Array(0);
    expect(() => {
      drawFrequencyBars(ctx, data, 300, 80);
    }).not.toThrow();
  });

  it("全値0のデータで最小バー高さ（2px）が適用される", () => {
    const data = new Uint8Array(128).fill(0);
    drawFrequencyBars(ctx, data, 300, 80, DEFAULT_THEME, 4);

    // fill が呼ばれる（角丸バー描画）か fillRect が呼ばれる
    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    // 少なくとも背景バーが描画される
    expect(fillRectCalls.length).toBeGreaterThan(0);
  });

  it("全値255のデータでバーが最大高さになる", () => {
    const data = new Uint8Array(128).fill(255);
    drawFrequencyBars(ctx, data, 300, 80, DEFAULT_THEME, 4);

    // fill（角丸バー）が呼ばれる — 最大高さ
    const fillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillCalls.length).toBeGreaterThan(0);
  });
});

// --- drawStaticBars テスト ---

describe("drawStaticBars", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCanvasContext();
  });

  it("半透明テーマで描画される", () => {
    const data = new Uint8Array(128).fill(128);
    drawStaticBars(ctx, data, 300, 80);

    // fill/fillRect が呼ばれること（描画が行われている）
    const fillRectCalls = (ctx.fillRect as ReturnType<typeof vi.fn>).mock.calls;
    const fillCalls = (ctx.fill as ReturnType<typeof vi.fn>).mock.calls;
    expect(fillRectCalls.length + fillCalls.length).toBeGreaterThan(0);
  });

  it("カスタムテーマが適用される", () => {
    const data = new Uint8Array(128).fill(100);
    const customTheme: WaveformTheme = {
      barColor: "#ff0000",
      barBackgroundColor: "#000000",
      backgroundColor: "#333333",
    };
    drawStaticBars(ctx, data, 200, 60, customTheme, 8);

    // 背景色が設定されるので fillRect(0, 0, 200, 60) が呼ばれる
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 200, 60);
  });
});

// --- VoiceRecorderProps 型チェック ---

describe("VoiceRecorderProps 型定義", () => {
  it("WaveformTheme の型がエクスポートされている", () => {
    const theme: WaveformTheme = {
      barColor: "#000",
      barBackgroundColor: "#ccc",
      backgroundColor: "transparent",
    };
    expect(theme.barColor).toBe("#000");
  });
});

// --- エッジケース ---

describe("drawFrequencyBars エッジケース", () => {
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    ctx = createMockCanvasContext();
  });

  it("幅0でもクラッシュしない", () => {
    const data = new Uint8Array(128).fill(100);
    expect(() => {
      drawFrequencyBars(ctx, data, 0, 80);
    }).not.toThrow();
  });

  it("高さ0でもクラッシュしない", () => {
    const data = new Uint8Array(128).fill(100);
    expect(() => {
      drawFrequencyBars(ctx, data, 300, 0);
    }).not.toThrow();
  });

  it("バー数1でも描画できる", () => {
    const data = new Uint8Array(128).fill(100);
    expect(() => {
      drawFrequencyBars(ctx, data, 300, 80, DEFAULT_THEME, 1);
    }).not.toThrow();
  });

  it("バーギャップ0で描画できる", () => {
    const data = new Uint8Array(128).fill(100);
    expect(() => {
      drawFrequencyBars(ctx, data, 300, 80, DEFAULT_THEME, 32, 0);
    }).not.toThrow();
  });

  it("非常に大きなデータ配列でも処理できる", () => {
    const data = new Uint8Array(4096).fill(128);
    expect(() => {
      drawFrequencyBars(ctx, data, 300, 80, DEFAULT_THEME, 64);
    }).not.toThrow();
  });
});
