"use client";

import Image from "next/image";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════════════════════════
   フッター
   ═══════════════════════════════════════════════════════════════════════════ */

export function Footer() {
  return (
    <footer className="bg-slate-900 px-5 py-10 text-slate-400">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-2 text-[14px] font-bold text-white"><Image src="/images/l-ope-logo.png" alt="Lオペ" width={140} height={140} className="object-contain" />Lオペ for CLINIC</div>
          <div className="flex flex-wrap justify-center gap-6 text-[12px]">
            {["機能", "強み", "活用シーン", "料金", "FAQ", "お問い合わせ"].map((l) => <a key={l} href={`#${l === "機能" ? "features" : l === "強み" ? "strengths" : l === "活用シーン" ? "usecases" : l === "料金" ? "pricing" : l === "FAQ" ? "faq" : "contact"}`} className="hover:text-white">{l}</a>)}
          </div>
        </div>
        <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-7 text-[11px] md:flex-row">
          <div className="flex gap-5"><Link href="/lp/terms" className="hover:text-white">利用規約</Link><Link href="/lp/privacy" className="hover:text-white">プライバシーポリシー</Link><Link href="/lp/cancel" className="hover:text-white">キャンセル・解約ポリシー</Link></div>
          <div className="text-center md:text-right">
            <p className="text-slate-500">運営: 株式会社ORDIX</p>
            <p className="mt-1">&copy; 2026 株式会社ORDIX. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
