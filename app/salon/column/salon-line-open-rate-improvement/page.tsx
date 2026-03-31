import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, BarChart, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-open-rate-improvement")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE配信の開封率の目安は？", a: "サロン業界の平均は60〜70%です。80%以上であれば優秀、50%以下であれば改善が必要です。メールの開封率が20〜30%であることを考えると、LINEの開封率は圧倒的に高いですが、それでも改善の余地はあります。" },
  { q: "開封率を上げるために最も効果的な施策は？", a: "配信時間の最適化（平日12時台か20時台）が最も即効性があります。次にセグメント配信への切り替え、その次にメッセージの冒頭テキストの改善です。これら3つを同時に実施すると開封率が15〜20ポイント改善します。" },
  { q: "画像メッセージとテキストメッセージ、どちらが開封率は高い？", a: "開封率自体は同じですが、開封後のアクション率（タップ・クーポン利用）は画像付きメッセージの方が2倍以上高くなります。ファーストビューで視覚的にインパクトを与えることが重要です。" },
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
  "配信タイミング・内容・ターゲティングの3軸で開封率を最適化",
  "開封率を15〜20ポイント改善する具体的なテクニック",
  "開封後のアクション率を高めるメッセージ設計",
];

const toc = [
  { id: "benchmark", label: "開封率のベンチマーク" },
  { id: "timing", label: "配信タイミングの最適化" },
  { id: "content", label: "配信内容の最適化" },
  { id: "targeting", label: "ターゲティングの最適化" },
  { id: "action-rate", label: "開封後のアクション率を高める" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE開封率改善テクニック" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINEの配信は「送った」だけでは意味がありません。<strong>開封されてこそ</strong>初めて効果を発揮します。本記事では、配信タイミング・内容・ターゲティングの3軸で開封率を最大化するテクニックを解説します。</p>

      <section>
        <h2 id="benchmark" className="text-xl font-bold text-gray-800">開封率のベンチマーク</h2>

        <ComparisonTable
          headers={["チャネル", "平均開封率", "サロン目標"]}
          rows={[
            ["LINE", "60〜70%", "80%以上"],
            ["メール", "20〜30%", "—"],
            ["SMS", "70〜80%", "—"],
            ["プッシュ通知", "3〜5%", "—"],
          ]}
        />

        <p>LINEは他チャネルと比較して高い開封率を誇りますが、「80%以上」を目指すことで、配信効果を最大化できます。</p>
      </section>

      <section>
        <h2 id="timing" className="text-xl font-bold text-gray-800">配信タイミングの最適化</h2>

        <BarChart
          data={[
            { label: "平日12:00", value: 82, color: "#22c55e" },
            { label: "平日20:00", value: 80, color: "#3b82f6" },
            { label: "金曜20:00", value: 85, color: "#a855f7" },
            { label: "土曜10:00", value: 75, color: "#f59e0b" },
            { label: "平日9:00", value: 62, color: "#e5e7eb" },
            { label: "日曜夜", value: 70, color: "#e5e7eb" },
          ]}
          unit="%"
        />

        <StatGrid stats={[
          { value: "12:00", label: "平日の最適な配信時間（昼休み）" },
          { value: "20:00", label: "夜の最適な配信時間（リラックスタイム）" },
          { value: "金曜夜", label: "クーポン配信のベストタイミング" },
        ]} />

        <Callout type="point" title="金曜20時がクーポン配信のゴールデンタイム">
          週末に来店するお客様が多いサロンでは、金曜夜のクーポン配信が最も利用率が高くなります。「明日・明後日の予約まだ空いてます！」と緊急性を持たせるのも効果的です。
        </Callout>
      </section>

      <section>
        <h2 id="content" className="text-xl font-bold text-gray-800">配信内容の最適化</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">冒頭テキストが開封を左右</h3>
        <p>LINEの通知に表示される冒頭テキスト（約40文字）が、開封するかどうかの判断を左右します。</p>

        <ComparisonTable
          headers={["悪い例", "良い例", "改善ポイント"]}
          rows={[
            ["お知らせです", "【LINE限定】今だけ20%OFF", "具体的なメリットを冒頭に"],
            ["いつもありがとうございます", "〇〇様、カラーの時期です", "パーソナル感を出す"],
            ["新メニューのご案内", "夏の新メニュー｜ヘッドスパ追加", "具体的な内容を明示"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="targeting" className="text-xl font-bold text-gray-800">ターゲティングの最適化</h2>

        <ResultCard before="62%（一斉配信）" after="82%（セグメント配信）" metric="開封率" description="セグメント配信への切り替えで20ポイント改善" />

        <p>全員に同じ内容を送る一斉配信と、セグメント別に最適化した配信では、開封率に<strong>20ポイント</strong>の差が出ます。「自分に関係ある情報だ」と思ってもらえるかどうかが鍵です。</p>
      </section>

      <section>
        <h2 id="action-rate" className="text-xl font-bold text-gray-800">開封後のアクション率を高める</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>画像付きメッセージ</strong> — テキストのみと比較してタップ率2倍</li>
          <li><strong>1メッセージ1アクション</strong> — 複数のCTAを入れず、「予約する」の1つに絞る</li>
          <li><strong>期限のある特典</strong> — 「〇月〇日まで」の期限設定で行動を促す</li>
          <li><strong>リッチメッセージの活用</strong> — 画像をタップすると予約ページに遷移</li>
        </ul>

        <p className="mt-4">ブロック率の改善は<Link href="/salon/column/salon-line-block-rate-reduction" className="text-blue-600 underline">ブロック率を下げる7つの方法</Link>、KPI全体の管理は<Link href="/salon/column/salon-repeat-rate-kpi-management" className="text-blue-600 underline">リピート率KPI管理ガイド</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>配信時間は平日12時か20時</strong> — クーポンは金曜20時がベスト</li>
          <li><strong>冒頭テキストに具体的なメリットを</strong> — 通知の40文字で開封を決める</li>
          <li><strong>セグメント配信で開封率20ポイント改善</strong> — 「自分ごと」にすることが鍵</li>
          <li><strong>画像付き＋1アクション＋期限で行動を促す</strong> — 開封後の転換率を最大化</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、配信時間の自動最適化とセグメント配信を標準搭載。開封率を最大化し、1通あたりの配信効果を高めます。</p>
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
