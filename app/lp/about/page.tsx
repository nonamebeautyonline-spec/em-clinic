import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for CLINICとは？ — クリニック特化LINE公式アカウント運用プラットフォーム",
  description:
    "Lオペ for CLINICはクリニックに特化したLINE公式アカウント運用プラットフォーム。予約管理・オンライン問診・セグメント配信・決済・配送まで、クリニック業務をLINEで一元化。Lステップ等の汎用ツールとの違いも解説。",
  keywords: "Lオペとは, Lオペ for CLINIC とは, クリニック LINE 運用, LINE公式アカウント クリニック 活用, クリニック DX 導入, Lステップ 違い, Lステップ クリニック 比較, クリニック 業務効率化, 医療DX プラットフォーム, LINE CRM クリニック, 予約管理 LINE, オンライン問診 LINE, クリニック 集患 LINE, 再診率 向上 LINE, 無断キャンセル 防止",
  alternates: { canonical: `${SITE_URL}/lp/about` },
  openGraph: {
    title: "Lオペ for CLINICとは？ — クリニック特化LINE運用プラットフォーム",
    description: "予約・問診・配信・決済・配送をLINEで一元化。クリニック専用だから、導入したその日から使える。",
    url: `${SITE_URL}/lp/about`,
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "website",
  },
};

/* JSON-LD */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lオペ for CLINICとは？",
    description: "クリニック特化LINE公式アカウント運用プラットフォーム",
    url: `${SITE_URL}/lp/about`,
    isPartOf: { "@type": "WebSite", name: "Lオペ for CLINIC", url: SITE_URL },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "トップ", item: `${SITE_URL}/lp` },
        { "@type": "ListItem", position: 2, name: "Lオペ for CLINICとは？", item: `${SITE_URL}/lp/about` },
      ],
    },
  },
  /* FAQPage — Google検索結果にFAQ表示 */
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { q: "LINE公式アカウントを持っていなくても始められますか？", a: "はい。LINE公式アカウントの開設から初期設定まで、すべてサポートいたします。既にアカウントをお持ちの場合は、既存の友だちデータを引き継いで導入可能です。" },
      { q: "Lステップなどの汎用ツールからの乗り換えは可能ですか？", a: "可能です。既存のLINE公式アカウントはそのまま利用でき、友だちリストも引き継げます。配信シナリオの移行もサポートいたします。" },
      { q: "患者の個人情報のセキュリティは大丈夫ですか？", a: "SSL暗号化通信、データの暗号化保存、アクセス権限管理、監査ログ機能を標準搭載。医療情報を扱うサービスとして、セキュリティを最優先に設計しています。" },
      { q: "導入にはどのくらいの期間がかかりますか？", a: "最短2週間で本番運用を開始できます。リッチメニューのデザインや問診フォームのカスタマイズ内容によって前後しますが、1ヶ月以内の導入が一般的です。" },
      { q: "月額費用以外にかかる費用はありますか？", a: "初期構築費用が別途必要です。月額費用にはすべての基本機能が含まれており、隠れた追加料金はありません。詳しくは料金ページをご覧ください。" },
      { q: "途中でプラン変更はできますか？", a: "いつでも変更可能です。友だち数の増加や機能追加のニーズに合わせて、柔軟にプランをアップグレードできます。" },
    ].map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
  /* HowTo — 導入ステップを構造化 */
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Lオペ for CLINICの導入方法",
    description: "お問い合わせから最短2週間で運用開始。初期設定はサポートチームが代行するため、現場の負担はほぼゼロです。",
    totalTime: "P14D",
    step: [
      { "@type": "HowToStep", position: 1, name: "お問い合わせ・ヒアリング", text: "貴院の課題・運用状況をヒアリング。最適なプランをご提案します。" },
      { "@type": "HowToStep", position: 2, name: "初期設定・構築", text: "LINE公式アカウントの設定、リッチメニュー構築、問診フォーム作成を代行。" },
      { "@type": "HowToStep", position: 3, name: "スタッフ研修・テスト運用", text: "管理画面の操作研修を実施。テスト環境で動作確認を行います。" },
      { "@type": "HowToStep", position: 4, name: "本番運用開始", text: "患者へのLINE告知を開始。運用開始後もサポートチームが伴走します。" },
    ],
  },
];

/* ─── 導入メリット数値 ─── */
const metrics = [
  { value: "80", unit: "%", label: "LINE開封率", note: "メールの約3倍", icon: "mail" as const },
  { value: "50", unit: "%", label: "無断キャンセル削減", note: "自動リマインドで", icon: "calendar" as const },
  { value: "3", unit: "倍", label: "再診率向上", note: "セグメント配信で", icon: "repeat" as const },
  { value: "60", unit: "%", label: "受付業務削減", note: "問診自動化で", icon: "clock" as const },
];

const metricIcons: Record<string, React.ReactNode> = {
  mail: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  calendar: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  repeat: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  clock: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

/* ─── お悩み ─── */
const painPoints = [
  { title: "予約の電話対応に追われている", desc: "診察中も電話が鳴り止まず、スタッフの手が足りない。患者を待たせてしまい機会損失も。", icon: "📞" },
  { title: "無断キャンセルが減らない", desc: "リマインドを手動で送る余裕がなく、当日キャンセルや無断キャンセルで売上が安定しない。", icon: "❌" },
  { title: "再診の促進ができていない", desc: "来院後のフォローがDMかメールだけ。開封率が低く、患者が離れていく。", icon: "📉" },
  { title: "問診票の転記に時間がかかる", desc: "紙の問診票を毎回カルテに転記。記入漏れも多く、診察前の準備に手間がかかる。", icon: "📝" },
  { title: "LINEを開設したが活用できていない", desc: "友だちは増えても配信や管理の方法がわからず、ただのお知らせツールに。", icon: "💬" },
  { title: "複数ツールの管理が煩雑", desc: "予約システム、配信ツール、決済ツールが別々。それぞれにログインして管理するのが非効率。", icon: "🔧" },
];

/* ─── 機能カテゴリ ─── */
const featureGroups = [
  {
    tag: "LINE運用",
    tagColor: "bg-green-50 text-green-700 ring-green-200/60",
    title: "患者とのコミュニケーションをLINEに集約",
    features: [
      { name: "LINEトーク・患者CRM", desc: "全患者の情報・対応履歴をLINE上で一元管理。タグ・メモ・対応状況で整理。", icon: "💬" },
      { name: "セグメント配信", desc: "来院履歴・タグ・年齢などで絞り込み、最適なメッセージを対象者だけに配信。", icon: "🎯" },
      { name: "リッチメニュービルダー", desc: "予約・問診・マイページへの導線を最適化。患者の状態に応じて自動切替。", icon: "📱" },
      { name: "AI自動返信", desc: "24時間対応のAIが患者のLINEメッセージに自動返信。スタッフの修正から学習し精度向上。", icon: "🤖" },
      { name: "自動アクション", desc: "友だち追加→メッセージ送信→タグ付与→メニュー切替を自動化。", icon: "⚡" },
    ],
  },
  {
    tag: "業務管理",
    tagColor: "bg-blue-50 text-blue-700 ring-blue-200/60",
    title: "予約から配送まで、一気通貫で管理",
    features: [
      { name: "予約管理", desc: "LINEで予約受付・変更・キャンセルを完結。前日自動リマインドで無断キャンセル防止。", icon: "📅" },
      { name: "オンライン問診", desc: "来院前にLINEで問診完了。待ち時間短縮と転記ミスの削減を同時に実現。", icon: "📋" },
      { name: "カルテ管理", desc: "SOAP形式で記録。音声カルテオプションで診察中の会話から自動生成。", icon: "🏥" },
      { name: "決済管理", desc: "LINE上でオンライン決済を完結。Square・GMO連携。決済完了をLINEで自動通知。", icon: "💳" },
      { name: "配送管理", desc: "処方薬の発送をワンクリック管理。CSV出力・追跡番号登録・患者通知まで一気通貫。", icon: "📦" },
    ],
  },
  {
    tag: "分析",
    tagColor: "bg-violet-50 text-violet-700 ring-violet-200/60",
    title: "データに基づいた経営判断をサポート",
    features: [
      { name: "ダッシュボード", desc: "予約数・売上・友だち数・リピート率をリアルタイム表示。", icon: "📊" },
      { name: "売上・LTV分析", desc: "患者ごとのLTVを自動算出。月次レポートをCSV出力。", icon: "💰" },
      { name: "配信分析", desc: "開封率・クリック率・予約転換率を可視化し、配信戦略を最適化。", icon: "📈" },
    ],
  },
];

/* ─── 比較表 ─── */
const comparisonItems = [
  { label: "クリニック専用設計", lope: true, generic: false },
  { label: "予約管理", lope: true, generic: false },
  { label: "オンライン問診", lope: true, generic: false },
  { label: "カルテ管理", lope: true, generic: false },
  { label: "決済連携（Square/GMO）", lope: true, generic: false },
  { label: "処方薬配送管理", lope: true, generic: false },
  { label: "セグメント配信", lope: true, generic: true },
  { label: "リッチメニュー", lope: true, generic: true },
  { label: "AI自動返信（医療特化）", lope: true, generic: false },
  { label: "自動アクション", lope: true, generic: true },
  { label: "導入設定サポート", lope: true, generic: false },
];

/* ─── 導入ステップ ─── */
const steps = [
  { num: "01", title: "お問い合わせ・ヒアリング", desc: "貴院の課題・運用状況をヒアリング。最適なプランをご提案します。", icon: "💡" },
  { num: "02", title: "初期設定・構築", desc: "LINE公式アカウントの設定、リッチメニュー構築、問診フォーム作成を代行。", icon: "🛠" },
  { num: "03", title: "スタッフ研修・テスト運用", desc: "管理画面の操作研修を実施。テスト環境で動作確認を行います。", icon: "🎓" },
  { num: "04", title: "本番運用開始", desc: "患者へのLINE告知を開始。運用開始後もサポートチームが伴走します。", icon: "🚀" },
];

/* ─── FAQ ─── */
const faqs = [
  { q: "LINE公式アカウントを持っていなくても始められますか？", a: "はい。LINE公式アカウントの開設から初期設定まで、すべてサポートいたします。既にアカウントをお持ちの場合は、既存の友だちデータを引き継いで導入可能です。" },
  { q: "Lステップなどの汎用ツールからの乗り換えは可能ですか？", a: "可能です。既存のLINE公式アカウントはそのまま利用でき、友だちリストも引き継げます。配信シナリオの移行もサポートいたします。" },
  { q: "患者の個人情報のセキュリティは大丈夫ですか？", a: "SSL暗号化通信、データの暗号化保存、アクセス権限管理、監査ログ機能を標準搭載。医療情報を扱うサービスとして、セキュリティを最優先に設計しています。" },
  { q: "導入にはどのくらいの期間がかかりますか？", a: "最短2週間で本番運用を開始できます。リッチメニューのデザインや問診フォームのカスタマイズ内容によって前後しますが、1ヶ月以内の導入が一般的です。" },
  { q: "月額費用以外にかかる費用はありますか？", a: "初期構築費用が別途必要です。月額費用にはすべての基本機能が含まれており、隠れた追加料金はありません。詳しくは料金ページをご覧ください。" },
  { q: "途中でプラン変更はできますか？", a: "いつでも変更可能です。友だち数の増加や機能追加のニーズに合わせて、柔軟にプランをアップグレードできます。" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFeatureSettings: "'palt'" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ヘッダー */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/lp" className="flex items-center gap-2">
            <span className="text-[15px] font-bold tracking-tight text-gray-900">Lオペ <span className="text-blue-600">for CLINIC</span></span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/lp" className="text-[13px] text-gray-500 hover:text-blue-600 transition">製品トップ</Link>
            <Link href="/lp/features" className="text-[13px] text-gray-500 hover:text-blue-600 transition">機能一覧</Link>
            <Link href="/lp/column" className="text-[13px] text-gray-500 hover:text-blue-600 transition">コラム</Link>
            <a href="/lp#contact" className="rounded-full bg-blue-600 px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 hover:shadow-md">
              無料で資料請求
            </a>
          </div>
        </div>
      </header>

      <main className="pt-14">
        {/* パンくず */}
        <nav aria-label="パンくずリスト" className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-6xl px-6 py-2.5">
            <ol className="flex items-center gap-1.5 text-[12px] text-gray-400 list-none m-0 p-0">
              <li><Link href="/lp" className="hover:text-blue-600 transition">トップ</Link></li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-gray-600">Lオペ for CLINICとは？</li>
            </ol>
          </div>
        </nav>

        {/* ═══ ヒーロー（ビジュアルリッチ） ═══ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          {/* 背景デコ */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-blue-100/30" />
            <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-indigo-100/20" />
            <div className="absolute right-1/3 top-1/2 h-32 w-32 rounded-full bg-violet-100/20" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
            <div className="flex flex-col items-center gap-12 md:flex-row md:items-center">
              {/* テキスト */}
              <div className="flex-1 text-center md:text-left">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-[12px] font-bold text-blue-700">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  クリニック特化 LINE運用プラットフォーム
                </span>
                <h1 className="mt-5 text-[30px] font-bold leading-snug tracking-tight text-gray-900 md:text-[44px] md:leading-[1.2]">
                  LINEで、<br className="hidden md:inline" />クリニック業務を<br className="hidden md:inline" />
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ひとつにまとめる。</span>
                </h1>
                <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-gray-500 md:text-[16px]">
                  予約管理・オンライン問診・セグメント配信・決済・配送管理まで。
                  クリニックに必要な機能をすべてLINE公式アカウント上で実現する、
                  業界唯一のオールインワンプラットフォームです。
                </p>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
                  <a href="/lp#contact" className="w-full rounded-full bg-blue-600 px-8 py-3.5 text-center text-[14px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg sm:w-auto">
                    無料で資料請求
                  </a>
                  <Link href="/lp" className="w-full rounded-full bg-white px-8 py-3.5 text-center text-[14px] font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 sm:w-auto">
                    製品トップを見る
                  </Link>
                </div>
              </div>

              {/* ヒーローイラスト（SVG） */}
              <div className="hidden w-full max-w-md md:block">
                <svg viewBox="0 0 400 320" className="w-full">
                  {/* スマートフォン */}
                  <rect x="140" y="20" width="120" height="220" rx="20" fill="white" stroke="#93c5fd" strokeWidth="2.5" />
                  <rect x="155" y="45" width="90" height="165" rx="6" fill="#eff6ff" />
                  <circle cx="200" cy="225" r="8" fill="none" stroke="#93c5fd" strokeWidth="1.5" />
                  <rect x="180" y="28" width="40" height="6" rx="3" fill="#dbeafe" />

                  {/* 画面内コンテンツ */}
                  <rect x="160" y="55" width="80" height="24" rx="4" fill="#06C755" opacity="0.15" />
                  <text x="200" y="71" textAnchor="middle" fill="#06C755" fontSize="10" fontWeight="bold">LINE予約</text>
                  <rect x="160" y="85" width="80" height="20" rx="4" fill="#3b82f6" opacity="0.1" />
                  <text x="200" y="99" textAnchor="middle" fill="#3b82f6" fontSize="9">オンライン問診</text>
                  <rect x="160" y="111" width="80" height="20" rx="4" fill="#8b5cf6" opacity="0.1" />
                  <text x="200" y="125" textAnchor="middle" fill="#8b5cf6" fontSize="9">セグメント配信</text>
                  <rect x="160" y="137" width="80" height="20" rx="4" fill="#06b6d4" opacity="0.1" />
                  <text x="200" y="151" textAnchor="middle" fill="#06b6d4" fontSize="9">オンライン決済</text>
                  <rect x="160" y="163" width="80" height="20" rx="4" fill="#f59e0b" opacity="0.1" />
                  <text x="200" y="177" textAnchor="middle" fill="#d97706" fontSize="9">配送管理</text>

                  {/* リッチメニュー風 */}
                  <rect x="160" y="190" width="38" height="16" rx="3" fill="#dbeafe" />
                  <rect x="202" y="190" width="38" height="16" rx="3" fill="#dcfce7" />

                  {/* 左側チャット吹き出し */}
                  <rect x="30" y="60" width="90" height="40" rx="12" fill="white" stroke="#93c5fd" strokeWidth="1.5" />
                  <text x="75" y="78" textAnchor="middle" fill="#3b82f6" fontSize="9">明日の予約を</text>
                  <text x="75" y="91" textAnchor="middle" fill="#3b82f6" fontSize="9">リマインド 🔔</text>

                  {/* 右側通知 */}
                  <rect x="280" y="80" width="95" height="36" rx="10" fill="white" stroke="#a78bfa" strokeWidth="1.5" />
                  <text x="327" y="96" textAnchor="middle" fill="#7c3aed" fontSize="8.5">決済完了 ✅</text>
                  <text x="327" y="108" textAnchor="middle" fill="#a78bfa" fontSize="8">自動で配送手配</text>

                  {/* 左下AI */}
                  <rect x="40" y="160" width="80" height="36" rx="10" fill="white" stroke="#06b6d4" strokeWidth="1.5" />
                  <text x="80" y="176" textAnchor="middle" fill="#0891b2" fontSize="8.5">AI自動返信 🤖</text>
                  <text x="80" y="188" textAnchor="middle" fill="#06b6d4" fontSize="8">24時間対応</text>

                  {/* 右下グラフ */}
                  <rect x="290" y="170" width="80" height="60" rx="8" fill="white" stroke="#22c55e" strokeWidth="1.5" />
                  <text x="330" y="186" textAnchor="middle" fill="#16a34a" fontSize="8" fontWeight="bold">再診率</text>
                  <path d="M305 215l12-8 12-4 12-12 12-6" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
                  <text x="330" y="226" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">↑ 150%</text>

                  {/* 接続線 */}
                  <path d="M120 80l20 0" stroke="#dbeafe" strokeWidth="1.5" strokeDasharray="4 3" />
                  <path d="M260 98l20 0" stroke="#ede9fe" strokeWidth="1.5" strokeDasharray="4 3" />
                  <path d="M120 178l20 0" stroke="#cffafe" strokeWidth="1.5" strokeDasharray="4 3" />
                  <path d="M260 200l30 0" stroke="#dcfce7" strokeWidth="1.5" strokeDasharray="4 3" />

                  {/* デコ丸 */}
                  <circle cx="50" cy="130" r="6" fill="#dbeafe" opacity="0.5" />
                  <circle cx="350" cy="50" r="8" fill="#ede9fe" opacity="0.4" />
                  <circle cx="320" cy="260" r="5" fill="#dcfce7" opacity="0.5" />
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 数値実績（カード型+アイコン） ═══ */}
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-14 md:py-16">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-6 text-center ring-1 ring-blue-100/50">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    {metricIcons[m.icon]}
                  </div>
                  <p className="mt-3 text-[32px] font-bold tracking-tight text-gray-900 md:text-[40px]">
                    {m.value}<span className="text-[16px] text-gray-400">{m.unit}</span>
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-gray-700">{m.label}</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">{m.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ お悩み ═══ */}
        <section className="border-b border-gray-100">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">Pain Points</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              こんなお悩みはありませんか？
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {painPoints.map((p) => (
                <div key={p.title} className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-[18px]">
                    {p.icon}
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-gray-900">{p.title}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-gray-500">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-6 py-3 ring-1 ring-blue-100">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <p className="text-[15px] font-bold text-gray-900">
                  これらの課題を<span className="text-blue-600">すべて解決</span>するのが <span className="text-blue-600">Lオペ for CLINIC</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ Lオペとは ═══ */}
        <section className="border-b border-gray-100 bg-gradient-to-br from-blue-50/50 to-indigo-50/30">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">What is Lオペ?</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              Lオペ for CLINICとは
            </h2>
            <div className="mx-auto mt-10 max-w-3xl space-y-5 text-[15px] leading-[1.9] text-gray-600">
              <p>
                <strong className="text-gray-900">Lオペ for CLINIC</strong>は、クリニックのためだけに設計されたLINE公式アカウント運用プラットフォームです。
              </p>
              <p>
                一般的なLINE配信ツール（Lステップ、Liny等）は、飲食店・EC・スクールなど幅広い業種向けに設計されています。そのため、クリニック特有の<strong className="text-gray-900">予約管理・問診・カルテ・決済・配送</strong>といった業務には対応していません。
              </p>
              <div className="rounded-xl bg-white p-6 ring-1 ring-blue-100">
                <p className="text-[14px] font-bold text-gray-900">
                  「LINEの配信ツール」ではなく、「LINEで動くクリニックの業務基盤」。
                </p>
                <p className="mt-2 text-[13px] text-gray-500">
                  LINE公式アカウントひとつで、受付から診察後のフォローアップまで、クリニック業務を一気通貫で管理できます。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 機能紹介（アイコン付きカード） ═══ */}
        <section className="border-b border-gray-100">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">Features</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              主な機能
            </h2>

            <div className="mt-12 space-y-14">
              {featureGroups.map((group) => (
                <div key={group.tag}>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${group.tagColor}`}>{group.tag}</span>
                    <h3 className="text-[16px] font-bold text-gray-900">{group.title}</h3>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {group.features.map((f) => (
                      <div key={f.name} className="rounded-xl border border-gray-200 bg-white p-5 transition hover:border-blue-200 hover:shadow-md hover:-translate-y-0.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-[16px]">{f.icon}</span>
                          <p className="text-[14px] font-bold text-gray-900">{f.name}</p>
                        </div>
                        <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href="/lp/features" className="inline-flex items-center gap-1.5 rounded-full bg-gray-50 px-6 py-2.5 text-[13px] font-semibold text-blue-600 ring-1 ring-gray-200 transition hover:bg-blue-50 hover:ring-blue-200">
                全機能一覧を見る
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA中間 */}
        <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
          <div className="mx-auto max-w-3xl px-6 py-14 text-center">
            <p className="text-[16px] font-bold text-gray-900">まずは資料で全体像をご確認ください</p>
            <p className="mt-2 text-[13px] text-gray-500">機能一覧・料金・導入事例をまとめた資料を無料でお送りします。</p>
            <a href="/lp#contact" className="mt-5 inline-block rounded-full bg-blue-600 px-8 py-3 text-[13px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg">
              無料で資料請求
            </a>
          </div>
        </section>

        {/* ═══ 比較表 ═══ */}
        <section className="border-b border-gray-100">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">Comparison</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              汎用LINE配信ツールとの違い
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[13px] text-gray-500">
              Lステップ・Liny等の汎用LINE配信ツールは「配信」に特化。Lオペ for CLINICは「クリニック業務全体」をカバーします。
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-4 text-left font-semibold text-gray-700">機能</th>
                    <th className="px-5 py-4 text-center">
                      <span className="font-bold text-blue-600">Lオペ for CLINIC</span>
                    </th>
                    <th className="px-5 py-4 text-center font-semibold text-gray-400">汎用配信ツール</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparisonItems.map((item) => (
                    <tr key={item.label} className="hover:bg-blue-50/30 transition">
                      <td className="px-5 py-3.5 text-gray-700">{item.label}</td>
                      <td className="px-5 py-3.5 text-center">
                        {item.lope ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {item.generic ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-center">
              <Link href="/lp/column/lstep-vs-clinic-tool" className="text-[13px] font-medium text-blue-600 hover:underline">
                Lステップ・Linyとの詳細比較記事を読む →
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ 導入ステップ（タイムライン） ═══ */}
        <section className="border-b border-gray-100 bg-gradient-to-br from-blue-50/30 to-white">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">How it works</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              導入の流れ
            </h2>

            <div className="mt-12 grid gap-0 md:grid-cols-4">
              {steps.map((s, i) => (
                <div key={s.num} className="relative flex flex-col items-center text-center">
                  {/* 接続線 */}
                  {i < steps.length - 1 && (
                    <div className="absolute left-1/2 top-7 hidden h-px w-full bg-gradient-to-r from-blue-200 to-blue-100 md:block" />
                  )}
                  {/* 番号サークル */}
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-[20px] shadow-md shadow-blue-200">
                    {s.icon}
                  </div>
                  <span className="mt-2 text-[11px] font-bold text-blue-400">STEP {s.num}</span>
                  <h3 className="mt-2 text-[14px] font-bold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">FAQ</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              よくあるご質問
            </h2>
            <div className="mt-10 space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-blue-200">
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-[14px] font-bold text-gray-900">
                    <span className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-bold text-blue-600">Q</span>
                      {f.q}
                    </span>
                    <svg className="h-4 w-4 shrink-0 text-gray-400 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </summary>
                  <div className="border-t border-gray-100 px-6 py-4">
                    <p className="text-[13px] leading-relaxed text-gray-500">{f.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 最終CTA（明るいトーン） ═══ */}
        <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-20">
            <p className="text-[12px] font-bold tracking-widest text-blue-400 uppercase">Get Started</p>
            <h2 className="mt-3 text-[24px] font-bold tracking-tight text-gray-900 md:text-[32px]">
              クリニックのLINE活用を<br className="sm:hidden" />始めませんか？
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] text-gray-500">
              まずは無料の資料請求から。貴院の課題に合わせた活用方法をご提案します。
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a href="/lp#contact" className="w-full rounded-full bg-blue-600 px-8 py-3.5 text-[14px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg sm:w-auto">
                無料で資料請求
              </a>
              <Link href="/lp#pricing" className="w-full rounded-full bg-white px-8 py-3.5 text-[14px] font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 sm:w-auto">
                料金プランを見る
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* フッター（明るいトーン） */}
      <footer className="border-t border-gray-200 bg-white py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 md:flex-row md:justify-between">
          <p className="text-[13px] font-bold text-gray-900">Lオペ <span className="text-blue-600">for CLINIC</span></p>
          <div className="flex items-center gap-6">
            <Link href="/lp" className="text-[12px] text-gray-400 hover:text-blue-600 transition">製品トップ</Link>
            <Link href="/lp/features" className="text-[12px] text-gray-400 hover:text-blue-600 transition">機能一覧</Link>
            <Link href="/lp/column" className="text-[12px] text-gray-400 hover:text-blue-600 transition">コラム</Link>
          </div>
          <p className="text-[11px] text-gray-400">&copy; 2026 Lオペ for CLINIC</p>
        </div>
      </footer>
    </div>
  );
}
