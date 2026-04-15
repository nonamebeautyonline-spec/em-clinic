import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-line-official-account-setup-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE公式アカウントの開設に費用はかかりますか？", a: "アカウント開設自体は無料です。フリープランでは月200通まで無料で配信でき、小規模サロンならまず無料で始められます。友だち数が増えてきたらライトプラン（月額5,000円・5,000通）への移行を検討しましょう。" },
  { q: "個人アカウントとLINE公式アカウントの違いは何ですか？", a: "LINE公式アカウントはビジネス専用で、一斉配信・リッチメニュー・クーポン機能・自動応答・分析機能などビジネスに必要な機能が揃っています。個人アカウントではこれらの機能は利用できません。" },
  { q: "認証済みアカウントにするメリットはありますか？", a: "認証済みアカウントにすると、LINE内の検索結果に表示されるため新規友だちの自然流入が見込めます。また、緑色のバッジがつくことでお客様からの信頼性も向上します。審査には1〜2週間かかります。" },
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
  "LINE公式アカウントの開設から初期設定までの完全手順",
  "プロフィール・あいさつメッセージ・リッチメニューの最適な設定方法",
  "サロン業態別の初期設定チェックリスト",
];

const toc = [
  { id: "why-line", label: "サロンにLINE公式アカウントが必要な理由" },
  { id: "account-types", label: "アカウント種別の選び方" },
  { id: "setup-steps", label: "開設手順（ステップバイステップ）" },
  { id: "profile-setup", label: "プロフィール設定のポイント" },
  { id: "greeting-message", label: "あいさつメッセージの設定" },
  { id: "initial-settings", label: "初期設定チェックリスト" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="LINE公式アカウント開設ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">サロンの集客・リピート促進に欠かせないLINE公式アカウント。開設自体は<strong>無料・最短10分</strong>で完了します。本記事では、2026年最新の管理画面に対応した開設手順から、サロンならではのプロフィール設定・あいさつメッセージの作り方まで完全解説します。</p>

      <section>
        <h2 id="why-line" className="text-xl font-bold text-gray-800">サロンにLINE公式アカウントが必要な理由</h2>
        <p>日本国内のLINEユーザーは9,700万人以上。サロンのお客様のほぼ全員がLINEを利用しており、最も到達率が高い連絡手段です。</p>

        <StatGrid stats={[
          { value: "9,700万", unit: "人", label: "国内LINEユーザー数" },
          { value: "85%", label: "メッセージ開封率（メールの3倍以上）" },
          { value: "多数", label: "サロン利用者がLINE予約を希望しているという声" },
        ]} />

        <Callout type="success" title="電話予約からLINE予約へ">
          20〜40代女性の多くは電話よりもテキストコミュニケーションを好みます。特にネイルやまつげサロンでは、デザイン写真をLINEで送ってもらうことで施術前の認識合わせが格段にスムーズになります。
        </Callout>
      </section>

      <section>
        <h2 id="account-types" className="text-xl font-bold text-gray-800">アカウント種別の選び方</h2>
        <p>LINE公式アカウントには「未認証」と「認証済み」の2種類があります。</p>

        <ComparisonTable
          headers={["比較項目", "未認証アカウント", "認証済みアカウント"]}
          rows={[
            ["開設", "即日", "審査あり（1〜2週間）"],
            ["LINE検索への表示", false, true],
            ["バッジ表示", "灰色", "緑色（信頼性向上）"],
            ["請求書払い", false, true],
            ["友だち追加広告", false, true],
            ["おすすめ", "まず開設したい場合", "本格運用するサロン"],
          ]}
        />

        <Callout type="point" title="まずは未認証で開設→後から認証申請がおすすめ">
          認証申請は後からでも可能です。まず未認証アカウントで運用を開始し、プロフィールやコンテンツを充実させてから認証申請すると審査に通りやすくなります。
        </Callout>
      </section>

      <section>
        <h2 id="setup-steps" className="text-xl font-bold text-gray-800">開設手順 — 最短10分で完了</h2>

        <FlowSteps steps={[
          { title: "LINE公式アカウント管理画面にアクセス", desc: "LINE Official Account Managerにアクセスし、「アカウントを作成」をクリック" },
          { title: "LINEビジネスIDでログイン", desc: "既存のLINEアカウントまたはメールアドレスでLINEビジネスIDを作成・ログイン" },
          { title: "アカウント情報を入力", desc: "アカウント名（サロン名）、業種（美容）、会社名・店舗名を入力" },
          { title: "管理画面にログイン", desc: "作成完了後、管理画面のホーム画面が表示される。ここから各種設定へ" },
        ]} />

        <Callout type="warning" title="アカウント名は慎重に設定">
          アカウント名は後から変更できますが、認証済みアカウントの場合は再審査が必要です。店舗名（ブランド名）をそのまま使用するのが無難です。地域名を入れる場合は「〇〇サロン｜渋谷店」のように区切りましょう。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="profile-setup" className="text-xl font-bold text-gray-800">プロフィール設定のポイント</h2>
        <p>プロフィールはお客様が友だち追加前に目にする最初の情報です。第一印象を左右する重要な要素を整えましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">設定すべき5つの要素</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong>プロフィール画像</strong> — サロンのロゴまたは外観写真。正方形で鮮明なものを使用</li>
          <li><strong>ステータスメッセージ</strong> — 「渋谷駅徒歩3分のネイルサロン｜LINEで簡単予約」のように端的に</li>
          <li><strong>営業時間</strong> — 定休日も含めて正確に設定。Googleマップと情報を統一</li>
          <li><strong>住所・アクセス</strong> — 最寄り駅からの経路がわかる情報を記載</li>
          <li><strong>Webサイト</strong> — ホットペッパーページやInstagramのリンクを設定</li>
        </ul>
      </section>

      <section>
        <h2 id="greeting-message" className="text-xl font-bold text-gray-800">あいさつメッセージの設定</h2>
        <p>あいさつメッセージは友だち追加直後に自動送信されるメッセージです。<strong>開封率が非常に高い</strong>のため、お客様の次のアクションにつなげる重要なタッチポイントです。</p>

        <Callout type="success" title="効果的なあいさつメッセージの構成">
          <ol className="list-decimal pl-4 space-y-1 mt-1">
            <li><strong>お礼</strong> — 「友だち追加ありがとうございます！」</li>
            <li><strong>自己紹介</strong> — サロンの特徴を1〜2行で</li>
            <li><strong>メリット提示</strong> — LINE限定クーポンや予約の便利さをアピール</li>
            <li><strong>次のアクション</strong> — 「下のメニューから簡単予約できます」と案内</li>
          </ol>
        </Callout>

        <Callout type="warning" title="長すぎるメッセージはNG">
          あいさつメッセージは3吹き出し以内に収めましょう。長すぎるメッセージは読まれず、即ブロックの原因になります。友だち集めの詳しい施策は<Link href="/salon/column/salon-line-friends-collection-strategies" className="text-blue-600 underline">LINE友だち集め10の施策</Link>で解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="initial-settings" className="text-xl font-bold text-gray-800">初期設定チェックリスト</h2>
        <p>アカウント開設後、最初の1週間で以下の設定を完了させましょう。</p>

        <FlowSteps steps={[
          { title: "プロフィール設定", desc: "画像・ステータスメッセージ・営業時間・住所・Webサイトを入力" },
          { title: "あいさつメッセージ設定", desc: "友だち追加時の自動メッセージを作成。クーポンや予約導線を含める" },
          { title: "リッチメニュー設定", desc: "予約・クーポン・スタンプカード等のボタンを配置。詳しくは別記事で解説" },
          { title: "応答設定", desc: "チャットモード有効化＋営業時間外の自動応答メッセージを設定" },
          { title: "通知設定", desc: "スタッフのスマートフォンに新着メッセージ通知を設定" },
        ]} />

        <p className="mt-4">リッチメニューの具体的な設計方法は<Link href="/salon/column/salon-rich-menu-design-guide" className="text-blue-600 underline">サロン向けリッチメニューの作り方</Link>で詳しく解説しています。運用開始後の1ヶ月間の具体的なロードマップは<Link href="/salon/column/salon-line-first-month-roadmap" className="text-blue-600 underline">LINE運用開始1ヶ月ロードマップ</Link>をご参照ください。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <StatGrid stats={[
          { value: "10分", label: "アカウント開設にかかる時間" },
          { value: "0円", label: "開設・フリープランの月額料金" },
          { value: "200通", label: "フリープランの月間配信数" },
        ]} />

        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>まず未認証アカウントで開設</strong> — 即日開設可能。後から認証申請できる</li>
          <li><strong>プロフィールを丁寧に設定</strong> — 友だち追加前のお客様が最初に目にする情報</li>
          <li><strong>あいさつメッセージで次のアクションへ誘導</strong> — クーポンや予約案内を含める</li>
          <li><strong>初期設定チェックリストを1週間で完了</strong> — リッチメニュー・応答設定・通知設定まで</li>
        </ol>
        <p className="mt-4">Lオペ for SALONでは、LINE公式アカウントの初期設定から運用改善までワンストップでサポートします。まずは無料でアカウントを開設し、サロンのLINE活用を始めましょう。</p>
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
