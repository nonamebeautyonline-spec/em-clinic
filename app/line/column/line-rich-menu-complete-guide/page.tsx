import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-rich-menu-complete-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "リッチメニューの画像サイズはいくつですか？", a: "大サイズが2500×1686px、小サイズが2500×843pxです。Canva等で作成する場合はこの解像度で作成し、1MB以下のJPEG/PNGで書き出してください。小サイズはトーク画面の占有面積が小さく、チャット重視のアカウントに向いています。" },
  { q: "リッチメニューは無料プランでも使えますか？", a: "はい、LINE公式アカウントの全プラン（コミュニケーションプラン含む）でリッチメニューは利用可能です。ただし、タブ切り替えや条件分岐などの高度な設定にはLステップ等の拡張ツールが必要です。" },
  { q: "リッチメニューのデフォルト表示はオン・オフどちらがいいですか？", a: "基本的にはデフォルト表示オンが推奨です。メニューが常に表示されることでユーザーがアクションを取りやすくなります。ただし、チャットでの会話を重視するアカウントでは、メニューを小サイズにするかデフォルトオフにする選択もあります。" },
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
  "リッチメニューの設定方法を画像サイズ・テンプレート選択から完全解説",
  "業種別の効果的なメニュー構成パターンとデザインのコツ",
  "ABテストの実施方法とCVR改善の具体的な手法",
];

const toc = [
  { id: "what-is-rich-menu", label: "リッチメニューとは" },
  { id: "size-template", label: "画像サイズとテンプレート" },
  { id: "setup-steps", label: "設定手順" },
  { id: "design-tips", label: "効果的なデザインのコツ" },
  { id: "action-types", label: "アクション設定の種類" },
  { id: "ab-test", label: "ABテストで効果改善" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="リッチメニュー作成ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">リッチメニューはLINE公式アカウントのトーク画面下部に常時表示されるメニューで、<strong>ユーザーの行動を直接誘導できる最重要UI要素</strong>です。予約・商品一覧・クーポン・問い合わせなどのアクションボタンを配置でき、設定次第でCVR（成約率）を大きく左右します。本記事では、リッチメニューの設定方法からデザインのコツ、ABテストまで完全ガイドとして解説します。</p>

      <section>
        <h2 id="what-is-rich-menu" className="text-xl font-bold text-gray-800">リッチメニューとは</h2>
        <p>リッチメニューは、LINEのトーク画面下部に固定表示されるカスタムメニューです。ユーザーがトーク画面を開くたびに表示されるため、Webサイトでいうグローバルナビゲーションに相当する重要な役割を持ちます。</p>

        <StatGrid stats={[
          { value: "80%以上", label: "リッチメニュー経由のアクション率" },
          { value: "2倍", label: "メニュー設定有無のCVR差" },
          { value: "6枠", label: "最大タップ領域数" },
        ]} />

        <Callout type="point" title="リッチメニューが重要な理由">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>常時表示</strong> — トーク画面を開くたびにメニューが目に入る</li>
            <li><strong>直感的な操作</strong> — アイコン+テキストで迷わずタップできる</li>
            <li><strong>配信通数を消費しない</strong> — メニュータップは通数にカウントされない</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="size-template" className="text-xl font-bold text-gray-800">画像サイズとテンプレート</h2>

        <ComparisonTable
          headers={["サイズ", "解像度", "特徴", "おすすめ用途"]}
          rows={[
            ["大サイズ", "2500×1686px", "6枠まで配置可能", "多機能なメニューが必要な場合"],
            ["小サイズ", "2500×843px", "3枠まで配置可能", "チャット重視・シンプルなメニュー"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレートパターン</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>2枠横並び</strong> — 「予約」「問い合わせ」のシンプル2択</li>
          <li><strong>3枠横並び</strong> — 「予約」「メニュー」「アクセス」の定番構成</li>
          <li><strong>4枠（2×2）</strong> — バランスの良い4機能メニュー</li>
          <li><strong>6枠（3×2）</strong> — 多機能で情報量の多いメニュー</li>
        </ul>

        <Callout type="warning" title="枠数が多い=良いとは限らない">
          枠数が多いほど各エリアが小さくなり、タップしにくくなります。重要なアクション3〜4つに絞り、視認性とタップしやすさを優先するのがおすすめです。
        </Callout>
      </section>

      <section>
        <h2 id="setup-steps" className="text-xl font-bold text-gray-800">リッチメニューの設定手順</h2>

        <FlowSteps steps={[
          { title: "テンプレートを選択", desc: "LINE Official Account Manager > トーク画面 > リッチメニューで新規作成。大/小サイズとテンプレートを選択" },
          { title: "メニュー画像を作成", desc: "Canva・Figmaで指定サイズの画像を作成。各枠のアイコンとテキストを配置し、1MB以下のJPEG/PNGで書き出し" },
          { title: "画像をアップロード", desc: "作成した画像をアップロード。プレビューで各枠の位置がズレていないか確認" },
          { title: "アクションを設定", desc: "各枠にURL・クーポン・テキスト送信などのアクションを割り当て" },
          { title: "表示設定を確認", desc: "表示期間・デフォルト表示（オン/オフ）・メニューバーテキストを設定して公開" },
        ]} />
      </section>

      <section>
        <h2 id="design-tips" className="text-xl font-bold text-gray-800">効果的なデザインのコツ</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">デザインの5原則</h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>最重要アクションを左上に配置</strong> — ユーザーの視線はZ字に動くため、左上が最もタップされやすい</li>
          <li><strong>アイコンとテキストのセット</strong> — アイコンだけでは意味が伝わらないため、必ず短いテキストを添える</li>
          <li><strong>ブランドカラーで統一感</strong> — メニュー全体をブランドカラーでまとめ、プロフェッショナルな印象を与える</li>
          <li><strong>余白を適度に確保</strong> — ボタン間の境界線を明確にし、誤タップを防ぐ</li>
          <li><strong>季節やキャンペーンで更新</strong> — 同じデザインのままだとタップ率が下がるため、定期的に刷新する</li>
        </ol>

        <p className="mt-4">デザイン事例を豊富に知りたい方は<Link href="/line/column/line-rich-menu-design-examples-20" className="text-blue-600 underline">リッチメニューデザイン事例20選</Link>をご覧ください。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="action-types" className="text-xl font-bold text-gray-800">アクション設定の種類</h2>

        <ComparisonTable
          headers={["アクション", "動作", "活用例"]}
          rows={[
            ["リンク", "指定URLに遷移", "予約ページ・EC・ブログ"],
            ["クーポン", "クーポン画面を表示", "来店クーポン・割引券"],
            ["テキスト", "定型テキストを送信", "FAQ呼び出し・キーワード応答"],
            ["ショップカード", "ポイントカード表示", "来店ポイント管理"],
            ["なし", "アクションなし", "装飾用・余白エリア"],
          ]}
        />

        <Callout type="success" title="テキストアクションの活用">
          テキストアクションで「予約したい」と送信させ、自動応答やチャットボットと連携させると、リッチメニューから予約までをシームレスにつなげられます。自動応答の設定方法は<Link href="/line/column/line-auto-reply-setup-guide" className="text-blue-600 underline">自動応答設定ガイド</Link>で解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="ab-test" className="text-xl font-bold text-gray-800">ABテストで効果改善</h2>
        <p>リッチメニューのABテストを行うことで、どのデザイン・構成が最もCVRが高いかをデータで判断できます。</p>

        <FlowSteps steps={[
          { title: "テストパターンを2つ用意", desc: "ボタン配置・色・コピーなど、変更点を1つに絞った2パターンを作成" },
          { title: "友だちを2グループに分割", desc: "拡張ツールのABテスト機能を使い、ランダムに2グループに分割" },
          { title: "2〜4週間計測", desc: "各メニューのタップ率・CVR・ブロック率を計測" },
          { title: "勝ちパターンを採用", desc: "効果の高かったデザインを全体に適用し、次のテストを計画" },
        ]} />

        <ResultCard before="6枠メニュー（全機能表示）" after="3枠メニュー（主要機能のみ）" metric="予約CVR" description="枠数を絞ったシンプルメニューでCVRが1.8倍に向上" />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "80%", label: "メニュー経由のアクション率" },
          { value: "2倍", label: "メニュー有無のCVR差" },
          { value: "3〜4枠", label: "おすすめの枠数" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>リッチメニューはLINEアカウントの「顔」</strong> — ユーザーのアクションの80%以上がメニュー経由</li>
          <li><strong>大サイズ/小サイズの選択が重要</strong> — 機能数とチャット重視度で判断</li>
          <li><strong>枠数は3〜4つが最適</strong> — 多すぎると視認性・タップ率が低下する</li>
          <li><strong>最重要アクションは左上に配置</strong> — Z字の視線移動に合わせた設計</li>
          <li><strong>定期的にABテストで改善</strong> — データに基づくデザイン最適化が成果を最大化する</li>
        </ol>
        <p className="mt-4">タブ切り替えなどの高度な実装については<Link href="/line/column/line-rich-menu-tab-switching-implementation" className="text-blue-600 underline">タブ切り替え実装ガイド</Link>をご覧ください。リッチメニューは一度設定して終わりではなく、継続的に改善することで効果を最大化できます。</p>
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
