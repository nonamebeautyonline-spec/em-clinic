"use client";

import { useState, useEffect } from "react";
import { LegalTextRenderer } from "@/lib/legal/parser";

// アコーディオン
function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-[13px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        {title}
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="px-4 py-3 text-[11px] text-slate-600 leading-relaxed max-h-60 overflow-y-auto border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
}

export default function LegalSection({
  agreed,
  onAgree,
}: {
  agreed: boolean;
  onAgree: (v: boolean) => void;
}) {
  const [termsText, setTermsText] = useState<string | null>(null);
  const [privacyText, setPrivacyText] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- 初期データフェッチ
  useEffect(() => {
    fetch("/api/legal/config")
      .then((r) => r.json())
      .then((data) => {
        if (data.termsText) setTermsText(data.termsText);
        if (data.privacyText) setPrivacyText(data.privacyText);
      })
      .catch(() => {
        // フェッチ失敗時はデフォルトテキストを動的import
        import("@/lib/legal/types").then((m) => {
          setTermsText(m.DEFAULT_TERMS_TEXT);
          setPrivacyText(m.DEFAULT_PRIVACY_TEXT);
        });
      });
  }, []);

  if (!termsText || !privacyText) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-[13px] font-semibold text-slate-800">利用規約・プライバシーポリシー</p>

      <Accordion title="利用規約">
        <LegalTextRenderer text={termsText} />
      </Accordion>

      <Accordion title="プライバシーポリシー">
        <LegalTextRenderer text={privacyText} />
      </Accordion>

      <p className="text-[11px] text-rose-500 text-center leading-relaxed">
        同意いただけない場合、診察予約が出来かねますことご了承ください
      </p>

      <label className="flex items-center justify-center gap-2 cursor-pointer py-1">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgree(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
        />
        <span className="text-[13px] text-slate-700">同意する</span>
      </label>
    </div>
  );
}
