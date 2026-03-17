import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://l-ope.jp";

export const metadata: Metadata = {
  title: "Lオペ for CLINICとは？ — クリニック特化LINE公式アカウント運用プラットフォーム",
  description:
    "Lオペ for CLINICはクリニックに特化したLINE公式アカウント運用プラットフォーム。予約管理・オンライン問診・セグメント配信・決済・配送まで、クリニック業務をLINEで一元化。Lステップ等の汎用ツールとの違いも解説。",
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
const jsonLd = {
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
};

/* ─── 導入メリット数値 ─── */
const metrics = [
  { value: "80", unit: "%", label: "LINE開封率", note: "メールの約3倍" },
  { value: "50", unit: "%", label: "無断キャンセル削減", note: "自動リマインドで" },
  { value: "3", unit: "倍", label: "再診率向上", note: "セグメント配信で" },
  { value: "60", unit: "%", label: "受付業務削減", note: "問診自動化で" },
];

/* ─── お悩み ─── */
const painPoints = [
  { title: "予約の電話対応に追われている", desc: "診察中も電話が鳴り止まず、スタッフの手が足りない。患者を待たせてしまい機会損失も。" },
  { title: "無断キャンセルが減らない", desc: "リマインドを手動で送る余裕がなく、当日キャンセルや無断キャンセルで売上が安定しない。" },
  { title: "再診の促進ができていない", desc: "来院後のフォローがDMかメールだけ。開封率が低く、患者が離れていく。" },
  { title: "問診票の転記に時間がかかる", desc: "紙の問診票を毎回カルテに転記。記入漏れも多く、診察前の準備に手間がかかる。" },
  { title: "LINEを開設したが活用できていない", desc: "友だちは増えても配信や管理の方法がわからず、ただのお知らせツールに。" },
  { title: "複数ツールの管理が煩雑", desc: "予約システム、配信ツール、決済ツールが別々。それぞれにログインして管理するのが非効率。" },
];

/* ─── 機能カテゴリ ─── */
const featureGroups = [
  {
    tag: "LINE運用",
    title: "患者とのコミュニケーションをLINEに集約",
    features: [
      { name: "LINEトーク・患者CRM", desc: "全患者の情報・対応履歴をLINE上で一元管理。タグ・メモ・対応状況で整理。" },
      { name: "セグメント配信", desc: "来院履歴・タグ・年齢などで絞り込み、最適なメッセージを対象者だけに配信。" },
      { name: "リッチメニュービルダー", desc: "予約・問診・マイページへの導線を最適化。患者の状態に応じて自動切替。" },
      { name: "AI自動返信", desc: "24時間対応のAIが患者のLINEメッセージに自動返信。スタッフの修正から学習し精度向上。" },
      { name: "自動アクション", desc: "友だち追加→メッセージ送信→タグ付与→メニュー切替を自動化。" },
    ],
  },
  {
    tag: "業務管理",
    title: "予約から配送まで、一気通貫で管理",
    features: [
      { name: "予約管理", desc: "LINEで予約受付・変更・キャンセルを完結。前日自動リマインドで無断キャンセル防止。" },
      { name: "オンライン問診", desc: "来院前にLINEで問診完了。待ち時間短縮と転記ミスの削減を同時に実現。" },
      { name: "カルテ管理", desc: "SOAP形式で記録。音声カルテオプションで診察中の会話から自動生成。" },
      { name: "決済管理", desc: "LINE上でオンライン決済を完結。Square・GMO連携。決済完了をLINEで自動通知。" },
      { name: "配送管理", desc: "処方薬の発送をワンクリック管理。CSV出力・追跡番号登録・患者通知まで一気通貫。" },
    ],
  },
  {
    tag: "分析",
    title: "データに基づいた経営判断をサポート",
    features: [
      { name: "ダッシュボード", desc: "予約数・売上・友だち数・リピート率をリアルタイム表示。" },
      { name: "売上・LTV分析", desc: "患者ごとのLTVを自動算出。月次レポートをCSV出力。" },
      { name: "配信分析", desc: "開封率・クリック率・予約転換率を可視化し、配信戦略を最適化。" },
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
  { num: "01", title: "お問い合わせ・ヒアリング", desc: "貴院の課題・運用状況をヒアリング。最適なプランをご提案します。" },
  { num: "02", title: "初期設定・構築", desc: "LINE公式アカウントの設定、リッチメニュー構築、問診フォーム作成を代行。" },
  { num: "03", title: "スタッフ研修・テスト運用", desc: "管理画面の操作研修を実施。テスト環境で動作確認を行います。" },
  { num: "04", title: "本番運用開始", desc: "患者へのLINE告知を開始。運用開始後もサポートチームが伴走します。" },
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
      <header className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/lp" className="flex items-center gap-2">
            <span className="text-[14px] font-bold tracking-tight text-gray-900">Lオペ <span className="text-sky-600">for CLINIC</span></span>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            <Link href="/lp" className="text-[12px] text-gray-400 hover:text-gray-700 transition">製品トップ</Link>
            <Link href="/lp/features" className="text-[12px] text-gray-400 hover:text-gray-700 transition">機能一覧</Link>
            <Link href="/lp/column" className="text-[12px] text-gray-400 hover:text-gray-700 transition">コラム</Link>
            <a href="/lp#contact" className="rounded-lg bg-gray-900 px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-gray-700">
              資料請求
            </a>
          </div>
        </div>
      </header>

      <main className="pt-14">
        {/* パンくず */}
        <nav aria-label="パンくずリスト" className="border-b border-gray-50 bg-gray-50/50">
          <div className="mx-auto max-w-6xl px-6 py-3">
            <ol className="flex items-center gap-2 text-[12px] text-gray-400 list-none m-0 p-0">
              <li><Link href="/lp" className="hover:text-gray-700 transition">トップ</Link></li>
              <li aria-hidden="true" className="text-gray-300">&gt;</li>
              <li className="font-medium text-gray-700">Lオペ for CLINICとは？</li>
            </ol>
          </div>
        </nav>

        {/* ═══ ヒーロー ═══ */}
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
            <p className="text-[12px] font-bold tracking-widest text-sky-600 uppercase">クリニック特化 LINE運用プラットフォーム</p>
            <h1 className="mt-4 text-[32px] font-bold leading-snug tracking-tight text-gray-900 md:text-[44px]">
              LINEで、クリニック業務を<br className="hidden md:inline" />ひとつにまとめる。
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-gray-500">
              予約管理・オンライン問診・セグメント配信・決済・配送管理まで。<br className="hidden md:inline" />
              クリニックに必要な機能をすべてLINE公式アカウント上で実現する、<br className="hidden md:inline" />
              業界唯一のオールインワンプラットフォームです。
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a href="/lp#contact" className="w-full rounded-lg bg-gray-900 px-8 py-3.5 text-[14px] font-bold text-white transition hover:bg-gray-700 sm:w-auto">
                無料で資料請求
              </a>
              <Link href="/lp" className="w-full rounded-lg border border-gray-300 px-8 py-3.5 text-[14px] font-bold text-gray-700 transition hover:bg-gray-50 sm:w-auto">
                製品トップを見る
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ 数値実績 ═══ */}
        <section className="border-b border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-5xl px-6 py-14">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {metrics.map((m) => (
                <div key={m.label} className="text-center">
                  <p className="text-[36px] font-bold tracking-tight text-gray-900 md:text-[44px]">
                    {m.value}<span className="text-[18px] text-gray-400">{m.unit}</span>
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
            <p className="text-center text-[12px] font-bold tracking-widest text-gray-400 uppercase">Pain Points</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              こんなお悩みはありませんか？
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {painPoints.map((p) => (
                <div key={p.title} className="rounded-lg border border-gray-200 p-5 transition hover:border-gray-300">
                  <p className="text-[14px] font-bold text-gray-900">{p.title}</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{p.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <p className="text-[18px] font-bold text-gray-900">
                これらの課題を<span className="text-sky-600">すべて解決</span>するのが
              </p>
              <p className="mt-2 text-[28px] font-bold tracking-tight text-gray-900">Lオペ for CLINIC</p>
            </div>
          </div>
        </section>

        {/* ═══ Lオペとは ═══ */}
        <section className="border-b border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-gray-400 uppercase">What is Lオペ?</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              Lオペ for CLINICとは
            </h2>
            <div className="mx-auto mt-8 max-w-3xl space-y-4 text-[15px] leading-[1.9] text-gray-600">
              <p>
                <strong className="text-gray-900">Lオペ for CLINIC</strong>は、クリニックのためだけに設計されたLINE公式アカウント運用プラットフォームです。
              </p>
              <p>
                一般的なLINE配信ツール（Lステップ、Liny等）は、飲食店・EC・スクールなど幅広い業種向けに設計されています。そのため、クリニック特有の<strong className="text-gray-900">予約管理・問診・カルテ・決済・配送</strong>といった業務には対応していません。
              </p>
              <p>
                Lオペ for CLINICは、これらの医療業務に最初から対応。LINE公式アカウントひとつで、受付から診察後のフォローアップまで、クリニック業務を一気通貫で管理できます。
              </p>
              <p>
                <strong className="text-gray-900">「LINEの配信ツール」ではなく、「LINEで動くクリニックの業務基盤」</strong>。それがLオペ for CLINICです。
              </p>
            </div>
          </div>
        </section>

        {/* ═══ 機能紹介 ═══ */}
        <section className="border-b border-gray-100">
          <div className="mx-auto max-w-5xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-gray-400 uppercase">Features</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              主な機能
            </h2>

            <div className="mt-12 space-y-16">
              {featureGroups.map((group) => (
                <div key={group.tag}>
                  <div className="flex items-center gap-3">
                    <span className="rounded bg-gray-900 px-2 py-0.5 text-[11px] font-bold text-white">{group.tag}</span>
                    <h3 className="text-[16px] font-bold text-gray-900">{group.title}</h3>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {group.features.map((f) => (
                      <div key={f.name} className="rounded-lg border border-gray-200 bg-white p-5">
                        <p className="text-[14px] font-bold text-gray-900">{f.name}</p>
                        <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{f.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href="/lp/features" className="inline-flex items-center gap-1 text-[13px] font-semibold text-sky-600 hover:underline">
                全機能一覧を見る
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        </section>

        {/* CTA中間 */}
        <section className="border-b border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-3xl px-6 py-12 text-center">
            <p className="text-[16px] font-bold text-gray-900">まずは資料で全体像をご確認ください</p>
            <p className="mt-1 text-[13px] text-gray-400">機能一覧・料金・導入事例をまとめた資料を無料でお送りします。</p>
            <a href="/lp#contact" className="mt-4 inline-block rounded-lg bg-gray-900 px-8 py-3 text-[13px] font-bold text-white transition hover:bg-gray-700">
              無料で資料請求
            </a>
          </div>
        </section>

        {/* ═══ 比較表 ═══ */}
        <section className="border-b border-gray-100">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-gray-400 uppercase">Comparison</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              汎用LINE配信ツールとの違い
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[13px] text-gray-500">
              Lステップ・Liny等の汎用LINE配信ツールは「配信」に特化。Lオペ for CLINICは「クリニック業務全体」をカバーします。
            </p>

            <div className="mt-8 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">機能</th>
                    <th className="px-4 py-3 text-center font-bold text-gray-900">Lオペ for CLINIC</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-500">汎用配信ツール</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {comparisonItems.map((item) => (
                    <tr key={item.label} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-gray-700">{item.label}</td>
                      <td className="px-4 py-3 text-center">
                        {item.lope ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-sky-600">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.generic ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                            <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
              <Link href="/lp/column/lstep-vs-clinic-tool" className="text-[13px] text-sky-600 hover:underline">
                Lステップ・Linyとの詳細比較記事を読む →
              </Link>
            </div>
          </div>
        </section>

        {/* ═══ 導入ステップ ═══ */}
        <section className="border-b border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-gray-400 uppercase">How it works</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              導入の流れ
            </h2>

            <div className="mt-10 grid gap-6 md:grid-cols-4">
              {steps.map((s) => (
                <div key={s.num} className="relative">
                  <span className="text-[32px] font-bold text-gray-200">{s.num}</span>
                  <h3 className="mt-1 text-[14px] font-bold text-gray-900">{s.title}</h3>
                  <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FAQ ═══ */}
        <section className="border-b border-gray-100">
          <div className="mx-auto max-w-3xl px-6 py-16 md:py-20">
            <p className="text-center text-[12px] font-bold tracking-widest text-gray-400 uppercase">FAQ</p>
            <h2 className="mt-3 text-center text-[24px] font-bold tracking-tight text-gray-900 md:text-[28px]">
              よくあるご質問
            </h2>
            <div className="mt-10 divide-y divide-gray-200">
              {faqs.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer items-center justify-between text-[14px] font-bold text-gray-900">
                    {f.q}
                    <svg className="h-4 w-4 shrink-0 text-gray-400 transition group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </summary>
                  <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 最終CTA ═══ */}
        <section className="bg-gray-900">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center md:py-20">
            <p className="text-[12px] font-bold tracking-widest text-gray-400 uppercase">Get Started</p>
            <h2 className="mt-3 text-[24px] font-bold tracking-tight text-white md:text-[32px]">
              クリニックのLINE活用を<br className="sm:hidden" />始めませんか？
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] text-gray-400">
              まずは無料の資料請求から。貴院の課題に合わせた活用方法をご提案します。
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a href="/lp#contact" className="w-full rounded-lg bg-white px-8 py-3.5 text-[14px] font-bold text-gray-900 transition hover:bg-gray-100 sm:w-auto">
                無料で資料請求
              </a>
              <Link href="/lp#pricing" className="w-full rounded-lg border border-gray-600 px-8 py-3.5 text-[14px] font-bold text-white transition hover:bg-gray-800 sm:w-auto">
                料金プランを見る
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t border-gray-800 bg-gray-900 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 md:flex-row md:justify-between">
          <div className="flex items-center gap-6">
            <Link href="/lp" className="text-[12px] text-gray-400 hover:text-white transition">製品トップ</Link>
            <Link href="/lp/features" className="text-[12px] text-gray-400 hover:text-white transition">機能一覧</Link>
            <Link href="/lp/column" className="text-[12px] text-gray-400 hover:text-white transition">コラム</Link>
          </div>
          <p className="text-[11px] text-gray-500">&copy; 2026 Lオペ for CLINIC. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
