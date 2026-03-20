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
const self = articles.find((a) => a.slug === "clinic-line-roi")!;

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
  "LINE導入にかかるコストの内訳と相場を解説",
  "削減される業務時間を人件費に換算して定量化",
  "売上増加効果の試算方法（新患獲得・リピート率向上）",
  "ROI計算の具体的なフレームワークと事例",
];

const toc = [
  { id: "why-roi", label: "なぜROI計算が必要なのか" },
  { id: "cost-breakdown", label: "LINE導入コストの内訳" },
  { id: "time-saving", label: "削減される業務時間の算出" },
  { id: "revenue-increase", label: "売上増加効果の試算" },
  { id: "roi-calculation", label: "ROI計算のフレームワーク" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニックにLINE公式アカウントを導入する際、「費用対効果は本当にあるのか？」と悩む院長は少なくありません。本記事では、導入コスト・削減される業務時間・増加する売上を<strong>定量的に算出する方法</strong>を解説し、<strong>ROI（投資対効果）を数値で判断</strong>できるフレームワークを提供します。</p>

      {/* ── なぜROI ── */}
      <section>
        <h2 id="why-roi" className="text-xl font-bold text-gray-800">なぜROI計算が必要なのか</h2>
        <p>クリニック経営においてDXツールの導入は「なんとなく良さそう」で進めるべきではありません。投資判断を数値で行うことで、導入後の効果測定も可能になります。業務効率化の全体像は<Link href="/lp/column/busy-doctor-efficiency" className="text-sky-600 underline hover:text-sky-800">開業医の業務効率化方法</Link>で解説しています。</p>

        <FlowSteps steps={[
          { title: "投資判断の根拠を明確化", desc: "「月額○万円で○時間の業務削減」と定量化することで、スタッフへの説明や税理士との相談がスムーズになる。" },
          { title: "効果測定の基準を設定", desc: "導入前にKPIを設定しておけば、3か月後・6か月後に「投資は回収できているか」を客観的に評価できる。" },
          { title: "追加投資の判断材料に", desc: "基本機能で効果が出れば、AIオプションやメッセージ通数の追加など、段階的な投資判断がしやすくなる。" },
        ]} />

        <Callout type="info" title="ROI計算は「完璧」でなくてよい">
          ROI計算は厳密な数値でなくても、概算で十分に意思決定の助けになります。重要なのは「コスト」と「効果」を分けて考え、数字で議論できる状態にすることです。
        </Callout>
      </section>

      {/* ── コスト内訳 ── */}
      <section>
        <h2 id="cost-breakdown" className="text-xl font-bold text-gray-800">LINE導入コストの内訳</h2>
        <p>LINE公式アカウントの導入コストは、初期費用と月額費用に分かれます。クリニック専用ツールと汎用ツールでは費用構造が異なるため、ツール比較については<Link href="/lp/column/lstep-vs-clinic-tool" className="text-sky-600 underline hover:text-sky-800">Lステップ vs クリニック専用ツール比較</Link>も参照してください。</p>

        <StatGrid stats={[
          { value: "33", unit: "万円〜", label: "初期構築費用" },
          { value: "7.2", unit: "万円/月〜", label: "月額利用料" },
          { value: "0.44", unit: "万円/月〜", label: "メッセージ通数" },
          { value: "2.2", unit: "万円/月", label: "AIオプション" },
        ]} />

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>初期費用</strong>: LINE公式アカウントの初期構築・リッチメニュー作成・データ移行（33〜55万円）</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>月額基本料</strong>: システム利用料。プランにより7.2〜12.1万円/月</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>メッセージ通数</strong>: 配信数に応じた従量課金。5,000通で0.44万円/月〜</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>オプション</strong>: AI自動返信（2.2万円/月）、音声カルテ（1.65万円/月）など</li>
        </ul>

        <Callout type="info" title="初期費用は6〜12か月で按分して計算">
          ROI計算では、初期費用を導入後の運用期間（通常6〜12か月）で按分するのが一般的です。例えば初期費用33万円を12か月で割ると月額約2.75万円。月額基本料と合計した実質月額コストで判断しましょう。
        </Callout>
      </section>

      {/* ── 業務時間削減 ── */}
      <section>
        <h2 id="time-saving" className="text-xl font-bold text-gray-800">削減される業務時間の算出</h2>
        <p>LINE導入による最大の効果は、スタッフの業務時間削減です。削減時間を人件費に換算することで、コスト削減額を定量化できます。</p>

        <FlowSteps steps={[
          { title: "電話対応の削減", desc: "LINE予約・問い合わせにより電話対応が70〜90%削減。1日2時間の電話対応が30分以下に。時給1,200円×1.5h×25日＝月45,000円の削減。" },
          { title: "予約管理の効率化", desc: "手書きの予約台帳やExcel管理がLINE予約に置き換わり、ダブルブッキングや転記ミスが解消。月15時間の削減で月18,000円。" },
          { title: "問診の自動化", desc: "紙の問診票の記入依頼・回収・データ入力がLINE問診に置き換わり、1患者あたり5分の削減。月100人で約8時間、月10,000円の削減。" },
          { title: "リマインド業務の自動化", desc: "前日の確認電話やDMハガキの作成・発送が不要に。月10時間の削減で月12,000円。" },
        ]} />

        <ResultCard
          before="月間85,000円分の人件費"
          after="LINE自動化で月間0円"
          metric="月額85,000円の業務コスト削減"
          description="削減された時間を患者対応や新規施策に充当"
        />
      </section>

      <InlineCTA />

      {/* ── 売上増加 ── */}
      <section>
        <h2 id="revenue-increase" className="text-xl font-bold text-gray-800">売上増加効果の試算</h2>
        <p>コスト削減に加えて、LINE導入による売上増加効果も重要なROI要素です。KPIの管理方法については<Link href="/lp/column/clinic-kpi-dashboard" className="text-sky-600 underline hover:text-sky-800">LINEダッシュボードで見るべきKPI7選</Link>を参考にしてください。</p>

        <StatGrid stats={[
          { value: "20", unit: "%", label: "リピート率の向上幅" },
          { value: "30", unit: "%", label: "無断キャンセルの削減" },
          { value: "15", unit: "%", label: "新患獲得の増加" },
          { value: "25", unit: "%", label: "自費診療の売上増加" },
        ]} />

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>リピート率向上</strong>: セグメント配信で再来院を促進。月間リピート患者が20人増加 × 平均診療単価5,000円＝月10万円</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>無断キャンセル削減</strong>: リマインド配信で月間10枠を回収。10枠 × 5,000円＝月5万円</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>新患獲得</strong>: LINE友だち経由の新規来院。月間5人増加 × 初回単価8,000円＝月4万円</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>自費診療の増加</strong>: 自費メニューの配信で認知度向上。月間3件増加 × 平均2万円＝月6万円</li>
        </ul>

        <ResultCard
          before="売上増加効果: 0円"
          after="LINE活用で月間25万円の売上増"
          metric="年間300万円の売上増加効果"
          description="コスト削減と売上増加の両面でROIが成立"
        />
      </section>

      {/* ── ROI計算 ── */}
      <section>
        <h2 id="roi-calculation" className="text-xl font-bold text-gray-800">ROI計算のフレームワーク</h2>
        <p>これまでの数値をもとに、ROIを算出します。ROI＝（効果 − コスト）÷ コスト × 100 で計算します。</p>

        <Callout type="success" title="ROI計算例（スタンダードプランの場合）">
          <ul className="mt-1 space-y-1">
            <li>・<strong>月額コスト</strong>: 基本料7.15万円 + 通数0.44万円 + 初期按分2.75万円 ＝ 約10.3万円/月</li>
            <li>・<strong>コスト削減効果</strong>: 8.5万円/月（人件費削減）</li>
            <li>・<strong>売上増加効果</strong>: 25万円/月</li>
            <li>・<strong>総効果</strong>: 33.5万円/月</li>
            <li>・<strong>ROI</strong>:（33.5 − 10.3）÷ 10.3 × 100 ＝ <strong>225%</strong></li>
          </ul>
        </Callout>

        <StatGrid stats={[
          { value: "225", unit: "%", label: "ROI（投資対効果）" },
          { value: "3.3", unit: "倍", label: "投資回収倍率" },
          { value: "2", unit: "か月", label: "初期費用の回収期間" },
          { value: "33.5", unit: "万円/月", label: "総効果額" },
        ]} />

        <p>上記は保守的な試算です。友だち数が増えるほど配信効果は向上し、AI自動返信の学習が進むほど対応品質も上がるため、ROIは時間とともに改善していきます。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="LINE導入ROI計算のポイント">
          <ul className="mt-1 space-y-1">
            <li>・コストは「初期費用の按分 + 月額費用」で月額換算して比較</li>
            <li>・効果は「コスト削減」と「売上増加」の2軸で算出</li>
            <li>・保守的に見積もってもROI 225%、投資回収倍率3.3倍</li>
            <li>・初期費用は2か月以内に回収可能な水準</li>
          </ul>
        </Callout>

        <p>LINE導入のROIは、クリニックの規模や診療科によって異なりますが、多くの場合3か月以内に初期投資を回収できます。Lオペ for CLINICでは、導入前の無料相談で貴院に合わせたROI試算をお出ししています。まずは<Link href="/lp/column/busy-doctor-efficiency" className="text-sky-600 underline hover:text-sky-800">業務効率化の全体像</Link>を把握した上で、具体的な投資判断を進めてみてはいかがでしょうか。</p>
      </section>
    </ArticleLayout>
  );
}
