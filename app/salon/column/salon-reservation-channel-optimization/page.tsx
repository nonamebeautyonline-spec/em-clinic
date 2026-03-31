import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-reservation-channel-optimization")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "予約チャネルが多すぎると管理が大変ではないですか？", a: "はい、チャネルが増えるほど管理の複雑さは増します。だからこそ一元管理ツールの導入が重要です。Lオペ for SALONでは全チャネルの予約を1画面で管理でき、ダブルブッキングも自動防止できます。" },
  { q: "Instagram DMで予約を受けるのはアリですか？", a: "Instagram DMは予約の「きっかけ」としては有効ですが、予約管理には向きません。DMで相談を受けた後、LINE予約やホットペッパーの予約ページに誘導する流れが効率的です。" },
  { q: "電話予約を完全になくすべきですか？", a: "完全になくす必要はありません。50代以上のお客様やシニア層は電話を好む傾向があります。ただし、電話の受付時間を限定し、時間外はLINE予約に誘導するのがおすすめです。" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

const keyPoints = [
  "電話・ホットペッパー・LINE・SNSの各チャネルの特性と使い分け",
  "お客様の年齢層・行動パターンに合わせた最適な導線設計",
  "チャネルごとのコスト・効率を比較して投資配分を最適化",
];

const toc = [
  { id: "channels", label: "サロンの主要予約チャネル" },
  { id: "comparison", label: "チャネル別の特性比較" },
  { id: "customer-segment", label: "顧客層別のチャネル選択" },
  { id: "ideal-flow", label: "理想的な予約導線設計" },
  { id: "cost", label: "チャネル別コスト比較" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="予約チャネル最適化" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">電話・ホットペッパー・LINE・Instagram DM。サロンの予約チャネルは増え続けていますが、<strong>すべてを同じ比重で運用するのは非効率</strong>です。本記事では、各チャネルの特性を整理し、最適な使い分けと導線設計を解説します。</p>

      <section>
        <h2 id="channels" className="text-xl font-bold text-gray-800">サロンの主要予約チャネル</h2>

        <BarChart
          data={[
            { label: "ホットペッパー", value: 35, color: "#ef4444" },
            { label: "LINE", value: 30, color: "#22c55e" },
            { label: "電話", value: 20, color: "#3b82f6" },
            { label: "Instagram DM", value: 10, color: "#a855f7" },
            { label: "自社サイト", value: 5, color: "#f59e0b" },
          ]}
          unit="%"
        />

        <p>2026年現在、サロンの予約チャネルとしてLINEのシェアが急速に伸びています。特にリピーターの予約は電話からLINEへの移行が加速しています。</p>
      </section>

      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">チャネル別の特性比較</h2>

        <ComparisonTable
          headers={["チャネル", "新規集客", "リピート", "コスト", "24時間対応"]}
          rows={[
            ["ホットペッパー", "◎", "△", "高い", true],
            ["LINE", "△", "◎", "安い", true],
            ["電話", "○", "○", "人件費", false],
            ["Instagram DM", "○", "△", "無料", true],
            ["自社サイト", "△", "○", "低い", true],
          ]}
        />

        <Callout type="point" title="チャネルごとに役割を明確に">
          すべてのチャネルで同じことをするのではなく、「新規はホットペッパー、リピートはLINE、認知はInstagram」と役割を分けることが効率的な運用の鍵です。
        </Callout>
      </section>

      <section>
        <h2 id="customer-segment" className="text-xl font-bold text-gray-800">顧客層別のチャネル選択</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">10〜20代：Instagram → LINE</h3>
        <p>Instagramでサロンを発見し、LINEで予約する導線が自然。ホットペッパーはあまり使わない傾向にあります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">30〜40代：ホットペッパー → LINE</h3>
        <p>初回はホットペッパーで検索して予約。2回目以降はLINEの手軽さを評価してLINE予約に移行します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">50代以上：電話 → 徐々にLINE</h3>
        <p>初回は電話予約が中心。来店時にLINEの便利さを丁寧に説明し、スタッフがその場で友だち追加をサポートすると移行率が上がります。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="ideal-flow" className="text-xl font-bold text-gray-800">理想的な予約導線設計</h2>

        <FlowSteps steps={[
          { title: "認知（SNS・検索）", desc: "InstagramやGoogle検索でサロンを発見" },
          { title: "初回予約（ホットペッパー）", desc: "クーポン付きでホットペッパーから初回予約" },
          { title: "来店時にLINE友だち追加", desc: "会計時に「LINEで次回予約すると500円OFF」と案内" },
          { title: "2回目以降（LINE予約）", desc: "リッチメニューからワンタップで予約。リマインドも自動" },
          { title: "定着（LINE配信でリピート促進）", desc: "セグメント配信でパーソナルなフォローアップ" },
        ]} />

        <Callout type="success" title="LINE予約はリピーターの最短経路">
          ホットペッパーは毎回ログインして検索する手間がありますが、LINEはトーク画面からワンタップで予約できます。この手軽さがリピート率を高める最大の武器です。
        </Callout>
      </section>

      <section>
        <h2 id="cost" className="text-xl font-bold text-gray-800">チャネル別コスト比較</h2>

        <BarChart
          data={[
            { label: "ホットペッパー", value: 8, color: "#ef4444" },
            { label: "電話（人件費）", value: 3, color: "#3b82f6" },
            { label: "LINE", value: 0.5, color: "#22c55e" },
            { label: "Instagram", value: 0, color: "#a855f7" },
          ]}
          unit="万円/月"
        />

        <p>ホットペッパーは掲載料＋手数料で月8万円以上のコストがかかるケースも珍しくありません。リピーターをLINE予約に移行することで、このコストの30〜50%を削減できます。ホットペッパーとの連携方法は<Link href="/salon/column/hotpepper-line-integration-guide" className="text-blue-600 underline">ホットペッパー×LINE連携ガイド</Link>、LINE予約の設定方法は<Link href="/salon/column/salon-line-reservation-setup-guide" className="text-blue-600 underline">LINE予約設定ガイド</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>チャネルごとの役割を明確に</strong> — 新規はホットペッパー、リピートはLINE、認知はInstagram</li>
          <li><strong>顧客層に合わせて導線を設計</strong> — 年齢層ごとに好まれるチャネルが異なる</li>
          <li><strong>ホットペッパー→LINEの移行で手数料を削減</strong> — リピーターの予約コストをゼロに</li>
          <li><strong>一元管理で運用負荷を最小化</strong> — ダブルブッキング防止と効率化を両立</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、全予約チャネルの一元管理を実現。ホットペッパー・LINE・電話の予約を1画面で管理し、最適な顧客導線を構築します。</p>
      </section>

      <section id="faq">
        <h2 className="text-2xl font-bold mt-12 mb-6">よくある質問</h2>
        {faqItems.map((item, i) => (
          <div key={i} className="mb-6 rounded-lg border border-gray-200 p-5">
            <h3 className="font-bold text-lg mb-2">Q. {item.q}</h3>
            <p className="text-gray-700 leading-relaxed">{item.a}</p>
          </div>
        ))}
      </section>
    </ArticleLayout>
  );
}
