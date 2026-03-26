import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ResultCard,
  StatGrid,
  FlowSteps,
  BarChart,
  DonutChart,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "line-reservation-no-show")!;

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
  "無断キャンセルがクリニック経営に与える影響と損失額",
  "LINE予約管理で実践すべき5つの施策",
  "導入クリニックの具体的な改善効果",
];

const toc = [
  { id: "impact", label: "無断キャンセルの影響" },
  { id: "phone-limit", label: "電話リマインドの限界" },
  { id: "five-measures", label: "5つの施策" },
  { id: "results", label: "導入効果" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="予約管理" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニックの無断キャンセル（ノーショー）を削減するには、LINEによる自動リマインド・ワンタップ変更・キャンセル待ち管理・当日確認・ペナルティ設計の<strong>5施策</strong>が効果的です。本記事では、LINE予約管理で無断キャンセル率を<strong>大幅に改善</strong>した具体的な方法と導入効果データを解説します。
      </p>

      <section>
        <h2 id="impact" className="text-xl font-bold text-gray-800">無断キャンセルがクリニック経営に与える影響</h2>

        <Callout type="warning" title="年間数百万円の機会損失">
          無断キャンセル（ノーショー）は予約枠が空いたまま他の患者を入れられず、クリニック経営に直結するダメージです。一般的なクリニックの無断キャンセル率は5〜15%と言われています。
        </Callout>

        <StatGrid stats={[
          { value: "5〜15", unit: "%", label: "一般的な無断キャンセル率" },
          { value: "10〜30", unit: "件/月", label: "月200件予約のクリニック" },
          { value: "数百", unit: "万円/年", label: "機会損失額" },
        ]} />
      </section>

      <section>
        <h2 id="phone-limit" className="text-xl font-bold text-gray-800">電話リマインドの限界</h2>
        <p>多くのクリニックでは受付スタッフが予約前日に電話でリマインドしています。しかし、この方法には深刻な課題があります。実際にLINEリマインドでキャンセルを80%削減した事例は<Link href="/lp/column/clinic-line-case-studies" className="text-emerald-700 underline">クリニックのLINE公式アカウント活用事例5選</Link>でも紹介しています。</p>

        <BarChart
          data={[
            { label: "電話不通率", value: 50, color: "bg-red-400" },
            { label: "留守電未聴取", value: 70, color: "bg-red-400" },
            { label: "1件あたり所要時間", value: 3, color: "bg-amber-400" },
            { label: "1日の作業時間(分)", value: 60, color: "bg-amber-400" },
          ]}
          unit=""
        />

        <Callout type="warning" title="スタッフの負担が深刻">
          1件あたり平均3分 x 20件 = 1時間/日。さらにかけ直しが必要で、受付業務全体を圧迫します。電話に出ない（日中は仕事中）ケースが50%以上を占めます。
        </Callout>
      </section>

      <InlineCTA />

      <section>
        <h2 id="five-measures" className="text-xl font-bold text-gray-800">LINE予約管理で無断キャンセルを削減する5つの施策</h2>

        <FlowSteps steps={[
          { title: "前日自動リマインド", desc: "予約日の前日18時〜20時にLINEで自動送信。開封率80%超で電話より確実に届きます。" },
          { title: "ワンタップ変更・キャンセル", desc: "リマインド内に「予約変更」「キャンセル」ボタンを設置。電話が面倒で無断キャンセルになるケースを防止。" },
          { title: "キャンセル待ち自動通知", desc: "キャンセル発生時、待機患者にLINEで即時通知。空き枠を速やかに埋めて売上損失を最小化。" },
          { title: "予約確定時の即時通知", desc: "確定時にLINEで日時・場所・注意事項を送信。記憶違いによるノーショーを防止。" },
          { title: "再来院促進配信", desc: "無断キャンセルした患者にも一定期間後にフォローメッセージを配信。離脱患者の再来院を促進。" },
        ]} />

        <DonutChart percentage={80} label="LINEの開封率" sublabel="電話応答率(50%)を大幅に上回る" />
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-gray-800">LINE予約管理の導入効果</h2>
        <p>LINE予約管理を導入したクリニックでは、以下のような効果が報告されています。</p>

        <ResultCard before="10%" after="2%以下" metric="無断キャンセル率" description="LINE自動リマインド+ワンタップ変更で80%削減" />

        <ResultCard before="1時間/日" after="0分" metric="電話リマインド作業" description="完全自動化でスタッフの負担をゼロに" />

        <StatGrid stats={[
          { value: "60", unit: "%以上", label: "キャンセル待ち→予約確定率" },
          { value: "80", unit: "%削減", label: "無断キャンセル率の改善" },
          { value: "0", unit: "分/日", label: "電話リマインド作業時間" },
        ]} />

        <Callout type="success" title="患者満足度も向上">
          「LINEで予約変更できて便利」という声が多数。患者の利便性向上がキャンセル率改善に直結しています。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>
        <p>無断キャンセル対策の本質は、<strong>患者が「面倒くさい」と感じるハードルを徹底的に下げる</strong>ことです。LINEという日常的に使うツール上で、予約確認・変更・キャンセルをワンタップで完結させることが最も効果的です。Lオペ for CLINICの<Link href="/lp/features#予約・診察" className="text-sky-600 underline hover:text-sky-800">予約・スケジュール管理機能</Link>では、これらの機能が標準搭載されています。予約システムの選び方については<Link href="/lp/column/reservation-system-comparison" className="text-emerald-700 underline">予約システム比較10選</Link>も参考にしてください。また、キャンセル対策と合わせて<Link href="/lp/column/line-block-rate-reduction" className="text-emerald-700 underline">ブロック率を下げる5つの鉄則</Link>も押さえておくと、患者との接点を維持しやすくなります。</p>
      </section>
    </ArticleLayout>
  );
}
