import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-success-stories-5-cases")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "成功事例のサロンに共通する特徴は？", a: "5つの事例に共通するのは「セグメント配信の活用」「施術周期に合わせたリマインド」「スタッフ全員でのLINE友だち集め」の3点です。特別な予算をかけず、既存の仕組みを丁寧に運用しているサロンが成功しています。" },
  { q: "LINE運用の効果が出るまでどのくらいかかりますか？", a: "友だち集めの効果は初月から実感できますが、リピート率の改善が数字に表れるまでは3ヶ月程度かかります。6ヶ月後には売上への貢献が明確になり、12ヶ月後にはLINEなしの経営は考えられなくなるサロンがほとんどです。" },
  { q: "小規模サロンでも同様の効果は出ますか？", a: "はい、むしろ小規模サロンの方がLINEの効果を実感しやすいです。お客様との距離が近い分、パーソナルメッセージの効果が高く、スタッフ全員での声かけも徹底しやすいためです。" },
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
  "美容室・ネイル・エステ・まつげ・脱毛の5業態の成功事例",
  "各事例の具体的な施策とリピート率・売上の改善数値",
  "成功サロンに共通する3つの運用ポイント",
];

const toc = [
  { id: "case1", label: "事例1：美容室（リピート率35%向上）" },
  { id: "case2", label: "事例2：ネイルサロン（月間売上30%増）" },
  { id: "case3", label: "事例3：エステサロン（体験転換率60%超）" },
  { id: "case4", label: "事例4：まつげサロン（リペア率85%）" },
  { id: "case5", label: "事例5：脱毛サロン（紹介率25%）" },
  { id: "common", label: "成功サロンに共通する3つのポイント" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE成功事例5選" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントを活用してリピート率や売上を大幅に伸ばした<strong>5つのサロン事例</strong>を紹介します。美容室・ネイル・エステ・まつげ・脱毛の各業態から、具体的な施策と数字で見る成果を解説します。</p>

      <section>
        <h2 id="case1" className="text-xl font-bold text-gray-800">事例1：美容室A店 — リピート率35%向上</h2>

        <ComparisonTable
          headers={["指標", "導入前", "導入6ヶ月後"]}
          rows={[
            ["リピート率", "45%", "80%"],
            ["友だち数", "0人", "420人"],
            ["月間売上", "180万円", "245万円"],
            ["指名率", "35%", "55%"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">実施した施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>スタイリスト紹介ページ→指名予約の導線を設計</li>
          <li>カラー4週間後の自動リマインド配信</li>
          <li>来店翌日のお礼＋ヘアケアアドバイス配信</li>
          <li>スタッフ全員での会計時の声かけ徹底</li>
        </ul>

        <ResultCard before="45%" after="80%" metric="リピート率" description="カラーリマインドとフォロー配信で大幅改善" />
      </section>

      <section>
        <h2 id="case2" className="text-xl font-bold text-gray-800">事例2：ネイルサロンB店 — 月間売上30%増</h2>

        <StatGrid stats={[
          { value: "30%", unit: "増", label: "月間売上" },
          { value: "78%", label: "3週間以内の再来店率" },
          { value: "350人", label: "6ヶ月で集めた友だち数" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">実施した施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>Instagram連携でフォロワーをLINE友だちに変換</li>
          <li>デザインギャラリーのリッチメニュー配置</li>
          <li>オフ周期（3週間後）の自動リマインド</li>
          <li>月1回の新デザイン配信</li>
        </ul>
      </section>

      <section>
        <h2 id="case3" className="text-xl font-bold text-gray-800">事例3：エステサロンC店 — 体験転換率60%超</h2>

        <StatGrid stats={[
          { value: "62%", label: "体験→コース契約転換率（40%→62%）" },
          { value: "2倍", label: "ホームケア商品の物販売上" },
          { value: "95%", label: "コース継続率" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">実施した施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>体験後7日間の段階的フォローシナリオ</li>
          <li>施術後のホームケア商品LINE提案</li>
          <li>コース中間でのビフォーアフター共有</li>
        </ul>
      </section>

      <InlineCTA />

      <section>
        <h2 id="case4" className="text-xl font-bold text-gray-800">事例4：まつげサロンD店 — リペア率85%</h2>

        <StatGrid stats={[
          { value: "85%", label: "リペア来店率（65%→85%）" },
          { value: "15%", unit: "増", label: "スタンプカード経由の来店" },
          { value: "200人", label: "3ヶ月で集めた友だち数" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">実施した施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>リペア周期（3週間後）の自動リマインド</li>
          <li>デジタルスタンプカード（10回で1回無料）</li>
          <li>デザインカタログのLINE配信</li>
        </ul>
      </section>

      <section>
        <h2 id="case5" className="text-xl font-bold text-gray-800">事例5：脱毛サロンE店 — 紹介率25%</h2>

        <StatGrid stats={[
          { value: "25%", label: "新規客のうち紹介経由の割合" },
          { value: "90%", label: "コース継続率" },
          { value: "月8件", label: "友だち紹介による新規来店" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">実施した施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>紹介者・被紹介者双方に5,000円OFFの紹介キャンペーン</li>
          <li>コース進捗の可視化（毎回の施術後に通知）</li>
          <li>部位別の施術間隔リマインド</li>
        </ul>
      </section>

      <section>
        <h2 id="common" className="text-xl font-bold text-gray-800">成功サロンに共通する3つのポイント</h2>

        <BarChart
          data={[
            { label: "セグメント配信の活用", value: 100, color: "#22c55e" },
            { label: "施術周期リマインド", value: 100, color: "#3b82f6" },
            { label: "スタッフ全員の声かけ", value: 100, color: "#f59e0b" },
            { label: "フォロー配信の自動化", value: 80, color: "#a855f7" },
            { label: "スタンプカード活用", value: 60, color: "#ec4899" },
          ]}
          unit="%"
        />

        <Callout type="success" title="3つの共通点">
          <ol className="list-decimal pl-4 space-y-1 mt-1">
            <li><strong>セグメント配信</strong> — 全員同じではなく、お客様に合わせたメッセージ</li>
            <li><strong>施術周期リマインド</strong> — 「来店のきっかけ」を自動で作る仕組み</li>
            <li><strong>スタッフ全員の声かけ</strong> — 友だち集めの最大の原動力</li>
          </ol>
        </Callout>

        <p className="mt-4">各業態の詳しい運用方法は、<Link href="/salon/column/beauty-salon-line-operation-guide" className="text-blue-600 underline">美容室ガイド</Link>・<Link href="/salon/column/nail-salon-line-best-practices" className="text-blue-600 underline">ネイルサロン</Link>・<Link href="/salon/column/esthetic-salon-line-strategy" className="text-blue-600 underline">エステサロン</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>全5業態でLINE活用の効果を確認</strong> — リピート率30%以上の改善が共通</li>
          <li><strong>特別な予算は不要</strong> — 既存の仕組みを丁寧に運用するだけで成果が出る</li>
          <li><strong>3ヶ月で効果が見え始める</strong> — 6ヶ月で売上への貢献が明確に</li>
          <li><strong>成功の鍵はセグメント配信・リマインド・声かけの3点</strong></li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、これらの成功パターンをテンプレート化。設定するだけで、成功サロンと同じ仕組みを自分のサロンに導入できます。</p>
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
