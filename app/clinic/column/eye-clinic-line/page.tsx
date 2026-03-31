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
const self = articles.find((a) => a.slug === "eye-clinic-line")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/clinic/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "眼科クリニックのLINE活用術でLINE導入の効果はどのくらいですか？", a: "導入クリニックの実績では、予約リマインドによる無断キャンセル60〜80%削減、セグメント配信によるリピート率20〜30%向上、AI自動返信による電話対応70%削減など、多面的な効果が報告されています。" },
  { q: "LINE導入にプログラミング知識は必要ですか？", a: "必要ありません。Lオペ for CLINICのようなクリニック専用ツールを使えば、ノーコードで予約管理・自動配信・リッチメニューの設定が可能です。管理画面上の操作だけで運用開始できます。" },
  { q: "患者の年齢層が高い診療科でもLINE活用は効果的ですか？", a: "はい、LINEは60代以上でも利用率が70%を超えており、幅広い年齢層にリーチできます。文字サイズの配慮や操作案内の工夫をすれば、高齢患者にも好評です。むしろ電話予約の負担が減り、患者・スタッフ双方にメリットがあります。" },
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
  "コンタクトレンズ処方の定期リマインドで再来院率を向上",
  "定期検診（緑内障・糖尿病網膜症等）の自動フォロー体制",
  "白内障手術の術後フォローをLINEで効率化",
  "ドライアイ予防情報の配信で患者エンゲージメント強化",
];

const toc = [
  { id: "contact-lens", label: "コンタクト処方リマインドの自動化" },
  { id: "regular-checkup", label: "定期検診管理とフォローアップ" },
  { id: "post-surgery", label: "術後フォローのLINE活用" },
  { id: "prevention", label: "ドライアイ予防情報の配信" },
  { id: "results", label: "眼科クリニックでの導入効果" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">眼科クリニックでは、コンタクトレンズの定期処方・緑内障等の経過観察・術後フォローなど、<strong>継続的な通院管理</strong>が経営の柱です。LINE公式アカウントを活用すれば、これらの管理業務を自動化しながら、<strong>再来院率を30%以上向上</strong>させることが可能です。本記事では眼科特有のLINE活用術を解説します。</p>

      {/* ── コンタクト処方 ── */}
      <section>
        <h2 id="contact-lens" className="text-xl font-bold text-gray-800">コンタクト処方リマインドの自動化</h2>
        <p>コンタクトレンズの処方は眼科クリニックの売上の大きな柱です。しかし、処方期限の管理は患者任せになりがちで、他院への流出やネット通販への切り替えが起きやすい領域でもあります。</p>

        <FlowSteps steps={[
          { title: "処方データの登録", desc: "コンタクト処方時に、レンズ種類・度数・使用期限・次回検査推奨日をシステムに記録。" },
          { title: "期限前の自動リマインド", desc: "処方期限の2週間前にLINEで「コンタクトの処方期限が近づいています。定期検査のご予約はこちら」と自動配信。" },
          { title: "ワンタップ予約", desc: "リマインドメッセージから直接LINE予約が可能。手間なく来院につなげる。" },
        ]} />

        <StatGrid stats={[
          { value: "35", unit: "%増", label: "コンタクト再処方率" },
          { value: "80", unit: "%", label: "リマインド開封率" },
          { value: "60", unit: "%減", label: "他院流出率" },
          { value: "0", unit: "分", label: "スタッフ作業時間" },
        ]} />

        <p>他のクリニックのLINE活用事例については<Link href="/clinic/column/clinic-line-case-studies" className="text-sky-600 underline hover:text-sky-800">LINE公式アカウント活用事例5選</Link>でも詳しく紹介しています。</p>
      </section>

      {/* ── 定期検診管理 ── */}
      <section>
        <h2 id="regular-checkup" className="text-xl font-bold text-gray-800">定期検診管理とフォローアップ</h2>
        <p>緑内障・糖尿病網膜症・加齢黄斑変性など、定期的な経過観察が必要な疾患の管理は眼科クリニックの重要な業務です。しかし、患者が自己判断で通院を中断してしまうケースが少なくありません。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>疾患別フォロースケジュール</strong>：緑内障は3ヶ月ごと、糖尿病網膜症は1〜6ヶ月ごとなど、疾患に応じた検診間隔を設定し自動リマインド。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>未受診アラート</strong>：予定日を過ぎても来院がない場合、段階的にフォローメッセージを配信。「検査の時期を過ぎています」→「早期発見が大切です」と訴求。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>検査結果の共有</strong>：視野検査やOCT検査の結果を簡易的にLINEで共有。患者の疾患理解を促し、通院モチベーションを維持。</span></li>
        </ul>

        <Callout type="info" title="定期通院の中断は失明リスクに直結">
          緑内障は自覚症状が乏しいため、患者が「もう大丈夫」と自己判断で通院を中断するケースが多発します。LINEでの継続的なフォローが、患者の視力を守ることにつながります。
        </Callout>

        <p>患者離脱を防ぐフォローアップ戦略の全体像は<Link href="/clinic/column/clinic-patient-retention" className="text-sky-600 underline hover:text-sky-800">患者離脱防止のLINEフォローアップ</Link>で解説しています。</p>
      </section>

      {/* ── 術後フォロー ── */}
      <section>
        <h2 id="post-surgery" className="text-xl font-bold text-gray-800">術後フォローのLINE活用</h2>
        <p>白内障手術やレーシックなどの術後フォローは、患者の不安を軽減し合併症を早期発見するために不可欠です。LINEを活用することで、きめ細やかなフォローを効率的に実施できます。</p>

        <FlowSteps steps={[
          { title: "術前の注意事項配信", desc: "手術3日前にLINEで「当日の持ち物・注意事項」を自動配信。紙の説明書の紛失や読み忘れを防止。" },
          { title: "術後ケア情報の段階配信", desc: "術後1日目・3日目・1週間・1ヶ月と段階的にケア情報を配信。「目薬の点眼スケジュール」「入浴の注意点」など時期に応じた情報。" },
          { title: "経過確認と異常時の連絡導線", desc: "「痛みや見え方に異常はありませんか？」と定期確認。異常がある場合はLINEからすぐに相談・予約可能。" },
        ]} />

        <ResultCard
          before="術後の電話フォロー 1件15分×1日20件"
          after="LINE自動配信 + 異常時のみ対応"
          metric="術後フォロー業務を80%削減"
          description="定型的な情報提供は自動化し、医師は異常が報告されたケースに集中"
        />
      </section>

      <InlineCTA />

      {/* ── ドライアイ予防 ── */}
      <section>
        <h2 id="prevention" className="text-xl font-bold text-gray-800">ドライアイ予防情報の配信</h2>
        <p>ドライアイは眼科を受診するきっかけとして非常に多い症状です。季節やライフスタイルに合わせた予防情報を配信することで、患者のエンゲージメントを高め、定期来院を促進できます。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>季節別ケア情報</strong>：冬の乾燥シーズンには加湿対策、夏のエアコンシーズンには目の保湿ケアなど、時期に合わせた情報を自動配信。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>セルフチェックコンテンツ</strong>：LINEで簡単なドライアイチェックリストを配信。該当項目が多い場合は「一度検査をおすすめします」と来院を促進。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>VDT症候群への注意喚起</strong>：パソコン・スマホの長時間使用による眼精疲労の予防法を定期配信。働き世代の新規患者獲得にも効果的。</span></li>
        </ul>

        <p>LINE自動配信の設定方法については<Link href="/clinic/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">LINE自動化完全ガイド</Link>で詳しく解説しています。</p>
      </section>

      {/* ── 導入効果 ── */}
      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">眼科クリニックでの導入効果</h2>

        <StatGrid stats={[
          { value: "32", unit: "%増", label: "再来院率" },
          { value: "45", unit: "%増", label: "コンタクト売上" },
          { value: "70", unit: "%減", label: "電話問い合わせ" },
          { value: "95", unit: "%", label: "術後フォロー完了率" },
        ]} />

        <Callout type="success" title="スタッフ2名分の業務を自動化">
          コンタクト処方リマインド・定期検診フォロー・術後ケア配信を自動化した結果、受付スタッフ2名分の業務量を削減。空いたリソースを患者対応の質向上に充てることができています。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="眼科クリニックのLINE活用ポイント">
          <ul className="mt-1 space-y-1">
            <li>コンタクト処方リマインドの自動化で再処方率35%向上・他院流出防止</li>
            <li>疾患別の定期検診フォローで通院中断を防止し、患者の視力を守る</li>
            <li>術後フォローの段階配信で業務80%削減・患者安心度向上</li>
            <li>ドライアイ予防情報の配信で患者エンゲージメントを強化</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、眼科クリニックの特有の業務フローに対応した<Link href="/clinic/features" className="text-sky-600 underline hover:text-sky-800">クリニック専用LINE運用プラットフォーム</Link>です。コンタクト処方管理・定期検診フォロー・術後ケアの自動化で、患者満足度と経営効率を同時に向上させます。</p>
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
