import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-post-delivery-review-request")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "レビュー依頼は配達完了後何日が最適ですか？", a: "商品カテゴリによりますが、日用品・食品は配達翌日、アパレルは配達3日後、化粧品・スキンケアは配達7日後が最適です。商品を使用・体験した直後が最もレビューを書くモチベーションが高いタイミングです。" },
  { q: "レビューのインセンティブは必要ですか？", a: "インセンティブありの場合、レビュー投稿率が3〜5倍になります。500円OFFクーポンや送料無料クーポンが一般的です。ただし「正直な感想をお聞かせください」と明記し、ステマにならないよう注意が必要です。" },
  { q: "ネガティブレビューが増えるリスクはありませんか？", a: "LINEで直接依頼する場合、不満がある顧客はレビューより先にトーク画面でクレームを伝えるため、ネガティブレビューが公開サイトに投稿される前にフォロー対応できるメリットがあります。" },
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
  "配達完了後のLINEレビュー依頼で回答率を3倍に",
  "商品カテゴリ別の最適な配信タイミング",
  "UGC獲得とSEO効果を最大化するレビュー活用法",
];

const toc = [
  { id: "review-importance", label: "ECにおけるレビューの重要性" },
  { id: "optimal-timing", label: "レビュー依頼の最適タイミング" },
  { id: "message-design", label: "メッセージ設計" },
  { id: "incentive", label: "インセンティブ設計" },
  { id: "ugc-utilization", label: "レビューの活用方法" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="レビュー依頼" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">ECサイトの購入者のうち、自発的にレビューを投稿する人はわずか<strong>1〜3%</strong>。しかしLINEで配達完了後に依頼すると、回答率は<strong>10〜15%</strong>に跳ね上がります。本記事では、レビュー回答率を3倍にするタイミングとメッセージ設計を解説します。</p>

      <section>
        <h2 id="review-importance" className="text-xl font-bold text-gray-800">ECにおけるレビューの重要性</h2>
        <StatGrid stats={[
          { value: "93%", label: "購入前にレビューを確認する消費者" },
          { value: "18%", label: "レビュー10件以上でCV率が18%向上" },
          { value: "4.2", unit: "以上", label: "購入に繋がる平均評価" },
        ]} />

        <p>レビューはECサイトの「社会的証明」として、購入決定に大きな影響を与えます。レビュー数が多い商品は検索結果でも上位に表示されやすく、広告費をかけずにオーガニック流入を増やす効果もあります。</p>
      </section>

      <section>
        <h2 id="optimal-timing" className="text-xl font-bold text-gray-800">レビュー依頼の最適タイミング</h2>
        <ComparisonTable
          headers={["商品カテゴリ", "最適タイミング", "理由"]}
          rows={[
            ["食品・飲料", "配達翌日", "食べた直後の感動が新鮮なうちに"],
            ["日用品・消耗品", "配達翌日〜2日後", "開封・使用直後"],
            ["アパレル", "配達2〜3日後", "試着・着用してからの評価"],
            ["化粧品・スキンケア", "配達5〜7日後", "効果を実感するまでの期間"],
            ["家電・ガジェット", "配達7〜14日後", "十分に使い込んだ後の評価"],
          ]}
        />

        <BarChart
          data={[
            { label: "配達当日", value: 8, color: "#f59e0b" },
            { label: "配達翌日", value: 15, color: "#22c55e" },
            { label: "配達3日後", value: 12, color: "#3b82f6" },
            { label: "配達7日後", value: 9, color: "#8b5cf6" },
            { label: "配達14日後", value: 5, color: "#ef4444" },
          ]}
          unit="%（レビュー投稿率）"
        />
      </section>

      <section>
        <h2 id="message-design" className="text-xl font-bold text-gray-800">メッセージ設計</h2>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、ご購入いただいた「{"{商品名}"}」はいかがですか？</p>
          <p className="text-sm text-gray-500 mt-1">30秒で完了する簡単なレビューにご協力いただけると嬉しいです。</p>
          <p className="text-sm text-red-500 mt-1">レビュー投稿で次回500円OFFクーポンをプレゼント</p>
          <p className="text-sm text-blue-600 mt-1">[レビューを書くボタン]</p>
        </div>

        <Callout type="point" title="「30秒で完了」が回答率を2倍にする">
          「レビューを書いてください」だけだと面倒に感じますが、「30秒で完了」「3つの質問に答えるだけ」と具体的な所要時間を示すことで、心理的ハードルが大きく下がります。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="incentive" className="text-xl font-bold text-gray-800">インセンティブ設計</h2>
        <ComparisonTable
          headers={["インセンティブ", "投稿率", "コスト", "推奨度"]}
          rows={[
            ["なし", "2〜5%", "0円", "低"],
            ["次回500円OFF", "10〜15%", "500円/件", "高"],
            ["送料無料クーポン", "8〜12%", "500〜800円/件", "高"],
            ["ポイント付与（500P）", "8〜10%", "500円相当/件", "中"],
            ["写真付きで追加500円OFF", "5〜8%", "1,000円/件", "UGC目的なら高"],
          ]}
        />

        <ResultCard before="インセンティブなし（投稿率3%）" after="500円OFFクーポン（投稿率13%）" metric="レビュー投稿率" description="インセンティブ付与で4.3倍に向上" />
      </section>

      <section>
        <h2 id="ugc-utilization" className="text-xl font-bold text-gray-800">レビューの活用方法</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>商品ページに表示</strong> — レビュー10件以上でCV率が18%向上するデータあり</li>
          <li><strong>LINE配信での活用</strong> — カゴ落ちリマインドやセグメント配信に高評価レビューを挿入</li>
          <li><strong>SNS・広告素材</strong> — 写真付きレビューをUGCとしてSNS投稿や広告クリエイティブに活用</li>
          <li><strong>商品改善</strong> — ネガティブレビューを分析し、商品・サービスの改善に活かす</li>
        </ul>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>
        <StatGrid stats={[
          { value: "3", unit: "倍", label: "レビュー投稿率の向上" },
          { value: "18%", unit: "UP", label: "商品ページのCV率向上" },
          { value: "4.3", unit: "/5", label: "平均レビュー評価" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>配達完了後にLINEでレビュー依頼</strong> — 自発的投稿の3〜5倍の回答率</li>
          <li><strong>商品カテゴリに応じたタイミング設定</strong> — 使用体験の直後が最も効果的</li>
          <li><strong>インセンティブ（500円OFF）で回答率4倍</strong> — コスト以上のCV率改善効果</li>
          <li><strong>発送通知と組み合わせて活用</strong> — <Link href="/ec/column/ec-shipping-notification-line-automation" className="text-blue-600 underline">発送通知の自動化</Link>で配達完了を検知し、<Link href="/ec/column/ec-repeat-purchase-scenario" className="text-blue-600 underline">リピート購入シナリオ</Link>と連動させて効果を最大化</li>
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
