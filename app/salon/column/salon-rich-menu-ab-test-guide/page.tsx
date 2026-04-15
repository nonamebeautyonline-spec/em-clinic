import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ResultCard, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-rich-menu-ab-test-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "A/Bテストに必要な友だち数は？", a: "統計的に有意な結果を得るには、各パターンに最低100人ずつ、合計200人以上の友だち数が必要です。友だち数が少ない場合は、テスト期間を2〜4週間に延長して十分なデータを蓄積しましょう。" },
  { q: "テストする変数は一度に何個まで？", a: "必ず1つずつテストしてください。例えば「ボタン配置」をテストするなら、色やテキストは同じにします。複数変数を同時に変えると、どの変更が効果を生んだか判別できません。" },
  { q: "A/Bテストの結果はどう判断すべきですか？", a: "クリック率の差が5%以上あれば有意な差と判断できます。2〜3%の差であれば誤差の可能性があるため、テスト期間を延長するか、サンプル数を増やして再テストしましょう。" },
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
  "リッチメニューのA/Bテストの設計方法と実施手順",
  "テストすべき5つの変数と優先順位",
  "テスト結果の分析方法と改善サイクルの回し方",
];

const toc = [
  { id: "why-ab-test", label: "A/Bテストが必要な理由" },
  { id: "variables", label: "テストすべき5つの変数" },
  { id: "how-to", label: "A/Bテストの実施手順" },
  { id: "analysis", label: "結果の分析方法" },
  { id: "case-study", label: "改善事例" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="リッチメニューA/Bテスト" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「リッチメニューを作ったけど、本当にこの配置がベストなのか？」——その疑問を解消するのが<strong>A/Bテスト</strong>です。2パターンのメニューを比較して、クリック率・予約率を数値で検証する方法を解説します。</p>

      <section>
        <h2 id="why-ab-test" className="text-xl font-bold text-gray-800">A/Bテストが必要な理由</h2>

        <StatGrid stats={[
          { value: "30%", label: "A/Bテストで改善できるクリック率の幅" },
          { value: "2週間", label: "テストに必要な最低期間" },
          { value: "200人", label: "テストに必要な最低友だち数" },
        ]} />

        <p>感覚でデザインを決めるのではなく、データに基づいて最適化する。A/Bテストを繰り返すことで、リッチメニューの予約転換率を継続的に改善できます。</p>
      </section>

      <section>
        <h2 id="variables" className="text-xl font-bold text-gray-800">テストすべき5つの変数</h2>

        <ComparisonTable
          headers={["優先順位", "テスト変数", "効果の大きさ"]}
          rows={[
            ["1", "ボタン配置の順序", "大（クリック率20〜30%改善）"],
            ["2", "ボタンのラベルテキスト", "大（「予約」vs「今すぐ予約」等）"],
            ["3", "色・デザイン", "中（ブランド色 vs アクセント色）"],
            ["4", "レイアウト（分割数）", "中（6分割 vs 4分割）"],
            ["5", "画像の有無・種類", "小〜中"],
          ]}
        />

        <Callout type="point" title="ボタン配置から始める">
          最も効果が大きいのはボタン配置の変更です。「予約」ボタンを左上→中央上に移動するだけでクリック率が20%変わるケースもあります。まずここからテストしましょう。
        </Callout>
      </section>

      <section>
        <h2 id="how-to" className="text-xl font-bold text-gray-800">A/Bテストの実施手順</h2>

        <FlowSteps steps={[
          { title: "仮説を立てる", desc: "「予約ボタンを左上に配置した方がクリック率が高いのでは？」と具体的な仮説を設定" },
          { title: "2パターンを作成", desc: "変更する変数は1つだけ。A案（現行）とB案（変更版）を用意" },
          { title: "友だちをランダムに振り分け", desc: "友だちを50:50でランダムに振り分け、それぞれにA案・B案を表示" },
          { title: "2週間以上のデータを蓄積", desc: "曜日の偏りを排除するため、最低2週間はテストを継続" },
          { title: "結果を分析し、勝者を全体適用", desc: "クリック率・予約転換率を比較。5%以上の差があれば勝者パターンを採用" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="analysis" className="text-xl font-bold text-gray-800">結果の分析方法</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">見るべき指標</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>ボタン別クリック率</strong> — どのボタンが最もタップされているか</li>
          <li><strong>予約転換率</strong> — クリック後に実際に予約まで完了した割合</li>
          <li><strong>クーポン利用率</strong> — クーポンボタンのクリック→利用の転換率</li>
        </ul>

        <BarChart
          data={[
            { label: "A案：予約ボタン左上", value: 35, color: "#22c55e" },
            { label: "B案：予約ボタン中央", value: 28, color: "#3b82f6" },
          ]}
          unit="%"
        />
      </section>

      <section>
        <h2 id="case-study" className="text-xl font-bold text-gray-800">改善事例</h2>

        <ResultCard before="18%（初期デザイン）" after="32%（A/Bテスト3回後）" metric="リッチメニュー経由の予約率" description="3ヶ月間で3回のA/Bテストを実施し、段階的に改善" />

        <p>リッチメニューの基本設計は<Link href="/salon/column/salon-rich-menu-design-guide" className="text-blue-600 underline">リッチメニューの作り方</Link>、業態別テンプレートは<Link href="/salon/column/salon-rich-menu-templates-by-industry" className="text-blue-600 underline">業態別テンプレート</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>A/Bテストで感覚をデータに置き換える</strong> — クリック率30%改善も可能</li>
          <li><strong>変数は1つずつテスト</strong> — ボタン配置→ラベル→色の順に優先</li>
          <li><strong>最低2週間、友だち200人以上で実施</strong> — 統計的に有意な結果を得る</li>
          <li><strong>テスト→改善→テストのサイクルを回す</strong> — 3回のテストで大幅な改善が期待</li>
        </ol>
        <p className="mt-4">Lオペ for SALONでは、リッチメニューを定期的に変更し、反応率を比較することでA/Bテストが可能です。</p>
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
