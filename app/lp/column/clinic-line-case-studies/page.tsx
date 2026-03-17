import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[0];

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

      <section>
        <h2 id="why-line" className="text-xl font-bold text-slate-800">なぜクリニックにLINE公式アカウントが必要なのか</h2>
        <p>日本国内のLINEユーザーは9,700万人超。患者の大半がすでに日常的にLINEを利用しています。メールや電話と比較して<strong>開封率は約80%</strong>と圧倒的に高く、クリニックからの連絡が確実に届くチャネルです。</p>
        <p>しかし、多くのクリニックではLINE公式アカウントを開設しただけで終わっており、活用しきれていないのが実情です。ここでは、LINE公式アカウントを効果的に活用しているクリニックの事例を5つご紹介します。</p>
      </section>

      <section>
        <h2 id="case-1" className="text-xl font-bold text-slate-800">事例1: 友だち追加→問診→予約を完全自動化（美容皮膚科）</h2>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">課題</h3>
        <p>新患の問い合わせ対応に受付スタッフが1日2時間以上を費やしていた。電話で問診内容を確認し、空き枠を案内し、予約を手動登録する作業が負担に。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">LINE活用の施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>友だち追加時に自動で挨拶メッセージ+問診フォームを送信</li>
          <li>問診完了後に予約カレンダーのリンクを自動配信</li>
          <li>予約確定時にリッチメニューを「予約済み」デザインに自動切替</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">成果</h3>
        <p>受付スタッフの電話対応時間が<strong>1日2時間 → 15分</strong>に削減。新患の予約完了率も30%向上。患者側も来院前に問診が完了するため、待ち時間の短縮にも繋がった。</p>
      </section>

      <section>
        <h2 id="case-2" className="text-xl font-bold text-slate-800">事例2: セグメント配信で再診率25%向上（内科クリニック）</h2>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">課題</h3>
        <p>慢性疾患の患者が通院を中断してしまうケースが多く、再診率の低下が経営課題に。DMハガキでフォローしていたが、コストが高く反応率も低かった。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">LINE活用の施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>最終来院日から3ヶ月以上経過した患者にセグメント配信</li>
          <li>「その後の体調はいかがですか？」とパーソナルなメッセージで再来院を促進</li>
          <li>配信結果を分析し、反応率の高い曜日・時間帯に配信時間を最適化</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">成果</h3>
        <p>再診率が<strong>45% → 70%</strong>に向上。DMハガキの印刷・郵送コストが月5万円削減。開封率80%超のLINEならではの効果。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="case-3" className="text-xl font-bold text-slate-800">事例3: 自動リマインドで無断キャンセル80%削減（歯科クリニック）</h2>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">課題</h3>
        <p>月平均30件の無断キャンセルが発生。受付スタッフが前日に電話でリマインドしていたが、不在で繋がらないケースが半数以上。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">LINE活用の施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>予約日の前日18時にLINEで自動リマインドメッセージを配信</li>
          <li>メッセージ内に「変更・キャンセル」ボタンを設置し、気軽にリスケ可能に</li>
          <li>キャンセル発生時はキャンセル待ちの患者に自動通知</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">成果</h3>
        <p>無断キャンセルが月30件 → <strong>月6件</strong>に削減。キャンセル待ち通知で空き枠の稼働率も向上し、月間売上が約12%増加。</p>
      </section>

      <section>
        <h2 id="case-4" className="text-xl font-bold text-slate-800">事例4: オンライン決済+配送でオンライン診療を完結（オンラインクリニック）</h2>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">課題</h3>
        <p>オンライン診療後の決済を銀行振込で運用しており、未入金の催促や入金確認の手作業が負担。処方薬の配送管理も別システムで二重管理。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">LINE活用の施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>診察後にLINE上でクレジットカード決済リンクを送信</li>
          <li>決済完了 → 配送手配 → 追跡番号通知まで全自動フロー</li>
          <li>発送状況をLINEでリアルタイム通知（出荷・配達完了）</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">成果</h3>
        <p>決済完了率が<strong>65% → 95%</strong>に向上。未入金の催促業務がほぼゼロに。患者からも「LINEだけで全て完結するので便利」と好評。</p>
      </section>

      <section>
        <h2 id="case-5" className="text-xl font-bold text-slate-800">事例5: AI自動返信で夜間問い合わせに24時間対応（皮膚科クリニック）</h2>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">課題</h3>
        <p>LINEの問い合わせの40%が診療時間外に集中。翌営業日まで返信できず、他院に流れてしまう患者が多かった。</p>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">LINE活用の施策</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>AI自動返信で診療内容・予約方法・アクセス情報への問い合わせに即座に回答</li>
          <li>AIが対応しきれない質問はスタッフに自動エスカレーション</li>
          <li>スタッフの修正内容をAIが学習し、回答精度が継続的に向上</li>
        </ul>
        <h3 className="text-lg font-semibold text-slate-700 mt-4">成果</h3>
        <p>夜間問い合わせへの即時対応率が<strong>0% → 85%</strong>に。新患獲得数が月15%増加。スタッフの問い合わせ対応工数も30%削減。</p>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-slate-800">まとめ: クリニックのLINE活用を成功させるポイント</h2>
        <p>5つの事例に共通するのは、以下の3つのポイントです。</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li><strong>自動化を徹底する</strong> — 手作業をなくし、友だち追加から予約・決済・フォローまで自動フローを構築</li>
          <li><strong>パーソナライズする</strong> — 全員一斉配信ではなく、患者の状態に合わせたセグメント配信で反応率を最大化</li>
          <li><strong>クリニック専用ツールを使う</strong> — Lステップ等の汎用ツールではなく、医療業務フローに特化したツールで運用効率を最大化</li>
        </ol>
        <p className="mt-4">Lオペ for CLINICは、これら5つの事例で紹介した施策をすべて実現できるクリニック専用のLINE運用プラットフォームです。</p>
      </section>
    </ArticleLayout>
  );
}
