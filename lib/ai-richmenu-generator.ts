// lib/ai-richmenu-generator.ts — リッチメニュー画像のAI自動生成
import Anthropic from "@anthropic-ai/sdk";
import { getSettingOrEnv } from "@/lib/settings";

/** AI生成リクエスト */
export type AiRichMenuRequest = {
  prompt: string;
  sizeType: "full" | "half";
  buttonCount: number;
  buttonLabels?: string[];
};

/** AI生成結果 */
export type AiRichMenuResult = {
  svg: string;
  buttonLabels: string[];
};

/**
 * リッチメニュー画像生成用のシステムプロンプト
 */
const SYSTEM_PROMPT = `あなたはLINEリッチメニュー用SVG画像の専門デザイナーです。

## 最重要ルール
- 指定されたボタン数に応じてグリッド分割し、各セルにアイコンとラベルを配置すること
- 6個→2行3列、4個→2行2列、3個→1行3列、2個→1行2列
- 各セルは等幅・等高で隙間なくviewBox全体を埋めること
- 装飾的な大きなテキスト（"CLINIC"等）や不要な要素は絶対に入れないこと

## SVG構造テンプレート（6ボタン・2行3列の場合）
以下の構造に従ってください:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 1686">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="[メインカラー]"/>
      <stop offset="100%" stop-color="[サブカラー]"/>
    </linearGradient>
  </defs>
  <!-- 背景 -->
  <rect width="2500" height="1686" fill="url(#bg)"/>
  <!-- セル区切り線 -->
  <line x1="833" y1="0" x2="833" y2="1686" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <line x1="1666" y1="0" x2="1666" y2="1686" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <line x1="0" y1="843" x2="2500" y2="843" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <!-- セル1 (0,0)-(833,843): アイコン + ラベル -->
  <g transform="translate(416,350)">
    <!-- アイコン（白色、中央配置） -->
    <circle cx="0" cy="0" r="60" fill="none" stroke="white" stroke-width="6"/>
    <!-- ラベル -->
    <text x="0" y="130" text-anchor="middle" fill="white" font-size="48" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic',sans-serif">ラベル1</text>
  </g>
  <!-- セル2〜6も同様に配置 -->
</svg>

## セル中心座標の計算方法
- 列幅 = 2500 / 列数
- 行高 = 1686 / 行数（fullの場合）
- セル中心X = 列幅 * (列index + 0.5)
- セル中心Y = 行高 * (行index + 0.5)

## アイコンデザイン
- 白色（stroke="white" fill="none" stroke-width="5-6"、または fill="white"）
- サイズ: 約100-120px幅
- SVGのcircle, rect, path, polygon等で描画
- 各ラベルの内容に合ったシンプルなアイコン

## カラーパレット（ユーザー指示に応じて選択）
- 医療/クリニック系: #0D9488→#2DD4BF（ティール系グラデーション）
- 美容系: #BE185D→#F472B6（ピンク系グラデーション）
- エレガント: #1E3A5F→#3B82F6（ブルー系グラデーション）
- モダン: #1F2937→#4B5563（ダーク系グラデーション）

## 出力
\`\`\`svg\`\`\` ブロック内にSVGコードのみ。その後:
\`\`\`json
{ "buttonLabels": ["ラベル1", "ラベル2", ...] }
\`\`\``;

/**
 * Claude APIでリッチメニュー用SVG画像を生成する
 */
export async function generateRichMenuImage(
  request: AiRichMenuRequest,
  tenantId?: string
): Promise<AiRichMenuResult> {
  // APIキー取得
  const apiKey = await getSettingOrEnv(
    "general",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_API_KEY",
    tenantId
  );
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY が未設定です");
  }

  const width = 2500;
  const height = request.sizeType === "full" ? 1686 : 843;

  // ユーザープロンプト構築
  const labelsHint = request.buttonLabels?.length
    ? `\nボタンのラベル: ${request.buttonLabels.join(", ")}`
    : "";

  const userPrompt = `以下の条件でLINEリッチメニュー画像のSVGを生成してください:

- サイズ: ${width}×${height}px（${request.sizeType}）
- ボタン数: ${request.buttonCount}個${labelsHint}
- デザインの要望: ${request.prompt}

SVGコードとボタンラベル一覧をそれぞれコードブロックで出力してください。`;

  // Claude API呼び出し
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";

  // SVG抽出
  const svgMatch = text.match(/```(?:svg|xml)?\s*([\s\S]*?)\s*```/);
  if (!svgMatch) {
    throw new Error("AI応答からSVGを抽出できませんでした");
  }
  let svg = svgMatch[1].trim();

  // viewBoxがない場合は追加
  if (!svg.includes("viewBox")) {
    svg = svg.replace("<svg", `<svg viewBox="0 0 ${width} ${height}"`);
  }

  // ボタンラベル抽出
  let buttonLabels: string[] = [];
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      buttonLabels = parsed.buttonLabels || [];
    } catch {
      // JSONパース失敗時は空配列
    }
  }

  // ラベルが取得できない場合はリクエストのラベルを使用
  if (buttonLabels.length === 0 && request.buttonLabels?.length) {
    buttonLabels = request.buttonLabels;
  }

  return { svg, buttonLabels };
}
