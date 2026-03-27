import { ImageResponse } from "next/og";

/** コラム記事OGP画像の共通サイズ */
export const ogpSize = { width: 1200, height: 630 };

/** カテゴリごとのアクセントカラー */
const categoryColors: Record<string, { bg: string; text: string; dot: string }> = {
  "活用事例": { bg: "rgba(16,185,129,0.1)", text: "#047857", dot: "#10b981" },
  "ツール比較": { bg: "rgba(168,85,247,0.1)", text: "#7c3aed", dot: "#a855f7" },
  "比較": { bg: "rgba(168,85,247,0.1)", text: "#7c3aed", dot: "#a855f7" },
  "ガイド": { bg: "rgba(59,130,246,0.1)", text: "#1d4ed8", dot: "#3b82f6" },
  "業務改善": { bg: "rgba(245,158,11,0.1)", text: "#b45309", dot: "#f59e0b" },
  "マーケティング": { bg: "rgba(236,72,153,0.1)", text: "#be185d", dot: "#ec4899" },
  "経営戦略": { bg: "rgba(244,63,94,0.1)", text: "#be123c", dot: "#f43f5e" },
  "運営ノウハウ": { bg: "rgba(245,158,11,0.1)", text: "#b45309", dot: "#f59e0b" },
  "開業・経営": { bg: "rgba(6,182,212,0.1)", text: "#0e7490", dot: "#06b6d4" },
  "医薬品解説": { bg: "rgba(13,148,136,0.1)", text: "#0f766e", dot: "#0d9488" },
  "エビデンス解説": { bg: "rgba(16,185,129,0.1)", text: "#047857", dot: "#10b981" },
  "収益モデル": { bg: "rgba(249,115,22,0.1)", text: "#c2410c", dot: "#f97316" },
};

const defaultColor = { bg: "rgba(59,130,246,0.1)", text: "#1d4ed8", dot: "#3b82f6" };

/**
 * コラム記事用OGP ImageResponse を生成する共通関数
 */
export function generateColumnOGP(params: {
  title: string;
  category: string;
  description: string;
}): ImageResponse {
  const { title, category, description } = params;
  const color = categoryColors[category] ?? defaultColor;

  // タイトルが長い場合のフォントサイズ調整
  const titleFontSize = title.length > 30 ? (title.length > 45 ? 32 : 38) : 44;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background:
            "linear-gradient(135deg, #eff6ff 0%, #ffffff 40%, #f0f9ff 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景装飾 */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "rgba(59, 130, 246, 0.08)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(14, 165, 233, 0.06)",
          }}
        />

        {/* ロゴテキスト（左上） */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 40,
            fontSize: 20,
            fontWeight: 700,
            color: "#3b82f6",
            display: "flex",
          }}
        >
          Lオペ for CLINIC
        </div>

        {/* コラムラベル（右上） */}
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 40,
            fontSize: 16,
            fontWeight: 600,
            color: "#94a3b8",
            display: "flex",
          }}
        >
          COLUMN
        </div>

        {/* メインコンテンツ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            zIndex: 1,
            maxWidth: 1040,
            padding: "0 40px",
          }}
        >
          {/* カテゴリバッジ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: color.bg,
              border: `1px solid ${color.dot}33`,
              borderRadius: 9999,
              padding: "8px 20px",
              fontSize: 18,
              color: color.text,
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: color.dot,
              }}
            />
            {category}
          </div>

          {/* タイトル */}
          <div
            style={{
              fontSize: titleFontSize,
              fontWeight: 800,
              letterSpacing: -1,
              color: "#1e293b",
              lineHeight: 1.4,
              textAlign: "center",
              display: "flex",
            }}
          >
            {title}
          </div>

          {/* 説明文 */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 400,
              color: "#64748b",
              lineHeight: 1.6,
              textAlign: "center",
              display: "flex",
              maxWidth: 900,
            }}
          >
            {description.length > 100
              ? description.slice(0, 100) + "..."
              : description}
          </div>
        </div>

        {/* サイトURL（右下） */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 40,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 18,
            color: "#94a3b8",
          }}
        >
          l-ope.jp
        </div>
      </div>
    ),
    { ...ogpSize },
  );
}
