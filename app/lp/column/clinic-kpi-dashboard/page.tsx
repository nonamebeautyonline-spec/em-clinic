import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, BarChart, FlowSteps, ComparisonTable, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[15];

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
  dateModified: self.date,
  image: `${SITE_URL}/lp/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "クリニック経営に必要な7つのKPIと具体的な目標値の設定方法",
  "LINEダッシュボードを活用したリアルタイムデータの可視化手法",
  "週次レビューで経営改善サイクルを回すための実践的フレームワーク",
];

const toc = [
  { id: "why-kpi", label: "なぜクリニック経営にKPI管理が必要か" },
  { id: "kpi-1", label: "KPI 1: 新患数（月次・チャネル別）" },
  { id: "kpi-2", label: "KPI 2: リピート率（再診率・来院頻度）" },
  { id: "kpi-3", label: "KPI 3: 患者LTV（生涯価値）" },
  { id: "kpi-4", label: "KPI 4: 予約充填率と無断キャンセル率" },
  { id: "kpi-5", label: "KPI 5: LINE友だち数と増加ペース" },
  { id: "kpi-6", label: "KPI 6: メッセージ開封率・クリック率" },
  { id: "kpi-7", label: "KPI 7: 売上推移と客単価" },
  { id: "dashboard", label: "ダッシュボードの活用方法（週次レビュー）" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="経営KPI" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="why-kpi" className="text-xl font-bold text-gray-800">なぜクリニック経営にKPI管理が必要か</h2>
        <Callout type="warning" title="感覚ベースの経営判断は危険">
          <p>「なんとなく患者が減った気がする」「忙しいのに利益が出ていない」 — 多くのクリニックが感覚ベースで経営判断を行っていますが、感覚と実際の数値には大きなギャップがあります。</p>
        </Callout>
        <p>適切なKPI（Key Performance Indicator = 重要業績評価指標）を設定して定期的にモニタリングすることが、経営改善の第一歩です。特にクリニック経営では、<strong>新患獲得・リピート維持・収益最大化</strong>の3つの軸でKPIを設計することが重要です。</p>
        <ResultCard before="感覚ベースの経営" after="データドリブン経営" metric="売上 15〜25% 改善" description="KPI管理を始めたクリニックの平均的な6ヶ月以内の改善幅" />
      </section>

      <section>
        <h2 id="kpi-1" className="text-xl font-bold text-gray-800">KPI 1: 新患数（月次・チャネル別）</h2>
        <p>新患数はクリニック経営の成長を示す最も基本的な指標です。月次の総数だけでなく、<strong>チャネル別（LINE経由・Web予約・電話・紹介・広告別）</strong>に分解して管理することが重要です。</p>
        <h3 className="text-lg font-semibold text-gray-700 mt-4">目標値の設定方法</h3>
        <FlowSteps steps={[
          { title: "ベースライン算出", desc: "現状の新患数を3ヶ月平均で算出する" },
          { title: "月次目標を設定", desc: "月5〜10%増を目標に（年間で60〜120%増のペース）" },
          { title: "チャネル別CPA管理", desc: "獲得単価を合わせて管理し、費用対効果の高いチャネルに投資を集中" },
        ]} />
        <Callout type="point" title="LINE活用のポイント">
          <p>LINE友だち追加時にアンケートで「来院のきっかけ」を自動取得することで、チャネル別の集計が自動化されます。広告経由のLINE友だち追加にはUTMパラメータを付与し、広告効果の正確な計測も可能です。</p>
        </Callout>
      </section>

      <section>
        <h2 id="kpi-2" className="text-xl font-bold text-gray-800">KPI 2: リピート率（再診率・来院頻度）</h2>
        <p>新患を獲得するコストは、既存患者にリピートしてもらうコストの<strong>5〜10倍</strong>と言われています。リピート率の改善は、最も投資効率の高い経営改善施策です。</p>
        <StatGrid stats={[
          { value: "60", unit: "%以上", label: "再診率の目標" },
          { value: "20", unit: "%以下", label: "離脱率の目標" },
          { value: "5〜10", unit: "倍", label: "新患獲得 vs リピートのコスト差" },
        ]} />
        <h3 className="text-lg font-semibold text-gray-700 mt-4">改善アクション</h3>
        <p>LINEのセグメント配信を活用し、最終来院日から一定期間経過した患者に自動でフォローメッセージを送信します。</p>
        <ResultCard before="再診率 45%" after="再診率 70%" metric="+25pt 改善" description="LINEフォローメッセージ導入による再診率の変化" />
      </section>

      <section>
        <h2 id="kpi-3" className="text-xl font-bold text-gray-800">KPI 3: 患者LTV（生涯価値）</h2>
        <p>患者LTV（Lifetime Value = 生涯価値）は、1人の患者がクリニックにもたらす総収益を示す指標です。</p>
        <Callout type="info" title="LTVの算出式">
          <p><strong>LTV = 平均客単価 x 平均来院回数 x 平均通院期間</strong></p>
          <p>LTVを把握することで、1人の新患獲得にいくらまで投資できるかが明確になり、マーケティング予算の最適化が可能になります。</p>
        </Callout>
        <h3 className="text-lg font-semibold text-gray-700 mt-4">LTV向上の施策</h3>
        <FlowSteps steps={[
          { title: "来院回数の増加", desc: "定期検診リマインド、フォローアップメッセージの自動化" },
          { title: "客単価の向上", desc: "関連施術・オプションメニューのLINE配信でクロスセル" },
          { title: "通院期間の延長", desc: "治療計画の共有と進捗管理をLINE上で実施" },
        ]} />
        <Callout type="success" title="LINE経由患者のLTVは1.5倍">
          <p>自費診療を行う美容クリニックでは、LINE経由で獲得した患者のLTVは他チャネル経由と比較して平均1.5倍高いという調査結果があります。</p>
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="kpi-4" className="text-xl font-bold text-gray-800">KPI 4: 予約充填率と無断キャンセル率</h2>
        <p>予約枠がどれだけ埋まっているか（充填率）と、予約したのに連絡なく来院しなかった割合（無断キャンセル率）は、クリニックの稼働効率を直接示す重要指標です。</p>
        <StatGrid stats={[
          { value: "85〜95", unit: "%", label: "予約充填率の理想値" },
          { value: "3", unit: "%以下", label: "無断キャンセル率の目標" },
          { value: "5〜10", unit: "%", label: "業界平均キャンセル率" },
        ]} />
        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINEで実現する改善策</h3>
        <FlowSteps steps={[
          { title: "前日リマインド配信", desc: "LINEで予約前日にリマインドを自動送信し、無断キャンセルを大幅削減" },
          { title: "変更・キャンセルボタン", desc: "メッセージ内に設置し、患者が気軽にリスケできる導線を用意" },
          { title: "キャンセル待ち自動通知", desc: "キャンセル発生時にキャンセル待ちの患者に自動通知し、空き枠の稼働率を最大化" },
        ]} />
      </section>

      <section>
        <h2 id="kpi-5" className="text-xl font-bold text-gray-800">KPI 5: LINE友だち数と増加ペース</h2>
        <p>LINE友だち数は、クリニックが保有する「直接リーチ可能な患者基盤」の規模を示します。友だち数の絶対値だけでなく、<strong>増加ペースとブロック率</strong>を合わせて管理することが重要です。</p>
        <StatGrid stats={[
          { value: "15", unit: "%以下", label: "ブロック率の目標" },
          { value: "2〜3", unit: "倍", label: "インセンティブ設定時の追加率向上" },
          { value: "30", unit: "日以内", label: "アクティブ友だちの開封基準" },
        ]} />
        <h3 className="text-lg font-semibold text-gray-700 mt-4">友だち数を増やす施策</h3>
        <Callout type="point" title="追加率を2〜3倍にするコツ">
          <p>院内のポスター・受付・診察室にQRコードを設置するのは基本。加えて「LINE友だち追加で初回1,000円OFF」などのインセンティブを設定しましょう。Webサイトにもフローティングバナーを設置し、オンラインからの流入も獲得できます。</p>
        </Callout>
      </section>

      <section>
        <h2 id="kpi-6" className="text-xl font-bold text-gray-800">KPI 6: メッセージ開封率・クリック率</h2>
        <p>LINEメッセージの開封率とクリック率は、配信コンテンツの質を測る指標です。いくら友だち数が多くても、メッセージが読まれなければ意味がありません。</p>
        <BarChart data={[
          { label: "LINE開封率", value: 70, color: "#06C755" },
          { label: "メール開封率", value: 20, color: "#94a3b8" },
          { label: "LINEクリック率", value: 20, color: "#06C755" },
          { label: "メールクリック率", value: 3, color: "#94a3b8" },
        ]} unit="%" />
        <h3 className="text-lg font-semibold text-gray-700 mt-4">改善のポイント</h3>
        <ComparisonTable
          headers={["施策", "主婦層", "ビジネスパーソン"]}
          rows={[
            ["最適な配信時間帯", "10〜14時", "18〜20時"],
            ["効果的なメッセージ形式", "リッチメッセージ", "カードタイプメッセージ"],
            ["ブロック抑制策", "セグメント配信で関心のある情報のみ配信", "セグメント配信で関心のある情報のみ配信"],
          ]}
        />
      </section>

      <section>
        <h2 id="kpi-7" className="text-xl font-bold text-gray-800">KPI 7: 売上推移と客単価</h2>
        <p>最終的に経営の成否を判断するのは売上です。月次の売上推移に加えて、<strong>客単価の変動</strong>を追跡することで、売上変動の要因を特定できます。</p>
        <Callout type="info" title="売上の分解式">
          <p><strong>売上 = 患者数 x 客単価 x 来院頻度</strong></p>
          <p>売上が下がった場合、どの要素が低下しているのかを特定し、的確な対策を打つことが重要です。</p>
        </Callout>
        <ComparisonTable
          headers={["低下要素", "原因", "対策"]}
          rows={[
            ["患者数が減少", "集患力の低下", "LINE広告、友だち追加キャンペーン"],
            ["客単価が低下", "メニュー構成の問題", "追加施術の提案方法改善"],
            ["来院頻度が低下", "フォロー不足", "リマインド配信・フォローアップ最適化"],
          ]}
        />
      </section>

      <section>
        <h2 id="dashboard" className="text-xl font-bold text-gray-800">ダッシュボードの活用方法（週次レビュー）</h2>
        <p>KPIは設定するだけでは意味がありません。<strong>週次でレビューし、改善アクションにつなげる</strong>ことが重要です。</p>
        <h3 className="text-lg font-semibold text-gray-700 mt-4">週次レビューの進め方</h3>
        <FlowSteps steps={[
          { title: "毎週月曜にダッシュボード確認", desc: "先週の各KPIの実績と目標との差分を把握する" },
          { title: "異常値をピックアップ", desc: "目標から10%以上乖離している指標に注目する" },
          { title: "原因を分析", desc: "外的要因（天候・競合）と内的要因（施策・オペレーション）に分けて特定" },
          { title: "改善アクションを決定", desc: "翌週に実施する具体的なアクションを1〜2つ決め、担当者とスケジュールを明確化" },
          { title: "効果を振り返り", desc: "前週のアクションの効果を検証し、PDCAサイクルを回す" },
        ]} />
        <Callout type="success" title="Lオペ for CLINICのダッシュボード">
          <p>7つのKPIをワンクリックで確認でき、LINE友だち数・メッセージ開封率・予約数・決済データが自動集計されます。Excel管理やデータの手動集計は一切不要。スタッフ全員がリアルタイムで経営状況を把握できます。</p>
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: KPI管理でデータドリブンなクリニック経営を</h2>
        <FlowSteps steps={[
          { title: "7つのKPIを設定", desc: "現状値を把握し、まずベースラインを知ることが出発点" },
          { title: "ダッシュボードで見える化", desc: "手動集計ではなくリアルタイムで確認できる仕組みを導入" },
          { title: "週次レビューで改善サイクル", desc: "数値に基づいた意思決定を習慣化する" },
        ]} />
        <p className="mt-4">Lオペ for CLINICは、LINE公式アカウントの運用データとクリニックの経営データを統合し、これらのKPIを一元管理できるプラットフォームです。データドリブンなクリニック経営を始めてみませんか？</p>
      </section>
    </ArticleLayout>
  );
}
