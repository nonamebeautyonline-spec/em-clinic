import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "subscription-ec-line-churn-prevention")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "サブスクECの平均解約率はどのくらいですか？", a: "業界平均は月5〜8%です。つまり年間で40〜60%の顧客が解約します。LINE活用で解約率を月3%以下に抑えることで、LTVが大幅に改善します。" },
  { q: "解約を防ぐために最も効果的な施策は？", a: "「解約予兆の早期検知→自動フォロー」が最も効果的です。配送スキップの連続・開封率の低下・使い切りペースの遅れなどの兆候をスコアリングし、解約の前にLINEでフォローを入れます。" },
  { q: "休止オプションは解約防止に効果がありますか？", a: "非常に効果的です。「解約 or 継続」の二択ではなく「1〜3ヶ月休止」の選択肢を提供すると、解約申請の30〜40%が休止に切り替わり、そのうち60%が後に再開するデータがあります。" },
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
  "解約予兆スコアリングと自動フォローで解約率40%削減",
  "休止オプション提供で解約の30〜40%を回避",
  "継続特典通知で継続率を高める5つの施策",
];

const toc = [
  { id: "churn-reality", label: "サブスクECの解約の実態" },
  { id: "churn-scoring", label: "解約予兆スコアリング" },
  { id: "auto-follow", label: "自動フォローの設計" },
  { id: "plan-change", label: "プラン変更の提案" },
  { id: "loyalty-rewards", label: "継続特典の設計" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="サブスクEC解約防止" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">サブスクECの月間解約率は平均<strong>5〜8%</strong>。年間で顧客の半数以上が離脱しています。解約予兆を早期に検知しLINEで自動フォローすることで、解約率を<strong>40%削減</strong>した5つの施策を紹介します。</p>

      <section>
        <h2 id="churn-reality" className="text-xl font-bold text-gray-800">サブスクECの解約の実態</h2>
        <BarChart
          data={[
            { label: "商品が余っている", value: 35, color: "#ef4444" },
            { label: "効果を感じない", value: 25, color: "#f59e0b" },
            { label: "価格が高い", value: 20, color: "#3b82f6" },
            { label: "他の商品に乗り換え", value: 12, color: "#8b5cf6" },
            { label: "その他", value: 8, color: "#ec4899" },
          ]}
          unit="%（解約理由の内訳）"
        />

        <Callout type="warning" title="解約理由の60%は「防げた離脱」">
          「商品が余っている」「効果を感じない」は適切なフォローで防げる解約です。配送サイクルの調整や使い方ガイドの配信で、解約の60%は回避可能です。
        </Callout>
      </section>

      <section>
        <h2 id="churn-scoring" className="text-xl font-bold text-gray-800">解約予兆スコアリング</h2>
        <ComparisonTable
          headers={["予兆シグナル", "重み", "検知方法"]}
          rows={[
            ["配送スキップ2回連続", "高", "ECカートの配送データ"],
            ["LINE開封率の急低下", "中", "LINE配信データ"],
            ["カスタマーサポートへの不満", "高", "CS対応ログ"],
            ["使い切りペースの遅延", "中", "購入間隔の変化"],
            ["決済エラーの発生", "中", "決済データ"],
          ]}
        />

        <StatGrid stats={[
          { value: "70%", label: "予兆検知の精度" },
          { value: "2〜4", unit: "週前", label: "解約の事前検知タイミング" },
          { value: "40%", unit: "削減", label: "フォロー後の解約率改善" },
        ]} />
      </section>

      <section>
        <h2 id="auto-follow" className="text-xl font-bold text-gray-800">自動フォローの設計</h2>
        <FlowSteps steps={[
          { title: "施策1: 使い方ガイド再配信", desc: "「効果を感じない」予兆がある顧客に、正しい使い方・効果を実感するまでの期間を再案内" },
          { title: "施策2: 配送サイクル変更提案", desc: "「商品が余っている」予兆の場合、「2ヶ月ごとのお届けに変更しませんか？」と提案" },
          { title: "施策3: プラン変更・休止の案内", desc: "解約申請前に「お届け頻度の変更」「1〜3ヶ月の休止」オプションを案内" },
          { title: "施策4: 継続特典の通知", desc: "「あと2回の継続で限定プレゼント」など、継続のインセンティブを提示" },
          { title: "施策5: パーソナル対応", desc: "高LTV顧客の解約予兆は自動→スタッフ対応に切り替え、1:1で課題を聞く" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="plan-change" className="text-xl font-bold text-gray-800">プラン変更・休止の提案</h2>
        <ComparisonTable
          headers={["提案オプション", "解約回避率", "最終的な継続率"]}
          rows={[
            ["配送頻度の変更", "25〜30%", "変更者の80%が6ヶ月継続"],
            ["1ヶ月休止", "35〜40%", "休止者の60%が再開"],
            ["別商品への変更", "15〜20%", "変更者の70%が6ヶ月継続"],
            ["割引プラン（10%OFF）", "20〜25%", "割引適用者の50%が3ヶ月後に通常価格へ"],
          ]}
        />

        <ResultCard before="解約 or 継続の二択" after="休止・変更オプション追加" metric="解約申請からの回避率" description="35%の解約が休止に切り替わり、60%が後日再開" />
      </section>

      <section>
        <h2 id="loyalty-rewards" className="text-xl font-bold text-gray-800">継続特典の設計</h2>
        <ComparisonTable
          headers={["継続月数", "特典内容", "LINEでの通知"]}
          rows={[
            ["3ヶ月", "限定サンプルプレゼント", "「あと1回で3ヶ月特典」と事前通知"],
            ["6ヶ月", "10%OFF継続クーポン", "「半年間ありがとうございます」"],
            ["12ヶ月", "限定商品 + VIP特典", "「1周年記念の特別プレゼント」"],
          ]}
        />
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>
        <StatGrid stats={[
          { value: "40%", unit: "削減", label: "月間解約率の改善" },
          { value: "1.8", unit: "倍", label: "平均継続月数の向上" },
          { value: "2.5", unit: "倍", label: "顧客LTVの向上" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>解約理由の60%は防げる離脱</strong> — 商品余り・効果未実感はフォローで解決</li>
          <li><strong>予兆スコアリングで2〜4週前に検知</strong> — 配送スキップ・開封率低下が主要シグナル</li>
          <li><strong>休止オプションで解約の35%を回避</strong> — 二択ではなく複数の選択肢を提供</li>
          <li><strong>継続特典で長期継続を促進</strong> — CRM全体設計は<Link href="/ec/column/ec-line-crm-strategy" className="text-blue-600 underline">LINE CRM戦略</Link>を、リピート設計は<Link href="/ec/column/ec-repeat-purchase-scenario" className="text-blue-600 underline">リピート購入シナリオ</Link>も参照</li>
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
