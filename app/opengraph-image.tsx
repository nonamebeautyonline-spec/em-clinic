import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "Lオペ — LINE公式アカウント運用を業種別に最適化するプラットフォーム";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
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
            "linear-gradient(135deg, #f8fafc 0%, #ffffff 40%, #f1f5f9 100%)",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景装飾 */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 450,
            height: 450,
            borderRadius: "50%",
            background: "rgba(100, 116, 139, 0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -120,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(100, 116, 139, 0.04)",
          }}
        />

        {/* メインコンテンツ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            zIndex: 1,
          }}
        >
          {/* タイトル */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: -2,
              color: "#1e293b",
              lineHeight: 1.2,
            }}
          >
            Lオペ
          </div>

          {/* サブタイトル */}
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: "#475569",
              lineHeight: 1.4,
            }}
          >
            業種に最適化されたLINE運用プラットフォーム
          </div>

          {/* 業種バッジ */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 16,
            }}
          >
            {[
              { label: "CLINIC", color: "#3b82f6" },
              { label: "SALON", color: "#ec4899" },
              { label: "EC", color: "#8B7355" },
              { label: "LINE", color: "#06C755" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "white",
                  border: `1px solid ${item.color}30`,
                  borderRadius: 9999,
                  padding: "10px 24px",
                  fontSize: 18,
                  fontWeight: 700,
                  color: item.color,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: item.color,
                  }}
                />
                {item.label}
              </div>
            ))}
          </div>

          {/* URL */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
              fontSize: 18,
              color: "#94a3b8",
            }}
          >
            l-ope.jp
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
