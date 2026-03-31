import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "ec-line-official-account-guide-2026")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/ec/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/ec/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "ECサイトでLINE公式アカウントを開設するメリットは？", a: "メールと比較して開封率が約3倍、クリック率が約5倍と高く、カゴ落ちリマインドや発送通知の即時配信が可能です。友だち追加のハードルが低いため、メルマガ未登録の顧客にもリーチでき、EC売上の底上げに直結します。" },
  { q: "LINE公式アカウントの運用コストはどのくらいですか？", a: "LINE公式アカウントは無料で開設可能です。月200通までは無料プランで運用でき、配信数が増えた場合はライトプラン（月5,000円/5,000通）やスタンダードプラン（月15,000円/30,000通）を選択できます。" },
  { q: "ShopifyやBASEなどのECカートと連携できますか？", a: "はい、Lオペ for ECはShopify・BASE・STORES・EC-CUBEなど主要ECカートとAPI連携が可能です。カゴ落ちイベント・注文情報・発送情報を自動取得し、LINEでの自動配信に活用できます。" },
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
  "EC×LINE活用のメリットとメール配信との比較データ",
  "LINE公式アカウントの開設からECカート連携までの手順",
  "友だち獲得施策から初回売上につなげるまでのロードマップ",
];

const toc = [
  { id: "why-line-for-ec", label: "ECサイトにLINEが必要な理由" },
  { id: "line-vs-email", label: "LINEとメールの効果比較" },
  { id: "account-setup", label: "LINE公式アカウントの開設手順" },
  { id: "ec-cart-integration", label: "ECカートとの連携方法" },
  { id: "friend-acquisition", label: "友だち獲得施策" },
  { id: "first-delivery", label: "初回配信の設計" },
  { id: "success-metrics", label: "効果測定の指標" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="EC×LINE活用入門" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">EC事業者の<strong>約68%</strong>がLINE公式アカウントを「売上に直結するチャネル」と評価しています。本記事では、LINE公式アカウントの開設からECカート連携、友だち獲得、初回配信設計まで、EC×LINE活用を成功させるための完全ガイドをお届けします。</p>

      <section>
        <h2 id="why-line-for-ec" className="text-xl font-bold text-gray-800">ECサイトにLINEが必要な理由</h2>
        <p>日本国内のLINEユーザー数は9,700万人を超え、月間アクティブ率は86%に達します。ECサイトにとって、これほど多くの消費者にリーチできるチャネルは他にありません。</p>

        <StatGrid stats={[
          { value: "9,700万", unit: "人", label: "国内LINEユーザー数" },
          { value: "86%", label: "月間アクティブ率" },
          { value: "68%", label: "EC事業者のLINE評価率" },
        ]} />

        <p>特にECサイトでは、以下の理由からLINE活用が売上に直結します。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>カゴ落ちリマインド</strong> — カート放棄した顧客にLINEで即座にリマインド配信。平均回収率15〜25%</li>
          <li><strong>発送・配達通知</strong> — 注文確認から配達完了まで自動通知。問い合わせ件数を大幅削減</li>
          <li><strong>リピート促進</strong> — 購買データに基づくセグメント配信で、リピート購入率を2倍に</li>
          <li><strong>1:1コミュニケーション</strong> — 顧客の質問にリアルタイムで対応し、購入の不安を解消</li>
        </ul>
      </section>

      <section>
        <h2 id="line-vs-email" className="text-xl font-bold text-gray-800">LINEとメール配信の効果比較</h2>
        <p>EC事業者が最も気になるのは、既存のメール配信と比べてLINEにどれだけの効果があるかでしょう。</p>

        <ComparisonTable
          headers={["指標", "メール配信", "LINE配信"]}
          rows={[
            ["開封率", "15〜20%", "60〜80%"],
            ["クリック率", "2〜3%", "10〜25%"],
            ["カゴ落ち回収率", "5〜8%", "15〜25%"],
            ["到達率", "80〜90%", "98%以上"],
            ["即時性", "数時間〜翌日", "数分以内"],
            ["ブロック/解除", "迷惑メール判定あり", "ブロック率10〜20%"],
          ]}
        />

        <Callout type="success" title="LINEの圧倒的な到達力">
          LINEの開封率はメールの<strong>3〜4倍</strong>、クリック率は<strong>5倍以上</strong>。特にカゴ落ちリマインドでは、メールの5〜8%に対しLINEは15〜25%の回収率を実現します。詳しい比較データは<Link href="/ec/column/ec-line-vs-email-marketing-comparison" className="text-blue-600 underline">LINE vs メール徹底比較</Link>で解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="account-setup" className="text-xl font-bold text-gray-800">LINE公式アカウントの開設手順</h2>

        <FlowSteps steps={[
          { title: "LINE公式アカウントの作成", desc: "LINE for Businessにアクセスし、ビジネスアカウントを作成。業種は「小売・EC」を選択" },
          { title: "プロフィール設定", desc: "ショップ名・ロゴ・説明文・営業時間・WebサイトURLを設定。第一印象が友だち追加率に直結" },
          { title: "Messaging API有効化", desc: "LINE Developersコンソールでチャネルを作成し、Webhook URLを設定" },
          { title: "ECカートとの連携設定", desc: "Shopify/BASE等のECカートとAPI連携。注文・カート・発送イベントを自動取得" },
          { title: "挨拶メッセージ設定", desc: "友だち追加時の自動メッセージを設定。クーポン付きにすると初回購入率が大幅向上" },
        ]} />
      </section>

      <InlineCTA />

      <section>
        <h2 id="ec-cart-integration" className="text-xl font-bold text-gray-800">ECカートとの連携方法</h2>
        <p>LINE公式アカウントの効果を最大化するには、ECカートとのデータ連携が不可欠です。</p>

        <ComparisonTable
          headers={["ECカート", "連携方法", "取得可能データ"]}
          rows={[
            ["Shopify", "App + Webhook", "注文・カート・顧客・発送"],
            ["BASE", "API連携", "注文・顧客・発送"],
            ["STORES", "Webhook", "注文・顧客"],
            ["EC-CUBE", "プラグイン", "注文・カート・顧客・発送"],
            ["カラーミーショップ", "API連携", "注文・顧客・発送"],
          ]}
        />

        <Callout type="point" title="連携で実現できる自動配信">
          ECカートと連携することで、カゴ落ちリマインド・注文確認・発送通知・配達完了通知・レビュー依頼など、購入フロー全体をLINEで自動化できます。連携設定の詳細は<Link href="/ec/column/shopify-line-integration-setup" className="text-blue-600 underline">Shopify×LINE連携の設定方法</Link>をご参照ください。
        </Callout>
      </section>

      <section>
        <h2 id="friend-acquisition" className="text-xl font-bold text-gray-800">友だち獲得施策</h2>
        <p>LINE公式アカウントの効果は「友だち数」に比例します。ECサイトで友だちを増やすための施策を紹介します。</p>

        <BarChart
          data={[
            { label: "購入完了ページ", value: 35, color: "#22c55e" },
            { label: "カート画面ポップアップ", value: 25, color: "#3b82f6" },
            { label: "会員登録フォーム", value: 20, color: "#f59e0b" },
            { label: "商品ページバナー", value: 12, color: "#8b5cf6" },
            { label: "メルマガ告知", value: 8, color: "#ec4899" },
          ]}
          unit="%"
        />

        <ul className="list-disc pl-6 space-y-1">
          <li><strong>購入完了ページ</strong> — 「LINEで発送状況を受け取る」ボタンを設置。購入直後の満足度が高いタイミングで友だち追加率35%</li>
          <li><strong>初回クーポン</strong> — 「LINE友だち追加で10%OFFクーポン」。初回購入のハードルを下げつつ友だち獲得</li>
          <li><strong>カート画面ポップアップ</strong> — 離脱しそうなタイミングで「LINEで在庫通知を受け取る」と表示</li>
        </ul>
      </section>

      <section>
        <h2 id="first-delivery" className="text-xl font-bold text-gray-800">初回配信の設計</h2>
        <p>友だち追加後の最初の配信が、その後のエンゲージメントを決定します。</p>

        <FlowSteps steps={[
          { title: "即時: ウェルカムメッセージ", desc: "ショップ紹介 + 初回限定クーポン。開封率90%以上のゴールデンタイム" },
          { title: "翌日: おすすめ商品紹介", desc: "人気商品ランキングや新着商品を紹介。クリック率20%以上を目指す" },
          { title: "3日後: 活用ガイド", desc: "LINE限定セール情報の受け取り方や、再入荷通知の設定方法を案内" },
          { title: "7日後: レビュー＆UGC", desc: "購入者のレビューや使用例を紹介。社会的証明で購入を後押し" },
        ]} />

        <Callout type="warning" title="初回配信の注意点">
          友だち追加直後に商品リンクだけを大量に送ると、ブロック率が急上昇します。まずは価値提供（クーポン・情報）を優先し、販売は2〜3回目の配信から段階的に行いましょう。
        </Callout>
      </section>

      <section>
        <h2 id="success-metrics" className="text-xl font-bold text-gray-800">効果測定の指標</h2>

        <StatGrid stats={[
          { value: "15〜25%", label: "カゴ落ち回収率（目標）" },
          { value: "60%", unit: "以上", label: "開封率（目標）" },
          { value: "10%", unit: "以下", label: "ブロック率（目標）" },
        ]} />

        <p>EC×LINE運用で追うべきKPIは以下の通りです。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>友だち追加数/率</strong> — 月間の新規友だち獲得数と、サイト訪問者に対する追加率</li>
          <li><strong>LINE経由売上</strong> — LINE配信からの直接購入額。UTMパラメータで計測</li>
          <li><strong>カゴ落ち回収率</strong> — リマインド配信後の購入完了率</li>
          <li><strong>配信ROI</strong> — 配信コストに対する売上増加額</li>
        </ul>
        <p>詳細なKPI設計については<Link href="/ec/column/ec-line-kpi-dashboard-design" className="text-blue-600 underline">EC×LINE運用のKPI設計</Link>で解説しています。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "3〜4", unit: "倍", label: "メール比の開封率" },
          { value: "15〜25%", label: "カゴ落ち回収率" },
          { value: "2", unit: "倍", label: "リピート購入率の改善" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>ECにLINEは必須チャネル</strong> — 9,700万ユーザーへの到達力と圧倒的な開封率で、メールを超える効果</li>
          <li><strong>ECカート連携がカギ</strong> — 注文・カート・発送データを連携し、カゴ落ちリマインドから配達通知まで自動化</li>
          <li><strong>友だち獲得は購入完了ページから</strong> — 最も友だち追加率が高いタッチポイントを優先的に整備</li>
          <li><strong>初回配信で価値を提供</strong> — クーポン・情報提供を優先し、販売は段階的に。運用開始1ヶ月のロードマップは<Link href="/ec/column/ec-line-first-month-roadmap" className="text-blue-600 underline">EC×LINE運用開始1ヶ月のロードマップ</Link>で詳しく紹介しています</li>
        </ol>
        <p className="mt-4">Lオペ for ECは、LINE公式アカウントの開設からECカート連携、自動配信設計まで、EC×LINE運用を一気通貫でサポートします。まずは無料相談からお気軽にお問い合わせください。</p>
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
