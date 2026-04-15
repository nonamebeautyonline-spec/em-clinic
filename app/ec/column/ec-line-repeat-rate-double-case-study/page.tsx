import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-repeat-rate-double-case-study")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "リピート率を2倍にするのにどのくらいの期間がかかりますか？", a: "F2転換シナリオの効果は導入1ヶ月後から現れ始めます。セグメント配信+シナリオ配信の本格運用で3〜6ヶ月後にリピート率2倍を達成するのが一般的なタイムラインです。" },
  { q: "セグメント配信に切り替えるだけでリピート率は上がりますか？", a: "一斉配信からセグメント配信に切り替えるだけでも、リピート率は平均30〜50%改善します。ただし、2倍を達成するにはシナリオ配信（F2転換・再購入リマインド・クロスセル）の組み合わせが必要です。" },
  { q: "最もリピート率に影響する施策は何ですか？", a: "F2転換シナリオ（初回→2回目購入促進）が最も影響が大きいです。F2転換率が25%→42%に向上するだけで、全体のリピート率が1.5倍になります。2回目購入した顧客の継続率は3倍です。" },
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
  "セグメント配信とシナリオ配信でリピート率を2倍にした実例",
  "F2転換シナリオの具体的な設計プロセス",
  "効果測定の方法と再現可能なポイント",
];

const toc = [
  { id: "challenge", label: "リピート率の課題" },
  { id: "strategy", label: "リピート率2倍の戦略" },
  { id: "f2-scenario", label: "F2転換シナリオの事例" },
  { id: "segment-case", label: "セグメント配信の事例" },
  { id: "cross-sell-case", label: "クロスセルシナリオの事例" },
  { id: "measurement", label: "効果測定" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="リピート率2倍事例" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">ECサイトの初回購入者の<strong>60%</strong>が2回目の購入に至りません。LINEのセグメント配信とシナリオ配信を組み合わせ、リピート率を<strong>2倍</strong>に引き上げたEC事業者の施策と成果を詳しく紹介します。</p>

      <section>
        <h2 id="challenge" className="text-xl font-bold text-gray-800">リピート率の課題</h2>
        <BarChart
          data={[
            { label: "1回で離脱", value: 60, color: "#ef4444" },
            { label: "2回目購入", value: 22, color: "#f59e0b" },
            { label: "3回以上購入", value: 18, color: "#22c55e" },
          ]}
          unit="%（EC顧客の購入回数分布）"
        />

        <StatGrid stats={[
          { value: "60%", label: "1回で離脱する顧客の割合" },
          { value: "5", unit: "倍", label: "新規獲得 vs リピーター維持のコスト差" },
          { value: "1.7", unit: "倍", label: "リピーターの客単価は新規の1.7倍" },
        ]} />
      </section>

      <section>
        <h2 id="strategy" className="text-xl font-bold text-gray-800">リピート率2倍の戦略</h2>
        <FlowSteps steps={[
          { title: "F2転換シナリオの構築", desc: "初回購入者の2回目購入を促進するシナリオ配信を設計" },
          { title: "セグメント配信への切り替え", desc: "一斉配信からRFMベースのセグメント配信に全面移行" },
          { title: "クロスセルシナリオの追加", desc: "購入商品に基づく関連商品提案を自動化" },
          { title: "効果測定と改善", desc: "セグメント別リピート率を週次で計測し、A/Bテストで改善" },
        ]} />
      </section>

      <section>
        <h2 id="f2-scenario" className="text-xl font-bold text-gray-800">F2転換シナリオの事例</h2>
        <p>化粧品D2C（月商500万円）の事例です。</p>
        <FlowSteps steps={[
          { title: "配達翌日: 使い方ガイド動画", desc: "正しい使い方を動画で解説。商品の効果を最大化するコツを紹介" },
          { title: "配達3日後: 使用感アンケート", desc: "「使い心地はいかがですか？」3問の簡単なアンケートで顧客の声を収集" },
          { title: "配達7日後: 他のお客様の声", desc: "同商品のレビュー・ビフォーアフターを紹介。社会的証明で効果を実感" },
          { title: "配達14日後: 2回目クーポン", desc: "「リピーター限定10%OFF」クーポン + 関連商品の紹介" },
        ]} />

        <ResultCard before="F2転換率 25%" after="F2転換率 42%" metric="初回→2回目の購入率" description="F2転換シナリオで1.7倍に改善" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="segment-case" className="text-xl font-bold text-gray-800">セグメント配信の事例</h2>
        <p>アパレルEC（月商800万円）の事例です。</p>
        <ComparisonTable
          headers={["セグメント", "配信内容", "リピート率（改善前→後）"]}
          rows={[
            ["VIP（上位10%）", "先行セール・限定品", "55%→65%"],
            ["リピーター", "コーデ提案・ランクアップ案内", "35%→48%"],
            ["新規（1回購入）", "使い方ガイド・2回目クーポン", "18%→35%"],
            ["休眠（90日以上）", "復帰クーポン・新商品案内", "3%→12%"],
          ]}
        />
      </section>

      <section>
        <h2 id="cross-sell-case" className="text-xl font-bold text-gray-800">クロスセルシナリオの事例</h2>
        <ComparisonTable
          headers={["購入商品", "提案商品", "追加購入率"]}
          rows={[
            ["化粧水", "乳液・美容液", "18%"],
            ["シャンプー", "トリートメント", "22%"],
            ["コーヒー豆", "ドリッパー・カップ", "15%"],
            ["プロテイン", "シェイカー・サプリ", "25%"],
          ]}
        />

        <StatGrid stats={[
          { value: "20%", unit: "平均", label: "クロスセルの追加購入率" },
          { value: "25%", unit: "UP", label: "客単価の向上" },
        ]} />
      </section>

      <section>
        <h2 id="measurement" className="text-xl font-bold text-gray-800">効果測定</h2>
        <ComparisonTable
          headers={["KPI", "施策前", "施策後", "改善率"]}
          rows={[
            ["全体リピート率", "22%", "45%", "2.0倍"],
            ["F2転換率", "25%", "42%", "1.7倍"],
            ["平均客単価", "4,500円", "5,600円", "+24%"],
            ["LINE経由月間売上", "80万円", "190万円", "2.4倍"],
            ["ブロック率", "4.5%", "1.8%", "60%削減"],
          ]}
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>F2転換が最重要施策</strong> — 2回目購入の促進がリピート率全体を引き上げる。シナリオ設計は<Link href="/ec/column/ec-repeat-purchase-scenario" className="text-blue-600 underline">リピート購入シナリオ</Link>で詳しく解説</li>
          <li><strong>セグメント配信でブロック率を抑えながら効果を最大化</strong> — <Link href="/ec/column/ec-segment-delivery-purchase-data" className="text-blue-600 underline">セグメント配信</Link>が鍵</li>
          <li><strong>クロスセルで客単価25%向上</strong> — 購入商品に基づく関連提案が効果的</li>
          <li><strong>3〜6ヶ月でリピート率2倍は再現可能</strong> — まずはF2転換シナリオから始めましょう</li>
        </ol>
      </section>

      <p className="text-xs text-gray-400 mt-8 mb-2">※本記事の事例は、複数の導入実績をもとに再構成したものです。実際の効果はご利用状況により異なります。</p>

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
