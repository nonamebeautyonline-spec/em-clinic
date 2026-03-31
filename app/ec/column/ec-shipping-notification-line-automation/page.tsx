import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-shipping-notification-line-automation")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "発送通知の自動化にはどのような仕組みが必要ですか？", a: "ECカート（Shopify等）の注文ステータス変更をWebhookで検知し、LINE Messaging APIで自動配信する仕組みです。Lオペ for ECなら、ECカートとの連携設定だけで自動化が完了します。" },
  { q: "追跡番号の自動挿入はどうやりますか？", a: "ECカートのWebhookに含まれる追跡番号データを自動的にLINEメッセージに埋め込みます。ヤマト運輸・佐川急便・日本郵便の追跡URLも自動生成されるため、顧客はワンタップで配送状況を確認できます。" },
  { q: "発送通知をLINEに移行するとメール通知は不要ですか？", a: "LINE友だちの顧客にはLINE通知を優先し、友だちでない顧客にはメール通知を維持するハイブリッド運用が推奨です。LINE通知の方が開封率が高いため、問い合わせ削減効果も大きくなります。" },
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
  "注文確認→発送完了→配達完了の3段階LINE自動通知の設計",
  "配送関連の問い合わせを80%削減した事例",
  "配達後のレビュー依頼で回答率を3倍にする方法",
];

const toc = [
  { id: "shipping-issues", label: "発送通知の課題" },
  { id: "three-stage", label: "3段階通知の設計" },
  { id: "tracking", label: "追跡番号の自動挿入" },
  { id: "delay-handling", label: "配送遅延時のフォロー" },
  { id: "post-delivery", label: "配達後のアクション" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="発送通知自動化" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「いつ届きますか？」「発送されましたか？」 — EC事業者の問い合わせの<strong>約40%</strong>が配送関連です。LINEで注文確認から配達完了までの通知を自動化することで、問い合わせを<strong>80%削減</strong>し、顧客満足度も同時に向上させる方法を解説します。</p>

      <section>
        <h2 id="shipping-issues" className="text-xl font-bold text-gray-800">発送通知の課題</h2>
        <BarChart
          data={[
            { label: "配送状況の問い合わせ", value: 40, color: "#ef4444" },
            { label: "商品に関する質問", value: 25, color: "#3b82f6" },
            { label: "返品・交換", value: 15, color: "#f59e0b" },
            { label: "その他", value: 20, color: "#8b5cf6" },
          ]}
          unit="%（EC問い合わせの内訳）"
        />

        <Callout type="warning" title="メール通知は読まれない">
          発送通知メールの開封率は25〜35%。特にGmailでは「プロモーション」タブに振り分けられ、顧客が気づかないケースが多発。結果として「いつ届くか」の問い合わせが増え、CS工数を圧迫しています。
        </Callout>
      </section>

      <section>
        <h2 id="three-stage" className="text-xl font-bold text-gray-800">3段階通知の設計</h2>
        <ComparisonTable
          headers={["通知", "タイミング", "含める情報", "目的"]}
          rows={[
            ["注文確認", "注文直後", "注文番号・商品名・金額・お届け予定日", "注文の安心感"],
            ["発送完了", "ステータス変更時", "追跡番号・配送業者・追跡リンク", "配送状況の可視化"],
            ["配達完了", "配達完了時", "受取確認・レビュー依頼・次回クーポン", "エンゲージメント"],
          ]}
        />

        <FlowSteps steps={[
          { title: "注文確認通知", desc: "ご注文ありがとうございます。注文番号: #○○。お届け予定: ○月○日。商品の準備を開始いたしました。" },
          { title: "発送完了通知", desc: "商品を発送いたしました。追跡番号: ○○○○。配送状況はこちらからご確認ください → [追跡リンク]" },
          { title: "配達完了通知", desc: "商品が届きましたか？ご感想をお聞かせください → [レビュー投稿で500円OFFクーポン進呈]" },
        ]} />
      </section>

      <section>
        <h2 id="tracking" className="text-xl font-bold text-gray-800">追跡番号の自動挿入</h2>
        <ComparisonTable
          headers={["配送業者", "追跡URL形式", "自動生成"]}
          rows={[
            ["ヤマト運輸", "https://toi.kuronekoyamato.co.jp/cgi-bin/tneko?number=", "対応"],
            ["佐川急便", "https://k2k.sagawa-exp.co.jp/p/web/oisearch.do?okurijoNo=", "対応"],
            ["日本郵便", "https://trackings.post.japanpost.jp/services/srv/search/direct?reqCodeNo1=", "対応"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="delay-handling" className="text-xl font-bold text-gray-800">配送遅延時のフォロー</h2>
        <FlowSteps steps={[
          { title: "遅延検知", desc: "お届け予定日を過ぎた注文を自動検知" },
          { title: "即時フォロー", desc: "「お届けに遅れが生じております。大変申し訳ございません」+ 最新の配送状況リンク" },
          { title: "解決後のフォロー", desc: "配達完了後に「遅延のお詫びクーポン」を自動配信。クレーム化を予防" },
        ]} />

        <Callout type="success" title="先手のフォローでクレームを予防">
          配送遅延時に顧客から問い合わせが来る前にフォローを入れることで、クレーム発生率を70%削減した事例があります。「ちゃんと見てくれている」という安心感が顧客満足度の向上につながります。
        </Callout>
      </section>

      <section>
        <h2 id="post-delivery" className="text-xl font-bold text-gray-800">配達後のアクション</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>レビュー依頼</strong> — 配達完了翌日にレビュー投稿を依頼。投稿で次回クーポン進呈。詳しくは<Link href="/ec/column/ec-post-delivery-review-request" className="text-blue-600 underline">配達後のレビュー依頼</Link>で解説</li>
          <li><strong>関連商品の提案</strong> — 配達3日後に購入商品の関連アイテムをカード形式で紹介</li>
          <li><strong>使い方ガイド</strong> — 商品の活用法や使い方のコツを動画・画像で配信</li>
        </ul>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>
        <ResultCard before="配送問い合わせ 月150件" after="月30件" metric="配送関連の問い合わせ数" description="LINE発送通知の自動化で80%削減" />

        <StatGrid stats={[
          { value: "80%", unit: "削減", label: "配送問い合わせの削減" },
          { value: "4.5", unit: "/5", label: "配送体験の顧客満足度" },
          { value: "3", unit: "倍", label: "レビュー回答率の向上" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>3段階通知で配送体験を可視化</strong> — 注文確認→発送完了→配達完了を自動配信</li>
          <li><strong>追跡番号をワンタップで確認可能に</strong> — 問い合わせの80%を削減</li>
          <li><strong>配送遅延時の先手フォロー</strong> — クレーム化を70%予防</li>
          <li><strong>配達後のレビュー依頼で</strong><Link href="/ec/column/ec-post-delivery-review-request" className="text-blue-600 underline">回答率を3倍に</Link>。配送ボットは<Link href="/ec/column/ec-delivery-status-line-bot" className="text-blue-600 underline">LINEボット構築ガイド</Link>も参照</li>
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
