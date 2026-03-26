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
const self = articles.find((a) => a.slug === "clinic-google-review")!;

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
  "Google口コミがクリニック集患に与える影響と数値データ",
  "LINE連携で口コミ依頼を自動化し、レビュー数を3倍に",
  "ネガティブレビューへの適切な対応方法",
  "MEO（マップSEO）とLINE口コミ施策の連携戦略",
];

const toc = [
  { id: "importance", label: "Google口コミがクリニック集患に与える影響" },
  { id: "line-review-automation", label: "LINE連携で口コミ依頼を自動化" },
  { id: "negative-review", label: "ネガティブレビューへの対応方法" },
  { id: "meo-strategy", label: "MEO戦略とLINE口コミの連携" },
  { id: "implementation", label: "口コミ施策の導入ステップ" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">Google口コミは新患の<strong>72%が来院前に確認する</strong>クリニック選びの最重要指標です。LINE公式アカウントと連携した口コミ依頼の自動化で、レビュー数を3倍に増やし、MEO（マップSEO）順位の向上にもつなげる方法を解説します。</p>

      {/* ── 口コミの重要性 ── */}
      <section>
        <h2 id="importance" className="text-xl font-bold text-gray-800">Google口コミがクリニック集患に与える影響</h2>
        <p>「近くのクリニック」で検索する患者の多くは、Googleマップの評価を見て来院先を決めています。口コミの数と評価は、クリニックの信頼性を左右する最重要ファクターです。</p>

        <StatGrid stats={[
          { value: "72", unit: "%", label: "口コミ確認率" },
          { value: "4.0", unit: "以上", label: "来院基準の星評価" },
          { value: "3", unit: "倍", label: "口コミ多いクリニックの来院率" },
          { value: "50", unit: "%", label: "口コミなしで離脱する割合" },
        ]} />

        <p>特に新規開業や競合が多いエリアでは、口コミの数と質が集患力に直結します。しかし、多くのクリニックでは口コミ対策を「待つだけ」にしており、能動的な施策を行っていません。<Link href="/lp/column/clinic-line-friends-growth" className="text-sky-600 underline hover:text-sky-800">LINE友だち集めの施策</Link>と口コミ対策を組み合わせることで、相乗効果が得られます。</p>
      </section>

      {/* ── LINE連携で口コミ自動化 ── */}
      <section>
        <h2 id="line-review-automation" className="text-xl font-bold text-gray-800">LINE連携で口コミ依頼を自動化</h2>
        <p>診察後に口コミを依頼するタイミングと方法が、レビュー獲得数を大きく左右します。LINEの自動配信機能を活用すれば、最適なタイミングで自然に口コミを依頼できます。</p>

        <FlowSteps steps={[
          { title: "診察完了をトリガーに設定", desc: "予約ステータスが「診察完了」に変わったタイミングで自動的にフォローメッセージを配信。" },
          { title: "NPS調査で満足度を事前確認", desc: "まずNPSアンケートを送信。高スコアの患者にだけ口コミ依頼を送ることで、ポジティブなレビューを増やす。" },
          { title: "Google口コミページへの直接リンク", desc: "ワンタップでGoogleレビュー投稿ページに遷移するリンクを送信。入力の手間を最小化する。" },
        ]} />

        <Callout type="info" title="口コミ依頼のベストタイミング">
          診察後24〜48時間が口コミ依頼のゴールデンタイムです。患者の診察体験が新鮮なうちに依頼することで、回答率が2倍以上向上します。<Link href="/lp/column/clinic-nps-survey" className="text-sky-600 underline hover:text-sky-800">NPS調査の導入方法</Link>と組み合わせると、さらに効果的です。
        </Callout>

        <ResultCard
          before="月3件の口コミ"
          after="月12件の口コミ"
          metric="LINE自動依頼で口コミ数が4倍に増加"
          description="NPS事前スクリーニングで星4.5以上を維持"
        />
      </section>

      {/* ── ネガティブレビュー ── */}
      <section>
        <h2 id="negative-review" className="text-xl font-bold text-gray-800">ネガティブレビューへの対応方法</h2>
        <p>ネガティブな口コミは避けられないものですが、対応の仕方次第でクリニックの印象を向上させることもできます。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>24時間以内に返信</strong>：迅速な返信は誠実さの証。他の患者にも「対応が丁寧」という印象を与える</li>
          <li><strong>感情的にならず事実ベースで対応</strong>：「ご不便をおかけし申し訳ございません」と謝意を示した上で、改善策を具体的に記載</li>
          <li><strong>個人情報に言及しない</strong>：返信で診療内容や個人を特定する情報に触れないよう注意。HIPAA違反リスクを回避</li>
          <li><strong>LINE上でのフォロー</strong>：口コミを書いた患者がLINE友だちの場合、個別メッセージで丁寧にフォローアップ。<Link href="/lp/column/clinic-reputation-crisis-management" className="text-sky-600 underline hover:text-sky-800">口コミ炎上対策</Link>の記事も参考にしてください</li>
        </ul>

        <Callout type="warning" title="やってはいけない口コミ対応">
          口コミの削除依頼を繰り返す、自作自演の口コミを投稿する、患者と公開の場で論争するなどの行為は、Googleのガイドライン違反やクリニックの信頼低下につながります。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── MEO戦略 ── */}
      <section>
        <h2 id="meo-strategy" className="text-xl font-bold text-gray-800">MEO戦略とLINE口コミの連携</h2>
        <p>MEO（Map Engine Optimization）は、Googleマップでの検索順位を向上させる施策です。口コミの数・評価・更新頻度はMEOの重要なランキング要因であり、LINE口コミ施策と直結します。</p>

        <FlowSteps steps={[
          { title: "Googleビジネスプロフィールの最適化", desc: "診療時間・住所・写真・診療科目を正確かつ最新の状態に維持。投稿機能で定期的に情報を発信。" },
          { title: "LINE口コミ施策で評価を蓄積", desc: "自動口コミ依頼でレビュー数を着実に増やし、星評価4.0以上を維持。新しいレビューの継続的な獲得がMEOに好影響。" },
          { title: "エリアキーワードの強化", desc: "「地域名+診療科」のキーワードで上位表示されるよう、ビジネスプロフィールの説明文とLPのコンテンツを最適化。" },
        ]} />

        <p><Link href="/lp/column/clinic-patient-communication" className="text-sky-600 underline hover:text-sky-800">患者コミュニケーションの改善</Link>は、口コミ評価の向上にも直結します。日頃の患者対応の質を高めることが、最も効果的なMEO対策です。</p>
      </section>

      {/* ── 導入ステップ ── */}
      <section>
        <h2 id="implementation" className="text-xl font-bold text-gray-800">口コミ施策の導入ステップ</h2>

        <FlowSteps steps={[
          { title: "STEP 1：現状分析", desc: "現在のGoogle口コミ数・平均評価・競合クリニックとの比較を行い、目標を設定する。" },
          { title: "STEP 2：LINE自動配信の設定", desc: "診察完了後のNPS調査→口コミ依頼の自動配信フローを構築する。" },
          { title: "STEP 3：返信ルールの策定", desc: "ポジティブ・ネガティブ両方の口コミに対する返信テンプレートとルールを策定する。" },
          { title: "STEP 4：効果測定と改善", desc: "月次でレビュー数・評価推移・MEO順位を確認し、メッセージ内容やタイミングを改善する。" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="Google口コミ対策のポイント">
          <ul className="mt-1 space-y-1">
            <li>1. 新患の72%がGoogle口コミを確認。口コミ対策は集患の必須施策</li>
            <li>2. LINE自動配信×NPS事前スクリーニングで、ポジティブな口コミを効率的に獲得</li>
            <li>3. ネガティブレビューには24時間以内に誠実に対応。削除依頼や論争は厳禁</li>
            <li>4. 口コミの継続的な獲得がMEO順位向上に直結し、新患獲得の好循環を生む</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICなら、診察完了からNPS調査・口コミ依頼までの一連のフローを自動化できます。口コミ対策は「始めた者勝ち」の施策です。まずは現状のGoogle口コミを確認し、今日からLINE連携の口コミ施策をスタートしましょう。Google MEO対策を含めた集患戦略については<Link href="/lp/column/self-pay-clinic-google-meo" className="text-sky-600 underline hover:text-sky-800">Google MEO対策ガイド</Link>、SEOと合わせた総合的な集患施策は<Link href="/lp/column/clinic-seo-complete-guide" className="text-sky-600 underline hover:text-sky-800">SEO対策完全ガイド</Link>もご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
