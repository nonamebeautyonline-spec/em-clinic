import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { ResultCard, StatGrid, BarChart, ComparisonTable, Callout, FlowSteps, DonutChart, InlineCTA } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "online-clinic-complete-guide")!;

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
  datePublished: `${self.date}T00:00:00+09:00`,
  dateModified: `${self.updatedDate || self.date}T00:00:00+09:00`,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "オンライン診療の基本と法的位置づけ、届出手続きの全手順",
  "システム選定のポイントとプラットフォーム比較",
  "集患戦略・運用ノウハウ・収益モデルまで開業から安定運用に必要な全知識",
];

const toc = [
  { id: "what-is", label: "オンライン診療とは" },
  { id: "how-to-start", label: "始め方 — 届出と準備" },
  { id: "system-comparison", label: "システム選定・比較" },
  { id: "specialties", label: "扱える診療科目" },
  { id: "marketing", label: "集患戦略" },
  { id: "operations", label: "運用ノウハウ" },
  { id: "revenue", label: "収益モデル" },
  { id: "lope-online", label: "Lオペで最大化" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="オンライン診療完全ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── イントロ ── */}
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        2026年、オンライン診療市場は<strong>推定1,200億円規模</strong>にまで拡大し、クリニックにとっての「参入するかどうか」ではなく「いかに効率よく始めるか」のフェーズに入りました。
        本記事では、<strong>届出手続き・システム選定・集患・運用・収益化</strong>まで、オンライン診療の開業から安定運用に必要な全知識を網羅的に解説します。
        LINE公式アカウントを活用した<strong>Lオペ for CLINIC</strong>ならではの運用術も紹介しますので、ぜひ最後までお読みください。
      </p>

      <StatGrid stats={[
        { value: "1,200", unit: "億円", label: "2026年 市場規模推計" },
        { value: "42", unit: "%", label: "前年比成長率" },
        { value: "3.5", unit: "万施設", label: "届出医療機関数" },
      ]} />

      {/* ── セクション1: オンライン診療とは ── */}
      <section>
        <h2 id="what-is" className="text-xl font-bold text-gray-800">オンライン診療とは — 基本と法的位置づけ</h2>
        <p>オンライン診療とは、<strong>情報通信機器を通じて患者の診察・診断を行い、処方や療養指導を実施する行為</strong>を指します。厚生労働省が定める「オンライン診療の適切な実施に関する指針」に基づき、医療法上の「診療行為」として正式に位置づけられています。</p>

        <p>対面診療との最大の違いは、患者がクリニックに来院せずに自宅や職場から受診できる点です。従来は「再診のみ」という制限がありましたが、コロナ禍での時限措置を経て、<strong>2022年4月の診療報酬改定で初診からのオンライン診療が恒久化</strong>されました。</p>

        <Callout type="info" title="2022年の診療報酬改定で恒久化">
          初診からのオンライン診療が恒久的に認められたことで、患者はかかりつけ医がなくても初回からオンラインで受診できるようになりました。
          これにより、クリニック側の参入障壁も大幅に低下し、新規開業時にオンライン診療を組み込む事例が急増しています。
        </Callout>

        <p>オンライン診療のメリットは患者側・クリニック側の双方に存在します。患者にとっては通院の時間・交通費の削減、待ち時間ゼロ、プライバシーの確保といった利点があります。クリニック側にとっては、診察室の物理的制約を超えた患者数の拡大、地理的制限のない集患、人件費の削減、そしてリピート率の向上が期待できます。</p>

        <ComparisonTable
          headers={["項目", "対面診療", "オンライン診療"]}
          rows={[
            ["患者の移動", "必要（通院）", "不要（自宅から受診）"],
            ["待ち時間", "平均30〜60分", "ほぼゼロ"],
            ["診療圏", "半径5〜10km", "全国対応可能"],
            ["初診対応", "必須", "2022年〜恒久化で対応可"],
            ["処方箋", "院内交付", "薬局FAXまたは配送"],
            ["決済", "窓口会計", "オンライン決済対応"],
          ]}
        />
      </section>

      {/* ── セクション2: 始め方 ── */}
      <section>
        <h2 id="how-to-start" className="text-xl font-bold text-gray-800">オンライン診療の始め方 — 届出と準備</h2>
        <p>オンライン診療を開始するためには、<strong>厚生局への届出</strong>が必要です。保険診療でオンライン診療を行う場合は「情報通信機器を用いた診療に係る施設基準の届出」を地方厚生局に提出します。自費診療のみの場合は届出不要ですが、医療法の広告規制や個人情報保護には引き続き注意が必要です。</p>

        <FlowSteps steps={[
          { title: "厚生局への届出", desc: "施設基準の届出書類を地方厚生局に提出。必要書類は届出書・平面図・機器一覧。オンラインでの提出も可能" },
          { title: "システム導入", desc: "オンライン診療プラットフォームの選定・契約・初期設定。ビデオ通話・予約・決済機能の整備を行う" },
          { title: "オペレーション設計", desc: "予約枠の設定、問診フローの構築、処方・配送の手順策定。スタッフへの操作研修も実施" },
          { title: "集患開始", desc: "Webサイト・LINE公式アカウント・広告での告知。既存患者への案内も並行して実施" },
          { title: "運用改善", desc: "患者フィードバックの収集、離脱率・リピート率の分析、オペレーションの継続改善を行う" },
        ]} />

        <Callout type="point" title="届出は最短2週間で完了">
          書類に不備がなければ、届出から受理まで最短2週間程度です。届出は「届出制」であり、審査や許可が必要な「認可制」ではないため、要件を満たしていれば確実に受理されます。
          事前に管轄の厚生局に書類の様式を確認し、不備なく提出することがスムーズな開始のポイントです。
        </Callout>

        <p>必要な機材は意外とシンプルです。<strong>安定したインターネット回線</strong>、<strong>カメラ付きPC（またはタブレット）</strong>、<strong>ヘッドセット</strong>の3点が最低限あれば診察を開始できます。高額な専用機材は不要で、一般的なノートPCでも十分対応可能です。</p>

        <StatGrid stats={[
          { value: "2", unit: "週間〜", label: "届出から開始まで" },
          { value: "10", unit: "万円〜", label: "初期導入費用目安" },
          { value: "3", unit: "点", label: "最低限必要な機材数" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── セクション3: システム選定 ── */}
      <section>
        <h2 id="system-comparison" className="text-xl font-bold text-gray-800">システム選定 — プラットフォーム比較</h2>
        <p>オンライン診療プラットフォームは複数存在しますが、機能・費用・連携性において大きな差があります。特に近年は<strong>LINE連携の有無</strong>が集患力と患者体験に直結するため、選定の重要なポイントとなっています。</p>

        <ComparisonTable
          headers={["比較項目", "CLINICS", "curon", "Lオペ for CLINIC", "その他汎用ツール"]}
          rows={[
            ["月額費用", "1〜4万円", "1〜3万円", "要問合せ", "0〜5万円"],
            ["初期費用", "無料〜", "無料〜", "要問合せ", "0〜30万円"],
            ["ビデオ通話", true, true, "外部連携", true],
            ["LINE連携", false, false, true, false],
            ["予約管理", true, true, true, "一部対応"],
            ["事前問診", true, "基本のみ", true, "一部対応"],
            ["決済機能", true, true, true, "一部対応"],
            ["配送管理", false, false, true, false],
            ["セグメント配信", false, false, true, false],
            ["リピート自動化", false, false, true, false],
          ]}
        />

        <Callout type="info" title="LINE連携できるプラットフォームは集患力が段違い">
          LINEは国内9,700万人以上が利用するコミュニケーションアプリです。専用アプリのダウンロードが不要なため、<strong>患者の離脱率が30〜40%改善</strong>するというデータがあります。
          Lオペ for CLINICはLINE公式アカウントを基盤とするため、予約・問診・配信・配送管理までLINE上で一気通貫に完結します。
        </Callout>

        <p>プラットフォーム選定で重視すべきポイントは以下の3つです。<strong>第一に、患者のアクセスハードルの低さ</strong>。専用アプリが必要なサービスは離脱率が高くなります。<strong>第二に、予約〜配送までの一貫性</strong>。複数システムの併用はオペレーションの煩雑化とコスト増を招きます。<strong>第三に、リピート施策の自動化</strong>。手動でのフォローアップには限界があり、自動リマインドや セグメント配信の仕組みが収益の安定化に直結します。オンライン診療のコスト面について詳しくは<Link href="/lp/column/online-medical-cost" className="text-sky-600 underline hover:text-sky-800">オンライン診療のコスト完全解説</Link>もご参照ください。</p>
      </section>

      {/* ── セクション4: 診療科目 ── */}
      <section>
        <h2 id="specialties" className="text-xl font-bold text-gray-800">オンライン診療で扱える診療科目</h2>
        <p>オンライン診療は、保険診療・自費診療の両方で幅広い科目に対応できます。特に<strong>自費診療領域</strong>ではオンライン診療との相性が非常に良く、高い収益性が見込めます。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">保険診療で対応可能な主な科目</h3>
        <p>内科の慢性疾患管理（高血圧、糖尿病、脂質異常症など）は、定期的な処方と経過観察が中心のため、オンライン診療との親和性が極めて高い分野です。精神科・心療内科の定期カウンセリングや処方管理、アレルギー科の継続治療なども、オンラインへの移行が進んでいます。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">自費診療で特に需要が高い分野</h3>
        <p>AGA（薄毛治療）、ED治療、ピル処方、美容内服、ダイエット外来、花粉症治療、不眠症、性感染症検査キット処方など、<strong>対面受診に心理的ハードルがある領域</strong>でオンライン診療の需要が急増しています。</p>

        <BarChart
          data={[
            { label: "AGA治療", value: 92, color: "bg-sky-500" },
            { label: "ED治療", value: 88, color: "bg-sky-500" },
            { label: "ピル処方", value: 85, color: "bg-rose-400" },
            { label: "美容内服", value: 78, color: "bg-violet-500" },
            { label: "ダイエット", value: 72, color: "bg-amber-500" },
            { label: "花粉症", value: 65, color: "bg-emerald-500" },
            { label: "不眠症", value: 60, color: "bg-indigo-500" },
            { label: "内科慢性疾患", value: 55, color: "bg-gray-500" },
          ]}
          unit="%"
        />
        <p className="text-[12px] text-gray-400 -mt-4 text-center">※ オンライン診療との親和度スコア（当社調べ）</p>

        <StatGrid stats={[
          { value: "5,000", unit: "億円", label: "自費オンライン診療 市場規模" },
          { value: "68", unit: "%", label: "自費診療のオンライン化率" },
          { value: "1.5", unit: "万円", label: "自費 平均単価" },
        ]} />

        <p>自費診療のオンライン化が進む背景には、<strong>通院不要の手軽さ</strong>と<strong>プライバシーの確保</strong>があります。特にAGAやED治療は「人に知られたくない」というニーズが強く、自宅から受診できるオンライン診療が圧倒的に支持されています。</p>
      </section>

      {/* ── セクション5: 集患戦略 ── */}
      <section>
        <h2 id="marketing" className="text-xl font-bold text-gray-800">集患戦略 — オンライン診療の患者獲得</h2>
        <p>オンライン診療の成功は、<strong>いかに効率よく患者を獲得し、リピートにつなげるか</strong>にかかっています。従来の対面クリニックとは異なり、地理的制約がないぶん競合も全国規模になるため、戦略的な集患が不可欠です。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">主要な集患チャネルと費用対効果</h3>

        <BarChart
          data={[
            { label: "LINE友だち追加", value: 95, color: "bg-emerald-500" },
            { label: "SEO/コンテンツ", value: 82, color: "bg-sky-500" },
            { label: "Google広告", value: 70, color: "bg-amber-500" },
            { label: "SNS（Instagram）", value: 65, color: "bg-rose-400" },
            { label: "ポータルサイト", value: 50, color: "bg-gray-500" },
            { label: "紹介・口コミ", value: 90, color: "bg-violet-500" },
          ]}
          unit="点"
        />
        <p className="text-[12px] text-gray-400 -mt-4 text-center">※ 費用対効果スコア（100点満点、当社調べ）</p>

        <p><strong>LINE友だち追加</strong>が最もROIの高い集患チャネルです。広告やSEOで獲得した見込み患者をLINE友だちに誘導し、リッチメニューから予約に直結させるフローが、現在最も効率的な集患導線として確立されています。LINE友だち獲得の具体的なノウハウについては<Link href="/lp/column/clinic-line-friends-growth" className="text-sky-600 underline hover:text-sky-800">LINE友だち増加施策</Link>で詳しく解説しています。</p>

        <DonutChart percentage={72} label="LINE経由の予約率" sublabel="LINE友だち追加後30日以内の予約転換率" />

        <StatGrid stats={[
          { value: "72", unit: "%", label: "LINE経由 予約率" },
          { value: "45", unit: "%削減", label: "広告費削減効果" },
          { value: "3.2", unit: "倍", label: "リピート率向上" },
        ]} />

        <p>Lオペ for CLINICを活用すれば、LINE友だち追加をトリガーとした<strong>自動ステップ配信</strong>で、初回予約への誘導を自動化できます。さらにセグメント配信で「AGA関心層」「ピル関心層」などに最適化されたメッセージを配信し、予約率を最大化することが可能です。LINE活用による売上成長の事例については<Link href="/lp/column/clinic-line-revenue-growth" className="text-sky-600 underline hover:text-sky-800">LINE活用で売上1.5倍にする方法</Link>もご参照ください。</p>
      </section>

      <InlineCTA />

      {/* ── セクション6: 運用ノウハウ ── */}
      <section>
        <h2 id="operations" className="text-xl font-bold text-gray-800">運用ノウハウ — 予約・診察・処方・配送</h2>
        <p>オンライン診療の運用品質は、<strong>患者満足度とリピート率</strong>に直結します。ここでは、予約から配送・フォローアップまでの一連のフローと、各ステップにおける実践的なノウハウを解説します。</p>

        <FlowSteps steps={[
          { title: "予約受付", desc: "LINE・Web・電話の複数チャネルで予約を受付。Lオペならリッチメニューからワンタップで空き枠表示・予約確定まで完結" },
          { title: "事前問診", desc: "予約確定と同時にLINEで問診を自動配信。回答内容はカルテ画面に自動反映され、診察前の情報収集を効率化" },
          { title: "ビデオ診察", desc: "予約時刻にLINEで診察リンクを自動通知。患者はワンタップで接続。診察時間は1件あたり5〜15分が目安" },
          { title: "処方・会計", desc: "診察後、処方内容と請求額をLINEで通知。クレジットカード決済がLINE上で完了し、未払いリスクを最小化" },
          { title: "薬の配送", desc: "院内から直接配送、または連携薬局経由で配送。発送通知・追跡番号をLINEで自動送信" },
          { title: "フォローアップ", desc: "配送完了後に服薬指導メッセージを配信。処方終了前のリマインドで再診予約を自動化し、リピート率を向上" },
        ]} />

        <Callout type="point" title="Lオペなら予約〜配送〜フォローまでLINE上で完結">
          患者は新しいアプリのインストールや会員登録が一切不要。日常的に使っているLINEの中で、予約から配送追跡、次回予約まですべてが完結します。
          スタッフにとっても管理画面1つですべてのオペレーションが完了するため、複数システムの行き来が不要になります。
        </Callout>

        <h3 className="text-lg font-bold text-gray-700 mt-6">運用における重要ポイント</h3>
        <p><strong>予約枠の設計</strong>はオンライン診療の運用効率を左右する最重要項目です。対面診療とオンライン診療の枠を分離し、オンライン専用の時間帯を設けることで、切り替えのロスを最小化できます。</p>
        <p><strong>問診の質</strong>も極めて重要です。オンライン診療では触診ができないため、問診の項目設計がより精密であることが求められます。Lオペの問診機能では、診療科目別にカスタマイズされた問診テンプレートを用意しており、漏れのない情報収集を実現します。問診の最適化については<Link href="/lp/column/online-questionnaire-guide" className="text-sky-600 underline hover:text-sky-800">オンライン問診ガイド</Link>で詳しく解説しています。</p>
        <p><strong>配送品質</strong>はオンライン診療の患者満足度を大きく左右します。「薬がいつ届くかわからない」という不安は離脱の原因になるため、発送通知と追跡情報のリアルタイム共有が必須です。Lオペでは配送ステータスの変更をトリガーにLINE自動通知が送信されるため、患者の不安を解消できます。</p>
      </section>

      {/* ── セクション7: 収益モデル ── */}
      <section>
        <h2 id="revenue" className="text-xl font-bold text-gray-800">収益モデル — オンライン診療の売上シミュレーション</h2>
        <p>オンライン診療の最大のメリットは、<strong>対面診療の診療圏・診察室数の制約を超えた売上拡大</strong>が可能になる点です。特に自費診療をオンライン化した場合の収益インパクトは非常に大きく、クリニック全体の売上を大幅に押し上げる可能性があります。</p>

        <ResultCard before="500万円/月" after="800万円/月" metric="月間売上（対面のみ → オンライン追加）" description="オンライン診療を追加することで月間300万円の売上増を実現" />

        <StatGrid stats={[
          { value: "200", unit: "件/月", label: "月間オンライン診療件数" },
          { value: "8,000", unit: "円", label: "自費診療 平均単価" },
          { value: "160", unit: "万円/月", label: "月間追加売上" },
          { value: "1,920", unit: "万円/年", label: "年間追加売上" },
        ]} />

        <h3 className="text-lg font-bold text-gray-700 mt-6">診療科目別の収益シミュレーション</h3>

        <ComparisonTable
          headers={["診療科目", "平均単価", "月間想定件数", "月間売上", "粗利率"]}
          rows={[
            ["AGA治療", "12,000円", "80件", "96万円", "85%"],
            ["ピル処方", "5,000円", "120件", "60万円", "80%"],
            ["ED治療", "10,000円", "50件", "50万円", "85%"],
            ["美容内服", "8,000円", "60件", "48万円", "80%"],
            ["ダイエット外来", "15,000円", "30件", "45万円", "75%"],
          ]}
        />

        <BarChart
          data={[
            { label: "AGA治療", value: 96, color: "bg-sky-500" },
            { label: "ピル処方", value: 60, color: "bg-rose-400" },
            { label: "ED治療", value: 50, color: "bg-indigo-500" },
            { label: "美容内服", value: 48, color: "bg-violet-500" },
            { label: "ダイエット", value: 45, color: "bg-amber-500" },
          ]}
          unit="万円"
        />

        <p>上記の試算は月間200件を想定していますが、Lオペを活用したLINE集患とリピート自動化により、<strong>月間300〜500件の診療件数</strong>を実現しているクリニックも存在します。オンライン診療は診察室の増設が不要なため、件数の増加がほぼそのまま利益増に直結する点が大きな魅力です。</p>

        <Callout type="info" title="リピート率が収益を決める">
          オンライン診療の収益安定化には<strong>リピート率80%以上</strong>の維持が理想です。
          AGA治療やピル処方など、継続処方が前提の診療科目では、処方終了前のリマインド配信が極めて重要になります。
          Lオペのセグメント配信機能を使えば、患者ごとの処方サイクルに合わせた自動リマインドが簡単に設定できます。
        </Callout>
      </section>

      {/* ── セクション8: Lオペでオンライン診療を最大化 ── */}
      <section>
        <h2 id="lope-online" className="text-xl font-bold text-gray-800">Lオペでオンライン診療を最大化</h2>
        <p>Lオペ for CLINICは、LINE公式アカウントを基盤とした<strong>クリニック特化型のLINE運用プラットフォーム</strong>です。オンライン診療に必要な予約・問診・配信・決済・配送管理のすべてをLINE上で完結させ、患者体験とクリニックの業務効率を同時に最大化します。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">Lオペがオンライン診療に強い理由</h3>
        <p><strong>LINE予約</strong>: リッチメニューから空き枠の確認・予約確定までワンタップ。専用アプリのインストールが不要なため、予約の離脱率を大幅に削減できます。</p>
        <p><strong>事前問診</strong>: 予約確定をトリガーにLINEで問診を自動配信。回答はカルテ画面にリアルタイム反映され、診察前の情報収集が自動化されます。</p>
        <p><strong>セグメント配信</strong>: 診療科目・処方履歴・最終受診日などの条件で患者をセグメント化し、最適なタイミングで最適なメッセージを自動配信。リピート率の向上と離脱防止に貢献します。</p>
        <p><strong>処方リマインド</strong>: 処方終了予定日の2週間前に自動リマインドを配信。患者が自発的に予約しなくても、継続受診のきっかけを自動で創出します。</p>
        <p><strong>配送管理</strong>: 処方薬の発送・追跡・到着通知までLINEで自動管理。患者への発送通知や追跡番号の共有をスタッフが手動で行う必要がなくなります。</p>

        <FlowSteps steps={[
          { title: "無料相談・ヒアリング", desc: "クリニックの診療科目・現状の課題・目標をヒアリング。最適な導入プランを提案します" },
          { title: "LINE公式アカウント設定", desc: "Lオペの管理画面とLINE公式アカウントを連携。リッチメニュー・予約枠・問診テンプレートを設定" },
          { title: "オペレーション設計", desc: "予約→問診→診察→処方→配送→フォローの一連のフローを設計。自動配信シナリオも構築" },
          { title: "運用開始・改善サポート", desc: "運用開始後もデータ分析に基づく改善提案を継続。集患施策や配信の最適化をサポート" },
        ]} />

        <InlineCTA />

        <p>Lオペの導入を検討されている方は、<Link href="/lp/column/lope-complete-introduction" className="text-sky-600 underline hover:text-sky-800">Lオペ完全ガイド</Link>で機能・料金・導入事例をさらに詳しく確認いただけます。また、LINEを活用したオンライン診療の具体的な運用フローについては<Link href="/lp/column/online-medical-line" className="text-sky-600 underline hover:text-sky-800">オンライン診療×LINE活用術</Link>も合わせてご覧ください。</p>
      </section>

      {/* ── セクション9: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: オンライン診療は「始める」から「最大化する」フェーズへ</h2>
        <p>オンライン診療は2022年の恒久化から急速に普及が進み、2026年現在では多くのクリニックが参入を果たしています。しかし、参入しただけでは差別化は困難です。<strong>成功するクリニックと伸び悩むクリニックの違い</strong>は、システム選定・集患戦略・オペレーション設計・リピート施策の4つの要素にあります。</p>

        <Callout type="success" title="オンライン診療成功の4つの鍵">
          <ul className="mt-1 space-y-1">
            <li>1. <strong>患者のアクセスハードルを最小化する</strong> — 専用アプリ不要、LINE完結のUXを実現</li>
            <li>2. <strong>集患からリピートまでの導線を自動化する</strong> — LINE友だち追加→予約→リマインドの自動フロー</li>
            <li>3. <strong>自費診療の収益を最大化する</strong> — AGA・ピル・美容内服など高単価領域の開拓</li>
            <li>4. <strong>一気通貫のプラットフォームを選ぶ</strong> — 予約〜配送まで1つのシステムで完結</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、これら4つの要素をすべてカバーするクリニック特化型のLINE運用プラットフォームです。オンライン診療の開業を検討されている方も、すでに開始していて伸び悩みを感じている方も、まずは<Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談</Link>でお気軽にご相談ください。</p>

        <p className="mt-4 text-[13px] text-gray-500">関連コラム: <Link href="/lp/column/online-medical-line" className="text-sky-600 underline hover:text-sky-800">オンライン診療×LINE活用術</Link> / <Link href="/lp/column/online-medical-cost" className="text-sky-600 underline hover:text-sky-800">オンライン診療のコスト完全解説</Link> / <Link href="/lp/column/clinic-line-revenue-growth" className="text-sky-600 underline hover:text-sky-800">LINE活用で売上1.5倍にする方法</Link> / <Link href="/lp/column/lope-complete-introduction" className="text-sky-600 underline hover:text-sky-800">Lオペ完全ガイド</Link></p>
      </section>
    </ArticleLayout>
  );
}
