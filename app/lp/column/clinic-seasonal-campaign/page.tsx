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
const self = articles.find((a) => a.slug === "clinic-seasonal-campaign")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "季節ごとの疾患トレンドに合わせたLINE配信が集患に直結",
  "春（花粉症）・夏（紫外線）・秋（インフルワクチン）・冬（風邪・乾燥）の配信テンプレート",
  "セグメント配信で対象患者にのみ配信しブロック率を抑制",
  "年間配信カレンダーで計画的な運用を実現",
];

const toc = [
  { id: "why-seasonal", label: "なぜ季節別配信が効果的なのか" },
  { id: "spring", label: "春の配信戦略 — 花粉症・新生活" },
  { id: "summer", label: "夏の配信戦略 — 紫外線・熱中症" },
  { id: "autumn-winter", label: "秋冬の配信戦略 — インフルエンザ・風邪" },
  { id: "calendar", label: "年間配信カレンダーの作り方" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">クリニックのLINE配信は、季節の疾患トレンドに合わせることで<strong>開封率・予約CV率が大幅に向上</strong>します。「今まさに困っている」患者に適切なタイミングでメッセージを届けることが、効果的な集患の鍵です。本記事では春夏秋冬の配信テンプレートと年間カレンダーの作り方を解説します。</p>

      {/* ── なぜ季節別配信が効果的か ── */}
      <section>
        <h2 id="why-seasonal" className="text-xl font-bold text-gray-800">なぜ季節別配信が効果的なのか</h2>
        <p>LINE配信の効果を最大化するには、患者が「今まさに必要としている情報」を届けることが重要です。季節ごとに流行する疾患や健康課題に合わせた配信は、患者のニーズと合致するため高い反応率を得られます。セグメント配信の基本は<Link href="/lp/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">LINEセグメント配信でリピート率を向上させる方法</Link>で解説しています。</p>

        <StatGrid stats={[
          { value: "2.3", unit: "倍", label: "季節配信の開封率（通常比）" },
          { value: "45", unit: "%", label: "予約CV率の向上" },
          { value: "15", unit: "%", label: "ブロック率の低下" },
        ]} />

        <Callout type="info" title="タイミングが全て">
          花粉症の配信を4月に送っても遅すぎます。患者が症状を感じ始める1〜2週間前に配信することで、「早めに受診しよう」というアクションにつながります。
        </Callout>
      </section>

      {/* ── 春 ── */}
      <section>
        <h2 id="spring" className="text-xl font-bold text-gray-800">春の配信戦略 — 花粉症・新生活</h2>
        <p>春は花粉症シーズンの到来と、新生活による生活環境の変化が重なる時期です。早めの受診を促すメッセージが効果的です。</p>

        <FlowSteps steps={[
          { title: "2月上旬: 花粉症シーズン予告", desc: "「今年のスギ花粉は○月○日頃から飛散開始予報です。症状が出る前の早期治療が効果的です」と予告配信。前年の花粉症受診歴がある患者にセグメント配信。" },
          { title: "3月: 花粉症治療のご案内", desc: "「当院では舌下免疫療法・点鼻薬・内服薬の処方が可能です。オンライン診療にも対応しています」と治療の選択肢を提示。LINE予約への導線を設置。" },
          { title: "4月: 新生活の健康チェック", desc: "新入社員・新入生向けに「新生活のストレスによる体調不良、お気軽にご相談ください」と配信。初診のハードルを下げるメッセージで新患を獲得。" },
        ]} />
      </section>

      {/* ── 夏 ── */}
      <section>
        <h2 id="summer" className="text-xl font-bold text-gray-800">夏の配信戦略 — 紫外線・熱中症</h2>
        <p>夏は紫外線による肌トラブルや熱中症のリスクが高まる時期です。予防啓発と合わせた配信がブロック率を下げるコツです。配信でブロックされない方法は<Link href="/lp/column/line-block-rate-reduction" className="text-sky-600 underline hover:text-sky-800">ブロック率を下げる5つの鉄則</Link>をご覧ください。</p>

        <FlowSteps steps={[
          { title: "6月: 紫外線対策の啓発", desc: "「梅雨でも紫外線は強い！日焼け止めの正しい使い方」など、患者に役立つ健康情報を配信。売り込み感を出さずクリニックの専門性をアピール。" },
          { title: "7月: 夏の肌トラブル相談", desc: "皮膚科・美容クリニック向けに「汗疹・日焼け・虫刺されのお悩みはお早めに」と配信。写真でのオンライン相談を案内して来院ハードルを下げる。" },
          { title: "8月: 熱中症予防と夏バテ対策", desc: "「熱中症の初期症状チェックリスト」などの実用的な情報を配信。内科向けには点滴治療やビタミン補給の案内を追加。" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── 秋冬 ── */}
      <section>
        <h2 id="autumn-winter" className="text-xl font-bold text-gray-800">秋冬の配信戦略 — インフルエンザ・風邪</h2>
        <p>秋冬はインフルエンザワクチンの需要が急増し、風邪や乾燥による肌トラブルも増加します。配信効果の測定方法は<Link href="/lp/column/clinic-line-analytics" className="text-sky-600 underline hover:text-sky-800">LINE配信効果測定</Link>の記事で詳しく解説しています。</p>

        <FlowSteps steps={[
          { title: "9月: インフルワクチン予約開始", desc: "「インフルエンザワクチンの予約受付を開始しました。LINEから24時間予約可能です」と配信。前年接種者に優先的に案内し、予約枠を効率的に埋める。" },
          { title: "10〜11月: ワクチン接種リマインド", desc: "予約済みの患者には接種日前日にリマインド。未予約者には「まだ間に合います」と追加配信して接種率を向上。" },
          { title: "12〜1月: 風邪・乾燥対策", desc: "「年末年始の体調管理」「冬の乾燥肌対策」など、季節に合った健康情報を配信。年末年始の診療スケジュールも併せて案内。" },
        ]} />

        <ResultCard
          before="年間を通じて同じ内容の一斉配信"
          after="季節トレンドに合わせたセグメント配信"
          metric="年間予約数が前年比35%増加"
          description="患者のニーズに合った配信で反応率が向上"
        />
      </section>

      {/* ── 年間カレンダー ── */}
      <section>
        <h2 id="calendar" className="text-xl font-bold text-gray-800">年間配信カレンダーの作り方</h2>
        <p>季節別配信を成功させるには、年間スケジュールを事前に策定しておくことが重要です。</p>

        <FlowSteps steps={[
          { title: "Step 1: 疾患カレンダーの作成", desc: "自院の診療科目に関連する季節性疾患をリストアップ。過去の受診データから月別の患者数推移を確認し、ピーク時期を特定する。" },
          { title: "Step 2: 配信スケジュールの策定", desc: "各疾患のピーク1〜2週間前に配信タイミングを設定。月2〜3回の配信頻度を目安にし、配信過多によるブロックを防止。" },
          { title: "Step 3: テンプレートの事前準備", desc: "各季節のメッセージテンプレートを事前に作成。リッチメッセージの画像素材も含めて準備し、配信直前の作業負荷を軽減。" },
          { title: "Step 4: 効果測定と改善", desc: "配信ごとに開封率・クリック率・予約CV率を計測。翌年の配信カレンダーに反映し、PDCAサイクルを回す。" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="季節別LINE配信戦略のポイント">
          <ul className="mt-1 space-y-1">
            <li>• 患者が「今困っている」タイミングに合わせた配信で開封率2.3倍</li>
            <li>• 前年の受診歴に基づくセグメント配信でブロック率を抑制</li>
            <li>• 健康情報の提供を兼ねた配信で、売り込み感を排除しつつ集患</li>
            <li>• 年間配信カレンダーの策定で計画的かつ効率的な運用を実現</li>
          </ul>
        </Callout>

        <p>Lオペ for CLINICは、セグメント配信・配信予約・テンプレート管理・効果測定をオールインワンで提供します。季節ごとの配信戦略を簡単に実行し、年間を通じた安定的な集患を実現しましょう。リピート率向上のための全体戦略は<Link href="/lp/column/clinic-repeat-rate-improvement" className="text-sky-600 underline hover:text-sky-800">リピート率改善ガイド</Link>、紹介制度と組み合わせた集患強化は<Link href="/lp/column/clinic-referral-program" className="text-sky-600 underline hover:text-sky-800">紹介制度のLINE化</Link>もあわせてご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
