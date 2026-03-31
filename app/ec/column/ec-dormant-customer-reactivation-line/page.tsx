import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-dormant-customer-reactivation-line")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "休眠顧客の定義はどのくらいの期間ですか？", a: "業態にもよりますが、最終購入から90日以上が一般的な休眠定義です。消耗品ECなら60日、アパレルなら120日が目安です。自社の平均購買サイクルの2倍を基準にするとよいでしょう。" },
  { q: "休眠顧客への配信でブロック率は上がりませんか？", a: "適切に設計すれば問題ありません。月2回程度の頻度で、価値のある情報（新商品・限定クーポン）を提供すれば、ブロック率は3%以下に抑えられます。一方的なセール情報の連打は逆効果です。" },
  { q: "復帰クーポンの割引率はどのくらいが適切ですか？", a: "休眠期間が長いほど高い割引率が必要です。90日休眠なら10%、120日なら15%、180日以上なら20%が目安です。新規獲得コストと比較して割引コストが安ければ、十分にROIが合います。" },
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
  "休眠期間別の5つの復帰シナリオ設計",
  "段階的アプローチで再購入率を3倍に引き上げる方法",
  "休眠予防の仕組みづくりで離脱率を50%削減",
];

const toc = [
  { id: "dormant-cost", label: "休眠顧客の損失コスト" },
  { id: "five-scenarios", label: "5つの復帰シナリオ" },
  { id: "scenario-detail", label: "シナリオの詳細設計" },
  { id: "prevention", label: "休眠予防の仕組み" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="休眠顧客復帰" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">ECサイトの顧客の<strong>20〜30%</strong>は90日以上購入がない「休眠顧客」です。新規獲得の1/5のコストで再購入につなげられる休眠復帰施策は、ROIが最も高い施策の1つ。LINEを活用した5つの復帰シナリオで再購入率を<strong>3倍</strong>にする方法を解説します。</p>

      <section>
        <h2 id="dormant-cost" className="text-xl font-bold text-gray-800">休眠顧客の損失コスト</h2>
        <StatGrid stats={[
          { value: "20〜30%", label: "EC顧客に占める休眠顧客の割合" },
          { value: "1/5", label: "新規獲得比の復帰コスト" },
          { value: "3", unit: "倍", label: "LINE復帰シナリオの効果" },
        ]} />

        <Callout type="warning" title="放置すれば永久離脱">
          休眠期間が180日を超えると復帰率は急激に低下します。90日時点で復帰率10〜15%だったものが、180日では3〜5%に。早期にアプローチすることが重要です。
        </Callout>
      </section>

      <section>
        <h2 id="five-scenarios" className="text-xl font-bold text-gray-800">5つの復帰シナリオ</h2>
        <ComparisonTable
          headers={["シナリオ", "対象", "内容", "復帰率"]}
          rows={[
            ["新商品リマインド", "60〜90日休眠", "新着商品や季節商品の紹介", "8〜12%"],
            ["復帰クーポン", "90〜120日休眠", "期間限定15%OFFクーポン", "10〜15%"],
            ["人気商品ランキング", "90〜150日休眠", "今売れている商品TOP5を紹介", "5〜8%"],
            ["VIP復帰特典", "元VIP顧客", "特別割引20%OFF+送料無料", "15〜20%"],
            ["ラストチャンス", "150日以上休眠", "「最後のご案内」+最大割引", "3〜5%"],
          ]}
        />
      </section>

      <section>
        <h2 id="scenario-detail" className="text-xl font-bold text-gray-800">シナリオの詳細設計</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">シナリオ1: 新商品リマインド（60〜90日）</h3>
        <FlowSteps steps={[
          { title: "60日経過", desc: "「新商品のお知らせ」過去の購入カテゴリに関連する新商品を3点紹介" },
          { title: "75日経過（未購入時）", desc: "「人気急上昇中」レビュー付きの人気商品をカード形式で紹介" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">シナリオ2: 復帰クーポン（90〜120日）</h3>
        <FlowSteps steps={[
          { title: "90日経過", desc: "「お久しぶりです」+15%OFFクーポン（有効期限14日）" },
          { title: "100日経過（未使用時）", desc: "「クーポンの期限が近づいています」リマインド" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">シナリオ5: ラストチャンス（150日以上）</h3>
        <FlowSteps steps={[
          { title: "150日経過", desc: "「最後のご案内です」20%OFFクーポン+送料無料。有効期限7日" },
          { title: "160日以上（未購入時）", desc: "配信停止。今後はセグメント配信時のみ対象" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="prevention" className="text-xl font-bold text-gray-800">休眠予防の仕組み</h2>
        <FlowSteps steps={[
          { title: "購買サイクル監視", desc: "個人の平均購買サイクルを超過した時点でアラート→自動リマインド" },
          { title: "エンゲージメント低下検知", desc: "LINE開封率やクリック率が低下したらコンテンツ変更" },
          { title: "定期購入への誘導", desc: "リピーターに「定期便なら10%OFF」で自動購入に移行" },
        ]} />

        <ResultCard before="休眠率25%" after="休眠率12%" metric="顧客の休眠率" description="休眠予防の仕組みで半減" />
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>
        <StatGrid stats={[
          { value: "12%", label: "平均復帰率（全シナリオ平均）" },
          { value: "3", unit: "倍", label: "復帰率の向上（施策前比）" },
          { value: "50%", unit: "削減", label: "休眠率の改善" },
        ]} />

        <BarChart
          data={[
            { label: "新商品リマインド", value: 10, color: "#3b82f6" },
            { label: "復帰クーポン", value: 13, color: "#22c55e" },
            { label: "人気ランキング", value: 7, color: "#f59e0b" },
            { label: "VIP復帰特典", value: 18, color: "#8b5cf6" },
            { label: "ラストチャンス", value: 4, color: "#ef4444" },
          ]}
          unit="%（シナリオ別復帰率）"
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>休眠顧客は新規獲得の1/5のコストで復帰可能</strong> — 最もROIが高い施策の1つ</li>
          <li><strong>5つのシナリオを休眠期間別に設計</strong> — 早期ほど復帰率が高い</li>
          <li><strong>休眠予防が最も重要</strong> — 購買サイクル監視と定期便誘導で休眠率を半減</li>
          <li><strong>CRM全体設計は</strong><Link href="/ec/column/ec-line-crm-strategy" className="text-blue-600 underline">LINE CRM戦略</Link>を、クーポン設計は<Link href="/ec/column/ec-coupon-line-distribution-strategy" className="text-blue-600 underline">クーポン配信戦略</Link>も参照</li>
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
