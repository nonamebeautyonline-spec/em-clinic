import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  BarChart,
  Callout,
  FlowSteps,
  ComparisonTable,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "online-clinic-app-comparison")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "オンライン診療システムの選び方で選ぶ際の最も重要な基準は何ですか？", a: "クリニック業務への適合性が最も重要です。汎用ツールは安価ですが医療ワークフローへの対応に大量のカスタマイズが必要です。クリニック専用ツールなら予約管理・問診・カルテ・決済が標準搭載されており、導入直後から運用できます。" },
  { q: "ツール移行時にデータは引き継げますか？", a: "LINE公式アカウントはそのまま維持し、連携ツールだけを切り替える形になります。友だちリストやトーク履歴はLINE公式側に残るため、患者への影響はありません。Lオペ for CLINICでは移行サポートも提供しています。" },
  { q: "無料で使えるツールではダメですか？", a: "無料ツールは基本的な配信機能のみで、予約管理・問診・カルテ連携・セグメント配信などクリニックに必要な機能が不足しています。月額費用をかけてでも専用ツールを導入した方が、業務効率化による人件費削減で十分に元が取れます。" },
];

/* FAQPage JSON-LD（Article JSON-LDはArticleLayoutで自動生成） */
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
  "オンライン診療システムは「専用プラットフォーム型」と「汎用ビデオ通話+周辺ツール型」の2種類に大別される",
  "比較すべき軸は「導入コスト」「機能の網羅性」「患者側の操作体験」の3つ",
  "予約・決済・配送・問診を一気通貫で管理できるシステムが運用効率を最大化する",
];

const toc = [
  { id: "system-types", label: "オンライン診療システムの分類" },
  { id: "cost-comparison", label: "導入コストの比較" },
  { id: "feature-comparison", label: "機能比較：何ができるか" },
  { id: "patient-experience", label: "患者体験の違い" },
  { id: "integration", label: "電子カルテ・レセコン連携" },
  { id: "selection-criteria", label: "自院に合うシステムの選定基準" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ツール比較" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        オンライン診療を始めるにあたり、「どのシステムを導入すべきか」は最も重要な意思決定の一つです。市場には専用プラットフォームから汎用ビデオ通話ツールの活用まで多様な選択肢がありますが、<strong>導入コスト・機能の網羅性・患者側の使いやすさ</strong>を総合的に評価しないと、導入後に「使いにくい」「結局アナログ作業が残る」といった事態に陥ります。本記事では、オンライン診療システムを選ぶ際に比較すべきポイントを体系的に整理します。
      </p>

      {/* ── セクション1: システムの分類 ── */}
      <section>
        <h2 id="system-types" className="text-xl font-bold text-gray-800">オンライン診療システムの分類</h2>

        <p>オンライン診療に使えるシステムは、大きく<strong>3つのカテゴリ</strong>に分類できます。それぞれの特性を理解した上で、自院の診療スタイルに合ったものを選ぶことが重要です。</p>

        <p><strong>1. 専用プラットフォーム型。</strong>オンライン診療に特化して設計されたシステムで、ビデオ通話・予約・問診・決済・処方管理が一つのプラットフォームに統合されています。医療機関向けに開発されているため、法規制への対応や電子カルテ連携が充実しているのが特徴です。</p>

        <p><strong>2. 汎用ビデオ通話+周辺ツール型。</strong>ZoomやGoogle Meetなどの汎用ビデオ通話ツールをベースに、予約管理や決済は別のツールで対応するモデルです。初期コストは低いですが、ツール間の連携や運用の手間が課題になります。</p>

        <p><strong>3. LINE/SNS連携型。</strong>患者が普段使っているLINEをインターフェースとして活用し、予約・問診・ビデオ通話・決済・配送管理までをLINE上で完結させるモデルです。患者にアプリの追加インストールを求めないため、導入のハードルが最も低くなります。LINE連携型と既存ツールの違いについては<Link href="/clinic/column/lstep-vs-clinic-tool" className="text-sky-600 underline hover:text-sky-800">Lステップとクリニック専用ツールの比較</Link>も参考になります。</p>

        <ComparisonTable
          headers={["分類", "初期費用", "月額費用", "患者のアプリDL", "機能統合度"]}
          rows={[
            ["専用プラットフォーム型", "0〜50万円", "1〜10万円", "必要な場合あり", "高い"],
            ["汎用ビデオ通話+周辺ツール型", "0円", "0〜3万円", "不要（ブラウザ）", "低い（手動連携）"],
            ["LINE/SNS連携型", "0〜30万円", "1〜5万円", "不要（LINE利用）", "高い"],
          ]}
        />
      </section>

      {/* ── セクション2: 導入コストの比較 ── */}
      <section>
        <h2 id="cost-comparison" className="text-xl font-bold text-gray-800">導入コストの比較</h2>

        <p>オンライン診療システムの費用は「初期費用」「月額費用」「従量課金」の3要素で構成されます。初期費用が無料でも月額が高い場合や、月額は安くても1件あたりの従量課金が発生する場合があるため、<strong>年間総コスト</strong>で比較することが重要です。</p>

        <p>専用プラットフォーム型は初期費用0〜50万円、月額1〜10万円が相場です。高機能なシステムほど月額が高くなりますが、予約管理・決済・配送管理を別ツールで揃える必要がないため、<strong>トータルの運用コストは必ずしも高くない</strong>ケースが多くあります。</p>

        <p>汎用ビデオ通話型は初期費用・月額ともに最も低コストですが、予約管理ツール（月額5,000〜20,000円）、決済ツール（月額+手数料）、配送管理（人件費）を個別に導入するため、月間診療件数が50件を超えるとトータルコストが専用型を上回ることがあります。</p>

        <BarChart
          data={[
            { label: "汎用ビデオ通話型（月30件）", value: 15000, color: "bg-emerald-500" },
            { label: "汎用ビデオ通話型（月100件）", value: 60000, color: "bg-emerald-400" },
            { label: "専用プラットフォーム型", value: 50000, color: "bg-sky-500" },
            { label: "LINE連携型", value: 35000, color: "bg-violet-500" },
          ]}
          unit="円（月間運用コスト目安・ツール費用合計）"
        />

        <Callout type="info" title="隠れコストに注意">
          表示されている月額料金だけでなく、<strong>決済手数料（3.0〜3.6%）、SMS送信料（1通3〜10円）、ストレージ追加料金</strong>などの従量課金も年間コストに含めて比較しましょう。<Link href="/clinic/column/online-clinic-pricing-breakdown" className="text-sky-600 underline hover:text-sky-800">オンライン診療の料金相場と隠れコスト</Link>の記事で費用構造の全体像を把握できます。月間100件・平均単価1万円の場合、決済手数料だけで年間36〜43万円のコストになります。
        </Callout>
      </section>

      {/* ── セクション3: 機能比較 ── */}
      <section>
        <h2 id="feature-comparison" className="text-xl font-bold text-gray-800">機能比較：何ができるか</h2>

        <p>オンライン診療システムの機能は、「診察の実施」に直接関わる機能と、「診察前後の業務」を効率化する周辺機能に分けられます。システム選定では、診察機能だけでなく<strong>業務フロー全体をカバーする周辺機能の充実度</strong>が重要です。</p>

        <ComparisonTable
          headers={["機能カテゴリ", "専用プラットフォーム型", "汎用ビデオ通話型", "LINE連携型"]}
          rows={[
            ["ビデオ通話", "内蔵", "Zoom/Meet等を利用", "LINE通話 or 内蔵"],
            ["予約管理", "統合済み", "別ツール必要", "統合済み"],
            ["Web問診", "統合済み or 連携", "別ツール必要", "統合済み"],
            ["オンライン決済", "統合済み", "別ツール必要", "統合済み"],
            ["処方・配送管理", "対応あり", "手動管理", "統合済み"],
            ["患者CRM", "一部対応", "なし", "対応あり"],
            ["リマインド通知", "メール/SMS", "手動", "LINE自動通知"],
            ["AI自動返信", "一部対応", "なし", "対応あり"],
          ]}
        />

        <p>注目すべきは、<strong>予約・問診・決済・配送が一気通貫で連携しているか</strong>どうかです。これらが分断されていると、スタッフが手動でデータを転記したり、患者に複数のURLやアプリを案内する必要が生じ、運用負荷と患者の離脱率が増加します。</p>

        <p>特に自費診療のオンラインクリニックでは、定期処方の自動決済・自動配送機能の有無が収益に直結します。毎月の処方ごとにスタッフが手動で決済処理と配送手配を行うのと、システムが自動で処理するのとでは、月間100件の場合にスタッフの作業時間に<strong>月20〜30時間の差</strong>が生まれます。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: 患者体験の違い ── */}
      <section>
        <h2 id="patient-experience" className="text-xl font-bold text-gray-800">患者体験の違い</h2>

        <p>システム選定で見落とされがちなのが、<strong>患者側の操作体験</strong>です。どれほど高機能なシステムでも、患者が使いこなせなければ予約率・継続率に悪影響を及ぼします。</p>

        <p>患者体験を左右する最大の要素は「アプリのインストールが必要かどうか」です。専用アプリのダウンロードを求めるシステムでは、ダウンロードページでの離脱率が15〜30%に達するというデータがあります。一方、LINEやブラウザで完結するシステムは、患者が既に使い慣れたインターフェースで操作できるため、初回予約のハードルが大幅に下がります。</p>

        <p>次に重要なのが「予約から診察までのステップ数」です。予約→問診→決済→ビデオ通話入室までのクリック数が少ないほど患者のストレスは軽減されます。理想的には、<strong>3〜5ステップで診察開始まで完了</strong>できるフローが望ましいです。</p>

        <StatGrid stats={[
          { value: "15〜30", unit: "%", label: "アプリDL要求時の離脱率" },
          { value: "3〜5", unit: "ステップ", label: "理想的な予約〜診察の操作数" },
          { value: "9,700", unit: "万人", label: "LINE国内月間アクティブユーザー" },
          { value: "85", unit: "%以上", label: "スマートフォンでの受診割合" },
        ]} />
      </section>

      {/* ── セクション5: 電子カルテ連携 ── */}
      <section>
        <h2 id="integration" className="text-xl font-bold text-gray-800">電子カルテ・レセコン連携</h2>

        <p>保険診療を行うクリニックにとって、電子カルテ・レセコンとの連携は必須要件です。オンライン診療システムと電子カルテが連携していない場合、医師は診察内容をオンライン診療システムに記録した後、<strong>同じ内容を電子カルテにも手入力する二重入力</strong>が発生します。</p>

        <p>連携の方式には、API連携（自動同期）、CSV連携（手動インポート）、ORCAなどのレセコンとの直接連携があります。API連携が最も効率的ですが、対応している電子カルテの種類はシステムによって異なるため、導入前に自院の電子カルテとの互換性を必ず確認してください。</p>

        <p>一方、自費診療専門のオンラインクリニックでは、レセプト請求が不要なため電子カルテ連携の優先度は下がります。その代わり、<strong>患者CRM（顧客管理）との連携</strong>が重要になります。診察履歴・処方履歴・決済履歴・配送状況を一元管理できるシステムであれば、患者対応の質とスピードが向上し、継続率の改善につながります。</p>

        <Callout type="point" title="連携確認のチェックポイント">
          <strong>保険診療:</strong> 自院の電子カルテ/レセコンとAPI連携が可能か<br />
          <strong>自費診療:</strong> 患者CRM・決済・配送管理が一元化されているか<br />
          <strong>共通:</strong> 既存の予約システムや電話自動応答との併用が可能か
        </Callout>
      </section>

      {/* ── セクション6: 選定基準 ── */}
      <section>
        <h2 id="selection-criteria" className="text-xl font-bold text-gray-800">自院に合うシステムの選定基準</h2>

        <p>最適なシステムはクリニックの規模・診療科・保険/自費の比率によって異なります。以下の判断基準をもとに、自院の状況に合った選択をしましょう。</p>

        <p><strong>保険診療中心・対面併用のクリニック</strong>は、電子カルテ連携が充実した専用プラットフォーム型が適しています。対面の合間にオンライン診療を行うワークフローに対応でき、レセプト業務への影響も最小限に抑えられます。</p>

        <p><strong>自費診療特化・オンライン専門のクリニック</strong>は、予約・問診・決済・配送を一気通貫で管理できるシステムが最適です。<Link href="/clinic/column/online-clinic-platform-comparison" className="text-sky-600 underline hover:text-sky-800">オンライン診療プラットフォームの詳細比較</Link>も選定の参考にしてください。特にLINE連携型は、患者のアプリDLが不要で予約導線がシンプルなため、新患獲得と継続率の両面で優位性があります。</p>

        <p><strong>小規模・開業直後のクリニック</strong>で月間オンライン診療件数が30件未満の場合は、まず汎用ビデオ通話型で低コストに始め、件数が増えてきた段階で専用型に移行するステップも合理的です。ただし、移行時のデータ引き継ぎやURLの変更による患者への影響は考慮が必要です。</p>

        <FlowSteps steps={[
          { title: "Step 1: 要件整理", desc: "保険/自費の比率、月間件数、必要な連携先を明確にする" },
          { title: "Step 2: 候補の絞り込み", desc: "3つの分類から自院に合うカテゴリを選び、2〜3社に絞る" },
          { title: "Step 3: トライアル検証", desc: "無料トライアルで患者側の操作体験とスタッフの業務フローを検証する" },
          { title: "Step 4: 年間コスト試算", desc: "月額+従量課金+周辺ツール費用を含めた年間総コストで比較する" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>オンライン診療システムの選定は、「導入コスト」「機能の網羅性」「患者体験」の3軸で比較することが重要です。月額料金の安さだけで選ぶと、周辺ツールの追加コストや手動オペレーションの人件費で結果的に高くつくケースが少なくありません。自院の診療スタイルと患者層に合ったシステムを選び、予約から配送までの一連のフローが効率的に回る環境を構築しましょう。</p>

        <Callout type="success" title="システム選定の実践ステップ">
          <strong>1.</strong> 保険/自費の比率と月間想定件数から、最適なシステム分類を特定する<br />
          <strong>2.</strong> 年間総コスト（月額+従量課金+周辺ツール）で候補を比較する<br />
          <strong>3.</strong> 無料トライアルで患者側の操作体験を必ず検証する<br />
          <strong>4.</strong> 電子カルテ連携（保険）またはCRM連携（自費）の互換性を確認する
        </Callout>
      </section>
    
      {/* ── FAQ ── */}
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
