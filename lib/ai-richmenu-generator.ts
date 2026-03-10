// lib/ai-richmenu-generator.ts — リッチメニュー画像のAI自動生成
import Anthropic from "@anthropic-ai/sdk";
import { getSettingOrEnv } from "@/lib/settings";

/** デザインスタイル */
export type RichMenuStyle = "card" | "gradient" | "banner";

/** AI生成リクエスト */
export type AiRichMenuRequest = {
  prompt: string;
  sizeType: "full" | "half";
  buttonCount: number;
  buttonLabels?: string[];
  style?: RichMenuStyle;
};

/** AI生成結果 */
export type AiRichMenuResult = {
  svg: string;
  buttonLabels: string[];
};

// ---------------------------------------------------------------------------
// スタイル別システムプロンプト
// ---------------------------------------------------------------------------

const COMMON_RULES = `## 共通ルール
- viewBox="0 0 2500 HEIGHT" を必ず設定（full: 1686, half: 843）
- 全ての座標・サイズは viewBox 内に収めること（はみ出し禁止）
- font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif" を使うこと
- text要素は必ず text-anchor="middle" で水平中央揃え
- 装飾的な大きなテキスト（"CLINIC"等）や意味のない要素は入れないこと
- SVGの<text>内の日本語テキストは必ずラベル内容と完全一致させること
- filterやgradientのIDは重複しないようユニークにすること

## アイコンとラベルの配置（最重要 — 被り防止）
- **アイコンとラベルは絶対に重ならないこと**
- セル内の垂直配置ルール（セル高さ H の場合）:
  - アイコン中心Y: セル上端 + H × 0.35（セル上部）
  - メインラベルY: セル上端 + H × 0.70（セル下部）
  - サブラベルY: セル上端 + H × 0.82
- アイコンの最大サイズ: セル高さの 25% 以内（H×0.25）
- ラベルのfont-size: メイン 48-56px、サブ 26-32px
- **アイコンの下端（中心Y + radius）とメインラベルのY座標の間に最低 60px の空白を確保**

## アイコンデザイン（全スタイル共通）
- ラベルに合った意味のあるアイコンをSVGで描画
- 各アイコンは異なるデザインにすること（全部同じ丸や四角は禁止）
- サイズ: 100-140px幅（セルサイズに応じて調整）
- circle, rect, path, polygon, line 等を組み合わせてリッチに描画
- アイコン例:
  - 予約/カレンダー: rect枠 + 横線 + チェックマーク
  - 問診/クリップボード: rect枠 + 横線リスト + ペンpath
  - マイページ/人: circle頭 + path胴体
  - お問合せ/吹き出し: rounded rect + "..." ドット
  - 料金/価格表: rect枠 + ¥記号text + 横線
  - 電話: path で受話器形状
  - 地図/アクセス: ピンpath（drop shape + inner circle）
  - 薬/処方: 楕円カプセル + 分割線
  - ショップ/買い物: 台形バッグ + 持ち手arc

## レイアウト計算
- 列幅 = 2500 / 列数
- 行高 = HEIGHT / 行数
- セル中心X = 列幅 × (列index + 0.5)
- セル中心Y = 行高 × (行index + 0.5)

## ボタン数→レイアウト
- 6個 → 2行3列
- 5個 → 上部2つ大(1250px幅) + 下部3つ小(833px幅)
- 4個 → 2行2列
- 3個 → 1行3列
- 2個 → 1行2列

## 出力形式
\`\`\`svg\`\`\` ブロック内にSVGコードのみ。その後:
\`\`\`json
{ "buttonLabels": ["ラベル1", "ラベル2", ...] }
\`\`\``;

const CARD_STYLE_PROMPT = `あなたはLINEリッチメニュー用SVG画像の専門デザイナーです。
**カード型デザイン**を生成します。実在のクリニック・サロンのリッチメニューのようなプロ品質のデザインを目指してください。

## カード型デザインの特徴
- 背景: 単色またはグラデーション（濃いめの色）
- 各ボタンは**独立した角丸カード**（白またはパステル色の背景）
- カード間に**余白（gap: 20-30px）**を確保
- 各カードに**ドロップシャドウ**（filter: drop-shadow）
- カード内にアイコン＋メインラベル（太字・濃色）＋サブラベル（小さめ・グレー）

## SVGテンプレート（6ボタン・2行3列の場合）

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 1686">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.15)"/>
    </filter>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="[背景色1]"/>
      <stop offset="100%" stop-color="[背景色2]"/>
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect width="2500" height="1686" fill="url(#bg)"/>

  <!-- カード1 (位置: 左上, カード高803px) -->
  <g filter="url(#shadow)">
    <rect x="25" y="25" width="793" height="803" rx="24" fill="white"/>
  </g>
  <!-- カード内: 円形アイコン背景（カード上端25 + 803×0.35 = 306） -->
  <circle cx="421" cy="306" r="75" fill="[アクセント色薄]" opacity="0.15"/>
  <!-- カード内: アイコン（アイコン中心 = 306, 下端 = 381） -->
  <g transform="translate(421,306)">
    <!-- ここにアイコンSVG（stroke=[アクセント色], fill=none, stroke-width=5-6） -->
  </g>
  <!-- カード内: メインラベル（カード上端25 + 803×0.70 = 587, アイコン下端から206px空き） -->
  <text x="421" y="587" text-anchor="middle" fill="#1F2937" font-size="52" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">予約</text>
  <!-- カード内: サブラベル（カード上端25 + 803×0.82 = 683） -->
  <text x="421" y="683" text-anchor="middle" fill="#9CA3AF" font-size="32" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">RESERVATION</text>

  <!-- カード2〜6も同様に配置（x,yをグリッドに沿ってずらす） -->
</svg>

## カード配置の計算（gap=25px の場合）
- 3列: カード幅 = (2500 - 25×4) / 3 ≈ 800, x座標: 25, 850, 1675
- 2列: カード幅 = (2500 - 25×3) / 2 ≈ 1212, x座標: 25, 1262
- 2行(full): カード高 = (1686 - 25×3) / 2 ≈ 805, y座標: 25, 855
- 1行(full): カード高 = 1686 - 50 = 1636, y座標: 25

## カラーパレット（プロンプトに応じて選択）
- 医療/クリニック系: 背景 #3B82F6→#60A5FA, アクセント #3B82F6, カード白
- 美容/サロン系: 背景 #EC4899→#F9A8D4, アクセント #EC4899, カード白
- ティール/清潔系: 背景 #0D9488→#5EEAD4, アクセント #0D9488, カード白
- ネイビー/高級系: 背景 #1E3A5F→#3B5998, アクセント #1E3A5F, カード白
- グレー/モダン系: 背景 #E5E7EB(薄グレー), アクセント #4B5563, カード白
- パステル/やさしい系: 背景 #DBEAFE(薄青), アクセント #60A5FA, カード白

## バッジ装飾（任意）
ユーザーが「初診」「NEW」等のバッジを求めた場合、カード角にリボンバッジを配置:
<g transform="translate(カードX, カードY)">
  <polygon points="0,0 120,0 0,120" fill="#EF4444"/>
  <text x="28" y="48" fill="white" font-size="24" font-weight="bold" transform="rotate(-45,60,60)" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">初診</text>
</g>

${COMMON_RULES}`;

const GRADIENT_STYLE_PROMPT = `あなたはLINEリッチメニュー用SVG画像の専門デザイナーです。
**グラデーション型デザイン**を生成します。美しいグラデーション背景にすりガラス風のセル区切りを持つモダンなデザインです。

## グラデーション型デザインの特徴
- 背景: 鮮やかなグラデーション
- 各セルは**すりガラス風パネル**（半透明白背景 + backdrop的表現）
- セル間に**細い白ラインまたは透明gap**
- アイコンは白色（アウトライン or 塗り）
- ラベルは白色太字

## SVGテンプレート（6ボタン・2行3列の場合）

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 1686">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="[メインカラー]"/>
      <stop offset="100%" stop-color="[サブカラー]"/>
    </linearGradient>
    <filter id="blur-bg" x="0" y="0" width="100%" height="100%">
      <feFlood flood-color="white" flood-opacity="0.12" result="white"/>
      <feMerge><feMergeNode in="white"/></feMerge>
    </filter>
  </defs>

  <!-- 背景グラデーション -->
  <rect width="2500" height="1686" fill="url(#bg)"/>

  <!-- セルパネル（すりガラス風, セル高831px） -->
  <rect x="8" y="8" width="821" height="831" rx="16" fill="white" opacity="0.12"/>
  <!-- セル1: アイコン（セル上端8 + 831×0.35 = 299） -->
  <g transform="translate(416,299)">
    <!-- 白アウトラインアイコン -->
    <circle cx="0" cy="0" r="65" fill="none" stroke="white" stroke-width="5"/>
  </g>
  <!-- セル1: メインラベル（セル上端8 + 831×0.70 = 590） -->
  <text x="416" y="590" text-anchor="middle" fill="white" font-size="52" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">ラベル1</text>
  <!-- セル1: サブラベル（セル上端8 + 831×0.82 = 689） -->
  <text x="416" y="689" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="28" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">LABEL</text>

  <!-- 区切り線 -->
  <line x1="833" y1="20" x2="833" y2="1666" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
  <!-- セル2〜6も同様 -->
</svg>

## カラーパレット
- 医療/クリニック系: #0D9488→#2DD4BF（ティール系）
- 美容系: #BE185D→#F472B6（ピンク系）
- エレガント: #1E3A5F→#3B82F6（ブルー系）
- モダン: #1F2937→#4B5563（ダーク系）
- ゴールド: #92400E→#F59E0B（ゴールド系）
- パープル: #6B21A8→#A855F7（パープル系）

${COMMON_RULES}`;

const BANNER_STYLE_PROMPT = `あなたはLINEリッチメニュー用SVG画像の専門デザイナーです。
**バナー＋ボタン型デザイン**を生成します。上部に大きなメインビジュアル、下部にボタン列を配置するデザインです。

## バナー型デザインの特徴
- 上部（約60%）: 大きなバナーエリア（キャッチコピー＋装飾）
- 下部（約40%）: ボタン列（カード型パネル）
- バナーにはキャッチコピーをユーザーの要望に応じて配置
- ボタンはカード型と同じ白パネルスタイル

## レイアウト（fullサイズ: 2500×1686）
- バナーエリア: y=0 〜 y=1000（高さ1000px）
- ボタンエリア: y=1000 〜 y=1686（高さ686px）

## SVGテンプレート（4ボタン + バナーの場合）

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 1686">
  <defs>
    <linearGradient id="banner-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="[メインカラー]"/>
      <stop offset="100%" stop-color="[サブカラー]"/>
    </linearGradient>
    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.12)"/>
    </filter>
  </defs>

  <!-- バナー背景 -->
  <rect width="2500" height="1000" fill="url(#banner-bg)"/>

  <!-- バナー内キャッチコピー -->
  <text x="1250" y="420" text-anchor="middle" fill="white" font-size="80" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">キャッチコピー</text>
  <text x="1250" y="520" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="44" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">サブテキスト</text>

  <!-- 装飾（任意: アイコン、波線、円形等） -->

  <!-- ボタンエリア背景 -->
  <rect y="1000" width="2500" height="686" fill="#F3F4F6"/>

  <!-- ボタンカード（4つ横並び, カード高636px） -->
  <g filter="url(#card-shadow)">
    <rect x="25" y="1025" width="593" height="636" rx="20" fill="white"/>
  </g>
  <!-- カード1: アイコン（カード上端1025 + 636×0.32 = 1228） -->
  <circle cx="321" cy="1228" r="55" fill="[アクセント薄]" opacity="0.12"/>
  <g transform="translate(321,1228)">
    <!-- アイコン -->
  </g>
  <!-- カード1: メインラベル（カード上端1025 + 636×0.70 = 1470） -->
  <text x="321" y="1470" text-anchor="middle" fill="#1F2937" font-size="44" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">ラベル</text>
  <!-- カード1: サブラベル（カード上端1025 + 636×0.84 = 1559） -->
  <text x="321" y="1559" text-anchor="middle" fill="#9CA3AF" font-size="26" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">LABEL</text>

  <!-- カード2〜4も同様 -->
</svg>

## ボタン数とバナー内ボタン数
- リクエストのボタン数のうち、下部パネルにはmax 4ボタン
- 5個以上の場合: 上部バナー内にも1-2ボタン（大きめカード）を配置
- バナー内ボタン: 半透明白背景の角丸パネル
- 3個以下の場合: バナーエリアを大きく使い（高さ1100px）、ボタンエリアに3列配置

## カラーパレット（バナー背景用）
- 医療系: #0EA5E9→#38BDF8（スカイブルー）
- 美容系: #EC4899→#F9A8D4（ピンク）
- 高級感: #1E293B→#334155（ダークネイビー）
- 清潔感: #10B981→#6EE7B7（エメラルド）
- やさしい: #8B5CF6→#C4B5FD（パープル）

${COMMON_RULES}`;

/**
 * スタイルに応じたシステムプロンプトを返す
 */
function getSystemPrompt(style: RichMenuStyle): string {
  switch (style) {
    case "card":
      return CARD_STYLE_PROMPT;
    case "gradient":
      return GRADIENT_STYLE_PROMPT;
    case "banner":
      return BANNER_STYLE_PROMPT;
    default:
      return CARD_STYLE_PROMPT;
  }
}

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
  const style: RichMenuStyle = request.style ?? "card";

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
    system: getSystemPrompt(style),
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
