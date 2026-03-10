// lib/ai-richmenu-generator.ts — リッチメニュー画像のAI自動生成
import Anthropic from "@anthropic-ai/sdk";
import { getSettingOrEnv } from "@/lib/settings";

/** デザインスタイル */
export type RichMenuStyle = "card" | "gradient" | "banner";

/** レイアウトセル座標 */
export type LayoutCell = {
  x: number;
  y: number;
  w: number;
  h: number;
};

/** AI生成リクエスト */
export type AiRichMenuRequest = {
  prompt: string;
  sizeType: "full" | "half";
  buttonCount: number;
  buttonLabels?: string[];
  style?: RichMenuStyle;
  layoutCells?: LayoutCell[];
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

## アイコンとラベルの配置（最重要）
- **アイコン・ラベル・サブラベルはセル中央にコンパクトにまとめること**
- **アイコンとラベルは絶対に重ならないが、離れすぎもNG**
- 配置パターンは2種類（プロンプトの雰囲気に応じて選択）:
  - **パターンA（アイコン上・ラベル下）**— セル中心を基準にまとめる:
    - アイコン中心Y = セル中心Y - 100px
    - メインラベルY = セル中心Y + 60px
    - サブラベルY = セル中心Y + 105px
  - **パターンB（ラベル上・アイコン下）**— セル中心を基準にまとめる:
    - メインラベルY = セル中心Y - 100px
    - サブラベルY = セル中心Y - 55px
    - アイコン中心Y = セル中心Y + 70px
- アイコンサイズ: 80-120px幅（セルサイズに応じて調整、大きすぎない）
- ラベルのfont-size: メイン 44-56px、サブ 26-34px
- **アイコン下端からラベルまで 40-60px の空白（近すぎず遠すぎず）**

## gap（余白）の均一性（重要）
- **全てのカード間のgapは同じ値（25px）に統一すること**
- 外周の余白もgapと同じ25pxにすること
- 5ボタン（上2大+下3小）の場合も、上下行のgap=25pxを維持

## アイコンデザイン（全スタイル共通）
- ラベルに合った意味のあるアイコンをSVGで描画
- 各アイコンは異なるデザインにすること（全部同じ丸や四角は禁止）
- サイズ: 100-150px幅（セルサイズに応じて調整）
- circle, rect, path, polygon, line 等を組み合わせてリッチに描画
- アイコンの線の太さ: stroke-width 4-6（太すぎず細すぎず）
- アイコン例:
  - 予約/カレンダー: rect枠(上部にヘッダーrect) + 横線グリッド + 小さなチェックcircle
  - 問診/クリップボード: rect枠 + 上部clip rect + 横線3本 + ペンpath（斜め）
  - マイページ/人: circle頭 + ellipse or path 胴体
  - お問合せ/吹き出し: rounded rect + 三角tail + "..." 3つのcircle
  - 料金/価格表: rect枠 + ¥記号text + 横線2本
  - 電話/受話器: path曲線で受話器形状 + 受信波弧線
  - 地図/アクセス: ピンpath（涙型 + 内側circle）
  - 薬/処方: 楕円×2（カプセル） + 分割line
  - ショップ/買い物: 台形バッグ + 持ち手arc
  - クーポン/チケット: rect + 中央の点線 + %やハサミpath
  - ウェブサイト: rect画面 + 内側の小rect群（ブラウザ風）
  - メール: 封筒rect + V字path（フラップ）
  - ニュース/情報: スマホrect + 内側のテキスト線

## 背景テクスチャ・装飾（重要 — プロ品質向上）
背景を単調にしないため、以下の装飾を必要に応じて追加:
- **水彩風**: 大きなcircleを複数配置（opacity 0.05-0.15、異なるサイズと色）
- **リーフ/植物装飾**: 角にpath曲線で葉っぱモチーフ（opacity 0.1-0.2）
- **幾何学パターン**: 細い線の菱形やドットパターン（opacity 0.05-0.1）
- **グラデーションオーバーレイ**: radialGradient で中央に光を入れる
- 装飾は控えめに。アイコンやラベルの可読性を妨げない

## レイアウト計算
- 列幅 = 2500 / 列数
- 行高 = HEIGHT / 行数
- セル中心X = 列幅 × (列index + 0.5)
- セル中心Y = 行高 × (行index + 0.5)

## ボタン数→レイアウト（ユーザー指定がない場合のデフォルト）
- 6個 → 2行3列
- 5個 → 上部2つ大(1250px幅) + 下部3つ小(833px幅)
- 4個 → 2行2列
- 3個 → 1行3列
- 2個 → 1行2列
**重要: ユーザーメッセージにレイアウト座標指定がある場合、それを最優先で厳守すること**

## カラーパレット（プロンプトに応じて最適なものを選択）
- 医療/クリニック系: 背景 #3B82F6系, アイコン #3B82F6
- 美容/サロン系: 背景 #F9A8D4→#FECDD3系, アイコン #EC4899
- ティール/清潔系: 背景 #0D9488→#5EEAD4系, アイコン #0D9488
- ネイビー/高級系: 背景 #1E3A5F→#3B5998系, アイコン #1E3A5F
- グレー/モダン系: 背景 #E5E7EB or #F5F5F4, アイコン #4B5563 or #1F2937
- パステル/やさしい系: 背景 #DBEAFE or #FCE7F3系, アイコン #60A5FA
- ベージュ/ナチュラル系: 背景 #F5F0EB or #E8E0D8系, アイコン #8B7355
- ブラウン/ゴールド系: 背景 #292117 or #3D3024系, アイコン #C4A265（ダーク背景+金色）
- グリーン/ナチュラル系: 背景 #E8F5E9 or #C8E6C9系, アイコン #5C8A5A
- ダーク/モード系: 背景 #1A1A2E or #16213E系, アイコン白 or ネオンカラー

## 出力形式
\`\`\`svg\`\`\` ブロック内にSVGコードのみ。その後:
\`\`\`json
{ "buttonLabels": ["ラベル1", "ラベル2", ...] }
\`\`\``;

const CARD_STYLE_PROMPT = `あなたはLINEリッチメニュー用SVG画像の専門デザイナーです。
**カード型デザイン**を生成します。実在のサロン・クリニック・ホテル・ジムのリッチメニューのようなプロ品質のデザインを目指してください。

## カード型デザインの特徴
- 背景: 単色、グラデーション、またはテクスチャ風（水彩circle重ね等）
- 各ボタンは**独立した角丸カード**
- カードスタイルは3種類（プロンプトの雰囲気で選択）:
  - **ドロップシャドウ型**: 白カード + feDropShadow（モダン・清潔系）
  - **ボーダー型**: 白カード + 細い枠線stroke（エレガント・ナチュラル系）
  - **二重枠型**: カード外側に細い枠 + 内側に太い枠（高級・ホテル系）
- カード間に**余白（gap: 25px）を均一に**確保（外周も25px）
- カード内にアイコン＋メインラベル＋サブラベルを**中央にコンパクトにまとめる**

## カードスタイル別テンプレート

### ドロップシャドウ型カード
<g filter="url(#shadow)">
  <rect x="25" y="25" width="793" height="805" rx="24" fill="white"/>
</g>

### ボーダー型カード（エレガント・ナチュラル系）
<rect x="25" y="25" width="793" height="805" rx="16" fill="white" stroke="#D4C5B0" stroke-width="2"/>

### 二重枠型カード（高級系）
<rect x="25" y="25" width="793" height="805" rx="8" fill="white" stroke="#C4A265" stroke-width="1.5"/>
<rect x="38" y="38" width="767" height="779" rx="6" fill="none" stroke="#C4A265" stroke-width="1"/>

## カード配置の計算（gap=25px 均一）
- 外周余白: 上下左右すべて25px
- **3列**: カード幅 = (2500 - 25×4) / 3 = 800, x: 25, 850, 1675
- **2列**: カード幅 = (2500 - 25×3) / 2 = 1212, x: 25, 1262
- **2行(full)**: カード高 = (1686 - 25×3) / 2 = 805, y: 25, 855
- **1行(full)**: カード高 = 1686 - 50 = 1636, y: 25
- **5ボタン（上2大+下3小）**: 上段 y=25 高さ805, 下段 y=855 高さ805。上段: 幅1212×2列、下段: 幅800×3列

## SVGテンプレート（6ボタン・2行3列・パターンA: アイコン上）
※ カード中心にアイコン→ラベル→サブラベルをまとめて配置

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 1686">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="rgba(0,0,0,0.12)"/>
    </filter>
  </defs>

  <!-- 背景 -->
  <rect width="2500" height="1686" fill="[背景色]"/>

  <!-- カード1 (左上, 幅800×高805, セル中心: 425, 427) -->
  <g filter="url(#shadow)">
    <rect x="25" y="25" width="800" height="805" rx="24" fill="white"/>
  </g>
  <!-- アイコン（セル中心Y 427 - 100 = 327） -->
  <g transform="translate(425,327)">
    <!-- アイコンSVG（80-120px幅） -->
  </g>
  <!-- メインラベル（セル中心Y 427 + 60 = 487） -->
  <text x="425" y="487" text-anchor="middle" fill="#1F2937" font-size="52" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">予約</text>
  <!-- サブラベル（セル中心Y 427 + 105 = 532） -->
  <text x="425" y="532" text-anchor="middle" fill="#9CA3AF" font-size="30" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">RESERVATION</text>

  <!-- カード2 (中央上, セル中心: 1250, 427) -->
  <g filter="url(#shadow)">
    <rect x="850" y="25" width="800" height="805" rx="24" fill="white"/>
  </g>
  <!-- 同じパターンでアイコン・ラベル配置（x=1250, y座標は同じ） -->

  <!-- カード3 (右上, セル中心: 2075, 427) → x=1675 -->
  <!-- カード4 (左下, セル中心: 425, 1257) → y=855 -->
  <!-- カード5 (中央下, セル中心: 1250, 1257) -->
  <!-- カード6 (右下, セル中心: 2075, 1257) -->
</svg>

## SVGテンプレート（パターンB: ラベル上・アイコン下）
※ セル中心(425, 427)の場合:

  <!-- メインラベル（セル中心Y 427 - 100 = 327） -->
  <text x="425" y="327" text-anchor="middle" fill="#1F2937" font-size="48" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">予約</text>
  <!-- サブラベル（セル中心Y 427 - 55 = 372） -->
  <text x="425" y="372" text-anchor="middle" fill="#9CA3AF" font-size="28" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">RESERVATION</text>
  <!-- アイコン（セル中心Y 427 + 70 = 497） -->
  <g transform="translate(425,497)">
    <!-- アイコンSVG -->
  </g>

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
- 背景: 鮮やかなグラデーション + テクスチャ装飾（水彩circle等）
- 各セルは**すりガラス風パネル**（半透明白背景 + 角丸）
- セル間に**細い白ラインまたは透明gap**
- アイコンは白色（アウトライン or 塗り）
- ラベルは白色太字
- ダーク系の場合: 背景は暗い色、カードは半透明黒（opacity 0.2-0.3）

## SVGテンプレート（6ボタン・2行3列の場合）

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 1686">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="[メインカラー]"/>
      <stop offset="100%" stop-color="[サブカラー]"/>
    </linearGradient>
  </defs>

  <!-- 背景グラデーション -->
  <rect width="2500" height="1686" fill="url(#bg)"/>
  <!-- テクスチャ装飾 -->
  <circle cx="500" cy="400" r="300" fill="white" opacity="0.06"/>
  <circle cx="2000" cy="1200" r="350" fill="white" opacity="0.04"/>

  <!-- セルパネル（すりガラス風, セル: 833×843, セル中心: 416, 421） -->
  <rect x="8" y="8" width="821" height="831" rx="16" fill="white" opacity="0.12"/>
  <!-- セル1: アイコン（セル中心421 - 100 = 321） -->
  <g transform="translate(416,321)">
    <circle cx="0" cy="0" r="55" fill="none" stroke="white" stroke-width="5"/>
  </g>
  <!-- セル1: メインラベル（セル中心421 + 60 = 481） -->
  <text x="416" y="481" text-anchor="middle" fill="white" font-size="52" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">ラベル1</text>
  <!-- セル1: サブラベル（セル中心421 + 105 = 526） -->
  <text x="416" y="526" text-anchor="middle" fill="rgba(255,255,255,0.7)" font-size="28" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">LABEL</text>

  <!-- 区切り線 -->
  <line x1="833" y1="20" x2="833" y2="1666" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
  <!-- セル2〜6も同様 -->
</svg>

${COMMON_RULES}`;

const BANNER_STYLE_PROMPT = `あなたはLINEリッチメニュー用SVG画像の専門デザイナーです。
**バナー＋ボタン型デザイン**を生成します。上部に大きなメインビジュアル、下部にボタン列を配置するデザインです。

## バナー型デザインの特徴
- 上部（約55-60%）: 大きなバナーエリア（キャッチコピー＋装飾）
- 下部（約40-45%）: ボタン列（カード型パネルまたはすりガラス風パネル）
- バナーにはキャッチコピーをユーザーの要望に応じて配置
- バナーの装飾: グラデーション背景 + テクスチャ circle/path
- ボタンエリア: 明るい背景（白/薄グレー）+ カードパネル

## レイアウト（fullサイズ: 2500×1686）
- バナーエリア: y=0 〜 y=1000（高さ1000px）
- ボタンエリア: y=1000 〜 y=1686（高さ686px）

## SVGテンプレート（バナー + 下部3ボタン）

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2500 1686">
  <defs>
    <linearGradient id="banner-bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="[メインカラー]"/>
      <stop offset="100%" stop-color="[サブカラー]"/>
    </linearGradient>
    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">
      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="rgba(0,0,0,0.1)"/>
    </filter>
  </defs>

  <!-- バナー背景 -->
  <rect width="2500" height="1000" fill="url(#banner-bg)"/>
  <!-- バナー装飾 -->
  <circle cx="300" cy="200" r="250" fill="white" opacity="0.06"/>
  <circle cx="2200" cy="800" r="300" fill="white" opacity="0.04"/>

  <!-- バナー内キャッチコピー -->
  <text x="1250" y="420" text-anchor="middle" fill="white" font-size="80" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">キャッチコピー</text>
  <text x="1250" y="530" text-anchor="middle" fill="rgba(255,255,255,0.85)" font-size="44" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">サブテキスト</text>
  <!-- CTAボタン風（任意） -->
  <rect x="1050" y="580" width="400" height="70" rx="35" fill="white" opacity="0.9"/>
  <text x="1250" y="625" text-anchor="middle" fill="[メインカラー]" font-size="32" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">予約する ▶</text>

  <!-- ボタンエリア背景 -->
  <rect y="1000" width="2500" height="686" fill="#F8F9FA"/>

  <!-- ボタンカード（3つ横並び, カード高636px, カード中心Y=1343） -->
  <g filter="url(#card-shadow)">
    <rect x="25" y="1025" width="800" height="636" rx="20" fill="white"/>
  </g>
  <!-- カード1: アイコン（カード中心1343 - 80 = 1263） -->
  <g transform="translate(425,1263)">
    <!-- アイコン -->
  </g>
  <!-- カード1: メインラベル（カード中心1343 + 50 = 1393） -->
  <text x="425" y="1393" text-anchor="middle" fill="#1F2937" font-size="44" font-weight="bold" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">ラベル</text>
  <!-- カード1: サブラベル（カード中心1343 + 90 = 1433） -->
  <text x="425" y="1433" text-anchor="middle" fill="#9CA3AF" font-size="26" font-family="'Hiragino Sans','Yu Gothic','Noto Sans JP',sans-serif">LABEL</text>

  <!-- カード2〜3も同様 -->
</svg>

## ボタン数とバナー内ボタン数
- リクエストのボタン数のうち、下部パネルにはmax 4ボタン
- 5個以上の場合: 上部バナー内にも1-2ボタン（大きめカード）を配置
- バナー内ボタン: 半透明白背景の角丸パネル
- 3個以下の場合: バナーエリアを大きく使い（高さ1100px）、ボタンエリアに3列配置

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

  // レイアウトセルが指定されている場合、正確な座標をプロンプトに含める
  let layoutInstruction = "";
  if (request.layoutCells?.length) {
    const gap = 25;
    const cellDescs = request.layoutCells.map((cell, i) => {
      const cardX = cell.x + gap;
      const cardY = cell.y + gap;
      const cardW = cell.w - gap * 2;
      const cardH = cell.h - gap * 2;
      const centerX = cell.x + cell.w / 2;
      const centerY = cell.y + cell.h / 2;
      return `  - カード${i + 1}: rect x=${cardX} y=${cardY} width=${cardW} height=${cardH} / セル中心(${Math.round(centerX)}, ${Math.round(centerY)})`;
    });
    layoutInstruction = `

## 【最重要】レイアウト指定（厳守）
以下の正確なカード座標を使ってください。このレイアウトは絶対に変更しないでください。
バナー型やそれ以外のレイアウトに変えてはいけません。各カードの rect 座標を以下の通り正確に配置してください:

${cellDescs.join("\n")}

- gap=25px（カード間・外周すべて25px）
- 上記の座標を正確に使うこと（独自のレイアウトを作らない）
- カード数は${request.layoutCells.length}個（増減しない）`;
  }

  const userPrompt = `以下の条件でLINEリッチメニュー画像のSVGを生成してください:

- サイズ: ${width}×${height}px（${request.sizeType}）
- ボタン数: ${request.buttonCount}個${labelsHint}
- デザインの要望: ${request.prompt}
${layoutInstruction}

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
