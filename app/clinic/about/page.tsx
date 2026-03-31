import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for CLINICとは？ — AI搭載クリニック特化LINE運用プラットフォーム",
  description:
    "Lオペ for CLINICはClaude AI・自動学習・追跡番号自動配信を搭載したクリニック特化LINE運用プラットフォーム。予約管理・オンライン問診・セグメント配信・決済・配送まで、クリニック業務をLINEで一元化。",
  keywords: "Lオペ, Lオペとは, Lオペ for CLINIC とは, クリニック LINE AI, Claude AI クリニック, AI 自動学習, 追跡番号 自動配信, クリニック DX 導入, Lステップ 違い, クリニック 業務効率化, 医療DX プラットフォーム, LINE CRM クリニック",
  alternates: { canonical: `${SITE_URL}/clinic/about` },
  openGraph: {
    title: "Lオペ for CLINICとは？ — AI搭載クリニック特化LINE運用プラットフォーム",
    description: "Claude AI・自動学習・追跡番号自動配信搭載。予約・問診・配信・決済・配送をLINEで一元化するクリニック専用プラットフォーム。",
    url: `${SITE_URL}/clinic/about`,
    siteName: "Lオペ for CLINIC",
    locale: "ja_JP",
    type: "website",
    images: [{ url: `${SITE_URL}/clinic/about/opengraph-image`, width: 1200, height: 630 }],
  },
};

/* JSON-LD */
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Lオペ for CLINICとは？",
    description: "AI搭載クリニック特化LINE公式アカウント運用プラットフォーム",
    url: `${SITE_URL}/clinic/about`,
    isPartOf: { "@type": "WebSite", name: "Lオペ for CLINIC", url: SITE_URL },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Lオペ for CLINICとは？", item: `${SITE_URL}/clinic/about` },
      ],
    },
  },
  /* FAQPage — Google検索結果にFAQ表示 */
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { q: "LオペのAI自動返信はどのAIモデルを使っていますか？", a: "Anthropic社のClaude（最新モデル）を標準搭載しています。管理画面からGPTなど他モデルへの切替も可能で、用途やコストに応じて最適なモデルを選択できます。" },
      { q: "AI自動返信の精度はどのように向上しますか？", a: "スタッフが修正した返信や手動で送信したメッセージをAIが自動学習し、クリニック固有のナレッジベースを構築。使い込むほど精度が向上します。" },
      { q: "追跡番号のLINE配信はどのように行われますか？", a: "決済完了した注文を発送リストから選択し、配送会社のラベルをCSV出力。発送後は追跡番号がLINEで患者に自動配信されます。ヤマト運輸・日本郵便に対応しています。" },
      { q: "汎用LINE配信ツール（Lステップ等）との違いは？", a: "Lステップ等はLINE配信に特化した汎用ツールです。Lオペはクリニック専用設計で、予約・問診・カルテ・決済・配送・AI自動返信・音声カルテまで一気通貫で対応。クリニック業務全体をLINE上で完結できます。" },
      { q: "患者の個人情報のセキュリティは大丈夫ですか？", a: "SSL暗号化通信、データの暗号化保存、アクセス権限管理、監査ログ機能を標準搭載。医療情報を扱うサービスとして、セキュリティを最優先に設計しています。" },
    ].map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

/* ─── 導入メリット数値 ─── */
const metrics = [
  { value: "90", unit: "%", label: "LINE開封率", note: "メールDM（12%）の約7倍", icon: "mail" as const },
  { value: "80", unit: "%", label: "無断キャンセル削減", note: "自動リマインドで", icon: "calendar" as const },
  { value: "3", unit: "倍", label: "再診率向上", note: "セグメント配信で", icon: "repeat" as const },
  { value: "60", unit: "%", label: "受付業務削減", note: "問診・予約自動化で", icon: "clock" as const },
];

const metricIcons: Record<string, React.ReactNode> = {
  mail: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  calendar: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  repeat: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  clock: <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

/* ─── AI技術スタック ─── */
const aiTechStack = [
  {
    icon: "sparkles",
    badge: "LLM",
    title: "Claude AI搭載 自動返信",
    desc: "Anthropic社の最新モデル「Claude」を標準搭載。患者の問い合わせ内容を深く理解し、予約状況・決済・配送情報も踏まえた高精度な返信を自動生成します。",
    details: [
      "自然言語理解による文脈を考慮した返信",
      "予約・会計・配送ステータスとリアルタイム連携",
      "スタッフ確認モード / 完全自動モード 切替可能",
      "管理画面からClaude・GPT等を自由に切替",
    ],
  },
  {
    icon: "brain",
    badge: "AI",
    title: "自動学習エンジン",
    desc: "スタッフの修正や手動返信をAIが自動で学習。クリニック固有のナレッジベースを構築し、使い込むほど精度が向上します。",
    details: [
      "スタッフの修正送信を自動で学習データ化",
      "手動返信もナレッジとして蓄積",
      "類似質問の自動検索（コサイン類似度）",
      "学習データの確認・編集・削除が管理画面で可能",
    ],
  },
  {
    icon: "flex",
    badge: "AI",
    title: "AI Flex Messageビルダー",
    desc: "テキストと画像を送るだけで、AIがLINE Flex Message（カード型リッチメッセージ）を自動生成。ブロックエディタで微調整も可能。プリセットテンプレートも豊富で、ノーコードでリッチなカード型メッセージを作成・配信できます。",
    details: [
      "テキスト指示+画像添付でAIが自動レイアウト",
      "12種類のブロック（画像・ボタン・クーポン・カウントダウン等）",
      "プリセットから選ぶだけでも即配信可能",
      "カルーセル（複数パネル）にも対応",
    ],
  },
  {
    icon: "label",
    badge: "自動化",
    title: "発送ラベル自動生成から追跡番号配信まで",
    desc: "決済完了した注文を一覧から選択し、大手配送会社の送り状ラベルをCSV出力。発送後は追跡番号をLINEで患者に自動配信。発送業務の手間を大幅に削減します。",
    details: [
      "決済済み注文の一括選択・ラベルCSV出力",
      "ヤマト運輸・日本郵便に対応",
      "追跡番号を患者にLINEで自動配信",
      "発送ステータスをリアルタイム管理",
    ],
  },
  {
    icon: "flow",
    badge: "自動化",
    title: "フロービルダー & 自動アクション",
    desc: "友だち追加→メッセージ送信→タグ付与→メニュー切替まで、ノーコードで自動化フローを構築。ステップ配信やA/Bテストも管理画面から設定可能です。",
    details: [
      "ドラッグ＆ドロップでフロー構築",
      "条件分岐・時間指定・タグ条件に対応",
      "ステップ配信（初診後7日→30日→90日）",
      "配信のA/Bテスト機能",
    ],
  },
];

const aiTechIcons: Record<string, React.ReactNode> = {
  sparkles: <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  brain: <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  label: <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" strokeLinecap="round" strokeLinejoin="round" /><path d="M6 6h.008v.008H6V6z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  flex: <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  flow: <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
};

/* ─── 機能カテゴリ ─── */
const featureGroups = [
  {
    tag: "LINE運用",
    tagColor: "bg-green-50 text-green-700 ring-green-200/60",
    title: "患者とのコミュニケーションをLINEに集約",
    features: [
      { name: "LINEトーク・患者CRM", desc: "全患者の情報・対応履歴をLINE上で一元管理。タグ・メモ・対応状況で整理。", icon: "💬" },
      { name: "セグメント配信", desc: "来院履歴・タグ・年齢などで絞り込み、最適なメッセージを対象者だけに配信。", icon: "🎯" },
      { name: "キーワード自動返信", desc: "特定キーワードに反応して自動でメッセージ・タグ付与・メニュー切替を実行。", icon: "📱" },
    ],
  },
  {
    tag: "業務管理",
    tagColor: "bg-blue-50 text-blue-700 ring-blue-200/60",
    title: "予約から配送まで、一気通貫で管理",
    features: [
      { name: "予約管理", desc: "LINEで予約受付・変更・キャンセルを完結。前日自動リマインドで無断キャンセル防止。", icon: "📅" },
      { name: "オンライン問診", desc: "来院前にLINEで問診完了。待ち時間短縮と転記ミスの削減を同時に実現。", icon: "📋" },
      { name: "決済・配送管理", desc: "LINE上でオンライン決済を完結。Square・GMO連携。処方薬の配送まで一気通貫。", icon: "💳" },
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
  { label: "AI自動返信（Claude搭載）", lope: true, generic: false },
  { label: "自動学習", lope: true, generic: false },
  { label: "追跡番号LINE自動配信", lope: true, generic: false },
  { label: "AIモデル選択（Claude/GPT）", lope: true, generic: false },
  { label: "予約管理", lope: true, generic: false },
  { label: "オンライン問診", lope: true, generic: false },
  { label: "カルテ管理", lope: true, generic: false },
  { label: "決済連携（Square/GMO）", lope: true, generic: false },
  { label: "処方薬配送管理", lope: true, generic: false },
  { label: "セグメント配信", lope: true, generic: true },
  { label: "キーワード自動返信", lope: true, generic: true },
  { label: "自動アクション", lope: true, generic: true },
  { label: "導入設定サポート", lope: true, generic: false },
];

/* ─── 開発思想 ─── */
const philosophies = [
  {
    num: "01",
    title: "院長＋事務1人で全業務が回る",
    desc: "予約・問診・決済・配送・患者対応をすべてLINEに集約。バラバラだったツールの契約・管理コストを削減し、最小人数でクリニック運営を完結できます。ツール代も人件費もまるごと削減。",
  },
  {
    num: "02",
    title: "使うほど賢くなるプラットフォーム",
    desc: "自動学習エンジンにより、スタッフの対応がそのままAIの学習データに。クリニックごとの言い回し・対応方針をAIが自動で習得し、返信精度が日々向上します。",
  },
  {
    num: "03",
    title: "クリニック専用だから、すぐ使える",
    desc: "汎用ツールのように自分でカスタマイズする必要はありません。クリニック業務に必要な機能がすべて最初から組み込まれています。導入設定もサポートチームが代行します。",
  },
  {
    num: "04",
    title: "LINEひとつで完結する設計",
    desc: "予約システム、決済ツール、配信ツール、カルテシステム。バラバラだったツールをLINE公式アカウントに統合。管理画面も1つ、患者の導線もシンプルになります。",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFeatureSettings: "'palt'" }}>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded focus:shadow-lg focus:text-sky-700">
        メインコンテンツへスキップ
      </a>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ヘッダー */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[15px] font-bold tracking-tight text-gray-900">Lオペ <span className="text-blue-600">for CLINIC</span></span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/" className="text-[13px] text-gray-500 hover:text-blue-600 transition">製品トップ</Link>
            <Link href="/clinic/features" className="text-[13px] text-gray-500 hover:text-blue-600 transition">機能一覧</Link>
            <Link href="/clinic/column" className="text-[13px] text-gray-500 hover:text-blue-600 transition">コラム</Link>
            <a href="/#contact" className="rounded-full bg-blue-600 px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-700 hover:shadow-md">
              無料で資料請求
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" className="pt-14">
        {/* パンくず */}
        <nav aria-label="パンくずリスト" className="border-b border-gray-100 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-6 py-2.5">
            <ol className="flex items-center gap-1.5 text-[12px] text-gray-400 list-none m-0 p-0">
              <li><Link href="/" className="hover:text-blue-600 transition">トップ</Link></li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-gray-600">Lオペ for CLINICとは？</li>
            </ol>
          </div>
        </nav>

        {/* ═══ ヒーロー — 管理画面モック + 具体的にできること訴求 ═══ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-500/10" />
            <div className="absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-blue-500/10" />
          </div>

          <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
            {/* 上部テキスト — 中央揃え */}
            <div className="text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1 text-[12px] font-bold text-violet-300 ring-1 ring-violet-400/30">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                AI搭載 クリニック特化プラットフォーム
              </span>
              <h1 className="mt-5 text-[28px] font-bold leading-snug tracking-tight text-white md:text-[42px] md:leading-[1.2]">
                1つの管理画面で、<br className="hidden md:inline" />
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">AIがクリニック業務を自動化。</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-[14px] leading-relaxed text-slate-400 md:text-[15px]">
                AIが患者のLINEに24時間自動返信。診察の会話からカルテを自動生成。スタッフの対応を自動学習して日々精度向上。
                予約・問診・決済・配送まで、すべてこの画面から。
              </p>
              <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <a href="/#contact" className="w-full rounded-full bg-violet-600 px-8 py-3.5 text-center text-[14px] font-bold text-white transition hover:bg-violet-500 hover:shadow-lg hover:shadow-violet-500/25 sm:w-auto">
                  無料で資料請求
                </a>
                <Link href="/" className="w-full rounded-full bg-white/10 px-8 py-3.5 text-center text-[14px] font-bold text-white ring-1 ring-white/20 transition hover:bg-white/20 sm:w-auto">
                  製品トップを見る
                </Link>
              </div>
            </div>

            {/* 管理画面モック — 実装に即した3カラムトーク画面 */}
            <div className="mx-auto mt-12 max-w-5xl">
              <div className="overflow-hidden rounded-xl shadow-2xl shadow-black/40 ring-1 ring-white/10">
                {/* メインUI: サイドバー + コンテンツ */}
                <div className="flex" style={{ height: "520px" }}>
                  {/* ═══ サイドバー ═══ */}
                  <div className="hidden w-[150px] shrink-0 flex-col bg-slate-900 px-2.5 py-3 md:flex">
                    <div className="flex items-center gap-1.5 px-1">
                      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-r from-cyan-400 to-blue-500">
                        <span className="text-[8px] font-bold text-white">L</span>
                      </div>
                      <span className="text-[10px] font-bold text-white">Lオペ <span className="text-blue-400">for CLINIC</span></span>
                    </div>
                    <nav className="mt-5 flex-1 space-y-0.5 text-[10px]">
                      <div className="rounded-md px-2 py-1.5 text-slate-400 hover:bg-white/5">📊 ダッシュボード</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400 hover:bg-white/5">💹 売上管理</div>
                      <div className="rounded-md bg-white/10 px-2 py-1.5 font-bold text-white">💬 LINE機能 <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] text-white">5</span></div>
                      <div className="mt-3 px-2 pb-0.5 text-[8px] font-bold tracking-wider text-slate-600">予約・診察</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400">📅 予約リスト</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400">🔄 再処方リスト</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400">📋 カルテ</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400">🩺 簡易カルテ</div>
                      <div className="mt-3 px-2 pb-0.5 text-[8px] font-bold tracking-wider text-slate-600">決済管理</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400">💳 決済</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400">🏦 銀行振込照合</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400">🔄 定期プラン</div>
                      <div className="mt-3 px-2 pb-0.5 text-[8px] font-bold tracking-wider text-slate-600">発送管理</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400">📦 発送</div>
                      <div className="rounded-md px-2 py-1.5 text-slate-400">🏷 追跡番号</div>
                    </nav>
                  </div>

                  {/* ═══ コンテンツエリア ═══ */}
                  <div className="flex flex-1 flex-col bg-white">
                    {/* タブ1行目 — メイン機能 */}
                    <div className="flex items-center border-b border-gray-200 bg-white px-1 text-[9px] md:text-[10px]">
                      <span className="px-2.5 py-2 text-gray-400">トップ</span>
                      <span className="px-2.5 py-2 text-gray-400">友達一覧</span>
                      <span className="border-b-2 border-[#06C755] px-2.5 py-2 font-bold text-[#06C755]">個別トーク</span>
                      <span className="px-2.5 py-2 text-gray-400">一斉送信</span>
                      <span className="px-2.5 py-2 text-gray-400">テンプレート</span>
                      <span className="hidden px-2.5 py-2 text-gray-400 md:inline">回答フォーム</span>
                      <span className="hidden px-2.5 py-2 text-gray-400 md:inline">ステップ配信</span>
                      <span className="hidden px-2.5 py-2 text-gray-400 md:inline">自動応答</span>
                      <span className="hidden px-2.5 py-2 text-gray-400 md:inline">AI返信</span>
                      <span className="hidden px-2.5 py-2 text-gray-400 md:inline">リマインド</span>
                      <span className="hidden px-2.5 py-2 text-gray-400 lg:inline">タグ管理</span>
                      <span className="hidden px-2.5 py-2 text-gray-400 lg:inline">アクション管理</span>
                    </div>
                    {/* タブ2行目 — 設定・管理 */}
                    <div className="flex items-center border-b border-gray-100 bg-white px-1 text-[8px] md:text-[9px]">
                      <span className="px-2 py-1.5 text-gray-400">対応マーク</span>
                      <span className="px-2 py-1.5 text-gray-400">情報欄</span>
                      <span className="px-2 py-1.5 text-gray-400">メディア</span>
                      <span className="px-2 py-1.5 text-gray-400">リッチメニュー</span>
                      <span className="px-2 py-1.5 text-gray-400">友達追加時設定</span>
                      <span className="hidden px-2 py-1.5 text-gray-400 md:inline">チャットボット</span>
                      <span className="hidden px-2 py-1.5 text-gray-400 md:inline">フロービルダー</span>
                      <span className="hidden px-2 py-1.5 text-gray-400 md:inline">A/Bテスト</span>
                      <span className="hidden px-2 py-1.5 text-gray-400 md:inline">クーポン</span>
                      <span className="hidden px-2 py-1.5 text-gray-400 lg:inline">クリック分析</span>
                      <span className="hidden px-2 py-1.5 text-gray-400 lg:inline">配信効果分析</span>
                      <span className="hidden px-2 py-1.5 text-gray-400 lg:inline">NPS</span>
                    </div>

                    {/* ═══ 3カラムトーク画面 ═══ */}
                    <div className="flex flex-1 overflow-hidden">
                      {/* 左: 友達リスト */}
                      <div className="hidden w-[180px] shrink-0 flex-col border-r border-gray-200 bg-white md:flex">
                        {/* 検索 */}
                        <div className="space-y-1.5 border-b border-gray-100 p-2.5">
                          <div className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1">
                            <span className="text-[8px] font-bold text-gray-400">ID</span>
                            <span className="text-[8px] text-gray-300">患者IDで検索</span>
                          </div>
                          <div className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1">
                            <span className="text-[8px] text-gray-400">🔍</span>
                            <span className="text-[8px] text-gray-300">氏名で検索</span>
                          </div>
                          <div className="flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-2 py-1">
                            <span className="text-[8px] text-gray-400">💬</span>
                            <span className="text-[8px] text-gray-300">メッセージ内容で検索</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-b border-gray-100 px-2.5 py-1.5">
                          <span className="text-[9px] text-gray-500">56+件</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[8px] text-orange-500">📌 8</span>
                            <label className="flex items-center gap-1 text-[8px] text-gray-400"><input type="checkbox" className="h-2.5 w-2.5" readOnly /> 未読のみ</label>
                          </div>
                        </div>
                        {/* 友達リスト */}
                        <div className="flex-1 overflow-y-auto">
                          {[
                            { name: "田中 美咲", sub: "「マイページ」をタップしました", time: "昨日", badge: "処方ずみ", badgeColor: "bg-blue-500", pin: true, img: "bg-purple-100 text-purple-600" },
                            { name: "佐藤 あかり", sub: "すみません電話に出られなく、時間変更で…", time: "昨日", badge: "不通", badgeColor: "bg-gray-400", pin: true, img: "bg-pink-100 text-pink-600" },
                            { name: "鈴木 陽菜", sub: "了解です", time: "3/24", badge: "処方ずみ", badgeColor: "bg-blue-500", pin: true, img: "bg-amber-100 text-amber-600" },
                            { name: "高橋 結衣", sub: "「マイページ」をタップしました", time: "昨日", badge: "処方ずみ", badgeColor: "bg-blue-500", pin: false, img: "bg-teal-100 text-teal-600" },
                            { name: "山本 さくら", sub: "リッチメニュー操作", time: "0:07", badge: "処方ずみ", badgeColor: "bg-blue-500", active: true, img: "bg-orange-100 text-orange-600" },
                            { name: "伊藤 凛", sub: "ありがとうございます", time: "昨日", badge: "未対応", badgeColor: "bg-red-500", pin: false, img: "bg-rose-100 text-rose-600" },
                            { name: "渡辺 七海", sub: "「マイページ」をタップしました", time: "昨日", badge: "未対応", badgeColor: "bg-red-500", pin: false, img: "bg-sky-100 text-sky-600" },
                          ].map((f) => (
                            <div key={f.name} className={`flex items-start gap-2 border-b border-gray-50 px-2.5 py-2.5 ${f.active ? "bg-blue-50/60" : "hover:bg-gray-50"}`}>
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${f.img}`}>
                                {f.name[0]}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="truncate text-[10px] font-bold text-gray-800">{f.name}</p>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="text-[8px] text-gray-400">{f.time}</span>
                                    {f.pin && <span className="text-[8px] text-amber-500">📌</span>}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <p className={`truncate text-[8px] ${"blocked" in f && f.blocked ? "text-red-400" : "text-gray-400"}`}>{f.sub}</p>
                                  <span className={`shrink-0 ml-1 rounded px-1 py-0.5 text-[7px] font-bold text-white ${f.badgeColor}`}>{f.badge}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 中央: メッセージ — 決済・発送通知 */}
                      <div className="flex flex-1 flex-col">
                        {/* ヘッダー — LINEグリーン */}
                        <div className="flex items-center justify-between bg-gradient-to-r from-[#00B900] to-[#00a000] px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <p className="text-[12px] font-bold text-white">山本 さくら</p>
                            <p className="text-[10px] font-mono text-white/70">20260922047</p>
                          </div>
                          <span className="text-[12px] text-amber-300">🔖</span>
                        </div>
                        {/* メッセージエリア */}
                        <div className="relative flex-1 overflow-hidden">
                        <div className="absolute inset-0 space-y-3 overflow-y-auto bg-[#7494C0]/15 p-3">
                          {/* Flex: 決済のご案内 — 右寄せ（管理側から送信） */}
                          <div className="flex items-end justify-end gap-1.5">
                              <span className="text-[7px] text-gray-400">10:44</span>
                              <div className="max-w-[75%] overflow-hidden rounded-lg bg-white shadow-sm">
                                <div className="bg-[#06C755] px-3 py-2 text-[10px] font-bold text-white">決済のご案内</div>
                                <div className="p-3">
                                  <p className="text-[9px] leading-relaxed text-gray-700">診療後はマイページより決済が可能となっております。ご確認いただけますと幸いです。</p>
                                </div>
                              </div>
                          </div>

                          {/* アクション通知 — 中央 */}
                          <div className="text-center">
                            <span className="text-[8px] text-gray-400">23:17</span>
                            <div className="mt-0.5">
                              <span className="rounded-full bg-gray-200/80 px-3 py-0.5 text-[8px] text-gray-500">「マイページ」をタップしました</span>
                            </div>
                          </div>

                          {/* Flex: 決済完了 — 右寄せ（管理側から送信） */}
                          <div className="flex items-end justify-end gap-1.5">
                              <span className="text-[7px] text-gray-400">6:50</span>
                              <div className="max-w-[75%] overflow-hidden rounded-lg bg-white shadow-sm">
                                <div className="bg-[#4a8fcc] px-3 py-2 text-[10px] font-bold text-white">決済完了</div>
                                <div className="p-3 text-[9px]">
                                  <p className="font-bold text-amber-600">ご注文内容</p>
                                  <div className="mt-1.5 space-y-0.5 text-right text-gray-700">
                                    <p>マンジャロ 5mg 1ヶ月</p>
                                    <p>¥22,850</p>
                                    <p>クレジットカード決済</p>
                                  </div>
                                  <div className="my-2 border-t border-gray-200" />
                                  <p className="font-bold text-amber-600">配送先情報</p>
                                  <div className="mt-1.5 space-y-0.5 text-right text-gray-700">
                                    <p>山本さくら</p>
                                    <p>100-0000</p>
                                    <p>東京都○○区△△1-2-3</p>
                                  </div>
                                  <div className="my-2 border-t border-gray-200" />
                                  <p className="text-[9px] text-gray-600">決済が完了しました。発送準備が整い次第、追跡番号をお知らせいたします。</p>
                                </div>
                              </div>
                          </div>

                          {/* 日付区切り */}
                          <div className="text-center">
                            <span className="rounded-full bg-gray-400/80 px-4 py-1 text-[8px] font-bold text-white">2026年9月25日</span>
                          </div>

                          {/* アクション通知 — 中央 */}
                          <div className="text-center">
                            <span className="text-[8px] text-gray-400">8:45</span>
                            <div className="mt-0.5">
                              <span className="rounded-full bg-gray-200/80 px-3 py-0.5 text-[8px] text-gray-500">「マイページ」をタップしました</span>
                            </div>
                          </div>

                          {/* Flex: 発送完了のお知らせ — 右寄せ（管理側から送信） */}
                          <div className="flex items-end justify-end gap-1.5">
                              <span className="text-[7px] text-gray-400">16:03</span>
                              <div className="max-w-[75%] overflow-hidden rounded-lg bg-white shadow-sm">
                                <div className="bg-[#ec4899] px-3 py-2.5 text-[11px] font-bold text-white">発送完了のお知らせ</div>
                                <div className="p-3">
                                  {/* 配送プログレスバー */}
                                  <div className="flex items-center justify-between text-[8px] text-gray-500">
                                    <span>発送</span>
                                    <span>お届け予定</span>
                                  </div>
                                  <div className="relative mt-1 h-2.5 w-full rounded-full bg-pink-100">
                                    <div className="absolute left-0 top-0 h-2.5 w-[55%] rounded-full bg-gradient-to-r from-yellow-400 to-pink-400" />
                                    <div className="absolute left-0 top-0 flex h-2.5 w-5 items-center justify-center rounded-full bg-pink-200 text-[6px]">✓</div>
                                  </div>
                                  <p className="mt-1 text-center text-[8px] text-gray-500">（ヤマト運輸）</p>

                                  <div className="my-2 text-center">
                                    <p className="text-[8px] text-gray-500">追跡番号</p>
                                    <p className="text-[13px] font-bold text-blue-600">1234-5678-9012</p>
                                  </div>
                                  <div className="border-t border-gray-100 pt-2 text-[8px] text-gray-600">
                                    <p>ヤマト運輸からの発送が開始されると日時指定が可能となります。</p>
                                    <div className="my-1.5 border-t border-gray-100" />
                                    <p>お届け後は冷蔵保管をするようにお願いいたします。</p>
                                  </div>
                                  <button className="mt-2 w-full rounded-full bg-[#ec4899] py-1.5 text-[9px] font-bold text-white">配送状況を確認</button>
                                  <p className="mt-1 text-center text-[7px] text-gray-400">マイページからも確認が可能です</p>
                                </div>
                              </div>
                          </div>
                        </div>
                        {/* スクロールヒント */}
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#c8d5e2] via-[#c8d5e2]/90 to-transparent pb-3 pt-16">
                          <div className="flex flex-col items-center gap-1">
                            <p className="text-[9px] font-bold text-gray-500">下にスクロールして発送通知を確認</p>
                            <div className="flex animate-bounce flex-col items-center">
                              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 14l-7 7m0 0l-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                              <svg className="-mt-2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M19 14l-7 7m0 0l-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                          </div>
                        </div>
                        </div>
                        {/* 入力エリア */}
                        <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-4 py-2.5">
                          <span className="text-[12px] text-gray-300">＋</span>
                          <div className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[10px] text-gray-400">メッセージを入力</div>
                          <button className="flex items-center gap-1 rounded-lg bg-red-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm">
                            ⚠ 送信
                          </button>
                        </div>
                      </div>

                      {/* 右: 患者情報パネル */}
                      <div className="hidden w-[190px] shrink-0 overflow-y-auto border-l border-gray-200 bg-white lg:block">
                        <div className="p-4 text-center">
                          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-[18px] font-bold text-orange-600">山</div>
                          <p className="mt-2 text-[12px] font-bold text-gray-800">山本 さくら</p>
                          <div className="mt-1 flex items-center justify-center gap-1">
                            <span className="text-[8px] text-green-500">●</span>
                            <span className="text-[9px] text-green-600">連携済み</span>
                          </div>
                          <button className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-[9px] text-gray-600 hover:bg-gray-50">👤 友だち詳細</button>
                          <p className="mt-1 text-[8px] text-gray-400">登録日時: 2026/09/22 14:08</p>
                        </div>

                        <div className="space-y-3 border-t border-gray-100 px-4 py-3">
                          <div>
                            <p className="text-[9px] font-bold text-gray-700">個人情報</p>
                            <div className="mt-1 grid grid-cols-2 gap-y-1 text-[8px]">
                              <span className="text-gray-400">カナ</span><span className="text-gray-700">ヤマモト サクラ</span>
                              <span className="text-gray-400">性別</span><span className="text-gray-700">女</span>
                              <span className="text-gray-400">生年月日</span><span className="text-gray-700">2003/09/12（22歳）</span>
                              <span className="text-gray-400">電話番号</span><span className="text-gray-700">09012345678</span>
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-blue-600">予約 2026-09-22 16:45:00（診察済み）</p>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-gray-700">対応マーク</p>
                            <div className="mt-1 flex items-center rounded-lg border border-gray-200 px-2 py-1">
                              <span className="h-2.5 w-2.5 rounded-full bg-blue-500"></span>
                              <span className="ml-1.5 text-[9px] text-gray-700">処方ずみ</span>
                              <span className="ml-auto text-[8px] text-gray-400">▼</span>
                            </div>
                          </div>

                          <div>
                            <div className="flex items-center justify-between">
                              <p className="text-[9px] font-bold text-gray-700">タグ</p>
                              <span className="text-[8px] text-blue-500">＋ 追加</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">処方ずみ <span className="ml-0.5 text-blue-400">×</span></span>
                              <span className="flex items-center rounded bg-green-100 px-1.5 py-0.5 text-[8px] font-bold text-green-700">個人情報提出ずみ <span className="ml-0.5 text-green-400">×</span></span>
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-gray-700">最新決済</p>
                            <div className="mt-1 rounded bg-gray-50 p-1.5 text-[8px]">
                              <p className="text-gray-700">マンジャロ5mg 1ヶ月</p>
                              <p className="font-bold text-gray-800">¥22,850</p>
                              <p className="text-gray-400">銀行振込</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-gray-700">配送状況</p>
                            <div className="mt-1 rounded bg-green-50 p-1.5 text-[8px]">
                              <p className="font-bold text-green-700">発送済み</p>
                              <p className="text-green-600">1234-5678-9012</p>
                              <p className="text-gray-400">ヤマト運輸</p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-gray-700">問診事項</p>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold text-gray-700">既往歴</p>
                            <p className="mt-0.5 text-[9px] text-gray-500">特記事項なし</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-[12px] text-slate-500">
                管理画面 — LINEトーク・患者CRM・対応ステータス・Flex配信をひとつの画面で操作
              </p>
            </div>
          </div>
        </section>

        {/* ═══ 数値実績 ═══ */}
        <section className="bg-white">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">Results</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              Lオペ導入で実現できる効果
            </h2>
            <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4">
              {metrics.map((m) => (
                <div key={m.label} className="rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/60 p-6 text-center shadow-sm ring-1 ring-blue-100/60 md:p-8">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    {metricIcons[m.icon]}
                  </div>
                  <p className="mt-4 text-[40px] font-extrabold tracking-tight text-gray-900 md:text-[52px]">
                    {m.value}<span className="text-[18px] font-bold text-gray-400 md:text-[22px]">{m.unit}</span>
                  </p>
                  <p className="mt-1 text-[14px] font-bold text-gray-700 md:text-[15px]">{m.label}</p>
                  <p className="mt-1 text-[12px] text-gray-400">{m.note}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ Lオペとは — プロダクトの本質 ═══ */}
        <section className="bg-gray-50">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">What is Lオペ?</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              Lオペ for CLINICとは
            </h2>
            <div className="mx-auto mt-10 max-w-3xl space-y-5 text-[15px] leading-[1.9] text-gray-600">
              <p>
                <strong className="text-gray-900">Lオペ for CLINIC</strong>は、クリニックのためだけに設計された<strong className="text-gray-900">AI搭載</strong>のLINE公式アカウント運用プラットフォームです。
              </p>
              <p>
                一般的なLINE配信ツール（Lステップ、Liny等）は、飲食店・EC・スクールなど幅広い業種向けに設計されています。そのため、クリニック特有の<strong className="text-gray-900">予約管理・問診・カルテ・決済・配送</strong>には対応していません。さらに、<strong className="text-gray-900">AI自動返信・自動学習・音声カルテ</strong>といった最新AI機能も搭載されていません。
              </p>
              <div className="rounded-xl bg-gradient-to-r from-violet-50/60 to-blue-50/60 p-6 shadow-sm ring-1 ring-violet-100">
                <p className="text-[14px] font-bold text-gray-900">
                  「LINEの配信ツール」ではなく、「AIで進化する、LINEで動くクリニックの業務基盤」。
                </p>
                <p className="mt-2 text-[13px] text-gray-500">
                  LINE公式アカウントひとつで、受付から診察後のフォローアップまで。最新AIが業務を自動化し、使い込むほど賢くなるプラットフォームです。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ AI テクノロジー深掘り ═══ */}
        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-violet-500 uppercase">AI Technology</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              搭載AIテクノロジー
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[14px] text-gray-500">
              Anthropic Claude・音声認識AIなど最新AIを組み合わせ、クリニック業務に最適化。汎用ツールにはない、医療現場のためのAI機能群です。
            </p>

            <div className="mt-12 space-y-8">
              {/* ── 1. Claude AI自動返信 ── */}
              <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition hover:ring-violet-200 hover:shadow-lg">
                <div className="flex flex-col md:flex-row">
                  <div className="flex flex-col justify-center p-8 md:w-1/2 bg-gradient-to-br from-violet-50/50 to-blue-50/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">{aiTechIcons.sparkles}</div>
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-violet-100 text-violet-700">LLM</span>
                    </div>
                    <h3 className="mt-4 text-[18px] font-bold text-gray-900">{aiTechStack[0].title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-gray-500">{aiTechStack[0].desc}</p>
                  </div>
                  {/* 右 — AI返信設定画面モック */}
                  <div className="p-6 md:w-1/2">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      {/* タブ */}
                      <div className="flex border-b border-gray-100 text-[9px]">
                        <span className="border-b-2 border-purple-600 px-3 py-2 font-bold text-purple-600">設定</span>
                        <span className="px-3 py-2 text-gray-400">学習例</span>
                        <span className="px-3 py-2 text-gray-400">統計</span>
                      </div>
                      <div className="space-y-3 p-4">
                        {/* AI返信トグル */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-700">AI返信機能</span>
                          <div className="relative h-5 w-9 rounded-full bg-purple-600">
                            <div className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow" />
                          </div>
                        </div>
                        {/* 動作モード */}
                        <div>
                          <p className="text-[9px] font-bold text-gray-500">動作モード</p>
                          <div className="mt-1 flex gap-3">
                            <label className="flex items-center gap-1 text-[9px] text-gray-600">
                              <span className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-purple-600"><span className="h-1.5 w-1.5 rounded-full bg-purple-600" /></span>
                              承認制
                            </label>
                            <label className="flex items-center gap-1 text-[9px] text-gray-400">
                              <span className="h-3 w-3 rounded-full border-2 border-gray-300" />
                              自動送信
                            </label>
                          </div>
                        </div>
                        {/* AIモデル選択 */}
                        <div>
                          <p className="text-[9px] font-bold text-gray-500">AIモデル</p>
                          <div className="mt-1 space-y-1">
                            <label className="flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50/50 px-2 py-1 text-[9px] text-purple-700">
                              <span className="flex h-3 w-3 items-center justify-center rounded-full border-2 border-purple-600"><span className="h-1.5 w-1.5 rounded-full bg-purple-600" /></span>
                              Claude Sonnet 4.6 <span className="ml-auto rounded bg-purple-100 px-1 text-[7px]">推奨</span>
                            </label>
                            <label className="flex items-center gap-1.5 px-2 py-1 text-[9px] text-gray-400">
                              <span className="h-3 w-3 rounded-full border-2 border-gray-300" />
                              Claude Haiku 4.5
                            </label>
                            <label className="flex items-center gap-1.5 px-2 py-1 text-[9px] text-gray-400">
                              <span className="h-3 w-3 rounded-full border-2 border-gray-300" />
                              Claude Opus 4.6
                            </label>
                          </div>
                        </div>
                        {/* ナレッジベース */}
                        <div>
                          <p className="text-[9px] font-bold text-gray-500">ナレッジベース</p>
                          <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-2 text-[8px] leading-relaxed text-gray-400">
                            ■ 営業時間: 月〜金 10:00-19:00<br />
                            ■ 休診日: 土日祝<br />
                            ■ 予約変更: LINEメニューから可能<br />
                            ■ 処方後の配送: 通常2-3営業日
                          </div>
                        </div>
                        {/* 保存ボタン */}
                        <div className="flex justify-end">
                          <span className="rounded-lg bg-purple-600 px-4 py-1.5 text-[9px] font-bold text-white">保存</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 2. 自動学習エンジン ── */}
              <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition hover:ring-violet-200 hover:shadow-lg">
                <div className="flex flex-col md:flex-row">
                  {/* 左 — 学習例モック */}
                  <div className="p-6 md:w-1/2 md:order-1">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      <div className="flex border-b border-gray-100 text-[9px]">
                        <span className="px-3 py-2 text-gray-400">設定</span>
                        <span className="border-b-2 border-purple-600 px-3 py-2 font-bold text-purple-600">学習例</span>
                        <span className="px-3 py-2 text-gray-400">統計</span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {/* 学習例1 */}
                        <div className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[7px] font-bold text-blue-700">修正送信</span>
                            <span className="text-[7px] text-gray-400">2026/03/25 14:32</span>
                            <span className="ml-auto text-[7px] text-gray-400">品質: <span className="font-bold text-green-600">92</span></span>
                          </div>
                          <div className="mt-2 rounded-lg bg-gray-50 p-2">
                            <p className="text-[8px] text-gray-500">患者:</p>
                            <p className="text-[9px] text-gray-700">処方薬はいつ届きますか？</p>
                          </div>
                          <div className="mt-1.5 rounded-lg bg-purple-50 p-2">
                            <p className="text-[8px] text-purple-500">スタッフ修正:</p>
                            <p className="text-[9px] text-gray-700">通常2〜3営業日でお届けいたします。発送後に追跡番号をLINEでお知らせいたします。</p>
                          </div>
                        </div>
                        {/* 学習例2 */}
                        <div className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[7px] font-bold text-green-700">手動返信</span>
                            <span className="text-[7px] text-gray-400">2026/03/25 10:15</span>
                            <span className="ml-auto text-[7px] text-gray-400">使用: <span className="font-bold text-blue-600">3回</span></span>
                          </div>
                          <div className="mt-2 rounded-lg bg-gray-50 p-2">
                            <p className="text-[8px] text-gray-500">患者:</p>
                            <p className="text-[9px] text-gray-700">予約の変更はできますか？</p>
                          </div>
                          <div className="mt-1.5 rounded-lg bg-purple-50 p-2">
                            <p className="text-[8px] text-purple-500">スタッフ回答:</p>
                            <p className="text-[9px] text-gray-700">LINEメニューの「予約変更」からお手続きいただけます。ご不明点はお気軽にご連絡ください。</p>
                          </div>
                        </div>
                        {/* 学習例3 (一部表示) */}
                        <div className="p-3 opacity-50">
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[7px] font-bold text-blue-700">修正送信</span>
                            <span className="text-[7px] text-gray-400">2026/03/24 16:08</span>
                          </div>
                          <div className="mt-2 rounded-lg bg-gray-50 p-2">
                            <p className="text-[9px] text-gray-700">決済方法を教えてください</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 右 — 説明 */}
                  <div className="flex flex-col justify-center p-8 md:w-1/2 md:order-2 bg-gradient-to-br from-blue-50/50 to-cyan-50/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">{aiTechIcons.brain}</div>
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-700">AI</span>
                    </div>
                    <h3 className="mt-4 text-[18px] font-bold text-gray-900">{aiTechStack[1].title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-gray-500">{aiTechStack[1].desc}</p>
                    <ul className="mt-4 space-y-2">
                      {aiTechStack[1].details.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-[13px] text-gray-600">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* ── 2.5 AI Flex Messageビルダー ── */}
              <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition hover:ring-violet-200 hover:shadow-lg">
                <div className="flex flex-col md:flex-row">
                  {/* 左 — Flexビルダーモック */}
                  <div className="p-6 md:w-1/2 md:order-1">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      {/* ツールバー */}
                      <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
                        <div className="flex gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /><span className="h-2 w-2 rounded-full bg-yellow-400" /><span className="h-2 w-2 rounded-full bg-green-400" /></div>
                        <span className="ml-3 text-[9px] text-gray-400">Flex Messageビルダー — AI作成モード</span>
                      </div>
                      <div className="flex divide-x divide-gray-100" style={{ minHeight: 280 }}>
                        {/* エディタ側 */}
                        <div className="flex w-[55%] shrink-0 flex-col p-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="rounded bg-violet-100 px-2 py-0.5 text-[8px] font-bold text-violet-700">AI作成</span>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-[8px] text-gray-400">プリセット</span>
                            <span className="rounded bg-gray-100 px-2 py-0.5 text-[8px] text-gray-400">手動編集</span>
                          </div>
                          {/* ブロック構造 */}
                          <div className="mb-2 rounded-lg bg-gray-50 p-2">
                            <div className="text-[8px] font-bold text-gray-400 mb-1">ブロック構造</div>
                            <div className="space-y-1 text-[9px]">
                              <div className="flex items-center gap-1.5 rounded bg-white px-2 py-1 border border-blue-200 shadow-sm">
                                <span className="text-[10px]">🖼</span><span className="font-semibold text-gray-700">ヒーロー画像</span><span className="ml-auto text-[7px] text-blue-500">AI生成</span>
                              </div>
                              <div className="flex items-center gap-1.5 rounded bg-white px-2 py-1 border border-gray-200">
                                <span className="text-[10px]">T</span><span className="font-semibold text-gray-700">タイトル</span><span className="ml-auto text-[7px] text-gray-400">春の特別キャンペーン</span>
                              </div>
                              <div className="flex items-center gap-1.5 rounded bg-white px-2 py-1 border border-gray-200">
                                <span className="text-[10px]">📝</span><span className="font-semibold text-gray-700">本文テキスト</span>
                              </div>
                              <div className="flex items-center gap-1.5 rounded bg-white px-2 py-1 border border-gray-200">
                                <span className="text-[10px]">🎫</span><span className="font-semibold text-gray-700">クーポンバッジ</span><span className="ml-auto text-[7px] text-amber-600">20% OFF</span>
                              </div>
                              <div className="flex items-center gap-1.5 rounded bg-white px-2 py-1 border border-gray-200">
                                <span className="text-[10px]">🔘</span><span className="font-semibold text-gray-700">予約ボタン</span>
                              </div>
                            </div>
                          </div>
                          {/* AI指示エリア */}
                          <div className="mt-auto rounded-lg border-2 border-violet-200 bg-violet-50/50 p-2">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[8px] text-white">AI</span>
                              <span className="text-[9px] font-bold text-violet-700">AIに指示して作成</span>
                            </div>
                            <div className="mb-1.5 flex items-center gap-2 rounded bg-white px-2 py-1 border border-gray-200">
                              <div className="h-7 w-7 rounded bg-gradient-to-br from-pink-200 to-pink-100 flex items-center justify-center text-[9px]">🌸</div>
                              <div><div className="text-[7px] font-semibold text-gray-600">sakura-campaign.jpg</div><div className="text-[6px] text-gray-400">画像添付済み</div></div>
                            </div>
                            <div className="rounded bg-white border border-violet-200 px-2 py-1.5 text-[9px] text-gray-600 leading-relaxed">春のキャンペーン告知を作って。添付の桜画像をヒーローに使って、20%OFFクーポンと予約ボタンを入れて</div>
                            <div className="mt-1.5 flex items-center justify-end">
                              <div className="flex items-center gap-1 rounded bg-violet-500 px-2.5 py-1 text-[8px] font-bold text-white">⚡ 生成中...</div>
                            </div>
                          </div>
                        </div>
                        {/* LINEプレビュー */}
                        <div className="flex flex-1 flex-col items-center px-3 py-3">
                          <div className="text-[8px] font-semibold text-gray-400 mb-2 self-start">LINEプレビュー</div>
                          <div className="w-full max-w-[180px] rounded-xl border border-gray-200 bg-[#7494C0]/15 p-2 shadow-inner">
                            <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                              <div className="relative h-20 bg-gradient-to-br from-pink-300 via-pink-200 to-rose-100 flex items-center justify-center">
                                <span className="text-2xl opacity-70">🌸</span>
                                <div className="absolute bottom-1 right-1 rounded bg-black/40 px-1 py-0.5 text-[6px] text-white">AI配置</div>
                              </div>
                              <div className="px-2.5 pt-2"><div className="text-[10px] font-extrabold text-gray-800">春の特別キャンペーン</div></div>
                              <div className="px-2.5 pt-1"><div className="text-[7px] text-gray-500 leading-relaxed">日頃のご愛顧に感謝を込めて、春の特別キャンペーンを開催いたします。</div></div>
                              <div className="mx-2.5 mt-1.5 rounded bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-2 py-1 text-center">
                                <div className="text-[6px] text-amber-600">期間限定クーポン</div>
                                <div className="text-[12px] font-extrabold text-amber-600">20% OFF</div>
                                <div className="text-[6px] text-amber-400">2026/4/30まで</div>
                              </div>
                              <div className="p-2.5 pt-1.5"><div className="rounded-full bg-[#06C755] py-1.5 text-center text-[8px] font-bold text-white">今すぐ予約する</div></div>
                            </div>
                          </div>
                          <div className="mt-1.5 flex items-center gap-1 self-start">
                            <div className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-[7px] text-violet-600 font-semibold">AIがFLEXメッセージを構築中...</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 右 — 説明 */}
                  <div className="flex flex-col justify-center p-8 md:w-1/2 md:order-2 bg-gradient-to-br from-violet-50/50 to-blue-50/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">{aiTechIcons.flex}</div>
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-violet-100 text-violet-700">{aiTechStack[2].badge}</span>
                    </div>
                    <h3 className="mt-4 text-[18px] font-bold text-gray-900">{aiTechStack[2].title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-gray-500">{aiTechStack[2].desc}</p>
                    <ul className="mt-4 space-y-2">
                      {aiTechStack[2].details.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-[13px] text-gray-600">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* ── 3. 追跡番号配信 ── */}
              <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition hover:ring-violet-200 hover:shadow-lg">
                <div className="flex flex-col md:flex-row">
                  <div className="flex flex-col justify-center p-8 md:w-1/2 bg-gradient-to-br from-violet-50/50 to-blue-50/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-600">{aiTechIcons.label}</div>
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-violet-100 text-violet-700">{aiTechStack[3].badge}</span>
                    </div>
                    <h3 className="mt-4 text-[18px] font-bold text-gray-900">{aiTechStack[3].title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-gray-500">{aiTechStack[3].desc}</p>
                  </div>
                  {/* 右 — 発送リスト画面モック（実装に即した形） */}
                  <div className="p-6 md:w-1/2">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      {/* ヘッダー */}
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="text-[11px] font-bold text-gray-800">発送リスト</p>
                        <p className="mt-0.5 text-[8px] text-gray-400">発送する注文を選択・編集して、送り状ラベルを出力します</p>
                      </div>
                      {/* 操作バー */}
                      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 px-4 py-2">
                        <span className="text-[8px] text-gray-500">合計 12件 / 選択 5件</span>
                        <span className="rounded border border-gray-200 px-2 py-0.5 text-[8px] text-gray-500">同じ氏名を統合</span>
                        <span className="rounded border border-gray-200 px-2 py-0.5 text-[8px] text-gray-500">並び替え</span>
                        <div className="ml-auto flex items-center gap-1.5">
                          <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[8px] font-bold text-white">🔗 共有リンク（5件）</span>
                          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[8px] font-bold text-white">📦 ヤマトラベル発行（5件）</span>
                        </div>
                      </div>
                      {/* テーブル */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-[8px]">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500">
                              <th className="px-2 py-1.5 text-left"><input type="checkbox" className="h-2.5 w-2.5" checked readOnly /></th>
                              <th className="px-2 py-1.5 text-left font-medium">決済日時</th>
                              <th className="px-2 py-1.5 text-left font-medium">氏名</th>
                              <th className="px-2 py-1.5 text-left font-medium">住所</th>
                              <th className="hidden px-2 py-1.5 text-left font-medium md:table-cell">商品名</th>
                              <th className="px-2 py-1.5 text-right font-medium">金額</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {[
                              { date: "2026/03/26", name: "山田 花子", addr: "東京都○○区△△1-2-3", product: "内服薬A 12シート", price: "¥25,500", checked: true },
                              { date: "2026/03/26", name: "佐藤 太郎", addr: "大阪府○○市□□2-4-6", product: "内服薬A 12シート", price: "¥25,500", checked: true },
                              { date: "2026/03/26", name: "高橋 美紀", addr: "愛知県○○市△△3-5-7", product: "内服薬B 4本", price: "¥13,000", checked: true },
                              { date: "2026/03/26", name: "伊藤 翔太", addr: "福岡県○○市□□8-1-2", product: "内服薬B 4本", price: "¥13,000", checked: true },
                              { date: "2026/03/26", name: "渡辺 さやか", addr: "神奈川県○○市△△5-9", product: "内服薬A 6シート", price: "¥13,000", checked: true },
                            ].map((r) => (
                              <tr key={r.name} className="bg-yellow-50/60">
                                <td className="px-2 py-2"><input type="checkbox" className="h-2.5 w-2.5" checked={r.checked} readOnly /></td>
                                <td className="px-2 py-2 text-gray-600">{r.date}</td>
                                <td className="px-2 py-2 font-bold text-gray-800">{r.name}</td>
                                <td className="px-2 py-2 text-gray-600">{r.addr}</td>
                                <td className="hidden px-2 py-2 text-gray-600 md:table-cell">{r.product}</td>
                                <td className="px-2 py-2 text-right font-bold text-gray-800">{r.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* 日本郵便ボタンも追加 */}
                      <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-2">
                        <span className="rounded-full bg-red-500 px-2.5 py-1 text-[8px] font-bold text-white">〒 日本郵便ラベル発行</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4. フロービルダー & 自動アクション ── */}
              <div className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/60 transition hover:ring-violet-200 hover:shadow-lg">
                <div className="flex flex-col md:flex-row">
                  {/* 左 — フロービルダーモック */}
                  <div className="p-6 md:w-1/2 md:order-1">
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                      {/* ツールバー */}
                      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-[8px] font-bold text-gray-600">初診フォロー</span>
                          <span className="text-[7px] text-gray-400">▼</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-emerald-50 px-2 py-0.5 text-[7px] font-bold text-emerald-600">テスト</span>
                          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[7px] font-bold text-indigo-600">検証</span>
                          <span className="rounded bg-[#06C755] px-2.5 py-0.5 text-[7px] font-bold text-white">保存</span>
                        </div>
                      </div>
                      {/* フローエディタ */}
                      <div className="relative bg-gray-50/80 p-6" style={{ height: "260px", backgroundImage: "radial-gradient(circle, #ddd 1px, transparent 1px)", backgroundSize: "16px 16px" }}>
                        {/* ノード: 友だち追加 */}
                        <div className="absolute left-1/2 top-3 -translate-x-1/2">
                          <div className="w-[120px] rounded-lg border border-green-200 bg-white shadow-sm">
                            <div className="rounded-t-lg bg-green-500 px-2 py-1 text-center text-[8px] font-bold text-white">🎯 トリガー</div>
                            <div className="px-2 py-1.5 text-center text-[8px] text-gray-600">友だち追加</div>
                          </div>
                        </div>
                        {/* 線 */}
                        <div className="absolute left-1/2 top-[58px] h-5 w-px -translate-x-1/2 bg-gray-300" />
                        {/* ノード: 待機 */}
                        <div className="absolute left-1/2 top-[74px] -translate-x-1/2">
                          <div className="w-[120px] rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="rounded-t-lg bg-gray-500 px-2 py-1 text-center text-[8px] font-bold text-white">⏱️ 待機</div>
                            <div className="px-2 py-1.5 text-center text-[8px] text-gray-600">7日後</div>
                          </div>
                        </div>
                        {/* 線 */}
                        <div className="absolute left-1/2 top-[128px] h-5 w-px -translate-x-1/2 bg-gray-300" />
                        {/* ノード: 条件分岐 */}
                        <div className="absolute left-1/2 top-[145px] -translate-x-1/2">
                          <div className="w-[120px] rounded-lg border border-yellow-200 bg-white shadow-sm">
                            <div className="rounded-t-lg bg-yellow-500 px-2 py-1 text-center text-[8px] font-bold text-white">〰️ 条件分岐</div>
                            <div className="px-2 py-1.5 text-center text-[8px] text-gray-600">予約あり？</div>
                          </div>
                        </div>
                        {/* 分岐線 — True */}
                        <div className="absolute left-[calc(50%-50px)] top-[200px] h-4 w-px bg-green-400" />
                        <div className="absolute left-[calc(50%-70px)] top-[199px] h-px w-[20px] bg-green-400" />
                        {/* 分岐線 — False */}
                        <div className="absolute left-[calc(50%+50px)] top-[200px] h-4 w-px bg-red-400" />
                        <div className="absolute left-[calc(50%+50px)] top-[199px] h-px w-[20px] bg-red-400" />
                        {/* True ノード */}
                        <div className="absolute left-[calc(50%-110px)] top-[214px]">
                          <div className="w-[100px] rounded-lg border border-blue-200 bg-white shadow-sm">
                            <div className="rounded-t-lg bg-blue-500 px-2 py-0.5 text-center text-[7px] font-bold text-white">📧 送信</div>
                            <div className="px-1.5 py-1 text-center text-[7px] text-gray-600">来院お礼</div>
                          </div>
                          <div className="mt-0.5 text-center text-[7px] font-bold text-green-500">True</div>
                        </div>
                        {/* False ノード */}
                        <div className="absolute left-[calc(50%+10px)] top-[214px]">
                          <div className="w-[100px] rounded-lg border border-blue-200 bg-white shadow-sm">
                            <div className="rounded-t-lg bg-blue-500 px-2 py-0.5 text-center text-[7px] font-bold text-white">📧 送信</div>
                            <div className="px-1.5 py-1 text-center text-[7px] text-gray-600">予約リマインド</div>
                          </div>
                          <div className="mt-0.5 text-center text-[7px] font-bold text-red-500">False</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* 右 — 説明 */}
                  <div className="flex flex-col justify-center p-8 md:w-1/2 md:order-2 bg-gradient-to-br from-blue-50/50 to-cyan-50/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">{aiTechIcons.flow}</div>
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-700">自動化</span>
                    </div>
                    <h3 className="mt-4 text-[18px] font-bold text-gray-900">{aiTechStack[4].title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-gray-500">{aiTechStack[4].desc}</p>
                    <ul className="mt-4 space-y-2">
                      {aiTechStack[4].details.map((d) => (
                        <li key={d} className="flex items-start gap-2 text-[13px] text-gray-600">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 開発思想 ═══ */}
        <section className="bg-gradient-to-br from-gray-50 via-violet-50/30 to-gray-50">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-violet-500 uppercase">Philosophy</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              Lオペの設計思想
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[14px] text-gray-500">
              汎用ツールの「カスタマイズ前提」とは異なる、クリニック専用プラットフォームとしての設計哲学。
            </p>

            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {philosophies.map((p) => (
                <div key={p.num} className="rounded-2xl bg-white p-7 shadow-sm ring-1 ring-gray-200/60 transition hover:ring-violet-200 hover:shadow-md">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 text-[13px] font-bold text-violet-600">
                    {p.num}
                  </span>
                  <h3 className="mt-3 text-[15px] font-bold text-gray-900">{p.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 機能一覧（簡潔版） ═══ */}
        <section className="bg-white">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">Features</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              主な機能
            </h2>

            <div className="mt-12 space-y-14">
              {/* ── LINE運用 + セグメント配信モック ── */}
              <div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${featureGroups[0].tagColor}`}>{featureGroups[0].tag}</span>
                  <h3 className="text-[16px] font-bold text-gray-900">{featureGroups[0].title}</h3>
                </div>
                {/* セグメント配信画面モック */}
                <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                    <p className="text-[10px] font-bold text-gray-700">一斉配信 — セグメント条件設定</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-blue-50 px-2 py-0.5 text-[8px] font-bold text-blue-600">対象: 128人</span>
                      <span className="rounded bg-[#06C755] px-2.5 py-0.5 text-[8px] font-bold text-white">テスト送信</span>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row">
                    {/* 左: 配信条件 */}
                    <div className="border-b border-gray-100 p-4 md:w-1/2 md:border-b-0 md:border-r">
                      <p className="text-[9px] font-bold text-gray-500">含む条件</p>
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-1.5">
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[8px] font-bold text-blue-700">タグ</span>
                          <span className="text-[9px] text-gray-700">処方ずみ</span>
                          <span className="ml-auto text-[8px] text-gray-400">×</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-1.5">
                          <span className="rounded bg-green-100 px-1.5 py-0.5 text-[8px] font-bold text-green-700">最終決済日</span>
                          <span className="text-[9px] text-gray-700">30日以上前</span>
                          <span className="ml-auto text-[8px] text-gray-400">×</span>
                        </div>
                        <button className="flex items-center gap-1 text-[8px] font-bold text-blue-600">＋ 条件を追加</button>
                      </div>
                      <p className="mt-3 text-[9px] font-bold text-gray-500">除外条件</p>
                      <div className="mt-2">
                        <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50/50 px-3 py-1.5">
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[8px] font-bold text-red-700">マーク</span>
                          <span className="text-[9px] text-gray-700">不通</span>
                          <span className="ml-auto text-[8px] text-gray-400">×</span>
                        </div>
                      </div>
                    </div>
                    {/* 右: メッセージプレビュー */}
                    <div className="p-4 md:w-1/2">
                      <p className="text-[9px] font-bold text-gray-500">メッセージ</p>
                      <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-[9px] leading-relaxed text-gray-600">
                        <p>{"{patient_name}"}様</p>
                        <p className="mt-1">前回の処方から1ヶ月が経過しました。お体の調子はいかがですか？</p>
                        <p className="mt-1">再処方をご希望の場合は、下記メニューからお手続きいただけます。</p>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded border border-gray-200 px-2 py-0.5 text-[8px] text-gray-400">{"{patient_name}"}</span>
                        <span className="rounded border border-gray-200 px-2 py-0.5 text-[8px] text-gray-400">{"{phone}"}</span>
                        <span className="ml-auto text-[8px] text-gray-400">48 / 500文字</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button className="flex items-center gap-1 rounded bg-purple-50 px-2 py-1 text-[8px] font-bold text-purple-600">
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          AI文面生成
                        </button>
                        <span className="rounded border border-gray-200 px-2 py-1 text-[8px] text-gray-400">テンプレート</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {featureGroups[0].features.map((f) => (
                    <div key={f.name} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60 transition hover:ring-blue-200 hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-[16px]">{f.icon}</span>
                        <p className="text-[14px] font-bold text-gray-900">{f.name}</p>
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 業務管理 + 予約カレンダーモック ── */}
              <div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${featureGroups[1].tagColor}`}>{featureGroups[1].tag}</span>
                  <h3 className="text-[16px] font-bold text-gray-900">{featureGroups[1].title}</h3>
                </div>
                {/* 予約カレンダーモック */}
                <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-bold text-gray-700">予約リスト</p>
                      <div className="flex rounded-lg border border-gray-200 text-[8px]">
                        <span className="rounded-l-lg bg-white px-2 py-0.5 font-medium text-gray-900 shadow-sm">スケジュール</span>
                        <span className="rounded-r-lg px-2 py-0.5 text-gray-400">カレンダー</span>
                      </div>
                    </div>
                    <span className="text-[9px] text-gray-500">2026年3月27日（金）</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[9px]">
                      <thead>
                        <tr className="bg-gray-50 text-gray-500">
                          <th className="px-3 py-2 text-left font-medium">時間</th>
                          <th className="px-3 py-2 text-left font-medium">患者名</th>
                          <th className="px-3 py-2 text-left font-medium">予約メニュー</th>
                          <th className="px-3 py-2 text-center font-medium">ステータス</th>
                          <th className="px-3 py-2 text-center font-medium">対応</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        <tr className="bg-emerald-50/30">
                          <td className="px-3 py-2 text-gray-700">10:00</td>
                          <td className="px-3 py-2 font-bold text-gray-800">中村 あおい</td>
                          <td className="px-3 py-2 text-gray-600">初診 — GLP-1相談</td>
                          <td className="px-3 py-2 text-center"><span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">診察済</span></td>
                          <td className="px-3 py-2 text-center"><span className="text-blue-500">📋</span></td>
                        </tr>
                        <tr className="bg-emerald-50/30">
                          <td className="px-3 py-2 text-gray-700">11:30</td>
                          <td className="px-3 py-2 font-bold text-gray-800">小林 はな</td>
                          <td className="px-3 py-2 text-gray-600">再診 — マンジャロ5mg</td>
                          <td className="px-3 py-2 text-center"><span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">診察済</span></td>
                          <td className="px-3 py-2 text-center"><span className="text-blue-500">📋</span></td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-700">14:00</td>
                          <td className="px-3 py-2 font-bold text-gray-800">加藤 りこ</td>
                          <td className="px-3 py-2 text-gray-600">初診 — ダイエット外来</td>
                          <td className="px-3 py-2 text-center"><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">待機中</span></td>
                          <td className="px-3 py-2 text-center"><span className="text-gray-400">—</span></td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-700">15:30</td>
                          <td className="px-3 py-2 font-bold text-gray-800">吉田 める</td>
                          <td className="px-3 py-2 text-gray-600">再診 — 経過フォロー</td>
                          <td className="px-3 py-2 text-center"><span className="rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">待機中</span></td>
                          <td className="px-3 py-2 text-center"><span className="text-gray-400">—</span></td>
                        </tr>
                        <tr className="bg-rose-50/30">
                          <td className="px-3 py-2 text-gray-700">16:45</td>
                          <td className="px-3 py-2 font-bold text-gray-800">松本 ゆい</td>
                          <td className="px-3 py-2 text-gray-600">再診 — マンジャロ7.5mg</td>
                          <td className="px-3 py-2 text-center"><span className="rounded bg-gray-100 px-1.5 py-0.5 text-[8px] font-bold text-gray-500">不通</span></td>
                          <td className="px-3 py-2 text-center"><span className="text-red-400">📞</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {featureGroups[1].features.map((f) => (
                    <div key={f.name} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60 transition hover:ring-blue-200 hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-[16px]">{f.icon}</span>
                        <p className="text-[14px] font-bold text-gray-900">{f.name}</p>
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── 分析 + ダッシュボードモック ── */}
              <div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${featureGroups[2].tagColor}`}>{featureGroups[2].tag}</span>
                  <h3 className="text-[16px] font-bold text-gray-900">{featureGroups[2].title}</h3>
                </div>
                {/* ダッシュボードモック */}
                <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                    <p className="text-[10px] font-bold text-gray-700">ダッシュボード</p>
                    <div className="flex items-center gap-2 text-[8px] text-gray-500">
                      <span>2026/03/01</span>
                      <span>〜</span>
                      <span>2026/03/27</span>
                    </div>
                  </div>
                  {/* KPIカード群 */}
                  <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-4">
                    <div className="rounded-lg bg-blue-50/60 p-3 ring-1 ring-blue-100/60">
                      <p className="text-[8px] text-blue-500">📅 予約件数</p>
                      <p className="mt-1 text-[20px] font-extrabold text-gray-900">142</p>
                      <p className="text-[8px] text-gray-400">診察済 128 / 未診察 14</p>
                    </div>
                    <div className="rounded-lg bg-green-50/60 p-3 ring-1 ring-green-100/60">
                      <p className="text-[8px] text-green-500">📦 配送件数</p>
                      <p className="mt-1 text-[20px] font-extrabold text-gray-900">98</p>
                      <p className="text-[8px] text-gray-400">新規 67 / 再処方 31</p>
                    </div>
                    <div className="rounded-lg bg-purple-50/60 p-3 ring-1 ring-purple-100/60">
                      <p className="text-[8px] text-purple-500">💰 純売上</p>
                      <p className="mt-1 text-[20px] font-extrabold text-gray-900">¥3.2<span className="text-[12px]">M</span></p>
                      <p className="text-[8px] text-gray-400">カード ¥2.4M / 振込 ¥0.8M</p>
                    </div>
                    <div className="rounded-lg bg-orange-50/60 p-3 ring-1 ring-orange-100/60">
                      <p className="text-[8px] text-orange-500">🔄 リピート率</p>
                      <p className="mt-1 text-[20px] font-extrabold text-gray-900">68<span className="text-[12px]">%</span></p>
                      <p className="text-[8px] text-gray-400">総患者 210 / 新規 67</p>
                    </div>
                  </div>
                  {/* コンバージョンファネル */}
                  <div className="border-t border-gray-100 p-4">
                    <p className="text-[9px] font-bold text-gray-500">コンバージョン</p>
                    <div className="mt-2 grid grid-cols-3 gap-3">
                      <div>
                        <div className="flex items-center justify-between text-[8px]">
                          <span className="text-gray-500">診療後決済率</span>
                          <span className="font-bold text-blue-600">87%</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-blue-500" style={{ width: "87%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[8px]">
                          <span className="text-gray-500">問診後予約率</span>
                          <span className="font-bold text-green-600">72%</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-green-500" style={{ width: "72%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-[8px]">
                          <span className="text-gray-500">予約後受診率</span>
                          <span className="font-bold text-purple-600">91%</span>
                        </div>
                        <div className="mt-1 h-2 w-full rounded-full bg-gray-100">
                          <div className="h-2 rounded-full bg-purple-500" style={{ width: "91%" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {featureGroups[2].features.map((f) => (
                    <div key={f.name} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200/60 transition hover:ring-blue-200 hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-50 text-[16px]">{f.icon}</span>
                        <p className="text-[14px] font-bold text-gray-900">{f.name}</p>
                      </div>
                      <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 text-center">
              <Link href="/clinic/features" className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-2.5 text-[13px] font-semibold text-blue-600 shadow-sm ring-1 ring-gray-200 transition hover:bg-blue-50 hover:ring-blue-200">
                全機能一覧を見る
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA中間 */}
        <section className="bg-gradient-to-br from-violet-50 via-blue-50 to-indigo-50">
          <div className="mx-auto max-w-3xl px-6 py-14 text-center">
            <p className="text-[16px] font-bold text-gray-900">AI搭載クリニック運用の全体像をご確認ください</p>
            <p className="mt-2 text-[13px] text-gray-500">AI機能・全機能一覧・料金・導入事例をまとめた資料を無料でお送りします。</p>
            <a href="/#contact" className="mt-5 inline-block rounded-full bg-blue-600 px-8 py-3 text-[13px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg">
              無料で資料請求
            </a>
          </div>
        </section>

        {/* ═══ 比較表 ═══ */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-blue-500 uppercase">Comparison</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              汎用LINE配信ツールとの違い
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[13px] text-gray-500">
              Lステップ・Liny等の汎用ツールは「配信」に特化。Lオペ for CLINICは「AI + クリニック業務全体」をカバーします。
            </p>

            <div className="mt-8 overflow-hidden rounded-2xl shadow-sm ring-1 ring-gray-200/60">
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
              <Link href="/clinic/column/lstep-vs-clinic-tool" className="text-[13px] font-medium text-blue-600 hover:underline">
                Lステップ・Linyとの詳細比較記事を読む →
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ 最終CTA ═══ */}
        <section className="bg-gradient-to-br from-violet-100/60 via-blue-50 to-indigo-50">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-20">
            <p className="text-[12px] font-bold tracking-widest text-violet-400 uppercase">Get Started</p>
            <h2 className="mt-3 text-[24px] font-bold tracking-tight text-gray-900 md:text-[32px]">
              AI搭載のクリニックLINE運用を<br className="sm:hidden" />始めませんか？
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] text-gray-500">
              まずは無料の資料請求から。AI機能の詳細や貴院に合わせた活用方法をご提案します。
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a href="/#contact" className="w-full rounded-full bg-blue-600 px-8 py-3.5 text-[14px] font-bold text-white transition hover:bg-blue-700 hover:shadow-lg sm:w-auto">
                無料で資料請求
              </a>
              <Link href="/#pricing" className="w-full rounded-full bg-white px-8 py-3.5 text-[14px] font-bold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-50 sm:w-auto">
                料金プランを見る
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="bg-slate-900 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 md:flex-row md:justify-between">
          <p className="text-[13px] font-bold text-white">Lオペ <span className="text-blue-400">for CLINIC</span></p>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-[12px] text-slate-400 hover:text-white transition">製品トップ</Link>
            <Link href="/clinic/features" className="text-[12px] text-slate-400 hover:text-white transition">機能一覧</Link>
            <Link href="/clinic/column" className="text-[12px] text-slate-400 hover:text-white transition">コラム</Link>
            <a href="https://ordix.co.jp" target="_blank" rel="noopener noreferrer" className="text-[12px] text-slate-400 hover:text-white transition">運営会社</a>
          </div>
          <p className="text-[11px] text-slate-500">&copy; 2026 株式会社ORDIX</p>
        </div>
      </footer>
    </div>
  );
}
