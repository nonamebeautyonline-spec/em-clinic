import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-customer-rank-line-notification")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "顧客ランク制度のランク数はいくつが適切ですか？", a: "3〜4ランクが最適です。2ランクだと差別化が難しく、5ランク以上だと管理が複雑になり、顧客にもわかりにくくなります。ブロンズ・シルバー・ゴールド・プラチナの4段階が一般的です。" },
  { q: "ランクアップ通知はどのタイミングで送るべきですか？", a: "ランク確定時の即時通知に加え、「あと○○円でランクアップ」のプレ通知も効果的です。プレ通知は達成率70%時点と90%時点の2回が推奨です。" },
  { q: "ランクの判定期間はどのくらいが適切ですか？", a: "年間累計が最も一般的です。ただし、購買サイクルの短い商材（食品・消耗品）は半年判定、高単価商材（家具・家電）は2年判定も検討しましょう。" },
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
  "4段階ランク制度の設計方法と条件設定",
  "LINEでのランクアップ通知と特典案内の自動配信",
  "ランク制度で購買頻度を1.5倍にした事例",
];

const toc = [
  { id: "why-rank", label: "顧客ランク制度の効果" },
  { id: "rank-design", label: "ランクの設計方法" },
  { id: "benefits-design", label: "ランク別特典の設計" },
  { id: "line-notification", label: "LINE通知の設計" },
  { id: "gamification", label: "ゲーミフィケーション要素" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="顧客ランク制度" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">顧客ランク制度は、購買金額に応じた特典を段階的に提供することで、顧客の「もう少し買おう」というモチベーションを刺激します。LINEでのランクアップ通知を組み合わせることで、<strong>購買頻度を1.5倍</strong>に向上させた事例を紹介します。</p>

      <section>
        <h2 id="why-rank" className="text-xl font-bold text-gray-800">顧客ランク制度の効果</h2>
        <StatGrid stats={[
          { value: "1.5", unit: "倍", label: "購買頻度の向上" },
          { value: "23%", label: "客単価の向上" },
          { value: "40%", unit: "向上", label: "顧客維持率の改善" },
        ]} />

        <p>ランク制度は「次のランクに上がりたい」という心理を活用し、購入金額と頻度の両方を自然に引き上げます。航空会社のマイレージプログラムと同じ原理です。</p>
      </section>

      <section>
        <h2 id="rank-design" className="text-xl font-bold text-gray-800">ランクの設計方法</h2>
        <ComparisonTable
          headers={["ランク", "年間購入金額", "構成比率", "目的"]}
          rows={[
            ["プラチナ", "10万円以上", "5%", "最重要顧客の維持・特別待遇"],
            ["ゴールド", "5〜10万円", "10%", "ランクアップモチベーション"],
            ["シルバー", "2〜5万円", "25%", "継続購入の促進"],
            ["ブロンズ", "2万円未満", "60%", "初回→リピートへの転換"],
          ]}
        />

        <Callout type="point" title="上位ランクは「手が届く」距離感が重要">
          プラチナランクの基準が高すぎると、大多数の顧客にとって無関係な制度になります。上位20%が次のランクに「あと少しで届く」と感じる距離感が、モチベーションを最大化します。
        </Callout>
      </section>

      <section>
        <h2 id="benefits-design" className="text-xl font-bold text-gray-800">ランク別特典の設計</h2>
        <ComparisonTable
          headers={["特典", "ブロンズ", "シルバー", "ゴールド", "プラチナ"]}
          rows={[
            ["割引クーポン", "3%OFF", "5%OFF", "8%OFF", "10%OFF"],
            ["送料無料", "—", "5,000円以上", "3,000円以上", "常時無料"],
            ["ポイント還元", "1%", "2%", "3%", "5%"],
            ["先行セール", "—", "—", "24h前", "48h前"],
            ["限定商品", "—", "—", "—", "購入可能"],
            ["誕生日特典", "3%OFF", "5%OFF", "10%OFF", "10%OFF+ギフト"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="line-notification" className="text-xl font-bold text-gray-800">LINEでのランク通知設計</h2>
        <FlowSteps steps={[
          { title: "達成率70%通知", desc: "「あと○○円でゴールドランクにランクアップ！」+次ランクの特典一覧" },
          { title: "達成率90%通知", desc: "「もうすぐゴールドランク達成です！」+おすすめ商品（不足額を超える商品）" },
          { title: "ランクアップ確定通知", desc: "「おめでとうございます！ゴールドランクに昇格しました」+特典詳細+記念クーポン" },
          { title: "ランク維持リマインド", desc: "期末3ヶ月前「現在のランクを維持するにはあと○○円の購入が必要です」" },
        ]} />

        <ResultCard before="ランク通知なし" after="LINEランク通知導入" metric="ランクアップ達成率" description="18%→32%に向上（1.8倍）" />
      </section>

      <section>
        <h2 id="gamification" className="text-xl font-bold text-gray-800">ゲーミフィケーション要素</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>プログレスバー</strong> — リッチメニューに現在のランクと次ランクまでの進捗を表示</li>
          <li><strong>達成バッジ</strong> — 「連続3ヶ月購入」「レビュー5件達成」などのバッジを付与</li>
          <li><strong>ランクアップ記念</strong> — ランクアップ時に特別クーポンを自動配信</li>
          <li><strong>ランキング表示</strong> — 「あなたは上位○%の顧客です」と相対的な位置を表示</li>
        </ul>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>
        <StatGrid stats={[
          { value: "1.5", unit: "倍", label: "購買頻度の向上" },
          { value: "32%", label: "ランクアップ達成率" },
          { value: "23%", unit: "UP", label: "客単価の向上" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>4段階ランク制度で購買意欲を刺激</strong> — 「次のランクに上がりたい」心理を活用</li>
          <li><strong>LINEでランク通知を自動化</strong> — 達成率70%・90%・確定の3段階通知</li>
          <li><strong>ゲーミフィケーションで継続モチベーション</strong> — プログレスバーやバッジで視覚的に訴求</li>
          <li><strong>CRM全体設計は</strong><Link href="/ec/column/ec-line-crm-strategy" className="text-blue-600 underline">D2C LINE CRM戦略</Link>を、RFM分析は<Link href="/ec/column/ec-rfm-analysis-line-segment" className="text-blue-600 underline">RFM分析×LINE配信</Link>も参照</li>
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
