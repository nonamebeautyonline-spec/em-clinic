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
          <div className="flex items-center gap-2 text-[14px] font-bold text-white"><Image src="/icon.png" alt="Lオペ" width={32} height={32} className="rounded-lg object-contain" />Lオペ for CLINIC</div>
          <nav aria-label="フッターナビゲーション" className="flex flex-wrap justify-center gap-6 text-[12px]">
            {[
              { label: "Lオペとは", id: "/lp/about", isLink: true },
              { label: "機能", id: "features" },
              { label: "強み", id: "strengths" },
              { label: "活用シーン", id: "usecases" },
              { label: "料金", id: "pricing" },
              { label: "FAQ", id: "faq" },
            ].map((l) => "isLink" in l ? <Link key={l.id} href={l.id} className="hover:text-white">{l.label}</Link> : <a key={l.id} href={`#${l.id}`} className="hover:text-white">{l.label}</a>)}
            <Link href="/lp/features" className="hover:text-white">機能一覧</Link>
            <Link href="/lp/column" className="hover:text-white">コラム</Link>
            <a href="/lp/contact" className="hover:text-white">お問い合わせ</a>
          </nav>
        </div>
        <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-7 text-[11px] md:flex-row">
          <div className="flex gap-5"><Link href="/lp/terms" className="hover:text-white">利用規約</Link><Link href="/lp/privacy" className="hover:text-white">プライバシーポリシー</Link><Link href="/lp/cancel" className="hover:text-white">キャンセル・解約ポリシー</Link></div>
          <div className="text-center md:text-right">
            <p className="text-slate-500">運営: <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="underline decoration-slate-600 underline-offset-2 transition hover:text-white">株式会社ORDIX</a></p>
            <p className="mt-1">&copy; 2026 株式会社ORDIX. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
