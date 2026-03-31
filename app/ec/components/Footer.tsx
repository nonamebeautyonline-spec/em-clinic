"use client";

import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-slate-50 px-5 py-10 text-slate-500">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center justify-between gap-5 md:flex-row">
          <div className="flex items-center gap-2 text-[14px] font-bold text-slate-900">
            <Image src="/icon.png" alt="Lオペ for EC" width={32} height={32} className="rounded-lg object-contain" />
            Lオペ <span className="text-[11px] font-semibold text-amber-600">for EC</span>
          </div>
          <nav aria-label="フッターナビゲーション" className="flex flex-wrap justify-center gap-6 text-[12px]">
            <Link href="/ec/about" className="hover:text-amber-600 transition">Lオペ for ECとは</Link>
            <a href="#features" className="hover:text-amber-600 transition">機能</a>
            <a href="#pricing" className="hover:text-amber-600 transition">料金</a>
            <a href="#usecases" className="hover:text-amber-600 transition">活用事例</a>
            <a href="#faq" className="hover:text-amber-600 transition">FAQ</a>
            <Link href="/ec/features" className="hover:text-amber-600 transition">機能一覧</Link>
            <Link href="/ec/column" className="hover:text-amber-600 transition">コラム</Link>
            <Link href="/ec/contact" className="hover:text-amber-600 transition">お問い合わせ</Link>
            <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="hover:text-amber-600 transition">運営会社</a>
          </nav>
        </div>
        <div className="mt-7 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-7 text-[11px] md:flex-row">
          <div className="flex gap-5">
            <Link href="/line/terms" className="hover:text-amber-600 transition">利用規約</Link>
            <Link href="/line/privacy" className="hover:text-amber-600 transition">プライバシーポリシー</Link>
          </div>
          <div className="text-center md:text-right">
            <p className="text-slate-400">運営: <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="underline decoration-slate-300 underline-offset-2 transition hover:text-amber-600">株式会社ORDIX</a></p>
            <p className="mt-1">&copy; 2026 株式会社ORDIX. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
