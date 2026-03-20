import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-line-analytics")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: self.title,
  description: self.description,
  datePublished: self.date,
  dateModified: self.updatedDate || self.date,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "LINE配信で計測すべき5つの指標（開封率・クリック率・CV率・ブロック率・ROI）",
  "ABテスト設計の基本と実践的な運用方法",
  "配信ROIの算出方法と投資判断の基準",
  "PDCAサイクルで配信効果を継続的に改善する方法",
];

const toc = [
  { id: "metrics", label: "測定すべき5つの指標" },
  { id: "ab-test", label: "ABテストの設計と実践" },
  { id: "roi", label: "配信ROIの算出方法" },
  { id: "pdca", label: "改善PDCAサイクル" },
  { id: "dashboard", label: "ダッシュボードの活用" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE配信を「送りっぱなし」にしていませんか？ 効果測定なしの配信は、患者のブロックを招くだけでなく、通数課金の無駄遣いにもつながります。本記事では、開封率・CV率・ROIの計測から<strong>ABテストによる継続的な改善</strong>まで、データドリブンなLINE運用の実践方法を解説します。</p>

      {/* ── 指標 ── */}
      <section>
        <h2 id="metrics" className="text-xl font-bold text-gray-800">測定すべき5つの指標</h2>
        <p>LINE配信の効果を正しく把握するために、以下の5つの指標を継続的に計測しましょう。</p>

        <FlowSteps steps={[
          { title: "開封率（到達率）", desc: "配信メッセージがどれだけ開封されたか。クリニックLINEの平均開封率は70〜85%。60%を下回る場合は配信頻度や内容の見直しが必要。" },
          { title: "クリック率（CTR）", desc: "メッセージ内のリンクがクリックされた割合。予約リンクのCTRが10%以上あれば良好。リッチメッセージの活用でCTRは2〜3倍に向上。" },
          { title: "予約CV率", desc: "クリックから実際の予約完了に至った割合。導線の最適化で5〜15%が目安。低い場合は予約フォームのUI改善が必要。" },
          { title: "ブロック率", desc: "配信後にブロックされた割合。1回の配信で0.5%以上のブロックが発生する場合は配信内容や頻度に問題あり。" },
          { title: "配信ROI", desc: "配信にかかったコスト（通数課金＋運用工数）に対する売上増加の比率。月次で算出し、投資判断の基準にする。" },
        ]} />

        <StatGrid stats={[
          { value: "78", unit: "%", label: "平均開封率" },
          { value: "12", unit: "%", label: "平均CTR" },
          { value: "8", unit: "%", label: "平均CV率" },
          { value: "0.3", unit: "%", label: "平均ブロック率" },
        ]} />

        <p>これらの指標を一元管理する方法は<Link href="/lp/column/clinic-kpi-dashboard" className="text-sky-600 underline hover:text-sky-800">LINEダッシュボードで見るべきKPI7選</Link>で詳しく解説しています。</p>
      </section>

      {/* ── ABテスト ── */}
      <section>
        <h2 id="ab-test" className="text-xl font-bold text-gray-800">ABテストの設計と実践</h2>
        <p>「どんなメッセージが効果的か」を感覚ではなくデータで判断するために、ABテストは不可欠です。クリニックのLINE配信で特に効果が大きいテスト項目を紹介します。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>配信タイトル（1行目）のテスト</strong>：「定期検診のご案内」vs「前回の検査から3ヶ月が経ちました」のように、事務的な表現 vs パーソナルな表現を比較。パーソナルな方が開封率15〜20%高い傾向。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>配信時間のテスト</strong>：午前9時 vs 午後7時 vs 土曜午前など、ターゲット層の生活リズムに合わせてテスト。働き世代は19〜21時、シニア層は9〜11時の反応が良い傾向。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>メッセージ形式のテスト</strong>：テキストのみ vs リッチメッセージ（画像付き）vs カルーセル。リッチメッセージはテキストのみと比較してCTRが2.5倍に。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><span><strong>CTA（行動喚起）のテスト</strong>：「ご予約はこちら」vs「今すぐ空き状況を確認」vs「LINEで30秒で予約完了」。具体的なベネフィットを含むCTAが高いCV率。</span></li>
        </ul>

        <Callout type="info" title="ABテストの鉄則：1回につき1要素だけ変える">
          タイトルと画像を同時に変えると、どちらが効果に影響したか判別できません。必ず1回のテストで変更する要素は1つだけにし、配信対象を均等に2グループに分けて比較します。
        </Callout>
      </section>

      {/* ── ROI ── */}
      <section>
        <h2 id="roi" className="text-xl font-bold text-gray-800">配信ROIの算出方法</h2>
        <p>LINE配信の投資対効果を経営判断に活用するために、ROIを定量的に算出する方法を解説します。</p>

        <FlowSteps steps={[
          { title: "コストの算出", desc: "月額利用料 + 通数課金（1通あたり約3〜5円）+ 運用工数（時給換算）。例：月額5万円 + 通数2万円 + 運用10時間×2,000円 = 月9万円。" },
          { title: "売上増加の算出", desc: "LINE経由の予約数 × 平均診療単価を計算。リマインド配信による無断キャンセル削減分も売上として加算。" },
          { title: "ROIの計算", desc: "ROI(%) = (売上増加 - コスト) ÷ コスト × 100。例：LINE経由売上50万円、コスト9万円の場合、ROI = 456%。" },
        ]} />

        <ResultCard
          before="月間コスト 9万円（配信費+運用工数）"
          after="月間売上増加 50万円（LINE経由予約+キャンセル削減）"
          metric="ROI 456% — 投資の4.5倍のリターン"
          description="配信の効果測定を行うことで、投資判断に自信が持てるようになる"
        />

        <p>LINE導入のROI算出方法をさらに詳しく知りたい方は<Link href="/lp/column/clinic-line-roi" className="text-sky-600 underline hover:text-sky-800">LINE公式アカウント導入ROIの計算方法</Link>もご覧ください。</p>
      </section>

      <InlineCTA />

      {/* ── PDCA ── */}
      <section>
        <h2 id="pdca" className="text-xl font-bold text-gray-800">改善PDCAサイクル</h2>
        <p>効果測定は「計測して終わり」ではなく、改善のPDCAサイクルを継続的に回すことが重要です。</p>

        <FlowSteps steps={[
          { title: "Plan: 仮説を立てる", desc: "「再診リマインドの開封率が低いのは、配信タイミングが合っていないのではないか」のように、データから仮説を立案。" },
          { title: "Do: ABテストを実施", desc: "仮説に基づいてABテストを設計・実行。2週間〜1ヶ月のテスト期間を確保し、十分なサンプル数を集める。" },
          { title: "Check: 結果を分析", desc: "テスト結果を数値で比較。統計的に有意な差があるかを確認し、勝ちパターンを特定。" },
          { title: "Act: 標準化と次のテスト", desc: "効果があった施策を全配信に適用。同時に次の改善テーマを設定し、サイクルを継続。" },
        ]} />

        <Callout type="info" title="月1回の振り返りミーティングを習慣化">
          院長とスタッフで月1回、LINE配信の数値を振り返るミーティングを設定しましょう。15分程度で十分です。「先月の開封率は○%、予約CV率は○%。今月はタイトルのABテストを実施する」というシンプルな確認で改善が加速します。
        </Callout>
      </section>

      {/* ── ダッシュボード ── */}
      <section>
        <h2 id="dashboard" className="text-xl font-bold text-gray-800">ダッシュボードの活用</h2>
        <p>効果測定を効率的に行うには、主要指標を一画面で確認できるダッシュボードが不可欠です。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>配信パフォーマンス</strong>：直近の配信ごとの開封率・CTR・CV率を一覧表示。トレンドグラフで推移を確認。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>セグメント別分析</strong>：初診・再診・休眠患者など、セグメントごとの反応率を比較。最も効果が高いセグメントにリソースを集中。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>ABテスト結果</strong>：テストの勝敗と改善幅を記録。過去のテスト履歴から「勝ちパターン」のナレッジを蓄積。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><span><strong>コスト・ROI推移</strong>：月次の配信コストとROIの推移をグラフ化。投資効率が下がっている場合はアラート表示。</span></li>
        </ul>

        <p>セグメント配信の設計方法と合わせて活用することで、より精度の高い改善が可能です。詳しくは<Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信でリピート率を向上させる方法</Link>をご覧ください。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="LINE配信効果測定のポイント">
          <ul className="mt-1 space-y-1">
            <li>開封率・CTR・CV率・ブロック率・ROIの5指標を継続計測</li>
            <li>ABテストは「1回1要素」の原則を守り、データで勝ちパターンを特定</li>
            <li>ROIを定量算出し、配信投資の判断基準を明確に</li>
            <li>月1回のPDCA振り返りで、配信効果を継続的に改善</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、配信分析ダッシュボード・ABテスト機能・ROI自動算出を<Link href="/lp/features" className="text-sky-600 underline hover:text-sky-800">標準搭載</Link>したクリニック専用LINE運用プラットフォームです。データに基づいた配信最適化で、通数コストの無駄をなくし、売上最大化を支援します。</p>
      </section>
    </ArticleLayout>
  );
}
