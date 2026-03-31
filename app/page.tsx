import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const SITE_URL = "https://l-ope.jp";
const TITLE = "Lオペ | 業種特化LINE運用プラットフォーム";
const DESCRIPTION =
  "クリニック・サロン・EC。あなたの業種に最適化されたLINE公式アカウント運用ツール。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
  keywords: [
    "Lオペ",
    "LINE運用",
    "LINE公式アカウント",
    "クリニック LINE",
    "サロン LINE",
    "EC LINE",
    "LINE配信ツール",
    "LINE CRM",
    "業種特化",
    "LINE運用プラットフォーム",
  ].join(", "),
  icons: {
    icon: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
    apple: [{ url: "/icon.png", sizes: "778x778", type: "image/png" }],
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "Lオペ",
    locale: "ja_JP",
    type: "website",
    images: [
      {
        url: `${SITE_URL}/icon.png`,
        width: 778,
        height: 778,
        alt: "Lオペ — 業種特化LINE運用プラットフォーム",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/icon.png`],
  },
};

/* JSON-LD 構造化データ */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Lオペ",
    alternateName: ["エルオペ", "L-OPE"],
    url: SITE_URL,
    logo: `${SITE_URL}/icon.png`,
    description:
      "Lオペは、業種に最適化されたLINE公式アカウント運用プラットフォームです。",
    email: "info@l-ope.jp",
    parentOrganization: {
      "@type": "Organization",
      name: "株式会社ORDIX",
      url: "https://ordix.co.jp",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "sales",
      email: "info@l-ope.jp",
      availableLanguage: "Japanese",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Lオペ",
    alternateName: "L-OPE",
    url: SITE_URL,
    description:
      "業種に最適化されたLINE公式アカウント運用プラットフォーム「Lオペ」",
  },
];

/* ------------------------------------------------------------------ */
/*  サービスデータ                                                      */
/* ------------------------------------------------------------------ */

type Service = {
  name: string;
  subtitle: string;
  href: string;
  color: string;
  colorLight: string;
  description: string;
  features: string[];
  comingSoon?: boolean;
};

const services: Service[] = [
  {
    name: "Lオペ",
    subtitle: "LINE運用",
    href: "/line/",
    color: "#06C755",
    colorLight: "#e6f9ee",
    description: "あらゆる業種に対応するLINE公式アカウント運用の基盤ツール",
    features: [
      "セグメント配信・ステップ配信",
      "リッチメニュービルダー",
      "AI自動返信・キーワード応答",
    ],
  },
  {
    name: "Lオペ for CLINIC",
    subtitle: "クリニック向け",
    href: "/clinic/",
    color: "#3b82f6",
    colorLight: "#eff6ff",
    description: "患者CRM・予約・問診・決済までクリニック業務をオールインワンで",
    features: [
      "オンライン問診・予約管理",
      "電子カルテ連携・SOAP記録",
      "処方薬の決済・配送管理",
    ],
  },
  {
    name: "Lオペ for SALON",
    subtitle: "サロン向け",
    href: "/salon/",
    color: "#ec4899",
    colorLight: "#fdf2f8",
    description: "サロン特化の予約・顧客管理でリピート率を最大化",
    features: [
      "LINE予約・リマインド配信",
      "顧客カルテ・施術履歴管理",
      "ポイント・クーポン配信",
    ],
    comingSoon: true,
  },
  {
    name: "Lオペ for EC",
    subtitle: "EC・小売向け",
    href: "/ec/",
    color: "#8B7355",
    colorLight: "#faf5ef",
    description: "購買データ連動のLINE配信でLTVを向上",
    features: [
      "購入後フォロー自動配信",
      "カゴ落ち・再購入リマインド",
      "セグメント別キャンペーン配信",
    ],
    comingSoon: true,
  },
];

/* ------------------------------------------------------------------ */
/*  共通の強み                                                          */
/* ------------------------------------------------------------------ */

const strengths = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
      </svg>
    ),
    title: "AI搭載の自動化",
    description:
      "AI自動返信・スマート分類で、対応工数を大幅に削減。スタッフの手間を最小限に。",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    ),
    title: "データドリブン運用",
    description:
      "配信効果・顧客行動を可視化するダッシュボード。数値に基づいた改善サイクルを実現。",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-8 w-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.049.58.025 1.193-.14 1.743" />
      </svg>
    ),
    title: "導入サポート無料",
    description:
      "初期設定から運用開始まで専任スタッフがサポート。最短2週間で本格運用をスタート。",
  },
];

/* ------------------------------------------------------------------ */
/*  コンポーネント                                                      */
/* ------------------------------------------------------------------ */

function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={service.href}
      className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
    >
      {/* Coming Soonバッジ */}
      {service.comingSoon && (
        <span className="absolute top-4 right-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Coming Soon
        </span>
      )}

      {/* カラーライン */}
      <div
        className="mb-4 h-1 w-12 rounded-full"
        style={{ backgroundColor: service.color }}
      />

      {/* サービス名 */}
      <h3 className="text-xl font-bold text-slate-900">{service.name}</h3>
      <p
        className="mt-1 text-sm font-medium"
        style={{ color: service.color }}
      >
        {service.subtitle}
      </p>

      {/* 説明 */}
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {service.description}
      </p>

      {/* 機能リスト */}
      <ul className="mt-4 flex-1 space-y-2">
        {service.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: service.color }}
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="mt-6 flex items-center gap-1 text-sm font-medium transition-colors group-hover:gap-2" style={{ color: service.color }}>
        {service.comingSoon ? "準備中" : "詳しく見る"}
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
          <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
        </svg>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  ページ本体                                                          */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div
        className="min-h-screen bg-white text-slate-800"
        style={{ fontFeatureSettings: "'palt'" }}
      >
        {/* ===== ヒーロー ===== */}
        <header className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white">
          {/* 背景パターン */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #000 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

          <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 text-center sm:pt-24 sm:pb-28">
            {/* ロゴ */}
            <div className="mx-auto mb-8 flex items-center justify-center gap-3">
              <Image
                src="/icon.png"
                alt="Lオペ"
                width={56}
                height={56}
                className="rounded-xl"
                priority
              />
              <span className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Lオペ
              </span>
            </div>

            <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-4xl">
              業種に最適化された
              <br className="sm:hidden" />
              LINE運用プラットフォーム
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
              LINE公式アカウントの運用に必要な機能を、業種ごとに最適化して提供。
              <br className="hidden sm:block" />
              クリニック・サロン・ECなど、あなたのビジネスに合った形で、すぐに運用を始められます。
            </p>
          </div>
        </header>

        <main>
          {/* ===== サービス選択カード ===== */}
          <section className="mx-auto max-w-5xl px-6 pb-20 sm:pb-28">
            <h2 className="mb-10 text-center text-lg font-bold text-slate-900 sm:text-xl">
              あなたの業種に合ったプランを選ぶ
            </h2>

            <div className="grid gap-6 sm:grid-cols-2">
              {services.map((s) => (
                <ServiceCard key={s.name} service={s} />
              ))}
            </div>
          </section>

          {/* ===== 共通の強み ===== */}
          <section className="border-t border-slate-100 bg-slate-50 py-20 sm:py-28">
            <div className="mx-auto max-w-5xl px-6">
              <h2 className="mb-12 text-center text-lg font-bold text-slate-900 sm:text-xl">
                Lオペ プラットフォームの強み
              </h2>

              <div className="grid gap-8 sm:grid-cols-3">
                {strengths.map((s) => (
                  <div key={s.title} className="text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                      {s.icon}
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500">
                      {s.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* ===== フッター ===== */}
        <footer className="border-t border-slate-200 bg-white py-12">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start sm:justify-between">
              {/* ロゴ・運営 */}
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Image
                    src="/icon.png"
                    alt="Lオペ"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                  <span className="text-lg font-bold text-slate-900">
                    Lオペ
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  運営:{" "}
                  <a
                    href="https://ordix.co.jp"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-slate-600"
                  >
                    株式会社ORDIX
                  </a>
                </p>
              </div>

              {/* サービスリンク */}
              <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
                {services.map((s) => (
                  <Link
                    key={s.name}
                    href={s.href}
                    className="transition-colors hover:text-slate-800"
                  >
                    {s.name}
                  </Link>
                ))}
                <a
                  href="https://ordix.co.jp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-slate-800"
                >
                  法人サイト
                </a>
              </nav>
            </div>

            <p className="mt-8 text-center text-xs text-slate-400">
              &copy; {new Date().getFullYear()} 株式会社ORDIX. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
