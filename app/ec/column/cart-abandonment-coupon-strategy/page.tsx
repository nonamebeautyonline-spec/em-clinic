import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "cart-abandonment-coupon-strategy")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "カゴ落ちクーポンの最適な割引率は？", a: "一般的に5〜10%が最もバランスが良いとされています。5%未満だと効果が薄く、15%以上だと利益を大きく圧迫します。粗利率50%以上の商品なら10%、粗利率30%前後なら5%が目安です。" },
  { q: "クーポンを毎回のカゴ落ちに付けるべきですか？", a: "いいえ、毎回クーポンを付けると「待てばクーポンがもらえる」と学習され、意図的なカゴ落ちが増加します。3回目のリマインドのみクーポンを付け、1回目・2回目はクーポンなしで回収を狙いましょう。" },
  { q: "カゴ落ちクーポンの有効期限はどのくらいが適切ですか？", a: "48時間が最も効果的です。24時間だと短すぎて使えない人が出て、72時間以上だと緊急性が薄れます。「48時間限定」と明記することで、回収率が10〜15%向上します。" },
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
  "割引率5〜10%が最適バランス — 粗利率に応じた設計方法",
  "クーポン付きは3回目リマインドのみ — 意図的カゴ落ちを防ぐ",
  "有効期限48時間がベスト — 緊急性と利便性のバランス",
];

const toc = [
  { id: "should-use-coupon", label: "カゴ落ちにクーポンは必要か" },
  { id: "optimal-discount", label: "最適な割引率の設計" },
  { id: "timing", label: "クーポンを出すタイミング" },
  { id: "expiry", label: "有効期限の設定" },
  { id: "types", label: "クーポンの種類と使い分け" },
  { id: "profit-protection", label: "利益を守るためのルール" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="クーポン戦略" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">カゴ落ちリマインドにクーポンを付けると回収率は<strong>5〜8%上乗せ</strong>されますが、安易な割引は利益を大きく圧迫します。本記事では、利益を守りながら回収率を最大化するクーポン戦略を、実際のデータとともに解説します。</p>

      <section>
        <h2 id="should-use-coupon" className="text-xl font-bold text-gray-800">カゴ落ちにクーポンは必要か</h2>

        <ComparisonTable
          headers={["リマインド方式", "回収率", "利益率への影響"]}
          rows={[
            ["クーポンなし（3回リマインド）", "15〜18%", "影響なし"],
            ["全リマインドにクーポン付き", "22〜28%", "利益率5〜10%低下"],
            ["3回目のみクーポン付き", "20〜25%", "利益率2〜3%低下"],
          ]}
        />

        <Callout type="point" title="3回目のみクーポンが最適解">
          全リマインドにクーポンを付けると回収率は上がりますが、利益率を大きく圧迫します。1回目・2回目はクーポンなしで回収できる層を取り、3回目のみクーポンで最後の一押しをするのがベストバランスです。
        </Callout>
      </section>

      <section>
        <h2 id="optimal-discount" className="text-xl font-bold text-gray-800">最適な割引率の設計</h2>

        <BarChart
          data={[
            { label: "3%OFF", value: 3, color: "#ef4444" },
            { label: "5%OFF", value: 6, color: "#f59e0b" },
            { label: "10%OFF", value: 8, color: "#22c55e" },
            { label: "15%OFF", value: 9, color: "#3b82f6" },
            { label: "20%OFF", value: 9.5, color: "#8b5cf6" },
          ]}
          unit="%（クーポンによる追加回収率）"
        />

        <p>データが示す通り、10%を超えると回収率の伸びが鈍化します。つまり、10%OFFが「効果とコストのバランス」が最も良いポイントです。</p>

        <ComparisonTable
          headers={["粗利率", "推奨割引率", "理由"]}
          rows={[
            ["60%以上", "10%OFF", "十分な利益確保が可能"],
            ["40〜60%", "5〜8%OFF", "利益と回収率のバランス"],
            ["30〜40%", "5%OFF or 送料無料", "% OFF より送料無料が効果的"],
            ["30%未満", "送料無料 or ポイント付与", "割引は利益を圧迫するため非推奨"],
          ]}
        />

        <ResultCard before="一律15%OFFクーポン" after="粗利率に応じた最適割引" metric="クーポン回収の利益率" description="回収額は微減だが、利益率が15%改善" />
      </section>

      <section>
        <h2 id="timing" className="text-xl font-bold text-gray-800">クーポンを出すタイミング</h2>

        <FlowSteps steps={[
          { title: "1回目（1h後）: クーポンなし", desc: "ソフトリマインドのみ。この段階で全回収の40〜50%を回収" },
          { title: "2回目（24h後）: クーポンなし", desc: "在庫残少・レビュー訴求で緊急性を演出。25〜30%を回収" },
          { title: "3回目（72h後）: クーポン付き", desc: "48時間限定クーポンで最後の一押し。残り20〜25%を回収" },
        ]} />

        <Callout type="warning" title="初回からクーポンを出さない理由">
          初回からクーポンを出すと、顧客が「カゴに入れて放置すれば割引がもらえる」と学習します。実際に、初回クーポン方式のECサイトでは意図的カゴ落ちが20〜30%増加したというデータがあります。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="expiry" className="text-xl font-bold text-gray-800">有効期限の設定</h2>

        <BarChart
          data={[
            { label: "24時間", value: 55, color: "#f59e0b" },
            { label: "48時間", value: 75, color: "#22c55e" },
            { label: "72時間", value: 65, color: "#3b82f6" },
            { label: "7日間", value: 45, color: "#8b5cf6" },
            { label: "期限なし", value: 30, color: "#ef4444" },
          ]}
          unit="%（クーポン利用率・相対値）"
        />

        <p><strong>48時間</strong>が最も利用率が高いです。24時間は「使い忘れ」が多く、72時間以上は「後でいいや」と先延ばしが増加します。</p>
      </section>

      <section>
        <h2 id="types" className="text-xl font-bold text-gray-800">クーポンの種類と使い分け</h2>

        <ComparisonTable
          headers={["クーポン種類", "効果", "適した商品"]}
          rows={[
            ["%OFF（5〜10%）", "最もわかりやすい", "全般"],
            ["定額割引（500〜1,000円）", "低単価商品でお得感大", "3,000〜5,000円の商品"],
            ["送料無料", "送料がネックの層に効果的", "小型・軽量商品"],
            ["ポイント付与（2倍）", "利益を直接圧迫しない", "リピート率を高めたい商品"],
            ["おまけ・サンプル", "新商品の試用機会を提供", "化粧品・食品"],
          ]}
        />
      </section>

      <section>
        <h2 id="profit-protection" className="text-xl font-bold text-gray-800">利益を守るためのルール</h2>

        <FlowSteps steps={[
          { title: "ルール1: クーポン対象を限定", desc: "セール商品・低粗利商品はクーポン対象外にする。既に割引されている商品への二重割引を防止" },
          { title: "ルール2: 利用回数を制限", desc: "1人1回限り・カゴ落ち3回目のみに限定。同一顧客への乱発を防止" },
          { title: "ルール3: 最低購入金額を設定", desc: "「5,000円以上で10%OFF」のように最低購入金額を設定し、客単価の維持を図る" },
          { title: "ルール4: 月次でROIを検証", desc: "クーポンによる追加売上 vs 割引コストを月次で計測。利益率が下がりすぎていないか確認" },
        ]} />

        <StatGrid stats={[
          { value: "48", unit: "時間", label: "最適な有効期限" },
          { value: "5〜10%", label: "最適な割引率" },
          { value: "3回目", unit: "のみ", label: "クーポン付与タイミング" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>クーポンは3回目リマインドのみ</strong> — 初回からの提供は意図的カゴ落ちを誘発する</li>
          <li><strong>割引率は5〜10%が最適</strong> — 粗利率に応じて調整し、利益を守る</li>
          <li><strong>有効期限は48時間</strong> — 緊急性と利便性のベストバランス</li>
          <li><strong>利益率の月次検証が必須</strong> — カゴ落ちの全体戦略は<Link href="/ec/column/line-cart-abandonment-recovery-guide" className="text-blue-600 underline">カゴ落ち回収ガイド</Link>を、配信タイミングは<Link href="/ec/column/optimal-cart-reminder-timing" className="text-blue-600 underline">最適タイミング記事</Link>も合わせてご確認ください</li>
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
