import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-stamp-card-digital-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "既存の紙ポイントカードの残高はどう引き継ぎますか？", a: "来店時に紙カードを確認し、残りスタンプ数をデジタルカードに手動で反映します。「デジタルに移行すると、ボーナススタンプ1個プレゼント」と特典を付けると移行がスムーズです。" },
  { q: "スタンプの付与は自動ですか？", a: "来店確認後にスタッフがワンタップで付与する方式が一般的です。位置情報連携で店舗に来店したら自動付与する仕組みも構築可能です。" },
  { q: "スタンプカードの特典は何がおすすめですか？", a: "10スタンプで500〜1,000円OFFのクーポンが最もスタンダードです。常連客向けには「5スタンプで小特典、10スタンプで大特典」の2段階制にすると、途中で諦めにくくなります。" },
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
  "紙のポイントカードからLINEデジタルスタンプカードへの移行手順",
  "スタンプ数と特典のバランス設計",
  "紛失・忘れをゼロにし、来店データも自動蓄積する仕組み",
];

const toc = [
  { id: "paper-problems", label: "紙ポイントカードの課題" },
  { id: "digital-benefits", label: "デジタルスタンプカードのメリット" },
  { id: "setup", label: "設定手順" },
  { id: "reward-design", label: "特典設計のコツ" },
  { id: "migration", label: "紙からの移行方法" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="デジタルスタンプカード" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「ポイントカード忘れました」——この一言でスタンプを付けられず、お客様のモチベーションが下がるケースは日常茶飯事です。LINEのデジタルスタンプカードなら、<strong>忘れ・紛失ゼロ</strong>でリピート率を向上できます。</p>

      <section>
        <h2 id="paper-problems" className="text-xl font-bold text-gray-800">紙ポイントカードの課題</h2>

        <StatGrid stats={[
          { value: "40%", label: "ポイントカードを忘れるお客様の割合" },
          { value: "20%", label: "カード紛失による特典未使用率" },
          { value: "月5,000円", label: "カード印刷コスト（100枚/月のサロン）" },
        ]} />

        <ul className="list-disc pl-6 space-y-1">
          <li>忘れ・紛失でスタンプが貯まらず、特典を受けられない</li>
          <li>来店データが紙に紐づくため分析不可能</li>
          <li>カードの印刷・保管コスト</li>
          <li>不正利用（自分でスタンプを押す等）のリスク</li>
        </ul>
      </section>

      <section>
        <h2 id="digital-benefits" className="text-xl font-bold text-gray-800">デジタルスタンプカードのメリット</h2>

        <ComparisonTable
          headers={["比較項目", "紙カード", "LINEデジタル"]}
          rows={[
            ["忘れ・紛失", "頻発する", "ゼロ"],
            ["印刷コスト", "月5,000円〜", "0円"],
            ["来店データ", "分析不可", "自動蓄積"],
            ["特典の自動通知", "不可", "残りスタンプ数を自動表示"],
            ["不正防止", "困難", "スタッフ操作のみ"],
            ["お客様の利便性", "持ち歩く手間", "LINEを開くだけ"],
          ]}
        />
      </section>

      <section>
        <h2 id="setup" className="text-xl font-bold text-gray-800">設定手順</h2>

        <FlowSteps steps={[
          { title: "スタンプ数と特典を決定", desc: "10スタンプで1,000円OFFなど、スタンプ数と特典内容を設定" },
          { title: "カードのデザイン設定", desc: "サロンのブランドカラーに合わせたデジタルカードのデザインを作成" },
          { title: "リッチメニューに「スタンプカード」ボタンを配置", desc: "お客様がいつでも残スタンプ数を確認できる導線を設計" },
          { title: "スタッフの付与方法をレクチャー", desc: "会計時にワンタップでスタンプ付与する操作をスタッフに共有" },
          { title: "告知・移行開始", desc: "店頭POPとLINE配信で「デジタルスタンプカード始めました」と告知" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="reward-design" className="text-xl font-bold text-gray-800">特典設計のコツ</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2段階特典がおすすめ</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>5スタンプ（中間特典）</strong> — ミニトリートメント無料、ヘッドスパ5分サービスなど</li>
          <li><strong>10スタンプ（ゴール特典）</strong> — 1,000円OFF、またはスペシャルメニュー無料</li>
        </ul>

        <Callout type="success" title="中間特典がモチベーションを維持">
          10スタンプのみだとゴールが遠すぎて途中で諦めるお客様がいます。5スタンプ時点で小さな特典を用意することで、達成感と継続モチベーションを高められます。
        </Callout>

        <ResultCard before="60%（紙カード特典使用率）" after="85%（デジタル特典使用率）" metric="特典使用率" description="忘れ・紛失がなくなることで大幅に向上" />

        <p className="mt-4">顧客管理の全体像は<Link href="/salon/column/salon-line-crm-setup-guide" className="text-blue-600 underline">LINE CRM構築ガイド</Link>、VIP向け特典は<Link href="/salon/column/salon-vip-customer-management" className="text-blue-600 underline">VIP顧客管理</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="migration" className="text-xl font-bold text-gray-800">紙からの移行方法</h2>

        <FlowSteps steps={[
          { title: "移行キャンペーンを告知", desc: "「紙カードからデジタルに移行するとボーナススタンプ1個」で移行を促進" },
          { title: "来店時に残高引き継ぎ", desc: "紙カードのスタンプ数をデジタルに反映。紙カードは回収" },
          { title: "紙カードの配布を停止", desc: "新規のお客様にはデジタルカードのみを案内" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>紙カードの忘れ・紛失問題をゼロに</strong> — デジタルなら常にLINEに</li>
          <li><strong>2段階特典でモチベーション維持</strong> — 5スタンプで中間特典、10スタンプでゴール</li>
          <li><strong>来店データが自動蓄積</strong> — セグメント配信に活用可能</li>
          <li><strong>移行はボーナススタンプで促進</strong> — 紙カードの残高を引き継ぎ</li>
        </ol>
        <p className="mt-4">Lオペ for SALONのデジタルスタンプカードは、ブランドに合わせたデザインカスタマイズと自動通知機能を搭載。お客様のリピートを仕組みで促進します。</p>
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
