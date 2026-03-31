import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, FlowSteps, ComparisonTable, ResultCard } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "salon-digital-transformation-line")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/salon/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/salon/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "DXに取り組む予算がないのですが？", a: "LINE公式アカウント自体はフリープラン（無料）で始められます。紙カルテの電子化もLINEのタグ・メモ機能で代替できるため、初期費用ゼロでスモールスタートが可能です。" },
  { q: "スタッフがデジタルに慣れていなくても大丈夫ですか？", a: "LINEはスタッフも日常的に使っているアプリなので、導入のハードルが非常に低いです。管理画面の操作も直感的で、1〜2時間のレクチャーで基本操作を習得できます。" },
  { q: "紙カルテとの併用は可能ですか？", a: "はい、併用しながら段階的に移行するのがおすすめです。まず新規のお客様からLINE管理を開始し、既存客は来店時に順次移行していく方法が現実的です。" },
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
  "紙カルテ・電話予約・ポイントカードのデジタル化をLINE1つで実現",
  "初期費用ゼロでスタートできるDXの進め方",
  "段階的な移行で現場の混乱を最小化するステップ",
];

const toc = [
  { id: "why-dx", label: "サロンDXが求められる背景" },
  { id: "analog-problems", label: "アナログ運用の3大課題" },
  { id: "line-dx", label: "LINEで置き換えられる業務" },
  { id: "migration-steps", label: "段階的な移行ステップ" },
  { id: "cost", label: "DXにかかるコスト比較" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="サロンDX×LINE" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">「DX」と聞くと大がかりなシステム導入をイメージしがちですが、サロンのDXは<strong>LINEから始める</strong>のが最もコスパが高い方法です。本記事では、紙カルテ・電話予約・ポイントカードからの脱却を、初期費用ゼロで実現するステップを解説します。</p>

      <section>
        <h2 id="why-dx" className="text-xl font-bold text-gray-800">サロンDXが求められる背景</h2>

        <StatGrid stats={[
          { value: "78%", label: "DXに関心があるサロンオーナー" },
          { value: "23%", label: "実際にDXに着手しているサロン" },
          { value: "55%", label: "「何から始めればよいかわからない」" },
        ]} />

        <p>人手不足の深刻化、お客様のオンライン予約ニーズの高まり、競合サロンとの差別化。これらの課題に対応するために、サロンのデジタル化は避けて通れない時代になっています。</p>
      </section>

      <section>
        <h2 id="analog-problems" className="text-xl font-bold text-gray-800">アナログ運用の3大課題</h2>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 紙カルテの限界</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>探すのに時間がかかる（1回あたり平均2〜3分）</li>
          <li>保管スペースが年々増加</li>
          <li>スタッフ間の情報共有が困難</li>
          <li>紛失・汚損リスク</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. 電話予約の非効率</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>施術中に電話対応できず、取りこぼしが発生</li>
          <li>予約の聞き間違い・ダブルブッキング</li>
          <li>営業時間外の予約を受けられない</li>
        </ul>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. 紙のポイントカード</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>お客様がカードを忘れる・紛失する</li>
          <li>来店履歴のデータ分析ができない</li>
          <li>印刷コストが発生</li>
        </ul>

        <Callout type="warning" title="アナログのコストは見えにくい">
          紙カルテの検索に1日30分、電話対応の取りこぼしが月5件、ポイントカード忘れで特典を付けられないケース月10件。これらの「見えないコスト」は月に換算すると数万円の機会損失になります。
        </Callout>
      </section>

      <section>
        <h2 id="line-dx" className="text-xl font-bold text-gray-800">LINEで置き換えられる業務</h2>

        <ComparisonTable
          headers={["業務", "アナログ", "LINE化後"]}
          rows={[
            ["予約管理", "電話・紙の台帳", "LINE予約＋自動リマインド"],
            ["顧客管理", "紙カルテ", "タグ・メモ・来店履歴"],
            ["ポイントカード", "紙のスタンプカード", "デジタルスタンプカード"],
            ["リマインド", "前日に電話", "自動メッセージ配信"],
            ["クーポン配信", "チラシ・DM", "セグメント配信"],
            ["アフターフォロー", "なし（手が回らない）", "自動フォローメッセージ"],
          ]}
        />

        <ResultCard before="1日3時間" after="1日30分" metric="受付・予約管理にかかる時間" description="LINE予約と自動リマインドで大幅削減" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="migration-steps" className="text-xl font-bold text-gray-800">段階的な移行ステップ</h2>

        <FlowSteps steps={[
          { title: "フェーズ1：LINE予約の導入（1〜2週間）", desc: "LINE公式アカウント開設→予約受付開始→電話予約からの段階的移行" },
          { title: "フェーズ2：顧客情報のデジタル化（1ヶ月）", desc: "新規客からLINE管理開始→来店時に既存客も順次移行→タグ付けルール策定" },
          { title: "フェーズ3：ポイントカード移行（2ヶ月目）", desc: "デジタルスタンプカード設定→紙カードからの残高引き継ぎ" },
          { title: "フェーズ4：配信・自動化（3ヶ月目〜）", desc: "セグメント配信開始→誕生日クーポン自動化→アフターフォローシナリオ構築" },
        ]} />

        <Callout type="point" title="一気に切り替えない">
          現場の混乱を防ぐため、電話予約を急に廃止したり、紙カルテを一斉に破棄したりするのは避けましょう。並行運用期間を設け、スタッフもお客様も慣れてから完全移行するのが成功の鍵です。
        </Callout>
      </section>

      <section>
        <h2 id="cost" className="text-xl font-bold text-gray-800">DXにかかるコスト比較</h2>

        <ComparisonTable
          headers={["方法", "初期費用", "月額費用", "特徴"]}
          rows={[
            ["LINE公式（フリー）", "0円", "0円", "月200通まで。小規模サロン向け"],
            ["LINE公式（ライト）", "0円", "5,000円", "月5,000通。中規模サロン向け"],
            ["専用POSシステム", "30〜100万円", "1〜3万円", "高機能だが導入コスト大"],
            ["サロン専用アプリ", "50〜200万円", "3〜10万円", "自社アプリ開発。大手向け"],
          ]}
        />

        <Callout type="success" title="LINEなら初期費用ゼロ">
          LINEベースのDXは初期費用ゼロで始められ、お客様に新しいアプリをインストールしてもらう必要もありません。「いつも使っているLINE」の上で完結する手軽さが最大の強みです。LINE公式アカウントの開設方法は<Link href="/salon/column/salon-line-official-account-setup-guide" className="text-blue-600 underline">開設ガイド</Link>、顧客管理の詳細は<Link href="/salon/column/salon-line-crm-setup-guide" className="text-blue-600 underline">顧客管理をLINEで一元化する方法</Link>で解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>サロンのDXはLINEから始めるのが最適</strong> — 初期費用ゼロ、お客様も使い慣れたアプリ</li>
          <li><strong>紙カルテ・電話予約・ポイントカードを段階的に移行</strong> — 一気に切り替えず並行運用で</li>
          <li><strong>見えないコストを可視化</strong> — 予約取りこぼし・カルテ検索時間・印刷費を削減</li>
          <li><strong>DXは目的ではなく手段</strong> — お客様体験の向上とスタッフ負荷の軽減が真の目的</li>
        </ol>
        <p className="mt-4">Lオペ for SALONは、サロンのDXをLINEベースでワンストップ支援。予約・顧客管理・配信を1つのプラットフォームで実現します。</p>
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
