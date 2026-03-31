import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-vip-customer-management")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "VIP顧客の基準はどう設定すべきですか？", a: "年間売上の上位20%を基準にするのが一般的です。ただし売上だけでなく、来店頻度、紹介実績、SNSでの口コミ発信力なども考慮すると、より実態に即したVIP定義になります。" },
  { q: "VIP特典はどの程度のコストをかけるべきですか？", a: "VIP顧客からの年間売上の5〜10%をVIP特典の予算として確保するのが目安です。VIP顧客1人の年間売上が10万円なら、5,000〜10,000円の特典を年間で提供するイメージです。" },
  { q: "VIP制度を公開すべきですか？それとも暗黙にすべきですか？", a: "ランク制度自体は公開し、「ゴールド」「プラチナ」等の名称で認知させるのが効果的です。ただし、具体的な売上基準は非公開にして、達成時に「おめでとうございます」と通知する方がサプライズ感があります。" },
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
  "売上の80%を生み出すVIP顧客の特定と優先管理",
  "ランク制度・限定クーポン・優先予約のVIP特典設計",
  "VIP顧客の離反を防ぎ、口コミ発信を促す仕組み",
];

const toc = [
  { id: "pareto", label: "パレートの法則とVIP顧客" },
  { id: "identification", label: "VIP顧客の特定方法" },
  { id: "rank-system", label: "ランク制度の設計" },
  { id: "vip-benefits", label: "VIP特典の設計" },
  { id: "churn-prevention", label: "VIP離反の防止" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="VIP顧客管理" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">サロンの売上の<strong>80%は上位20%</strong>のお客様が生み出しています。このVIP顧客を特定し、特別な体験を提供することで、離反を防ぎ、さらなる売上拡大を実現できます。</p>

      <section>
        <h2 id="pareto" className="text-xl font-bold text-gray-800">パレートの法則とVIP顧客</h2>

        <StatGrid stats={[
          { value: "20%", label: "VIP顧客の全体に占める割合" },
          { value: "80%", label: "VIP顧客が生み出す売上の割合" },
          { value: "10倍", label: "VIP顧客 vs 新規客の年間売上差" },
        ]} />

        <BarChart
          data={[
            { label: "VIP（上位20%）", value: 80, color: "#22c55e" },
            { label: "その他（80%）", value: 20, color: "#e5e7eb" },
          ]}
          unit="%"
        />
      </section>

      <section>
        <h2 id="identification" className="text-xl font-bold text-gray-800">VIP顧客の特定方法</h2>

        <ComparisonTable
          headers={["指標", "基準例", "重み"]}
          rows={[
            ["年間累計売上", "上位20%", "高"],
            ["来店回数", "月1回以上", "中"],
            ["平均客単価", "平均の1.5倍以上", "中"],
            ["紹介実績", "1人以上紹介", "低"],
            ["利用年数", "2年以上", "低"],
          ]}
        />

        <Callout type="point" title="売上だけでなく来店頻度も重視">
          年1回の高額メニューよりも、月1回の安定来店の方がサロン経営にとっては貴重です。売上と来店頻度の両方を基準に組み合わせてVIPを定義しましょう。
        </Callout>
      </section>

      <section>
        <h2 id="rank-system" className="text-xl font-bold text-gray-800">ランク制度の設計</h2>

        <FlowSteps steps={[
          { title: "シルバー（来店3回以上）", desc: "誕生日クーポン＋LINE限定情報の配信" },
          { title: "ゴールド（来店10回以上 or 年間5万円以上）", desc: "シルバー特典＋優先予約＋年2回の限定クーポン" },
          { title: "プラチナ（来店20回以上 or 年間10万円以上）", desc: "ゴールド特典＋専用リッチメニュー＋新メニュー先行体験" },
        ]} />

        <Callout type="success" title="リッチメニューの切り替えで特別感を演出">
          VIP顧客には専用のリッチメニューを表示し、「VIP限定メニュー」「優先予約」のボタンを配置。通常のお客様とは異なる体験を視覚的に提供できます。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="vip-benefits" className="text-xl font-bold text-gray-800">VIP特典の設計</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>優先予約</strong> — 人気の時間帯をVIPに先行開放</li>
          <li><strong>限定クーポン</strong> — VIPのみが受け取れる特別割引</li>
          <li><strong>新メニュー先行体験</strong> — 一般公開前にVIPが先に体験</li>
          <li><strong>ノベルティプレゼント</strong> — 来店回数の節目でヘアケア商品等を贈呈</li>
          <li><strong>担当者からのパーソナルメッセージ</strong> — 機械的でない手書き感のあるメッセージ</li>
        </ul>

        <ResultCard before="12ヶ月" after="18ヶ月+" metric="VIP顧客の平均継続期間" description="VIP特典導入でLTV（顧客生涯価値）が1.5倍に" />
      </section>

      <section>
        <h2 id="churn-prevention" className="text-xl font-bold text-gray-800">VIP離反の防止</h2>
        <p>VIP顧客の来店間隔が通常の1.5倍以上に延びたら「離反予兆」として検出し、早期にフォローアップを行います。</p>

        <FlowSteps steps={[
          { title: "離反予兆の検出", desc: "来店間隔が通常の1.5倍を超えたら自動アラート" },
          { title: "担当者からの個別連絡", desc: "「お久しぶりです。新しいメニューが入りましたので…」とパーソナルメッセージ" },
          { title: "特別クーポンの送付", desc: "VIP限定の特別割引で来店のきっかけを作る" },
        ]} />

        <p className="mt-4">セグメント設計の全体像は<Link href="/salon/column/salon-customer-segmentation-strategy" className="text-blue-600 underline">顧客セグメント設計</Link>、休眠顧客の掘り起こしは<Link href="/salon/column/salon-dormant-customer-reactivation" className="text-blue-600 underline">休眠顧客の掘り起こし</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>上位20%のVIP顧客が売上の80%を生み出す</strong> — この層の管理が最優先</li>
          <li><strong>3段階のランク制度を設計</strong> — シルバー・ゴールド・プラチナでステップアップ</li>
          <li><strong>特典は「金額」より「特別感」</strong> — 優先予約・先行体験が効果的</li>
          <li><strong>離反予兆を検出して早期フォロー</strong> — 来店間隔の延びを自動検知</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、VIPランクの自動判定と専用リッチメニュー切り替えを標準搭載。大切なお客様に最高の体験を提供します。</p>
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
