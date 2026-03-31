import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, BarChart, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-rich-menu-design-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "リッチメニューは何分割がベストですか？", a: "サロンには6分割（2行×3列）が最もおすすめです。予約・クーポン・メニュー・スタッフ紹介・スタンプカード・アクセスの6要素をバランスよく配置できます。3分割でもOKですが、情報量が限られます。" },
  { q: "リッチメニューのデザインは自分で作れますか？", a: "Canvaなどの無料ツールで作成可能です。LINE公式のテンプレート画像をベースに、サロンのブランドカラーとロゴを配置するだけでも十分なクオリティになります。" },
  { q: "リッチメニューの切り替えは効果がありますか？", a: "はい、会員ランクや来店状況に応じてリッチメニューを切り替えることで、パーソナライズされた体験を提供できます。新規客には「初回クーポン」、常連客には「VIP限定メニュー」を表示するなどの活用が可能です。" },
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
  "予約率を2倍にするリッチメニューのデザイン原則",
  "サロンに最適な6分割レイアウトとボタン配置",
  "会員ランク別のリッチメニュー切り替え戦略",
];

const toc = [
  { id: "importance", label: "リッチメニューが予約率を左右する理由" },
  { id: "layout", label: "サロンに最適なレイアウト設計" },
  { id: "button-placement", label: "ボタン配置の優先順位" },
  { id: "design-principles", label: "デザインの4原則" },
  { id: "switching", label: "リッチメニューの切り替え戦略" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="リッチメニュー設計ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">リッチメニューはLINE公式アカウントの<strong>「顔」</strong>であり、お客様が最も頻繁にタップする要素です。適切に設計するだけで予約率が<strong>2倍</strong>になるケースも珍しくありません。</p>

      <section>
        <h2 id="importance" className="text-xl font-bold text-gray-800">リッチメニューが予約率を左右する理由</h2>

        <StatGrid stats={[
          { value: "70%", label: "リッチメニュー経由のアクション率" },
          { value: "2倍", label: "適切な設計による予約率の改善幅" },
          { value: "3秒", label: "お客様がタップを判断するまでの時間" },
        ]} />

        <p>リッチメニューはトーク画面の下半分を占め、お客様がLINEを開くたびに目に入ります。ここから予約・クーポン・アクセス情報に1タップでアクセスできるかどうかが、アクション率を大きく左右します。</p>
      </section>

      <section>
        <h2 id="layout" className="text-xl font-bold text-gray-800">サロンに最適なレイアウト設計</h2>

        <ComparisonTable
          headers={["レイアウト", "分割数", "向いているケース"]}
          rows={[
            ["大2分割", "2", "予約ボタンに集中させたいシンプル運用"],
            ["大3分割", "3", "予約・クーポン・アクセスの3要素に絞りたい場合"],
            ["6分割（推奨）", "6", "予約・クーポン・メニュー・スタッフ等を網羅"],
            ["上1＋下3", "4", "メイン画像＋3ボタンのバランス型"],
          ]}
        />

        <Callout type="success" title="6分割が最も汎用性が高い">
          サロンの基本要素（予約・クーポン・メニュー・スタッフ・スタンプカード・アクセス）を過不足なく配置できる6分割が最も推奨されます。
        </Callout>
      </section>

      <section>
        <h2 id="button-placement" className="text-xl font-bold text-gray-800">ボタン配置の優先順位</h2>
        <p>タップ率が高いのは<strong>左上と左下</strong>です。最も重要なアクション（予約）を左上に配置しましょう。</p>

        <BarChart
          data={[
            { label: "左上（予約）", value: 35, color: "#22c55e" },
            { label: "右上（クーポン）", value: 22, color: "#3b82f6" },
            { label: "左下（メニュー）", value: 18, color: "#f59e0b" },
            { label: "右下（スタンプ）", value: 12, color: "#a855f7" },
            { label: "中央上（スタッフ）", value: 8, color: "#ec4899" },
            { label: "中央下（アクセス）", value: 5, color: "#06b6d4" },
          ]}
          unit="%"
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="design-principles" className="text-xl font-bold text-gray-800">デザインの4原則</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 視認性：一目で内容がわかる</h3>
        <p>各ボタンにはアイコン＋テキストを配置。アイコンだけ・テキストだけよりも理解速度が速くなります。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. 統一感：サロンのブランドカラーで統一</h3>
        <p>背景色・ボタン色をサロンのブランドカラーに合わせ、プロフェッショナルな印象を演出します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. コントラスト：タップ可能であることが明確</h3>
        <p>ボタン部分と背景のコントラストを強くし、「押せる」ことが直感的にわかるデザインにします。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">4. シンプルさ：情報を詰め込みすぎない</h3>
        <p>1ボタンにつき情報は1つ。「予約」「クーポン」のように単純明快なラベルを付けましょう。</p>
      </section>

      <section>
        <h2 id="switching" className="text-xl font-bold text-gray-800">リッチメニューの切り替え戦略</h2>

        <FlowSteps steps={[
          { title: "新規客向けメニュー", desc: "初回クーポン・メニュー紹介・スタッフ紹介を前面に" },
          { title: "リピーター向けメニュー", desc: "予約・スタンプカード・VIP特典を前面に" },
          { title: "季節イベント時", desc: "キャンペーンバナーを大きく表示し、期間限定感を演出" },
        ]} />

        <p>業態別のテンプレートは<Link href="/salon/column/salon-rich-menu-templates-by-industry" className="text-blue-600 underline">業態別リッチメニューテンプレート</Link>、A/Bテストの方法は<Link href="/salon/column/salon-rich-menu-ab-test-guide" className="text-blue-600 underline">リッチメニューA/Bテストガイド</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>

        <ResultCard before="15件/月" after="30件/月" metric="リッチメニュー経由の予約数" description="レイアウト最適化とボタン配置の改善で2倍に" />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>6分割レイアウトが最も汎用的</strong> — 予約・クーポン・メニュー・スタッフ・スタンプ・アクセス</li>
          <li><strong>左上に最重要ボタン（予約）を配置</strong> — タップ率が最も高いポジション</li>
          <li><strong>デザインは4原則を守る</strong> — 視認性・統一感・コントラスト・シンプルさ</li>
          <li><strong>会員ランクで切り替え</strong> — 新規とリピーターで異なる体験を提供</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、サロン業態別のリッチメニューテンプレートを標準搭載。デザイナー不要で、予約率を最大化するリッチメニューを作成できます。</p>
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
