import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "hotpepper-line-integration-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "ホットペッパーの予約とLINE予約でダブルブッキングは起きませんか？", a: "予約枠の一元管理を導入すれば防止できます。Lオペ for SALONではホットペッパーの予約状況とLINE予約枠を自動同期し、ダブルブッキングを防ぎます。手動の場合はGoogleカレンダー等で枠を共有管理する方法もあります。" },
  { q: "ホットペッパーをやめてLINEだけにするべきですか？", a: "すぐにやめるべきではありません。ホットペッパーは新規集客の主要チャネルであり、LINEはリピーター向けです。新規客はホットペッパーで集め、来店後にLINE友だちに変換してリピート促進するのが理想的な使い分けです。" },
  { q: "ホットペッパーからLINEへの誘導方法は？", a: "ホットペッパーの予約確認メッセージに「次回からLINEで予約すると500円OFF」と案内を追記するのが最も効果的です。来店時の声かけと合わせて実施すると、友だち追加率が大幅に向上します。" },
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
  "ホットペッパー×LINE連携で新規集客とリピート促進を両立",
  "ダブルブッキングを防ぐ予約一元管理の仕組み",
  "ホットペッパーの集客コストを最適化する段階的移行戦略",
];

const toc = [
  { id: "why-integrate", label: "なぜホットペッパーとLINEを連携するのか" },
  { id: "roles", label: "ホットペッパーとLINEの役割分担" },
  { id: "double-booking", label: "ダブルブッキング防止の仕組み" },
  { id: "hotpepper-to-line", label: "ホットペッパーからLINEへの誘導方法" },
  { id: "cost-optimization", label: "集客コストの最適化" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ホットペッパー×LINE連携" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">ホットペッパービューティーは新規集客に強い反面、リピーターにも毎回手数料が発生します。<strong>LINE予約と組み合わせることで</strong>、新規はホットペッパーで集客し、リピーターはLINEで直接予約してもらう仕組みを構築できます。</p>

      <section>
        <h2 id="why-integrate" className="text-xl font-bold text-gray-800">なぜホットペッパーとLINEを連携するのか</h2>

        <StatGrid stats={[
          { value: "2%", label: "ホットペッパー予約の手数料率" },
          { value: "0円", label: "LINE予約の手数料" },
          { value: "年36万円", label: "月100件予約のサロンで削減可能な手数料" },
        ]} />

        <p>ホットペッパー経由のリピーター予約にかかる手数料は、年間で見ると大きな金額になります。リピーターをLINE予約に移行することで、この手数料を大幅に削減しながら、ホットペッパーの新規集客力はそのまま活用できます。</p>
      </section>

      <section>
        <h2 id="roles" className="text-xl font-bold text-gray-800">ホットペッパーとLINEの役割分担</h2>

        <ComparisonTable
          headers={["役割", "ホットペッパー", "LINE"]}
          rows={[
            ["新規集客", "◎（検索流入が強い）", "△（既存友だち向け）"],
            ["リピート促進", "△（手数料が発生）", "◎（無料で直接配信）"],
            ["予約の手軽さ", "○（会員登録必要）", "◎（友だち追加のみ）"],
            ["顧客データ活用", "△（限定的）", "◎（タグ・セグメント）"],
            ["クーポン配信", "○（掲載費必要）", "◎（無料で配信可能）"],
            ["リマインド", "○（自動メール）", "◎（LINE通知で開封率高）"],
          ]}
        />

        <Callout type="point" title="「集客はホットペッパー、定着はLINE」が最適解">
          ホットペッパーを完全にやめるのではなく、新規集客のチャネルとして維持しつつ、2回目以降の予約はLINEに移行する流れを作ることが重要です。
        </Callout>
      </section>

      <section>
        <h2 id="double-booking" className="text-xl font-bold text-gray-800">ダブルブッキング防止の仕組み</h2>
        <p>ホットペッパーとLINEの2チャネルで予約を受ける場合、最大の課題がダブルブッキングです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">防止策3つ</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>予約枠の自動同期</strong> — ホットペッパーで予約が入ったらLINE側の同時間枠を自動ブロック（逆も同様）</li>
          <li><strong>Googleカレンダー連携</strong> — 両チャネルの予約をGoogleカレンダーに集約して空き状況を一元管理</li>
          <li><strong>枠数の按分管理</strong> — ホットペッパーに5枠、LINEに3枠のように事前に枠を分けて運用</li>
        </ul>

        <Callout type="success" title="自動同期が理想">
          手動管理はヒューマンエラーのリスクが高いため、システムによる自動同期が理想です。Lオペ for SALONでは、予約枠のリアルタイム同期でダブルブッキングを完全防止できます。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="hotpepper-to-line" className="text-xl font-bold text-gray-800">ホットペッパーからLINEへの誘導方法</h2>

        <FlowSteps steps={[
          { title: "予約確認メッセージに案内追記", desc: "「次回からLINEで予約すると500円OFF！友だち追加はこちら→」と案内" },
          { title: "来店時の声かけ", desc: "「LINEで予約すると次回から待ち時間なしで予約できますよ」とスタッフが案内" },
          { title: "LINE限定特典の提供", desc: "LINE予約のお客様にのみポイント2倍やミニトリートメントサービスを提供" },
          { title: "サンクスページにLINEリンク", desc: "ホットペッパーの口コミ投稿後のページにLINE追加の案内を設置" },
        ]} />

        <ResultCard before="10%" after="45%" metric="リピーターのLINE予約移行率" description="3ヶ月の誘導施策で大幅に向上" />
      </section>

      <section>
        <h2 id="cost-optimization" className="text-xl font-bold text-gray-800">集客コストの最適化</h2>

        <BarChart
          data={[
            { label: "ホットペッパー掲載料", value: 5, color: "#ef4444" },
            { label: "ホットペッパー手数料", value: 3, color: "#f59e0b" },
            { label: "LINE運用コスト", value: 0.5, color: "#22c55e" },
          ]}
          unit="万円/月"
        />

        <p>リピーターの予約をLINEに移行すると、ホットペッパーの手数料を月3万円→1万円に削減できるケースも珍しくありません。浮いたコストをホットペッパーの新規集客プランの強化に投資する好循環を作れます。予約チャネル全体の最適化は<Link href="/salon/column/salon-reservation-channel-optimization" className="text-blue-600 underline">予約チャネル最適化ガイド</Link>、LINE予約の設定方法は<Link href="/salon/column/salon-line-reservation-setup-guide" className="text-blue-600 underline">LINE予約設定ガイド</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>ホットペッパーは新規集客、LINEはリピート定着</strong> — 役割を分けて両方を活用</li>
          <li><strong>ダブルブッキング防止は自動同期がベスト</strong> — 手動管理はミスの温床</li>
          <li><strong>来店時の声かけが最も効果的な誘導手段</strong> — LINE限定特典で移行を促進</li>
          <li><strong>手数料削減効果は年間で大きな差</strong> — 浮いたコストを新規集客に再投資</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、ホットペッパーとの予約連携・ダブルブッキング防止・リピーター移行を一気通貫でサポートします。</p>
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
