import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, BarChart, ComparisonTable, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "beauty-clinic-line")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "美容クリニックでLINE活用が特に効果的な理由は？", a: "美容クリニックは自費診療が中心でリピート率が重要なため、LINE上でのセグメント配信やフォローアップが売上に直結します。施術後のダウンタイム確認や次回施術の提案をLINEで自動化でき、再来院率が向上します。" },
  { q: "カウンセリング予約をLINEで受け付けるメリットは？", a: "電話予約と比較して患者の心理的ハードルが下がり、深夜や休日の予約取得が可能になります。実際にLINE予約を導入した美容クリニックでは、予約数が30〜50%増加した事例があります。" },
  { q: "施術写真のビフォーアフターをLINEで送っても問題ありませんか？", a: "医療広告ガイドラインでは、ビフォーアフター写真の広告利用に制限があります。ただし、当該患者本人への施術経過報告としての個別送信は広告に該当しないため、フォローアップ目的での利用は問題ありません。一斉配信での使用は注意が必要です。" },
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
  "美容クリニック特有のLINE活用ニーズとカウンセリング予約のデジタル化手法",
  "施術前リマインドからアフターフォローまでの自動化フロー構築方法",
  "リピート施術のセグメント配信と口コミ促進の具体的施策",
];

const toc = [
  { id: "beauty-line-needs", label: "美容クリニック特有のLINE活用ニーズ" },
  { id: "counseling-reservation", label: "カウンセリング予約のLINE化" },
  { id: "pre-treatment-remind", label: "施術前リマインドと注意事項の自動送信" },
  { id: "after-follow", label: "アフターフォロー" },
  { id: "before-after-photo", label: "ビフォーアフター写真管理と同意取得" },
  { id: "repeat-segment", label: "リピート施術のセグメント配信" },
  { id: "review-promotion", label: "口コミ促進" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <ArticleLayout slug={self.slug} breadcrumbLabel="美容クリニック" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        LINEの月間利用者数は<strong>9,700万人以上</strong>（2024年時点）で日本人口の<strong>約86%</strong>をカバーし、開封率は<strong>約90%</strong>とメールの3〜7倍。美容クリニックのように「リピート率」が経営を左右する業態では、この到達力を活かさない手はありません。カウンセリング予約のデジタル化・施術前リマインド自動送信・アフターフォロー・ビフォーアフター写真管理・リピート施術のセグメント配信・口コミ促進の<strong>6施策</strong>が売上向上に直結します。本記事では、美容クリニック特有のニーズに合わせた具体的な運用方法を解説します。
      </p>

      <section>
        <h2 id="beauty-line-needs" className="text-xl font-bold text-gray-800">美容クリニック特有のLINE活用ニーズ</h2>
        <p>美容クリニックは一般的な内科や歯科と異なり、自由診療が中心で患者の意思決定プロセスが長いという特徴があります。施術を検討している患者は、複数のクリニックを比較しながら情報収集を行い、カウンセリングを受けてから施術を決断するケースがほとんどです。</p>

        <Callout type="warning" title="美容クリニックの課題">
          検討期間中に患者との接点を維持できなければ、競合クリニックに流出してしまいます。メールの開封率は低下傾向にあり、電話では美容医療の相談をしにくいと感じる患者も多数います。
        </Callout>

        <p>美容クリニックがLINEを活用すべき理由は主に3つあります。</p>

        <StatGrid stats={[
          { value: "30〜50%", label: "カウンセリング予約率の向上" },
          { value: "80%+", label: "LINEメッセージの開封率" },
          { value: "1対1", label: "プライバシーに配慮した相談" },
        ]} />

        <ul className="list-disc pl-6 space-y-1">
          <li><strong>長い検討期間中のナーチャリング</strong> — メールよりも開封率が高く、検討中の患者に継続的に情報を届けられる</li>
          <li><strong>ビジュアルコミュニケーション</strong> — 写真や動画を手軽に送受信でき、希望する施術のイメージ共有がスムーズ</li>
          <li><strong>プライバシーへの配慮</strong> — 美容医療は他人に知られたくないという患者も多く、LINEの個別チャットなら安心して相談できる</li>
        </ul>
      </section>

      <section>
        <h2 id="counseling-reservation" className="text-xl font-bold text-gray-800">カウンセリング予約のLINE化 — 写真事前送信と希望部位ヒアリング</h2>
        <p>美容クリニックのカウンセリング予約は、電話やWebフォームが一般的ですが、LINEを活用することで患者体験を大幅に向上させることができます。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">写真事前送信で来院前ヒアリングを完了</h3>
        <p>LINEなら、患者は気になる部位の写真を事前に送信できます。電話では伝えにくい「目元のたるみ」「ほうれい線」「シミの範囲」なども、写真があれば医師は来院前に状態を把握でき、カウンセリング時間を短縮しつつ精度の高い提案が可能になります。</p>

        <FlowSteps steps={[
          { title: "友だち追加", desc: "自動で「気になる部位の写真をお送りください」とメッセージを配信" },
          { title: "写真+問診", desc: "希望施術・予算・過去の施術歴をリッチメニューのフォームでヒアリング" },
          { title: "問診データ管理", desc: "写真と問診データを管理画面で一元表示し、カウンセリング準備を効率化" },
          { title: "予約完了", desc: "リッチメニューからカレンダーを開き、空き枠を選択して予約完了" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE上で予約を完結</h3>
        <p>従来の電話予約では、受付スタッフが空き状況を確認しながら日時を調整する必要がありました。LINEと予約システムを連携すれば、患者がリッチメニューからカレンダーを開き、空き枠を選択するだけで予約が完了します。</p>

        <Callout type="point" title="予約枠の自動振り分け">
          美容クリニックでは施術メニューが多岐にわたるため、カウンセリング枠と施術枠を分けて管理できる機能が重要です。LINEの問診結果に応じて、適切な予約枠へ自動振り分けを行うことで、予約管理の手間を大幅に削減できます。
        </Callout>
      </section>

      <section>
        <h2 id="pre-treatment-remind" className="text-xl font-bold text-gray-800">施術前リマインドと注意事項の自動送信</h2>

        <Callout type="warning" title="準備不足による施術延期リスク">
          レーザー治療前の日焼け対策、ヒアルロン酸注入前の飲酒制限、脂肪溶解注射前の食事制限など、施術ごとに異なる注意事項があります。口頭だけでは患者が忘れてしまい、施術延期になるケースが頻発します。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">配信タイミングの設計例</h3>

        <FlowSteps steps={[
          { title: "予約確定直後", desc: "施術概要・所要時間・持ち物リストを送信" },
          { title: "施術3日前", desc: "施術ごとの事前準備（日焼け対策・飲酒制限・メイクオフの必要性など）を送信" },
          { title: "施術前日", desc: "来院時間・アクセス・当日の注意事項をリマインド" },
          { title: "施術当日朝", desc: "「本日お待ちしています」のメッセージで来院を後押し" },
        ]} />

        <ResultCard before="月15件" after="月2件" metric="準備不足による施術延期" description="自動リマインド導入で施術延期を87%削減" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="after-follow" className="text-xl font-bold text-gray-800">アフターフォロー — 施術後のケア方法と経過確認</h2>
        <p>美容施術において、アフターフォローは患者満足度とリピート率を左右する極めて重要な要素です。施術後の不安を解消し、適切なケアを案内することで、患者の信頼を獲得し、次回施術への意欲を高めることができます。患者の離脱を防ぐフォローアップ施策の全体像は<Link href="/lp/column/clinic-patient-retention" className="text-sky-600 underline hover:text-sky-800">患者離脱を防ぐLINEフォローアップ</Link>もご参照ください。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">施術後の自動フォロースケジュール</h3>

        <FlowSteps steps={[
          { title: "施術当日", desc: "施術後の注意事項・冷却方法・入浴制限などを画像付きで案内" },
          { title: "施術翌日", desc: "「お加減はいかがですか？」と経過確認メッセージを送信。写真での報告を促す" },
          { title: "施術3日後", desc: "ダウンタイム中の症状が正常範囲内であることを案内。異常時の連絡方法も明記" },
          { title: "施術1週間後", desc: "経過写真の送信を依頼。医師のコメントをLINEで返信" },
        ]} />

        <Callout type="success" title="アフターフォロー自動化の効果">
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li>施術後のクレームやトラブルの早期発見・対応が可能に</li>
            <li>丁寧なフォローが口コミ評価の向上に直結する</li>
            <li>経過データの蓄積で施術品質の改善に活用できる</li>
            <li>患者との継続的な接点が次回施術の提案タイミングを生む</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="before-after-photo" className="text-xl font-bold text-gray-800">ビフォーアフター写真管理と同意取得</h2>
        <p>ビフォーアフター写真は美容クリニックの集患において最も強力なコンテンツですが、個人情報保護やプライバシーの観点から、適切な同意取得と管理が不可欠です。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE上での同意取得フロー</h3>

        <FlowSteps steps={[
          { title: "経過確認メッセージ送信", desc: "施術後の経過確認メッセージに、ビフォーアフター写真の掲載許可フォームを添付" },
          { title: "3段階の同意取得", desc: "「SNS掲載OK」「院内掲示のみOK」「掲載不可」の3段階で同意を取得" },
          { title: "データ管理", desc: "同意データは管理画面で一元表示し、マーケティングチームが活用可能な状態で管理" },
        ]} />

        <Callout type="point" title="写真管理のポイント">
          LINEで受信した写真は患者ID・施術メニュー・撮影日と紐づけてデータベースに格納しましょう。撮影条件（照明・角度）のガイドラインをLINEで事前に案内することで、比較しやすい高品質な写真を収集できます。
        </Callout>
      </section>

      <section>
        <h2 id="repeat-segment" className="text-xl font-bold text-gray-800">リピート施術のセグメント配信</h2>
        <p>美容施術の多くは、効果を維持するために定期的な再施術が必要です。施術メニューごとに推奨される再施術サイクルは異なるため、セグメント配信で適切なタイミングにリマインドを送ることがリピート率向上の鍵になります。セグメント配信の詳しい設計方法は<Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">LINEセグメント配信でリピート率を向上</Link>で解説しています。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">施術別の配信サイクル</h3>

        <ComparisonTable
          headers={["施術メニュー", "リマインド時期", "配信メッセージ例"]}
          rows={[
            ["ボトックス注射", "3〜4ヶ月後", "効果が薄れてくる頃です"],
            ["ヒアルロン酸注入", "6ヶ月〜1年後", "持続期間に個人差があります"],
            ["レーザートーニング", "1ヶ月後", "コース残り回数を通知"],
            ["脱毛", "6〜8週間後", "毛周期に合わせた次回推奨日"],
            ["ピーリング", "2〜4週間後", "季節に応じた施術プランを提案"],
          ]}
        />

        <ResultCard before="35%" after="65%" metric="ボトックスのリピート率" description="セグメント配信導入でリピート率が約2倍に向上。患者1人あたりのLTVが1.8倍に増加" />
      </section>

      <section>
        <h2 id="review-promotion" className="text-xl font-bold text-gray-800">口コミ促進 — 満足度アンケート+Google口コミ誘導</h2>
        <p>美容クリニック選びにおいて、口コミは患者の意思決定に最も大きな影響を与える要因の一つです。なお、配信のしすぎでブロックされてしまっては元も子もありません。<Link href="/lp/column/line-block-rate-reduction" className="text-sky-600 underline hover:text-sky-800">ブロック率を下げる5つの鉄則</Link>を押さえた上で口コミ促進を進めましょう。</p>

        <StatGrid stats={[
          { value: "0.5", unit: "点UP", label: "Google評価が上がるだけで" },
          { value: "20%+", label: "新規予約数が増加" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2ステップ口コミ促進フロー</h3>

        <FlowSteps steps={[
          { title: "満足度アンケート送信", desc: "施術後1〜2週間で5段階評価+自由記述をLINEで配信。不満を検知した場合はスタッフがフォローアップ" },
          { title: "高評価者にGoogle口コミ誘導", desc: "4〜5点の患者にのみ投稿をお願い。ワンタップで開けるリンクボタンを設置" },
        ]} />

        <Callout type="success" title="2ステップ方式の成果">
          低評価の患者にはフォロー対応、満足した患者には口コミをお願いする仕組みで、Google口コミの平均評価が3.8から4.5に向上した事例があります。
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 美容クリニックのLINE活用で患者体験を最大化</h2>
        <p>美容クリニックにおけるLINE活用は、カウンセリング予約から施術後のアフターフォローまで、患者体験のあらゆる接点をカバーできます。</p>

        <FlowSteps steps={[
          { title: "予約前", desc: "写真事前送信と希望部位ヒアリングでカウンセリング品質を向上" },
          { title: "施術前", desc: "施術メニュー別のリマインドで準備不足を防止" },
          { title: "施術後", desc: "経過確認の自動化で患者の不安を解消し、満足度を向上" },
          { title: "リピート", desc: "セグメント配信で適切なタイミングに再施術を案内" },
          { title: "口コミ", desc: "2ステップ方式でGoogle口コミの質と量を最大化" },
        ]} />

        <p className="mt-4">Lオペ for CLINICは、美容クリニックに必要なこれらの機能をオールインワンで提供します。<Link href="/lp/features#患者CRM" className="text-sky-600 underline hover:text-sky-800">患者CRM</Link>から<Link href="/lp/features#メッセージ配信" className="text-sky-600 underline hover:text-sky-800">セグメント配信</Link>まで、LINE一つで患者体験を最大化しませんか。オンライン診療との連携に興味がある方は<Link href="/lp/column/online-medical-line" className="text-sky-600 underline hover:text-sky-800">オンライン診療×LINE</Link>の記事もご覧ください。美容皮膚科の対面×オンラインのハイブリッドモデルは<Link href="/lp/column/beauty-derma-online-hybrid" className="text-sky-600 underline hover:text-sky-800">美容皮膚科のオンライン診療戦略</Link>で解説しています。</p>
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
