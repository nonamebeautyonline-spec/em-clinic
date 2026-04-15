import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "shopify-line-integration-setup")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "Shopify×LINE連携に技術的な知識は必要ですか？", a: "Lオペ for ECを使えば、Shopifyとの連携設定が可能です。Webhook設定やAPI接続はツール側で自動処理されるため、プログラミングの知識は不要です。" },
  { q: "連携後に自動配信できるメッセージの種類は？", a: "カゴ落ちリマインド・注文確認・発送通知・配達完了通知・レビュー依頼・再入荷通知など、購入フロー全体のメッセージを自動配信できます。配信タイミングや文面はカスタマイズ可能です。" },
  { q: "Shopify以外のECカートとも連携できますか？", a: "はい、Shopify・BASEとの連携に対応しています。各カートのAPI/Webhookを通じて注文・カート・発送データを自動取得します。" },
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
  "ShopifyとLINE公式アカウントの連携手順をステップバイステップで解説",
  "カゴ落ち通知・発送通知の自動化設定方法",
  "連携後に売上を最大化するための配信シナリオ設計",
];

const toc = [
  { id: "overview", label: "Shopify×LINE連携の全体像" },
  { id: "prerequisites", label: "連携前に準備するもの" },
  { id: "step-by-step", label: "連携設定ステップ" },
  { id: "cart-abandonment", label: "カゴ落ち通知の自動化" },
  { id: "shipping-notification", label: "発送通知の自動化" },
  { id: "advanced-scenarios", label: "応用シナリオ" },
  { id: "troubleshooting", label: "よくあるトラブルと対処法" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="Shopify×LINE連携" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">ShopifyストアとLINE公式アカウントを連携することで、カゴ落ちリマインドの自動配信だけで<strong>月商の10〜15%</strong>を回収できるケースが多数あります。本記事では、Webhook設定から自動配信のシナリオ構築まで、技術知識なしで導入できる手順を解説します。</p>

      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">Shopify×LINE連携の全体像</h2>
        <p>ShopifyとLINE公式アカウントを連携すると、Shopifyで発生する各種イベント（カート追加・注文完了・発送完了など）をトリガーに、LINEで自動メッセージを配信できます。</p>

        <StatGrid stats={[
          { value: "15〜25%", label: "カゴ落ち回収率" },
          { value: "80%", unit: "削減", label: "発送関連の問い合わせ" },
          { value: "3", unit: "倍", label: "レビュー回答率の向上" },
        ]} />

        <FlowSteps steps={[
          { title: "Shopifyイベント発生", desc: "カート追加・注文確定・発送完了・配達完了などのイベントが発生" },
          { title: "Webhook送信", desc: "ShopifyからLINE連携ツール（Lオペ for EC）にWebhookでイベントデータを送信" },
          { title: "顧客マッチング", desc: "Shopifyの顧客IDとLINE IDを紐づけ、対象顧客を特定" },
          { title: "LINE自動配信", desc: "イベント内容に応じたメッセージをLINEで自動配信" },
        ]} />
      </section>

      <section>
        <h2 id="prerequisites" className="text-xl font-bold text-gray-800">連携前に準備するもの</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Shopifyストア</strong> — Basicプラン以上（Webhook機能が必要）</li>
          <li><strong>LINE公式アカウント</strong> — Messaging APIを有効化済み</li>
          <li><strong>LINE Developersチャネル</strong> — チャネルアクセストークンとチャネルシークレット</li>
          <li><strong>LINE連携ツール</strong> — Lオペ for EC等のShopify対応ツール</li>
        </ul>

        <Callout type="point" title="Messaging APIの有効化が必須">
          LINE公式アカウントの標準機能だけでは、Shopifyとのデータ連携はできません。LINE DevelopersコンソールでMessaging APIを有効化し、Webhook URLを設定する必要があります。
        </Callout>
      </section>

      <section>
        <h2 id="step-by-step" className="text-xl font-bold text-gray-800">連携設定ステップ</h2>

        <FlowSteps steps={[
          { title: "1. LINE Developersでチャネル作成", desc: "Messaging APIチャネルを作成し、チャネルアクセストークン（長期）を発行。チャネルシークレットも控えておく" },
          { title: "2. Shopify管理画面でWebhook設定", desc: "設定 > 通知 > Webhookから、カート作成・注文作成・注文発送のWebhookを追加" },
          { title: "3. LINE連携ツールの初期設定", desc: "Lオペ for ECの管理画面でShopifyストアURLとAPIキーを入力し、接続テストを実行" },
          { title: "4. 顧客ID紐づけの設定", desc: "LINE友だち追加時にShopifyの顧客IDとLINE UIDを自動紐づけする仕組みを構築" },
          { title: "5. 自動配信メッセージの設定", desc: "カゴ落ちリマインド・注文確認・発送通知のメッセージテンプレートを設定" },
          { title: "6. テスト配信と動作確認", desc: "テスト注文を作成して各種自動配信が正しく動作するか確認" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="cart-abandonment" className="text-xl font-bold text-gray-800">カゴ落ち通知の自動化</h2>
        <p>Shopify×LINE連携で最もインパクトが大きいのが、カゴ落ちリマインドの自動配信です。</p>

        <FlowSteps steps={[
          { title: "1時間後: 最初のリマインド", desc: "「お買い物をお忘れではないですか？」+ 商品画像 + カートリンク。回収率が最も高いタイミング" },
          { title: "24時間後: 2回目のリマインド", desc: "「まだ在庫がございます」+ 残り在庫数 + レビュー紹介。緊急性を演出" },
          { title: "72時間後: 最終リマインド + クーポン", desc: "「期間限定10%OFFクーポン」を付けた最終リマインド。これで回収率をさらに5〜8%上乗せ" },
        ]} />

        <ResultCard before="5〜8%" after="15〜25%" metric="カゴ落ち回収率" description="メールのみ→LINE段階リマインド導入後" />
      </section>

      <section>
        <h2 id="shipping-notification" className="text-xl font-bold text-gray-800">発送通知の自動化</h2>
        <p>Shopifyで注文ステータスが「発送済み」に変わると、自動的にLINEで発送通知を配信できます。</p>

        <ComparisonTable
          headers={["通知タイプ", "配信タイミング", "含める情報"]}
          rows={[
            ["注文確認", "注文直後", "注文番号・商品名・合計金額・お届け予定日"],
            ["発送完了", "ステータス変更時", "追跡番号・配送業者・追跡リンク"],
            ["配達完了", "配達完了時", "受取確認・レビュー依頼・次回クーポン"],
          ]}
        />

        <Callout type="success" title="問い合わせの80%を削減">
          「いつ届きますか？」「発送されましたか？」といった問い合わせが、LINE自動通知で80%削減。カスタマーサポートの工数を大幅に削減できます。詳しくは<Link href="/ec/column/ec-shipping-notification-line-automation" className="text-blue-600 underline">ECの発送通知をLINEで自動化する方法</Link>をご参照ください。
        </Callout>
      </section>

      <section>
        <h2 id="advanced-scenarios" className="text-xl font-bold text-gray-800">応用シナリオ</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>再入荷通知</strong> — 在庫切れ商品の再入荷時にLINE通知。登録者の平均購入率40%以上</li>
          <li><strong>リピート購入リマインド</strong> — 消耗品の購買サイクルに合わせた自動リマインド</li>
          <li><strong>VIP顧客限定セール</strong> — 購入金額上位の顧客にだけ先行セール案内</li>
          <li><strong>誕生日クーポン</strong> — Shopifyの顧客データから誕生月に自動クーポン配信</li>
        </ul>
      </section>

      <section>
        <h2 id="troubleshooting" className="text-xl font-bold text-gray-800">よくあるトラブルと対処法</h2>

        <ComparisonTable
          headers={["トラブル", "原因", "対処法"]}
          rows={[
            ["Webhookが届かない", "URLの設定ミス・SSL未対応", "HTTPSのWebhook URLを正しく設定"],
            ["顧客とLINE IDが紐づかない", "ID連携の導線不足", "購入完了画面にLINE友だち追加ボタンを設置"],
            ["メッセージが遅延する", "API制限・サーバー負荷", "配信キューの設定を確認"],
            ["商品画像が表示されない", "画像URLのプロトコル", "HTTPS画像URLを使用"],
          ]}
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "15〜25%", label: "カゴ落ち回収率" },
          { value: "80%", unit: "削減", label: "配送問い合わせ" },
          { value: "40%", unit: "以上", label: "再入荷通知の購入率" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>Shopify×LINE連携は技術知識不要</strong> — Lオペ for ECなら管理画面から簡単に設定可能</li>
          <li><strong>カゴ落ちリマインドが最大の効果</strong> — 段階リマインドで回収率15〜25%を実現</li>
          <li><strong>発送通知で問い合わせを削減</strong> — 注文確認から配達完了まで自動化し、CS工数を大幅削減</li>
          <li><strong>応用シナリオで売上をさらに拡大</strong> — 再入荷通知・リピートリマインド・VIP施策で継続的な売上成長。LINE活用の全体像は<Link href="/ec/column/ec-line-official-account-guide-2026" className="text-blue-600 underline">EC×LINE活用入門</Link>も参考にしてください</li>
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
