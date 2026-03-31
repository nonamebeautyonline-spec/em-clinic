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
const self = articles.find((a) => a.slug === "clinic-staff-training")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/clinic/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "クリニックスタッフのLINE運用研修ガイドの導入にどのくらいの期間がかかりますか？", a: "基本的な設定は1〜2週間で完了します。LINE公式アカウントの開設からリッチメニュー設計・自動メッセージ設定まで、Lオペ for CLINICなら初期設定サポート付きで最短2週間で運用開始できます。" },
  { q: "クリニックスタッフのLINE運用研修ガイドでスタッフの負荷は増えませんか？", a: "むしろ減ります。電話対応・手動での予約管理・問診確認などの定型業務を自動化することで、スタッフの作業時間を月40時間以上削減できた事例もあります。導入初月はサポートを受けながら進めれば、2ヶ月目以降はスムーズに運用できます。" },
  { q: "小規模クリニックでも導入効果はありますか？", a: "はい、むしろ小規模クリニックほど効果を実感しやすいです。スタッフ数が限られる分、業務自動化によるインパクトが大きく、受付1名分の工数を削減できた事例もあります。" },
];

/* FAQPage JSON-LD（Article JSON-LDはArticleLayoutで自動生成） */
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
  "4段階の研修プログラムでITが苦手なスタッフも安心",
  "すぐに使えるマニュアル作成のテンプレートを紹介",
  "よくあるつまずきポイントと対策を事前に把握",
  "研修後の定着率を高めるフォローアップ方法",
];

const toc = [
  { id: "why-training", label: "なぜスタッフ研修が重要なのか" },
  { id: "4-step-program", label: "4段階の研修プログラム" },
  { id: "manual-template", label: "マニュアル作成のテンプレート" },
  { id: "common-mistakes", label: "よくあるつまずきポイントと対策" },
  { id: "follow-up", label: "研修後の定着を促すフォローアップ" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINE公式アカウントを導入しても、スタッフが使いこなせなければ効果は半減します。本記事では、<strong>ITが苦手なスタッフでも2週間で基本操作をマスター</strong>できる4段階の研修プログラムと、すぐに使えるマニュアル作成テンプレートを紹介します。</p>

      {/* ── なぜ研修 ── */}
      <section>
        <h2 id="why-training" className="text-xl font-bold text-gray-800">なぜスタッフ研修が重要なのか</h2>
        <p>クリニックのDXツール導入が失敗する最大の原因は「ツールの問題」ではなく「運用の問題」です。特にLINE公式アカウントは日常業務に密接に関わるため、全スタッフが基本操作を理解していることが成功の前提条件になります。</p>

        <StatGrid stats={[
          { value: "67", unit: "%", label: "DX失敗の原因は運用" },
          { value: "80", unit: "%", label: "スタッフの操作不安" },
          { value: "2", unit: "週間", label: "基本操作の習得期間" },
          { value: "3", unit: "倍", label: "研修後の活用度向上" },
        ]} />

        <Callout type="info" title="院長1人が使いこなしても意味がない">
          LINE公式アカウントの運用は、受付スタッフ・看護師・事務スタッフが日常的に触るものです。院長だけが操作できても、不在時に対応できない・属人化する・スタッフのモチベーションが下がるなど、運用が続きません。自動化の仕組みを整備した上で、スタッフ全員が基本操作を理解している状態が理想です。
        </Callout>

        <p>LINE自動化で属人化を防ぐ方法は<Link href="/clinic/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">LINE自動化完全ガイド</Link>で詳しく解説しています。</p>
      </section>

      {/* ── 4段階プログラム ── */}
      <section>
        <h2 id="4-step-program" className="text-xl font-bold text-gray-800">4段階の研修プログラム</h2>
        <p>研修は一度に全てを教え込むのではなく、段階的に進めることが重要です。各段階で「できること」を明確にし、成功体験を積み重ねましょう。</p>

        <FlowSteps steps={[
          { title: "第1段階: 基本操作（1〜2日目）", desc: "管理画面へのログイン・トーク画面の確認・友だち一覧の見方・基本的なメッセージ送信。「触って壊れるものはない」という安心感を持たせる。" },
          { title: "第2段階: 日常業務（3〜5日目）", desc: "予約確認・患者へのメッセージ返信・テンプレートを使った定型返信・タグの付与。実際の業務フローに沿って練習。" },
          { title: "第3段階: 応用操作（6〜10日目）", desc: "セグメント配信の作成・リッチメニューの切り替え・配信予約の設定。院長やリーダースタッフが中心に習得。" },
          { title: "第4段階: トラブル対応（11〜14日目）", desc: "よくある質問への対応・ブロックされた場合の対処・エラー時の報告フロー。実際のケーススタディで練習。" },
        ]} />

        <ResultCard
          before="研修なしで導入（3か月後の利用率40%）"
          after="4段階研修を実施（3か月後の利用率95%）"
          metric="ツール活用度が2.4倍に向上"
          description="段階的な学習で「使えない不安」を解消"
        />
      </section>

      {/* ── マニュアル ── */}
      <section>
        <h2 id="manual-template" className="text-xl font-bold text-gray-800">マニュアル作成のテンプレート</h2>
        <p>マニュアルは「読んでわかる」ではなく「見てわかる」形式にすることがポイントです。スクリーンショットを多用し、手順を番号付きで記載しましょう。リッチメニューの設計方法は<Link href="/clinic/column/rich-menu-design" className="text-sky-600 underline hover:text-sky-800">リッチメニュー設計の5つのポイント</Link>も参考になります。</p>

        <Callout type="success" title="効果的なマニュアルの5つのルール">
          <ul className="mt-1 space-y-1">
            <li>・1ページ1手順: 複数の操作を1ページに詰め込まない</li>
            <li>・スクリーンショット必須: 各手順に画面キャプチャを添付</li>
            <li>・操作箇所を赤枠で囲む: 「どこをクリックするか」を視覚的に明示</li>
            <li>・想定される困りごとをQ&A形式で記載</li>
            <li>・更新日を明記: ツールのアップデートに合わせて定期更新</li>
          </ul>
        </Callout>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><strong>ログイン・基本操作マニュアル</strong>: 管理画面URL・ログイン方法・パスワード変更・画面構成の説明</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><strong>メッセージ対応マニュアル</strong>: 患者メッセージの確認・テンプレート返信・個別返信・エスカレーションの判断基準</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><strong>予約管理マニュアル</strong>: 予約一覧の確認・手動での予約変更・キャンセル処理・当日の予約状況把握</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span><strong>トラブル対応マニュアル</strong>: よくあるエラーと対処法・緊急連絡先・報告テンプレート</li>
        </ul>
      </section>

      <InlineCTA />

      {/* ── つまずきポイント ── */}
      <section>
        <h2 id="common-mistakes" className="text-xl font-bold text-gray-800">よくあるつまずきポイントと対策</h2>
        <p>LINE公式アカウントの運用で、スタッフがつまずきやすいポイントを事前に把握しておくことで、研修の効率が大きく向上します。</p>

        <FlowSteps steps={[
          { title: "「間違って送信したらどうしよう」", desc: "対策: テスト用アカウントで練習環境を用意する。本番環境では送信前の確認画面があることを丁寧に説明。最初は必ず先輩スタッフの確認を経てから送信。" },
          { title: "「患者の個人情報を扱うのが怖い」", desc: "対策: セキュリティルールを明文化し、「やってはいけないこと」を具体的にリスト化。スクリーンショットの外部共有禁止、端末ロックの徹底など。" },
          { title: "「どの患者にどのタグを付ければいいかわからない」", desc: "対策: タグ付けルールを一覧表にまとめ、デスクに掲示。迷ったら「タグなし」にして後で院長が確認するフローに。" },
          { title: "「配信のタイミングや内容がわからない」", desc: "対策: 配信カレンダーを月初に作成し、担当者と配信内容を事前に決めておく。テンプレートを充実させて都度考える負担を軽減。" },
        ]} />

        <p>セキュリティ対策の詳細は<Link href="/clinic/column/clinic-line-security" className="text-sky-600 underline hover:text-sky-800">LINE運用セキュリティガイド</Link>をご覧ください。</p>
      </section>

      {/* ── フォローアップ ── */}
      <section>
        <h2 id="follow-up" className="text-xl font-bold text-gray-800">研修後の定着を促すフォローアップ</h2>
        <p>研修で学んだことを定着させるには、研修後のフォローアップが欠かせません。以下の3つの施策で、継続的なスキル向上を図りましょう。</p>

        <FlowSteps steps={[
          { title: "週次の振り返りミーティング（5分）", desc: "毎週月曜の朝礼で「LINE運用の困りごと」を共有。小さな疑問を放置せず、すぐに解決する文化をつくる。" },
          { title: "月次の操作チェックリスト", desc: "月に1度、基本操作ができているかチェックリストで確認。不安な操作は再度マニュアルを見ながら練習。" },
          { title: "成功体験の共有", desc: "「LINEリマインドで無断キャンセルが減った」「患者から感謝された」など、LINE活用の成功体験をスタッフ間で共有。モチベーション維持に直結。" },
        ]} />

        <StatGrid stats={[
          { value: "5", unit: "分/週", label: "振り返りミーティング" },
          { value: "95", unit: "%", label: "3か月後の定着率" },
          { value: "30", unit: "%", label: "スタッフ満足度向上" },
          { value: "0", unit: "件", label: "重大な操作ミス" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="スタッフ研修成功のポイント">
          <ul className="mt-1 space-y-1">
            <li>・4段階の研修プログラムで2週間でLINE基本操作をマスター</li>
            <li>・「見てわかる」マニュアルでITが苦手なスタッフも安心</li>
            <li>・つまずきポイントを事前に把握し、研修で先回りして対策</li>
            <li>・研修後のフォローアップで95%の定着率を実現</li>
          </ul>
        </Callout>

        <p>LINE公式アカウントの効果を最大化するには、ツール選びと同じくらいスタッフ研修が重要です。Lオペ for CLINICでは、導入時の操作研修やマニュアル作成のサポートも提供しています。自動化の仕組みと合わせて、スタッフ全員が安心して使える環境を整えましょう。自動化の設定方法は<Link href="/clinic/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">LINE自動化完全ガイド</Link>、LINE運用ノウハウの全体像は<Link href="/clinic/column/line-operation-guide" className="text-sky-600 underline hover:text-sky-800">LINE運用完全ガイド</Link>もご参照ください。</p>
      </section>
    
      {/* ── FAQ ── */}
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
