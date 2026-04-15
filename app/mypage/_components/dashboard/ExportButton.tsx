"use client";

import { useCallback, useState } from "react";

// データエクスポートボタンコンポーネント
export function ExportButton() {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/mypage/export", { credentials: "include" });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setExportError(json.message || "エクスポートに失敗しました");
        return;
      }
      const blob = new Blob([JSON.stringify(json.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patient-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setExportError("エクスポート中にエラーが発生しました");
    } finally {
      setExporting(false);
    }
  }, []);

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition border border-[var(--mp-primary)] text-[var(--mp-primary)] bg-white hover:bg-[var(--mp-light)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {exporting ? "エクスポート中..." : "データエクスポート"}
      </button>
      {exportError && (
        <p className="mt-2 text-[11px] text-rose-600">{exportError}</p>
      )}
    </div>
  );
}
