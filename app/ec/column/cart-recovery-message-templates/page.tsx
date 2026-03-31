import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "cart-recovery-message-templates")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "カゴ落ちリマインドの文面は長い方がいいですか？", a: "いいえ、短い方が効果的です。3行以内のテキスト + 商品カード（画像・商品名・価格・カートリンク）の構成が最も回収率が高いです。長文はスクロールされずに離脱されるリスクがあります。" },
  { q: "商品画像なしのテキストだけでも効果はありますか？", a: "テキストのみでも一定の効果はありますが、商品画像を含むカード形式と比較するとクリック率が約60%低下します。視覚的にカートの中身を思い出してもらうことが重要です。" },
  { q: "リマインドメッセージに価格を表示すべきですか？", a: "はい、価格表示は推奨です。特に割引価格やセール価格の場合、「通常価格→セール価格」の形で表示すると、お得感が伝わりクリック率が向上します。" },
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
  "業態別のカゴ落ちリマインドメッセージテンプレート10パターン",
  "商品画像・緊急性・クーポンの効果的な使い方",
  "回収率を高めるメッセージ設計の5つのコツ",
];

const toc = [
  { id: "design-principles", label: "メッセージ設計の原則" },
  { id: "template-basic", label: "基本テンプレート3選" },
  { id: "template-urgency", label: "緊急性訴求テンプレート3選" },
  { id: "template-coupon", label: "クーポン付きテンプレート2選" },
  { id: "template-industry", label: "業態特化テンプレート2選" },
  { id: "design-tips", label: "回収率を高める5つのコツ" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="メッセージテンプレート" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">カゴ落ちリマインドの回収率は、メッセージの文面で<strong>最大2倍</strong>の差が出ます。本記事では、業態別に最適化された10パターンのメッセージテンプレートと、回収率を高めるための設計のコツを紹介します。</p>

      <section>
        <h2 id="design-principles" className="text-xl font-bold text-gray-800">メッセージ設計の原則</h2>

        <StatGrid stats={[
          { value: "3", unit: "行以内", label: "最適なテキスト量" },
          { value: "2.5", unit: "倍", label: "画像ありのクリック率向上" },
          { value: "1", unit: "タップ", label: "カート復帰までのステップ" },
        ]} />

        <p>効果的なカゴ落ちリマインドメッセージには、5つの要素が必要です。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>パーソナライズ</strong> — 顧客名 + カート内の商品名で「自分宛て」と認識させる</li>
          <li><strong>商品ビジュアル</strong> — 商品画像をカード形式で表示し、視覚的に購買意欲を刺激</li>
          <li><strong>ワンタップ復帰</strong> — カートページへの直接リンクで、再購入の手間をゼロに</li>
          <li><strong>適度な緊急性</strong> — 在庫数や期間限定を示し、「今買う理由」を作る</li>
          <li><strong>押しつけない文体</strong> — 「お忘れではないですか？」というソフトな問いかけ</li>
        </ul>
      </section>

      <section>
        <h2 id="template-basic" className="text-xl font-bold text-gray-800">基本テンプレート3選</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート1: シンプルリマインド（1時間後向け）</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、お買い物をお忘れではないですか？</p>
          <p className="text-sm text-gray-500 mt-1">カートに「{"{商品名}"}」が入っています。</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + カートを見るボタン]</p>
        </div>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート2: レビュー付きリマインド</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、こちらの商品を気になっていませんか？</p>
          <p className="text-sm text-gray-500 mt-1">購入者の95%が「満足」と回答しています。</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + レビュー抜粋 + カートを見るボタン]</p>
        </div>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート3: お気に入り提案型</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、カートの商品はまだお取り置き中です。</p>
          <p className="text-sm text-gray-500 mt-1">今すぐ購入されない場合は、お気に入りに追加しておきませんか？</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + カートを見る/お気に入りに追加 ボタン]</p>
        </div>

        <BarChart
          data={[
            { label: "シンプルリマインド", value: 18, color: "#22c55e" },
            { label: "レビュー付き", value: 22, color: "#3b82f6" },
            { label: "お気に入り提案", value: 15, color: "#f59e0b" },
          ]}
          unit="%（平均回収率）"
        />
      </section>

      <section>
        <h2 id="template-urgency" className="text-xl font-bold text-gray-800">緊急性訴求テンプレート3選</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート4: 在庫残少</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、カートの商品が残りわずかです。</p>
          <p className="text-sm text-red-500 mt-1">「{"{商品名}"}」残り{"{在庫数}"}点 — お早めにどうぞ。</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + 今すぐ購入ボタン]</p>
        </div>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート5: セール終了間近</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、セール価格は本日23:59までです。</p>
          <p className="text-sm text-gray-500 mt-1">「{"{商品名}"}」通常{"{通常価格}"}円 → セール{"{セール価格}"}円</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + セール価格で購入ボタン]</p>
        </div>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート6: 人気商品訴求</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、この商品は今週{"{購入数}"}人が購入しています。</p>
          <p className="text-sm text-gray-500 mt-1">人気のため在庫がなくなり次第終了です。</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + カートを見るボタン]</p>
        </div>
      </section>

      <InlineCTA />

      <section>
        <h2 id="template-coupon" className="text-xl font-bold text-gray-800">クーポン付きテンプレート2選</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート7: 期間限定割引</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、カートの商品にお得なクーポンをお届けします。</p>
          <p className="text-sm text-red-500 mt-1">48時間限定 10%OFF クーポン: CART10</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + クーポンを使って購入ボタン]</p>
        </div>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート8: 送料無料</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、今なら送料無料でお届けします。</p>
          <p className="text-sm text-gray-500 mt-1">カートの「{"{商品名}"}」が送料無料の対象です。本日中のご注文に限ります。</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + 送料無料で購入ボタン]</p>
        </div>

        <Callout type="warning" title="クーポンは3回目リマインドのみ">
          クーポン付きリマインドは3回目（72時間後）のみ使用しましょう。初回からクーポンを付けると、顧客が「待てばクーポンがもらえる」と学習し、意図的なカゴ落ちが増加します。詳しいクーポン戦略は<Link href="/ec/column/cart-abandonment-coupon-strategy" className="text-blue-600 underline">カゴ落ちクーポン戦略</Link>で解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="template-industry" className="text-xl font-bold text-gray-800">業態特化テンプレート2選</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート9: アパレルEC向け</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、サイズが合うか気になりますか？</p>
          <p className="text-sm text-gray-500 mt-1">「{"{商品名}"}」は無料でサイズ交換が可能です。お気軽にお試しください。</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + サイズガイド + カートを見るボタン]</p>
        </div>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">テンプレート10: 食品EC向け</h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 my-3">
          <p className="text-sm text-gray-700">○○さん、今週の受注分は明日発送です。</p>
          <p className="text-sm text-gray-500 mt-1">「{"{商品名}"}」を今日中にご注文いただくと、最短{"{配達日}"}にお届けできます。</p>
          <p className="text-sm text-blue-600 mt-1">[商品カード + 今すぐ注文ボタン]</p>
        </div>
      </section>

      <section>
        <h2 id="design-tips" className="text-xl font-bold text-gray-800">回収率を高める5つのコツ</h2>

        <FlowSteps steps={[
          { title: "1. A/Bテストを実施する", desc: "テンプレートを2パターン用意し、回収率を比較。最低100件のデータで判断" },
          { title: "2. 段階ごとに文面を変える", desc: "1回目はソフト、2回目は緊急性、3回目はクーポン。同じ文面の繰り返しは厳禁" },
          { title: "3. 商品カテゴリで文面を分岐", desc: "アパレルならサイズ交換訴求、食品なら鮮度訴求と、カテゴリに応じた文面を用意" },
          { title: "4. 配信時間帯を最適化", desc: "平日は12:00〜13:00と20:00〜22:00、休日は10:00〜12:00が高クリック率" },
          { title: "5. 効果計測を忘れない", desc: "テンプレート別の開封率・クリック率・回収率を週次で計測し、改善サイクルを回す" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>メッセージ文面で回収率は2倍変わる</strong> — テンプレートを参考に自社に最適な文面を見つける</li>
          <li><strong>基本→緊急性→クーポンの段階設計</strong> — 3段階で文面のトーンを変えて最大効果を狙う</li>
          <li><strong>業態に合わせたカスタマイズが重要</strong> — アパレルならサイズ不安解消、食品なら鮮度・配送スピード訴求</li>
          <li><strong>A/Bテストで継続改善</strong> — 数値に基づいた改善を繰り返す。リマインドの最適タイミングは<Link href="/ec/column/optimal-cart-reminder-timing" className="text-blue-600 underline">最適配信タイミングの記事</Link>で、全体戦略は<Link href="/ec/column/line-cart-abandonment-recovery-guide" className="text-blue-600 underline">カゴ落ち回収ガイド</Link>を参照</li>
        </ol>
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
