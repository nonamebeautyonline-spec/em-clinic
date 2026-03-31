import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-official-account-initial-setup-10-steps")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "初期設定はどのくらいの時間がかかりますか？", a: "最低限の設定であれば30分〜1時間で完了します。リッチメニューの画像作成やあいさつメッセージの推敲まで含めると、半日〜1日程度を見込んでおくと余裕を持って進められます。" },
  { q: "初期設定を後から変更することはできますか？", a: "はい、ほぼすべての設定は後から変更可能です。まずは基本的な設定を完了させて運用を開始し、効果を見ながら改善していくのが効率的です。" },
  { q: "リッチメニューの画像はどうやって作ればいいですか？", a: "Canvaなどの無料デザインツールでテンプレートを使って作成するのが最も手軽です。サイズは2500×1686px（大）または2500×843px（小）で、最大6つのアクションエリアを設定できます。" },
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
  "LINE公式アカウント開設直後にやるべき10の初期設定を優先度順に解説",
  "あいさつメッセージ・リッチメニュー・応答設定など重要項目を網羅",
  "設定漏れを防ぐチェックリストとして活用可能",
];

const toc = [
  { id: "why-initial-setup", label: "初期設定が重要な理由" },
  { id: "step1-3", label: "優先度高: プロフィール・あいさつ・応答設定" },
  { id: "step4-6", label: "優先度中: リッチメニュー・Webhook・管理者" },
  { id: "step7-10", label: "優先度低: 分析・クーポン・自動応答・友だち追加" },
  { id: "checklist", label: "初期設定チェックリスト" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE公式アカウント入門" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントを開設しただけでは、まだ「使える状態」にはなっていません。<strong>初期設定を適切に行うかどうか</strong>で、友だち追加時の離脱率や運用効率が大きく変わります。本記事では開設直後にやるべき<strong>10の初期設定</strong>を優先度順に整理し、それぞれの設定方法とポイントを解説します。</p>

      {/* ── なぜ重要か ── */}
      <section>
        <h2 id="why-initial-setup" className="text-xl font-bold text-gray-800">初期設定が重要な理由</h2>
        <p>LINE公式アカウントの初期設定を怠ると、せっかく友だち追加してくれたユーザーがすぐにブロックしてしまう原因になります。</p>

        <StatGrid stats={[
          { value: "40", unit: "%", label: "あいさつ未設定時のブロック率" },
          { value: "3", unit: "倍", label: "リッチメニューありのタップ率" },
          { value: "72", unit: "%", label: "初回メッセージの開封率" },
        ]} />

        <Callout type="warning" title="最初の3秒で決まる">
          友だち追加直後のあいさつメッセージは開封率72%以上。この「ゴールデンタイム」に適切なメッセージを送れるかどうかが、ブロックされるか継続利用されるかの分かれ目です。
        </Callout>
      </section>

      {/* ── 優先度高 ── */}
      <section>
        <h2 id="step1-3" className="text-xl font-bold text-gray-800">優先度高: 必ず最初にやる3つの設定</h2>

        <FlowSteps steps={[
          { title: "1. プロフィールの充実", desc: "プロフィール画像（640×640px）、背景画像、ステータスメッセージ、営業時間、住所、電話番号を設定。特にプロフィール画像はブランドの顔となるため、ロゴや店舗写真を高品質で用意しましょう。" },
          { title: "2. あいさつメッセージの作成", desc: "友だち追加時に自動送信されるメッセージ。「誰のアカウントか」「何が届くのか」「次にやるべきこと（予約・クーポン取得等）」の3要素を含めた3〜5行が最適です。" },
          { title: "3. 応答設定の選択", desc: "「チャットモード」（手動対応）または「Botモード」（自動応答）を選択。初期は「スマートチャット」（自動+手動の切替）がおすすめです。" },
        ]} />

        <Callout type="success" title="あいさつメッセージの黄金テンプレート">
          <p className="mt-1">「友だち追加ありがとうございます！[店舗名]の公式アカウントです。こちらでは[提供内容]をお届けします。まずは下のメニューから[CTA]をどうぞ！」</p>
        </Callout>
      </section>

      {/* ── 優先度中 ── */}
      <section>
        <h2 id="step4-6" className="text-xl font-bold text-gray-800">優先度中: 運用開始前に整えるべき3つの設定</h2>

        <FlowSteps steps={[
          { title: "4. リッチメニューの設置", desc: "トーク画面下部に常時表示されるメニュー。予約・メニュー・アクセス・お問い合わせなど、主要な導線を最大6つ設定可能。画像のデザインにこだわることでタップ率が大幅に向上します。" },
          { title: "5. Webhookの設定", desc: "外部ツール（Lステップ・エルメ等）と連携する場合に必要。Webhook URLを設定すると、ユーザーのアクション（メッセージ送信・友だち追加等）を外部ツールに通知できます。" },
          { title: "6. 管理者・運用メンバーの追加", desc: "複数人でアカウントを管理する場合、メンバーを招待して権限を設定。「管理者」「運用担当者」「運用担当者（配信権限なし）」の3段階から選択できます。" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── 優先度低 ── */}
      <section>
        <h2 id="step7-10" className="text-xl font-bold text-gray-800">優先度低: 運用開始後に整備する4つの設定</h2>

        <FlowSteps steps={[
          { title: "7. 分析タグの設定", desc: "配信メッセージの効果測定のためのタグ設定。UTMパラメータを活用して、LINEからの流入をGoogle Analyticsで追跡できるようにします。" },
          { title: "8. クーポン・ショップカードの作成", desc: "友だち追加特典としてクーポンを用意したり、リピート促進のためのショップカード（ポイントカード）を作成します。" },
          { title: "9. 自動応答メッセージの設定", desc: "よくある質問に対するキーワード応答を設定。「営業時間」「予約」「アクセス」など頻出キーワードに対して定型文を返す仕組みを構築します。" },
          { title: "10. 友だち追加経路の整備", desc: "QRコード・追加ボタン・URLを作成し、店頭POP・名刺・Webサイト・SNSに設置。複数の経路を用意することで友だち追加の機会を最大化します。" },
        ]} />
      </section>

      {/* ── チェックリスト ── */}
      <section>
        <h2 id="checklist" className="text-xl font-bold text-gray-800">初期設定チェックリスト</h2>

        <ResultCard
          before="設定漏れがある状態で運用開始"
          after="10項目すべて完了してから配信スタート"
          metric="ブロック率を40%→10%に改善"
          description="初期設定の完了度が初期のブロック率に直結"
        />

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> プロフィール画像・背景画像・ステータスメッセージ</li>
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> あいさつメッセージ（3要素を含む）</li>
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> 応答モードの設定</li>
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> リッチメニューの設置</li>
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> Webhook設定（ツール連携時）</li>
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> 管理者・メンバーの追加</li>
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> 分析タグの設定</li>
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> クーポン・ショップカード</li>
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> 自動応答メッセージ</li>
          <li className="flex items-start gap-2"><span className="text-green-500">&#9745;</span> 友だち追加経路の整備</li>
        </ul>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="初期設定のポイント">
          <ul className="mt-1 space-y-1">
            <li>・あいさつメッセージとリッチメニューは最優先で設定</li>
            <li>・初期設定の完了度がブロック率に直結する</li>
            <li>・すべての設定は後から変更可能なので、まず完了を優先</li>
            <li>・運用開始後も定期的に設定を見直し改善する</li>
          </ul>
        </Callout>

        <p>初期設定が完了したら、次は<Link href="/line/column/line-official-account-first-month-guide" className="text-sky-600 underline hover:text-sky-800">運用開始1ヶ月でやるべきこと</Link>に進みましょう。料金プランの選び方に迷っている方は<Link href="/line/column/line-official-account-pricing-plan-comparison" className="text-sky-600 underline hover:text-sky-800">料金プラン完全比較</Link>も参考にしてください。拡張ツールの導入で初期設定を効率化したい場合は<Link href="/line/column/line-extension-tool-comparison-2026" className="text-sky-600 underline hover:text-sky-800">LINE拡張ツール比較2026年版</Link>をご覧ください。</p>
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
