import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-segment-delivery-purchase-data")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "セグメント配信に必要な最低友だち数は？", a: "統計的に意味のあるセグメント分析には最低500人の友だちが必要です。それ以下の場合は一斉配信からスタートし、友だち数の増加に伴って段階的にセグメントを細分化していきましょう。" },
  { q: "どのような購買データでセグメントを作るべきですか？", a: "まずはRFM（最終購入日・購入頻度・購入金額）の3軸から始めるのが効果的です。慣れてきたら商品カテゴリ・購入チャネル・クーポン利用履歴などを追加していきます。" },
  { q: "セグメント配信の配信頻度はどのくらいが適切ですか？", a: "週1〜2回が適切です。毎日配信するとブロック率が急上昇し、月1回では効果が薄くなります。セグメントごとに配信内容を変えることで、同じ頻度でもブロック率を抑えられます。" },
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
  "購買データに基づくセグメント設計の具体的な方法",
  "一斉配信からセグメント配信への移行で売上1.5倍",
  "RFM分析を活用した4象限セグメントの作り方",
];

const toc = [
  { id: "problem", label: "一斉配信の限界" },
  { id: "segment-axes", label: "セグメントの軸となるデータ" },
  { id: "four-segments", label: "4つの基本セグメント" },
  { id: "delivery-design", label: "セグメント別の配信設計" },
  { id: "advanced", label: "応用セグメント" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="セグメント配信" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">全友だちに同じメッセージを送る一斉配信は、ブロック率上昇と売上低迷の原因です。購買データに基づくセグメント配信に切り替えることで、<strong>売上を1.5倍</strong>、ブロック率を<strong>50%削減</strong>した事例を紹介します。</p>

      <section>
        <h2 id="problem" className="text-xl font-bold text-gray-800">一斉配信の限界</h2>

        <ComparisonTable
          headers={["指標", "一斉配信", "セグメント配信"]}
          rows={[
            ["開封率", "45〜55%", "65〜80%"],
            ["クリック率", "5〜8%", "15〜25%"],
            ["CV率", "0.5〜1.0%", "2.0〜4.0%"],
            ["ブロック率（月間）", "3〜5%", "1〜2%"],
            ["配信あたり売上", "基準値", "1.5〜2倍"],
          ]}
        />

        <Callout type="warning" title="一斉配信がブロック率を上げる理由">
          「自分に関係ないメッセージ」が続くと、顧客は配信を煩わしく感じてブロックします。メンズ商品を購入した顧客にレディース商品のセール情報を送る、などが典型的な失敗パターンです。
        </Callout>
      </section>

      <section>
        <h2 id="segment-axes" className="text-xl font-bold text-gray-800">セグメントの軸となるデータ</h2>

        <ComparisonTable
          headers={["データ軸", "取得元", "セグメント例"]}
          rows={[
            ["最終購入日（R）", "ECカート", "30日以内 / 31〜90日 / 91日以上"],
            ["購入頻度（F）", "ECカート", "1回 / 2〜3回 / 4回以上"],
            ["購入金額（M）", "ECカート", "〜5,000円 / 5,001〜20,000円 / 20,001円〜"],
            ["商品カテゴリ", "ECカート", "アパレル / 雑貨 / 食品 等"],
            ["クーポン利用", "ECカート", "利用あり / なし"],
            ["LINE流入経路", "LINE", "広告 / 検索 / 紹介"],
          ]}
        />
      </section>

      <section>
        <h2 id="four-segments" className="text-xl font-bold text-gray-800">4つの基本セグメント</h2>

        <StatGrid stats={[
          { value: "VIP", label: "高頻度・高単価（上位10%）" },
          { value: "リピーター", label: "2回以上購入（30%）" },
          { value: "新規", label: "初回購入のみ（40%）" },
          { value: "休眠", label: "90日以上未購入（20%）" },
        ]} />

        <FlowSteps steps={[
          { title: "VIP顧客（上位10%）", desc: "購入金額・頻度ともにトップ。先行セール案内・限定商品・特別クーポンで優遇" },
          { title: "リピーター（30%）", desc: "2回以上購入済み。関連商品のクロスセル・ランクアップ案内でLTV向上" },
          { title: "新規顧客（40%）", desc: "初回購入のみ。2回目購入の促進が最重要。使い方ガイド・レビュー紹介で信頼構築" },
          { title: "休眠顧客（20%）", desc: "90日以上未購入。復帰クーポン・新商品案内で再アクティベーション" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="delivery-design" className="text-xl font-bold text-gray-800">セグメント別の配信設計</h2>

        <ComparisonTable
          headers={["セグメント", "配信内容", "頻度", "目的"]}
          rows={[
            ["VIP", "先行セール・限定品・VIP特典", "週1回", "ロイヤルティ強化"],
            ["リピーター", "関連商品・ランクアップ案内", "週1回", "クロスセル・LTV向上"],
            ["新規", "使い方ガイド・レビュー・2回目クーポン", "週1〜2回", "リピート購入促進"],
            ["休眠", "復帰クーポン・新商品・季節商品", "月2回", "再アクティベーション"],
          ]}
        />

        <Callout type="success" title="セグメント配信で売上1.5倍">
          あるアパレルECでは、一斉配信からセグメント配信に切り替えたことで、LINE経由売上が1.5倍に増加。同時にブロック率が4.2%から1.8%に半減しました。
        </Callout>
      </section>

      <section>
        <h2 id="advanced" className="text-xl font-bold text-gray-800">応用セグメント</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>商品カテゴリ別</strong> — 購入した商品カテゴリに応じて関連商品を提案。クロスセル率が2倍に</li>
          <li><strong>購買サイクル別</strong> — 消耗品の平均購買サイクルに合わせてリマインド配信</li>
          <li><strong>クーポン感度別</strong> — クーポン利用率が高い層にはクーポン付き、低い層にはコンテンツ重視の配信</li>
          <li><strong>季節・イベント別</strong> — 過去の季節商品購入者に先行案内。購入率が一斉配信の3倍</li>
        </ul>
        <p className="mt-3">RFM分析をさらに深堀りする方法は<Link href="/ec/column/ec-rfm-analysis-line-segment" className="text-blue-600 underline">RFM分析×LINEセグメント配信</Link>で詳しく解説しています。</p>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <ResultCard before="一斉配信のみ" after="セグメント配信導入" metric="LINE経由月間売上" description="120万円→180万円（1.5倍）に向上" />

        <StatGrid stats={[
          { value: "1.5", unit: "倍", label: "LINE経由売上の向上" },
          { value: "50%", unit: "削減", label: "ブロック率の改善" },
          { value: "2", unit: "倍", label: "クリック率の向上" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>一斉配信から脱却する</strong> — セグメント配信で売上1.5倍・ブロック率50%削減</li>
          <li><strong>RFMの3軸から始める</strong> — VIP・リピーター・新規・休眠の4セグメントが基本</li>
          <li><strong>セグメントごとに配信内容と頻度を変える</strong> — 「自分に関係ある情報」だけを届ける</li>
          <li><strong>応用セグメントで精度を高める</strong> — リピート購入のシナリオ設計は<Link href="/ec/column/ec-repeat-purchase-scenario" className="text-blue-600 underline">リピート購入率2倍のシナリオ</Link>で、ブロック率削減は<Link href="/ec/column/ec-line-block-rate-reduction" className="text-blue-600 underline">ブロック率を下げる7つの方法</Link>も参照</li>
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
