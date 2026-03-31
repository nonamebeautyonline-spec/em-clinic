import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-operation-outsource-vs-inhouse")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE運用代行の費用相場はどのくらい？", a: "月額10〜50万円が一般的な相場です。配信代行のみなら月10〜20万円、戦略設計＋配信＋分析レポートまで含むフルサポートなら月30〜50万円が目安です。初期構築費として別途10〜30万円がかかるケースもあります。" },
  { q: "自社運用と代行のハイブリッド型は可能？", a: "可能です。戦略設計と分析は代行に任せ、日常の配信やチャット対応は自社で行うハイブリッド型が費用と成果のバランスが良く、多くの企業で採用されています。自社のノウハウ蓄積にもつながるため、将来的な内製化を見据えた選択肢としても有効です。" },
  { q: "LINE運用代行を選ぶ際のチェックポイントは？", a: "同業種での運用実績、レポーティングの質、担当者の専門性、契約期間の柔軟性、料金体系の透明性の5点を必ず確認してください。特に同業種での実績がある代行会社は、業界特有の配信タイミングやコンテンツのノウハウを持っているため、成果が出やすい傾向があります。" },
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
  "運用代行と自社運用のコスト・成果・リスクを多角的に比較",
  "自社の状況に合った運用形態の判断基準チェックリスト",
  "ハイブリッド型運用と将来の内製化へのロードマップ",
];

const toc = [
  { id: "comparison-overview", label: "運用代行vs自社運用の全体比較" },
  { id: "cost-comparison", label: "コスト比較" },
  { id: "performance-comparison", label: "成果の比較" },
  { id: "risk-comparison", label: "リスクの比較" },
  { id: "decision-criteria", label: "判断基準チェックリスト" },
  { id: "hybrid-model", label: "ハイブリッド型という選択肢" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <ArticleLayout slug={self.slug} breadcrumbLabel="運用比較" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        LINE公式アカウントの運用を「外注するか、自社で行うか」は、多くの企業が直面する判断ポイントです。運用代行は専門的なノウハウを活用できる一方でコストがかかり、自社運用はコストを抑えられるものの人材とノウハウが必要です。本記事では、<strong>コスト・成果・リスク</strong>の3つの観点から運用代行と自社運用を徹底比較し、自社に最適な運用形態の選び方を解説します。
      </p>

      <section>
        <h2 id="comparison-overview" className="text-xl font-bold text-gray-800">運用代行vs自社運用の全体比較</h2>

        <ComparisonTable
          headers={["比較項目", "運用代行", "自社運用"]}
          rows={[
            ["月額コスト", "10〜50万円", "人件費（担当者の工数）"],
            ["専門性", "高い（プロのノウハウ）", "担当者の知識に依存"],
            ["立ち上げスピード", "速い（1〜2週間）", "遅い（1〜3ヶ月）"],
            ["自社ノウハウ蓄積", "蓄積しにくい", "蓄積される"],
            ["柔軟性", "契約範囲内", "自由度が高い"],
            ["ブランド理解", "外部の理解に限界", "深い理解が可能"],
            ["継続性リスク", "契約終了で運用停止", "担当者離職リスク"],
          ]}
        />

        <Callout type="point" title="判断の前提">
          「代行か自社か」は二者択一ではなく、ハイブリッド型も含めた3つの選択肢があります。自社のリソース・予算・目標を整理したうえで、最適な形態を選びましょう。
        </Callout>
      </section>

      <section>
        <h2 id="cost-comparison" className="text-xl font-bold text-gray-800">コスト比較</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">運用代行の費用構造</h3>
        <ComparisonTable
          headers={["プラン", "月額費用", "含まれるサービス"]}
          rows={[
            ["ライトプラン", "10〜20万円", "配信代行（月4〜8回）、簡易レポート"],
            ["スタンダードプラン", "20〜35万円", "配信代行＋コンテンツ制作、セグメント設計、月次レポート"],
            ["フルサポートプラン", "35〜50万円", "戦略設計＋配信＋分析＋改善提案＋チャット対応"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">自社運用のコスト構造</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>人件費</strong> — 担当者の工数（週5〜15時間 = 月額換算10〜30万円相当）</li>
          <li><strong>ツール費用</strong> — LINE拡張ツール（月額1〜10万円）</li>
          <li><strong>教育・学習コスト</strong> — 初期の学習期間（1〜3ヶ月は生産性が低い）</li>
          <li><strong>外部セミナー・研修費</strong> — 年間5〜15万円</li>
        </ul>

        <p className="text-sm font-semibold text-gray-600 mb-1">年間コスト比較（概算）</p>
        <BarChart
          data={[
            { label: "自社運用（ミニマム）", value: 180 },
            { label: "運用代行（ライト）", value: 240 },
            { label: "自社運用（本格）", value: 360 },
            { label: "運用代行（フル）", value: 600 },
            { label: "ハイブリッド", value: 300 },
          ]}
          unit="万円"
        />
      </section>

      <section>
        <h2 id="performance-comparison" className="text-xl font-bold text-gray-800">成果の比較</h2>
        <p>コストだけでなく、成果面での比較も重要です。一般的に運用代行の方が立ち上がりは速いですが、中長期では自社運用のほうが高い成果を出すケースも少なくありません。</p>

        <ComparisonTable
          headers={["成果指標", "運用代行", "自社運用"]}
          rows={[
            ["立ち上げ期の成果", "1ヶ月目から成果が出やすい", "3ヶ月目以降に成果が見え始める"],
            ["配信品質", "業界標準以上を安定して確保", "担当者の成長に比例して向上"],
            ["ブランド一貫性", "外部目線のためズレが生じやすい", "ブランドを深く理解した配信が可能"],
            ["改善スピード", "月次レポートベースの改善", "リアルタイムでの改善が可能"],
            ["ノウハウ蓄積", "代行会社に蓄積される", "自社の資産として蓄積"],
          ]}
        />

        <Callout type="success" title="長期的な成果の差">
          自社運用で3年間LINE運用を続けたF社は、最初の半年は代行利用のG社に成果で劣っていましたが、2年目以降はF社が大幅に上回る成果を出しています。ノウハウの蓄積とブランド理解の深さが、長期的な競争優位になりました。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="risk-comparison" className="text-xl font-bold text-gray-800">リスクの比較</h2>

        <ComparisonTable
          headers={["リスク項目", "運用代行のリスク", "自社運用のリスク"]}
          rows={[
            ["人材リスク", "担当者変更で質が低下", "担当者離職で運用停止"],
            ["コスト変動", "代行会社の値上げ", "人件費の上昇・採用コスト"],
            ["情報セキュリティ", "顧客データの外部共有", "社内管理の甘さ"],
            ["契約リスク", "最低契約期間の縛り", "なし"],
            ["品質リスク", "業界理解不足による配信ミス", "ノウハウ不足による配信ミス"],
          ]}
        />

        <Callout type="warning" title="代行利用時の最大リスク">
          運用代行を長期間利用すると、自社にノウハウが蓄積されず「代行なしでは運用できない」状態に陥るリスクがあります。代行利用中もナレッジ共有を徹底し、将来の内製化に備えましょう。
        </Callout>
      </section>

      <section>
        <h2 id="decision-criteria" className="text-xl font-bold text-gray-800">判断基準チェックリスト</h2>
        <p>以下のチェックリストで、自社の状況に最も適した運用形態を判断しましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">運用代行が適しているケース</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>LINE運用の経験者が社内にいない</li>
          <li>短期間で成果を出す必要がある</li>
          <li>月額20万円以上の予算を確保できる</li>
          <li>社内リソースが逼迫しており、新たな業務を追加できない</li>
          <li>まずはプロの運用を見て学びたい</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">自社運用が適しているケース</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>LINE運用に興味・適性のある担当者がいる</li>
          <li>自社のブランドや顧客を深く理解した配信をしたい</li>
          <li>長期的にノウハウを蓄積したい</li>
          <li>外部にコストをかけるより人材に投資したい</li>
          <li>既に他のSNS運用を自社で成功させた実績がある</li>
        </ul>
      </section>

      <section>
        <h2 id="hybrid-model" className="text-xl font-bold text-gray-800">ハイブリッド型という選択肢</h2>
        <p>運用代行と自社運用のいいとこ取りをする「ハイブリッド型」が近年増えています。</p>

        <FlowSteps steps={[
          { title: "戦略設計", desc: "代行会社が配信戦略・セグメント設計・KPI設定を担当" },
          { title: "コンテンツ制作", desc: "自社がブランドを反映したコンテンツを制作。代行が品質チェック" },
          { title: "配信・チャット対応", desc: "日常の配信とチャット対応は自社が担当" },
          { title: "分析・改善提案", desc: "代行会社が月次で分析レポートと改善提案を提供" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">内製化へのロードマップ</h3>
        <FlowSteps steps={[
          { title: "Phase 1（1〜6ヶ月）", desc: "フルサポート代行でノウハウを学ぶ" },
          { title: "Phase 2（7〜12ヶ月）", desc: "ハイブリッド型に移行。配信を自社で担当" },
          { title: "Phase 3（13〜18ヶ月）", desc: "分析・改善も自社で実施。代行はコンサル型に" },
          { title: "Phase 4（19ヶ月〜）", desc: "完全内製化。必要に応じてスポットで代行を活用" },
        ]} />

        <p>自社運用に必要なKPI管理スキルは<Link href="/line/column/line-kpi-dashboard-analytics-guide" className="text-sky-600 underline hover:text-sky-800">LINE分析KPIダッシュボードガイド</Link>で習得できます。ツール選びは<Link href="/line/column/line-tool-selection-5-criteria" className="text-sky-600 underline hover:text-sky-800">LINE運用ツールの選び方</Link>を参考にしてください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 自社の状況に合った最適な運用形態を選ぶ</h2>
        <p>LINE運用代行と自社運用に正解はなく、自社のリソース・予算・目標に応じた最適解を選ぶことが重要です。迷った場合はハイブリッド型からスタートし、段階的に内製化を進めるアプローチが最もリスクが低く、成果も出やすい方法です。</p>

        <StatGrid stats={[
          { value: "10〜50万円", label: "運用代行の月額相場" },
          { value: "3〜6ヶ月", label: "自社運用の立ち上がり期間" },
          { value: "18ヶ月", label: "内製化の目安期間" },
        ]} />

        <p className="mt-4">LINE運用の成功事例を参考にしたい方は<Link href="/line/column/line-sales-3x-5-case-studies" className="text-sky-600 underline hover:text-sky-800">売上3倍の5つの事例</Link>もあわせてご覧ください。</p>
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
    </>
  );
}
