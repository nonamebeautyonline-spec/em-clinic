import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-roi-measurement")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE経由の売上はどうやって正確に計測しますか？", a: "UTMパラメータをLINE配信のリンクに付与し、Google Analytics等で計測します。utm_source=line, utm_medium=message, utm_campaign=配信名を設定することで、LINE経由の流入・購入を正確にトラッキングできます。" },
  { q: "LINE運用のROIが合わない場合の対処法は？", a: "まずカゴ落ちリマインドの回収率を確認してください。これが15%未満なら配信タイミングやメッセージの改善が必要です。次にセグメント配信のCV率を確認し、一斉配信からの切り替えを検討しましょう。" },
  { q: "LINE運用のROIはどのくらいが目標ですか？", a: "LINE運用のROI（投資対効果）は最低300%（3倍）を目標にしましょう。カゴ落ちリマインド単体でROI 500〜1000%、セグメント配信で300〜500%が一般的な水準です。" },
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
  "LINE経由売上の正確な計測方法（UTMパラメータ設定）",
  "施策別ROIの算出方法と目標値",
  "投資対効果を可視化するダッシュボード設計",
];

const toc = [
  { id: "why-roi", label: "ROI測定が重要な理由" },
  { id: "measurement-setup", label: "計測の準備" },
  { id: "attribution", label: "アトリビューション分析" },
  { id: "roi-by-tactic", label: "施策別ROIの算出" },
  { id: "dashboard", label: "ダッシュボード設計" },
  { id: "optimization", label: "ROIの改善方法" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ROI測定" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「LINE運用にいくら投資して、いくら売上が上がったのか」を正確に把握できていますか？ ROI測定なしのLINE運用は改善の方向性が定まりません。本記事では、LINE経由売上の正確な計測方法と施策別のROI算出・可視化の方法を解説します。</p>

      <section>
        <h2 id="why-roi" className="text-xl font-bold text-gray-800">ROI測定が重要な理由</h2>
        <StatGrid stats={[
          { value: "73%", label: "ROIを計測していないEC事業者" },
          { value: "2.5", unit: "倍", label: "計測している事業者の売上成長率" },
          { value: "300%", unit: "以上", label: "LINE運用の目標ROI" },
        ]} />

        <p>ROIを計測していないEC事業者は73%に上ります。一方で、ROIを正確に計測し施策を最適化している事業者は、そうでない事業者と比べて2.5倍の売上成長率を実現しています。</p>
      </section>

      <section>
        <h2 id="measurement-setup" className="text-xl font-bold text-gray-800">計測の準備</h2>
        <FlowSteps steps={[
          { title: "UTMパラメータの設定", desc: "全てのLINE配信リンクにUTMパラメータを付与。配信施策ごとにcampaignを分ける" },
          { title: "GA4のコンバージョン設定", desc: "ECサイトの購入完了をコンバージョンイベントとして設定" },
          { title: "ECカートの売上データ連携", desc: "LINE IDとECの注文データを紐づけ、LINE経由の正確な売上を算出" },
          { title: "コスト計測の準備", desc: "LINE配信コスト + ツール利用料 + 運用工数を月次で集計" },
        ]} />
      </section>

      <section>
        <h2 id="attribution" className="text-xl font-bold text-gray-800">アトリビューション分析</h2>
        <ComparisonTable
          headers={["アトリビューションモデル", "概要", "適したケース"]}
          rows={[
            ["ラストクリック", "最後にクリックしたチャネルに売上を帰属", "シンプルな計測が必要な初期段階"],
            ["ファーストクリック", "最初にクリックしたチャネルに帰属", "認知施策の評価"],
            ["線形", "全チャネルに均等配分", "複数チャネルの貢献を均等に評価"],
            ["データドリブン", "AIが各チャネルの貢献度を算出", "GA4を活用した高度な分析"],
          ]}
        />

        <Callout type="point" title="まずはラストクリックから始める">
          初めてROI計測に取り組む場合、ラストクリックモデルでLINE経由の直接売上を把握することから始めましょう。データが蓄積されたらデータドリブンモデルに移行するのがおすすめです。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="roi-by-tactic" className="text-xl font-bold text-gray-800">施策別ROIの算出</h2>
        <ComparisonTable
          headers={["施策", "投資コスト", "回収売上", "ROI"]}
          rows={[
            ["カゴ落ちリマインド", "月2〜3万円", "月30〜80万円", "1,000〜2,500%"],
            ["発送通知自動化", "月1〜2万円", "問い合わせ削減で月5〜10万円相当", "300〜500%"],
            ["セグメント配信", "月3〜5万円", "月20〜50万円", "400〜1,000%"],
            ["リピート促進シナリオ", "月2〜3万円", "月15〜40万円", "500〜1,300%"],
            ["休眠復帰キャンペーン", "月1〜2万円", "月5〜15万円", "300〜750%"],
          ]}
        />

        <ResultCard before="ROI未計測" after="施策別ROI計測導入" metric="LINE運用の月間売上" description="改善施策の優先順位が明確化し、売上1.5倍に" />
      </section>

      <section>
        <h2 id="dashboard" className="text-xl font-bold text-gray-800">ダッシュボード設計</h2>
        <ComparisonTable
          headers={["指標", "更新頻度", "目標値"]}
          rows={[
            ["LINE経由売上", "日次", "月商の10〜20%"],
            ["カゴ落ち回収率", "日次", "15%以上"],
            ["配信別CV率", "配信ごと", "2%以上"],
            ["月間ROI", "月次", "300%以上"],
            ["ブロック率", "週次", "月2%以下"],
          ]}
        />
        <p>KPI設計の詳細は<Link href="/ec/column/ec-line-kpi-dashboard-design" className="text-blue-600 underline">EC×LINE運用のKPI設計</Link>で解説しています。</p>
      </section>

      <section>
        <h2 id="optimization" className="text-xl font-bold text-gray-800">ROIの改善方法</h2>
        <FlowSteps steps={[
          { title: "ROIが高い施策に予算を集中", desc: "カゴ落ちリマインドのROIが最も高い場合、配信精度と到達率の向上に投資" },
          { title: "ROIが低い施策を改善or停止", desc: "CV率が低い配信はA/Bテストで改善。改善不可なら停止" },
          { title: "コスト効率の改善", desc: "セグメント精度を上げて配信通数を最適化。不要な配信を削減" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>UTMパラメータでLINE経由売上を正確に計測</strong> — 全配信リンクに付与</li>
          <li><strong>施策別にROIを算出し優先順位を明確化</strong> — カゴ落ちリマインドが最もROIが高い</li>
          <li><strong>ダッシュボードで日次モニタリング</strong> — 異常値の早期検知と迅速な改善</li>
          <li><strong>A/Bテストで継続的にROI改善</strong> — <Link href="/ec/column/ec-line-ab-test-best-practices" className="text-blue-600 underline">A/Bテスト実践ガイド</Link>でテスト方法を詳しく解説</li>
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
