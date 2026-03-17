import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "./articles";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "コラム | Lオペ for CLINIC — クリニック LINE活用・DX情報",
  description:
    "クリニックのLINE公式アカウント活用事例・DX導入ガイド・ツール比較など、クリニック経営に役立つ情報を発信。Lオペ for CLINIC公式コラム。",
  alternates: { canonical: `${SITE_URL}/lp/column` },
  openGraph: {
    title: "コラム | Lオペ for CLINIC",
    description: "クリニックのLINE活用・DX情報を発信するLオペ for CLINIC公式コラム。",
    url: `${SITE_URL}/lp/column`,
  },
};

export default function ColumnIndexPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      <nav aria-label="パンくずリスト" className="mx-auto max-w-4xl px-5 pt-20 pb-0">
        <ol className="flex items-center gap-1.5 text-[11px] text-slate-400 list-none m-0 p-0">
          <li><a href="https://l-ope.jp" className="hover:text-blue-600 transition">ホーム</a></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/lp" className="hover:text-blue-600 transition">Lオペ for CLINIC</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-600 font-medium">コラム</li>
        </ol>
      </nav>

      <main className="mx-auto max-w-4xl px-5 py-12">
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">コラム</h1>
        <p className="mt-3 text-[15px] text-slate-500">クリニックのLINE公式アカウント活用・DX推進に役立つ情報をお届けします。</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {articles.map((a) => (
            <Link key={a.slug} href={`/lp/column/${a.slug}`} className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:border-blue-200 hover:shadow-md">
              <div className="flex items-center gap-3 text-[11px]">
                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700">{a.category}</span>
                <span className="text-slate-400">{a.date}</span>
                <span className="text-slate-400">{a.readTime}</span>
              </div>
              <h2 className="mt-3 text-[15px] font-bold leading-relaxed text-slate-800 group-hover:text-blue-600 transition">{a.title}</h2>
              <p className="mt-2 text-[12px] leading-relaxed text-slate-400 line-clamp-2">{a.description}</p>
            </Link>
          ))}
        </div>

        <div className="mt-16 rounded-2xl bg-blue-50 p-8 text-center">
          <h2 className="text-lg font-bold text-slate-800">LINE公式アカウントでクリニック業務をDX化しませんか？</h2>
          <p className="mt-2 text-[13px] text-slate-500">Lオペ for CLINICなら、予約・問診・配信・決済・配送管理をオールインワンで。</p>
          <a href="/lp/contact" className="mt-4 inline-block rounded-xl bg-gradient-to-r from-blue-600 to-sky-500 px-8 py-3 text-[13px] font-bold text-white shadow-lg shadow-blue-500/20 transition hover:shadow-xl">無料で資料請求</a>
        </div>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-[12px] text-slate-400">
        <Link href="/lp" className="hover:text-blue-600">← Lオペ for CLINIC トップに戻る</Link>
      </footer>
    </div>
  );
}
