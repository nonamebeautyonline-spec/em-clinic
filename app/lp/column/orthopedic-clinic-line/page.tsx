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
const self = articles.find((a) => a.slug === "orthopedic-clinic-line")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "整形外科のLINE活用でLINE導入の効果はどのくらいですか？", a: "導入クリニックの実績では、予約リマインドによる無断キャンセル60〜80%削減、セグメント配信によるリピート率20〜30%向上、AI自動返信による電話対応70%削減など、多面的な効果が報告されています。" },
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
  "リハビリ予約の自動管理で通院継続率を向上",
  "通院リマインドで中断・脱落を防止",
  "自宅運動指導の動画・画像をLINEで配信",
  "術後フォローアップの自動化で患者満足度を向上",
];

const toc = [
  { id: "challenges", label: "整形外科クリニックの課題" },
  { id: "rehab-booking", label: "リハビリ予約の自動管理" },
  { id: "remind-dropout", label: "通院リマインドで中断防止" },
  { id: "exercise-video", label: "自宅運動指導の動画配信" },
  { id: "post-surgery", label: "術後フォローアップの自動化" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">整形外科クリニックでは、リハビリの長期通院管理や術後フォローなど、<strong>継続的な患者フォロー</strong>が経営の要です。LINE公式アカウントを活用すれば、リハビリ予約の自動管理・通院リマインド・自宅運動指導の配信を一元化でき、<strong>通院継続率の向上と業務効率化</strong>を同時に実現できます。</p>

      {/* ── 課題 ── */}
      <section>
        <h2 id="challenges" className="text-xl font-bold text-gray-800">整形外科クリニックの課題</h2>
        <p>整形外科は他の診療科と比べてリハビリテーションの通院回数が多く、患者1人あたりの来院頻度が高い診療科です。一方で、長期通院が必要なために途中離脱が発生しやすいという課題を抱えています。</p>

        <StatGrid stats={[
          { value: "40", unit: "%", label: "リハビリ中断率（3か月以内）" },
          { value: "15", unit: "回", label: "平均リハビリ通院回数" },
          { value: "25", unit: "%", label: "予約無断キャンセル率" },
          { value: "60", unit: "分/日", label: "電話予約対応時間" },
        ]} />

        <FlowSteps steps={[
          { title: "リハビリの長期通院管理", desc: "週2〜3回のリハビリが数か月続く患者が多く、予約管理の負荷が大きい。電話予約では変更・キャンセルの対応に追われる。" },
          { title: "通院中断・脱落の多さ", desc: "痛みが軽減すると自己判断で通院を中断する患者が多い。機能回復が不十分なまま中断すると再発リスクが高まる。" },
          { title: "自宅リハビリの指導不足", desc: "自宅での運動療法を口頭やプリントで説明するが、正しいフォームが伝わりにくく、実施率が低い。" },
        ]} />
      </section>

      {/* ── リハビリ予約 ── */}
      <section>
        <h2 id="rehab-booking" className="text-xl font-bold text-gray-800">リハビリ予約の自動管理</h2>
        <p>LINEでリハビリの予約・変更・キャンセルを24時間受け付けることで、電話対応の負荷を大幅に削減できます。予約の無断キャンセル対策については<Link href="/lp/column/line-reservation-no-show" className="text-sky-600 underline hover:text-sky-800">LINE予約管理で無断キャンセルを削減する方法</Link>も参考にしてください。</p>

        <FlowSteps steps={[
          { title: "LINEリッチメニューから予約", desc: "患者がLINEのリッチメニューから空き枠を確認し、リハビリ予約を完了。担当理学療法士の指名予約も可能。" },
          { title: "定期予約の一括登録", desc: "「毎週月・水の14時」など、定期的な通院パターンを一括登録。患者は毎回予約する手間が不要。" },
          { title: "変更・キャンセルもLINEで完結", desc: "LINEからワンタップで予約変更・キャンセル。空いた枠はキャンセル待ちの患者へ自動通知。" },
          { title: "次回予約のリマインド配信", desc: "予約日前日にLINEでリマインド。「持ち物」「服装」の案内も合わせて配信。" },
        ]} />

        <ResultCard
          before="電話予約（1日60分の対応時間）"
          after="LINE予約で自動受付"
          metric="電話対応時間を80%削減"
          description="スタッフは受付業務から解放され、患者対応に集中"
        />
      </section>

      {/* ── 通院リマインド ── */}
      <section>
        <h2 id="remind-dropout" className="text-xl font-bold text-gray-800">通院リマインドで中断防止</h2>
        <p>リハビリの通院中断を防ぐには、適切なタイミングでのリマインドが効果的です。LINEなら開封率80%以上の高いリーチ力で、患者に確実にメッセージを届けられます。患者離脱防止の詳しい戦略は<Link href="/lp/column/clinic-patient-retention" className="text-sky-600 underline hover:text-sky-800">患者離脱防止の方法</Link>で解説しています。</p>

        <Callout type="info" title="中断リスクが高い3つのタイミング">
          <ul className="mt-1 space-y-1">
            <li>・通院開始2週間後: 初期の痛みが和らぎ「もう大丈夫」と自己判断しやすい</li>
            <li>・1か月後: 仕事や日常生活との両立が難しくなり、通院頻度が落ちる</li>
            <li>・3か月後: 回復を実感しにくくなり、モチベーションが低下する</li>
          </ul>
        </Callout>

        <StatGrid stats={[
          { value: "80", unit: "%", label: "LINEリマインド開封率" },
          { value: "35", unit: "%", label: "通院中断率の改善幅" },
          { value: "2.5", unit: "倍", label: "リハビリ完了率の向上" },
          { value: "15", unit: "%", label: "再発による再来院の減少" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── 運動指導動画 ── */}
      <section>
        <h2 id="exercise-video" className="text-xl font-bold text-gray-800">自宅運動指導の動画配信</h2>
        <p>整形外科のリハビリでは、自宅での運動療法が治療効果を大きく左右します。LINEを活用すれば、症状・部位別の運動指導動画を患者に直接配信でき、正しいフォームでの実施を促進できます。</p>

        <FlowSteps steps={[
          { title: "症状別の運動動画ライブラリ作成", desc: "腰痛・膝痛・肩関節周囲炎など、症状別に3〜5分の運動指導動画を作成。理学療法士が実演する形式が効果的。" },
          { title: "リハビリ進行に合わせた段階配信", desc: "初期・中期・後期で運動内容を変え、回復段階に合わせた動画を自動配信。無理な運動による悪化を防止。" },
          { title: "実施記録のフィードバック", desc: "「今日の運動はできましたか？」とLINEで確認。患者の実施状況を把握し、次回来院時のリハビリ計画に反映。" },
        ]} />

        <ResultCard
          before="紙のプリント配布（実施率30%）"
          after="LINE動画配信（実施率75%）"
          metric="自宅運動の実施率が2.5倍に向上"
          description="動画で正しいフォームが伝わり、運動への不安も軽減"
        />
      </section>

      {/* ── 術後フォロー ── */}
      <section>
        <h2 id="post-surgery" className="text-xl font-bold text-gray-800">術後フォローアップの自動化</h2>
        <p>手術を行う整形外科クリニックでは、術後の経過観察とリハビリ指導が重要です。LINEで術後フォローを自動化すれば、患者の不安を軽減しつつ、異常の早期発見にもつながります。自動配信の設定方法は<Link href="/lp/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">LINE自動化完全ガイド</Link>を参照してください。</p>

        <FlowSteps steps={[
          { title: "術後1日目: 経過確認メッセージ", desc: "「痛みや腫れは想定内です。○○の場合はご連絡ください」と安心メッセージを配信。" },
          { title: "術後1週間: 抜糸・消毒リマインド", desc: "抜糸・消毒の来院予約リマインドと、注意事項（入浴・運動制限）の再確認。" },
          { title: "術後2週間〜: リハビリ開始案内", desc: "リハビリ開始のタイミングを案内。初回リハビリの予約ボタン付きメッセージを配信。" },
          { title: "術後3か月: 回復状況チェック", desc: "回復状況のアンケートをLINEで配信。必要に応じて追加のリハビリや検査を提案。" },
        ]} />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="整形外科クリニックのLINE活用ポイント">
          <ul className="mt-1 space-y-1">
            <li>・リハビリ予約の自動管理で電話対応時間を80%削減</li>
            <li>・通院リマインドで中断率を35%改善し、治療効果を最大化</li>
            <li>・自宅運動指導の動画配信で実施率を30%から75%に向上</li>
            <li>・術後フォローの自動化で患者の不安を軽減し、信頼関係を強化</li>
          </ul>
        </Callout>

        <p>整形外科クリニックにとって、リハビリの通院継続は売上と治療効果の両面で重要です。Lオペ for CLINICは、リハビリ予約管理から術後フォローまで、整形外科特有のニーズに対応したLINE運用を実現します。まずは<Link href="/lp/column/line-reservation-no-show" className="text-sky-600 underline hover:text-sky-800">予約管理の改善</Link>から始めてみてはいかがでしょうか。</p>
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
