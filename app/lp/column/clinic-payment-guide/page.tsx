import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  ComparisonTable,
  Callout,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-payment-guide")!;

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
  "クリニック向け主要決済手段（Square・GMO・銀行振込）の特徴比較",
  "LINE連携で決済〜領収書発行まで患者側の操作を完結",
  "会計業務の工数を月40時間削減した事例",
  "オンライン決済導入の3ステップ",
];

const toc = [
  { id: "current-issues", label: "クリニック会計業務の現状と課題" },
  { id: "comparison", label: "決済手段の比較 — Square・GMO・銀行振込" },
  { id: "line-flow", label: "LINE連携による決済フローの最適化" },
  { id: "cost-reduction", label: "会計業務の削減効果" },
  { id: "introduction-steps", label: "オンライン決済導入の3ステップ" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニックの会計業務は、窓口精算・銀行振込確認・未収金管理など、スタッフの大きな負担になっています。オンライン決済をLINEと連携することで、<strong>患者はLINE上で決済を完結</strong>でき、クリニック側は<strong>会計業務を月40時間以上削減</strong>できます。本記事では決済手段の比較から導入手順まで解説します。</p>

      {/* ── 現状と課題 ── */}
      <section>
        <h2 id="current-issues" className="text-xl font-bold text-gray-800">クリニック会計業務の現状と課題</h2>
        <p>多くのクリニックでは、会計業務に想像以上の時間とコストがかかっています。オンライン診療の導入費用全般については<Link href="/lp/column/online-medical-cost" className="text-sky-600 underline hover:text-sky-800">オンライン診療の導入費用と運用コスト</Link>で解説しています。</p>

        <FlowSteps steps={[
          { title: "窓口精算の待ち行列", desc: "診察後の会計待ちで患者がストレスを感じる。特に混雑時は10〜20分の待ち時間が発生し、満足度低下の原因に。" },
          { title: "銀行振込の消込作業", desc: "オンライン診療やサプリメント販売の銀行振込は、入金確認と消込が手作業。振込名義と患者名の不一致で確認に時間がかかる。" },
          { title: "未収金の管理と督促", desc: "後払いの未収金率は3〜5%。督促の電話やハガキの発送は心理的負担も大きく、スタッフのモチベーション低下につながる。" },
        ]} />

        <StatGrid stats={[
          { value: "40", unit: "時間/月", label: "会計関連業務の工数" },
          { value: "15", unit: "分", label: "平均会計待ち時間" },
          { value: "3〜5", unit: "%", label: "未収金発生率" },
        ]} />
      </section>

      {/* ── 決済手段比較 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">決済手段の比較 — Square・GMO・銀行振込</h2>
        <p>クリニックで利用可能な主要なオンライン決済手段を比較します。</p>

        <ComparisonTable
          headers={["項目", "Square", "GMO", "銀行振込"]}
          rows={[
            ["初期費用", "無料", "数万円〜", "無料"],
            ["月額費用", "無料", "数千円〜", "無料"],
            ["決済手数料", "3.25%〜", "3.2%〜", "振込手数料のみ"],
            ["入金サイクル", "最短翌営業日", "月1〜2回", "即時"],
            ["LINE連携", "対応", "対応", "手動消込"],
            ["患者の利便性", "高い（カード決済）", "高い（多決済対応）", "低い（振込手続き）"],
            ["導入の簡易さ", "非常に簡単", "やや複雑", "簡単"],
          ]}
        />

        <Callout type="info" title="Squareがおすすめの理由">
          初期費用・月額費用が無料で、入金サイクルも早いSquareは、クリニックのオンライン決済導入に最適です。LINE連携で患者への決済リンク送信も自動化でき、導入のハードルが最も低い選択肢です。
        </Callout>
      </section>

      {/* ── LINE連携フロー ── */}
      <section>
        <h2 id="line-flow" className="text-xl font-bold text-gray-800">LINE連携による決済フローの最適化</h2>
        <p>LINEと決済システムを連携することで、患者とクリニック双方にメリットのある決済フローを構築できます。LINE活用による業務自動化の全体像は<Link href="/lp/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">LINE自動化完全ガイド</Link>でまとめています。</p>

        <FlowSteps steps={[
          { title: "診察完了", desc: "医師が診察を終え、処方・会計情報をシステムに入力。" },
          { title: "決済リンクの自動送信", desc: "LINEで患者に決済リンクを自動送信。患者はLINE上でタップするだけで決済画面に遷移。" },
          { title: "患者が決済完了", desc: "クレジットカードまたはQRコード決済で支払い完了。領収書はLINEで自動送信。" },
          { title: "売上自動記録", desc: "決済完了と同時に売上データが自動記録。入金消込も不要で、会計ソフトとの連携も可能。" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── 削減効果 ── */}
      <section>
        <h2 id="cost-reduction" className="text-xl font-bold text-gray-800">会計業務の削減効果</h2>
        <p>オンライン決済の導入により、クリニックの会計業務は大幅に効率化されます。導入効果の計算方法は<Link href="/lp/column/clinic-line-roi" className="text-sky-600 underline hover:text-sky-800">LINE公式アカウント導入ROI</Link>の記事もご参考ください。</p>

        <StatGrid stats={[
          { value: "85", unit: "%", label: "窓口会計待ち時間削減" },
          { value: "90", unit: "%", label: "銀行振込消込の自動化" },
          { value: "70", unit: "%", label: "未収金率の削減" },
          { value: "40", unit: "時間/月", label: "会計業務の時短効果" },
        ]} />

        <ResultCard
          before="窓口精算・振込確認・未収金管理で月40時間"
          after="LINE決済で会計業務をほぼ自動化"
          metric="スタッフ1人分の業務工数を削減"
          description="空いた時間を患者対応の質向上に"
        />
      </section>

      {/* ── 導入ステップ ── */}
      <section>
        <h2 id="introduction-steps" className="text-xl font-bold text-gray-800">オンライン決済導入の3ステップ</h2>

        <FlowSteps steps={[
          { title: "Step 1: 決済サービスの申し込み", desc: "Squareの場合、オンラインで申し込み後、最短即日で利用開始可能。必要書類は本人確認書類と銀行口座情報のみ。" },
          { title: "Step 2: LINE連携の設定", desc: "Lオペ for CLINICの管理画面からSquare/GMOとの連携を設定。決済リンクの自動送信ルールを設定するだけで準備完了。" },
          { title: "Step 3: スタッフへの周知とテスト", desc: "テスト決済を実施して動作確認。スタッフに新しい会計フローを共有し、患者への案内方法を統一。" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="オンライン決済導入のポイント">
          <ul className="mt-1 space-y-1">
            <li>• Squareなら初期費用・月額費用無料で始められる</li>
            <li>• LINE連携で決済リンク送信から領収書発行まで自動化</li>
            <li>• 会計業務を月40時間削減し、スタッフの負担を大幅軽減</li>
            <li>• 未収金率を70%削減し、キャッシュフローを改善</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、Square・GMO・銀行振込との連携をオールインワンで提供します。LINE上で決済を完結させることで、患者の利便性向上とクリニックの会計業務効率化を同時に実現しましょう。自費診療の売上を伸ばす方法は<Link href="/lp/column/clinic-self-pay-revenue" className="text-sky-600 underline hover:text-sky-800">自費診療売上向上ガイド</Link>、ツール統合によるコスト削減は<Link href="/lp/column/clinic-line-integration-cost-half" className="text-sky-600 underline hover:text-sky-800">LINE統合でコスト半減</Link>もご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
