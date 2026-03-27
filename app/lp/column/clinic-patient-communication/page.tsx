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
const self = articles.find((a) => a.slug === "clinic-patient-communication")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "患者コミュニケーション改善の5つのポイント",
  "適切なタイミングとパーソナライズで満足度が向上",
  "双方向コミュニケーションで患者の不安を解消",
  "LINEを活用した一貫性のあるフォロー体制の構築",
];

const toc = [
  { id: "timing", label: "ポイント1：最適なタイミング" },
  { id: "personalize", label: "ポイント2：パーソナライズ" },
  { id: "bidirectional", label: "ポイント3：双方向性" },
  { id: "consistency", label: "ポイント4：一貫性" },
  { id: "follow", label: "ポイント5：フォローアップ" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">患者満足度の向上と離脱防止の鍵は、<strong>質の高いコミュニケーション</strong>にあります。LINE公式アカウントを活用した5つのポイント（タイミング・パーソナライズ・双方向性・一貫性・フォロー）を実践することで、患者満足度スコアを平均25%向上させた方法を解説します。</p>

      {/* ── タイミング ── */}
      <section>
        <h2 id="timing" className="text-xl font-bold text-gray-800">ポイント1：最適なタイミング</h2>
        <p>患者が情報を必要とするタイミングに、必要な情報を届けることが最も重要です。タイミングを外したメッセージは、価値のある内容でも効果が半減します。</p>

        <FlowSteps steps={[
          { title: "予約確定直後", desc: "予約内容の確認・持ち物・注意事項をLINEで即座に送信。患者の不安を事前に解消する。" },
          { title: "来院前日", desc: "リマインドメッセージに加え、駐車場情報やアクセス案内を送信。来院のハードルを下げる。" },
          { title: "診察直後", desc: "処方内容や次回予約の案内を送信。口頭だけでは忘れがちな情報を文字で残す。" },
          { title: "診察翌日〜1週間", desc: "経過確認と次のステップの案内を段階的に送信。継続的なケアの姿勢を示す。" },
        ]} />

        <Callout type="info" title="配信タイミングの最適化データ">
          LINE配信の開封率は、平日は12時台と18時台、土日は10時台がピークです。診察関連のメッセージは即時送信、情報提供系は開封率の高い時間帯に送信すると効果的です。
        </Callout>
      </section>

      {/* ── パーソナライズ ── */}
      <section>
        <h2 id="personalize" className="text-xl font-bold text-gray-800">ポイント2：パーソナライズ</h2>
        <p>一斉配信ではなく、患者一人ひとりの状況に合わせたメッセージを送ることで、「自分のために送ってくれている」という特別感を演出できます。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>患者名の挿入</strong>：メッセージに患者名を自動挿入。「○○様」と呼びかけるだけで開封率が10%向上</li>
          <li><strong>診療内容に基づく情報提供</strong>：花粉症の患者には花粉情報、高血圧の患者には減塩レシピなど、診療内容に関連した情報を配信</li>
          <li><strong>来院頻度に応じた対応</strong>：初診患者にはクリニックの紹介情報、常連患者には感謝メッセージなど、関係性に合わせたトーンで対応</li>
          <li><strong>年齢・性別に応じた健康情報</strong>：ターゲットに合わせた予防医療情報を配信し、クリニックの専門性をアピール</li>
        </ul>

        <p><Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信によるリピート率向上</Link>では、パーソナライズ配信の具体的な設定方法を詳しく解説しています。</p>

        <StatGrid stats={[
          { value: "80", unit: "%", label: "パーソナライズ配信の開封率" },
          { value: "45", unit: "%", label: "一斉配信の開封率" },
          { value: "35", unit: "pt", label: "開封率の差" },
          { value: "2.5", unit: "倍", label: "クリック率の差" },
        ]} />
      </section>

      {/* ── 双方向性 ── */}
      <section>
        <h2 id="bidirectional" className="text-xl font-bold text-gray-800">ポイント3：双方向性</h2>
        <p>一方的な情報配信ではなく、患者が気軽に質問・相談できる環境を整えることが重要です。LINEのチャット機能を活用すれば、電話よりも低いハードルで双方向のコミュニケーションが実現します。</p>

        <FlowSteps steps={[
          { title: "AI返信で即時対応", desc: "患者からの問い合わせにAIが24時間即座に回答。よくある質問は自動処理し、スタッフの負担を軽減。" },
          { title: "スタッフが必要な場合はエスカレーション", desc: "AIでは対応できない専門的な質問や緊急性の高い問い合わせは、自動でスタッフに転送。" },
          { title: "対応履歴の一元管理", desc: "全てのやり取りがLINE上に記録され、担当者が変わっても一貫した対応が可能。" },
        ]} />

        <p><Link href="/lp/column/clinic-ai-reply-guide" className="text-sky-600 underline hover:text-sky-800">AI返信活用ガイド</Link>では、AIを活用した双方向コミュニケーションの設定方法を詳しく解説しています。</p>

        <ResultCard
          before="電話対応のみ（受付時間内限定）"
          after="LINE+AI返信（24時間対応）"
          metric="問い合わせ対応時間を24時間に拡大"
          description="患者の70%が「LINEで質問できるのが安心」と回答"
        />
      </section>

      <InlineCTA />

      {/* ── 一貫性 ── */}
      <section>
        <h2 id="consistency" className="text-xl font-bold text-gray-800">ポイント4：一貫性</h2>
        <p>担当スタッフが変わっても、患者に対するコミュニケーションの質と内容に一貫性を保つことが信頼構築に不可欠です。</p>

        <ul className="space-y-2 text-gray-700">
          <li><strong>メッセージテンプレートの活用</strong>：よく使うメッセージをテンプレート化し、誰が送っても同じ品質を維持</li>
          <li><strong>対応マニュアルの整備</strong>：質問カテゴリ別の対応方針を策定。新人スタッフでも適切に対応可能</li>
          <li><strong>トーン＆マナーの統一</strong>：クリニックとしての話し方・敬語レベル・絵文字の使い方を統一。ブランドイメージを一貫させる</li>
          <li><strong>患者情報の共有</strong>：タグ・メモ機能で患者の状況をスタッフ間で共有。「前回の相談内容を覚えている」対応を実現</li>
        </ul>

        <Callout type="warning" title="一貫性が崩れると信頼を損なう">
          スタッフAは丁寧な対応、スタッフBは素っ気ない対応というムラがあると、患者の不信感につながります。特にLINEはテキストで記録が残るため、対応品質のばらつきが目立ちやすいです。
        </Callout>
      </section>

      {/* ── フォローアップ ── */}
      <section>
        <h2 id="follow" className="text-xl font-bold text-gray-800">ポイント5：フォローアップ</h2>
        <p>診察後のフォローアップは、患者の満足度と再診率を左右する重要なタッチポイントです。<Link href="/lp/column/line-block-rate-reduction" className="text-sky-600 underline hover:text-sky-800">ブロック率を下げる配信の鉄則</Link>を守りながら、適切なフォローを行いましょう。</p>

        <FlowSteps steps={[
          { title: "術後・処置後フォロー", desc: "処置後の注意事項や経過観察のポイントをLINEで送信。写真付きの報告機能で患者の状態を遠隔確認。" },
          { title: "定期検診リマインド", desc: "前回来院から一定期間が経過した患者にリマインドを自動送信。慢性疾患の患者は月次、健康診断は年次で設定。" },
          { title: "季節性の健康情報", desc: "花粉シーズン前のアレルギー対策、インフルエンザ流行前のワクチン案内など、季節に合わせた情報提供。" },
        ]} />

        <StatGrid stats={[
          { value: "30", unit: "%", label: "再診率の向上" },
          { value: "25", unit: "%", label: "患者満足度の向上" },
          { value: "40", unit: "%", label: "離脱率の低下" },
          { value: "2", unit: "倍", label: "口コミ投稿率の向上" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="患者コミュニケーション改善の5つのポイント">
          <ul className="mt-1 space-y-1">
            <li>1. 最適なタイミングで情報を届け、患者の不安を事前に解消する</li>
            <li>2. パーソナライズで「自分のための情報」を実感させ、開封率80%を実現</li>
            <li>3. AI返信による双方向コミュニケーションで24時間の相談体制を構築</li>
            <li>4. テンプレート・マニュアルで対応品質の一貫性を担保</li>
            <li>5. 診察後フォローアップで再診率30%向上と離脱率40%低下を実現</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、これら5つのポイントをすべてLINE上で実現するクリニック専用プラットフォームです。テンプレート・セグメント配信・AI返信・フォローアップの自動化を組み合わせて、患者との信頼関係を構築しましょう。NPS調査で患者満足度を数値化する方法は<Link href="/lp/column/clinic-nps-survey" className="text-sky-600 underline hover:text-sky-800">NPS調査導入ガイド</Link>、待ち時間対策については<Link href="/lp/column/clinic-waiting-time" className="text-sky-600 underline hover:text-sky-800">待ち時間対策ガイド</Link>もあわせてご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
