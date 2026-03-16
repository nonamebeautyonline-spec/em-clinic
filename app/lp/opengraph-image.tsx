import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lオペ for CLINIC — クリニック特化LINE運用プラットフォーム";
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
          background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 40%, #f0f9ff 100%)",
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

        {/* メインコンテンツ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            zIndex: 1,
          }}
        >
          {/* バッジ */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: 9999,
              padding: "8px 20px",
              fontSize: 18,
              color: "#1d4ed8",
              fontWeight: 600,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#3b82f6",
              }}
            />
            クリニック特化 LINE運用プラットフォーム
          </div>

          {/* タイトル */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 72,
                fontWeight: 800,
                letterSpacing: -2,
                color: "#1e293b",
                lineHeight: 1.2,
              }}
            >
              Lオペ for CLINIC
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                background: "linear-gradient(90deg, #2563eb, #0ea5e9)",
                backgroundClip: "text",
                color: "transparent",
                lineHeight: 1.4,
              }}
            >
              LINE 1つでクリニック業務をまるごとDX化
            </div>
          </div>

          {/* 機能リスト */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 8,
            }}
          >
            {[
              "患者CRM",
              "セグメント配信",
              "予約管理",
              "オンライン問診",
              "AI自動返信",
              "決済・配送",
            ].map((feature) => (
              <div
                key={feature}
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: "10px 18px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#475569",
                }}
              >
                {feature}
              </div>
            ))}
          </div>

          {/* フッター */}
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
