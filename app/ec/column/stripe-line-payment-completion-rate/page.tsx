import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "stripe-line-payment-completion-rate")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "Stripe×LINE連携にはどんな仕組みが必要ですか？", a: "StripeのWebhookを利用して、決済イベント（完了・失敗・期限切れ）をリアルタイムでLINEに通知します。Lオペ for ECではStripe Webhookの設定だけで自動連携が完了します。" },
  { q: "決済失敗時のLINE通知は顧客に不快感を与えませんか？", a: "「お支払いの確認が取れませんでした」というソフトな表現で、決済方法の再入力リンクを添えて送れば問題ありません。実際に通知を受けた顧客の80%以上が再決済を完了しています。" },
  { q: "サブスク決済の更新失敗にも対応できますか？", a: "はい、Stripeのinvoice.payment_failedイベントを検知し、自動的にLINEで通知します。カード有効期限切れや残高不足による非自発的解約を大幅に削減できます。" },
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
  "Stripe決済とLINE通知の連携方法",
  "決済リマインド・完了通知・エラーフォローの設計",
  "決済完了率を15%改善した具体的な手法",
];

const toc = [
  { id: "payment-issues", label: "決済フローの課題" },
  { id: "stripe-line-setup", label: "Stripe×LINE連携の設定" },
  { id: "payment-notifications", label: "決済通知の種類" },
  { id: "error-recovery", label: "決済エラー時のフォロー" },
  { id: "subscription-recovery", label: "サブスク決済失敗の回復" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="Stripe×LINE決済最適化" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">ECサイトの決済フローで<strong>約15%</strong>の顧客が決済を完了せずに離脱しています。Stripe決済とLINE通知を連携し、決済リマインド・エラーフォロー・完了通知を自動化することで、決済完了率を<strong>15%改善</strong>した方法を解説します。</p>

      <section>
        <h2 id="payment-issues" className="text-xl font-bold text-gray-800">決済フローの課題</h2>
        <BarChart
          data={[
            { label: "カード情報入力中に離脱", value: 40, color: "#ef4444" },
            { label: "3Dセキュア認証で離脱", value: 25, color: "#f59e0b" },
            { label: "決済エラー後に再試行せず", value: 20, color: "#3b82f6" },
            { label: "ページ遷移中に離脱", value: 15, color: "#8b5cf6" },
          ]}
          unit="%（決済離脱の内訳）"
        />

        <StatGrid stats={[
          { value: "15%", label: "決済フローでの離脱率" },
          { value: "80%", label: "LINE通知後の再決済完了率" },
          { value: "月50〜100", unit: "万円", label: "月商500万のECでの取りこぼし" },
        ]} />
      </section>

      <section>
        <h2 id="stripe-line-setup" className="text-xl font-bold text-gray-800">Stripe×LINE連携の設定</h2>
        <FlowSteps steps={[
          { title: "Stripe Webhookの設定", desc: "Stripeダッシュボードでcheckout.session.completed, payment_intent.payment_failed等のイベントを設定" },
          { title: "LINE Messaging APIの接続", desc: "WebhookエンドポイントでStripeイベントを受信し、LINE APIで通知を配信" },
          { title: "顧客ID紐づけ", desc: "StripeのcustomerIDとLINE UIDを紐づけ。決済イベントから通知先を特定" },
          { title: "メッセージテンプレート設定", desc: "決済完了・失敗・期限切れの各テンプレートを設定" },
        ]} />
      </section>

      <section>
        <h2 id="payment-notifications" className="text-xl font-bold text-gray-800">決済通知の種類</h2>
        <ComparisonTable
          headers={["通知タイプ", "トリガー", "内容", "効果"]}
          rows={[
            ["決済完了通知", "payment_intent.succeeded", "注文確認+お届け予定日", "顧客安心感"],
            ["決済未完了リマインド", "checkout.session.expired", "「決済が完了していません」+再決済リンク", "完了率+12%"],
            ["決済失敗通知", "payment_intent.payment_failed", "「決済が確認できません」+別カード入力リンク", "再決済率80%"],
            ["サブスク更新失敗", "invoice.payment_failed", "「カード情報の更新をお願いします」", "非自発的解約70%削減"],
          ]}
        />
      </section>

      <InlineCTA />

      <section>
        <h2 id="error-recovery" className="text-xl font-bold text-gray-800">決済エラー時のフォロー</h2>
        <FlowSteps steps={[
          { title: "即時: エラー通知", desc: "「お支払いの確認が取れませんでした。別のカードをお試しください」+再決済リンク" },
          { title: "1時間後: リマインド", desc: "未解決の場合「まだ決済が完了していません。ご注文をお待ちしています」" },
          { title: "24時間後: サポート案内", desc: "「決済でお困りですか？他の決済方法もご利用いただけます」+コンビニ決済等の案内" },
        ]} />

        <ResultCard before="決済エラー後の再試行率 25%" after="LINE通知後の再決済率 80%" metric="決済エラーからの回復率" description="LINE通知で再決済率が3.2倍に向上" />
      </section>

      <section>
        <h2 id="subscription-recovery" className="text-xl font-bold text-gray-800">サブスク決済失敗の回復</h2>
        <p>サブスクリプションの「非自発的解約」（カード期限切れ・残高不足による決済失敗）は、全解約の20〜30%を占めます。</p>

        <FlowSteps steps={[
          { title: "決済失敗時: 即時通知", desc: "「定期便のお支払いが確認できませんでした。カード情報をご確認ください」" },
          { title: "3日後: リマインド", desc: "「お届けを継続するため、カード情報の更新をお願いいたします」" },
          { title: "7日後: 最終通知", desc: "「カード情報が更新されない場合、定期便が停止されます」" },
        ]} />

        <StatGrid stats={[
          { value: "70%", unit: "削減", label: "非自発的解約の削減" },
          { value: "85%", label: "カード更新完了率" },
        ]} />
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">導入効果</h2>
        <StatGrid stats={[
          { value: "15%", unit: "改善", label: "決済完了率の向上" },
          { value: "80%", label: "決済エラー後の再決済率" },
          { value: "70%", unit: "削減", label: "非自発的解約の削減" },
        ]} />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>決済フローで15%が離脱</strong> — LINE通知で決済完了率を大幅改善</li>
          <li><strong>決済エラー後のLINE通知で再決済率80%</strong> — メールの2倍以上の回復率</li>
          <li><strong>サブスクの非自発的解約を70%削減</strong> — カード更新リマインドで解約防止</li>
          <li><strong>カゴ落ち対策と組み合わせて効果最大化</strong> — <Link href="/ec/column/line-cart-abandonment-recovery-guide" className="text-blue-600 underline">カゴ落ち回収ガイド</Link>と<Link href="/ec/column/subscription-ec-line-churn-prevention" className="text-blue-600 underline">サブスク解約防止</Link>も参照</li>
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
