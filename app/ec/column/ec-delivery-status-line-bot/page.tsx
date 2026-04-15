import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-delivery-status-line-bot")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "配送状況ボットの開発にはプログラミング知識が必要ですか？", a: "Lオペ for ECを使えば、LINE上で配送通知を自動送信できます。ECカートとの連携設定のみで、顧客が注文番号を送ると自動で配送状況を返信する仕組みが完成します。" },
  { q: "配送業者の追跡APIとの連携は必要ですか？", a: "追跡APIと直接連携する方法と、ECカートの注文ステータスから配送状況を推定する方法の2通りがあります。追跡API連携の方がリアルタイム性は高いですが、ECカート連携だけでも十分な精度を得られます。" },
  { q: "ボットが回答できない質問にはどう対応しますか？", a: "ボットが回答できない質問は自動的にスタッフに転送されます。「確認のうえご返信いたします」と即時応答し、スタッフに通知する仕組みを組み込むことで、顧客を待たせません。" },
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
  "LINEトーク画面から配送状況を確認できるボットの構築方法",
  "問い合わせ80%削減の実績とCS工数の大幅削減",
  "ボット構築から運用開始までの実践ガイド",
];

const toc = [
  { id: "why-bot", label: "配送ボットが必要な理由" },
  { id: "bot-features", label: "ボットの主要機能" },
  { id: "conversation-flow", label: "会話フローの設計" },
  { id: "implementation", label: "実装のステップ" },
  { id: "optimization", label: "最適化のポイント" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="配送ボット構築" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「荷物は今どこですか？」「いつ届きますか？」 — EC事業者のCS業務の<strong>40%</strong>を占める配送関連の問い合わせを、LINEボットで自動対応。問い合わせを<strong>80%削減</strong>し、CS工数を大幅に削減した実践ガイドを紹介します。</p>

      <section>
        <h2 id="why-bot" className="text-xl font-bold text-gray-800">配送ボットが必要な理由</h2>
        <StatGrid stats={[
          { value: "40%", label: "EC問い合わせに占める配送関連" },
          { value: "3〜5", unit: "分", label: "配送問い合わせの平均対応時間" },
          { value: "月60〜100", unit: "時間", label: "中規模ECのCS工数（配送関連）" },
        ]} />

        <p>配送状況の問い合わせは、毎回「注文番号→配送業者の追跡サイトで確認→顧客に返信」という定型作業です。この定型作業をLINEボットに任せることで、スタッフはより付加価値の高い業務に集中できます。</p>
      </section>

      <section>
        <h2 id="bot-features" className="text-xl font-bold text-gray-800">ボットの主要機能</h2>
        <ComparisonTable
          headers={["機能", "説明", "削減できる問い合わせ"]}
          rows={[
            ["注文状況確認", "注文番号で現在のステータスを即時回答", "「注文は受け付けられましたか？」"],
            ["配送追跡", "追跡番号と配送業者の追跡リンクを表示", "「荷物は今どこですか？」"],
            ["お届け日確認", "お届け予定日を表示", "「いつ届きますか？」"],
            ["配送変更", "日時変更の手続きリンクを案内", "「届け先を変更したい」"],
            ["FAQ自動応答", "返品・交換・送料の質問に自動回答", "定型質問全般"],
          ]}
        />
      </section>

      <section>
        <h2 id="conversation-flow" className="text-xl font-bold text-gray-800">会話フローの設計</h2>
        <FlowSteps steps={[
          { title: "顧客: 配送状況を確認", desc: "リッチメニューの「配送状況を確認」ボタンをタップ、または「荷物はどこ？」とテキスト入力" },
          { title: "ボット: 注文番号の確認", desc: "LINE IDに紐づく直近の注文を自動表示。複数注文がある場合は一覧から選択" },
          { title: "ボット: 配送状況を回答", desc: "「ご注文の商品は○月○日に発送済みです。追跡はこちら→[リンク]」" },
          { title: "未解決の場合: スタッフ転送", desc: "「スタッフが確認のうえ返信いたします」と案内し、CS担当者に通知" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="implementation" className="text-xl font-bold text-gray-800">実装のステップ</h2>
        <FlowSteps steps={[
          { title: "Step 1: ECカート連携", desc: "Shopify/BASE等のWebhookで注文・発送データを自動取得" },
          { title: "Step 2: LINE ID紐づけ", desc: "購入時のLINE IDとECの注文IDを紐づけるデータベースを構築" },
          { title: "Step 3: 会話フロー構築", desc: "リッチメニュー + キーワード応答 + 注文検索のフローを設定" },
          { title: "Step 4: テスト運用", desc: "テスト注文で各フローの動作を確認。エッジケース（複数注文・キャンセル済み等）もテスト" },
          { title: "Step 5: 本番稼働", desc: "友だち全員に「配送状況がLINEで確認できるようになりました」と告知" },
        ]} />
      </section>

      <section>
        <h2 id="optimization" className="text-xl font-bold text-gray-800">最適化のポイント</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>リッチメニューに配送確認ボタンを配置</strong> — 最もアクセスしやすい位置に設置</li>
          <li><strong>注文番号なしでも確認可能に</strong> — LINE IDから直近注文を自動検索</li>
          <li><strong>配送遅延の自動検知</strong> — 予定日を過ぎた注文を自動でフラグ付け・フォロー配信</li>
          <li><strong>回答できない質問のログ収集</strong> — ボットが対応できなかった質問を蓄積し、定期的にFAQを追加</li>
        </ul>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>
        <ResultCard before="配送問い合わせ 月200件" after="月40件" metric="配送関連の問い合わせ数" description="LINEボットで80%を自動対応" />

        <StatGrid stats={[
          { value: "80%", unit: "削減", label: "配送問い合わせ" },
          { value: "月40", unit: "時間", label: "CS工数の削減" },
          { value: "24", unit: "時間", label: "問い合わせ対応可能時間" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>配送問い合わせの80%はボットで自動対応可能</strong> — 定型の配送状況確認を自動化</li>
          <li><strong>LINE IDベースの注文検索</strong> — 注文番号不要で配送状況を即時回答</li>
          <li><strong>CS工数を月40時間削減</strong> — スタッフはより付加価値の高い業務に集中</li>
          <li><strong>発送通知の自動化と合わせて活用</strong> — <Link href="/ec/column/ec-shipping-notification-line-automation" className="text-blue-600 underline">発送通知自動化</Link>と<Link href="/ec/column/ec-post-delivery-review-request" className="text-blue-600 underline">配達後レビュー依頼</Link>も組み合わせて効果を最大化</li>
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
