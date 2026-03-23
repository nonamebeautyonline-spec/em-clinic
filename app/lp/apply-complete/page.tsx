// app/lp/apply-complete/page.tsx — 申し込み完了ページ（Stripe決済後）
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lオペ お申し込み完了",
  robots: { index: false, follow: false },
};

export default function ApplyCompletePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mb-3">
            お申し込みありがとうございます
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed mb-6">
            決済が完了しました。担当者より3営業日以内にご連絡いたします。
          </p>

          <div className="border-t border-slate-100 pt-6">
            <p className="text-xs text-slate-500">
              ご不明な点がございましたら、お気軽にお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
