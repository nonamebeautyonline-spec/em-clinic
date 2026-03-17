import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[9];

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: self.title,
  description: self.description,
  datePublished: self.date,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "開業前からLINEを始めるべき3つの理由",
  "開業6ヶ月前〜開業後までの時系列ロードマップ",
  "開業初月から安定集患を実現するLINE活用チェックリスト",
];

const toc = [
  { id: "why-before-opening", label: "開業前からLINEを始める理由" },
  { id: "six-months-before", label: "開業6ヶ月前" },
  { id: "three-months-before", label: "開業3ヶ月前" },
  { id: "one-month-before", label: "開業1ヶ月前" },
  { id: "opening-day", label: "開業当日〜1ヶ月" },
  { id: "ongoing-operation", label: "開業後の継続運用" },
  { id: "checklist", label: "LINE活用チェックリスト" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="開業×LINE" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="why-before-opening" className="text-xl font-bold text-slate-800">開業前からLINEを始めるべき理由</h2>
        <p>クリニックの開業準備では、内装工事・医療機器の選定・スタッフ採用など多くのタスクに追われます。しかし、<strong>集患の準備は開業日からでは遅い</strong>のが実情です。LINE公式アカウントを開業前から活用すべき理由は3つあります。</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>開業初日から予約が入る状態を作れる</strong>
            <p>開業前から友だちを集め、開業日に予約受付を開始すれば、<strong>初日から予約枠が埋まった状態</strong>でスタートできます。開業後にゼロから集患を始めるのと比べ、初月の売上に大きな差が出ます。</p>
          </li>
          <li>
            <strong>地域での認知度を事前に高められる</strong>
            <p>「新しいクリニックがオープンします」という告知をLINEで段階的に配信することで、地域住民の認知度と期待感を醸成。<strong>開業前からファンを作る</strong>ことが可能です。</p>
          </li>
          <li>
            <strong>開業後の運用がスムーズになる</strong>
            <p>開業前にLINEの設定・運用フローを確立しておけば、開業後は診療に集中できます。自動応答・予約連携・問診フォームなど、<strong>開業日から運用が回る状態</strong>を準備しましょう。</p>
          </li>
        </ol>
      </section>

      <section>
        <h2 id="six-months-before" className="text-xl font-bold text-slate-800">開業6ヶ月前: LINE公式アカウント開設+ティザーページ</h2>
        <p>開業の半年前から、LINE公式アカウントの基盤づくりを始めましょう。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">LINE公式アカウントの開設</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>クリニック名でLINE公式アカウントを作成（認証済みアカウントの申請も同時に）</li>
          <li>プロフィール画像にクリニックのロゴを設定</li>
          <li>ステータスメッセージに「〇月開業予定｜友だち登録で開業情報をお届け」と記載</li>
          <li>あいさつメッセージを設定: 「友だち追加ありがとうございます。〇〇クリニックは〇月に開業予定です。最新情報をLINEでお届けしますので、楽しみにお待ちください。」</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">ティザーページの作成</h3>
        <p>簡易的なランディングページ（LP）を作成し、<strong>クリニックの概要・開業予定日・LINE友だち追加ボタン</strong>を掲載します。このページのURLをSNS・チラシ・名刺に記載して友だちを集めます。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>診療科目・特色（「〇〇専門」「〇〇に特化」など差別化ポイント）</li>
          <li>院長の経歴・メッセージ（信頼感の醸成）</li>
          <li>開業予定日・所在地（地図埋め込み）</li>
          <li>LINE友だち追加QRコード・ボタン（ページの目立つ位置に）</li>
        </ul>
      </section>

      <section>
        <h2 id="three-months-before" className="text-xl font-bold text-slate-800">開業3ヶ月前: 友だち先行登録+開業告知</h2>
        <p>開業3ヶ月前からは、友だち獲得のアクセルを踏みましょう。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">友だち先行登録キャンペーン</h3>
        <p>「開業前に友だち登録された方限定」の特典を用意し、登録のインセンティブを高めます。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>先行予約権</strong>: 一般公開前に優先的に予約できる権利</li>
          <li><strong>開業記念特典</strong>: 初回施術の割引、カウンセリング無料など</li>
          <li><strong>内覧会への優先招待</strong>: 開業前の院内見学に特別招待</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">開業告知の段階的配信</h3>
        <p>友だちに対して、開業準備の進捗を<strong>週1〜2回のペースで配信</strong>します。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>「内装工事が始まりました」（工事写真とともに）</li>
          <li>「医療機器が搬入されました」（設備紹介）</li>
          <li>「スタッフ紹介」（親しみやすい写真とコメント）</li>
          <li>「診療メニューが決まりました」（料金表・特色の紹介）</li>
        </ul>
        <p>この段階的な情報発信により、友だちの<strong>期待感と親近感が高まり</strong>、開業時のリピーター予備軍が形成されます。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="one-month-before" className="text-xl font-bold text-slate-800">開業1ヶ月前: 予約受付開始+内覧会案内</h2>
        <p>開業1ヶ月前は、いよいよ具体的なアクションを促すフェーズです。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">LINE予約受付の開始</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>リッチメニューに「予約する」ボタンを設置</li>
          <li>LINE友だちに「本日より予約受付を開始しました」と一斉配信</li>
          <li>先行登録者限定の優先予約期間を設ける（一般公開の1週間前など）</li>
          <li>自動応答で予約の受付完了メッセージ・持ち物案内を設定</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">内覧会の案内</h3>
        <p>開業前の内覧会は、地域住民との関係構築に最適なイベントです。LINEで内覧会の案内を配信し、参加者を募りましょう。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>内覧会の日時・場所をLINEで配信（リッチメッセージで視覚的に）</li>
          <li>LINE上で参加申し込みを受付（出席人数の把握）</li>
          <li>内覧会当日のリマインドをLINEで自動送信</li>
          <li>来場者に対して「本日はありがとうございました」+予約促進メッセージを送信</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">問診フォームの準備</h3>
        <p>開業初日からスムーズに診察を行うため、LINE上で事前問診ができる環境を整えておきます。予約した患者に自動で問診フォームが送信される設定にしておけば、<strong>開業初日から待ち時間の少ない運営</strong>が可能です。</p>
      </section>

      <section>
        <h2 id="opening-day" className="text-xl font-bold text-slate-800">開業当日〜1ヶ月: 初回来院フォロー+口コミ促進</h2>
        <p>開業後の最初の1ヶ月は、来院した患者の満足度を最大化し、<strong>口コミとリピートの好循環</strong>を生み出す重要な期間です。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">初回来院後のフォローメッセージ</h3>
        <p>来院翌日に自動でフォローメッセージを送信しましょう。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>「本日はご来院ありがとうございました。体調の変化やご質問がございましたら、こちらのLINEからお気軽にご連絡ください。」</li>
          <li>次回予約の案内: 「次回の来院時期は〇〇頃が目安です。ご都合の良い日時をLINEからお選びください。」</li>
          <li>アフターケア情報: 施術内容に応じた注意事項やセルフケアのアドバイス</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">口コミ促進</h3>
        <p>開業初期の口コミは、その後の集患に大きく影響します。来院後3〜7日後に、<strong>Googleマップへの口コミ投稿をお願いするメッセージ</strong>をLINEで送信しましょう。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>「ご来院いただきありがとうございました。当院のサービス向上のため、Googleマップでのクチコミにご協力いただけると幸いです。」+Googleマップの口コミ投稿リンク</li>
          <li>口コミ投稿者への特典（次回予約時の優先枠など）を用意すると投稿率アップ</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">来院患者への友だち追加促進</h3>
        <p>開業直後は、来院した全患者にLINE友だち追加を案内します。受付で声かけ+QRコードPOP+登録特典の3点セットで、<strong>来院患者の80%以上のLINE登録率</strong>を目指しましょう。</p>
      </section>

      <section>
        <h2 id="ongoing-operation" className="text-xl font-bold text-slate-800">開業後の継続運用: リピート促進+紹介キャンペーン</h2>
        <p>開業後1ヶ月以降は、リピート率の向上と新規患者の継続獲得に注力します。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">リピート促進の自動化</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>定期リマインド</strong>: 前回来院から一定期間経過した患者に自動でリマインドメッセージを送信</li>
          <li><strong>季節の健康情報</strong>: 花粉症シーズン・インフルエンザシーズンなど、季節に合わせた予防・受診案内</li>
          <li><strong>誕生日メッセージ</strong>: 患者の誕生月に特別メッセージ+特典を配信</li>
          <li><strong>セグメント配信</strong>: 診療内容・年齢層・来院回数でセグメントし、パーソナルな配信を実施</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">紹介キャンペーン</h3>
        <p>既存患者から新規患者を紹介してもらうキャンペーンは、<strong>広告費ゼロで高品質な新規患者を獲得</strong>できる強力な施策です。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>LINEで「お友達紹介キャンペーン」のメッセージを配信</li>
          <li>紹介者・被紹介者の双方に特典を付与（Win-Winの設計）</li>
          <li>紹介用のLINE友だち追加リンクをワンタップで共有できる仕組み</li>
          <li>紹介実績の追跡・特典の自動付与をシステム化</li>
        </ul>
        <p>開業後3〜6ヶ月で友だち数500人を超えれば、セグメント配信やキャンペーンの効果が目に見えて表れるようになります。<strong>最初の半年が、その後の安定経営の基盤を決める</strong>重要な期間です。</p>
      </section>

      <section>
        <h2 id="checklist" className="text-xl font-bold text-slate-800">開業時のLINE活用チェックリスト</h2>
        <p>開業準備に合わせて、以下のチェックリストを確認しましょう。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">開業6ヶ月前</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>LINE公式アカウント開設・認証済みアカウント申請</li>
          <li>プロフィール・あいさつメッセージの設定</li>
          <li>ティザーLP作成・LINE友だち追加ボタン設置</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">開業3ヶ月前</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>先行登録キャンペーンの開始</li>
          <li>週1〜2回の開業準備レポート配信</li>
          <li>SNS（Instagram等）でのクロス集客開始</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">開業1ヶ月前</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>リッチメニュー設計・設定</li>
          <li>LINE予約受付の開始</li>
          <li>問診フォームの設定・テスト</li>
          <li>内覧会の案内配信</li>
          <li>自動応答メッセージの設定</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">開業後</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>来院患者への友だち追加促進（声かけ+POP+特典）</li>
          <li>来院後フォローメッセージの自動配信設定</li>
          <li>口コミ促進メッセージの配信</li>
          <li>紹介キャンペーンの開始</li>
          <li>定期リマインド・セグメント配信の開始</li>
        </ul>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-slate-800">まとめ: 開業前からのLINE活用が集患の成否を分ける</h2>
        <p>クリニック開業の成功は「開業日にどれだけ患者が来るか」で大きく左右されます。LINE公式アカウントを<strong>開業6ヶ月前から戦略的に活用</strong>することで、開業初日から予約が入る状態を作り、その後のリピート促進・口コミ拡散の好循環を生み出せます。</p>
        <p>Lオペ for CLINICは、開業準備期間からのLINE構築をトータルサポート。アカウント開設・リッチメニュー設計・予約連携・問診フォーム・自動配信まで、<strong>開業に必要なLINE機能をワンパッケージ</strong>で提供しています。開業を控えたドクターは、ぜひ早めにご相談ください。</p>
      </section>
    </ArticleLayout>
  );
}
