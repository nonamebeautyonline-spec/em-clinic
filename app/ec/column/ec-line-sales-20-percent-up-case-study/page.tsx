import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-sales-20-percent-up-case-study")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "カゴ落ち対策だけで月商20%アップは現実的ですか？", a: "はい。カゴ落ち率70%のECサイトでLINEリマインドの回収率20%を達成すると、理論上月商の約14%を回収できます。これにリピート促進やセグメント配信を加えると20%アップは十分に達成可能です。" },
  { q: "成功事例のような効果が出るまでどのくらいかかりますか？", a: "カゴ落ちリマインドは導入直後から効果が出ます。セグメント配信やリピート施策の効果は2〜3ヶ月で顕在化します。本記事の事例では平均3ヶ月で月商20%アップを達成しています。" },
  { q: "小規模なECサイトでも同様の効果は期待できますか？", a: "月商100万円規模のECでも、カゴ落ち回収だけで月15〜25万円の売上回復が期待できます。規模が小さいほど、1施策あたりのインパクトが大きいため、むしろ導入メリットは大きいと言えます。" },
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
  "カゴ落ち対策で月商20%以上アップした5つの成功事例",
  "業態・規模別の具体的な施策内容と成果データ",
  "成功事例に共通する再現可能なポイント",
];

const toc = [
  { id: "overview", label: "成功事例の概要" },
  { id: "case1", label: "事例1: アパレルEC（月商800万円）" },
  { id: "case2", label: "事例2: 化粧品D2C（月商500万円）" },
  { id: "case3", label: "事例3: 食品EC（月商300万円）" },
  { id: "case4", label: "事例4: 雑貨EC（月商1,200万円）" },
  { id: "case5", label: "事例5: サプリメントEC（月商2,000万円）" },
  { id: "common-patterns", label: "成功の共通パターン" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="カゴ落ち成功事例" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINEのカゴ落ち対策を中心としたEC×LINE施策で、月商を<strong>20%以上</strong>アップさせたEC事業者の成功事例5選を紹介します。業態・規模別の施策内容と具体的な成果データから、再現可能なポイントを解説します。</p>

      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">成功事例の概要</h2>
        <ComparisonTable
          headers={["事例", "業態", "月商", "LINE施策", "成果"]}
          rows={[
            ["1", "アパレルEC", "800万円", "カゴ落ち+再入荷通知", "+22%"],
            ["2", "化粧品D2C", "500万円", "カゴ落ち+リピートシナリオ", "+28%"],
            ["3", "食品EC", "300万円", "カゴ落ち+消費サイクルリマインド", "+25%"],
            ["4", "雑貨EC", "1,200万円", "カゴ落ち+セグメント配信", "+20%"],
            ["5", "サプリEC", "2,000万円", "カゴ落ち+定期便移行", "+32%"],
          ]}
        />
      </section>

      <section>
        <h2 id="case1" className="text-xl font-bold text-gray-800">事例1: アパレルEC（月商800万円→976万円）</h2>
        <StatGrid stats={[
          { value: "+22%", label: "月商の増加" },
          { value: "23%", label: "カゴ落ち回収率" },
          { value: "48%", label: "再入荷通知の購入率" },
        ]} />
        <p>カゴ落ちリマインド3段階 + サイズ別再入荷通知を導入。特にサイズ切れによる機会損失の回収が大きく、再入荷通知だけで月40万円の追加売上を実現。</p>
        <ResultCard before="月商800万円" after="月商976万円" metric="月商の推移" description="カゴ落ち回収+再入荷通知で3ヶ月で達成" />
      </section>

      <section>
        <h2 id="case2" className="text-xl font-bold text-gray-800">事例2: 化粧品D2C（月商500万円→640万円）</h2>
        <StatGrid stats={[
          { value: "+28%", label: "月商の増加" },
          { value: "42%", label: "F2転換率" },
          { value: "2.1", unit: "倍", label: "リピート率の向上" },
        ]} />
        <p>カゴ落ちリマインド + 配達後の使い方ガイド配信 + 消費サイクルに合わせた再購入リマインドのフルシナリオを構築。F2転換率42%を達成し、リピート率が2.1倍に。</p>
      </section>

      <section>
        <h2 id="case3" className="text-xl font-bold text-gray-800">事例3: 食品EC（月商300万円→375万円）</h2>
        <StatGrid stats={[
          { value: "+25%", label: "月商の増加" },
          { value: "35%", label: "再購入リマインドからのリピート率" },
          { value: "33%", label: "季節商品の先行予約率" },
        ]} />
        <p>消費サイクルベースの再購入リマインドと季節限定商品の先行予約案内を組み合わせ。レシピコンテンツ配信でエンゲージメントを高め、ブロック率1.5%の低水準を維持。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="case4" className="text-xl font-bold text-gray-800">事例4: 雑貨EC（月商1,200万円→1,440万円）</h2>
        <StatGrid stats={[
          { value: "+20%", label: "月商の増加" },
          { value: "1.8", unit: "倍", label: "セグメント配信のCV率向上" },
          { value: "55%", unit: "削減", label: "ブロック率の改善" },
        ]} />
        <p>一斉配信からRFMセグメント配信に全面切り替え。購買カテゴリ別の商品提案で、CV率1.8倍・ブロック率55%削減を同時達成。</p>
      </section>

      <section>
        <h2 id="case5" className="text-xl font-bold text-gray-800">事例5: サプリメントEC（月商2,000万円→2,640万円）</h2>
        <StatGrid stats={[
          { value: "+32%", label: "月商の増加" },
          { value: "30%", label: "定期便への移行率" },
          { value: "40%", unit: "削減", label: "解約率の改善" },
        ]} />
        <p>カゴ落ちリマインド + 3回目購入後の定期便移行提案 + 解約予兆スコアリングによる自動フォロー。定期便移行率30%と解約率40%削減で、LTVが2.5倍に向上。</p>
      </section>

      <section>
        <h2 id="common-patterns" className="text-xl font-bold text-gray-800">成功の共通パターン</h2>
        <FlowSteps steps={[
          { title: "カゴ落ちリマインドが最初の一手", desc: "全事例でカゴ落ちリマインドが最もROIが高い施策。3段階配信が標準" },
          { title: "業態特化の施策を追加", desc: "アパレル→再入荷通知、食品→消費サイクル、サプリ→定期便と業態に合わせた施策を追加" },
          { title: "セグメント配信でブロック率を抑制", desc: "一斉配信の脱却がブロック率改善と売上増加の両立の鍵" },
          { title: "効果計測→改善サイクル", desc: "KPIダッシュボードで週次モニタリングし、A/Bテストで継続改善" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>カゴ落ち対策が最もROIが高い</strong> — 全事例で最初の一手として導入。詳しくは<Link href="/ec/column/line-cart-abandonment-recovery-guide" className="text-blue-600 underline">カゴ落ち回収ガイド</Link></li>
          <li><strong>業態特化の施策で差をつける</strong> — 汎用施策 + 業態固有の施策が成功の鍵</li>
          <li><strong>セグメント配信で売上とブロック率を両立</strong> — <Link href="/ec/column/ec-segment-delivery-purchase-data" className="text-blue-600 underline">セグメント配信</Link>で詳しく解説</li>
          <li><strong>3ヶ月で月商20%アップは再現可能</strong> — まずはカゴ落ちリマインドから始めましょう</li>
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
