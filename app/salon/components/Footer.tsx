"use client";

import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-slate-900 px-5 py-10 text-slate-400">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-2 text-[14px] font-bold text-white">
            <Image src="/icon.png" alt="Lオペ for SALON" width={32} height={32} className="rounded-lg object-contain" />
            Lオペ <span className="text-pink-400">for SALON</span>
          </div>
          <nav aria-label="フッターナビゲーション" className="flex flex-wrap justify-center gap-6 text-[12px]">
            <Link href="/salon/about" className="hover:text-white">Lオペ for SALONとは</Link>
            <a href="#features" className="hover:text-white">機能</a>
            <a href="#pricing" className="hover:text-white">料金</a>
            <a href="#usecases" className="hover:text-white">活用事例</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <Link href="/salon/features" className="hover:text-white">機能一覧</Link>
            <Link href="/salon/column" className="hover:text-white">コラム</Link>
            <Link href="/salon/contact" className="hover:text-white">お問い合わせ</Link>
            <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="hover:text-white">運営会社</a>
          </nav>
        </div>
        <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-7 text-[11px] md:flex-row">
          <div className="flex gap-5">
            <Link href="/salon/terms" className="hover:text-white">利用規約</Link>
            <Link href="/salon/privacy" className="hover:text-white">プライバシーポリシー</Link>
          </div>
          <div className="text-center md:text-right">
            <p className="text-slate-500">運営: <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="underline decoration-slate-600 underline-offset-2 transition hover:text-white">株式会社ORDIX</a></p>
            <p className="mt-1">&copy; 2026 株式会社ORDIX. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
