import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-ec-sales-double-line-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "物販の利益率は施術より高いですか？", a: "はい、ホームケア商品の粗利率は50〜70%が一般的で、施術の利益率（30〜50%）よりも高いケースが多いです。さらに物販はスタッフの施術時間を消費しないため、売上の上限を拡張できる手段として注目されています。" },
  { q: "LINE経由の物販で在庫リスクはありますか？", a: "受注生産やドロップシッピングであれば在庫リスクはゼロです。自社で在庫を持つ場合も、LINEの事前アンケートで需要を予測してから仕入れることでリスクを最小化できます。" },
  { q: "施術後にLINEで商品を案内するのは押し売りになりませんか？", a: "施術中に使用した商品の案内は「情報提供」として受け取られるため、押し売り感は少ないです。「気に入ったら」「ご興味あれば」のスタンスで、あくまで選択肢の提示として案内しましょう。" },
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
  "施術後のクロスセルタイミングを活かしたLINE物販戦略",
  "ホームケア商品の提案方法とリピート購入の仕組み化",
  "物販売上を施術後LINE→EC連携で2倍にした具体的手法",
];

const toc = [
  { id: "why-retail", label: "サロン物販が注目される理由" },
  { id: "cross-sell-timing", label: "最適なクロスセルタイミング" },
  { id: "line-ec", label: "LINE→EC連携の仕組み" },
  { id: "repeat-purchase", label: "リピート購入の自動化" },
  { id: "results", label: "売上2倍を達成した事例" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="物販売上をLINEで2倍に" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">エステサロンの物販売上を<strong>LINEのクロスセル戦略で2倍</strong>にした事例を解説します。施術で実感した効果を自宅でも継続したいというお客様の心理を活かした、自然な提案方法と仕組みを紹介します。</p>

      <section>
        <h2 id="why-retail" className="text-xl font-bold text-gray-800">サロン物販が注目される理由</h2>

        <StatGrid stats={[
          { value: "50〜70%", label: "ホームケア商品の粗利率" },
          { value: "0分", label: "物販にかかるスタッフの施術時間" },
          { value: "30%", label: "エステサロンの売上に占める物販の理想比率" },
        ]} />

        <BarChart
          data={[
            { label: "施術売上", value: 70, color: "#3b82f6" },
            { label: "物販売上（現状）", value: 15, color: "#f59e0b" },
            { label: "物販売上（目標）", value: 30, color: "#22c55e" },
          ]}
          unit="%"
        />

        <Callout type="point" title="物販は「もう一つの収益柱」">
          施術売上にはスタッフの稼働時間という上限がありますが、物販にはその制限がありません。LINE経由のEC販売なら24時間販売可能で、施術時間を使わずに売上を伸ばせます。
        </Callout>
      </section>

      <section>
        <h2 id="cross-sell-timing" className="text-xl font-bold text-gray-800">最適なクロスセルタイミング</h2>

        <ComparisonTable
          headers={["タイミング", "購入率", "おすすめ度"]}
          rows={[
            ["施術直後（LINE案内）", "35%", "◎"],
            ["来店翌日（フォロー配信）", "15%", "○"],
            ["来店1週間後（ケア情報＋商品）", "8%", "○"],
            ["月1回の定期配信", "5%", "△"],
          ]}
        />

        <p>施術直後が最も購入率が高いのは、「今まさに効果を実感している」タイミングだからです。施術中に使用した商品のリンクをLINEで送信するだけで、帰宅後にスマートフォンから購入できます。</p>
      </section>

      <section>
        <h2 id="line-ec" className="text-xl font-bold text-gray-800">LINE→EC連携の仕組み</h2>

        <FlowSteps steps={[
          { title: "施術中に商品を使用", desc: "「今日はこの美容液を使いました」とお客様に説明" },
          { title: "施術後にLINEで商品リンク送信", desc: "「本日使用した商品はこちらからご購入いただけます」とリンク付きメッセージ" },
          { title: "お客様がスマホで購入", desc: "帰宅後や移動中にLINEからECページにアクセスして購入" },
          { title: "定期的なリピート購入の案内", desc: "消耗品は使い切る頃にリマインド。「そろそろなくなる頃では？」" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="repeat-purchase" className="text-xl font-bold text-gray-800">リピート購入の自動化</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">消耗品のリマインド配信</h3>
        <p>クレンジング（60日）、美容液（30日）、サプリメント（30日）など、商品ごとの平均使用期間を設定し、使い切る頃にリマインドメッセージを自動配信します。</p>

        <ResultCard before="1回きりの購入" after="平均3.5回のリピート購入" metric="1商品あたりの購入回数" description="使い切りタイミングのリマインドでリピート購入を促進" />

        <Callout type="success" title="サブスク型も有効">
          人気商品は「毎月お届け」のサブスクリプションプランを用意すると、安定した物販売上を確保できます。LINEで「定期便のお届けが近づきました」と通知するだけで解約率も低下します。
        </Callout>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">売上2倍を達成した事例</h2>

        <ComparisonTable
          headers={["指標", "導入前", "導入6ヶ月後"]}
          rows={[
            ["物販月間売上", "25万円", "52万円"],
            ["物販購入率（来店客比）", "12%", "35%"],
            ["リピート購入率", "20%", "55%"],
            ["物販の売上比率", "12%", "22%"],
          ]}
        />

        <p>エステサロンのLINE戦略全体は<Link href="/salon/column/esthetic-salon-line-strategy" className="text-blue-600 underline">エステサロンLINE活用戦略</Link>、成功事例は<Link href="/salon/column/salon-line-success-stories-5-cases" className="text-blue-600 underline">5つのサロン事例</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>施術直後のLINE提案が最も効果的</strong> — 購入率35%を達成</li>
          <li><strong>LINE→ECのシームレスな導線</strong> — 施術中に使用した商品をリンクで送信</li>
          <li><strong>リピート購入のリマインド自動化</strong> — 使い切りタイミングで再購入を促す</li>
          <li><strong>物販は施術時間を消費しない収益柱</strong> — 売上の上限を拡張</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、施術後の商品提案からリピート購入のリマインドまで、物販のクロスセル戦略をLINEで自動化します。</p>
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
