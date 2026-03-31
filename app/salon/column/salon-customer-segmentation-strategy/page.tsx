import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ComparisonTable, BarChart, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-customer-segmentation-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "セグメント分けは何人から意味がありますか？", a: "友だち数50人以上からセグメント配信の効果が出始めます。最低でも「新規」「リピーター」の2セグメントは設定しておきましょう。100人を超えたら5セグメント以上に細分化するのが理想です。" },
  { q: "セグメントの見直しはどのくらいの頻度ですべき？", a: "3ヶ月に1回が目安です。各セグメントの人数バランス、配信への反応率、来店率を確認し、セグメントの基準を調整します。季節の変わり目に合わせて見直すと運用しやすいです。" },
  { q: "RFM分析は小規模サロンでも必要ですか？", a: "小規模サロンでは完全なRFM分析は不要です。「来店回数」と「最終来店日」の2軸だけでも十分に効果的なセグメントが作れます。スタッフ数が5人以下なら、シンプルなセグメント設計で運用負荷を抑えましょう。" },
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
  "来店回数・メニュー・頻度・担当の4軸でセグメントを設計",
  "セグメントごとの最適なアプローチ方法とメッセージ例",
  "一斉配信と比較して反応率を2〜3倍に高める方法",
];

const toc = [
  { id: "why-segment", label: "セグメント配信が必要な理由" },
  { id: "four-axes", label: "4つのセグメント軸" },
  { id: "approach", label: "セグメント別のアプローチ" },
  { id: "rfm", label: "サロン向けRFM分析" },
  { id: "results", label: "セグメント配信の効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="顧客セグメント設計" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">全員に同じメッセージを送る一斉配信は、お客様に「自分には関係ない」と思わせてしまいます。<strong>セグメント配信</strong>に切り替えるだけで反応率が<strong>2〜3倍</strong>に向上。その鍵となるセグメント設計を解説します。</p>

      <section>
        <h2 id="why-segment" className="text-xl font-bold text-gray-800">セグメント配信が必要な理由</h2>

        <StatGrid stats={[
          { value: "2〜3倍", label: "セグメント配信の反応率（一斉配信比）" },
          { value: "50%", unit: "減", label: "ブロック率の改善" },
          { value: "30%", unit: "減", label: "配信通数のコスト削減" },
        ]} />

        <Callout type="warning" title="一斉配信の問題点">
          初来店のお客様に「VIPメンバー限定」のメッセージが届いたり、ネイルのお客様にカラーリングの案内が届いたり。一斉配信はブロックの主因です。
        </Callout>
      </section>

      <section>
        <h2 id="four-axes" className="text-xl font-bold text-gray-800">4つのセグメント軸</h2>

        <ComparisonTable
          headers={["軸", "セグメント例", "活用シーン"]}
          rows={[
            ["来店回数", "新規/2回目/3〜5回/常連/VIP", "来店回数に応じたメッセージ分岐"],
            ["メニュー", "カット/カラー/ネイル/エステ", "メニュー別のアフターフォロー・提案"],
            ["来店頻度", "月1回/2ヶ月/3ヶ月/休眠", "リマインドのタイミング最適化"],
            ["担当スタッフ", "スタイリストA/B/C", "担当者指名のフォローアップ"],
          ]}
        />
      </section>

      <section>
        <h2 id="approach" className="text-xl font-bold text-gray-800">セグメント別のアプローチ</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">新規客（来店1回目）</h3>
        <p>目的は「2回目来店」。来店翌日のお礼→1週間後のケアアドバイス→3週間後の2回目クーポンが鉄板シナリオです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リピーター（2〜4回）</h3>
        <p>目的は「定着」。施術周期に合わせたリマインド＋メニューのクロスセル提案が効果的です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">常連客（5回以上）</h3>
        <p>目的は「ロイヤルティ強化」。VIP限定情報・先行案内・特別イベントへの招待で特別感を演出します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">休眠客（90日以上未来店）</h3>
        <p>目的は「再来店」。限定クーポン＋パーソナルメッセージで掘り起こし。詳細は<Link href="/salon/column/salon-dormant-customer-reactivation" className="text-blue-600 underline">休眠顧客の掘り起こし</Link>で解説しています。</p>

        <BarChart
          data={[
            { label: "新規→2回目", value: 45, color: "#22c55e" },
            { label: "リピーター定着", value: 70, color: "#3b82f6" },
            { label: "常連継続", value: 85, color: "#a855f7" },
            { label: "休眠再来店", value: 18, color: "#f59e0b" },
          ]}
          unit="%"
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="rfm" className="text-xl font-bold text-gray-800">サロン向けRFM分析</h2>
        <p>RFM分析は「Recency（最終来店日）」「Frequency（来店頻度）」「Monetary（累計売上）」の3軸で顧客を分類する手法です。</p>

        <ComparisonTable
          headers={["分類", "R（最終来店）", "F（来店回数）", "M（売上）", "対応"]}
          rows={[
            ["優良客", "30日以内", "5回以上", "高い", "VIP対応・口コミ依頼"],
            ["安定客", "60日以内", "3〜4回", "中程度", "クロスセル提案"],
            ["新規客", "30日以内", "1回", "低い", "2回目来店クーポン"],
            ["要注意客", "60〜90日", "2〜3回", "中程度", "リマインド強化"],
            ["休眠客", "90日以上", "—", "—", "掘り起こし施策"],
          ]}
        />

        <p className="mt-4">顧客管理の基盤構築は<Link href="/salon/column/salon-line-crm-setup-guide" className="text-blue-600 underline">LINE CRM構築ガイド</Link>、VIP顧客の管理方法は<Link href="/salon/column/salon-vip-customer-management" className="text-blue-600 underline">VIP顧客管理</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">セグメント配信の効果</h2>

        <ResultCard before="8%（一斉配信）" after="22%（セグメント配信）" metric="配信→来店の転換率" description="セグメント配信で約3倍に改善" />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>4軸（来店回数・メニュー・頻度・担当）でセグメント設計</strong></li>
          <li><strong>セグメントごとに配信目的を明確に</strong> — 2回目促進・定着・VIP強化・掘り起こし</li>
          <li><strong>一斉配信からの切り替えで反応率2〜3倍</strong> — ブロック率も50%改善</li>
          <li><strong>3ヶ月ごとにセグメントを見直し</strong> — 人数バランスと反応率を確認</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、来店履歴に基づく自動セグメント分類を搭載。タグ付けの手間なく、最適なセグメント配信を実現します。</p>
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
