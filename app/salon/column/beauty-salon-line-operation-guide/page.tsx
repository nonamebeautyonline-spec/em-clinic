import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "beauty-salon-line-operation-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "スタイリストごとにLINEアカウントは分けるべきですか？", a: "分ける必要はありません。1つの公式アカウントでスタッフ別にタグを管理し、指名予約の導線を作る方が運用効率が高いです。スタイリスト個人のLINEでお客様対応すると、退職時に顧客が流出するリスクもあります。" },
  { q: "カラーリマインドの最適なタイミングは？", a: "カラー施術後4週間（28日後）が最適です。根元が気になり始めるタイミングに合わせて「そろそろカラーの時期です」とリマインドを送ることで、予約率が最も高くなります。" },
  { q: "美容室のLINE配信で最も反応が良いコンテンツは？", a: "ビフォーアフター写真付きのスタイル提案が最も反応率が高いです。季節のトレンドカラー・ヘアアレンジ動画も人気。純粋なクーポン配信よりも、スタイル提案＋クーポンの組み合わせの方が来店率が高くなります。" },
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
  "スタイリスト指名予約をLINEで実現する導線設計",
  "カラーリマインドとヘアケアフォロー配信の自動化",
  "美容室ならではのLINE運用成功パターン",
];

const toc = [
  { id: "overview", label: "美容室のLINE活用全体像" },
  { id: "nomination", label: "スタイリスト指名予約の導線設計" },
  { id: "color-remind", label: "カラーリマインドの自動化" },
  { id: "haircare", label: "ヘアケアフォロー配信" },
  { id: "content", label: "美容室に効果的な配信コンテンツ" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="美容室LINE運用ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">美容室のLINE活用は「スタイリスト指名予約」「カラーリマインド」「ヘアケアフォロー」の<strong>3つの軸</strong>が成功の鍵です。本記事では、美容室ならではのLINE運用方法を完全解説します。</p>

      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">美容室のLINE活用全体像</h2>

        <StatGrid stats={[
          { value: "35%", label: "LINE導入後のリピート率改善幅" },
          { value: "4週間", label: "カラー施術の最適リマインド周期" },
          { value: "2.5倍", label: "指名予約のLTV（フリー予約比）" },
        ]} />

        <FlowSteps steps={[
          { title: "来店前", desc: "スタイリスト紹介→指名予約→リマインド配信" },
          { title: "来店時", desc: "施術メモ記録→LINE友だち確認→次回提案" },
          { title: "来店後", desc: "お礼→ヘアケアアドバイス→カラーリマインド→次回予約" },
        ]} />
      </section>

      <section>
        <h2 id="nomination" className="text-xl font-bold text-gray-800">スタイリスト指名予約の導線設計</h2>
        <p>指名予約のお客様はフリー予約と比べてLTV（顧客生涯価値）が<strong>2.5倍</strong>高い傾向があります。LINEで指名予約を促進する導線を設計しましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リッチメニューからの導線</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>「スタイリスト紹介」ボタン</strong> → スタイリスト一覧ページへ</li>
          <li><strong>各スタイリストのプロフィール</strong> → 得意メニュー・作品写真・メッセージ</li>
          <li><strong>「このスタイリストで予約」ボタン</strong> → 指名予約ページへ直接遷移</li>
        </ul>

        <Callout type="success" title="Instagram連携が効果的">
          スタイリストのInstagramへのリンクを設置し、作品を見てもらうことで指名意欲を高めます。Instagram→LINE友だち追加→指名予約の導線も強力です。
        </Callout>
      </section>

      <section>
        <h2 id="color-remind" className="text-xl font-bold text-gray-800">カラーリマインドの自動化</h2>

        <ComparisonTable
          headers={["メニュー", "リマインド周期", "配信内容"]}
          rows={[
            ["カラー", "4週間後", "「根元が気になる頃かと思います。次回のカラーご予約はこちら」"],
            ["パーマ", "2〜3ヶ月後", "「パーマの持ちはいかがですか？かけ直しの時期です」"],
            ["縮毛矯正", "4〜6ヶ月後", "「新しく伸びてきた部分が気になり始めたら、お気軽にご予約を」"],
            ["カット", "1〜2ヶ月後", "「前回のカットから1ヶ月が経ちました。スタイルの維持にそろそろカットの時期です」"],
          ]}
        />

        <ResultCard before="45%（リマインドなし）" after="68%（自動リマインドあり）" metric="次回来店率" description="メニュー別の最適周期でリマインドを配信" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="haircare" className="text-xl font-bold text-gray-800">ヘアケアフォロー配信</h2>

        <FlowSteps steps={[
          { title: "来店翌日", desc: "「本日はありがとうございました！新しいスタイルの調子はいかがですか？」" },
          { title: "来店1週間後", desc: "「自宅でのスタイリングのコツ」をメニュー別に配信" },
          { title: "来店2週間後", desc: "「カラーを長持ちさせるシャンプーの選び方」等のヘアケア情報" },
        ]} />

        <Callout type="point" title="フォロー配信が物販にもつながる">
          ヘアケアアドバイスの中でおすすめ商品を自然に紹介すると、ホームケア商品の物販にもつながります。「押し売り感」を出さず、あくまでアドバイスの延長線上で提案するのがコツです。
        </Callout>
      </section>

      <section>
        <h2 id="content" className="text-xl font-bold text-gray-800">美容室に効果的な配信コンテンツ</h2>

        <BarChart
          data={[
            { label: "ビフォーアフター", value: 28, color: "#22c55e" },
            { label: "トレンドスタイル", value: 22, color: "#3b82f6" },
            { label: "ヘアアレンジ動画", value: 18, color: "#f59e0b" },
            { label: "クーポン", value: 15, color: "#a855f7" },
            { label: "スタッフ紹介", value: 10, color: "#ec4899" },
            { label: "ホームケア情報", value: 7, color: "#06b6d4" },
          ]}
          unit="%"
        />

        <p>リッチメニューの設計は<Link href="/salon/column/salon-rich-menu-templates-by-industry" className="text-blue-600 underline">業態別テンプレート</Link>、リピート率向上の配信戦略は<Link href="/salon/column/salon-repeat-rate-line-delivery-strategy" className="text-blue-600 underline">リピート率を上げるLINE配信術</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <StatGrid stats={[
          { value: "35%", unit: "向上", label: "リピート率" },
          { value: "68%", label: "カラーリマインドからの再来店率" },
          { value: "15%", unit: "増", label: "指名率の改善" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>指名予約の導線を設計</strong> — スタイリスト紹介→作品閲覧→指名予約のスムーズな流れ</li>
          <li><strong>メニュー別にリマインド周期を設定</strong> — カラー4週、パーマ2〜3ヶ月、カット1〜2ヶ月</li>
          <li><strong>ヘアケアフォローで信頼と物販を両立</strong> — 翌日→1週間→2週間の3段階</li>
          <li><strong>ビフォーアフター写真が最強のコンテンツ</strong> — 視覚的な訴求で来店意欲を喚起</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、美容室に最適化されたLINE運用を実現。スタイリスト指名予約・カラーリマインド・ヘアケアフォローを標準搭載しています。</p>
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
