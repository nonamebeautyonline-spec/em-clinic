import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ComparisonTable,
  BarChart,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-official-account-pricing-plan-comparison")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "無料プランでもLINE公式アカウントの主要機能は使えますか？", a: "はい、コミュニケーションプランでもリッチメニュー・自動応答・チャット・ショップカードなど主要機能はすべて利用可能です。制限があるのは月間のメッセージ配信数（200通まで）のみです。" },
  { q: "プランの変更はいつでもできますか？", a: "はい、プランの変更は管理画面からいつでも可能です。アップグレードは即日反映され、ダウングレードは翌月から適用されます。配信状況に応じて柔軟にプランを変更できます。" },
  { q: "追加メッセージ料金はどのように計算されますか？", a: "スタンダードプランでは月間30,000通を超えた分に対し、1通あたり約3円の追加料金が発生します。ライトプランでは追加メッセージの購入はできないため、上限に達すると配信が停止します。" },
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
  "コミュニケーション・ライト・スタンダードの3プランを徹底比較",
  "友だち数別の最適プラン選びと配信コストシミュレーション",
  "2024年の料金改定で変わったポイントを解説",
];

const toc = [
  { id: "plan-overview", label: "料金プランの全体像" },
  { id: "plan-comparison", label: "3プラン詳細比較" },
  { id: "cost-simulation", label: "配信コストシミュレーション" },
  { id: "plan-selection", label: "友だち数別おすすめプラン" },
  { id: "price-revision", label: "2024年料金改定の変更点" },
  { id: "cost-reduction", label: "配信コストを抑えるテクニック" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE公式アカウント入門" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントの料金プランは2024年に改定され、<strong>コミュニケーション・ライト・スタンダード</strong>の3プラン構成になりました。本記事では各プランの機能差・配信通数・費用対効果を徹底比較し、<strong>友だち数や配信頻度に応じた最適なプラン選び</strong>を解説します。</p>

      {/* ── 全体像 ── */}
      <section>
        <h2 id="plan-overview" className="text-xl font-bold text-gray-800">料金プランの全体像</h2>
        <p>LINE公式アカウントは<strong>無料から始められ</strong>、ビジネスの成長に合わせてプランをアップグレードする構成になっています。すべてのプランで主要機能（リッチメニュー・自動応答・チャット等）が利用可能です。</p>

        <StatGrid stats={[
          { value: "0", unit: "円", label: "コミュニケーションプラン" },
          { value: "5,000", unit: "円/月", label: "ライトプラン" },
          { value: "15,000", unit: "円/月", label: "スタンダードプラン" },
          { value: "200〜", unit: "通/月", label: "無料メッセージ通数" },
        ]} />
      </section>

      {/* ── 3プラン比較 ── */}
      <section>
        <h2 id="plan-comparison" className="text-xl font-bold text-gray-800">3プラン詳細比較</h2>

        <ComparisonTable
          headers={["比較項目", "コミュニケーション", "ライト", "スタンダード"]}
          rows={[
            ["月額固定費", "0円", "5,000円", "15,000円"],
            ["無料メッセージ通数", "200通/月", "5,000通/月", "30,000通/月"],
            ["追加メッセージ", "不可", "不可", "〜3円/通"],
            ["リッチメニュー", true, true, true],
            ["自動応答", true, true, true],
            ["チャット（1:1）", true, true, true],
            ["ショップカード", true, true, true],
            ["クーポン", true, true, true],
            ["分析・統計", "基本", "詳細", "詳細"],
          ]}
        />

        <Callout type="info" title="機能差はほとんどない">
          3プランの違いは主に「配信できるメッセージ通数」です。機能面ではほぼ同等のため、配信量に応じたプラン選びが重要になります。
        </Callout>
      </section>

      {/* ── コストシミュレーション ── */}
      <section>
        <h2 id="cost-simulation" className="text-xl font-bold text-gray-800">配信コストシミュレーション</h2>
        <p>友だち数と月間配信回数から、必要なメッセージ通数と最適プランを算出できます。</p>

        <BarChart
          data={[
            { label: "友だち100人×月4回", value: 400, color: "#22c55e" },
            { label: "友だち500人×月4回", value: 2000, color: "#3b82f6" },
            { label: "友だち1,000人×月4回", value: 4000, color: "#f59e0b" },
            { label: "友だち5,000人×月4回", value: 20000, color: "#ef4444" },
          ]}
          unit="通/月"
        />

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>友だち100人 × 月4回配信 = 400通</strong>: ライトプランで十分（月5,000円）</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>友だち500人 × 月4回配信 = 2,000通</strong>: ライトプランの範囲内（月5,000円）</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>友だち1,000人 × 月4回配信 = 4,000通</strong>: ライトプランの範囲内だが余裕なし</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>友だち5,000人 × 月4回配信 = 20,000通</strong>: スタンダードプラン必須（月15,000円）</li>
        </ul>

        <Callout type="point" title="1通あたりの単価で比較">
          ライトプラン: 5,000円 ÷ 5,000通 = 1円/通。スタンダードプラン: 15,000円 ÷ 30,000通 = 0.5円/通。配信量が多いほどスタンダードプランが割安になります。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── 友だち数別おすすめ ── */}
      <section>
        <h2 id="plan-selection" className="text-xl font-bold text-gray-800">友だち数別おすすめプラン</h2>

        <FlowSteps steps={[
          { title: "〜200人: コミュニケーション（無料）", desc: "開設直後はまず無料プランで運用を開始。月1回の配信であれば200人まで対応可能。友だち集めに集中しましょう。" },
          { title: "200〜1,000人: ライト（5,000円/月）", desc: "友だちが増え始めたらライトプランに移行。月5,000通で週1回配信なら約1,250人までカバーできます。" },
          { title: "1,000人〜: スタンダード（15,000円/月）", desc: "本格運用フェーズではスタンダードプランが最適。30,000通で週1回配信なら約7,500人まで対応。追加メッセージ購入も可能です。" },
        ]} />
      </section>

      {/* ── 料金改定 ── */}
      <section>
        <h2 id="price-revision" className="text-xl font-bold text-gray-800">2024年料金改定の変更点</h2>
        <p>2024年6月の料金改定で、従来の「フリープラン」が「コミュニケーションプラン」に名称変更されるとともに、無料メッセージ通数が1,000通→200通に削減されました。</p>

        <ComparisonTable
          headers={["変更項目", "改定前", "改定後"]}
          rows={[
            ["無料プラン名称", "フリープラン", "コミュニケーションプラン"],
            ["無料メッセージ通数", "1,000通", "200通"],
            ["ライトプラン月額", "5,000円", "5,000円（変更なし）"],
            ["ライトプラン通数", "15,000通", "5,000通"],
            ["スタンダード月額", "15,000円", "15,000円（変更なし）"],
            ["スタンダード通数", "45,000通", "30,000通"],
          ]}
        />

        <Callout type="warning" title="通数削減の影響に注意">
          特にライトプランの通数が15,000通→5,000通と大幅に削減されています。以前のプランで運用していた場合、配信計画の見直しが必要です。
        </Callout>
      </section>

      {/* ── コスト削減 ── */}
      <section>
        <h2 id="cost-reduction" className="text-xl font-bold text-gray-800">配信コストを抑えるテクニック</h2>
        <p>配信通数を効率化することで、低コストで高い効果を実現できます。セグメント配信の詳細は<Link href="/line/column/line-segment-delivery-design-guide" className="text-sky-600 underline hover:text-sky-800">セグメント配信設計ガイド</Link>をご覧ください。</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>セグメント配信の活用</strong> — 全員に送るのではなく、興味のある層だけに配信することで通数を節約</li>
          <li><strong>リッチメニューの活用</strong> — 配信せずとも情報提供できるため通数を消費しない</li>
          <li><strong>自動応答の最適化</strong> — よくある質問は自動応答で対応し、個別対応の通数を削減</li>
          <li><strong>配信頻度の最適化</strong> — 週1回の質の高い配信が、毎日の配信より効果的なケースが多い</li>
        </ul>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="料金プラン選びのポイント">
          <ul className="mt-1 space-y-1">
            <li>・まずは無料のコミュニケーションプランで始める</li>
            <li>・友だち200人超でライトプラン（月5,000円）に移行</li>
            <li>・友だち1,000人超でスタンダードプラン（月15,000円）が最適</li>
            <li>・セグメント配信で配信通数を最適化し、コストを抑える</li>
          </ul>
        </Callout>

        <p>料金プランは後からいつでも変更可能なので、まずは無料で始めて運用実績を積みましょう。アカウントの作り方は<Link href="/line/column/how-to-create-line-official-account-2026" className="text-sky-600 underline hover:text-sky-800">LINE公式アカウントの作り方完全ガイド</Link>を、拡張ツールの導入を検討している方は<Link href="/line/column/line-extension-tool-comparison-2026" className="text-sky-600 underline hover:text-sky-800">LINE拡張ツール比較2026年版</Link>も参考にしてください。</p>
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
