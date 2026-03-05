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
const SYSTEM_PROMPT = `あなたはプロのUIデザイナーです。LINEリッチメニュー用の高品質なSVG画像を生成してください。

## サイズ仕様
- full: viewBox="0 0 2500 1686"
- half: viewBox="0 0 2500 843"

## デザイン品質の要件（最重要）
完成品として使えるクオリティのSVGを生成してください。ワイヤーフレームや簡素なモックアップは禁止です。

### 背景
- リッチなグラデーション背景を使う（linearGradient / radialGradient）
- 例: 医療系なら深い青緑→明るいティールのグラデーション、美容系ならローズ→ピンク系
- 背景に薄い装飾パターン（円、ドット、波線など）を重ねて奥行きを出す

### レイアウト
- ボタン数に応じて均等にグリッド分割（6個なら2行3列、4個なら2行2列、3個なら1行3列）
- 各ボタン領域は独立したカード風デザイン（角丸rect + ドロップシャドウ風の重ね）
- カード間のギャップは30-50px
- 外周パディングは40-60px

### アイコン（SVGパスで精密に描画）
各ボタンの内容に合った精密なアイコンをSVGのpath要素で描画してください：
- 予約: カレンダーアイコン（日付グリッド付き）
- 問診: クリップボード＋チェックマーク
- 問い合わせ: 吹き出し＋「?」
- 決済/支払い: クレジットカードまたは円マーク
- QA/よくある質問: 「Q」「A」を丸で囲む
- 相談: 2つの吹き出しが重なる形
- 電話: 受話器
- マイページ: 人型アイコン＋歯車
- アクセス: 地図ピン
- クーポン: チケット/切符型
アイコンサイズは各カード幅の30-40%、中央上部に配置。

### テキスト
- フォント: "Hiragino Sans", "Yu Gothic", "Noto Sans JP", sans-serif
- ラベル: font-weight="bold" font-size="48-56"、アイコンの下に配置
- 色はカード背景に対して十分なコントラストを確保（白背景なら濃いグレー/黒）
- text-anchor="middle" で中央揃え

### カラーパレット例
- 医療系: #0F766E(深いティール), #14B8A6(ティール), #CCFBF1(薄いミント), #FFFFFF
- 美容系: #9F1239(ローズ), #FB7185(ピンク), #FFF1F2(薄いピンク), #FFFFFF
- モダン: #1E40AF(ディープブルー), #3B82F6(ブルー), #DBEAFE(ライトブルー), #FFFFFF
- ユーザーの指示に合わせて適切なパレットを選択

### SVG技術要件
- <defs>でgradient、filterを定義して再利用
- ドロップシャドウ: <filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.15"/></filter>
- テキストには必ず dominant-baseline="central" を設定
- 不要な空白やコメントは含めない

## 出力形式
\`\`\`svg\`\`\` コードブロック内にSVGコードのみ出力。
その後に:
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
