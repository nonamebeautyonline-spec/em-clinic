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
const self = articles.find((a) => a.slug === "clinic-patient-retention")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "クリニックの患者離脱を防ぐの効果はどのくらいで実感できますか？", a: "施策にもよりますが、LINE配信やSEO対策は1〜3ヶ月で効果が出始めるケースが多いです。特にセグメント配信は導入直後から開封率・クリック率の改善が見られます。継続的な改善サイクルを回すことで、半年後には大きな成果に繋がります。" },
  { q: "集患施策にかかるコストはどのくらいですか？", a: "LINE公式アカウント自体は無料で開設でき、月額5,000〜15,000円程度で配信が可能です。Web広告と比較してCPA（獲得単価）が低く、既存患者のリピート促進にも効果的なため、費用対効果は非常に高いです。" },
  { q: "Web広告とLINE配信はどちらが効果的ですか？", a: "新規集患にはWeb広告、リピート促進にはLINE配信が効果的です。LINE配信はメッセージ開封率90%と圧倒的なリーチ力を持ち、既存患者への再来院促進・自費診療の訴求に適しています。両方を組み合わせるのが最も効率的です。" },
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
  "患者が離脱しやすい3つのタイミングとその原因",
  "LINEフォローアップの自動化で離脱率を30%削減",
  "再来院促進キャンペーンの設計と実行方法",
  "離脱率の計測と改善のPDCAサイクル",
];

const toc = [
  { id: "timing", label: "患者が離脱しやすい3つのタイミング" },
  { id: "auto-followup", label: "フォローアップの自動化" },
  { id: "campaign", label: "再来院促進キャンペーンの設計" },
  { id: "measurement", label: "離脱率の計測方法" },
  { id: "case-study", label: "離脱防止の成功事例" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニック経営において、<strong>新規患者の獲得コストは既存患者の維持コストの5倍</strong>かかると言われています。つまり、既存患者の離脱を防ぐことが経営安定の最短ルートです。LINEのフォローアップ自動化を活用すれば、<strong>離脱率を30%以上削減</strong>し、継続通院を促進できます。</p>

      {/* ── 離脱タイミング ── */}
      <section>
        <h2 id="timing" className="text-xl font-bold text-gray-800">患者が離脱しやすい3つのタイミング</h2>
        <p>患者の離脱には明確なパターンがあります。タイミングを把握し、先手を打つことが離脱防止の鍵です。セグメント配信の活用方法は<Link href="/clinic/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">LINEセグメント配信でリピート率を向上させる方法</Link>でも解説しています。</p>

        <FlowSteps steps={[
          { title: "初診後1〜2週間", desc: "初診後のフォローがないと「放置されている」と感じて他院に流れる。特に初診で不安を感じた患者は、次回予約を取らずに離脱しやすい。離脱率：約25%。" },
          { title: "治療完了直後", desc: "症状が改善すると通院の必要性を感じなくなる。定期検診や予防治療の重要性を伝えないと、次に症状が出るまで来院しない。離脱率：約40%。" },
          { title: "3ヶ月以上の来院間隔", desc: "前回の来院から3ヶ月以上空くと、クリニックの存在が記憶から薄れる。再来院のきっかけがないまま、他の選択肢に流れてしまう。離脱率：約60%。" },
        ]} />

        <StatGrid stats={[
          { value: "25", unit: "%", label: "初診後1〜2週間の離脱率" },
          { value: "40", unit: "%", label: "治療完了直後の離脱率" },
          { value: "60", unit: "%", label: "3ヶ月超未来院の離脱率" },
        ]} />
      </section>

      {/* ── フォローアップ自動化 ── */}
      <section>
        <h2 id="auto-followup" className="text-xl font-bold text-gray-800">フォローアップの自動化</h2>
        <p>LINEのステップ配信機能を使えば、来院後のフォローアップを完全に自動化できます。患者のLTV向上戦略の全体像は<Link href="/clinic/column/clinic-patient-ltv" className="text-sky-600 underline hover:text-sky-800">患者LTV向上戦略</Link>をご覧ください。</p>

        <FlowSteps steps={[
          { title: "来院当日: お礼メッセージ", desc: "「本日はご来院ありがとうございました。お薬の飲み方でご不明な点がございましたら、こちらからお気軽にお問い合わせください」と自動送信。患者に安心感を与える。" },
          { title: "来院3日後: 経過確認", desc: "「治療後のご体調はいかがですか？気になる症状がございましたらお気軽にご連絡ください」と経過確認。患者の不安を早期に解消し、信頼関係を構築。" },
          { title: "来院2週間後: 次回予約の案内", desc: "「次回の診察時期が近づいています。LINEからいつでもご予約いただけます」と次回予約を促進。ワンタップで予約画面に遷移するボタンを設置。" },
          { title: "来院1ヶ月後: 健康情報の配信", desc: "患者の疾患に関連する健康情報やセルフケアのヒントを配信。「売り込み」ではなく「役立つ情報」でクリニックとの接点を維持。" },
        ]} />

        <Callout type="info" title="自動化のポイントは「パーソナライズ」">
          全患者に同じメッセージを送るのではなく、診療科目・年齢・通院歴に応じてメッセージを出し分けることで、開封率・反応率が大幅に向上します。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── 再来院キャンペーン ── */}
      <section>
        <h2 id="campaign" className="text-xl font-bold text-gray-800">再来院促進キャンペーンの設計</h2>
        <p>一定期間来院していない患者に対する再来院促進キャンペーンは、離脱防止の切り札です。NPS調査を組み合わせて満足度も可視化する方法は<Link href="/clinic/column/clinic-nps-survey" className="text-sky-600 underline hover:text-sky-800">NPS調査導入ガイド</Link>で紹介しています。</p>

        <FlowSteps steps={[
          { title: "対象セグメントの設定", desc: "「最終来院日から60日以上経過」「治療完了済み」などの条件で対象患者を自動抽出。手動でのリスト作成は不要。" },
          { title: "メッセージの設計", desc: "「お久しぶりです。定期検診の時期です」など、患者の状況に合わせた自然なメッセージを設計。押し売り感のない表現がポイント。" },
          { title: "インセンティブの付与", desc: "再来院特典として「初回検査無料」「次回診察料10%OFF」などのクーポンをLINE上で配布。来院のきっかけを作る。" },
          { title: "効果測定と改善", desc: "キャンペーンごとに再来院率・予約CV率を計測。メッセージの文面やタイミングを改善しながらPDCAを回す。" },
        ]} />
      </section>

      {/* ── 離脱率の計測 ── */}
      <section>
        <h2 id="measurement" className="text-xl font-bold text-gray-800">離脱率の計測方法</h2>
        <p>離脱防止策の効果を正しく評価するには、離脱率を定量的に計測することが不可欠です。</p>

        <FlowSteps steps={[
          { title: "離脱の定義を決める", desc: "「最終来院日から90日以上経過した患者」など、自院に合った離脱の定義を設定。診療科目によって適切な期間は異なる。" },
          { title: "月次の離脱率を算出", desc: "離脱率 = 離脱患者数 / アクティブ患者数 x 100。月次で推移を追跡し、施策の効果を確認。" },
          { title: "コホート分析で傾向を把握", desc: "初診月別にグループ化し、何ヶ月後にどの程度離脱するかを分析。離脱が多い時期にフォローアップを強化。" },
        ]} />

        <StatGrid stats={[
          { value: "30", unit: "%", label: "フォローアップによる離脱率削減" },
          { value: "2.5", unit: "倍", label: "再来院キャンペーンのROI" },
          { value: "15", unit: "%", label: "年間売上への寄与" },
        ]} />
      </section>

      {/* ── 成功事例 ── */}
      <section>
        <h2 id="case-study" className="text-xl font-bold text-gray-800">離脱防止の成功事例</h2>
        <p>LINEフォローアップの自動化を導入したクリニックの成果を紹介します。</p>

        <ResultCard
          before="年間離脱率45%・再来院施策なし"
          after="年間離脱率18%・自動フォローアップ稼働"
          metric="離脱率を60%削減、年間売上15%向上"
          description="自動フォローアップの導入で患者維持率が大幅改善"
        />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="患者離脱防止のポイント">
          <ul className="mt-1 space-y-1">
            <li>• 初診後・治療完了後・3ヶ月超未来院の3つが離脱の山場</li>
            <li>• LINEステップ配信で来院後のフォローアップを完全自動化</li>
            <li>• セグメント抽出 + クーポン配信で再来院を促進</li>
            <li>• 離脱率を月次で計測し、PDCAサイクルで継続改善</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、患者フォローアップの自動化・セグメント配信・離脱率分析をオールインワンで提供します。既存患者の維持に注力し、安定したクリニック経営を実現しましょう。LINE自動化の詳しい設定方法は<Link href="/clinic/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">LINE自動化ガイド</Link>、リピート率改善の具体策は<Link href="/clinic/column/clinic-repeat-rate-improvement" className="text-sky-600 underline hover:text-sky-800">リピート率改善ガイド</Link>もあわせてご覧ください。</p>
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
