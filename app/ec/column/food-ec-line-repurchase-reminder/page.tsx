import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "food-ec-line-repurchase-reminder")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "食品ECの再購入リマインドはどのタイミングが最適ですか？", a: "商品の消費サイクルの5日前が最適です。例えばコーヒー豆（500g）なら購入後25日、サプリメント30日分なら購入後25日にリマインドを送ることで、切れる前に再購入を促せます。" },
  { q: "季節限定商品の先行予約はどう設計しますか？", a: "前年の同時期購入者をセグメントし、一般公開の1週間前にLINEで先行予約案内を送ります。「数量限定・先着順」と伝えることで、先行予約率30%以上を実現できます。" },
  { q: "定期便への移行促進はLINEでどう行いますか？", a: "3回目の購入タイミングで「定期便なら毎回10%OFF+送料無料」と案内するのが効果的です。3回購入した顧客は定期便への移行率が最も高く、25〜35%が定期便に切り替えます。" },
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
  "消費サイクルに基づく再購入リマインドでリピート率2倍",
  "季節限定商品の先行予約でLINE経由売上を最大化",
  "定期便への移行促進で安定した継続収入を実現",
];

const toc = [
  { id: "food-ec-features", label: "食品EC特有のLINE活用ポイント" },
  { id: "repurchase-reminder", label: "再購入リマインド設計" },
  { id: "seasonal-products", label: "季節限定商品の先行予約" },
  { id: "subscription", label: "定期便への移行促進" },
  { id: "recipe-content", label: "レシピコンテンツ配信" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="食品EC活用術" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">食品ECは「消費サイクル」が明確なため、LINEの再購入リマインドが最も効果を発揮する業態です。消費タイミングに合わせた自動配信で<strong>リピート率2倍</strong>、季節商品の先行予約で<strong>予約率30%以上</strong>を実現した手法を紹介します。</p>

      <section>
        <h2 id="food-ec-features" className="text-xl font-bold text-gray-800">食品EC特有のLINE活用ポイント</h2>
        <StatGrid stats={[
          { value: "14〜30", unit: "日", label: "食品の平均消費サイクル" },
          { value: "2", unit: "倍", label: "リマインド導入後のリピート率" },
          { value: "30%", unit: "以上", label: "季節商品の先行予約率" },
        ]} />

        <p>食品ECの強みは、消費サイクルが予測しやすいことです。コーヒー・お茶・調味料・サプリメントなど、一定期間で消費される商品は、適切なタイミングでリマインドを送るだけで高いリピート率を実現できます。</p>
      </section>

      <section>
        <h2 id="repurchase-reminder" className="text-xl font-bold text-gray-800">再購入リマインド設計</h2>
        <ComparisonTable
          headers={["商品カテゴリ", "消費サイクル", "リマインド日", "リピート率"]}
          rows={[
            ["コーヒー豆（200g）", "14日", "購入10日後", "35%"],
            ["お茶（ティーバッグ30P）", "30日", "購入25日後", "28%"],
            ["調味料", "45〜60日", "購入40日後", "22%"],
            ["サプリメント（30日分）", "30日", "購入25日後", "40%"],
            ["冷凍食品セット", "14〜21日", "購入12日後", "30%"],
          ]}
        />

        <FlowSteps steps={[
          { title: "消費サイクル5日前: リマインド", desc: "「そろそろ○○がなくなる頃ですね」+ワンタップ再購入リンク" },
          { title: "消費サイクル当日: 在庫確認", desc: "「○○の在庫は大丈夫ですか？」+まとめ買い割引の案内" },
          { title: "サイクル7日後: 最終リマインド", desc: "「新フレーバーも入荷しました」+新商品案内" },
        ]} />
      </section>

      <section>
        <h2 id="seasonal-products" className="text-xl font-bold text-gray-800">季節限定商品の先行予約</h2>
        <FlowSteps steps={[
          { title: "前年購入者のセグメント", desc: "昨年の同時期に季節商品を購入した顧客を抽出" },
          { title: "1週間前: 先行予約案内", desc: "「昨年ご好評いただいた○○が今年も登場。LINE限定で先行予約受付中」" },
          { title: "一般公開日: 在庫残少案内", desc: "まだ予約していない対象者に「残りわずかです」と告知" },
        ]} />

        <ResultCard before="一斉告知（予約率12%）" after="セグメント先行予約（予約率33%）" metric="季節商品の予約率" description="前年購入者への先行案内で2.8倍" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="subscription" className="text-xl font-bold text-gray-800">定期便への移行促進</h2>
        <BarChart
          data={[
            { label: "1回目購入後", value: 5, color: "#ef4444" },
            { label: "2回目購入後", value: 15, color: "#f59e0b" },
            { label: "3回目購入後", value: 30, color: "#22c55e" },
            { label: "4回目以降", value: 25, color: "#3b82f6" },
          ]}
          unit="%（定期便への移行率）"
        />

        <Callout type="point" title="3回目購入が定期便移行のゴールデンタイム">
          3回同じ商品を購入した顧客は、商品の価値を十分に理解しています。このタイミングで「定期便なら10%OFF+送料無料+お届け日変更自由」と案内すると、移行率が最も高くなります。
        </Callout>
      </section>

      <section>
        <h2 id="recipe-content" className="text-xl font-bold text-gray-800">レシピコンテンツ配信</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>購入食材のレシピ提案</strong> — 配達翌日に3つのレシピを配信。消費促進でリピートを加速</li>
          <li><strong>季節のおすすめレシピ</strong> — 月1回、季節の食材を使ったレシピ + 関連商品リンク</li>
          <li><strong>お客様レシピの紹介</strong> — 購入者のアレンジレシピをUGCとして配信。コミュニティ感を醸成</li>
        </ul>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>
        <StatGrid stats={[
          { value: "2", unit: "倍", label: "リピート率の向上" },
          { value: "33%", label: "季節商品の先行予約率" },
          { value: "30%", label: "定期便移行率（3回目購入後）" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>消費サイクルベースのリマインドでリピート率2倍</strong> — 食品ECの最大の強みを活かす</li>
          <li><strong>季節商品は前年購入者への先行予約が効果的</strong> — 予約率3倍の差</li>
          <li><strong>3回目購入後に定期便を提案</strong> — 移行率30%のゴールデンタイム</li>
          <li><strong>リピート促進全般は</strong><Link href="/ec/column/ec-repeat-purchase-scenario" className="text-blue-600 underline">リピート購入シナリオ</Link>を、サブスクは<Link href="/ec/column/subscription-ec-line-churn-prevention" className="text-blue-600 underline">サブスクEC解約防止</Link>も参照</li>
        </ol>
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
