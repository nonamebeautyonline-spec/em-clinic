import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  ResultCard,
  StatGrid,
  BarChart,
  Callout,
  FlowSteps,
  DonutChart,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-line-case-studies")!;

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
  "LINE公式アカウントを活用した5つのクリニック事例と具体的な成果",
  "予約管理・再診促進・問診自動化・決済連携・AI返信の実践例",
  "クリニック専用ツールと汎用ツールの違い",
];

const toc = [
  { id: "why-line", label: "なぜLINE公式アカウントが必要か" },
  { id: "case-1", label: "事例1: 問診→予約を完全自動化" },
  { id: "case-2", label: "事例2: セグメント配信で再診率向上" },
  { id: "case-3", label: "事例3: 自動リマインドでキャンセル削減" },
  { id: "case-4", label: "事例4: オンライン決済+配送" },
  { id: "case-5", label: "事例5: AI自動返信で24時間対応" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        クリニックのLINE公式アカウント活用で成果を出すには、問診自動化・セグメント配信・自動リマインド・オンライン決済・AI返信の<strong>5施策</strong>が効果的です。本記事では、実際に成果を上げた<strong>5つのクリニック事例</strong>と、汎用ツールではなくクリニック専用ツールを選ぶべき理由を具体的なデータとともに解説します。
      </p>

      {/* ── なぜLINE ── */}
      <section>
        <h2 id="why-line" className="text-xl font-bold text-gray-800">なぜクリニックにLINE公式アカウントが必要なのか</h2>
        <p>日本国内のLINEユーザーは9,700万人超。患者の大半がすでに日常的にLINEを利用しています。</p>

        <BarChart
          data={[
            { label: "LINE", value: 80, color: "bg-sky-500" },
            { label: "メール", value: 25, color: "bg-gray-300" },
            { label: "DM/ハガキ", value: 12, color: "bg-gray-300" },
            { label: "電話", value: 8, color: "bg-gray-300" },
          ]}
          unit="%"
        />

        <Callout type="point" title="開封率80%の圧倒的リーチ">
          メールの約3倍、DMハガキの約7倍。LINEは患者に確実に届くコミュニケーションチャネルです。
        </Callout>

        <p>しかし、多くのクリニックではLINE公式アカウントを開設しただけで活用しきれていないのが実情です。ツール選定で迷っている方は<Link href="/lp/column/lstep-vs-clinic-tool" className="text-emerald-700 underline">Lステップ・Liny vs クリニック専用ツール比較</Link>も参考にしてください。ここでは、LINE公式アカウントを効果的に活用しているクリニックの事例を5つご紹介します。</p>
      </section>

      {/* ── 事例1 ── */}
      <section>
        <h2 id="case-1" className="text-xl font-bold text-gray-800">事例1: 友だち追加→問診→予約を完全自動化（美容皮膚科）</h2>

        <Callout type="warning" title="導入前の課題">
          新患の問い合わせ対応に受付スタッフが1日2時間以上を費やしていた。電話で問診内容を確認し、空き枠を案内し、予約を手動登録する作業が大きな負担に。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "友だち追加で自動問診", desc: "友だち追加時に挨拶メッセージ＋問診フォームを自動送信" },
          { title: "予約カレンダー自動配信", desc: "問診完了後に空き枠カレンダーのリンクをLINEで自動配信" },
          { title: "リッチメニュー自動切替", desc: "予約確定時にリッチメニューを「予約済み」デザインに自動変更" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <ResultCard
          before="1日2時間"
          after="1日15分"
          metric="受付スタッフの電話対応時間を87%削減"
          description="新患の予約完了率も30%向上"
        />
      </section>

      {/* ── 事例2 ── */}
      <section>
        <h2 id="case-2" className="text-xl font-bold text-gray-800">事例2: セグメント配信で再診率25%向上（内科クリニック）</h2>

        <Callout type="warning" title="導入前の課題">
          慢性疾患の患者が通院を中断してしまうケースが多く、再診率の低下が経営課題に。DMハガキでフォローしていたが、コストが高く反応率も低かった。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "離脱患者の自動検出", desc: "最終来院日から3ヶ月以上経過した患者をセグメントで自動抽出" },
          { title: "パーソナル配信", desc: "「その後の体調はいかがですか？」と個別感のあるメッセージで再来院を促進" },
          { title: "配信時間の最適化", desc: "反応率データを分析し、最適な曜日・時間帯に配信を調整" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <p>セグメント配信の具体的なノウハウは<Link href="/lp/column/segment-delivery-repeat" className="text-emerald-700 underline">LINEセグメント配信でリピート率を向上させる方法</Link>で詳しく解説しています。</p>

        <ResultCard before="再診率 45%" after="再診率 68%" metric="再診率23ポイント向上" description="DMハガキの月額5万円コスト削減" />

        <DonutChart percentage={68} label="再診率 68%達成" sublabel="導入前45%から大幅に改善" />
      </section>

      <InlineCTA />

      {/* ── 事例3 ── */}
      <section>
        <h2 id="case-3" className="text-xl font-bold text-gray-800">事例3: 自動リマインドで無断キャンセル80%削減（歯科クリニック）</h2>

        <Callout type="warning" title="導入前の課題">
          月平均30件の無断キャンセルが発生。受付スタッフが前日に電話でリマインドしていたが、不在で繋がらないケースが半数以上だった。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "前日自動リマインド", desc: "予約日前日18時にLINEでリマインドメッセージを自動配信" },
          { title: "簡単リスケ機能", desc: "メッセージ内に「変更・キャンセル」ボタンを設置。タップだけで予約変更可能" },
          { title: "キャンセル待ち自動通知", desc: "キャンセル発生時、キャンセル待ちの患者にLINEで即座に空き通知" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <p>リマインド配信によるキャンセル対策の詳細は<Link href="/lp/column/line-reservation-no-show" className="text-emerald-700 underline">LINE予約管理で無断キャンセルを削減する方法</Link>をご覧ください。</p>

        <ResultCard before="月30件" after="月6件" metric="無断キャンセルを80%削減" description="空き枠の稼働率向上で月間売上12%増加" />

        <StatGrid stats={[
          { value: "80", unit: "%", label: "キャンセル削減" },
          { value: "12", unit: "%", label: "月間売上増加" },
          { value: "0", unit: "分", label: "電話リマインド工数" },
        ]} />
      </section>

      {/* ── 事例4 ── */}
      <section>
        <h2 id="case-4" className="text-xl font-bold text-gray-800">事例4: オンライン決済+配送でオンライン診療を完結（オンラインクリニック）</h2>

        <Callout type="warning" title="導入前の課題">
          オンライン診療後の決済を銀行振込で運用。未入金の催促や入金確認が手作業で、処方薬の配送管理も別システムで二重管理。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "LINE上でカード決済", desc: "診察後にLINE上でクレジットカード決済リンクを自動送信" },
          { title: "決済→配送を自動連携", desc: "決済完了で配送手配が自動スタート。追跡番号もLINE通知" },
          { title: "ステータス自動通知", desc: "出荷・配達完了をLINEでリアルタイム通知" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <ResultCard before="決済完了率 65%" after="決済完了率 95%" metric="決済完了率30ポイント向上" description="未入金催促業務がほぼゼロに" />
      </section>

      {/* ── 事例5 ── */}
      <section>
        <h2 id="case-5" className="text-xl font-bold text-gray-800">事例5: AI自動返信で夜間問い合わせに24時間対応（皮膚科クリニック）</h2>

        <Callout type="warning" title="導入前の課題">
          LINEの問い合わせの40%が診療時間外に集中。翌営業日まで返信できず、他院に流れてしまう患者が多かった。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">LINE活用の施策</h3>
        <FlowSteps steps={[
          { title: "AI自動返信を設定", desc: "診療内容・予約方法・アクセス情報への問い合わせにAIが即座に回答" },
          { title: "自動エスカレーション", desc: "AIが対応しきれない質問は翌営業日にスタッフへ自動通知" },
          { title: "学習による精度向上", desc: "スタッフの修正内容をAIが継続学習し、回答精度が日々向上" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成果</h3>
        <ResultCard before="夜間対応 0%" after="夜間対応 85%" metric="夜間問い合わせ即時対応率85%達成" />

        <StatGrid stats={[
          { value: "85", unit: "%", label: "夜間即時対応率" },
          { value: "15", unit: "%", label: "新患獲得増加" },
          { value: "30", unit: "%", label: "問い合わせ工数削減" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: クリニックのLINE活用を成功させるポイント</h2>

        <p>5つの事例に共通するポイントは以下の3つです。</p>

        <Callout type="success" title="成功の3原則">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>自動化を徹底する</strong> — 手作業をなくし、友だち追加から予約・決済・フォローまで自動フローを構築</li>
            <li><strong>パーソナライズする</strong> — 全員一斉配信ではなく、患者の状態に合わせたセグメント配信で反応率を最大化</li>
            <li><strong>クリニック専用ツールを使う</strong> — 汎用LINE配信ツールではなく、医療業務フローに特化したツールで運用効率を最大化</li>
          </ol>
        </Callout>

        <BarChart
          data={[
            { label: "受付工数", value: 87, color: "bg-sky-500" },
            { label: "キャンセル", value: 80, color: "bg-emerald-500" },
            { label: "決済完了率", value: 46, color: "bg-violet-500" },
            { label: "再診率", value: 56, color: "bg-amber-500" },
          ]}
          unit="% 改善"
        />

        <p>Lオペ for CLINICは、これら5つの事例で紹介した施策をすべて実現できるクリニック専用のLINE運用プラットフォームです。予約管理・セグメント配信・AI自動返信・決済連携など、搭載している<Link href="/lp/features" className="text-sky-600 underline hover:text-sky-800">全機能の一覧はこちら</Link>でご確認いただけます。LINE運用の始め方から自動化まで体系的に知りたい方は<Link href="/lp/column/line-operation-guide" className="text-emerald-700 underline">LINE公式アカウント運用完全ガイド</Link>をご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
