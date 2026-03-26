import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ComparisonTable, FlowSteps, BarChart, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-opening-line")!;

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
  datePublished: `${self.date}T00:00:00+09:00`,
  dateModified: `${self.updatedDate || self.date}T00:00:00+09:00`,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
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

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニック開業時のLINE活用は、<strong>開業6ヶ月前</strong>からアカウント開設・友だち集めを始めるのが成功の鍵です。開業前に友だちを確保しておけば、<strong>初日から予約が入る状態</strong>でスタートできます。本記事では、開業6ヶ月前から開業後までの時系列ロードマップとチェックリストを解説します。
      </p>

      <section>
        <h2 id="why-before-opening" className="text-xl font-bold text-gray-800">開業前からLINEを始めるべき理由</h2>
        <p>クリニックの開業準備では、内装工事・医療機器の選定・スタッフ採用など多くのタスクに追われます。しかし、<strong>集患の準備は開業日からでは遅い</strong>のが実情です。</p>

        <Callout type="warning" title="開業日にゼロスタートは致命的">
          開業後にゼロから集患を始めるのと、開業前から友だちを集めておくのとでは、初月の売上に大きな差が出ます。
        </Callout>

        <FlowSteps steps={[
          { title: "開業初日から予約が入る状態を作れる", desc: "開業前から友だちを集め、開業日に予約受付を開始すれば、初日から予約枠が埋まった状態でスタート可能" },
          { title: "地域での認知度を事前に高められる", desc: "「新クリニックがオープンします」という告知をLINEで段階配信し、地域住民の認知度と期待感を醸成" },
          { title: "開業後の運用がスムーズになる", desc: "開業前にLINE設定・運用フローを確立しておけば、開業後は診療に集中できる" },
        ]} />
      </section>

      <section>
        <h2 id="six-months-before" className="text-xl font-bold text-gray-800">開業6ヶ月前: LINE公式アカウント開設+ティザーページ</h2>
        <p>開業の半年前から、LINE公式アカウントの基盤づくりを始めましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">LINE公式アカウントの開設</h3>
        <ComparisonTable
          headers={["設定項目", "内容", "ポイント"]}
          rows={[
            ["アカウント作成", "クリニック名でLINE公式アカウントを作成", "認証済みアカウントの申請も同時に"],
            ["プロフィール画像", "クリニックのロゴを設定", "ブランド認知の基盤"],
            ["ステータスメッセージ", "「○月開業予定｜友だち登録で開業情報をお届け」", "期待感の醸成"],
            ["あいさつメッセージ", "友だち追加時の自動応答を設定", "開業情報をお届けする旨を伝える"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-6">ティザーページの作成</h3>
        <p>簡易的なランディングページを作成し、<strong>クリニックの概要・開業予定日・LINE友だち追加ボタン</strong>を掲載します。</p>

        <FlowSteps steps={[
          { title: "診療科目・特色", desc: "「○○専門」「○○に特化」など差別化ポイントを明記" },
          { title: "院長の経歴・メッセージ", desc: "信頼感の醸成。顔写真があるとなお良い" },
          { title: "開業予定日・所在地", desc: "地図埋め込みで場所を明確に" },
          { title: "LINE友だち追加QRコード", desc: "ページの目立つ位置に大きく配置" },
        ]} />
      </section>

      <section>
        <h2 id="three-months-before" className="text-xl font-bold text-gray-800">開業3ヶ月前: 友だち先行登録+開業告知</h2>
        <p>開業3ヶ月前からは、友だち獲得のアクセルを踏みましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">友だち先行登録キャンペーン</h3>
        <p>「開業前に友だち登録された方限定」の特典を用意し、登録のインセンティブを高めます。友だちを効率よく集める具体的な手法は<Link href="/lp/column/clinic-line-friends-growth" className="text-sky-600 underline hover:text-sky-800">LINE友だち集め月100人増やす7つの施策</Link>で詳しくまとめています。</p>

        <ComparisonTable
          headers={["特典タイプ", "内容", "効果"]}
          rows={[
            ["先行予約権", "一般公開前に優先的に予約できる権利", "限定感で登録率アップ"],
            ["開業記念特典", "初回施術の割引、カウンセリング無料など", "来院動機の創出"],
            ["内覧会への優先招待", "開業前の院内見学に特別招待", "信頼関係の構築"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-6">開業告知の段階的配信</h3>
        <p>友だちに対して、開業準備の進捗を<strong>週1〜2回のペースで配信</strong>します。</p>

        <FlowSteps steps={[
          { title: "内装工事の開始報告", desc: "工事写真とともに進捗を共有。「着々と準備が進んでいます」" },
          { title: "医療機器の搬入", desc: "最新設備の紹介で期待感を醸成" },
          { title: "スタッフ紹介", desc: "親しみやすい写真とコメントで人柄を伝える" },
          { title: "診療メニュー決定", desc: "料金表・特色の紹介で来院動機を強化" },
        ]} />

        <Callout type="success" title="段階的な情報発信の効果">
          この段階的な情報発信により、友だちの期待感と親近感が高まり、開業時のリピーター予備軍が形成されます。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="one-month-before" className="text-xl font-bold text-gray-800">開業1ヶ月前: 予約受付開始+内覧会案内</h2>
        <p>開業1ヶ月前は、いよいよ具体的なアクションを促すフェーズです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">LINE予約受付の開始</h3>
        <FlowSteps steps={[
          { title: "リッチメニューに「予約する」ボタンを設置", desc: "最も目立つ位置に大きく配置" },
          { title: "予約受付開始の一斉配信", desc: "「本日より予約受付を開始しました」と告知" },
          { title: "先行登録者限定の優先予約期間", desc: "一般公開の1週間前に優先枠を開放" },
          { title: "自動応答の設定", desc: "予約受付完了メッセージ・持ち物案内を設定" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-6">内覧会の案内</h3>
        <ComparisonTable
          headers={["タイミング", "LINE施策", "目的"]}
          rows={[
            ["内覧会2週間前", "日時・場所をリッチメッセージで配信", "参加者の募集"],
            ["内覧会1週間前", "LINE上で参加申し込みを受付", "出席人数の把握"],
            ["内覧会前日", "リマインドメッセージを自動送信", "参加率の向上"],
            ["内覧会当日", "「ありがとう」+予約促進メッセージ", "来院予約への転換"],
          ]}
        />

        <Callout type="point" title="問診フォームも事前準備">
          LINE上で事前問診ができる環境を整えておけば、開業初日から待ち時間の少ない運営が可能です。予約した患者に自動で問診フォームが送信される設定にしておきましょう。問診の導入方法は<Link href="/lp/column/online-questionnaire-guide" className="text-sky-600 underline hover:text-sky-800">オンライン問診導入ガイド</Link>で詳しく解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="opening-day" className="text-xl font-bold text-gray-800">開業当日〜1ヶ月: 初回来院フォロー+口コミ促進</h2>
        <p>開業後の最初の1ヶ月は、来院した患者の満足度を最大化し、<strong>口コミとリピートの好循環</strong>を生み出す重要な期間です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">初回来院後のフォローメッセージ</h3>
        <FlowSteps steps={[
          { title: "来院翌日: お礼メッセージ", desc: "「本日はご来院ありがとうございました。体調変化やご質問があればLINEからお気軽にどうぞ」" },
          { title: "来院翌日: 次回予約の案内", desc: "「次回来院は○○頃が目安です。LINEからご都合の良い日時をお選びください」" },
          { title: "来院翌日: アフターケア情報", desc: "施術内容に応じた注意事項やセルフケアのアドバイスを配信" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-6">口コミ促進</h3>
        <Callout type="success" title="開業初期の口コミが成否を分ける">
          来院後3〜7日後に、Googleマップへの口コミ投稿をお願いするメッセージをLINEで送信しましょう。口コミ投稿者への特典（次回予約時の優先枠など）を用意すると投稿率がアップします。
        </Callout>

        <DonutChart percentage={80} label="来院患者のLINE登録率目標" sublabel="声かけ+POP+特典の3点セットで達成" />
      </section>

      <section>
        <h2 id="ongoing-operation" className="text-xl font-bold text-gray-800">開業後の継続運用: リピート促進+紹介キャンペーン</h2>
        <p>開業後1ヶ月以降は、リピート率の向上と新規患者の継続獲得に注力します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">リピート促進の自動化</h3>
        <ComparisonTable
          headers={["施策", "内容", "効果"]}
          rows={[
            ["定期リマインド", "前回来院から一定期間後に自動送信", "定期通院の促進"],
            ["季節の健康情報", "花粉症・インフルエンザなど季節に合わせた案内", "予防受診の促進"],
            ["誕生日メッセージ", "患者の誕生月に特別メッセージ+特典", "ロイヤリティ向上"],
            ["セグメント配信", "診療内容・年齢層・来院回数で配信分け", "パーソナル体験の提供"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-6">紹介キャンペーン</h3>
        <Callout type="point" title="広告費ゼロで高品質な新規患者を獲得">
          紹介者・被紹介者の双方に特典を付与するWin-Winの設計がポイント。LINEで紹介用リンクをワンタップ共有できる仕組みを構築しましょう。
        </Callout>

        <StatGrid stats={[
          { value: "500", unit: "人", label: "3〜6ヶ月の友だち目標" },
          { value: "0", unit: "円", label: "紹介キャンペーン広告費" },
          { value: "80", unit: "%", label: "目標LINE登録率" },
        ]} />

        <p>開業後3〜6ヶ月で友だち数500人を超えれば、セグメント配信やキャンペーンの効果が目に見えて表れるようになります。<strong>最初の半年が、その後の安定経営の基盤を決める</strong>重要な期間です。開業資金の調達方法については<Link href="/lp/column/clinic-opening-fund-guide" className="text-sky-600 underline hover:text-sky-800">開業資金調達ガイド</Link>もあわせてご確認ください。</p>
      </section>

      <section>
        <h2 id="checklist" className="text-xl font-bold text-gray-800">開業時のLINE活用チェックリスト</h2>
        <p>開業準備に合わせて、以下のチェックリストを確認しましょう。</p>

        <ComparisonTable
          headers={["時期", "タスク", "完了"]}
          rows={[
            ["6ヶ月前", "LINE公式アカウント開設・認証済みアカウント申請", ""],
            ["6ヶ月前", "プロフィール・あいさつメッセージの設定", ""],
            ["6ヶ月前", "ティザーLP作成・LINE友だち追加ボタン設置", ""],
            ["3ヶ月前", "先行登録キャンペーンの開始", ""],
            ["3ヶ月前", "週1〜2回の開業準備レポート配信", ""],
            ["3ヶ月前", "SNS（Instagram等）でのクロス集客開始", ""],
            ["1ヶ月前", "リッチメニュー設計・設定", ""],
            ["1ヶ月前", "LINE予約受付の開始", ""],
            ["1ヶ月前", "問診フォームの設定・テスト", ""],
            ["1ヶ月前", "内覧会の案内配信", ""],
            ["1ヶ月前", "自動応答メッセージの設定", ""],
            ["開業後", "来院患者への友だち追加促進（声かけ+POP+特典）", ""],
            ["開業後", "来院後フォローメッセージの自動配信設定", ""],
            ["開業後", "口コミ促進メッセージの配信", ""],
            ["開業後", "紹介キャンペーンの開始", ""],
            ["開業後", "定期リマインド・セグメント配信の開始", ""],
          ]}
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 開業前からのLINE活用が集患の成否を分ける</h2>
        <p>クリニック開業の成功は「開業日にどれだけ患者が来るか」で大きく左右されます。LINE公式アカウントを<strong>開業6ヶ月前から戦略的に活用</strong>することで、開業初日から予約が入る状態を作り、その後のリピート促進・口コミ拡散の好循環を生み出せます。リッチメニューの具体的な設計手法は<Link href="/lp/column/rich-menu-design" className="text-sky-600 underline hover:text-sky-800">リッチメニュー設計5つのポイント</Link>で、開業後の経営戦略については<Link href="/lp/column/clinic-management-success" className="text-sky-600 underline hover:text-sky-800">クリニック経営で成功するポイント</Link>で解説していますので、合わせてご確認ください。</p>

        <BarChart
          data={[
            { label: "6ヶ月前", value: 20, color: "bg-gray-400" },
            { label: "3ヶ月前", value: 50, color: "bg-sky-400" },
            { label: "1ヶ月前", value: 80, color: "bg-sky-500" },
            { label: "開業後1ヶ月", value: 100, color: "bg-emerald-500" },
          ]}
          unit="（準備完了度%）"
        />

        <p>Lオペ for CLINICは、開業準備期間からのLINE構築をトータルサポート。アカウント開設・リッチメニュー設計・予約連携・問診フォーム・自動配信まで、<strong>開業に必要なLINE機能をワンパッケージ</strong>で提供しています。<Link href="/lp/features" className="text-sky-600 underline hover:text-sky-800">全機能一覧</Link>もご確認の上、開業を控えたドクターはぜひ早めにご相談ください。</p>
      </section>
    </ArticleLayout>
  );
}
