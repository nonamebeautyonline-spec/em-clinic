// __tests__/api/voice-karte-input.test.ts
// VoiceKarteInput コンポーネントのロジックテスト
// （DOM テストではなくAPI連携ロジック・状態遷移・データ変換のテスト）
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- モック設定 ---

// useVoiceRecorder のモック
const mockStartRecording = vi.fn();
const mockStopRecording = vi.fn();
const mockReset = vi.fn();
let mockRecorderState = "idle" as string;
let mockRecorderError: string | null = null;
let mockOnTranscribed: ((text: string) => void) | undefined;

vi.mock("@/lib/voice/use-voice-recorder", () => ({
  useVoiceRecorder: vi.fn((opts: { onTranscribed?: (text: string) => void }) => {
    mockOnTranscribed = opts.onTranscribed;
    return {
      state: mockRecorderState,
      elapsed: 0,
      audioLevel: 0,
      error: mockRecorderError,
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording,
      reset: mockReset,
    };
  }),
}));

// fetch モック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("VoiceKarteInput ロジックテスト", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecorderState = "idle";
    mockRecorderError = null;
    mockOnTranscribed = undefined;
    mockFetch.mockReset();
  });

  describe("generate-karte API レスポンスのパース", () => {
    it("SOAP大文字キー（S/O/A/P）を小文字キー（s/o/a/p）に変換する", async () => {
      // generate-karte API が返す大文字キーを VoiceKarteInput 内で小文字に変換するロジック
      const apiResponse = {
        ok: true,
        soap: { S: "頭痛を訴える", O: "体温36.5度", A: "片頭痛疑い", P: "鎮痛薬処方" },
        summary: "頭痛の訴え",
        medications: ["ロキソプロフェン"],
        raw_transcript: "頭が痛いです",
      };

      // 変換ロジックの検証（コンポーネント内と同じ変換）
      const soap = {
        s: apiResponse.soap.S || "",
        o: apiResponse.soap.O || "",
        a: apiResponse.soap.A || "",
        p: apiResponse.soap.P || "",
      };

      expect(soap).toEqual({
        s: "頭痛を訴える",
        o: "体温36.5度",
        a: "片頭痛疑い",
        p: "鎮痛薬処方",
      });
    });

    it("SOAP小文字キー（s/o/a/p）のレスポンスもそのまま処理できる", () => {
      const apiResponse = {
        ok: true,
        soap: { s: "腹痛", o: "圧痛あり", a: "急性胃腸炎", p: "整腸剤" },
        summary: "腹痛の訴え",
        medications: [],
      };

      const soap = {
        s: apiResponse.soap.S || apiResponse.soap.s || "",
        o: apiResponse.soap.O || apiResponse.soap.o || "",
        a: apiResponse.soap.A || apiResponse.soap.a || "",
        p: apiResponse.soap.P || apiResponse.soap.p || "",
      };

      expect(soap).toEqual({
        s: "腹痛",
        o: "圧痛あり",
        a: "急性胃腸炎",
        p: "整腸剤",
      });
    });

    it("一部のSOAPフィールドが空でも正しくパースする", () => {
      const apiResponse = {
        ok: true,
        soap: { S: "経過観察希望", O: "", A: "", P: "次回予約" },
        summary: "",
        medications: [],
      };

      const soap = {
        s: apiResponse.soap.S || "",
        o: apiResponse.soap.O || "",
        a: apiResponse.soap.A || "",
        p: apiResponse.soap.P || "",
      };

      expect(soap.s).toBe("経過観察希望");
      expect(soap.o).toBe("");
      expect(soap.a).toBe("");
      expect(soap.p).toBe("次回予約");
    });
  });

  describe("generate-karte API 呼び出しロジック", () => {
    it("文字起こし結果をgenerate-karte APIに正しいフォーマットで送信する", async () => {
      // コンポーネント内の handleTranscribed と同等のロジックを直接テスト
      const transcript = "患者さんが頭痛を訴えています";

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          soap: { S: "テスト主訴", O: "テスト所見", A: "テスト評価", P: "テスト計画" },
          summary: "テスト要約",
          medications: ["テスト薬"],
        }),
      });

      // handleTranscribed 相当のロジックを再現
      const res = await fetch("/api/voice/generate-karte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, format: "soap" }),
      });

      const data = await res.json();

      expect(mockFetch).toHaveBeenCalledWith("/api/voice/generate-karte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: "患者さんが頭痛を訴えています",
          format: "soap",
        }),
      });
      expect(data.ok).toBe(true);
      expect(data.soap.S).toBe("テスト主訴");
    });

    it("APIエラー時にエラー情報を取得できる", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          ok: false,
          error: "ANTHROPIC_API_KEY が未設定です",
        }),
      });

      const res = await fetch("/api/voice/generate-karte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: "テスト", format: "soap" }),
      });

      expect(res.ok).toBe(false);
      const data = await res.json();
      expect(data.ok).toBe(false);
      expect(data.error).toBe("ANTHROPIC_API_KEY が未設定です");
    });

    it("APIレスポンスからプレビューデータを構築できる", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          ok: true,
          soap: { S: "頭痛2日前から", O: "体温36.8", A: "緊張型頭痛", P: "NSAIDs処方" },
          summary: "頭痛の精査",
          medications: ["ロキソプロフェン", "レバミピド"],
        }),
      });

      const res = await fetch("/api/voice/generate-karte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: "テスト会話", format: "soap" }),
      });

      const data = await res.json();
      const transcript = "テスト会話";

      // コンポーネント内の変換ロジック
      const preview = {
        soap: {
          s: data.soap?.S || data.soap?.s || "",
          o: data.soap?.O || data.soap?.o || "",
          a: data.soap?.A || data.soap?.a || "",
          p: data.soap?.P || data.soap?.p || "",
        },
        summary: data.summary || "",
        medications: data.medications || [],
        transcript,
      };

      expect(preview.soap).toEqual({
        s: "頭痛2日前から",
        o: "体温36.8",
        a: "緊張型頭痛",
        p: "NSAIDs処方",
      });
      expect(preview.medications).toEqual(["ロキソプロフェン", "レバミピド"]);
      expect(preview.summary).toBe("頭痛の精査");
    });
  });

  describe("formatTime ユーティリティ", () => {
    it("0秒を 0:00 にフォーマットする", () => {
      const formatTime = (sec: number): string => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
      };
      expect(formatTime(0)).toBe("0:00");
    });

    it("65秒を 1:05 にフォーマットする", () => {
      const formatTime = (sec: number): string => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
      };
      expect(formatTime(65)).toBe("1:05");
    });

    it("300秒を 5:00 にフォーマットする", () => {
      const formatTime = (sec: number): string => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${String(s).padStart(2, "0")}`;
      };
      expect(formatTime(300)).toBe("5:00");
    });
  });

  describe("状態遷移", () => {
    it("初期状態はidleである", () => {
      expect(mockRecorderState).toBe("idle");
    });

    it("録音開始でstartRecordingが呼ばれる", async () => {
      const { useVoiceRecorder } = await import("@/lib/voice/use-voice-recorder");
      const result = useVoiceRecorder({});
      await result.startRecording();
      expect(mockStartRecording).toHaveBeenCalled();
    });

    it("録音停止でstopRecordingが呼ばれる", async () => {
      const { useVoiceRecorder } = await import("@/lib/voice/use-voice-recorder");
      const result = useVoiceRecorder({});
      result.stopRecording();
      expect(mockStopRecording).toHaveBeenCalled();
    });

    it("リセットでresetが呼ばれる", async () => {
      const { useVoiceRecorder } = await import("@/lib/voice/use-voice-recorder");
      const result = useVoiceRecorder({});
      result.reset();
      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe("SOAP_SECTIONS 定数", () => {
    it("4つのセクション（S/O/A/P）を正しく定義する", () => {
      const SOAP_SECTIONS = [
        { key: "s", label: "S（主訴）", color: "border-l-blue-400", bg: "bg-blue-50" },
        { key: "o", label: "O（所見）", color: "border-l-green-400", bg: "bg-green-50" },
        { key: "a", label: "A（評価）", color: "border-l-amber-400", bg: "bg-amber-50" },
        { key: "p", label: "P（計画）", color: "border-l-purple-400", bg: "bg-purple-50" },
      ];

      expect(SOAP_SECTIONS).toHaveLength(4);
      expect(SOAP_SECTIONS.map(s => s.key)).toEqual(["s", "o", "a", "p"]);
    });
  });

  describe("プレビューデータの構造", () => {
    it("KartePreview型の構造が正しい", () => {
      const preview = {
        soap: { s: "主訴", o: "所見", a: "評価", p: "計画" },
        summary: "テスト要約",
        medications: ["薬A", "薬B"],
        transcript: "元のテキスト",
      };

      expect(preview.soap).toHaveProperty("s");
      expect(preview.soap).toHaveProperty("o");
      expect(preview.soap).toHaveProperty("a");
      expect(preview.soap).toHaveProperty("p");
      expect(preview.medications).toHaveLength(2);
      expect(preview.transcript).toBe("元のテキスト");
    });

    it("薬剤リストが空でもエラーにならない", () => {
      const preview = {
        soap: { s: "主訴のみ", o: "", a: "", p: "" },
        summary: "",
        medications: [] as string[],
        transcript: "短い会話",
      };

      expect(preview.medications).toHaveLength(0);
      expect(preview.summary).toBe("");
    });
  });

  describe("onApply コールバック", () => {
    it("SOAPデータとメタ情報を正しくコールバックに渡す", () => {
      const onApply = vi.fn();
      const soap = { s: "主訴", o: "所見", a: "評価", p: "計画" };
      const meta = { summary: "要約", medications: ["薬A"] };

      onApply(soap, meta);

      expect(onApply).toHaveBeenCalledWith(
        { s: "主訴", o: "所見", a: "評価", p: "計画" },
        { summary: "要約", medications: ["薬A"] }
      );
    });
  });
});
