import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA } from "../_components/article-layout";

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
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
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
        <h2 id="why-kpi" className="text-xl font-bold text-slate-800">なぜクリニック経営にKPI管理が必要か</h2>
        <p>多くのクリニックでは「なんとなく患者が減った気がする」「忙しいのに利益が出ていない」といった感覚ベースの経営判断が行われています。しかし、感覚と実際の数値にはギャップがあることが多く、適切なKPI（Key Performance Indicator = 重要業績評価指標）を設定して定期的にモニタリングすることが、経営改善の第一歩です。</p>
        <p>特にクリニック経営では、<strong>新患獲得・リピート維持・収益最大化</strong>の3つの軸でKPIを設計することが重要です。LINE公式アカウントのダッシュボードを活用すれば、これらの数値をリアルタイムで把握し、データに基づいた意思決定が可能になります。</p>
        <p>KPI管理を始めたクリニックでは、平均して<strong>6ヶ月以内に売上15〜25%の改善</strong>が見られるというデータもあります。数値を「見える化」するだけで、スタッフの意識改革にもつながるのです。</p>
      </section>

      <section>
        <h2 id="kpi-1" className="text-xl font-bold text-slate-800">KPI 1: 新患数（月次・チャネル別）</h2>
        <p>新患数はクリニック経営の成長を示す最も基本的な指標です。月次の総数だけでなく、<strong>チャネル別（LINE経由・Web予約・電話・紹介・広告別）</strong>に分解して管理することが重要です。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">目標値の設定方法</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>現状の新患数を3ヶ月平均で算出し、ベースラインとする</li>
          <li>月5〜10%増を目標に設定（年間で60〜120%増のペース）</li>
          <li>チャネル別の獲得単価（CPA）も合わせて管理し、費用対効果の高いチャネルに投資を集中</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">LINE活用のポイント</h3>
        <p>LINE友だち追加時にアンケートで「来院のきっかけ」を自動取得することで、チャネル別の集計が自動化されます。広告経由のLINE友だち追加にはUTMパラメータを付与し、広告効果の正確な計測も可能です。Lオペ for CLINICでは、これらのデータがダッシュボード上でリアルタイムに集計されます。</p>
      </section>

      <section>
        <h2 id="kpi-2" className="text-xl font-bold text-slate-800">KPI 2: リピート率（再診率・来院頻度）</h2>
        <p>新患を獲得するコストは、既存患者にリピートしてもらうコストの<strong>5〜10倍</strong>と言われています。リピート率の改善は、最も投資効率の高い経営改善施策です。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">管理すべき指標</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>再診率</strong>: 初診患者のうち、2回目の来院に至った割合（目標: 60%以上）</li>
          <li><strong>来院頻度</strong>: 通院中の患者の平均来院間隔（診療科目によって適正値が異なる）</li>
          <li><strong>離脱率</strong>: 最終来院から3ヶ月以上経過した患者の割合（目標: 20%以下）</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">改善アクション</h3>
        <p>LINEのセグメント配信を活用し、最終来院日から一定期間経過した患者に自動でフォローメッセージを送信します。「その後の体調はいかがですか？」といったパーソナルなメッセージは、再診率向上に大きく貢献します。あるクリニックでは、この施策だけで再診率が<strong>45% → 70%</strong>に改善しました。</p>
      </section>

      <section>
        <h2 id="kpi-3" className="text-xl font-bold text-slate-800">KPI 3: 患者LTV（生涯価値）</h2>
        <p>患者LTV（Lifetime Value = 生涯価値）は、1人の患者がクリニックにもたらす総収益を示す指標です。<strong>LTV = 平均客単価 × 平均来院回数 × 平均通院期間</strong>で算出します。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">なぜLTVが重要か</h3>
        <p>新患獲得に広告費をかける場合、LTVが獲得コスト（CPA）を上回っていなければ赤字です。LTVを把握することで、<strong>1人の新患獲得にいくらまで投資できるか</strong>が明確になり、マーケティング予算の最適化が可能になります。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">LTV向上の施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>来院回数の増加: 定期検診リマインド、フォローアップメッセージの自動化</li>
          <li>客単価の向上: 関連施術・オプションメニューのLINE配信でクロスセル</li>
          <li>通院期間の延長: 治療計画の共有と進捗管理をLINE上で実施</li>
        </ul>
        <p>自費診療を行う美容クリニックでは、LTVの管理が特に重要です。LINE経由で獲得した患者のLTVは、他チャネル経由と比較して<strong>平均1.5倍高い</strong>という調査結果もあります。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="kpi-4" className="text-xl font-bold text-slate-800">KPI 4: 予約充填率と無断キャンセル率</h2>
        <p>予約枠がどれだけ埋まっているか（充填率）と、予約したのに連絡なく来院しなかった割合（無断キャンセル率）は、クリニックの稼働効率を直接示す重要指標です。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">目標値</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>予約充填率</strong>: 85〜95%が理想（100%を目指すと急患対応の余裕がなくなる）</li>
          <li><strong>無断キャンセル率</strong>: 3%以下を目標（業界平均は5〜10%）</li>
          <li><strong>キャンセル待ち充填率</strong>: キャンセル発生時に別の患者で埋められた割合</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">LINEで実現する改善策</h3>
        <p>予約前日のLINEリマインド配信で無断キャンセルを大幅削減できます。メッセージ内に「変更・キャンセル」ボタンを設置することで、患者が気軽にリスケできる導線を用意。キャンセル発生時はキャンセル待ちの患者に自動通知し、空き枠の稼働率を最大化します。</p>
      </section>

      <section>
        <h2 id="kpi-5" className="text-xl font-bold text-slate-800">KPI 5: LINE友だち数と増加ペース</h2>
        <p>LINE友だち数は、クリニックが保有する「直接リーチ可能な患者基盤」の規模を示します。友だち数の絶対値だけでなく、<strong>増加ペースとブロック率</strong>を合わせて管理することが重要です。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">管理すべき指標</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>月間友だち追加数</strong>: 院内QRコード・Web・広告それぞれの経路別に計測</li>
          <li><strong>ブロック率</strong>: 友だち追加後にブロックされた割合（目標: 15%以下）</li>
          <li><strong>アクティブ友だち数</strong>: 直近30日以内にメッセージを開封した実質的なリーチ数</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">友だち数を増やす施策</h3>
        <p>院内のポスター・受付・診察室にQRコードを設置するのは基本です。加えて、「LINE友だち追加で初回1,000円OFF」などのインセンティブを設定することで、追加率が<strong>2〜3倍</strong>に向上します。Webサイトにもフローティングバナーを設置し、オンラインからの流入も獲得しましょう。</p>
      </section>

      <section>
        <h2 id="kpi-6" className="text-xl font-bold text-slate-800">KPI 6: メッセージ開封率・クリック率</h2>
        <p>LINEメッセージの開封率とクリック率は、配信コンテンツの質を測る指標です。いくら友だち数が多くても、メッセージが読まれなければ意味がありません。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">業界標準と目標値</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>開封率</strong>: LINEの平均開封率は60〜80%（メールの3〜5倍）。70%以上を維持が目標</li>
          <li><strong>クリック率</strong>: メッセージ内リンクのクリック率は15〜25%が目標</li>
          <li><strong>配信停止率</strong>: 1回の配信でのブロック増加率。0.5%以下を維持</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">改善のポイント</h3>
        <p>開封率が低い場合は配信時間帯の見直しが有効です。クリニックの患者層に応じて、<strong>主婦層なら10〜14時、ビジネスパーソンなら18〜20時</strong>が効果的です。クリック率を高めるには、リッチメッセージやカードタイプメッセージの活用で視覚的に訴求しましょう。また、セグメント配信で関心のある情報のみを届けることで、ブロック率の抑制にもつながります。</p>
      </section>

      <section>
        <h2 id="kpi-7" className="text-xl font-bold text-slate-800">KPI 7: 売上推移と客単価</h2>
        <p>最終的に経営の成否を判断するのは売上です。月次の売上推移に加えて、<strong>客単価の変動</strong>を追跡することで、売上変動の要因を特定できます。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">分解して管理する</h3>
        <p>売上は<strong>「患者数 × 客単価 × 来院頻度」</strong>に分解できます。売上が下がった場合、どの要素が低下しているのかを特定し、的確な対策を打つことが重要です。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>患者数が減少</strong>: 新患獲得施策の強化（LINE広告、友だち追加キャンペーン）</li>
          <li><strong>客単価が低下</strong>: メニュー構成の見直し、追加施術の提案方法改善</li>
          <li><strong>来院頻度が低下</strong>: リマインド配信・フォローアップメッセージの最適化</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">LINEデータとの連携</h3>
        <p>LINE経由の予約・決済データとPOSレジデータを連携させることで、<strong>LINE友だちのLTV</strong>と<strong>非友だちのLTV</strong>を比較できます。このデータは、LINE施策への投資判断の根拠として非常に有効です。</p>
      </section>

      <section>
        <h2 id="dashboard" className="text-xl font-bold text-slate-800">ダッシュボードの活用方法（週次レビュー）</h2>
        <p>KPIは設定するだけでは意味がありません。<strong>週次でレビューし、改善アクションにつなげる</strong>ことが重要です。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">週次レビューの進め方</h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>毎週月曜日にダッシュボードを確認</strong> — 先週の各KPIの実績と目標との差分を把握</li>
          <li><strong>異常値をピックアップ</strong> — 目標から10%以上乖離している指標に注目</li>
          <li><strong>原因を分析</strong> — 数値変動の要因を「外的要因（天候・競合）」と「内的要因（施策・オペレーション）」に分けて特定</li>
          <li><strong>改善アクションを決定</strong> — 翌週に実施する具体的なアクションを1〜2つ決め、担当者とスケジュールを明確化</li>
          <li><strong>前週のアクションの効果を振り返り</strong> — PDCAサイクルを回し、効果のあった施策は継続・拡大</li>
        </ol>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">Lオペ for CLINICのダッシュボード機能</h3>
        <p>Lオペ for CLINICでは、上記7つのKPIをワンクリックで確認できるダッシュボードを提供しています。LINE友だち数・メッセージ開封率・予約数・決済データが自動集計され、<strong>Excel管理やデータの手動集計は一切不要</strong>。スタッフ全員がリアルタイムで経営状況を把握できる環境を構築できます。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-slate-800">まとめ: KPI管理でデータドリブンなクリニック経営を</h2>
        <p>クリニック経営の数値管理は、以下の3ステップで始められます。</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>7つのKPIを設定し、現状値を把握する</strong> — まずは現状のベースラインを知ることが出発点</li>
          <li><strong>ダッシュボードで「見える化」する</strong> — 手動集計ではなくリアルタイムで確認できる仕組みを導入</li>
          <li><strong>週次レビューで改善サイクルを回す</strong> — 数値に基づいた意思決定を習慣化する</li>
        </ol>
        <p className="mt-4">Lオペ for CLINICは、LINE公式アカウントの運用データとクリニックの経営データを統合し、これらのKPIを一元管理できるプラットフォームです。データドリブンなクリニック経営を始めてみませんか？</p>
      </section>
    </ArticleLayout>
  );
}
