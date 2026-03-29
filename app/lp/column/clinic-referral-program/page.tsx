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
const self = articles.find((a) => a.slug === "clinic-referral-program")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "クリニックの紹介制度をLINEで仕組み化の効果はどのくらいで実感できますか？", a: "施策にもよりますが、LINE配信やSEO対策は1〜3ヶ月で効果が出始めるケースが多いです。特にセグメント配信は導入直後から開封率・クリック率の改善が見られます。継続的な改善サイクルを回すことで、半年後には大きな成果に繋がります。" },
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
  "紹介制度の設計ポイント（特典設計・紹介条件・医療広告ガイドライン対応）",
  "LINE上のデジタル紹介カードで紹介のハードルを下げる",
  "特典の自動付与と紹介元の追跡管理の仕組み",
  "紹介制度の効果測定とROI算出方法",
];

const toc = [
  { id: "design", label: "紹介制度の設計ポイント" },
  { id: "digital-card", label: "デジタル紹介カードの仕組み" },
  { id: "auto-reward", label: "特典の自動付与と追跡管理" },
  { id: "measurement", label: "効果測定とROI" },
  { id: "compliance", label: "医療広告ガイドラインへの対応" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニックの新患獲得で最も費用対効果が高いのが<strong>患者紹介</strong>です。紹介で来院した患者は定着率が高く、LTVも一般患者の1.5倍以上。しかし多くのクリニックでは紹介制度が「紙のカード」止まりで、追跡も効果測定もできていません。本記事ではLINEを活用して<strong>紹介制度を完全にデジタル化・自動化</strong>する方法を解説します。</p>

      {/* ── 設計 ── */}
      <section>
        <h2 id="design" className="text-xl font-bold text-gray-800">紹介制度の設計ポイント</h2>
        <p>効果的な紹介制度を構築するには、特典の設計・紹介のしやすさ・管理の仕組みの3つを同時に整える必要があります。</p>

        <FlowSteps steps={[
          { title: "特典設計", desc: "紹介者・被紹介者の双方にメリットを提供。クリニックでは「次回診療時の待ち時間優先」「サプリメント割引」「ポイント付与」が効果的。現金還元は医療広告ガイドラインに注意。" },
          { title: "紹介のハードル低減", desc: "紙のカードを渡す→LINEで共有に変更。友人にLINEで紹介リンクを送るだけで完了する仕組みにすることで、紹介率が3倍に。" },
          { title: "追跡と効果測定", desc: "誰が誰を紹介したかを自動で記録。紹介経由の来院数・売上・LTVを計測し、制度の改善に活用。" },
        ]} />

        <StatGrid stats={[
          { value: "1.5", unit: "倍", label: "紹介患者のLTV" },
          { value: "85", unit: "%", label: "紹介患者の定着率" },
          { value: "3", unit: "倍", label: "デジタル化後の紹介率" },
          { value: "¥0", unit: "", label: "広告費" },
        ]} />

        <p>患者LTVの考え方と向上戦略の全体像は<Link href="/lp/column/clinic-patient-ltv" className="text-sky-600 underline hover:text-sky-800">患者LTV向上戦略</Link>で詳しく解説しています。患者離脱を防ぐフォローアップの設計は<Link href="/lp/column/clinic-patient-retention" className="text-sky-600 underline hover:text-sky-800">患者離脱防止ガイド</Link>もあわせてご覧ください。</p>
      </section>

      {/* ── デジタル紹介カード ── */}
      <section>
        <h2 id="digital-card" className="text-xl font-bold text-gray-800">デジタル紹介カードの仕組み</h2>
        <p>LINE上で完結するデジタル紹介カードにより、紹介のハードルを大幅に下げることができます。</p>

        <FlowSteps steps={[
          { title: "リッチメニューから紹介カード発行", desc: "既存患者がLINEのリッチメニューから「友人を紹介する」をタップ。患者固有の紹介コード付きリンクが自動生成される。" },
          { title: "LINEで友人にシェア", desc: "生成された紹介リンクをLINEのトークで友人に送信。紹介カードにはクリニック情報・特典内容・予約リンクが含まれる。" },
          { title: "被紹介者が友だち追加・予約", desc: "紹介リンクからクリニックのLINE公式アカウントを友だち追加。紹介コードが自動で紐づけられ、予約時に特典が適用。" },
          { title: "双方に特典を自動付与", desc: "被紹介者の初回来院が確認された時点で、紹介者・被紹介者の双方にLINEで特典通知を自動配信。" },
        ]} />

        <Callout type="info" title="紙の紹介カードとの決定的な違い">
          紙の紹介カードは「渡すのが面倒」「財布の中で忘れる」「誰が紹介したか追跡できない」という3つの問題があります。LINEのデジタル紹介カードはこれらをすべて解消し、紹介のハードルをゼロに近づけます。
        </Callout>
      </section>

      {/* ── 自動付与・追跡 ── */}
      <section>
        <h2 id="auto-reward" className="text-xl font-bold text-gray-800">特典の自動付与と追跡管理</h2>
        <p>紹介制度の運用で最も手間がかかるのが、特典の付与と紹介元の追跡です。LINEを活用すれば、これらを完全に自動化できます。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>紹介コードの自動生成</strong>：患者ごとに固有の紹介コードを発行。URLパラメータとして埋め込むことで、被紹介者の友だち追加時に自動で紐づけ。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>来院確認の自動トリガー</strong>：被紹介者の初回来院（予約完了または受付チェックイン）をトリガーに、紹介者へLINEで特典通知を自動配信。スタッフの手作業ゼロ。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>ポイント・クーポンの自動付与</strong>：紹介特典をLINEクーポンまたはポイントとして自動付与。有効期限の設定や利用状況の追跡も自動。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><span><strong>紹介ランキングの可視化</strong>：多く紹介してくれる「アンバサダー患者」を特定し、VIP特典を提供。紹介のモチベーションをさらに向上。</span></li>
        </ul>

        <p>LINE友だちを効率的に増やす施策全般については<Link href="/lp/column/clinic-line-friends-growth" className="text-sky-600 underline hover:text-sky-800">LINE友だち集め 月100人増やす7つの施策</Link>もご覧ください。</p>
      </section>

      <InlineCTA />

      {/* ── 効果測定 ── */}
      <section>
        <h2 id="measurement" className="text-xl font-bold text-gray-800">効果測定とROI</h2>
        <p>紹介制度の効果を数値で把握し、継続的に改善するための測定方法を紹介します。</p>

        <ResultCard
          before="紙の紹介カード：月3〜5件の紹介"
          after="LINE紹介制度：月15〜25件の紹介"
          metric="紹介数が5倍に増加"
          description="紹介患者はLTV1.5倍のため、売上へのインパクトは7.5倍相当"
        />

        <StatGrid stats={[
          { value: "20", unit: "件/月", label: "平均紹介数" },
          { value: "75", unit: "%", label: "紹介→来院率" },
          { value: "¥0", unit: "", label: "広告費" },
          { value: "850", unit: "%", label: "紹介制度ROI" },
        ]} />

        <Callout type="success" title="紹介はCPA（患者獲得単価）が最も低い集患方法">
          Web広告の平均CPA（1患者あたりの獲得コスト）が5,000〜15,000円であるのに対し、紹介制度のCPAは特典コストのみで500〜2,000円程度。費用対効果は5〜10倍です。
        </Callout>
      </section>

      {/* ── ガイドライン対応 ── */}
      <section>
        <h2 id="compliance" className="text-xl font-bold text-gray-800">医療広告ガイドラインへの対応</h2>
        <p>紹介制度を運用する際は、医療広告ガイドラインに準拠した設計が必要です。以下のポイントを押さえましょう。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>現金還元の回避</strong>：患者への現金還元は「紹介料」とみなされるリスクがあるため、ポイント・クーポン・サービス特典が安全。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>誇大表現の禁止</strong>：紹介カード内に「最高の治療」「必ず治る」などの表現を使わない。客観的な情報のみ記載。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>口コミ誘導との線引き</strong>：紹介制度はあくまで「友人への紹介」であり、Google口コミの投稿を条件にした特典付与は避ける。</span></li>
        </ul>

        <p>Google口コミ対策の正しい運用方法については<Link href="/lp/column/clinic-google-review" className="text-sky-600 underline hover:text-sky-800">Google口コミ対策のLINE活用</Link>で解説しています。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="紹介制度のLINE仕組み化ポイント">
          <ul className="mt-1 space-y-1">
            <li>紹介患者はLTV1.5倍・定着率85%。最も費用対効果の高い集患方法</li>
            <li>LINEのデジタル紹介カードで紹介のハードルをゼロに。紹介数は5倍に</li>
            <li>特典の自動付与・紹介元の追跡を完全自動化。スタッフの手作業ゼロ</li>
            <li>医療広告ガイドラインに準拠した特典設計で安全に運用</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、デジタル紹介カード・特典自動付与・紹介追跡ダッシュボードを<Link href="/lp/features" className="text-sky-600 underline hover:text-sky-800">標準搭載</Link>したクリニック専用LINE運用プラットフォームです。紹介制度のデジタル化で、広告費ゼロの口コミ集患を実現します。季節ごとのキャンペーン設計については<Link href="/lp/column/clinic-seasonal-campaign" className="text-sky-600 underline hover:text-sky-800">季節別LINE配信戦略</Link>もあわせてご覧ください。</p>
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
