import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "dental-clinic-line")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "歯科クリニックのLINE活用で最も効果的な施策は？", a: "定期検診リマインドの自動配信が最も効果的です。3ヶ月・6ヶ月ごとのリマインドにより、定期検診の継続率が40〜60%向上した事例があります。患者の口腔健康維持にも直結するため、双方にメリットがあります。" },
  { q: "歯科で自費診療のLINE訴求は効果がありますか？", a: "ホワイトニング・インプラント・矯正など自費メニューのセグメント配信は非常に効果的です。過去の問診データや来院履歴からニーズの高い患者にのみ配信すれば、押し売り感なく自費転換率を高められます。" },
  { q: "小児歯科でもLINEは活用できますか？", a: "保護者向けにお子様の定期検診リマインドや仕上げ磨きのアドバイスを配信すると好評です。保護者のLINEに直接届くため、ハガキや電話より確実に情報が伝わります。" },
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
  "歯科クリニック特有の課題（定期検診離脱・治療中断・キャンセル）のLINE解決策",
  "定期検診リマインドの自動化と治療計画の共有方法",
  "小児歯科・自費診療（矯正・インプラント）におけるLINE活用の具体例",
];

const toc = [
  { id: "dental-challenges", label: "歯科クリニック特有の課題" },
  { id: "checkup-remind", label: "定期検診リマインドの自動化" },
  { id: "treatment-plan", label: "治療計画の共有と進捗管理" },
  { id: "pediatric", label: "小児歯科向けLINEフォロー" },
  { id: "self-pay", label: "自費診療の相談受付" },
  { id: "oral-care-tips", label: "口腔ケアTips配信" },
  { id: "case-study", label: "導入効果: 定期検診通院率の向上事例" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <ArticleLayout slug={self.slug} breadcrumbLabel="歯科LINE活用" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">LINEの月間利用者数は<strong>9,700万人以上</strong>（2024年時点）、日本人口の<strong>約86%</strong>をカバーし、メッセージ開封率は<strong>約90%</strong>とメールの3〜7倍です。この高い到達力を活用すれば、歯科クリニックの定期検診離脱・治療中断・無断キャンセルは、自動リマインド・治療計画共有・口腔ケアTips配信で<strong>大幅に改善</strong>できます。本記事では、小児歯科や矯正・インプラント等の自費診療も含め、LINE活用の具体策と導入効果を紹介します。</p>

      <section>
        <h2 id="dental-challenges" className="text-xl font-bold text-gray-800">歯科クリニック特有の課題 — 定期検診の離脱・治療中断・キャンセル</h2>
        <p>歯科クリニックは他の診療科と比較して、いくつかの特有の経営課題を抱えています。これらの課題を理解し、LINEを活用して解決していくことで、安定した経営基盤を構築できます。</p>

        <BarChart
          data={[
            { label: "定期検診の離脱率", value: 40, color: "#ef4444" },
            { label: "治療中断率", value: 20, color: "#f59e0b" },
            { label: "キャンセル率（業界平均）", value: 12, color: "#f97316" },
          ]}
          unit="%"
        />

        <Callout type="warning" title="根本原因は「コミュニケーション不足」">
          定期検診の離脱（「痛みがなくなったから」「忙しくて忘れた」）、治療中断（複数回通院が必要な治療の途中離脱）、無断キャンセル。これらの課題はいずれも「患者との適切なタイミングでのコミュニケーション不足」が原因です。LINEで解決できます。無断キャンセル対策については<Link href="/lp/column/line-reservation-no-show" className="text-blue-600 underline">LINE予約管理で無断キャンセルを削減する方法</Link>も参考にしてください。
        </Callout>
      </section>

      <section>
        <h2 id="checkup-remind" className="text-xl font-bold text-gray-800">定期検診リマインドの自動化 — 3ヶ月・6ヶ月サイクル</h2>
        <p>定期検診の離脱を防ぐ最も効果的な方法は、適切なタイミングで「そろそろ検診の時期です」とリマインドを送ることです。ハガキや電話でのリマインドと比較して、LINEなら低コストかつ高い到達率で自動化できます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">リマインド配信スケジュール</h3>

        <FlowSteps steps={[
          { title: "検診2週間前", desc: "「次回の定期検診の時期が近づいています」と予約リンク付きで配信" },
          { title: "検診1週間前（未予約時）", desc: "「定期検診のご予約をお忘れなく」とフォローメッセージ" },
          { title: "予定日超過1週間後", desc: "「前回の検診から○ヶ月が経過しました。早期発見のため検診を受けましょう」" },
          { title: "予定日超過1ヶ月後", desc: "最終リマインド。「お口の健康を守るため、ぜひ検診にお越しください」" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">自動化のポイント</h3>

        <Callout type="point" title="4つの自動化ポイント">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>最終来院日をトリガーに3ヶ月後・6ヶ月後に自動で配信スケジュールを生成</li>
            <li>予約が入った時点で以降のリマインドを自動停止（二重通知を防止）</li>
            <li>患者ごとの検診サイクル（3ヶ月/4ヶ月/6ヶ月）に対応した個別設定</li>
            <li>リマインドメッセージに予約ボタンを設置し、ワンタップで予約画面に遷移</li>
          </ul>
        </Callout>

        <ResultCard before="55%" after="80%" metric="定期検診の受診率" description="LINEリマインド自動化で受診率が25ポイント向上" />
      </section>

      <section>
        <h2 id="treatment-plan" className="text-xl font-bold text-gray-800">治療計画の共有と進捗管理</h2>
        <p>治療中断を防ぐためには、患者に治療の全体像を理解してもらうことが重要です。「あと何回通えば終わるのか」「今どの段階にいるのか」が分からないと、患者のモチベーションは低下します。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINEで治療計画を共有する方法</h3>

        <FlowSteps steps={[
          { title: "初診時", desc: "治療計画の概要（全○回、期間約○ヶ月、費用概算）をLINEで送信。テキストで残して忘れ防止" },
          { title: "各治療後", desc: "「本日の治療内容」「次回の治療内容」「残り回数」を自動送信。進捗を可視化" },
          { title: "次回予約リマインド", desc: "治療の続きであることを明記し、中断リスク（症状悪化・再治療の可能性）を伝える" },
        ]} />

        <Callout type="warning" title="治療中断のリスクを具体的に伝える">
          「前回の根管治療から2週間が経過しました。仮の詰め物のままだと細菌感染のリスクがあります」のように、具体的なリスクを伝えることが効果的です。
        </Callout>

        <ResultCard before="20%" after="8%" metric="治療中断率" description="治療計画の共有と具体的なリスク告知で中断率を12ポイント改善" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="pediatric" className="text-xl font-bold text-gray-800">小児歯科向け: 保護者へのLINEフォロー</h2>
        <p>小児歯科では、患者本人ではなく保護者がLINEの友だちとなります。子どもの歯の健康管理は保護者の意識に大きく依存するため、LINEを通じた情報提供は非常に効果的です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">保護者向けLINE配信の活用例</h3>

        <ComparisonTable
          headers={["配信内容", "タイミング", "具体例"]}
          rows={[
            ["年齢別口腔ケア情報", "成長段階に合わせて定期配信", "乳歯の生え始め・永久歯への生え変わり・仕上げ磨きのコツ"],
            ["治療後のケア指導", "施術直後", "フッ素塗布後の注意事項・シーラント施術後の食事制限"],
            ["定期検診リマインド", "検診時期前", "「○○くんの次の検診は○月です」とパーソナライズ"],
            ["矯正治療の経過報告", "調整スケジュールに合わせて", "装置の注意事項・次回来院日を保護者LINEに送信"],
          ]}
        />

        <Callout type="success" title="子どもの不安軽減にも有効">
          治療前に「今日はどんな治療をするか」を子どもにも分かりやすく説明した動画やイラストをLINEで送ることで、治療への不安を軽減できます。治療後は「よく頑張りましたね」と送り、次回への抵抗感を減らしましょう。
        </Callout>
      </section>

      <section>
        <h2 id="self-pay" className="text-xl font-bold text-gray-800">自費診療（矯正・インプラント）の相談受付</h2>
        <p>矯正治療やインプラントなどの自費診療は高額な投資であり、検討期間が長く複数クリニックを比較して決断するケースがほとんどです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE相談から成約までのフロー</h3>

        <FlowSteps steps={[
          { title: "初回相談受付", desc: "LINE上で気軽に相談を受付。症状や希望をヒアリング" },
          { title: "情報提供", desc: "治療方法の選択肢、費用の目安、治療期間をLINEで案内" },
          { title: "カウンセリング予約", desc: "対面カウンセリングの予約へ誘導。LINE上から空き枠を選択" },
          { title: "カウンセリング後フォロー", desc: "決断できない場合もLINEでフォロー。質問への回答や追加情報で後押し" },
        ]} />

        <Callout type="point" title="成約率を上げるポイント">
          電話では「忙しそうだから聞きにくい」と感じる患者も、LINEなら気軽に質問できます。コミュニケーション量が増え、信頼関係の構築につながります。
        </Callout>

        <ResultCard before="25%" after="45%" metric="インプラント相談からの成約率" description="LINE導入で成約率が20ポイント向上" />
      </section>

      <section>
        <h2 id="oral-care-tips" className="text-xl font-bold text-gray-800">口腔ケアTips配信で友だち離脱を防止</h2>
        <p>歯科クリニックのLINE友だちが増えても、有益な情報を配信しなければブロックされてしまいます。口腔ケアに関する情報コンテンツを定期的に配信し、来院モチベーションを維持しましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">配信コンテンツ例（月2回配信の場合）</h3>

        <ComparisonTable
          headers={["月", "コンテンツ例1", "コンテンツ例2"]}
          rows={[
            ["1月", "正月太りと歯周病の意外な関係", "電動歯ブラシ選び方ガイド"],
            ["3月", "新生活スタート！歯科検診を受けましょう", "花粉症と口腔乾燥の関係"],
            ["6月", "梅雨時期の口臭対策", "歯と歯ぐきの健康週間（6/4〜10）"],
            ["8月", "夏休みの子どもの虫歯予防", "スポーツドリンクと酸蝕症の注意点"],
            ["11月", "いい歯の日（11/8）特別キャンペーン", "冬の感染症予防と口腔ケア"],
          ]}
        />

        <Callout type="point" title="情報提供から予約導線へ">
          季節やイベントに紐づけた配信は「自分に関係がある」と感じてもらいやすく、開封率が向上します。配信内容の最後に予約リンクを添えておくことで、自然な導線を作れます。ブロックされないための配信テクニックは<Link href="/lp/column/line-block-rate-reduction" className="text-blue-600 underline">ブロック率を下げる5つの鉄則</Link>で詳しく解説しています。
        </Callout>
      </section>

      <section>
        <h2 id="case-study" className="text-xl font-bold text-gray-800">導入効果: 定期検診通院率の向上事例</h2>
        <p>都内の歯科クリニック（ユニット数5台、患者数約2,500人）がLINE公式アカウントを導入し、定期検診リマインドを自動化した事例を紹介します。</p>

        <Callout type="warning" title="導入前の課題">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>定期検診の通院率: 50%（リコールハガキのみで管理）</li>
            <li>ハガキの印刷・発送コスト: 月約3万円</li>
            <li>受付スタッフが電話リマインドに1日30分を費やしていた</li>
            <li>治療中断率: 18%</li>
          </ul>
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE導入後の施策</h3>

        <FlowSteps steps={[
          { title: "QRコードで友だち登録促進", desc: "受付・ユニット横に掲示" },
          { title: "定期検診リマインド自動配信", desc: "3ヶ月サイクルで自動リマインド" },
          { title: "治療進捗を自動送信", desc: "治療計画の進捗を治療後に自動通知" },
          { title: "口腔ケア情報を月2回配信", desc: "有益コンテンツで友だち維持" },
          { title: "予約リマインドをLINEに切替", desc: "前日18時にLINEでリマインド" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">導入6ヶ月後の結果</h3>

        <StatGrid stats={[
          { value: "1,800", unit: "人", label: "LINE友だち数（患者の72%）" },
          { value: "78%", label: "定期検診の通院率（+28pt）" },
          { value: "7%", label: "治療中断率（-11pt）" },
        ]} />

        <ResultCard before="月12件" after="月3件" metric="無断キャンセル" description="75%削減。ハガキ・電話コスト月3万円もほぼゼロに" />

        <Callout type="success" title="月間売上が約15%増加">
          定期検診の受診率向上と治療継続率の改善により、安定した売上基盤を構築できました。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 歯科クリニックのLINE活用で通院率を向上</h2>

        <FlowSteps steps={[
          { title: "定期検診リマインドの自動化", desc: "3〜6ヶ月サイクルのリマインドで離脱率を大幅に改善" },
          { title: "治療計画の共有", desc: "進捗の可視化で治療中断を防止" },
          { title: "小児歯科の保護者フォロー", desc: "子どもの年齢に応じた口腔ケア情報で信頼構築" },
          { title: "自費診療の相談受付", desc: "LINEで気軽に相談できる環境を整え、成約率を向上" },
          { title: "口腔ケアTips配信", desc: "有益な情報で友だち離脱を防止し、来院モチベーションを維持" },
        ]} />

        <p className="mt-4">歯科クリニックでもLINE友だちの集め方は重要です。具体的な施策は<Link href="/lp/column/clinic-line-friends-growth" className="text-blue-600 underline">LINE友だち集め月100人増やす7つの施策</Link>を参考にしてください。Lオペ for CLINICは、歯科クリニックの定期検診リマインド・治療計画管理・<Link href="/lp/features#予約・診察" className="text-sky-600 underline hover:text-sky-800">予約連携</Link>をオールインワンで提供します。定期検診の通院率向上とキャンセル削減を実現しませんか。</p>
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
    </>
  );
}
