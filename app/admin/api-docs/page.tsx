"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Swagger UI をCDNから動的読み込み
    const loadSwaggerUI = async () => {
      try {
        // CSS
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css";
        document.head.appendChild(cssLink);

        // JS
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Swagger UI の読み込みに失敗しました"));
          document.body.appendChild(script);
        });

        // Swagger UI 初期化
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SwaggerUIBundle = (window as any).SwaggerUIBundle;
        if (!SwaggerUIBundle) {
          throw new Error("SwaggerUIBundle が見つかりません");
        }

        SwaggerUIBundle({
          url: "/openapi.json",
          dom_id: "#swagger-ui",
          presets: [SwaggerUIBundle.presets.apis],
          layout: "BaseLayout",
          defaultModelsExpandDepth: 2,
          defaultModelExpandDepth: 2,
          docExpansion: "list",
          filter: true,
          showExtensions: true,
          tryItOutEnabled: false,
        });

        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "読み込みエラー");
        setLoading(false);
      }
    };

    loadSwaggerUI();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="bg-slate-900 text-white px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">API仕様書</h1>
            <p className="text-sm text-slate-400 mt-0.5">Lオペ for CLINIC — OpenAPI 3.0</p>
          </div>
          <Link href="/admin" className="text-sm text-slate-300 hover:text-white">
            管理画面に戻る
          </Link>
        </div>
      </div>

      {/* Swagger UI */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-slate-300 border-t-slate-800 rounded-full mx-auto mb-4" />
            <p className="text-sm text-slate-500">API仕様を読み込み中...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-3xl mx-auto mt-8 p-4 bg-red-50 text-red-800 rounded-lg">
          <p className="font-medium">エラー</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2 text-red-600">
            openapi.json が生成されていない可能性があります。<code className="bg-red-100 px-1 rounded">npx tsx scripts/generate-openapi.ts</code> を実行してください。
          </p>
        </div>
      )}

      <div id="swagger-ui" ref={containerRef} />
    </div>
  );
}
