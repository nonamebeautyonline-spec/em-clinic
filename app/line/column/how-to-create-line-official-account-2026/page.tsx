import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  StatGrid,
  Callout,
  FlowSteps,
  ComparisonTable,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "how-to-create-line-official-account-2026")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/line/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/line/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE公式アカウントの開設に費用はかかりますか？", a: "LINE公式アカウントの開設自体は無料です。コミュニケーションプラン（月200通まで無料）から始められ、配信通数が増えた段階でライト・スタンダードプランへ移行できます。" },
  { q: "個人でもLINE公式アカウントは作れますか？", a: "はい、個人でも作成可能です。ビジネス利用だけでなく、フリーランスや個人事業主の方も開設できます。ただし認証済みアカウントの取得には法人情報が必要な場合があります。" },
  { q: "認証済みアカウントと未認証アカウントの違いは何ですか？", a: "認証済みアカウントはLINE検索で表示され、緑色のバッジが付与されます。信頼性が高まり友だち追加率が向上します。審査には1〜2週間かかり、業種によっては審査が通らない場合もあります。" },
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
  "LINE公式アカウントの開設手順を2026年最新の管理画面に完全対応",
  "アカウント種別（未認証・認証済み・プレミアム）の選び方を解説",
  "開設から初期設定までをステップバイステップで紹介",
];

const toc = [
  { id: "what-is", label: "LINE公式アカウントとは" },
  { id: "account-types", label: "アカウント種別の違い" },
  { id: "preparation", label: "開設前に準備するもの" },
  { id: "create-steps", label: "開設手順（5ステップ）" },
  { id: "initial-settings", label: "開設直後に行う基本設定" },
  { id: "verification", label: "認証済みアカウントの申請方法" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE公式アカウント入門" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントの国内利用アカウント数は<strong>44万件以上</strong>（2025年時点）に達し、業種を問わず顧客接点の中核チャネルとなっています。本記事では2026年最新の管理画面に完全対応し、<strong>アカウント開設から初期設定まで</strong>を画面キャプチャとともに解説します。初めての方でも<strong>15分で開設が完了</strong>できるよう、ステップバイステップで手順を紹介します。</p>

      {/* ── LINE公式アカウントとは ── */}
      <section>
        <h2 id="what-is" className="text-xl font-bold text-gray-800">LINE公式アカウントとは</h2>
        <p>LINE公式アカウントは、LINEが提供するビジネス向けのアカウントサービスです。一般的なLINEとは異なり、<strong>1対多のメッセージ配信</strong>やリッチメニュー、クーポン配布、自動応答など、ビジネスに特化した機能が利用できます。</p>

        <StatGrid stats={[
          { value: "9,700", unit: "万人", label: "LINEの月間利用者数" },
          { value: "86", unit: "%", label: "日本人口カバー率" },
          { value: "44", unit: "万+", label: "公式アカウント数" },
          { value: "0", unit: "円", label: "アカウント開設費用" },
        ]} />

        <p>かつてはLINE@として提供されていましたが、2019年に現在のLINE公式アカウントに統合されています。旧LINE@との違いについては<Link href="/line/column/line-at-vs-line-official-account-differences" className="text-sky-600 underline hover:text-sky-800">LINE@とLINE公式アカウントの違い</Link>で詳しく解説しています。</p>
      </section>

      {/* ── アカウント種別 ── */}
      <section>
        <h2 id="account-types" className="text-xl font-bold text-gray-800">アカウント種別の違い — 未認証・認証済み・プレミアム</h2>
        <p>LINE公式アカウントには3つの種別があり、それぞれ利用できる機能や信頼性が異なります。</p>

        <ComparisonTable
          headers={["比較項目", "未認証アカウント", "認証済みアカウント", "プレミアム"]}
          rows={[
            ["開設費用", "無料", "無料", "要相談"],
            ["審査", "不要", "必要（1〜2週間）", "招待制"],
            ["バッジ色", "灰色", "緑（青）", "緑（青）"],
            ["LINE検索", false, true, true],
            ["友だち追加広告", false, true, true],
            ["請求書払い", false, true, true],
            ["おすすめの対象", "個人・テスト用", "法人・店舗", "大手企業"],
          ]}
        />

        <Callout type="info" title="まずは未認証で開設がおすすめ">
          認証済みアカウントは後からでも申請可能です。まずは未認証アカウントで開設し、運用が軌道に乗ったら認証申請を行うのが効率的です。
        </Callout>
      </section>

      {/* ── 準備 ── */}
      <section>
        <h2 id="preparation" className="text-xl font-bold text-gray-800">開設前に準備するもの</h2>
        <p>LINE公式アカウントの開設に必要なものは以下の通りです。5分で準備できます。</p>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>LINEアカウント</strong> — 管理者のLINEアカウント（個人用でOK）</li>
          <li><strong>メールアドレス</strong> — LINE Business IDの登録用</li>
          <li><strong>ビジネス情報</strong> — 店舗名・業種・電話番号・住所（認証申請時に必要）</li>
          <li><strong>プロフィール画像</strong> — 640×640px推奨（ロゴまたは店舗写真）</li>
          <li><strong>あいさつメッセージの原稿</strong> — 友だち追加時に自動送信される初回メッセージ</li>
        </ul>
      </section>

      {/* ── 開設手順 ── */}
      <section>
        <h2 id="create-steps" className="text-xl font-bold text-gray-800">LINE公式アカウントの開設手順（5ステップ）</h2>

        <FlowSteps steps={[
          { title: "LINE Business IDを作成", desc: "LINE Official Account Managerにアクセスし、LINEアカウントまたはメールアドレスでBusiness IDを作成します。既にLINEを利用している場合は「LINEアカウントでログイン」が最速です。" },
          { title: "アカウント情報を入力", desc: "アカウント名（後から変更可能）、業種（大業種・小業種）、会社名を入力します。アカウント名はユーザーに表示されるため、店舗名やブランド名を設定しましょう。" },
          { title: "プロフィールを設定", desc: "プロフィール画像（640×640px）、背景画像（1080×878px）、ステータスメッセージ（20文字以内）を設定します。第一印象を左右する要素なので、しっかり作りこみましょう。" },
          { title: "あいさつメッセージを作成", desc: "友だち追加直後に送信されるメッセージです。自己紹介・提供サービス・次のアクション（予約はこちら等）を含めた3〜5行のメッセージが効果的です。" },
          { title: "応答設定を選択", desc: "「チャット」「Bot」の応答モードを選択します。まずは「チャット＋手動対応」で開始し、運用に慣れたら自動応答やBotを追加するのがおすすめです。" },
        ]} />

        <Callout type="success" title="15分で開設完了">
          上記5ステップは慣れていない方でも15分程度で完了します。アカウント名や応答設定は後からいつでも変更可能なので、まずは開設を完了させることを優先しましょう。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── 基本設定 ── */}
      <section>
        <h2 id="initial-settings" className="text-xl font-bold text-gray-800">開設直後に行う基本設定</h2>
        <p>アカウント開設後、運用開始前に最低限やっておくべき設定を紹介します。詳細は<Link href="/line/column/line-official-account-initial-setup-10-steps" className="text-sky-600 underline hover:text-sky-800">初期設定でやるべき10のこと</Link>も参考にしてください。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>チャットモードの有効化</strong>: 1:1トークで個別対応ができるようにする</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>リッチメニューの設置</strong>: トーク画面下部のメニューでユーザー導線を確保</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>Webhookの設定</strong>: 外部ツール連携が必要な場合はWebhook URLを登録</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>管理者の追加</strong>: 複数人で運用する場合はメンバーを招待</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">5.</span><strong>友だち追加経路の設定</strong>: QRコード・URL・ボタンなどの追加導線を準備</li>
        </ul>
      </section>

      {/* ── 認証申請 ── */}
      <section>
        <h2 id="verification" className="text-xl font-bold text-gray-800">認証済みアカウントの申請方法</h2>
        <p>認証済みアカウントを取得すると、LINE検索への表示や友だち追加広告の利用が可能になり、集客力が大幅にアップします。</p>

        <FlowSteps steps={[
          { title: "管理画面から申請", desc: "LINE Official Account Manager →「設定」→「アカウント認証」から申請フォームに進みます。" },
          { title: "必要情報を入力", desc: "法人名・代表者名・業種・事業内容・WebサイトURL・電話番号などを入力します。" },
          { title: "審査（1〜2週間）", desc: "LINEによる審査が行われます。事業実態の確認が主な審査項目です。" },
          { title: "認証完了", desc: "審査通過後、アカウントに緑色の認証バッジが付与されます。" },
        ]} />

        <Callout type="warning" title="審査に落ちやすい業種に注意">
          アフィリエイト、情報商材、一部のナイトビジネスなどは審査に通りにくい傾向があります。事業内容の説明は具体的かつ正確に記載することが審査通過のポイントです。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="LINE公式アカウント開設のポイント">
          <ul className="mt-1 space-y-1">
            <li>・アカウント開設は無料で15分あれば完了</li>
            <li>・まずは未認証アカウントで開始し、後から認証申請がおすすめ</li>
            <li>・あいさつメッセージとリッチメニューは開設直後に設定</li>
            <li>・運用開始後1ヶ月の取り組みが成果を左右する</li>
          </ul>
        </Callout>

        <p>LINE公式アカウントの開設は簡単ですが、成果を出すには開設後の運用が重要です。<Link href="/line/column/line-official-account-first-month-guide" className="text-sky-600 underline hover:text-sky-800">運用開始1ヶ月でやるべきこと</Link>を参考に、計画的に運用を始めましょう。料金プランの詳細については<Link href="/line/column/line-official-account-pricing-plan-comparison" className="text-sky-600 underline hover:text-sky-800">料金プラン比較</Link>をご覧ください。</p>
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
