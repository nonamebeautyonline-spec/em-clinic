import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "esthetic-salon-line-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "体験来店からコース契約への転換率を上げるには？", a: "体験来店後3日以内のフォローが最も重要です。体験の感想を聞くメッセージ→ビフォーアフター事例の配信→期間限定の入会特典クーポンの3段階で転換率を高めます。体験後1週間以内に50%以上のお客様の意思決定が完了します。" },
  { q: "ホームケア商品のLINE販売は可能ですか？", a: "はい、LINEのリッチメニューからECページへ誘導する方法が一般的です。施術後に「今日使用したクレンジングはこちらから購入できます」とLINEで案内すると、物販の購入率が大幅に向上します。" },
  { q: "コースの途中解約を防ぐには？", a: "施術間のフォローメッセージが効果的です。次回施術までの間に「ホームケアのアドバイス」や「施術の効果が出るメカニズム」を配信し、効果実感とモチベーションを維持させます。" },
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
  "体験来店→コース契約の転換率を高めるLINEフォロー戦略",
  "コース継続中のモチベーション維持と中途解約防止",
  "ホームケア商品のクロスセルで物販売上を最大化",
];

const toc = [
  { id: "overview", label: "エステサロンのLINE活用全体像" },
  { id: "trial-conversion", label: "体験→コース契約の転換戦略" },
  { id: "course-follow", label: "コース継続中のフォローシナリオ" },
  { id: "cross-sell", label: "ホームケア商品のクロスセル" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="エステサロンLINE戦略" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">エステサロンのLINE活用は「体験→契約の転換」「コース継続フォロー」「ホームケア物販」の<strong>3つの売上ドライバー</strong>に直結します。本記事では、エステサロンの売上を最大化するLINE戦略を解説します。</p>

      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">エステサロンのLINE活用全体像</h2>

        <FlowSteps steps={[
          { title: "体験来店の集客", desc: "SNS・ホットペッパー→LINE友だち追加→体験予約" },
          { title: "体験→コース契約", desc: "体験後フォロー→ビフォーアフター提示→入会特典→契約" },
          { title: "コース継続中", desc: "施術間フォロー→ホームケアアドバイス→物販提案→効果実感の可視化" },
          { title: "コース終了後", desc: "メンテナンス提案→新コース案内→紹介キャンペーン" },
        ]} />

        <StatGrid stats={[
          { value: "40%", label: "体験→契約の業界平均転換率" },
          { value: "60%", label: "LINEフォロー実施時の転換率" },
          { value: "2倍", label: "物販併用時のLTV向上幅" },
        ]} />
      </section>

      <section>
        <h2 id="trial-conversion" className="text-xl font-bold text-gray-800">体験→コース契約の転換戦略</h2>

        <FlowSteps steps={[
          { title: "体験当日", desc: "お礼メッセージ＋本日の施術内容サマリー" },
          { title: "体験翌日", desc: "「お肌の調子はいかがですか？」フォロー＋Q&A" },
          { title: "体験3日後", desc: "同じ悩みのお客様のビフォーアフター事例を配信" },
          { title: "体験5日後", desc: "期間限定の入会特典クーポン（1週間有効）を配信" },
          { title: "体験7日後", desc: "「ご検討状況はいかがですか？」最終フォロー" },
        ]} />

        <ResultCard before="40%（フォローなし）" after="62%（LINEフォローあり）" metric="体験→コース契約の転換率" description="体験後7日間の段階的フォローで大幅改善" />

        <Callout type="point" title="体験後3日以内が勝負">
          体験後の興味・関心は日に日に薄れていきます。3日以内にビフォーアフター事例を見せることで「自分もこうなれる」というイメージを具体化し、契約意欲を維持します。
        </Callout>
      </section>

      <section>
        <h2 id="course-follow" className="text-xl font-bold text-gray-800">コース継続中のフォローシナリオ</h2>

        <ComparisonTable
          headers={["タイミング", "配信内容", "目的"]}
          rows={[
            ["施術翌日", "「本日はお疲れ様でした」＋注意事項", "施術効果の最大化"],
            ["施術間（週1回）", "ホームケアアドバイス", "効果実感の維持"],
            ["コース中間時", "「ここまでの変化」ビフォーアフター", "継続モチベーション"],
            ["次回施術3日前", "予約リマインド＋前回の復習", "来店率の維持"],
          ]}
        />

        <Callout type="warning" title="コース途中の離脱を防ぐ">
          エステコースの中途解約率は業界平均で15〜20%。施術間のフォローメッセージで「効果が出ている実感」を持ってもらうことが離脱防止の最大の鍵です。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="cross-sell" className="text-xl font-bold text-gray-800">ホームケア商品のクロスセル</h2>

        <BarChart
          data={[
            { label: "施術後のLINE提案", value: 35, color: "#22c55e" },
            { label: "来店時の店頭販売", value: 25, color: "#3b82f6" },
            { label: "定期的なLINE配信", value: 20, color: "#f59e0b" },
            { label: "コース中間の推奨", value: 15, color: "#a855f7" },
            { label: "EC単独", value: 5, color: "#e5e7eb" },
          ]}
          unit="%"
        />

        <p>施術直後の「今日使用した美容液はこちらから購入できます」という案内が最も効果的です。施術で実感した効果を自宅でも継続したいという心理に合致するためです。</p>

        <p className="mt-4">物販売上の拡大事例は<Link href="/salon/column/salon-ec-sales-double-line-strategy" className="text-blue-600 underline">物販売上をLINEで2倍にした方法</Link>、リッチメニュー設計は<Link href="/salon/column/salon-rich-menu-templates-by-industry" className="text-blue-600 underline">業態別テンプレート</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <StatGrid stats={[
          { value: "62%", label: "体験→契約の転換率（40%→62%）" },
          { value: "80%", label: "コース継続率（中途解約が5%に減少）" },
          { value: "2倍", label: "ホームケア商品の物販売上" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>体験後7日間のフォローで転換率60%超</strong> — 当日お礼→事例配信→入会特典の3段階</li>
          <li><strong>コース中のフォローで中途解約を防止</strong> — 週1のホームケアアドバイスが鍵</li>
          <li><strong>施術後のLINE提案で物販を最大化</strong> — 「今日使用した商品」が最も売れる</li>
          <li><strong>コース終了後も関係を維持</strong> — メンテナンスプラン・紹介キャンペーンで継続</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、エステサロン向けのコース管理とフォロー配信を標準搭載。体験→契約→継続→物販のすべてのフェーズをLINEで最適化します。</p>
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
