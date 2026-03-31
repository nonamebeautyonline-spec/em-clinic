import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-rfm-analysis-line-segment")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "RFM分析とは何ですか？", a: "Recency（最終購入日）、Frequency（購入頻度）、Monetary（購入金額）の3つの指標で顧客を分類するマーケティング分析手法です。EC×LINE運用では、この分析結果に基づいてセグメント配信を設計します。" },
  { q: "RFM分析は何人以上の顧客データがあれば有効ですか？", a: "最低300人以上の購入顧客データがあれば基本的なRFM分析が可能です。1,000人以上になると4象限への分類がより精度高く行えます。" },
  { q: "RFM分析のスコアはどうやって計算しますか？", a: "各指標を5段階にスコアリングします。R: 直近購入日が近いほど高スコア、F: 購入回数が多いほど高スコア、M: 購入金額が大きいほど高スコア。3指標の組み合わせで顧客を分類します。" },
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
  "RFM分析の基本と4象限への顧客分類方法",
  "各象限に最適なLINE配信戦略の設計",
  "RFMスコアの自動計算とセグメント配信への接続方法",
];

const toc = [
  { id: "rfm-basics", label: "RFM分析の基本" },
  { id: "four-quadrants", label: "4象限の顧客分類" },
  { id: "quadrant-strategy", label: "象限別のLINE配信戦略" },
  { id: "scoring", label: "スコアリングの方法" },
  { id: "automation", label: "自動化のステップ" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="RFM分析×LINE" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">全顧客に同じメッセージを送る時代は終わりました。RFM分析で顧客を4象限に分類し、それぞれに最適なLINE配信を設計することで、<strong>売上を最大2倍</strong>に伸ばしたEC事業者の手法を紹介します。</p>

      <section>
        <h2 id="rfm-basics" className="text-xl font-bold text-gray-800">RFM分析の基本</h2>

        <ComparisonTable
          headers={["指標", "意味", "高スコアの意味"]}
          rows={[
            ["R（Recency）", "最終購入日からの経過日数", "最近購入している = アクティブ"],
            ["F（Frequency）", "一定期間内の購入回数", "何度も購入 = ロイヤル"],
            ["M（Monetary）", "累計購入金額", "高額購入 = 高価値"],
          ]}
        />

        <StatGrid stats={[
          { value: "R", label: "最終購入日（直近さ）" },
          { value: "F", label: "購入頻度（回数）" },
          { value: "M", label: "購入金額（累計額）" },
        ]} />
      </section>

      <section>
        <h2 id="four-quadrants" className="text-xl font-bold text-gray-800">4象限の顧客分類</h2>

        <ComparisonTable
          headers={["象限", "RFM特徴", "構成比", "優先度"]}
          rows={[
            ["優良顧客", "R高・F高・M高", "10〜15%", "最高（維持）"],
            ["成長顧客", "R高・F中〜低・M中", "20〜30%", "高（育成）"],
            ["新規顧客", "R高・F低・M低", "30〜40%", "高（転換）"],
            ["休眠顧客", "R低・F問わず・M問わず", "20〜30%", "中（復帰）"],
          ]}
        />

        <BarChart
          data={[
            { label: "優良顧客", value: 45, color: "#22c55e" },
            { label: "成長顧客", value: 30, color: "#3b82f6" },
            { label: "新規顧客", value: 15, color: "#f59e0b" },
            { label: "休眠顧客", value: 10, color: "#ef4444" },
          ]}
          unit="%（売上構成比）"
        />

        <Callout type="point" title="10%の優良顧客が売上の45%を生む">
          典型的なECサイトでは、全体の10〜15%の優良顧客が売上の40〜50%を生み出しています。この層の維持と成長顧客のランクアップが売上成長の鍵です。
        </Callout>
      </section>

      <section>
        <h2 id="quadrant-strategy" className="text-xl font-bold text-gray-800">象限別のLINE配信戦略</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">優良顧客（R高・F高・M高）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>VIP限定先行セール</strong> — 一般公開前に先行アクセス権を提供</li>
          <li><strong>限定商品の案内</strong> — 数量限定品をVIP優先で案内</li>
          <li><strong>アンバサダー制度</strong> — レビュー・SNS投稿を依頼し、UGC獲得</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成長顧客（R高・F中〜低・M中）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>ランクアップ促進</strong> — 「あと○○円でゴールドランク」と通知</li>
          <li><strong>クロスセル提案</strong> — 購入カテゴリの関連商品を提案</li>
          <li><strong>まとめ買い促進</strong> — 「3点以上で10%OFF」クーポン</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">新規顧客（R高・F低・M低）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>F2転換シナリオ</strong> — 使い方ガイド→レビュー依頼→2回目クーポン</li>
          <li><strong>ブランドストーリー</strong> — ブランドの理念・こだわりを伝え、ファン化を促進</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">休眠顧客（R低）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>段階的復帰シナリオ</strong> — 新商品紹介→復帰クーポン→最終案内</li>
          <li><strong>特別オファー</strong> — 通常より高い割引率で復帰を促す</li>
        </ul>
      </section>

      <InlineCTA />

      <section>
        <h2 id="scoring" className="text-xl font-bold text-gray-800">スコアリングの方法</h2>

        <ComparisonTable
          headers={["スコア", "R（最終購入）", "F（購入回数）", "M（累計金額）"]}
          rows={[
            ["5", "7日以内", "10回以上", "10万円以上"],
            ["4", "8〜30日", "5〜9回", "5〜10万円"],
            ["3", "31〜60日", "3〜4回", "2〜5万円"],
            ["2", "61〜90日", "2回", "1〜2万円"],
            ["1", "91日以上", "1回", "1万円未満"],
          ]}
        />

        <Callout type="point" title="業態に合わせてスコア基準を調整">
          上記は一般的なECサイトの基準です。高単価商品（家具・家電）は購入頻度が低いため、Fのスコア基準を緩めに設定する必要があります。自社の購買データを分析し、各スコアの分布が偏りすぎないよう調整しましょう。
        </Callout>
      </section>

      <section>
        <h2 id="automation" className="text-xl font-bold text-gray-800">自動化のステップ</h2>

        <FlowSteps steps={[
          { title: "購買データの自動取得", desc: "ECカートからAPI経由で注文データを自動取得し、RFMスコアを日次で更新" },
          { title: "セグメントの自動分類", desc: "RFMスコアの変動に応じて顧客セグメントを自動更新" },
          { title: "配信の自動トリガー", desc: "セグメント移動（例: 成長→休眠予備軍）をトリガーにLINE配信を自動実行" },
          { title: "効果の自動計測", desc: "セグメント別の開封率・CV率・売上をダッシュボードで自動集計" },
        ]} />
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <ResultCard before="一斉配信のみ" after="RFMセグメント配信" metric="LINE経由月間売上" description="150万円→280万円（1.9倍）に向上" />

        <StatGrid stats={[
          { value: "1.9", unit: "倍", label: "LINE経由売上の向上" },
          { value: "45%", unit: "削減", label: "ブロック率の改善" },
          { value: "3.5", unit: "倍", label: "配信あたりCV率の向上" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>RFM分析で顧客を4象限に分類</strong> — 優良・成長・新規・休眠の特性に合わせた施策設計</li>
          <li><strong>象限別にLINE配信戦略を設計</strong> — 各象限の目的（維持・育成・転換・復帰）に応じた最適なメッセージ</li>
          <li><strong>スコアリングと配信を自動化</strong> — 日次更新で常に最新のセグメントに基づいた配信を実現</li>
          <li><strong>CRM全体戦略は</strong><Link href="/ec/column/ec-line-crm-strategy" className="text-blue-600 underline">D2CのLINE CRM戦略</Link>で、顧客ランク制度は<Link href="/ec/column/ec-customer-rank-line-notification" className="text-blue-600 underline">顧客ランク制度の設計</Link>で詳しく解説</li>
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
