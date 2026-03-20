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
const self = articles.find((a) => a.slug === "internal-medicine-line")!;

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
  "慢性疾患の定期通院をLINEリマインドで管理し中断を防止",
  "服薬リマインドで服薬アドヒアランスを向上",
  "健診結果のフォローアップで再診率を改善",
  "季節性疾患の予防配信で先手の集患を実現",
];

const toc = [
  { id: "challenges", label: "内科クリニックが抱える課題" },
  { id: "chronic-management", label: "慢性疾患の定期通院管理" },
  { id: "medication-remind", label: "服薬リマインドの活用" },
  { id: "health-check", label: "健診結果フォローと再診促進" },
  { id: "seasonal-prevention", label: "季節性疾患の予防配信" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">内科クリニックでは、高血圧・糖尿病・脂質異常症などの<strong>慢性疾患の長期管理</strong>が診療の中心です。LINE公式アカウントを活用すれば、定期通院リマインド・服薬フォロー・健診結果の共有を自動化し、<strong>治療継続率の向上と業務効率化</strong>を同時に実現できます。</p>

      {/* ── 課題 ── */}
      <section>
        <h2 id="challenges" className="text-xl font-bold text-gray-800">内科クリニックが抱える課題</h2>
        <p>内科クリニックは患者数が多い一方で、慢性疾患の継続管理が難しいという構造的な課題があります。「症状が落ち着いたから」と通院を中断する患者が多く、重症化や再発のリスクが高まります。</p>

        <StatGrid stats={[
          { value: "50", unit: "%", label: "慢性疾患の通院中断率" },
          { value: "40", unit: "%", label: "服薬の自己中断率" },
          { value: "70", unit: "%", label: "健診後の未受診率" },
          { value: "30", unit: "件/日", label: "電話問い合わせ件数" },
        ]} />

        <FlowSteps steps={[
          { title: "慢性疾患患者の通院中断", desc: "高血圧や糖尿病は自覚症状が乏しいため、「調子がいい」と感じた患者が通院をやめてしまう。数か月後に悪化して受診するケースが後を絶たない。" },
          { title: "服薬アドヒアランスの低さ", desc: "処方薬の飲み忘れ・自己判断での減薬が多い。特に高齢患者は複数の薬を服用しており、管理が困難。" },
          { title: "健診結果の放置", desc: "会社の健康診断で異常値が出ても、受診しない人が約70%。クリニック側からアプローチする手段が限られている。" },
        ]} />
      </section>

      {/* ── 慢性疾患管理 ── */}
      <section>
        <h2 id="chronic-management" className="text-xl font-bold text-gray-800">慢性疾患の定期通院管理</h2>
        <p>慢性疾患の管理には月1回〜3か月に1回の定期通院が必要です。LINEのセグメント配信を活用すれば、疾患ごとに最適なタイミングでリマインドを配信できます。セグメント配信の詳しい方法は<Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信でリピート率を向上させる方法</Link>をご覧ください。</p>

        <FlowSteps steps={[
          { title: "疾患別セグメントの作成", desc: "高血圧・糖尿病・脂質異常症・甲状腺疾患など、疾患別にタグ付けしてセグメントを作成。" },
          { title: "通院間隔に応じたリマインド設定", desc: "月1回通院の患者には前日リマインド、3か月ごとの患者には2週間前に予約促進メッセージを配信。" },
          { title: "検査結果の自動通知", desc: "血液検査の結果が出たらLINEで通知。「結果を確認するために来院してください」と予約ボタン付きで配信。" },
          { title: "未来院患者への再来院促進", desc: "前回来院から一定期間が経過した患者に「お体の調子はいかがですか？」とフォローメッセージを自動送信。" },
        ]} />

        <ResultCard
          before="手動で電話フォロー（対応しきれない）"
          after="LINEで疾患別に自動リマインド"
          metric="慢性疾患の通院継続率が30%向上"
          description="定期通院の中断が減り、患者の健康状態も安定"
        />
      </section>

      {/* ── 服薬リマインド ── */}
      <section>
        <h2 id="medication-remind" className="text-xl font-bold text-gray-800">服薬リマインドの活用</h2>
        <p>服薬アドヒアランスの向上は、慢性疾患の治療効果を左右する重要な要素です。LINEを活用した服薬リマインドは、特に高齢患者や多剤服用患者に効果的です。</p>

        <Callout type="info" title="服薬アドヒアランスが低い3つの原因">
          <ul className="mt-1 space-y-1">
            <li>・飲み忘れ: 特に朝食後の服用は、生活パターンの乱れで忘れやすい</li>
            <li>・自己判断での中断: 「副作用が気になる」「効果を感じない」という理由で中断</li>
            <li>・薬の管理困難: 高齢者で5種類以上服用するケースも多く、管理が追いつかない</li>
          </ul>
        </Callout>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span>毎朝決まった時間に「お薬の時間です」とLINEでリマインド</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span>処方日数をもとに「残薬が少なくなっています」と通知</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span>服薬に関する不安・疑問をLINEで気軽に相談できる導線を整備</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span>お薬手帳との連動で、飲み合わせ注意のアラートも配信</li>
        </ul>

        <StatGrid stats={[
          { value: "25", unit: "%", label: "服薬忘れの減少率" },
          { value: "80", unit: "%", label: "リマインド開封率" },
          { value: "3", unit: "倍", label: "相談件数の増加" },
          { value: "92", unit: "%", label: "患者満足度" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── 健診フォロー ── */}
      <section>
        <h2 id="health-check" className="text-xl font-bold text-gray-800">健診結果フォローと再診促進</h2>
        <p>健康診断の結果は出たものの受診につながらないケースが非常に多いのが実情です。LINEを活用すれば、健診シーズンに合わせた配信で来院を促進できます。季節に合わせた配信戦略の詳細は<Link href="/lp/column/clinic-seasonal-campaign" className="text-sky-600 underline hover:text-sky-800">季節別LINE配信戦略</Link>で解説しています。</p>

        <FlowSteps steps={[
          { title: "健診シーズンに啓発配信", desc: "4〜6月の企業健診シーズンに「健診で気になる数値があった方はご相談ください」と配信。" },
          { title: "初回来院後のフォロー", desc: "健診結果をもとに来院した患者に、次回の検査時期と目標値をLINEで共有。" },
          { title: "生活習慣改善のアドバイス", desc: "食事・運動・睡眠に関する情報を定期配信。数値改善のモチベーションを維持。" },
          { title: "再検査リマインド", desc: "3か月後・6か月後の再検査時期にリマインドを配信。予約ボタン付きで来院を促進。" },
        ]} />

        <ResultCard
          before="健診後の受診率30%（DMハガキのみ）"
          after="LINE配信で健診後の受診率55%に"
          metric="健診後の再受診率が83%向上"
          description="LINEの高い開封率で健診結果の放置を防止"
        />
      </section>

      {/* ── 季節性疾患 ── */}
      <section>
        <h2 id="seasonal-prevention" className="text-xl font-bold text-gray-800">季節性疾患の予防配信</h2>
        <p>内科クリニックは季節ごとの疾患パターンが明確です。LINEでタイムリーな予防情報を配信することで、患者の健康意識を高めつつ来院を促進できます。患者コミュニケーションの改善方法は<Link href="/lp/column/clinic-patient-communication" className="text-sky-600 underline hover:text-sky-800">患者コミュニケーション改善の5つのポイント</Link>もご覧ください。</p>

        <Callout type="success" title="季節別の配信内容例">
          <ul className="mt-1 space-y-1">
            <li>・春（3〜5月）: 花粉症対策、新生活ストレスによる不調、紫外線対策</li>
            <li>・夏（6〜8月）: 熱中症予防、食中毒注意喚起、夏バテ対策</li>
            <li>・秋（9〜11月）: インフルエンザ予防接種案内、気温変化による体調管理</li>
            <li>・冬（12〜2月）: ノロウイルス対策、血圧管理（ヒートショック注意）、乾燥対策</li>
          </ul>
        </Callout>

        <StatGrid stats={[
          { value: "3", unit: "倍", label: "予防接種予約の増加" },
          { value: "45", unit: "%", label: "配信経由の新規来院率" },
          { value: "80", unit: "%", label: "予防配信の開封率" },
          { value: "12", unit: "%", label: "ブロック率（情報提供型）" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="内科クリニックのLINE活用ポイント">
          <ul className="mt-1 space-y-1">
            <li>・慢性疾患の疾患別セグメント配信で通院継続率を30%向上</li>
            <li>・服薬リマインドで飲み忘れを25%削減し、治療効果を最大化</li>
            <li>・健診結果フォローの自動化で再受診率を83%改善</li>
            <li>・季節性疾患の予防配信で先手の集患を実現</li>
          </ul>
        </Callout>

        <p>内科クリニックの強みは「かかりつけ医」として患者と長期的な関係を築けることです。Lオペ for CLINICは、慢性疾患の管理から季節性疾患の予防まで、内科特有の継続的な患者フォローをLINEで効率化します。セグメント配信の活用法は<Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信でリピート率を向上させる方法</Link>も参考にしてください。</p>
      </section>
    </ArticleLayout>
  );
}
