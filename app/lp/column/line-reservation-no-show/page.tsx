import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[3];

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

      <section>
        <h2 id="impact" className="text-xl font-bold text-slate-800">無断キャンセルがクリニック経営に与える影響</h2>
        <p>無断キャンセル（ノーショー）は、クリニック経営における大きな課題の一つです。予約枠が空いたまま他の患者を入れることもできず、<strong>年間で数百万円の機会損失</strong>に繋がることも珍しくありません。</p>
        <p>一般的なクリニックの無断キャンセル率は5〜15%と言われています。月200件の予約があるクリニックであれば、月10〜30件の無断キャンセルが発生している計算です。</p>
      </section>

      <section>
        <h2 id="phone-limit" className="text-xl font-bold text-slate-800">電話リマインドの限界</h2>
        <p>多くのクリニックでは、受付スタッフが予約前日に電話でリマインドしています。しかし、この方法には深刻な課題があります。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>患者が電話に出ない（日中は仕事中）ケースが50%以上</li>
          <li>留守電を聞いてくれない</li>
          <li>スタッフの作業負荷が大きい（1件あたり平均3分 × 20件 = 1時間）</li>
          <li>かけ直しが必要で、業務を圧迫</li>
        </ul>
      </section>

      <InlineCTA />

      <section>
        <h2 id="five-measures" className="text-xl font-bold text-slate-800">LINE予約管理で無断キャンセルを削減する5つの施策</h2>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">施策1: 前日自動リマインド</h3>
        <p>予約日の前日に、LINEで自動リマインドメッセージを送信。患者が最も確認しやすい18時〜20時に配信設定することで、確認率が最大化します。LINEの開封率は80%超のため、電話よりも確実に情報が届きます。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">施策2: ワンタップ変更・キャンセル</h3>
        <p>リマインドメッセージ内に「予約変更」「キャンセル」ボタンを設置。患者が電話せずにLINE上で簡単に変更できるため、<strong>「キャンセルしたいけど電話が面倒」</strong>で無断キャンセルになるケースを防止します。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">施策3: キャンセル待ち自動通知</h3>
        <p>キャンセルが発生したら、キャンセル待ちの患者にLINEで自動通知。空き枠を即座に埋めることで、キャンセルによる売上損失を最小化します。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">施策4: 予約確定時の即時通知</h3>
        <p>予約確定時にLINEでその場で確認メッセージを送信。日時・場所・注意事項を明記し、患者側の記憶違いによるノーショーを防止。リッチメニューに「次回の予約を確認」ボタンを設置しておくと効果的です。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">施策5: 再来院促進配信</h3>
        <p>無断キャンセルした患者にも、一定期間後にフォローメッセージを配信。「次回のご予約はいかがですか？」と丁寧にアプローチすることで、離脱した患者の再来院を促します。</p>
      </section>

      <section>
        <h2 id="results" className="text-xl font-bold text-slate-800">LINE予約管理の導入効果</h2>
        <p>LINE予約管理を導入したクリニックでは、以下のような効果が報告されています。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>無断キャンセル率: 10% → <strong>2%以下</strong></li>
          <li>電話リマインド作業: 1日1時間 → <strong>ゼロ</strong>（完全自動化）</li>
          <li>キャンセル待ち→予約確定率: <strong>60%以上</strong></li>
          <li>患者満足度: 「LINEで変更できて便利」の声多数</li>
        </ul>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-slate-800">まとめ</h2>
        <p>無断キャンセル対策の本質は、<strong>患者が「面倒くさい」と感じるハードルを徹底的に下げる</strong>ことです。LINEという日常的に使うツール上で、予約確認・変更・キャンセルをワンタップで完結させることが最も効果的です。</p>
      </section>
    </ArticleLayout>
  );
}
