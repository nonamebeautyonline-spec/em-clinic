import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-rich-menu-tab-switching-implementation")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "タブ切り替えはLINE公式アカウントの標準機能でできますか？", a: "いいえ、LINE公式アカウントの標準機能ではタブ切り替えは実現できません。Lステップ・エルメ・Liny等の拡張ツールが必要です。これらのツールでは、リッチメニューのタップアクションとして別メニューへの切り替えを設定できます。" },
  { q: "タブ切り替えメニューの作成にかかる費用は？", a: "拡張ツールの月額費用（3,000〜30,000円程度）とデザイン作成費が必要です。デザインはCanva等で自作すれば無料、デザイナーに外注する場合は1メニューあたり10,000〜30,000円が相場です。タブ数分のデザインが必要なため、通常のメニューより費用がかかります。" },
  { q: "タブは何個まで設定できますか？", a: "技術的にはツールの仕様で異なりますが、実用的には2〜3タブが最適です。4タブ以上にするとタブ部分が小さくなりタップしにくく、ユーザー体験が悪化します。「HOME/SHOP」の2タブか「HOME/MENU/INFO」の3タブが一般的です。" },
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
  "タブ切り替えの仕組みと対応ツール（Lステップ・エルメ等）の比較",
  "2タブ・3タブの設計パターンとデザイン作成のポイント",
  "ユーザー体験を損なわないためのUI設計の注意点",
];

const toc = [
  { id: "what-is-tab", label: "タブ切り替えとは" },
  { id: "tool-comparison", label: "対応ツール比較" },
  { id: "design-pattern", label: "タブデザインパターン" },
  { id: "implementation-steps", label: "実装手順" },
  { id: "ux-tips", label: "UX設計の注意点" },
  { id: "advanced", label: "応用テクニック" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="タブ切り替え実装" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">リッチメニューのタブ切り替えは、<strong>1つのトーク画面で複数のメニューを動的に切り替える</strong>高度な機能です。「HOME」「SHOP」「INFO」のようなタブを設置することで、アプリのような操作性を実現し、ユーザー体験を大幅に向上させます。本記事では、タブ切り替えの仕組みから対応ツール比較、実装手順までを完全ガイドとして解説します。</p>

      <section>
        <h2 id="what-is-tab" className="text-xl font-bold text-gray-800">タブ切り替えとは</h2>
        <p>リッチメニューのタブ切り替えとは、メニュー画像の一部をタブ状にデザインし、タップするとメニュー全体が別のデザインに切り替わる機能です。見た目上はタブが切り替わっているように見えますが、実際には複数のリッチメニューを切り替えて表示しています。</p>

        <StatGrid stats={[
          { value: "2〜3タブ", label: "推奨タブ数" },
          { value: "向上傾向", label: "タップ率が向上する傾向があります" },
          { value: "アプリ風", label: "実現できるUI体験" },
        ]} />

        <Callout type="point" title="タブ切り替えのメリット">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>情報量の拡大</strong> — 1画面の制約を超えて多くのアクションを配置可能</li>
            <li><strong>ユーザー体験の向上</strong> — アプリのような直感的な操作性</li>
            <li><strong>用途別の整理</strong> — 「予約系」「情報系」「クーポン系」を整理して表示</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="tool-comparison" className="text-xl font-bold text-gray-800">対応ツール比較</h2>

        <ComparisonTable
          headers={["ツール", "タブ切り替え", "設定の容易さ", "月額費用"]}
          rows={[
            ["Lステップ", "対応", "★★★★☆", "5,000円〜"],
            ["エルメ", "対応", "★★★★★", "0円〜（無料プラン有）"],
            ["Liny", "対応", "★★★☆☆", "5,000円〜"],
            ["プロラインフリー", "対応", "★★★☆☆", "0円〜（無料プラン有）"],
            ["LINE公式（標準）", "非対応", "—", "0円"],
          ]}
        />

        <Callout type="warning" title="LINE公式標準機能では実現不可">
          タブ切り替えはLINE公式アカウントの標準機能では実現できません。拡張ツールのリッチメニュー切り替え機能を利用する必要があります。ツールの詳しい比較は<Link href="/line/column/line-extension-tool-comparison-2026" className="text-blue-600 underline">LINE拡張ツール比較2026年版</Link>をご覧ください。
        </Callout>
      </section>

      <section>
        <h2 id="design-pattern" className="text-xl font-bold text-gray-800">タブデザインパターン</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2タブパターン</h3>
        <ComparisonTable
          headers={["パターン", "タブ1", "タブ2", "おすすめ業種"]}
          rows={[
            ["基本型", "HOME（予約・案内）", "MENU（メニュー・料金）", "美容・飲食"],
            ["新規/リピーター型", "はじめての方", "リピーターの方", "全業種"],
            ["情報/アクション型", "お知らせ・コラム", "予約・注文・問合せ", "EC・サービス業"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3タブパターン</h3>
        <ComparisonTable
          headers={["パターン", "タブ1", "タブ2", "タブ3"]}
          rows={[
            ["標準型", "HOME", "SHOP", "INFO"],
            ["飲食特化", "メニュー", "予約", "クーポン"],
            ["EC特化", "商品", "お得情報", "マイページ"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="implementation-steps" className="text-xl font-bold text-gray-800">実装手順（Lステップの場合）</h2>

        <FlowSteps steps={[
          { title: "タブ数とメニュー構成を決定", desc: "2タブか3タブかを決め、各タブに配置するアクションを設計。タブ部分のデザインは全メニューで統一する" },
          { title: "タブ数分のメニュー画像を作成", desc: "各メニューの画像を作成。タブ部分は全画像で同じ位置・デザインにし、アクティブタブの色だけ変える" },
          { title: "Lステップでリッチメニューを登録", desc: "タブ数分のリッチメニューを作成し、それぞれ画像とアクションを設定" },
          { title: "タブ部分のアクションを設定", desc: "タブのタップ領域に「リッチメニュー切り替え」アクションを設定。タブ1→メニュー1、タブ2→メニュー2に切り替わるよう設定" },
          { title: "デフォルトメニューを設定", desc: "友だち追加時に最初に表示されるデフォルトメニュー（通常はタブ1）を設定" },
          { title: "テスト", desc: "テストアカウントで全タブの切り替えが正常に動作するか確認。表示崩れやアクションの設定ミスがないかチェック" },
        ]} />
      </section>

      <section>
        <h2 id="ux-tips" className="text-xl font-bold text-gray-800">UX設計の注意点</h2>

        <Callout type="warning" title="やってはいけないUX設計">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>タブが4個以上</strong> — タブエリアが狭くなりタップしにくい</li>
            <li><strong>アクティブタブが分かりにくい</strong> — 今どのタブを開いているか明確に示す</li>
            <li><strong>タブ位置がメニューごとに異なる</strong> — タブの位置・サイズは全メニューで統一</li>
            <li><strong>タブのテキストが長すぎる</strong> — 2〜4文字が最適。長いと読みにくい</li>
          </ul>
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">アクティブタブの表現方法</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>色の変更</strong> — アクティブタブの背景色を濃くする（最も一般的）</li>
          <li><strong>下線の追加</strong> — アクティブタブに下線を付ける</li>
          <li><strong>サイズの差</strong> — アクティブタブをやや大きく表示する</li>
          <li><strong>アイコンの変更</strong> — アクティブタブのアイコンを塗りつぶしにする</li>
        </ul>
      </section>

      <section>
        <h2 id="advanced" className="text-xl font-bold text-gray-800">応用テクニック</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ユーザー属性別のタブメニュー</h3>
        <p>拡張ツールのタグ機能と組み合わせると、ユーザーの属性（新規/リピーター、会員ランク等）に応じて異なるタブメニューセットを自動的に表示できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">期間限定タブの追加</h3>
        <p>キャンペーン期間中だけ「SALE」タブを追加し、終了後に自動で通常メニューに戻す運用も可能です。期間限定感を演出しつつ、通常の導線を維持できます。</p>

        <ResultCard before="固定6枠メニュー" after="タブ切り替え（2タブ×4枠）" metric="メニュー内の全アクション利用率" description="表示アクション数を8個に拡大しつつ、タップ率の向上が期待できます" />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "2〜3タブ", label: "推奨タブ数" },
          { value: "向上傾向", label: "タップ率の向上" },
          { value: "拡張ツール", label: "必要な環境" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>タブ切り替えはアプリのような操作性を実現</strong> — ユーザー体験を大幅に向上させる</li>
          <li><strong>LINE公式標準機能では不可、拡張ツールが必要</strong> — Lステップ・エルメ等を利用</li>
          <li><strong>2〜3タブが最適</strong> — 4タブ以上はUXが悪化する</li>
          <li><strong>タブデザインは全メニューで統一</strong> — 位置・サイズ・スタイルを揃える</li>
          <li><strong>アクティブタブを明確に示す</strong> — ユーザーが現在位置を把握できるようにする</li>
        </ol>
        <p className="mt-4">リッチメニューの基本設定は<Link href="/line/column/line-rich-menu-complete-guide" className="text-blue-600 underline">リッチメニュー作り方完全ガイド</Link>、デザインの参考事例は<Link href="/line/column/line-rich-menu-design-examples-20" className="text-blue-600 underline">デザイン事例20選</Link>もご参照ください。</p>
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
