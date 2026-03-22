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
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: self.title,
  description: self.description,
  datePublished: self.date,
  dateModified: self.updatedDate || self.date,
  image: `${SITE_URL}/lp/column/${self.slug}/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
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
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニックのLINE公式アカウント運用において、手動で行っている業務を自動化することで<strong>スタッフの作業時間を月40時間以上削減</strong>できます。本記事では、予約リマインド・フォローアップ・AI返信・セグメント配信の4つの自動化を段階的に導入する方法を解説します。</p>

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

        <p>自動化を導入したクリニックでは、受付スタッフの電話対応時間が87%削減され、空いた時間を患者対応の質向上に充てられるようになっています。手動では不可能だった「全患者への個別フォロー」も、自動化によって実現可能になります。</p>
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
        <p>診察後のフォローアップメッセージを自動配信することで、患者の満足度と再診率を同時に向上させることができます。<Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信によるリピート率向上</Link>と組み合わせると、さらに効果的です。</p>

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
        <p>AI返信を導入することで、患者からの問い合わせに24時間即座に対応できるようになります。詳しい導入手順は<Link href="/lp/column/ai-auto-reply-guide" className="text-sky-600 underline hover:text-sky-800">AI自動返信導入ガイド</Link>で解説していますが、ここでは自動化の観点からポイントを紹介します。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>初期設定</strong>：クリニックの基本情報（診療時間・アクセス・診療科目）をナレッジベースに登録</li>
          <li><strong>学習データの蓄積</strong>：スタッフが修正した返信内容をAIが自動学習し、精度が日々向上</li>
          <li><strong>エスカレーション設定</strong>：AIが回答できない質問はスタッフに自動転送。対応漏れを防止</li>
          <li><strong>営業時間外対応</strong>：夜間・休診日の問い合わせにもAIが即座に回答。新患獲得機会を逃さない</li>
        </ul>

        <Callout type="success" title="AI返信の効果">
          導入クリニックでは、問い合わせ対応の70%をAIが自動処理。スタッフの対応時間が1日あたり2時間削減され、患者の平均応答時間は30分から30秒に短縮されました。
        </Callout>

        <p>AI返信の精度をさらに高める方法については、<Link href="/lp/column/clinic-ai-reply-guide" className="text-sky-600 underline hover:text-sky-800">AI返信活用ガイド</Link>で詳しく解説しています。</p>
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

        <p>LINE自動化は、一度設定すれば継続的に効果を発揮する「仕組み」です。Lオペ for CLINICなら、これらの自動化をノーコードで設定でき、クリニックの規模やスタッフのITスキルに関係なく導入可能です。まずは予約リマインドの自動化から始めて、段階的に自動化の範囲を広げていくことをおすすめします。</p>
      </section>
    </ArticleLayout>
  );
}
