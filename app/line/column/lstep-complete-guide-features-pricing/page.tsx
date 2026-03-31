import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  ComparisonTable,
  FlowSteps,
  BarChart,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "lstep-complete-guide-features-pricing")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "Lステップは初心者でも使えますか？", a: "基本機能（シナリオ配信・タグ管理等）は直感的に操作できますが、高度な機能（クロス分析・流入経路分析等）は学習コストがあります。公式の動画チュートリアルやサポートを活用すれば、2〜4週間で基本操作を習得できます。" },
  { q: "Lステップの解約に違約金はありますか？", a: "Lステップは月額制で、最低利用期間は初回契約時の1ヶ月間のみです。2ヶ月目以降はいつでも解約可能で、違約金は発生しません。ただし年払いの場合は返金されないため注意が必要です。" },
  { q: "Lステップとエルメはどちらがおすすめですか？", a: "友だち数が少なくコストを抑えたい場合はエルメの無料プラン、本格的なシナリオ配信や詳細な分析をしたい場合はLステップが向いています。どちらも無料トライアルがあるため、実際に触って比較することをおすすめします。" },
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
  "Lステップの全機能を料金プラン別に徹底解説",
  "導入前に知っておくべきメリット・デメリットを整理",
  "他ツールとの違いと最適な導入タイミングを紹介",
];

const toc = [
  { id: "overview", label: "Lステップとは" },
  { id: "pricing", label: "料金プラン詳細" },
  { id: "core-features", label: "コア機能の解説" },
  { id: "advanced-features", label: "上位プラン限定機能" },
  { id: "pros-cons", label: "メリット・デメリット" },
  { id: "use-cases", label: "活用事例" },
  { id: "vs-others", label: "他ツールとの比較" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ツール比較・選定" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">Lステップは<strong>累計導入数No.1</strong>のLINE拡張ツールで、シナリオ配信・セグメント管理・流入経路分析など、LINE公式アカウントだけでは実現できない高度なマーケティング機能を提供します。本記事では<strong>料金プラン・全機能・メリット&デメリット</strong>を網羅的に解説し、導入すべきかの判断材料を提供します。</p>

      {/* ── Lステップとは ── */}
      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">Lステップとは</h2>
        <p>Lステップは、株式会社Maneqlが提供するLINE公式アカウント専用のマーケティングツールです。LINE Messaging APIと連携し、標準機能では不可能なシナリオ配信、細かいセグメント管理、流入経路分析などを実現します。</p>

        <StatGrid stats={[
          { value: "30,000", unit: "+", label: "累計導入アカウント数" },
          { value: "2,980", unit: "円/月〜", label: "最低月額料金" },
          { value: "200", unit: "+", label: "連携可能な機能" },
          { value: "30", unit: "日", label: "無料トライアル期間" },
        ]} />
      </section>

      {/* ── 料金プラン ── */}
      <section>
        <h2 id="pricing" className="text-xl font-bold text-gray-800">料金プラン詳細</h2>

        <ComparisonTable
          headers={["比較項目", "スタートプラン", "スタンダードプラン", "プロプラン"]}
          rows={[
            ["月額料金", "2,980円", "21,780円", "32,780円"],
            ["月間配信数", "〜1,000通", "〜15,000通", "〜45,000通"],
            ["シナリオ配信", true, true, true],
            ["セグメント配信", true, true, true],
            ["リッチメニュー切替", true, true, true],
            ["回答フォーム", true, true, true],
            ["流入経路分析", false, true, true],
            ["クロス分析", false, false, true],
            ["スタッフ権限管理", false, true, true],
            ["API連携", false, false, true],
          ]}
        />

        <BarChart
          data={[
            { label: "スタートプラン", value: 2980, color: "#22c55e" },
            { label: "スタンダードプラン", value: 21780, color: "#3b82f6" },
            { label: "プロプラン", value: 32780, color: "#a855f7" },
          ]}
          unit="円/月"
        />

        <Callout type="info" title="30日間無料トライアルあり">
          すべてのプランで30日間の無料トライアルが利用可能です。まずはスタートプランで試し、機能不足を感じたらアップグレードを検討しましょう。
        </Callout>
      </section>

      {/* ── コア機能 ── */}
      <section>
        <h2 id="core-features" className="text-xl font-bold text-gray-800">全プラン共通のコア機能</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">シナリオ配信（ステップ配信）</h3>
        <p>友だち追加後に時系列でメッセージを自動配信する機能。教育・信頼構築・セールスの流れを自動化でき、営業工数の大幅削減が可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">セグメント管理</h3>
        <p>タグ・属性・行動データでユーザーを分類し、ターゲットを絞った配信が可能。一斉配信に比べて開封率・CVR・ブロック率のすべてが改善します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リッチメニュー切替</h3>
        <p>ユーザーの状態（タグ・購入履歴等）に応じてリッチメニューを動的に変更。見込み客と既存客で異なるメニューを表示するなど、パーソナライズされたUI提供が可能です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">回答フォーム</h3>
        <p>LINE内で完結するアンケート・申込みフォーム。回答データはタグとして保存され、セグメント配信の条件として即座に活用できます。</p>
      </section>

      <InlineCTA />

      {/* ── 上位プラン ── */}
      <section>
        <h2 id="advanced-features" className="text-xl font-bold text-gray-800">上位プラン限定の高度機能</h2>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>流入経路分析（スタンダード〜）</strong>: どのQRコード・URLから友だち追加されたかを追跡。広告やキャンペーンの効果測定に必須の機能です。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>クロス分析（プロ〜）</strong>: 複数の条件を掛け合わせた高度な分析。「20代×女性×購入者」のような多軸でのデータ分析が可能です。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>スタッフ権限管理（スタンダード〜）</strong>: 複数スタッフでの運用時に、閲覧・編集・配信などの権限を細かく設定できます。</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>API連携（プロ〜）</strong>: 外部システム（CRM・EC等）とのデータ連携が可能。顧客管理の一元化を実現します。</li>
        </ul>
      </section>

      {/* ── メリ・デメ ── */}
      <section>
        <h2 id="pros-cons" className="text-xl font-bold text-gray-800">Lステップのメリット・デメリット</h2>

        <ComparisonTable
          headers={["", "メリット", "デメリット"]}
          rows={[
            ["導入実績", "累計30,000件超で安心感", "—"],
            ["情報量", "書籍・動画・記事が豊富", "情報が多すぎて取捨選択が必要"],
            ["機能", "必要な機能はほぼ揃う", "高機能ゆえに学習コストが高い"],
            ["料金", "スタートプランは安価", "本格運用にはスタンダード以上が必要"],
            ["サポート", "公式サポート・コミュニティ", "電話サポートは上位プランのみ"],
          ]}
        />
      </section>

      {/* ── 活用事例 ── */}
      <section>
        <h2 id="use-cases" className="text-xl font-bold text-gray-800">Lステップの活用事例</h2>

        <ResultCard
          before="一斉配信のみで低いCVR"
          after="シナリオ配信でCVR3倍"
          metric="ECサイトの導入事例"
          description="友だち追加→商品紹介→レビュー配信→クーポン配信の4ステップで購入率が大幅向上"
        />

        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>飲食店</strong>: 来店後のフォロー配信でリピート率を30%向上</li>
          <li><strong>美容サロン</strong>: 予約リマインド+施術後フォローで無断キャンセル50%削減</li>
          <li><strong>ECサイト</strong>: カゴ落ちリマインド+レビュー配信で購入率3倍</li>
          <li><strong>教育・スクール</strong>: 体験申込→入会シナリオで入会率を2倍に</li>
        </ul>
      </section>

      {/* ── 他ツール比較 ── */}
      <section>
        <h2 id="vs-others" className="text-xl font-bold text-gray-800">他ツールとの比較</h2>
        <p>Lステップと他の主要ツールの違いをまとめます。全ツールの詳細比較は<Link href="/line/column/line-extension-tool-comparison-2026" className="text-sky-600 underline hover:text-sky-800">LINE拡張ツール比較2026年版</Link>をご覧ください。</p>

        <ComparisonTable
          headers={["比較項目", "Lステップ", "エルメ", "プロラインフリー"]}
          rows={[
            ["月額最安", "2,980円", "0円", "0円"],
            ["導入実績", "最多", "増加中", "少なめ"],
            ["機能の充実度", "非常に高い", "高い", "普通"],
            ["学習コスト", "やや高い", "普通", "低い"],
            ["サポート", "充実", "普通", "限定的"],
          ]}
        />

        <p>エルメの詳細については<Link href="/line/column/elme-line-tool-review-features" className="text-sky-600 underline hover:text-sky-800">エルメ徹底レビュー</Link>をご覧ください。</p>
      </section>

      {/* クリニック向け誘導 */}
      <div className="my-8 rounded-xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-sky-50 p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">C</span>
          <span className="text-[14px] font-bold text-blue-800">クリニック・医療機関の方へ</span>
        </div>
        <p className="text-[13px] text-slate-600 leading-relaxed">
          Lステップは汎用性が高い一方、クリニックの業務フローには専用設計の<Link href="/clinic" className="text-blue-600 font-bold underline">Lオペ for CLINIC</Link>が最適です。予約・問診・AI自動返信を1つのプラットフォームで完結できます。
          <Link href="/clinic/column/lope-complete-introduction" className="text-blue-600 underline ml-1">Lオペ導入ガイドを見る →</Link>
        </p>
      </div>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="Lステップ導入のポイント">
          <ul className="mt-1 space-y-1">
            <li>・LINE拡張ツールの定番で導入実績No.1</li>
            <li>・スタートプラン2,980円/月から始められる</li>
            <li>・シナリオ配信・セグメント・リッチメニュー切替が全プラン対応</li>
            <li>・高度な分析機能はスタンダード以上が必要</li>
            <li>・30日間無料トライアルでリスクなく試せる</li>
          </ul>
        </Callout>

        <p>Lステップは機能が豊富な分、学習コストもあります。まずは無料トライアルで基本機能を試してみましょう。ツール選定の判断基準は<Link href="/line/column/line-tool-selection-5-criteria" className="text-sky-600 underline hover:text-sky-800">LINE運用ツール選び方5つの基準</Link>で詳しく解説しています。</p>
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
  );
}
