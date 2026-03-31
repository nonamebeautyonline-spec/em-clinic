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
const self = articles.find((a) => a.slug === "clinic-line-automation")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/clinic/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "LINE自動化の設定にプログラミング知識は必要ですか？", a: "必要ありません。Lオペ for CLINICではノーコードで予約リマインド・フォローアップ配信・AI返信の設定が可能です。管理画面上でテンプレートを選んで条件を設定するだけで自動化を始められます。" },
  { q: "自動メッセージで患者に冷たい印象を与えませんか？", a: "テンプレートをクリニックのトーンに合わせてカスタマイズすれば、手動返信と遜色ない温かみを持たせられます。AI自動返信はスタッフの返信パターンを学習するため、使うほど自然な文面になります。" },
  { q: "予約リマインドはどのタイミングで送るのが効果的ですか？", a: "前日の夕方（17〜18時）に送信するのが最も効果的です。当日朝だとキャンセル連絡が間に合わず、2日前だと忘れてしまうため、前日送信が無断キャンセル削減に最も効果があります。" },
  { q: "自動化と手動対応のバランスはどう取ればいいですか？", a: "定型業務（予約リマインド・問診送付・受付案内）は完全自動化し、医療相談・クレーム対応・複雑な質問はスタッフが対応する、という線引きがおすすめです。AIが判断に迷う質問は自動でスタッフに引き継ぐ設定も可能です。" },
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
  "予約リマインド自動化で無断キャンセルを80%削減",
  "フォローアップ自動配信で再診率を30%向上",
  "AI返信設定で24時間の問い合わせ対応を実現",
  "セグメント配信の自動化で配信業務を月10時間削減",
];

const toc = [
  { id: "why-automation", label: "LINE自動化が必要な理由" },
  { id: "reminder", label: "予約リマインドの自動化" },
  { id: "followup", label: "フォローアップ自動配信" },
  { id: "ai-reply", label: "AI返信の設定と運用" },
  { id: "segment", label: "セグメント配信の自動化" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINEの月間利用者数は<strong>9,700万人以上</strong>（2024年時点）、日本人口の<strong>約86%</strong>をカバーし、メッセージ開封率は<strong>約90%</strong>とメールの3〜7倍に達します。この圧倒的なリーチを持つLINE公式アカウントの運用において、手動で行っている業務を自動化することで<strong>スタッフの作業時間を月40時間以上削減</strong>できます。本記事では、予約リマインド・フォローアップ・AI返信・セグメント配信の4つの自動化を段階的に導入する方法を解説します。</p>

      {/* ── LINE自動化が必要な理由 ── */}
      <section>
        <h2 id="why-automation" className="text-xl font-bold text-gray-800">LINE自動化が必要な理由</h2>
        <p>多くのクリニックでは、LINE公式アカウントを導入しても「配信作業に手が回らない」「返信が遅れて患者を逃す」という課題を抱えています。手動運用の限界を超えるには、自動化の仕組みが不可欠です。</p>

        <StatGrid stats={[
          { value: "87", unit: "%", label: "電話対応削減率" },
          { value: "40", unit: "時間/月", label: "スタッフ作業削減" },
          { value: "80", unit: "%", label: "無断キャンセル削減" },
          { value: "30", unit: "%", label: "再診率向上" },
        ]} />

        <p>自動化を導入したクリニックでは、受付スタッフの電話対応時間が87%削減され、空いた時間を患者対応の質向上に充てられるようになっています。手動では不可能だった「全患者への個別フォロー」も、自動化によって実現可能になります。具体的な活用事例は<Link href="/clinic/column/clinic-line-case-studies" className="text-sky-600 underline hover:text-sky-800">クリニックのLINE活用事例5選</Link>で紹介しています。</p>
      </section>

      {/* ── 予約リマインド ── */}
      <section>
        <h2 id="reminder" className="text-xl font-bold text-gray-800">予約リマインドの自動化</h2>
        <p>予約リマインドは、LINE自動化の中でも最もROIが高い施策です。予約の前日と当日朝に自動でLINEメッセージを送信することで、無断キャンセルを大幅に削減できます。</p>

        <FlowSteps steps={[
          { title: "リマインドルールの設定", desc: "予約の24時間前と2時間前にメッセージを自動送信するルールを設定。診療科目や予約種別ごとにメッセージ内容をカスタマイズ。" },
          { title: "メッセージテンプレートの作成", desc: "患者名・予約日時・診療内容を自動挿入するテンプレートを作成。キャンセル・変更用のリンクも自動付与。" },
          { title: "送信結果の確認", desc: "送信成功率・開封率・キャンセル変更率をダッシュボードで確認。メッセージ内容を改善してさらに効果を高める。" },
        ]} />

        <Callout type="info" title="リマインドのタイミングが重要">
          前日の18時と当日の朝9時がもっとも効果的なタイミングです。送信時間帯を患者の生活リズムに合わせることで、開封率が15%向上した事例があります。
        </Callout>
      </section>

      {/* ── フォローアップ ── */}
      <section>
        <h2 id="followup" className="text-xl font-bold text-gray-800">フォローアップ自動配信</h2>
        <p>診察後のフォローアップメッセージを自動配信することで、患者の満足度と再診率を同時に向上させることができます。<Link href="/clinic/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信によるリピート率向上</Link>と組み合わせると、さらに効果的です。</p>

        <FlowSteps steps={[
          { title: "診察翌日：経過確認メッセージ", desc: "「体調はいかがですか？」という経過確認メッセージを自動送信。患者は安心感を得られ、不安があればすぐに相談できる。" },
          { title: "3日後：フォローアップメッセージ", desc: "治療経過の確認メッセージをフォローアップルールで自動送信。患者との継続的な接点を維持できる。" },
          { title: "2週間後：再診促進メッセージ", desc: "次回の来院を促すメッセージを自動送信。予約リンクを付与して、ワンタップで予約できるようにする。" },
        ]} />

        <ResultCard
          before="再診率 45%"
          after="再診率 68%"
          metric="フォローアップ自動化で再診率23ポイント向上"
          description="3段階の自動フォローで患者との接点を維持"
        />
      </section>

      <InlineCTA />

      {/* ── AI返信 ── */}
      <section>
        <h2 id="ai-reply" className="text-xl font-bold text-gray-800">AI返信の設定と運用</h2>
        <p>AI返信を導入することで、患者からの問い合わせに24時間即座に対応できるようになります。詳しい導入手順は<Link href="/clinic/column/ai-auto-reply-guide" className="text-sky-600 underline hover:text-sky-800">AI自動返信導入ガイド</Link>で解説していますが、ここでは自動化の観点からポイントを紹介します。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>初期設定</strong>：クリニックの基本情報（診療時間・アクセス・診療科目）をナレッジベースに登録</li>
          <li><strong>学習データの蓄積</strong>：スタッフが修正した返信内容をAIが自動学習し、精度が日々向上</li>
          <li><strong>エスカレーション設定</strong>：AIが回答できない質問はスタッフに自動転送。対応漏れを防止</li>
          <li><strong>営業時間外対応</strong>：夜間・休診日の問い合わせにもAIが即座に回答。新患獲得機会を逃さない</li>
        </ul>

        <Callout type="success" title="AI返信の効果">
          導入クリニックでは、問い合わせ対応の70%をAIが自動処理。スタッフの対応時間が1日あたり2時間削減され、患者の平均応答時間は30分から30秒に短縮されました。
        </Callout>

        <p>AI返信の精度をさらに高める方法については、<Link href="/clinic/column/clinic-ai-reply-guide" className="text-sky-600 underline hover:text-sky-800">AI返信活用ガイド</Link>で詳しく解説しています。</p>
      </section>

      {/* ── セグメント配信 ── */}
      <section>
        <h2 id="segment" className="text-xl font-bold text-gray-800">セグメント配信の自動化</h2>
        <p>患者の属性や行動履歴に基づいたセグメント配信を自動化することで、手動では不可能だった「一人ひとりに最適なメッセージ」を届けられるようになります。</p>

        <FlowSteps steps={[
          { title: "セグメント条件の設定", desc: "最終来院日・診療科目・年齢・タグなどの条件を組み合わせてセグメントを作成。AIによる自然言語クエリにも対応。" },
          { title: "配信シナリオの設計", desc: "セグメントごとに配信内容・タイミング・頻度を設定。季節性の施策やキャンペーン情報も事前にスケジュール可能。" },
          { title: "自動配信の実行・効果測定", desc: "設定した条件に合致する患者に自動配信。開封率・クリック率・予約率をリアルタイムで計測し、次回の配信を改善。" },
        ]} />

        <StatGrid stats={[
          { value: "80", unit: "%", label: "開封率" },
          { value: "25", unit: "%", label: "クリック率" },
          { value: "12", unit: "%", label: "予約転換率" },
          { value: "10", unit: "時間/月", label: "配信業務削減" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="LINE自動化の4つのステップ">
          <ul className="mt-1 space-y-1">
            <li>1. 予約リマインドの自動化で無断キャンセルを80%削減</li>
            <li>2. フォローアップ自動配信で再診率を30ポイント向上</li>
            <li>3. AI返信で24時間の問い合わせ対応を実現し、応答時間を30秒に</li>
            <li>4. セグメント配信の自動化で月10時間の配信業務を削減</li>
          </ul>
        </Callout>

        <p>LINE自動化は、一度設定すれば継続的に効果を発揮する「仕組み」です。Lオペ for CLINICなら、これらの自動化をノーコードで設定でき、クリニックの規模やスタッフのITスキルに関係なく導入可能です。まずは予約リマインドの自動化から始めて、段階的に自動化の範囲を広げていくことをおすすめします。導入のROI計算方法は<Link href="/clinic/column/clinic-line-roi" className="text-sky-600 underline hover:text-sky-800">LINE導入ROIの計算方法</Link>で解説しています。スタッフへの研修・定着方法は<Link href="/clinic/column/clinic-staff-training" className="text-sky-600 underline hover:text-sky-800">スタッフ研修ガイド</Link>もご覧ください。</p>
        <p className="text-[13px] mt-2">
          あわせて読みたい: <a href="/clinic/column/clinic-dx-guide" className="text-blue-600 underline">クリニック LINE DXガイド — 予約・問診・会計をデジタル化する5ステップ</a>
        </p>
        <p className="text-[13px] mt-2">
          あわせて読みたい: <a href="/clinic/column/clinic-repeat-rate-improvement" className="text-blue-600 underline">クリニック LINE リピート率改善 — 自動フォローで再診率1.5倍にする方法</a>
        </p>
        <p className="text-[13px] mt-2">
          あわせて読みたい: <a href="/clinic/column/online-clinic-complete-guide" className="text-blue-600 underline">オンライン診療 LINE連携ガイド — 開業準備・集患・運用を徹底解説</a>
        </p>
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
