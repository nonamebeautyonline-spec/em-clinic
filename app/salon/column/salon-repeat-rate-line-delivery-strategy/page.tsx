import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-repeat-rate-line-delivery-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "セグメント配信は何人くらいから始めるべきですか？", a: "友だち数が100人を超えたら始めるのが目安です。それ以下の場合は一斉配信でも十分効果がありますが、来店回数（新規・2回目・常連）の3セグメントだけでも分けると反応率が変わります。" },
  { q: "配信頻度の最適な回数は？", a: "月2〜4回が最適です。週1回を目安に、情報配信とクーポン配信を交互に行うのがおすすめです。月に5回以上配信するとブロック率が急上昇する傾向があるため注意してください。" },
  { q: "配信内容のネタが尽きてしまいます", a: "季節のヘアケア・トレンドスタイル紹介・スタッフ紹介・Q&A・お客様のビフォーアフター（許可済み）・ホームケアアドバイスなど、美容情報は常にネタの宝庫です。月間コンテンツカレンダーを事前に作ると楽になります。" },
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
  "来店回数・メニュー・最終来店日によるセグメント設計の実践方法",
  "セグメントごとの最適な配信内容とタイミング",
  "リピート率を30%向上させた具体的な配信シナリオ",
];

const toc = [
  { id: "repeat-importance", label: "リピート率がサロン経営を左右する理由" },
  { id: "segment-design", label: "セグメント設計の基本" },
  { id: "scenario", label: "セグメント別の配信シナリオ" },
  { id: "timing", label: "配信タイミングの最適化" },
  { id: "content-ideas", label: "配信コンテンツのアイデア" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="リピート率×LINE配信術" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">新規客の獲得コストはリピーターの<strong>5〜7倍</strong>。サロン経営の安定にはリピート率の向上が不可欠です。本記事では、LINEのセグメント配信を活用して、来店回数・メニュー・最終来店日ごとに最適なメッセージを届け、リピート率を向上させる具体的な方法を解説します。</p>

      <section>
        <h2 id="repeat-importance" className="text-xl font-bold text-gray-800">リピート率がサロン経営を左右する理由</h2>

        <StatGrid stats={[
          { value: "5〜7倍", label: "新規獲得 vs リピーターの獲得コスト差" },
          { value: "80%", label: "売上におけるリピーターの貢献割合" },
          { value: "90日", label: "2回目来店がなければ失客となる目安" },
        ]} />

        <Callout type="warning" title="2回目来店が最大のハードル">
          初回来店から2回目に来てもらう確率は約40%。しかし3回目以降のリピート率は70%以上に跳ね上がります。つまり「2回目の来店」をいかに実現するかがサロン経営の最重要課題です。
        </Callout>
      </section>

      <section>
        <h2 id="segment-design" className="text-xl font-bold text-gray-800">セグメント設計の基本</h2>

        <ComparisonTable
          headers={["セグメント", "対象", "配信の目的"]}
          rows={[
            ["新規客", "来店1回目", "2回目来店の促進"],
            ["リピーター（浅い）", "来店2〜4回", "定着・習慣化"],
            ["常連客", "来店5回以上", "ロイヤルティ強化・客単価UP"],
            ["休眠客", "最終来店から90日以上", "再来店の喚起"],
            ["VIP", "年間売上上位20%", "特別対応・口コミ促進"],
          ]}
        />

        <p>最低限この5つのセグメントを設定するだけで、一斉配信と比較して反応率が<strong>2〜3倍</strong>向上します。</p>
      </section>

      <section>
        <h2 id="scenario" className="text-xl font-bold text-gray-800">セグメント別の配信シナリオ</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">新規客向けシナリオ</h3>
        <FlowSteps steps={[
          { title: "来店翌日", desc: "お礼メッセージ＋「仕上がりはいかがですか？」とフォロー" },
          { title: "来店1週間後", desc: "ホームケアのアドバイスを配信（ヘアケア・ネイルケアなど）" },
          { title: "来店3週間後", desc: "2回目来店クーポン（10〜15%OFF）を配信" },
          { title: "来店6週間後", desc: "「そろそろ次回の時期です」リマインド＋予約リンク" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">常連客向けシナリオ</h3>
        <FlowSteps steps={[
          { title: "来店翌日", desc: "お礼＋次回のスタイル提案" },
          { title: "来店後の定期配信", desc: "新メニューの先行案内・VIP限定情報" },
          { title: "施術周期に合わせたリマインド", desc: "前回メニューの周期（カラー4週・ネイル3週）に合わせて予約案内" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="timing" className="text-xl font-bold text-gray-800">配信タイミングの最適化</h2>

        <BarChart
          data={[
            { label: "平日12:00", value: 85, color: "#22c55e" },
            { label: "平日20:00", value: 82, color: "#3b82f6" },
            { label: "土曜10:00", value: 78, color: "#f59e0b" },
            { label: "日曜21:00", value: 75, color: "#a855f7" },
            { label: "平日9:00", value: 65, color: "#ef4444" },
          ]}
          unit="%"
        />

        <p>サロンの顧客層（20〜40代女性）のLINE開封率が最も高いのは平日12時台と20時台です。クーポン配信は金曜夜が最も利用率が高く、週末の来店につながりやすい傾向があります。</p>
      </section>

      <section>
        <h2 id="content-ideas" className="text-xl font-bold text-gray-800">配信コンテンツのアイデア</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">月間コンテンツカレンダーの例</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>第1週</strong> — 季節のトレンドスタイル紹介（画像付き）</li>
          <li><strong>第2週</strong> — お客様のビフォーアフター事例（許可済み）</li>
          <li><strong>第3週</strong> — ホームケアアドバイス＋おすすめ商品紹介</li>
          <li><strong>第4週</strong> — LINE限定クーポン配信</li>
        </ul>

        <Callout type="success" title="情報7割、販促3割のバランス">
          毎回クーポンだけ配信するとブロック率が上がります。お役立ち情報やトレンド紹介を中心に配信し、月1回のペースでクーポンを挟むのが最適なバランスです。ブロック率の対策は<Link href="/salon/column/salon-line-block-rate-reduction" className="text-blue-600 underline">ブロック率を下げる7つの方法</Link>で解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <ResultCard before="45%" after="65%" metric="リピート率（2回目来店率）" description="セグメント配信＋フォローシナリオで大幅改善" />

        <StatGrid stats={[
          { value: "2.5倍", label: "セグメント配信の反応率（一斉配信比）" },
          { value: "20%", unit: "向上", label: "月間売上" },
          { value: "30日", unit: "短縮", label: "平均来店周期" },
        ]} />

        <p>休眠顧客の掘り起こし方法は<Link href="/salon/column/salon-dormant-customer-reactivation" className="text-blue-600 underline">休眠顧客をLINEで掘り起こす5つの施策</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>5つのセグメントを最低限設定</strong> — 新規・リピーター・常連・休眠・VIPで分類</li>
          <li><strong>2回目来店がリピート率向上の鍵</strong> — 来店翌日〜6週間のフォローシナリオを構築</li>
          <li><strong>配信は月2〜4回、情報7割・販促3割</strong> — ブロック率を抑えつつ来店を促進</li>
          <li><strong>施術周期に合わせたリマインド</strong> — カラー4週・ネイル3週など、メニュー別に設定</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、セグメント設計から配信シナリオの自動実行まで、リピート率向上のための全工程をワンストップで提供します。</p>
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
