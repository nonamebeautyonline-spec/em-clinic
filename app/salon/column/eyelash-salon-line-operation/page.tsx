import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "eyelash-salon-line-operation")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "まつげのリペア時期はどう自動判定しますか？", a: "前回の施術日から自動で計算します。マツエクは3〜4週間、まつげパーマは4〜6週間が一般的なリペア周期です。メニュー別に周期を設定し、自動リマインドを配信できます。" },
  { q: "まつげサロンの配信で効果的なコンテンツは？", a: "デザインカタログ（一重・奥二重・二重別のおすすめデザイン）、ケア方法の動画、季節のトレンドデザインが人気です。文字より写真中心の配信が反応率が高い傾向にあります。" },
  { q: "スタンプカードはまつげサロンでも効果がありますか？", a: "はい、非常に効果的です。まつげサロンは3〜4週間周期で来店するため、年間12〜15回の来店が見込めます。10スタンプで1回分のリペア無料などの特典設計がおすすめです。" },
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
  "リペア周期に合わせた自動リマインドで安定した来店サイクルを構築",
  "目元のデザインカタログで予約前の期待感を醸成",
  "高頻度来店を活かしたスタンプカード戦略",
];

const toc = [
  { id: "characteristics", label: "まつげサロンのLINE活用特性" },
  { id: "repair-remind", label: "リペア時期リマインドの自動化" },
  { id: "design-catalog", label: "デザインカタログの運用" },
  { id: "stamp-card", label: "スタンプカード戦略" },
  { id: "care-follow", label: "アフターケアフォロー" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="まつげサロンLINE運用" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">まつげサロンは<strong>3〜4週間周期</strong>の定期来店が見込める業態です。この短い来店サイクルをLINEでキャッチすることで、高いリピート率を維持できます。</p>

      <section>
        <h2 id="characteristics" className="text-xl font-bold text-gray-800">まつげサロンのLINE活用特性</h2>

        <StatGrid stats={[
          { value: "3〜4週間", label: "マツエクのリペア周期" },
          { value: "年12〜15回", label: "平均来店回数" },
          { value: "85%", label: "リペア時期リマインドの予約転換率" },
        ]} />

        <ComparisonTable
          headers={["施術メニュー", "リペア周期", "リマインドタイミング"]}
          rows={[
            ["マツエク（シングル）", "3〜4週間", "施術後3週間"],
            ["マツエク（ボリュームラッシュ）", "3〜4週間", "施術後3週間"],
            ["まつげパーマ", "4〜6週間", "施術後4週間"],
            ["ラッシュリフト", "4〜6週間", "施術後4週間"],
          ]}
        />
      </section>

      <section>
        <h2 id="repair-remind" className="text-xl font-bold text-gray-800">リペア時期リマインドの自動化</h2>

        <FlowSteps steps={[
          { title: "施術当日", desc: "お礼＋ケア注意事項（施術後6時間は濡らさない等）" },
          { title: "施術1週間後", desc: "「まつげの調子はいかがですか？」フォローメッセージ" },
          { title: "施術3週間後", desc: "「そろそろリペアの時期です」＋予約リンク" },
          { title: "施術4週間後（未予約）", desc: "クーポン付きの再アプローチ" },
        ]} />

        <ResultCard before="65%（リマインドなし）" after="85%（自動リマインド）" metric="リペア来店率" description="周期に合わせた自動リマインドで大幅改善" />
      </section>

      <section>
        <h2 id="design-catalog" className="text-xl font-bold text-gray-800">デザインカタログの運用</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>目の形別カタログ</strong> — 一重・奥二重・二重別のおすすめデザイン</li>
          <li><strong>印象別カタログ</strong> — ナチュラル・キュート・セクシー・エレガント</li>
          <li><strong>シーン別提案</strong> — オフィス・デート・結婚式・旅行</li>
        </ul>

        <Callout type="success" title="写真が全て">
          まつげデザインは言葉では伝わりにくいため、高品質な施術写真が何より重要です。ライティングを工夫した施術写真を蓄積し、デザインカタログを充実させましょう。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="stamp-card" className="text-xl font-bold text-gray-800">スタンプカード戦略</h2>
        <p>年12回以上の来店が見込めるまつげサロンでは、スタンプカードの回転率が非常に高く、リピート促進効果も大きくなります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">おすすめの特典設計</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>5スタンプ</strong> — リペア時のまつげ美容液サンプルプレゼント</li>
          <li><strong>10スタンプ</strong> — リペア1回分無料（約5,000円相当）</li>
        </ul>

        <p className="mt-4">デジタルスタンプカードの詳しい設定は<Link href="/salon/column/salon-stamp-card-digital-guide" className="text-blue-600 underline">スタンプカードデジタル化ガイド</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="care-follow" className="text-xl font-bold text-gray-800">アフターケアフォロー</h2>

        <Callout type="point" title="ケア情報で信頼を構築">
          まつげサロンでは「長持ちさせるケア方法」が最も関心の高い情報です。クレンジングの選び方・寝る時の注意点・スクリューブラシの使い方など、役立つ情報を発信することで信頼関係を構築できます。
        </Callout>

        <p>リッチメニュー設計は<Link href="/salon/column/salon-rich-menu-templates-by-industry" className="text-blue-600 underline">業態別テンプレート</Link>、リピート率向上は<Link href="/salon/column/salon-repeat-rate-line-delivery-strategy" className="text-blue-600 underline">LINE配信術</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>リペア周期リマインドで来店率85%</strong> — メニュー別に最適な周期を設定</li>
          <li><strong>写真中心のデザインカタログ</strong> — 目の形別・印象別で提案力を強化</li>
          <li><strong>高頻度来店を活かしたスタンプカード</strong> — 年12回以上の来店で高回転</li>
          <li><strong>ケア情報の発信で信頼構築</strong> — 「長持ちさせる方法」が最も求められる情報</li>
        </ol>
        <p className="mt-4">Lオペ for SALONでは、まつげサロン向けのリペアリマインド自動化に対応しています。リッチメニューやメッセージにデザイン写真を掲載し、カタログとして活用できます。</p>
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
