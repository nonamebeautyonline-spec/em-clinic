import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, getCategoryBySlug, getArticlesByCategory } from "../../categories";
import ArticleThumbnail from "../../_components/article-thumbnail";

const SITE_URL = "https://l-ope.jp";

/* ─── カテゴリピルスタイル ─── */
const categoryStyles: Record<string, string> = {
  "サロンLINE活用入門":         "bg-blue-50 text-blue-600 ring-blue-200/50",
  "予約管理・ホットペッパー連携": "bg-pink-50 text-pink-600 ring-pink-200/50",
  "配信・リピート促進":         "bg-rose-50 text-rose-600 ring-rose-200/50",
  "リッチメニュー・UI設計":     "bg-cyan-50 text-cyan-600 ring-cyan-200/50",
  "顧客管理・CRM":              "bg-violet-50 text-violet-600 ring-violet-200/50",
  "業態別活用事例":             "bg-orange-50 text-orange-600 ring-orange-200/50",
  "分析・改善":                 "bg-yellow-50 text-yellow-700 ring-yellow-200/50",
  "成功事例・売上UP":           "bg-emerald-50 text-emerald-600 ring-emerald-200/50",
};

/* ─── 静的生成パラメータ ─── */
export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }));
}

/* ─── メタデータ ─── */
type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) return {};

  const title = `${cat.label}の記事一覧 | コラム | Lオペ for SALON`;
  const description = cat.description;
  const url = `${SITE_URL}/salon/column/category/${cat.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
    },
  };
}

/* ─── 日付フォーマット ─── */
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/* ─── ページ本体 ─── */
export default async function CategoryPage({ params }: Props) {
  const { category: slug } = await params;
  const cat = getCategoryBySlug(slug);
  if (!cat) notFound();

  const articleList = getArticlesByCategory(cat);

  /* JSON-LD: CollectionPage + ItemList */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${cat.label}の記事一覧 — Lオペ for SALON コラム`,
    description: cat.description,
    url: `${SITE_URL}/salon/column/category/${cat.slug}`,
    isPartOf: { "@type": "WebSite", name: "Lオペ for SALON", url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: articleList.length,
      itemListElement: articleList.map((a, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/salon/column/${a.slug}`,
        name: a.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50 text-gray-800">
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 border-b border-gray-200/60 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
            <Link
              href="/salon"
              className="flex items-center gap-1.5 text-[16px] font-bold tracking-tight text-gray-900 hover:opacity-70 transition"
            >
              Lオペ <span className="text-pink-500">for SALON</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/salon/about" className="hidden text-[14px] text-gray-500 hover:text-pink-600 transition md:block">
                Lオペ for SALONとは
              </Link>
              <Link href="/salon/features" className="hidden text-[14px] text-gray-500 hover:text-pink-600 transition md:block">
                機能一覧
              </Link>
              <Link href="/salon/column" className="hidden text-[14px] font-medium text-pink-600 md:block">
                コラム
              </Link>
              <Link
                href="/salon/contact"
                className="rounded-full bg-pink-600 px-6 py-2.5 text-[13px] font-semibold text-white transition hover:bg-pink-700 hover:shadow-md"
              >
                お問い合わせ
              </Link>
            </div>
          </div>
        </header>

        {/* パンくず */}
        <div className="border-b border-gray-200 bg-white">
          <nav aria-label="パンくずリスト" className="mx-auto max-w-7xl px-6 py-3">
            <ol className="flex items-center gap-2 text-[13px] text-gray-400 list-none m-0 p-0">
              <li>
                <Link href="/salon" className="hover:text-pink-600 transition">
                  トップ
                </Link>
              </li>
              <li aria-hidden="true" className="text-gray-300">
                /
              </li>
              <li>
                <Link href="/salon/column" className="hover:text-pink-600 transition">
                  コラム
                </Link>
              </li>
              <li aria-hidden="true" className="text-gray-300">
                /
              </li>
              <li className="text-gray-700 font-medium">{cat.label}</li>
            </ol>
          </nav>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "トップ", item: "https://l-ope.jp/salon" },
              { "@type": "ListItem", position: 2, name: "コラム", item: "https://l-ope.jp/salon/column" },
              { "@type": "ListItem", position: 3, name: cat.label, item: `https://l-ope.jp/salon/column/category/${cat.slug}` },
            ],
          }) }} />
        </div>

        {/* ページヒーロー */}
        <div className="bg-white px-6 pb-6 pt-10 md:pb-8 md:pt-14">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-[28px] font-bold tracking-tight text-gray-900 md:text-[36px]">
              {cat.label}
            </h1>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-gray-500">
              {cat.description}
            </p>
            <p className="mt-2 text-[14px] text-gray-400">
              {articleList.length}件の記事
            </p>
            {cat.seoIntro && (
              <p className="mt-4 max-w-3xl text-[15px] leading-[1.8] text-gray-600">
                {cat.seoIntro}
              </p>
            )}
          </div>
        </div>

        {/* カテゴリナビ */}
        <div className="border-b border-gray-200 bg-white px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2.5 pb-5">
            <Link
              href="/salon/column"
              className="shrink-0 rounded-full px-5 py-2 text-[14px] font-medium ring-1 bg-white text-gray-500 ring-gray-200 hover:bg-gray-50 hover:text-gray-700 transition"
            >
              すべて
            </Link>
            {categories.map((c) => {
              const isActive = c.slug === slug;
              const count = getArticlesByCategory(c).length;
              return (
                <Link
                  key={c.slug}
                  href={`/salon/column/category/${c.slug}`}
                  className={`shrink-0 rounded-full px-5 py-2 text-[14px] font-medium ring-1 transition ${
                    isActive
                      ? "bg-pink-600 text-white ring-pink-600 shadow-sm"
                      : "bg-white text-gray-500 ring-gray-200 hover:bg-gray-50 hover:text-gray-700"
                  }`}
                >
                  {c.label}
                  <span className={`ml-1.5 text-[12px] ${isActive ? "text-pink-200" : "text-gray-300"}`}>
                    {count}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 記事一覧 */}
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articleList.map((a) => (
              <Link
                key={a.slug}
                href={`/salon/column/${a.slug}`}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-pink-100/50 hover:ring-pink-200/80"
              >
                <div className="overflow-hidden">
                  <div className="transition-transform duration-300 group-hover:scale-[1.02]">
                    <ArticleThumbnail slug={a.slug} title={a.title} category={a.category} size="card" />
                  </div>
                </div>

                <div className="px-6 py-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ${
                        categoryStyles[a.category] || "bg-gray-50 text-gray-600 ring-gray-200/50"
                      }`}
                    >
                      {a.category}
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-gray-400">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {formatDate(a.date)}
                    </span>
                    <span className="flex items-center gap-1 text-[12px] text-gray-300">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      {a.readTime}
                    </span>
                  </div>

                  <p className="mt-3 text-[14px] leading-[1.7] text-gray-600 line-clamp-3">
                    {a.description}
                  </p>

                  <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-pink-600 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    続きを読む
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* 他のカテゴリも見る */}
          <section className="mt-12 border-t border-gray-200 pt-8">
            <h2 className="text-lg font-bold text-gray-800 mb-4">他のカテゴリのコラム</h2>
            <div className="flex flex-wrap gap-3">
              {categories.filter((c) => c.slug !== slug).map((c) => (
                <Link
                  key={c.slug}
                  href={`/salon/column/category/${c.slug}`}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition"
                >
                  {c.label}
                </Link>
              ))}
              <Link
                href="/salon/column"
                className="px-4 py-2 bg-pink-50 rounded-lg text-sm text-pink-700 hover:bg-pink-100 transition"
              >
                すべての記事
              </Link>
            </div>
          </section>

          {/* CTA */}
          <div className="mt-14 overflow-hidden rounded-2xl bg-gradient-to-br from-pink-50 via-rose-50 to-violet-50 p-10 text-center ring-1 ring-pink-100 md:p-14">
            <p className="text-[12px] font-bold tracking-widest text-pink-400 uppercase">
              Lオペ for SALON
            </p>
            <h2 className="mt-3 text-[22px] font-bold text-gray-800 md:text-[26px]">
              サロンのLINE運用をもっと効率的に
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-gray-500">
              予約管理・顧客管理・配信・スタンプカード・物販をオールインワンで。
              <br className="hidden sm:block" />
              まずはお気軽にお問い合わせください。
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/salon/contact"
                className="rounded-full bg-pink-600 px-8 py-3.5 text-[14px] font-bold text-white transition hover:bg-pink-700 hover:shadow-lg"
              >
                お問い合わせ
              </Link>
              <Link
                href="/salon/features"
                className="rounded-full bg-white px-8 py-3.5 text-[14px] font-bold text-gray-600 ring-1 ring-gray-200 transition hover:bg-gray-50 hover:text-pink-600"
              >
                機能一覧を見る
              </Link>
            </div>
          </div>
        </div>

        {/* フッター */}
        <footer className="border-t border-gray-200 bg-white py-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <p className="text-[14px] font-bold text-gray-900">
                Lオペ <span className="text-pink-500">for SALON</span>
              </p>
              <div className="flex items-center gap-6">
                <Link href="/salon" className="text-[13px] text-gray-400 hover:text-pink-600 transition">
                  トップ
                </Link>
                <Link href="/salon/about" className="text-[13px] text-gray-400 hover:text-pink-600 transition">
                  Lオペ for SALONとは
                </Link>
                <Link href="/salon/features" className="text-[13px] text-gray-400 hover:text-pink-600 transition">
                  機能一覧
                </Link>
                <Link href="/salon/column" className="text-[13px] text-pink-600 font-medium">
                  コラム
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
