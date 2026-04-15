import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-repeat-purchase-scenario")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "シナリオ配信と一斉配信の違いは何ですか？", a: "一斉配信は全員に同じタイミングで同じメッセージを送りますが、シナリオ配信は購入日・購入商品などのトリガーに基づいて、個人ごとに最適なタイミングで自動配信します。設定は1度で、以降は自動で運用されます。" },
  { q: "リピート購入率を上げるために最も効果的な施策は？", a: "初回購入後7日以内の「使い方ガイド + レビュー依頼」配信が最も効果的です。商品の価値を実感してもらい、次回購入のハードルを下げます。2回目購入で顧客のリピート率は3倍になるデータがあります。" },
  { q: "購買サイクルはどうやって計算しますか？", a: "リピート購入者の「前回購入日から次回購入日までの平均日数」で算出します。消耗品なら30日、アパレルなら60〜90日が一般的です。Lオペ for ECでは購買データをもとに、適切な配信タイミングを設計できます。" },
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
  "購買サイクルに合わせたLINEシナリオ配信でリピート率2倍",
  "初回購入→2回目購入のF2転換率を上げる具体的なシナリオ",
  "消耗品・アパレル・食品の業態別シナリオテンプレート",
];

const toc = [
  { id: "repeat-importance", label: "リピート購入がEC成長の鍵" },
  { id: "scenario-basics", label: "シナリオ配信の基本設計" },
  { id: "f2-conversion", label: "F2転換シナリオ" },
  { id: "repurchase-reminder", label: "再購入リマインドシナリオ" },
  { id: "cross-sell", label: "クロスセルシナリオ" },
  { id: "industry-templates", label: "業態別テンプレート" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="リピート購入シナリオ" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">新規顧客の獲得コストは既存顧客の維持コストの<strong>5倍</strong>。EC事業の成長には「リピート購入率の向上」が不可欠です。購買サイクルに合わせたLINEシナリオ配信で、リピート率を<strong>2倍</strong>に引き上げる方法を解説します。</p>

      <section>
        <h2 id="repeat-importance" className="text-xl font-bold text-gray-800">リピート購入がEC成長の鍵</h2>

        <StatGrid stats={[
          { value: "5", unit: "倍", label: "新規獲得 vs 既存維持のコスト差" },
          { value: "25%", label: "2回目購入で顧客維持率が3倍に" },
          { value: "67%", label: "リピーターの購入金額は新規の1.7倍" },
        ]} />

        <BarChart
          data={[
            { label: "1回のみ購入", value: 60, color: "#ef4444" },
            { label: "2回購入", value: 20, color: "#f59e0b" },
            { label: "3回以上購入", value: 20, color: "#22c55e" },
          ]}
          unit="%（EC顧客の購入回数分布）"
        />

        <Callout type="warning" title="60%の顧客が1回で離脱">
          多くのECサイトで、初回購入した顧客の60%が2回目の購入に至りません。この「F2転換率」の改善こそ、EC売上を飛躍的に伸ばすカギです。
        </Callout>
      </section>

      <section>
        <h2 id="scenario-basics" className="text-xl font-bold text-gray-800">シナリオ配信の基本設計</h2>

        <FlowSteps steps={[
          { title: "トリガーの設定", desc: "購入完了・配達完了・最終購入から○日経過などのイベントをトリガーに設定" },
          { title: "配信タイミングの決定", desc: "購買サイクルに基づいて最適な配信タイミングを設定。商品カテゴリごとに異なる" },
          { title: "メッセージの設計", desc: "段階ごとに異なる内容（使い方ガイド→レビュー依頼→関連商品→再購入リマインド）" },
          { title: "分岐条件の設定", desc: "途中で購入した場合はシナリオ終了→次のシナリオに移行" },
        ]} />
      </section>

      <section>
        <h2 id="f2-conversion" className="text-xl font-bold text-gray-800">F2転換シナリオ（初回→2回目購入）</h2>
        <p>最も重要なのが、初回購入者を2回目の購入に導く「F2転換シナリオ」です。</p>

        <FlowSteps steps={[
          { title: "配達完了翌日: 使い方ガイド", desc: "商品の使い方・活用法を紹介。「商品が届きましたか？」の確認も兼ねる" },
          { title: "配達3日後: レビュー依頼", desc: "使用感のレビューを依頼。レビュー投稿で次回500円OFFクーポン進呈" },
          { title: "配達7日後: 関連商品の提案", desc: "購入商品と相性の良い関連商品をカード形式で紹介（クロスセル）" },
          { title: "配達14日後: 2回目購入クーポン", desc: "「リピーター限定10%OFF」クーポンで2回目購入を促進" },
        ]} />

        <ResultCard before="F2転換率 25%" after="F2転換率 42%" metric="初回→2回目の購入率" description="F2転換シナリオ導入で1.7倍に改善" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="repurchase-reminder" className="text-xl font-bold text-gray-800">再購入リマインドシナリオ</h2>
        <p>消耗品やリピート性の高い商品は、購買サイクルに合わせたリマインドが効果的です。</p>

        <ComparisonTable
          headers={["商品カテゴリ", "平均購買サイクル", "リマインド配信日"]}
          rows={[
            ["化粧品・スキンケア", "30〜45日", "購入25日後"],
            ["サプリメント", "30日", "購入25日後"],
            ["食品・飲料", "14〜30日", "購入10日後"],
            ["ペット用品", "30〜45日", "購入25日後"],
            ["日用品・消耗品", "30〜60日", "購入25日後"],
          ]}
        />

        <Callout type="point" title="購買サイクルの5日前に配信">
          リマインドは平均購買サイクルの5日前に配信するのが最適です。「そろそろなくなりそう」と感じるタイミングで、ワンタップで再購入できるリンクを送ります。
        </Callout>
      </section>

      <section>
        <h2 id="cross-sell" className="text-xl font-bold text-gray-800">クロスセルシナリオ</h2>

        <ComparisonTable
          headers={["購入商品", "クロスセル提案", "配信タイミング", "購入率"]}
          rows={[
            ["化粧水", "乳液・美容液", "購入7日後", "15〜20%"],
            ["シャンプー", "コンディショナー・トリートメント", "購入3日後", "18〜25%"],
            ["Tシャツ", "パンツ・アウター", "購入14日後", "8〜12%"],
            ["プロテイン", "シェイカー・サプリ", "購入3日後", "20〜28%"],
          ]}
        />
      </section>

      <section>
        <h2 id="industry-templates" className="text-xl font-bold text-gray-800">業態別テンプレート</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">化粧品EC</h3>
        <FlowSteps steps={[
          { title: "翌日: 使い方動画", desc: "商品の効果的な使い方を動画で紹介" },
          { title: "7日後: 肌の変化確認", desc: "「効果を感じ始める頃です」+使用継続のモチベーション向上" },
          { title: "25日後: 再購入リマインド", desc: "「そろそろなくなる頃ですね」+ワンタップ再購入リンク" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">食品EC</h3>
        <FlowSteps steps={[
          { title: "翌日: レシピ提案", desc: "購入食材を使ったレシピを3つ紹介" },
          { title: "3日後: レビュー依頼", desc: "味の感想をレビューで教えてください" },
          { title: "10日後: 再購入＋関連商品", desc: "リピート購入リンク+季節のおすすめ商品" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>F2転換が最重要</strong> — 初回購入の60%が2回目に至らない。F2転換シナリオで42%に改善可能</li>
          <li><strong>購買サイクルの5日前にリマインド</strong> — 消耗品は自動リマインドでリピート率を大幅向上</li>
          <li><strong>クロスセルで客単価を上げる</strong> — 購入商品に基づく関連提案で平均購入率15〜25%</li>
          <li><strong>業態に合わせたシナリオ設計が鍵</strong> — クーポン戦略は<Link href="/ec/column/ec-coupon-line-distribution-strategy" className="text-blue-600 underline">LINEクーポン配信戦略</Link>で、セグメント設計は<Link href="/ec/column/ec-segment-delivery-purchase-data" className="text-blue-600 underline">購買データ活用のセグメント配信</Link>も参照</li>
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
