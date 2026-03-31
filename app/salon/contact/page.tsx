import Image from "next/image";
import Link from "next/link";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50">
      {/* ヘッダー */}
      <header className="border-b border-slate-100/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5">
          <Link href="/salon" className="flex items-center gap-2.5">
            <Image src="/icon.png" alt="Lオペ for SALON" width={36} height={36} className="rounded-lg object-contain" />
            <span className="text-[15px] font-bold tracking-tight">Lオペ <span className="text-pink-500">for SALON</span></span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-pink-100">
          <svg className="h-8 w-8 text-pink-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="mb-4 inline-block rounded-full bg-yellow-50 border border-yellow-200 px-4 py-1.5 text-[12px] font-bold text-yellow-800">Coming Soon</span>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">準備中です</h1>
        <p className="mb-2 text-slate-500">Lオペ for SALON は現在開発中です。</p>
        <p className="mb-8 text-[13px] text-slate-400">リリース時期が決まり次第、お知らせいたします。</p>
        <Link href="/salon" className="inline-block rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-xl">
          トップページに戻る
        </Link>
      </div>
    </div>
  );
}
