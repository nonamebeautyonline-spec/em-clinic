import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-ab-test-best-practices")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "A/Bテストに最低何人の配信先が必要ですか？", a: "統計的に有意な結果を得るには、各パターン最低200〜500人の配信先が必要です。友だち数が1,000人未満の場合は、A/Bテストより配信回数を重ねて傾向を把握する方法が現実的です。" },
  { q: "A/Bテストでは何を最初にテストすべきですか？", a: "最初にテストすべきは「メッセージの1行目（ファーストビュー）」です。開封後に最初に目に入るテキストがクリック率に最も大きな影響を与えます。次に画像の有無、クーポンの有無を順にテストしましょう。" },
  { q: "テスト結果の判定にはどのくらいの期間が必要ですか？", a: "LINEの場合、配信後24〜48時間で開封・クリックの大部分が完了します。CV（購入）まで含めると72時間後の時点で結果を判定するのが適切です。" },
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
  "A/Bテストの設計から実施・結果分析までの実践ガイド",
  "メッセージ・画像・タイミング・クーポンのテスト手法",
  "統計的有意性の判断方法と必要なサンプルサイズ",
];

const toc = [
  { id: "why-ab-test", label: "A/Bテストが必要な理由" },
  { id: "test-design", label: "テスト設計の基本" },
  { id: "test-targets", label: "テスト対象と優先順位" },
  { id: "implementation", label: "実施の手順" },
  { id: "analysis", label: "結果分析の方法" },
  { id: "case-studies", label: "テスト事例" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="A/Bテスト" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「この文面とあの文面、どちらが売れるか？」を勘ではなくデータで判断するのがA/Bテストです。LINE配信のA/Bテストで、カゴ落ち回収率を<strong>30%改善</strong>し、セグメント配信のCV率を<strong>2倍</strong>にした手法を解説します。</p>

      <section>
        <h2 id="why-ab-test" className="text-xl font-bold text-gray-800">A/Bテストが必要な理由</h2>
        <StatGrid stats={[
          { value: "30%", label: "A/Bテストによる改善幅（平均）" },
          { value: "2", unit: "倍", label: "テスト実施企業の効果差" },
          { value: "200", unit: "人〜", label: "テストに必要な最低配信数" },
        ]} />

        <p>LINE配信は「送ったら終わり」ではありません。A/Bテストで文面・画像・タイミングを継続的に改善することで、同じ友だち数でもCV率を大幅に向上させることができます。</p>
      </section>

      <section>
        <h2 id="test-design" className="text-xl font-bold text-gray-800">テスト設計の基本</h2>
        <FlowSteps steps={[
          { title: "仮説を立てる", desc: "「商品画像付きの方がクリック率が高い」など、検証可能な仮説を設定" },
          { title: "変数を1つに絞る", desc: "文面と画像を同時に変えると何が効いたかわからない。テストは1変数ずつ" },
          { title: "サンプルサイズを確保", desc: "各パターン最低200人以上。有意差を出すには500人以上が理想" },
          { title: "ランダムに分配", desc: "属性の偏りをなくすため、ランダムにA/Bグループに分配" },
          { title: "十分な期間を置く", desc: "配信後72時間でCV含む結果を判定" },
        ]} />
      </section>

      <section>
        <h2 id="test-targets" className="text-xl font-bold text-gray-800">テスト対象と優先順位</h2>
        <ComparisonTable
          headers={["テスト対象", "影響度", "優先順位"]}
          rows={[
            ["メッセージの1行目", "開封率・クリック率に大きく影響", "1位"],
            ["商品画像の有無", "クリック率に2.5倍の差", "2位"],
            ["CTAボタンの文言", "クリック率に20〜40%の差", "3位"],
            ["配信タイミング", "開封率に30%の差", "4位"],
            ["クーポンの有無", "CV率に50%の差", "5位"],
            ["クーポン割引率", "CV率に20%の差", "6位"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="implementation" className="text-xl font-bold text-gray-800">実施の手順</h2>
        <FlowSteps steps={[
          { title: "テストプランの作成", desc: "仮説・変数・成功指標・サンプルサイズ・判定期間を文書化" },
          { title: "パターンA/Bの作成", desc: "1変数のみ異なる2パターンを作成。それ以外の条件は完全に同一" },
          { title: "配信の実行", desc: "対象者をランダムに分割し、同タイミングで配信" },
          { title: "72時間後に結果判定", desc: "開封率・クリック率・CV率を集計。統計的有意差を確認" },
          { title: "勝ちパターンの全体適用", desc: "結果が良かったパターンを今後の配信のデフォルトに" },
        ]} />
      </section>

      <section>
        <h2 id="analysis" className="text-xl font-bold text-gray-800">結果分析の方法</h2>
        <Callout type="point" title="統計的有意差の判断基準">
          A/Bの差が「たまたま」でないことを確認するため、信頼度95%以上（p値0.05未満）を基準にします。サンプルサイズが小さい場合は信頼度90%（p値0.1未満）でも参考になります。
        </Callout>

        <ComparisonTable
          headers={["判定結果", "対応"]}
          rows={[
            ["Aが有意に優秀", "Aを採用し、次のテスト変数に進む"],
            ["Bが有意に優秀", "Bを採用し、次のテスト変数に進む"],
            ["有意差なし", "サンプルサイズを増やして再テスト、または別の変数をテスト"],
          ]}
        />
      </section>

      <section>
        <h2 id="case-studies" className="text-xl font-bold text-gray-800">テスト事例</h2>
        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例1: カゴ落ちリマインドの文面テスト</h3>
        <ResultCard before="「お買い物をお忘れではないですか？」" after="「○○さん、カートの商品が残りわずかです」" metric="カゴ落ち回収率" description="18%→23%に改善（+28%）パーソナライズ+緊急性の勝利" />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">事例2: セグメント配信の画像テスト</h3>
        <ResultCard before="テキストのみの配信" after="商品カード画像付き配信" metric="クリック率" description="8%→20%に改善（2.5倍）視覚的訴求の効果" />

        <BarChart
          data={[
            { label: "メッセージ文面", value: 28, color: "#22c55e" },
            { label: "画像有無", value: 150, color: "#3b82f6" },
            { label: "配信時間帯", value: 32, color: "#f59e0b" },
            { label: "CTA文言", value: 22, color: "#8b5cf6" },
          ]}
          unit="%（A/Bテストによる平均改善率）"
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>A/Bテストで配信効果を科学的に改善</strong> — 勘ではなくデータで判断</li>
          <li><strong>変数は1つずつテスト</strong> — メッセージ1行目が最も影響度が高い</li>
          <li><strong>最低200人以上のサンプルサイズ</strong> — 統計的有意差を確保</li>
          <li><strong>ROI測定と組み合わせて効果を最大化</strong> — <Link href="/ec/column/ec-line-roi-measurement" className="text-blue-600 underline">ROI測定方法</Link>でテスト効果を数値化。KPI管理は<Link href="/ec/column/ec-line-kpi-dashboard-design" className="text-blue-600 underline">KPI設計</Link>も参照</li>
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
