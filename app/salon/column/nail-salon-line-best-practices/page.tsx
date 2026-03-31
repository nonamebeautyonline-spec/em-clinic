import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "nail-salon-line-best-practices")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "デザイン持ち込みをLINEで受けるメリットは？", a: "お客様がInstagram等で見つけたデザインの写真をLINEで事前に送ってもらうことで、施術前にイメージを共有でき、当日の施術時間短縮と満足度向上につながります。「こういうのがいいです」の認識のズレを防げるのが最大のメリットです。" },
  { q: "ネイルのオフ時期リマインドは何日後が最適？", a: "ジェルネイルは施術後3週間（21日後）が最適なリマインドタイミングです。爪の伸びが気になり始める頃に「そろそろオフの時期です」と案内すると、予約率が最も高くなります。" },
  { q: "ネイルサロンのLINE配信でNGなコンテンツは？", a: "他店のデザイン写真を無断使用すること、施術中の写真をお客様の許可なく掲載すること。必ず自店の作品写真を使い、お客様の写真は掲載許可を取りましょう。" },
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
  "デザインギャラリーと持ち込みデザインのLINE活用",
  "オフ周期リマインドで3週間サイクルの来店を定着",
  "Instagram × LINEの連携で新規→リピート転換",
];

const toc = [
  { id: "nail-line-features", label: "ネイルサロン特有のLINE活用ポイント" },
  { id: "design-gallery", label: "デザインギャラリーの活用" },
  { id: "off-remind", label: "オフ周期リマインドの自動化" },
  { id: "instagram", label: "Instagram × LINEの連携" },
  { id: "segment", label: "ネイルサロンのセグメント設計" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ネイルサロンLINE運用" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">ネイルサロンは<strong>デザインの視覚的訴求</strong>と<strong>3週間周期のオフ・付け替え</strong>というリズムがあり、LINE活用と極めて相性が良い業態です。本記事では、ネイルサロンならではのLINE運用ベストプラクティスを解説します。</p>

      <section>
        <h2 id="nail-line-features" className="text-xl font-bold text-gray-800">ネイルサロン特有のLINE活用ポイント</h2>

        <StatGrid stats={[
          { value: "3週間", label: "ジェルネイルのオフ周期" },
          { value: "80%", label: "写真でデザインを選ぶお客様の割合" },
          { value: "45%", label: "InstagramきっかけでネイルサロンLINE追加" },
        ]} />

        <ComparisonTable
          headers={["活用ポイント", "内容", "効果"]}
          rows={[
            ["デザインギャラリー", "リッチメニューから最新デザインを閲覧", "予約前のワクワク感を醸成"],
            ["持ち込みデザイン受付", "LINEで写真を送信→施術前に共有", "認識ズレ防止・施術時間短縮"],
            ["オフ周期リマインド", "3週間後に自動リマインド", "リピート率の安定化"],
            ["季節デザイン配信", "春ネイル・夏ネイル等のトレンド配信", "来店動機の創出"],
          ]}
        />
      </section>

      <section>
        <h2 id="design-gallery" className="text-xl font-bold text-gray-800">デザインギャラリーの活用</h2>
        <p>リッチメニューの「デザインギャラリー」ボタンから最新デザインを閲覧できる仕組みを作りましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ギャラリーの構成例</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>カテゴリ分類</strong> — シンプル/トレンド/フレンチ/ニュアンス/季節限定</li>
          <li><strong>価格帯表示</strong> — デザインごとに参考価格を明記</li>
          <li><strong>予約導線</strong> — 「このデザインで予約」ボタンを各デザインに配置</li>
        </ul>

        <Callout type="success" title="毎月のデザイン更新が鍵">
          月に10〜20点の新デザインを追加し、「今月の新デザイン」としてLINE配信するのが効果的。お客様に「LINEを見る理由」を作ることでブロック率を下げられます。
        </Callout>
      </section>

      <section>
        <h2 id="off-remind" className="text-xl font-bold text-gray-800">オフ周期リマインドの自動化</h2>

        <FlowSteps steps={[
          { title: "施術当日", desc: "お礼メッセージ＋施術写真（許可済み）を送信" },
          { title: "2週間後", desc: "「ネイルの調子はいかがですか？」とフォロー" },
          { title: "3週間後", desc: "「そろそろオフ・付け替えの時期です。ご予約はこちら→」リマインド" },
          { title: "4週間後（未予約の場合）", desc: "「来月の人気デザインが入荷しました」＋クーポンで予約促進" },
        ]} />

        <ResultCard before="55%（リマインドなし）" after="78%（自動リマインドあり）" metric="3週間以内の再来店率" description="オフ周期に合わせたリマインドで大幅改善" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="instagram" className="text-xl font-bold text-gray-800">Instagram × LINEの連携</h2>

        <FlowSteps steps={[
          { title: "Instagram投稿", desc: "ネイルデザイン写真を投稿。「#ネイルデザイン #渋谷ネイル」等のハッシュタグ" },
          { title: "プロフィールリンク", desc: "LINE友だち追加URLをプロフィールに設定" },
          { title: "ストーリーズ告知", desc: "「LINE限定デザインもあります！」とストーリーズで誘導" },
          { title: "LINE友だち追加→予約", desc: "友だち追加後、リッチメニューから予約へ" },
        ]} />

        <BarChart
          data={[
            { label: "Instagramからの流入", value: 45, color: "#a855f7" },
            { label: "来店時の声かけ", value: 35, color: "#22c55e" },
            { label: "ホットペッパー経由", value: 15, color: "#f59e0b" },
            { label: "その他", value: 5, color: "#e5e7eb" },
          ]}
          unit="%"
        />
      </section>

      <section>
        <h2 id="segment" className="text-xl font-bold text-gray-800">ネイルサロンのセグメント設計</h2>

        <ComparisonTable
          headers={["セグメント", "配信内容"]}
          rows={[
            ["シンプル派", "オフィスネイル・ワンカラーの新色情報"],
            ["トレンド派", "最新トレンドデザイン・季節限定アート"],
            ["ブライダル", "ブライダルネイル特集・セット割引"],
            ["フットネイル", "夏前のフットネイルキャンペーン"],
          ]}
        />

        <p>セグメント設計の詳細は<Link href="/salon/column/salon-customer-segmentation-strategy" className="text-blue-600 underline">顧客セグメント設計</Link>、リッチメニューテンプレートは<Link href="/salon/column/salon-rich-menu-templates-by-industry" className="text-blue-600 underline">業態別テンプレート</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <StatGrid stats={[
          { value: "78%", label: "3週間以内の再来店率" },
          { value: "40%", unit: "増", label: "Instagram連携後のLINE友だち増加" },
          { value: "25%", unit: "増", label: "月間売上" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>デザインギャラリーで視覚的に訴求</strong> — 月10〜20点の新デザインを更新</li>
          <li><strong>オフ周期リマインドで来店サイクルを安定化</strong> — 3週間後のリマインドが鍵</li>
          <li><strong>Instagram × LINEで新規→リピート転換</strong> — デザイン写真で認知→LINEで定着</li>
          <li><strong>好みのスタイルでセグメント配信</strong> — シンプル派・トレンド派で配信を分ける</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、ネイルサロン向けのデザインギャラリー機能とオフ周期リマインドを標準搭載しています。</p>
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
