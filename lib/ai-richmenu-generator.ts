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
const SYSTEM_PROMPT = `あなたはLINEリッチメニュー画像のSVGデザイナーです。
ユーザーの指示に基づいて、LINEリッチメニュー用のSVG画像を生成してください。

## 仕様
- LINEリッチメニューは以下のサイズ:
  - full: 2500×1686px
  - half: 2500×843px
- SVGのviewBoxは上記サイズに合わせてください
- ボタン領域を均等に分割し、各領域にラベルテキストを配置
- 背景色はクリニックに相応しい清潔感のあるカラーを使用
- フォントは "Hiragino Sans", "Yu Gothic", sans-serif を指定
- アイコンはSVGの基本図形（rect, circle, path等）で表現

## デザインルール
1. 各ボタン領域は薄い境界線で区切る
2. 各領域の中央にアイコン（SVG図形）とラベルテキストを配置
3. アイコンは直感的に内容を表すシンプルなもの
4. テキストは太字で見やすいサイズ（40-60px）
5. カラーパレットは医療・クリニック向けの落ち着いた配色（青緑系、白系）
6. 角丸は8-16px程度で柔らかい印象に

## 出力形式
SVGコードのみを \`\`\`svg\`\`\` コードブロック内に出力してください。
その後に、各ボタンのラベル一覧をJSON形式で出力してください:
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
    max_tokens: 8192,
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
