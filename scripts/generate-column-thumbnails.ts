/**
 * コラム記事サムネイル一括生成スクリプト
 *
 * Step 1: Imagen 4.0 で背景画像を生成
 * Step 2: Sharp + SVG でタイトル・カテゴリをオーバーレイ合成
 *
 * 使い方:
 *   npx tsx scripts/generate-column-thumbnails.ts
 *   npx tsx scripts/generate-column-thumbnails.ts --start 50
 *   npx tsx scripts/generate-column-thumbnails.ts --dry-run
 *   npx tsx scripts/generate-column-thumbnails.ts --test
 *   npx tsx scripts/generate-column-thumbnails.ts --test --start 5  # 5番目の記事でテスト
 *
 * 生成先: public/lp/column/thumbnails/{slug}.png
 */

import fs from "fs";
import path from "path";
import sharp from "sharp";
import { articles } from "../app/lp/column/articles";

/* ─── 設定 ─── */
const OUTPUT_DIR = path.join(process.cwd(), "public/lp/column/thumbnails");
const BG_DIR = path.join(OUTPUT_DIR, "_backgrounds");
const W = 1200;
const H = 630;
const DELAY_MS = 1500;
const IMAGEN_MODEL = "imagen-4.0-fast-generate-001";
const LOGO_PATH = path.join(process.cwd(), "icon.png");

/* ─── .env.local ロード ─── */
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.+)$/);
      if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim();
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   カテゴリ別デザイン
   ═══════════════════════════════════════════════════════════════════════ */
interface CategoryDesign {
  /** 背景画像のプロンプト補足 */
  bgHint: string;
  /** オーバーレイグラデーション */
  overlay: string;
  /** カテゴリバッジ背景色 */
  badgeBg: string;
  /** カテゴリバッジ文字色 */
  badgeText: string;
  /** タイトル文字色（1つ目） */
  titleColor: string;
  /** タイトル2つ目の色（ — 区切り後半） */
  titleAccent: string;
  /** サブタイトル文字色 */
  subColor: string;
}

const categoryDesign: Record<string, CategoryDesign> = {
  活用事例: {
    bgHint: "modern office reception with smartphone and chat interface, blue tones",
    overlay: "rgba(15,23,42,0.72)",
    badgeBg: "#3b82f6", badgeText: "#ffffff",
    titleColor: "#ffffff", titleAccent: "#7dd3fc", subColor: "#cbd5e1",
  },
  ツール比較: {
    bgHint: "comparison of digital tools on desk, multiple screens, violet tones",
    overlay: "rgba(15,23,42,0.72)",
    badgeBg: "#8b5cf6", badgeText: "#ffffff",
    titleColor: "#ffffff", titleAccent: "#c4b5fd", subColor: "#c4b5fd",
  },
  ガイド: {
    bgHint: "tablet showing step by step guide, clean workspace, sky blue tones",
    overlay: "rgba(15,23,42,0.70)",
    badgeBg: "#0ea5e9", badgeText: "#ffffff",
    titleColor: "#ffffff", titleAccent: "#7dd3fc", subColor: "#bae6fd",
  },
  業務改善: {
    bgHint: "efficient modern office with digital screens, organized workspace, teal tones",
    overlay: "rgba(15,23,42,0.72)",
    badgeBg: "#0891b2", badgeText: "#ffffff",
    titleColor: "#ffffff", titleAccent: "#67e8f9", subColor: "#a5f3fc",
  },
  マーケティング: {
    bgHint: "digital marketing dashboard, growth charts, indigo purple tones",
    overlay: "rgba(15,23,42,0.72)",
    badgeBg: "#6366f1", badgeText: "#ffffff",
    titleColor: "#ffffff", titleAccent: "#a5b4fc", subColor: "#c7d2fe",
  },
  経営戦略: {
    bgHint: "strategic business planning scene, financial charts, warm rose tones",
    overlay: "rgba(15,23,42,0.72)",
    badgeBg: "#f43f5e", badgeText: "#ffffff",
    titleColor: "#ffffff", titleAccent: "#fda4af", subColor: "#fecdd3",
  },
  運営ノウハウ: {
    bgHint: "bright meeting room with team collaboration, warm amber lighting",
    overlay: "rgba(15,23,42,0.72)",
    badgeBg: "#f59e0b", badgeText: "#1e293b",
    titleColor: "#ffffff", titleAccent: "#fbbf24", subColor: "#fde68a",
  },
  "開業・経営": {
    bgHint: "new business opening with modern interior, blueprints, cyan tones",
    overlay: "rgba(15,23,42,0.72)",
    badgeBg: "#06b6d4", badgeText: "#ffffff",
    titleColor: "#ffffff", titleAccent: "#67e8f9", subColor: "#a5f3fc",
  },
  エビデンス解説: {
    bgHint: "scientific data visualization, research documents, green tones",
    overlay: "rgba(15,23,42,0.72)",
    badgeBg: "#10b981", badgeText: "#ffffff",
    titleColor: "#ffffff", titleAccent: "#6ee7b7", subColor: "#a7f3d0",
  },
  収益モデル: {
    bgHint: "revenue dashboard, financial planning charts, orange warm tones",
    overlay: "rgba(15,23,42,0.72)",
    badgeBg: "#f97316", badgeText: "#ffffff",
    titleColor: "#ffffff", titleAccent: "#fdba74", subColor: "#fed7aa",
  },
};

const defaultDesign: CategoryDesign = {
  bgHint: "modern professional workspace with digital technology, blue tones",
  overlay: "rgba(15,23,42,0.72)",
  badgeBg: "#3b82f6", badgeText: "#ffffff",
  titleColor: "#ffffff", titleAccent: "#7dd3fc", subColor: "#cbd5e1",
};

/* ═══════════════════════════════════════════════════════════════════════
   レイアウトテンプレート（ランダム選択）
   ═══════════════════════════════════════════════════════════════════════ */
type LayoutType = "center" | "left-bottom" | "left-top";

function getRandomLayout(index: number): LayoutType {
  const layouts: LayoutType[] = ["center", "left-bottom", "left-top"];
  return layouts[index % layouts.length];
}

/* ═══════════════════════════════════════════════════════════════════════
   タイトル折り返し処理
   ═══════════════════════════════════════════════════════════════════════ */
function wrapTitle(title: string, maxChars: number): string[] {
  // ダッシュ区切りを優先して分割
  const segments = title.includes(" — ") ? title.split(" — ") : [title];
  const lines: string[] = [];
  for (const seg of segments) {
    if (seg.length <= maxChars) {
      lines.push(seg);
    } else {
      lines.push(...wrapText(seg, maxChars));
    }
  }
  return lines;
}

/** 半角文字を0.5文字としてカウント（半角は幅が狭い） */
function measureWidth(text: string): number {
  let w = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0) || 0;
    w += (code <= 0x7f) ? 0.6 : 1;
  }
  return w;
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let remaining = text;
  while (measureWidth(remaining) > maxChars) {
    let breakAt = -1;

    // 複合助詞（2文字以上）を分断しないためのチェック
    // 「から」「まで」「より」「など」「って」「ため」「だけ」「ほど」「けど」等
    const multiParticles = ["から", "まで", "より", "など", "って", "ため", "だけ", "ほど", "けど", "ので", "のに", "ても", "では", "には", "とは", "かも", "だが", "ただ", "した", "する", "して", "され", "させ", "できる", "について", "における", "として", "によって", "に対して"];

    /** 位置iで切断すると複合助詞が分断されるか */
    function wouldSplitParticle(text: string, pos: number): boolean {
      for (const p of multiParticles) {
        for (let offset = 1; offset < p.length; offset++) {
          // 助詞がpos-offset..pos-offset+p.lengthに跨がっている場合
          const start = pos - offset;
          if (start >= 0 && text.slice(start, start + p.length) === p) {
            return true;
          }
        }
      }
      return false;
    }

    // 切断可能な最大文字位置を探す（measureWidthベース）
    let maxPos = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      if (measureWidth(remaining.slice(0, i + 1)) > maxChars) { maxPos = i; break; }
    }
    const minPos = Math.floor(maxPos * 0.35);

    // 優先1: 半角スペースで切る（「vs 」「for 」等の区切り）
    for (let i = maxPos; i >= minPos; i--) {
      if (remaining[i] === " ") {
        breakAt = i + 1;
        break;
      }
    }

    // 優先2a: 句読点・記号の後ろで切る（中黒以外）
    if (breakAt === -1) {
      const symbols = ["、", "。", "―", "–", "）", "」", "！", "？"];
      for (let i = maxPos; i >= minPos; i--) {
        if (symbols.includes(remaining[i]) && !wouldSplitParticle(remaining, i + 1)) {
          breakAt = i + 1;
          break;
        }
      }
    }

    // 優先2b: 中黒（・）で切る — ただし行が短くなりすぎる場合はスキップ
    if (breakAt === -1) {
      for (let i = maxPos; i >= minPos; i--) {
        if (remaining[i] === "・" && !wouldSplitParticle(remaining, i + 1)) {
          const lineW = measureWidth(remaining.slice(0, i + 1));
          if (lineW >= maxChars * 0.6) {
            breakAt = i + 1;
            break;
          }
        }
      }
    }

    // 優先3: 複合助詞の直後で切る（「から」「まで」「より」等の後ろ）
    if (breakAt === -1) {
      for (let i = maxPos; i >= minPos; i--) {
        for (const p of multiParticles) {
          if (i >= p.length && remaining.slice(i - p.length, i) === p) {
            breakAt = i;
            break;
          }
        }
        if (breakAt !== -1) break;
      }
    }

    // 優先4: 1文字助詞の後ろで切る（分断チェック付き）
    if (breakAt === -1) {
      const particles = ["の", "を", "に", "で", "と", "が", "は", "も", "へ", "や"];
      for (let i = maxPos; i >= minPos; i--) {
        if (particles.includes(remaining[i]) && !wouldSplitParticle(remaining, i + 1)) {
          breakAt = i + 1;
          break;
        }
      }
    }

    // 優先5: カタカナ→漢字等の文字種変化で切る（分断チェック付き）
    if (breakAt === -1) {
      for (let i = maxPos; i >= minPos; i--) {
        const curr = charType(remaining[i]);
        const next = i + 1 < remaining.length ? charType(remaining[i + 1]) : curr;
        if (curr !== next && curr !== "other" && next !== "other" && !wouldSplitParticle(remaining, i + 1)) {
          breakAt = i + 1;
          break;
        }
      }
    }

    if (breakAt === -1) breakAt = maxPos;
    lines.push(remaining.slice(0, breakAt));
    remaining = remaining.slice(breakAt);
  }
  if (remaining) lines.push(remaining);
  return lines;
}

/** 文字種判定 */
function charType(ch: string): "hiragana" | "katakana" | "kanji" | "ascii" | "other" {
  const code = ch.codePointAt(0) || 0;
  if (code >= 0x3040 && code <= 0x309f) return "hiragana";
  if (code >= 0x30a0 && code <= 0x30ff) return "katakana";
  if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) return "kanji";
  if (code >= 0x0041 && code <= 0x007a) return "ascii";
  return "other";
}

/** 孤立行防止付きの折り返し — 最終行が短すぎる場合はmaxCharsを下げて再分配 */
function wrapTextNoOrphan(text: string, maxChars: number): string[] {
  if (measureWidth(text) <= maxChars) return [text];
  let trial = wrapText(text, maxChars);
  let tryMax = maxChars;
  // 最終行が5文字未満の孤立行 → maxCharsを1ずつ下げて早めに改行させる
  while (trial.length > 1 && measureWidth(trial[trial.length - 1]) < 5 && tryMax > maxChars - 3) {
    tryMax -= 1;
    trial = wrapText(text, tryMax);
  }
  return trial;
}

/** 句点・読点で自然に切る（「…」を出さない） */
function truncateAtSentence(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  // 句点「。」で切れる位置を探す
  for (let i = maxLen; i >= maxLen * 0.5; i--) {
    if (text[i] === "。") return text.slice(0, i + 1);
  }
  // 読点「、」で切れる位置を探す
  for (let i = maxLen; i >= maxLen * 0.5; i--) {
    if (text[i] === "、") return text.slice(0, i + 1);
  }
  // 助詞の後ろで切る
  const particles = ["の", "を", "に", "で", "と", "が", "は", "も"];
  for (let i = maxLen; i >= maxLen * 0.5; i--) {
    if (particles.includes(text[i])) return text.slice(0, i + 1);
  }
  return text.slice(0, maxLen);
}

/* ═══════════════════════════════════════════════════════════════════════
   SVGテキストオーバーレイ生成
   ═══════════════════════════════════════════════════════════════════════ */
function escXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildOverlaySvg(
  article: (typeof articles)[0],
  layout: LayoutType,
  design: CategoryDesign,
  hasLogo: boolean,
): string {
  // タイトルを — 区切りで2パートに分割（色分け用）
  const hasDash = article.title.includes(" — ");
  const [part1, part2] = hasDash ? article.title.split(" — ") : [article.title, ""];
  const PADDING = 48; // 左右の余白
  const maxWidth = W - PADDING * 2; // テキストが使える最大幅

  // まず行分割（1行あたり18文字目安）＋孤立行防止
  const maxChars = layout === "center" ? 18 : 17;
  const part1Lines = wrapTextNoOrphan(part1, maxChars);
  const part1LineCount = part1Lines.length;

  // part2: 孤立行（最終行が短すぎ）防止 — maxCharsを下げて早めに改行させる
  let part2Lines: string[] = [];
  if (part2) {
    part2Lines = wrapTextNoOrphan(part2, maxChars);
  }

  const titleLines = [...part1Lines, ...part2Lines];

  // フォントサイズ: 行数ベースで決定した後、幅に収まるか検証して縮小
  let titleFontSize = titleLines.length > 4 ? 50 : titleLines.length > 3 ? 56 : titleLines.length > 2 ? 62 : 70;
  const longestLine = titleLines.reduce((max, line) => {
    const w = measureWidth(line);
    return w > max ? w : max;
  }, 0);
  const estimatedWidth = longestLine * titleFontSize;
  if (estimatedWidth > maxWidth) {
    titleFontSize = Math.floor(maxWidth / longestLine);
  }
  if (titleFontSize < 36) titleFontSize = 36;

  const lineHeight = titleFontSize * 1.35;

  // ロゴ+ブランド名は左上固定（高さ120px確保）
  const contentTop = 130;

  // レイアウト別の座標
  let badgeX: number, badgeY: number;
  let titleX: number, titleStartY: number;
  let descX: number, descY: number;
  let textAnchor: string;

  // テキスト全体の高さ（バッジ + 間隔 + タイトル行）
  const totalTextH = 56 + 44 + titleLines.length * lineHeight;
  const maxContentH = H - contentTop - 30; // 上下余白を確保

  switch (layout) {
    case "left-bottom":
      badgeX = PADDING; badgeY = Math.max(contentTop + 10, H - 30 - totalTextH);
      titleX = PADDING; titleStartY = badgeY + 100;
      descX = PADDING; descY = titleStartY + titleLines.length * lineHeight + 16;
      textAnchor = "start";
      break;
    case "left-top":
      badgeX = PADDING; badgeY = contentTop + 20;
      titleX = PADDING; titleStartY = badgeY + 100;
      descX = PADDING; descY = titleStartY + titleLines.length * lineHeight + 16;
      textAnchor = "start";
      break;
    case "center":
    default:
      badgeX = W / 2; badgeY = Math.max(contentTop + 10, H / 2 - totalTextH / 2);
      titleX = W / 2; titleStartY = badgeY + 100;
      descX = W / 2; descY = titleStartY + titleLines.length * lineHeight + 16;
      textAnchor = "middle";
      break;
  }

  // バッジ幅の計算（2倍サイズ）
  const badgeTextLen = article.category.length;
  const badgeW = badgeTextLen * 30 + 48;
  const badgeH = 56;
  const badgeRx = badgeX - (textAnchor === "middle" ? badgeW / 2 : 0);

  const titleShadow = `style="filter: drop-shadow(0 4px 16px rgba(0,0,0,0.8)) drop-shadow(0 1px 4px rgba(0,0,0,0.5))"`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@500;700;900&amp;display=swap');
      .title { font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif; font-weight: 900; }
      .badge { font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif; font-weight: 700; }
      .desc { font-family: 'Noto Sans JP', 'Hiragino Sans', sans-serif; font-weight: 500; }
    </style>
  </defs>

  <!-- オーバーレイ -->
  <rect width="${W}" height="${H}" fill="${design.overlay}" />

  <!-- カテゴリバッジ（2倍サイズ） -->
  <rect x="${badgeRx}" y="${badgeY - 36}" width="${badgeW}" height="${badgeH}" rx="28" fill="${design.badgeBg}" />
  <text x="${badgeRx + badgeW / 2}" y="${badgeY + 2}" text-anchor="middle" class="badge" font-size="28" fill="${design.badgeText}">${escXml(article.category)}</text>

  <!-- タイトル（パート1: メインカラー / パート2: アクセントカラー） -->
  <g ${titleShadow}>
    ${titleLines
      .map(
        (line, i) => {
          const color = i < part1LineCount ? design.titleColor : design.titleAccent;
          return `<text x="${titleX}" y="${titleStartY + i * lineHeight}" text-anchor="${textAnchor}" class="title" font-size="${titleFontSize}" fill="${color}">${escXml(line)}</text>`;
        },
      )
      .join("\n    ")}
  </g>

  <!-- ブランド名（左上） -->
  <text x="120" y="72" text-anchor="start" class="badge" font-size="45" fill="${design.titleColor}" opacity="0.9">Lオペ for CLINIC</text>
</svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════
   トピックヒント（安全フィルター回避済み）
   ═══════════════════════════════════════════════════════════════════════ */
function getTopicHints(slug: string): string {
  const hints: Record<string, string> = {
    line: "LINE chat app for business",
    dx: "digital transformation",
    crm: "CRM software dashboard",
    kpi: "KPI dashboard and analytics",
    seo: "search engine optimization",
    reservation: "appointment booking system",
    "no-show": "reducing missed appointments",
    segment: "customer segmentation",
    "rich-menu": "mobile app rich menu",
    ai: "AI-powered automation",
    questionnaire: "digital intake form",
    beauty: "beauty and wellness salon",
    dermatology: "skincare consultation",
    dental: "modern dental office",
    pediatric: "children's care",
    eye: "vision care center",
    orthopedic: "rehabilitation center",
    internal: "wellness office",
    online: "online consultation",
    aga: "hair care wellness",
    glp1: "weight management",
    pill: "women's wellness",
    afterpill: "women's health",
    diet: "weight management nutrition",
    insomnia: "sleep improvement",
    "hay-fever": "seasonal allergy",
    snoring: "sleep quality",
    cpap: "sleep device",
    beauty: "beauty salon",
    opening: "new business opening",
    revenue: "revenue planning",
    management: "business strategy",
    staff: "team management",
    payment: "payment system",
    shipping: "delivery logistics",
    prescription: "order management",
    repeat: "customer retention",
    ltv: "lifetime value",
    marketing: "digital marketing",
    campaign: "seasonal campaign",
    google: "Google reviews",
    instagram: "Instagram marketing",
    cost: "cost reduction",
    referral: "referral program",
    compliance: "advertising compliance",
    security: "data security",
    analytics: "data analytics",
    record: "electronic records",
    insurance: "business model comparison",
    succession: "business succession",
    tax: "tax planning",
    corporation: "corporate setup",
  };
  const matched: string[] = [];
  for (const [key, hint] of Object.entries(hints)) {
    if (slug.includes(key)) matched.push(hint);
  }
  return matched.length > 0 ? matched.slice(0, 3).join(", ") : "modern professional workspace";
}

/** タイトルから英語の画像プロンプトヒントを生成 */
function translateTitleHint(title: string, slug: string): string {
  // slug のキーワードからトピックを組み立て、タイトルの意味をカバー
  const topicParts = getTopicHints(slug);

  // タイトル中の主要キーワードを英訳マッピング
  const kwMap: [RegExp, string][] = [
    [/LINE公式アカウント/, "LINE official business account messaging"],
    [/クリニック/, "modern clinic"],
    [/DX|デジタル/, "digital transformation"],
    [/AI|自動返信/, "AI automated reply system"],
    [/予約/, "appointment booking calendar"],
    [/問診/, "digital questionnaire form"],
    [/カルテ|電子カルテ/, "electronic records on tablet"],
    [/配信|メッセージ/, "message broadcasting"],
    [/リッチメニュー/, "smartphone app menu interface"],
    [/美容/, "aesthetic beauty salon"],
    [/歯科/, "modern dental office"],
    [/皮膚科/, "dermatology skincare"],
    [/小児科/, "pediatric children care"],
    [/眼科/, "eye care vision center"],
    [/整形外科/, "rehabilitation orthopedic"],
    [/内科/, "internal wellness office"],
    [/オンライン診療/, "online video consultation on laptop"],
    [/AGA|薄毛/, "hair care treatment"],
    [/GLP-?1|ダイエット|肥満/, "weight management fitness"],
    [/ピル|婦人科/, "women health wellness"],
    [/アフターピル/, "women health consultation"],
    [/性病|STD/, "health screening lab"],
    [/不眠|睡眠/, "peaceful sleep wellness bedroom"],
    [/花粉症|アレルギー/, "spring nature allergy season"],
    [/いびき|CPAP|無呼吸/, "sleep quality monitoring device"],
    [/ED/, "men vitality wellness"],
    [/経営|戦略/, "business strategy planning meeting"],
    [/開業/, "new clinic grand opening"],
    [/収益|売上/, "revenue growth chart dashboard"],
    [/コスト|費用削減/, "cost reduction efficiency"],
    [/マーケティング|集患/, "digital marketing growth funnel"],
    [/SEO|Google/, "search engine and Google interface"],
    [/Instagram/, "Instagram social media marketing"],
    [/TikTok|YouTube/, "social media video content"],
    [/スタッフ|教育/, "team training collaborative meeting"],
    [/決済|支払/, "digital payment checkout system"],
    [/発送|配送/, "delivery logistics package shipping"],
    [/追跡/, "delivery tracking notification"],
    [/セグメント/, "customer data segmentation dashboard"],
    [/リピート|再診/, "customer loyalty repeat visit"],
    [/LTV/, "customer lifetime value chart"],
    [/CRM/, "CRM customer management dashboard"],
    [/KPI|ダッシュボード/, "KPI analytics dashboard"],
    [/キャンペーン/, "seasonal promotional campaign"],
    [/紹介/, "customer referral word of mouth"],
    [/NPS|満足度/, "customer satisfaction survey results"],
    [/セキュリティ/, "data security protection shield"],
    [/コンプライアンス|広告規制|薬機法/, "legal compliance documents"],
    [/口コミ/, "online reviews and ratings stars"],
    [/ブロック率/, "notification message management"],
    [/データ移行/, "data migration cloud server"],
    [/保険|自費/, "business model insurance comparison"],
    [/承継|事業承継/, "business succession handover"],
    [/税|資産/, "financial tax asset planning"],
    [/法人|MS法人/, "corporate structure organization"],
    [/漢方|サプリ/, "herbal supplement wellness"],
    [/点滴|注射/, "IV drip wellness treatment"],
    [/脂肪溶解/, "body contouring aesthetic"],
    [/多汗症/, "comfort wellness solution"],
    [/高血圧/, "cardiovascular health monitoring"],
    [/喘息/, "respiratory wellness"],
    [/メンタル/, "mental wellness mindfulness"],
    [/生活習慣病/, "lifestyle health management"],
    [/フェムテック/, "femtech women health technology"],
    [/アトピー/, "skincare dermal wellness"],
    [/ヘルペス/, "skincare consultation"],
    [/PMS/, "women cycle wellness"],
    [/ノーコード|業務改善/, "efficient streamlined workflow"],
    [/比較/, "side by side comparison"],
    [/ガイド|完全ガイド/, "step by step guide tutorial"],
    [/エビデンス/, "scientific evidence research data"],
  ];

  const matched: string[] = [];
  for (const [re, en] of kwMap) {
    if (re.test(title)) matched.push(en);
  }

  if (matched.length > 0) {
    return matched.slice(0, 3).join(", ");
  }

  // フォールバック: slugベースのヒント
  return topicParts;
}

/* ═══════════════════════════════════════════════════════════════════════
   Imagen 4.0 背景画像生成
   ═══════════════════════════════════════════════════════════════════════ */
async function generateBackground(article: (typeof articles)[0], design: CategoryDesign): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY が設定されていません");

  // タイトルを英訳してプロンプトに直接反映
  const titleEn = translateTitleHint(article.title, article.slug);
  const prompt = [
    `Professional blog thumbnail background image about: ${titleEn}.`,
    `Visual mood: ${design.bgHint}`,
    `Style: High quality photograph or realistic 3D render, vibrant colors, modern and clean aesthetic.`,
    `Absolutely no text, no letters, no words, no UI elements, no watermarks.`,
    `The image should clearly represent the topic visually.`,
  ].join(" ");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${IMAGEN_MODEL}:predict?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "16:9" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Imagen API (${res.status}): ${err}`);
  }

  const data = (await res.json()) as {
    predictions?: Array<{ bytesBase64Encoded: string }>;
  };
  if (!data.predictions?.length) throw new Error("画像データなし");

  return Buffer.from(data.predictions[0].bytesBase64Encoded, "base64");
}

/* ═══════════════════════════════════════════════════════════════════════
   合成処理
   ═══════════════════════════════════════════════════════════════════════ */
async function composeThumbnail(
  bgBuffer: Buffer,
  article: (typeof articles)[0],
  layout: LayoutType,
  design: CategoryDesign,
): Promise<Buffer> {
  const hasLogo = fs.existsSync(LOGO_PATH);

  // 背景をリサイズ
  const bg = sharp(bgBuffer).resize(W, H, { fit: "cover" });

  // SVGオーバーレイ
  const svgStr = buildOverlaySvg(article, layout, design, hasLogo);
  const svgBuffer = Buffer.from(svgStr);

  const layers: sharp.OverlayOptions[] = [{ input: svgBuffer, top: 0, left: 0 }];

  // ロゴアイコン（左上・角丸）— 2.5倍サイズ
  if (hasLogo) {
    const size = 80;
    const radius = 20;
    const rawLogo = await sharp(LOGO_PATH).resize(size, size, { fit: "cover" }).png().toBuffer();
    // 角丸マスク
    const roundedMask = Buffer.from(
      `<svg width="${size}" height="${size}"><rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/></svg>`
    );
    const logoBuffer = await sharp(rawLogo)
      .composite([{ input: roundedMask, blend: "dest-in" }])
      .png()
      .toBuffer();
    layers.push({ input: logoBuffer, top: 24, left: 24 });
  }

  return bg.composite(layers).png({ quality: 90 }).toBuffer();
}

/* ─── ユーティリティ ─── */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════════════════
   メイン
   ═══════════════════════════════════════════════════════════════════════ */
async function main() {
  loadEnv();

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const testMode = args.includes("--test");
  const forceMode = args.includes("--force");
  const startIdx = args.includes("--start")
    ? parseInt(args[args.indexOf("--start") + 1], 10)
    : 0;

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(BG_DIR, { recursive: true });

  const target = testMode ? [articles[startIdx]] : articles.slice(startIdx);

  console.log(`\n📸 コラムサムネイル一括生成`);
  console.log(`   対象: ${target.length}件${testMode ? "（テスト）" : ""}`);
  console.log(`   出力: ${OUTPUT_DIR}`);
  console.log(`   モデル: ${IMAGEN_MODEL}`);
  if (dryRun) console.log(`   ⚠️  ドライラン`);
  console.log("");

  let success = 0, failed = 0;
  const errors: Array<{ slug: string; error: string }> = [];

  for (let i = 0; i < target.length; i++) {
    const article = target[i];
    const idx = startIdx + i;
    const outPath = path.join(OUTPUT_DIR, `${article.slug}.png`);

    if (fs.existsSync(outPath) && !forceMode && !testMode) {
      console.log(`  [${idx + 1}/${articles.length}] ⏭️  ${article.slug}`);
      success++;
      continue;
    }

    const design = categoryDesign[article.category] || defaultDesign;
    const layout = getRandomLayout(idx);

    if (dryRun) {
      console.log(`  [${idx + 1}/${articles.length}] ${article.slug} (${layout})`);
      console.log(`    ${article.category}: ${article.title.slice(0, 40)}...`);
      continue;
    }

    try {
      // Step 1: 背景生成（キャッシュあればスキップ）
      const bgPath = path.join(BG_DIR, `${article.slug}.png`);
      let bgBuffer: Buffer;
      if (fs.existsSync(bgPath)) {
        bgBuffer = fs.readFileSync(bgPath);
        console.log(`  [${idx + 1}/${articles.length}] 📁 背景キャッシュ使用 ${article.slug}`);
      } else {
        console.log(`  [${idx + 1}/${articles.length}] 🎨 背景生成中... ${article.slug}`);
        bgBuffer = await generateBackground(article, design);
        fs.writeFileSync(bgPath, bgBuffer);
      }

      // Step 2: テキスト合成
      console.log(`  [${idx + 1}/${articles.length}] 🔤 テキスト合成中... ${article.slug} (${layout})`);
      const result = await composeThumbnail(bgBuffer, article, layout, design);
      fs.writeFileSync(outPath, result);
      console.log(`  [${idx + 1}/${articles.length}] ✅ ${article.slug} (${(result.length / 1024).toFixed(0)}KB)`);
      success++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [${idx + 1}/${articles.length}] ❌ ${article.slug}: ${msg}`);
      errors.push({ slug: article.slug, error: msg });
      failed++;
    }

    if (i < target.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n── 完了 ──`);
  console.log(`  成功: ${success} / 失敗: ${failed} / 合計: ${target.length}`);

  if (errors.length > 0) {
    const logPath = path.join(OUTPUT_DIR, "_errors.json");
    fs.writeFileSync(logPath, JSON.stringify(errors, null, 2));
    console.log(`  エラーログ: ${logPath}`);
  }
}

main().catch(console.error);
