import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-block-rate-reduction")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "サロンのLINEブロック率の目安は？", a: "サロン業界の平均ブロック率は20〜30%です。10%以下であれば優秀、15%以下であれば良好と判断できます。30%を超えている場合は配信内容や頻度の見直しが必要です。" },
  { q: "ブロックされた友だちは復活できますか？", a: "ブロック解除はお客様自身の操作が必要なため、こちらからは復活できません。そのため、ブロック「される前に」防ぐことが最も重要です。来店時に「最近LINE通知多かったですか？」とさりげなく聞くのも有効です。" },
  { q: "配信通数を抑えるとブロック率は下がりますか？", a: "はい、月5回以上の配信はブロック率が急上昇します。月2〜4回に抑えることで、ブロック率を10%以下に維持できます。ただし通数だけでなく、コンテンツの質と関連性も同様に重要です。" },
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
  "ブロック率を下げるための7つの具体的な施策",
  "配信頻度・コンテンツ・タイミングの最適化",
  "ブロックされやすいNG配信パターンの回避",
];

const toc = [
  { id: "block-impact", label: "ブロック率がサロンに与える影響" },
  { id: "seven-methods", label: "ブロック率を下げる7つの方法" },
  { id: "ng-patterns", label: "ブロックされやすいNGパターン" },
  { id: "monitoring", label: "ブロック率のモニタリング" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ブロック率を下げる7つの方法" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントのブロック率が<strong>30%</strong>を超えているなら、配信設計の見直しが急務です。ブロック1件は「二度と届かなくなるお客様」を意味します。本記事では、ブロック率を下げる7つの具体的な方法を解説します。</p>

      <section>
        <h2 id="block-impact" className="text-xl font-bold text-gray-800">ブロック率がサロンに与える影響</h2>

        <StatGrid stats={[
          { value: "20〜30%", label: "サロン業界の平均ブロック率" },
          { value: "300〜500円", label: "友だち1人あたりの月間売上貢献額" },
          { value: "月15万円", label: "ブロック率30%のサロン（友だち1000人）の機会損失" },
        ]} />

        <Callout type="warning" title="ブロックは不可逆">
          一度ブロックされると、こちらからメッセージを届ける手段がなくなります。友だち集めにかけたコストと労力がすべて無駄になるため、ブロック「予防」が最重要です。
        </Callout>
      </section>

      <section>
        <h2 id="seven-methods" className="text-xl font-bold text-gray-800">ブロック率を下げる7つの方法</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 配信頻度を月2〜4回に抑える</h3>
        <p>月5回以上の配信はブロック率が急上昇します。月2〜4回を上限とし、質の高いコンテンツに集中しましょう。</p>

        <BarChart
          data={[
            { label: "月1〜2回", value: 5, color: "#22c55e" },
            { label: "月3〜4回", value: 10, color: "#3b82f6" },
            { label: "月5〜6回", value: 22, color: "#f59e0b" },
            { label: "月7回以上", value: 35, color: "#ef4444" },
          ]}
          unit="%"
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. セグメント配信に切り替える</h3>
        <p>全員に同じ内容を送る一斉配信をやめ、来店回数・メニュー別に配信を分けます。「自分に関係ある情報」はブロックされにくくなります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. 情報7割、販促3割のバランス</h3>
        <p>毎回クーポンだけ送っていると「広告アカウント」と認識されます。ヘアケア情報・トレンド紹介・Q&Aなど、お役立ちコンテンツを中心に配信しましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">4. あいさつメッセージを最適化</h3>
        <p>友だち追加直後のメッセージが「売り込み」にならないよう注意。お礼→メリット提示→次のアクション案内の流れで、3吹き出し以内に収めます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">5. 配信時間を最適化</h3>
        <p>深夜・早朝の配信は強い不快感を与えます。平日12時台か20時台に配信するのがベストです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">6. 吹き出し数を2つまでに制限</h3>
        <p>1回の配信で3つ以上の吹き出しを送ると通知が多く感じられ、ブロックの原因になります。テキスト＋画像の2吹き出しが最適です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">7. 配信解除の選択肢を用意</h3>
        <p>「配信頻度を減らす」選択肢をリッチメニュー等に用意します。ブロックされるよりも、配信頻度を下げてつながりを維持する方が長期的に価値があります。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="ng-patterns" className="text-xl font-bold text-gray-800">ブロックされやすいNGパターン</h2>

        <ComparisonTable
          headers={["NGパターン", "ブロックリスク", "改善方法"]}
          rows={[
            ["毎日配信", "非常に高い", "月2〜4回に削減"],
            ["クーポンだけの配信", "高い", "情報コンテンツを混ぜる"],
            ["深夜・早朝配信", "高い", "12時台か20時台に変更"],
            ["全員に同じ内容", "中程度", "セグメント配信に切り替え"],
            ["長文メッセージ", "中程度", "200文字以内に簡潔化"],
          ]}
        />
      </section>

      <section>
        <h2 id="monitoring" className="text-xl font-bold text-gray-800">ブロック率のモニタリング</h2>

        <FlowSteps steps={[
          { title: "週次で確認", desc: "管理画面の統計から友だち数とブロック数の推移を確認" },
          { title: "配信後24時間のブロック数", desc: "配信直後のブロック数が5人以上なら配信内容を見直す" },
          { title: "月次レポート", desc: "月間のブロック率・ブロック数を記録し、改善傾向を確認" },
        ]} />

        <ResultCard before="28%（対策前）" after="8%（7つの施策実施後）" metric="ブロック率" description="配信設計の見直しで大幅に改善" />

        <p className="mt-4">KPI管理の詳細は<Link href="/salon/column/salon-repeat-rate-kpi-management" className="text-blue-600 underline">リピート率KPI管理ガイド</Link>、開封率の改善は<Link href="/salon/column/salon-line-open-rate-improvement" className="text-blue-600 underline">開封率を上げるテクニック</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>配信頻度は月2〜4回が最適</strong> — 5回以上はブロック率急上昇</li>
          <li><strong>セグメント配信で「自分ごと」にする</strong> — 関連性の高い情報は受け入れられやすい</li>
          <li><strong>情報7割・販促3割</strong> — クーポンだけの配信は避ける</li>
          <li><strong>配信時間・吹き出し数・文章量を最適化</strong> — 細部が積み重なってブロック率に影響</li>
          <li><strong>配信解除の選択肢を用意</strong> — ブロックよりも頻度減の方が双方にメリット</li>
        </ol>
        <p className="mt-4">Lオペ for SALONでは、ダッシュボードでブロック率を確認し、配信内容の改善に活用できます。お客様との長期的な関係を守ります。</p>
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
