import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-repeat-rate-kpi-management")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "KPIは何個くらい管理すべきですか？", a: "メインKPIは3〜5個に絞りましょう。友だち数・ブロック率・開封率・リピート率・客単価の5つが基本です。サブKPIはメインの因数分解として必要に応じて追加しますが、追いすぎると運用が破綻します。" },
  { q: "KPIの確認頻度はどのくらいが適切ですか？", a: "友だち数・配信の開封率は週次、リピート率・客単価・売上は月次で確認するのがおすすめです。日次でチェックする必要があるのは配信直後のブロック数くらいです。" },
  { q: "リピート率の目標値はどう設定すべきですか？", a: "現状のリピート率＋10ポイントを3ヶ月後の目標にするのが現実的です。例えば現状45%なら、3ヶ月後に55%を目指します。業界トップクラスは70%以上ですが、段階的に改善していくのが成功のコツです。" },
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
  "サロンのLINE運用で追うべき5つのKPI指標",
  "KPIの目標設定と改善サイクルの構築方法",
  "データに基づくPDCAサイクルの回し方",
];

const toc = [
  { id: "why-kpi", label: "KPI管理が必要な理由" },
  { id: "five-kpi", label: "追うべき5つのKPI" },
  { id: "target-setting", label: "目標値の設定方法" },
  { id: "pdca", label: "PDCAサイクルの回し方" },
  { id: "dashboard", label: "KPIダッシュボードの構築" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="リピート率KPI管理" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「なんとなくLINEを運用している」状態を脱し、<strong>データに基づく改善サイクル</strong>を構築することで、リピート率を継続的に向上させられます。本記事では、サロンが追うべきKPI指標と改善サイクルの作り方を解説します。</p>

      <section>
        <h2 id="why-kpi" className="text-xl font-bold text-gray-800">KPI管理が必要な理由</h2>
        <p>感覚ではなくデータで判断することで、「何がうまくいっていて、何を改善すべきか」が明確になります。</p>

        <Callout type="warning" title="計測なしの運用は改善できない">
          KPIを設定せずにLINEを運用しているサロンは、問題が起きても原因を特定できません。「最近お客さん減ったな」と感じた時にはすでに手遅れ、というケースが多発しています。
        </Callout>
      </section>

      <section>
        <h2 id="five-kpi" className="text-xl font-bold text-gray-800">追うべき5つのKPI</h2>

        <ComparisonTable
          headers={["KPI", "目標値", "確認頻度", "改善のレバー"]}
          rows={[
            ["友だち数", "月+50人以上", "週次", "声かけ・POP・SNS連携"],
            ["ブロック率", "10%以下", "週次", "配信頻度・コンテンツ改善"],
            ["開封率", "70%以上", "配信ごと", "配信時間・件名・セグメント"],
            ["リピート率", "60%以上", "月次", "フォロー配信・セグメント"],
            ["客単価", "前月比+5%", "月次", "クロスセル提案・物販"],
          ]}
        />

        <StatGrid stats={[
          { value: "5つ", label: "管理すべきメインKPI" },
          { value: "週次+月次", label: "推奨の確認サイクル" },
          { value: "3ヶ月", label: "改善効果が安定するまでの期間" },
        ]} />
      </section>

      <section>
        <h2 id="target-setting" className="text-xl font-bold text-gray-800">目標値の設定方法</h2>

        <FlowSteps steps={[
          { title: "現状把握", desc: "過去3ヶ月のデータを集計し、各KPIの現状値を把握" },
          { title: "ギャップ分析", desc: "業界平均・理想値との差を確認。最も改善余地が大きいKPIを特定" },
          { title: "目標設定", desc: "現状値+10〜20%を3ヶ月後の目標に設定（現実的な範囲で）" },
          { title: "アクションプラン", desc: "目標達成のために実施する施策を具体的にリストアップ" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="pdca" className="text-xl font-bold text-gray-800">PDCAサイクルの回し方</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Plan（計画）</h3>
        <p>月初に配信カレンダーを作成。コンテンツの種類・配信対象セグメント・配信日時を事前に決定します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Do（実行）</h3>
        <p>計画通りに配信を実行。配信ごとにメモ（配信内容・対象セグメント・期待する反応）を記録します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Check（検証）</h3>
        <p>配信後48時間以内に開封率・クリック率・ブロック数を確認。月末にリピート率・客単価を集計します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">Act（改善）</h3>
        <p>最も反応の良かった配信・悪かった配信を分析し、次月の計画に反映します。</p>

        <ResultCard before="感覚的な運用" after="データドリブンな運用" metric="LINE運用の質" description="PDCAを3ヶ月回すとリピート率が平均15ポイント改善" />

        <p className="mt-4">ブロック率の改善は<Link href="/salon/column/salon-line-block-rate-reduction" className="text-blue-600 underline">ブロック率を下げる7つの方法</Link>、開封率の改善は<Link href="/salon/column/salon-line-open-rate-improvement" className="text-blue-600 underline">開封率を上げるテクニック</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="dashboard" className="text-xl font-bold text-gray-800">KPIダッシュボードの構築</h2>
        <p>Googleスプレッドシートやエクセルで簡易的なKPIダッシュボードを作成し、毎月の数値を記録していきましょう。</p>

        <BarChart
          data={[
            { label: "1月", value: 45, color: "#e5e7eb" },
            { label: "2月", value: 50, color: "#e5e7eb" },
            { label: "3月", value: 58, color: "#3b82f6" },
            { label: "4月（目標）", value: 65, color: "#22c55e" },
          ]}
          unit="%"
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>5つのKPIに絞って管理</strong> — 友だち数・ブロック率・開封率・リピート率・客単価</li>
          <li><strong>目標は現状+10〜20%</strong> — 高すぎる目標は挫折の原因</li>
          <li><strong>PDCAを月次で回す</strong> — 計画→実行→検証→改善のサイクルを定着</li>
          <li><strong>3ヶ月で効果が見える</strong> — 最低3サイクル回すと改善が安定</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、KPIダッシュボードを標準搭載。友だち数・配信効果・リピート率・売上を自動集計し、改善ポイントをレコメンドします。</p>
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
