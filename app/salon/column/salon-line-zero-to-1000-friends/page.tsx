import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-zero-to-1000-friends")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "1000人到達までどのくらいの期間がかかりますか？", a: "月間来店数100人のサロンで、声かけ・POP・SNS連携を徹底した場合、8〜12ヶ月が目安です。月間来店200人以上のサロンなら6ヶ月以内も十分可能です。既存客のLINE移行を集中実施すると初速が早くなります。" },
  { q: "友だち1000人で月にどのくらいの売上貢献がありますか？", a: "友だち1人あたりの月間売上貢献額は300〜500円です。1000人であれば月30〜50万円の売上貢献が見込めます。ただし、適切な配信・リピート施策を実施していることが前提です。" },
  { q: "友だち数よりもブロック率を気にすべきですか？", a: "両方重要ですが、初期フェーズでは友だち数の増加に注力しましょう。ブロック率は15%以下であれば許容範囲です。1000人を超えたあたりからブロック率の最適化に重点を移すのがバランスの良いアプローチです。" },
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
  "0→100→500→1000人のフェーズ別成長戦略",
  "各フェーズで優先すべき施策と目標KPI",
  "友だち1000人到達後の売上インパクト試算",
];

const toc = [
  { id: "roadmap", label: "0→1000人のロードマップ全体像" },
  { id: "phase1", label: "フェーズ1：0→100人（基盤構築期）" },
  { id: "phase2", label: "フェーズ2：100→500人（成長期）" },
  { id: "phase3", label: "フェーズ3：500→1000人（加速期）" },
  { id: "revenue", label: "1000人到達後の売上インパクト" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="友だち0→1000人ロードマップ" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">友だち数<strong>1000人</strong>はサロンのLINE運用における最初のマイルストーンです。1000人に到達すると、セグメント配信の効果が本格化し、月間<strong>30〜50万円</strong>の売上貢献が見込めます。本記事では、ゼロから1000人まで到達するロードマップを解説します。</p>

      <section>
        <h2 id="roadmap" className="text-xl font-bold text-gray-800">0→1000人のロードマップ全体像</h2>

        <FlowSteps steps={[
          { title: "フェーズ1：0→100人（1〜2ヶ月）", desc: "アカウント設定→スタッフ全員の声かけ→店頭POP設置" },
          { title: "フェーズ2：100→500人（3〜6ヶ月）", desc: "SNS連携→ホットペッパー誘導→紹介キャンペーン開始" },
          { title: "フェーズ3：500→1000人（7〜12ヶ月）", desc: "友だち紹介の加速→配信の質を向上→セグメント運用開始" },
        ]} />

        <BarChart
          data={[
            { label: "1ヶ月目", value: 50, color: "#e5e7eb" },
            { label: "3ヶ月目", value: 150, color: "#e5e7eb" },
            { label: "6ヶ月目", value: 400, color: "#3b82f6" },
            { label: "9ヶ月目", value: 700, color: "#3b82f6" },
            { label: "12ヶ月目", value: 1000, color: "#22c55e" },
          ]}
          unit="人"
        />
      </section>

      <section>
        <h2 id="phase1" className="text-xl font-bold text-gray-800">フェーズ1：0→100人（基盤構築期）</h2>

        <StatGrid stats={[
          { value: "1〜2ヶ月", label: "目標達成期間" },
          { value: "50〜60%", label: "声かけ時のLINE追加率" },
          { value: "100人", label: "フェーズ1の目標" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">最優先施策</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>スタッフ全員の声かけ</strong> — 「LINE登録で次回500円OFF」を全スタッフが案内</li>
          <li><strong>店頭POP設置</strong> — レジ横・鏡前・待合に友だち追加QRコードを設置</li>
          <li><strong>既存客の一斉移行</strong> — 来店時に順次LINE友だち追加を案内</li>
        </ul>

        <Callout type="point" title="最初の100人が最も重要">
          100人を超えると初回配信が可能になり、LINEの効果を実感できます。この実感がスタッフのモチベーションにつながり、声かけがさらに活性化する好循環が生まれます。
        </Callout>
      </section>

      <section>
        <h2 id="phase2" className="text-xl font-bold text-gray-800">フェーズ2：100→500人（成長期）</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">追加施策</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>Instagram連携</strong> — プロフィールリンクにLINE追加URL。ストーリーズで週1回告知</li>
          <li><strong>ホットペッパー誘導</strong> — 予約確認メッセージにLINE友だち追加の案内を追記</li>
          <li><strong>Googleビジネスプロフィール</strong> — LINE予約のリンクを追加</li>
          <li><strong>名刺・ショップカード</strong> — QRコード印刷で来店後の追加を促す</li>
        </ul>

        <ComparisonTable
          headers={["施策", "月間追加数の目安", "コスト"]}
          rows={[
            ["声かけ", "30〜50人", "0円"],
            ["POP", "10〜20人", "印刷費のみ"],
            ["Instagram", "15〜25人", "0円"],
            ["ホットペッパー", "10〜15人", "0円"],
            ["紹介キャンペーン", "5〜10人", "特典コスト"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="phase3" className="text-xl font-bold text-gray-800">フェーズ3：500→1000人（加速期）</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">加速施策</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>友だち紹介キャンペーンの本格化</strong> — 「紹介者・被紹介者にそれぞれ500円OFF」</li>
          <li><strong>セグメント配信の開始</strong> — 来店回数別にメッセージを分け、反応率を向上</li>
          <li><strong>イベント・キャンペーンの連動</strong> — 周年イベント等で「LINE限定メニュー」を用意</li>
          <li><strong>LINE広告の検討</strong> — 予算があれば友だち追加広告で加速</li>
        </ul>

        <ResultCard before="0人" after="1,000人" metric="LINE友だち数" description="12ヶ月で声かけ＋SNS＋紹介で達成" />
      </section>

      <section>
        <h2 id="revenue" className="text-xl font-bold text-gray-800">1000人到達後の売上インパクト</h2>

        <StatGrid stats={[
          { value: "30〜50万円", label: "月間売上貢献額（友だち1000人）" },
          { value: "360〜600万円", label: "年間の売上インパクト" },
          { value: "15%", label: "クーポン配信時の来店率" },
        ]} />

        <Callout type="success" title="1000人は通過点">
          友だち1000人はゴールではなくスタートラインです。ここからセグメント配信・リマインド配信・VIP管理を本格化させ、友だち1人あたりの売上貢献額を最大化していくフェーズに入ります。
        </Callout>

        <p className="mt-4">友だち集めの施策は<Link href="/salon/column/salon-line-friends-collection-strategies" className="text-blue-600 underline">LINE友だち集め10の施策</Link>、成功事例は<Link href="/salon/column/salon-line-success-stories-5-cases" className="text-blue-600 underline">5つのサロン事例</Link>、KPI管理は<Link href="/salon/column/salon-repeat-rate-kpi-management" className="text-blue-600 underline">リピート率KPI管理ガイド</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>フェーズ1（0→100人）</strong> — 声かけとPOPで基盤構築。最初の100人が最重要</li>
          <li><strong>フェーズ2（100→500人）</strong> — SNS・ホットペッパー連携で成長を加速</li>
          <li><strong>フェーズ3（500→1000人）</strong> — 紹介キャンペーン＋セグメント配信で加速</li>
          <li><strong>1000人到達で月30〜50万円の売上貢献</strong> — ここからが本番</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、友だち数の成長をダッシュボードで可視化し、各フェーズに最適な施策をレコメンド。1000人到達を最短ルートで支援します。</p>
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
