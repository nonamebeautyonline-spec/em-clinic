import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import type { Article } from "../articles";
import ArticleLayout, {
  ResultCard,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  DonutChart,
  InlineCTA,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";

/* articles.ts への追加不要 — ローカル定義 */
const self: Article = {
  slug: "clinic-dx-before-after",
  title: "クリニックDX導入ビフォーアフター — 数値とスタッフの声で見る変化の全記録",
  description: "クリニックにDXを導入するとどれだけ変わるのか？Lオペ for CLINICを導入した3つのクリニックの導入前後の数値変化とスタッフの生の声を紹介。業務時間・患者満足度・売上の変化を具体的なデータで解説します。",
  date: "2026-03-23",
  category: "活用事例",
  readTime: "12分",
  tags: ["クリニックDX", "導入事例", "ビフォーアフター", "業務効率化", "LINE公式アカウント"],
};

/* articles 配列に未登録の場合のみ追加（一覧・関連記事表示用） */
if (!articles.find((a) => a.slug === self.slug)) {
  articles.push(self);
}

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
  "3つのクリニック（美容皮膚科・内科・歯科）のDX導入前後の具体的な数値変化",
  "業務時間・患者満足度・売上がどれだけ変わったかをデータで解説",
  "導入に成功した3院に共通するパターンと段階的な導入ステップ",
];

const toc = [
  { id: "case-beauty", label: "事例1: 美容皮膚科 — 月間売上270万円増" },
  { id: "case-internal", label: "事例2: 内科 — 1日の診察人数13人増" },
  { id: "case-dental", label: "事例3: 歯科 — 定期検診来院率26pt改善" },
  { id: "common-patterns", label: "3院に共通する成功パターン" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ── イントロ ── */}
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「クリニックDXって本当に効果あるの？」という疑問に、<strong>数値</strong>と<strong>スタッフの生の声</strong>でお答えします。本記事では、Lオペ for CLINICを導入した3つのクリニックの<strong>導入前後のビフォーアフター</strong>を徹底的に記録。業務時間・患者満足度・売上がどう変わったのか、具体的なデータとともに紹介します。
      </p>

      <p>
        クリニックのDX（デジタルトランスフォーメーション）は、もはや大規模病院だけの話ではありません。個人クリニックでも、LINE公式アカウントを中心としたデジタル化によって劇的な改善を実現しています。しかし、導入を検討する際に「実際にどれくらい変わるのか」という具体的なイメージが湧かないという声は少なくありません。
      </p>

      <p>
        そこで本記事では、規模も診療科も異なる3つのクリニックで実際に起きた変化を、導入前・導入後の比較で詳しく解説します。LINE活用の事例全体を知りたい方は<Link href="/lp/column/clinic-line-case-studies" className="text-emerald-700 underline">クリニックのLINE公式アカウント活用事例5選</Link>もあわせてご覧ください。
      </p>

      {/* ══════════════════════════════════════════════════════════════════
         事例1: 美容皮膚科
         ══════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 id="case-beauty" className="text-xl font-bold text-gray-800">事例1: 美容皮膚科A院 — 月間売上650万円から920万円へ</h2>

        <p>
          都内で開業5年目の美容皮膚科クリニック。院長1名、看護師3名、受付2名、カウンセラー1名の体制です。自費診療中心ながらも、新規患者の獲得とリピート率に課題を抱えていました。固定費削減の具体的な数値については<Link href="/lp/column/clinic-cost-reduction-30man" className="text-sky-600 underline hover:text-sky-800">固定費を月30万円削減する方法</Link>でも紹介しています。
        </p>

        <Callout type="warning" title="導入前の課題">
          <ul className="mt-1 space-y-1 list-disc pl-4">
            <li>予約電話が1日平均40件。受付スタッフは電話対応に追われ、来院中の患者対応がおろそかに</li>
            <li>紙の問診票の手書き転記に1患者あたり5分。記載漏れも頻発</li>
            <li>施術後のフォローアップは手動で、抜け漏れが常態化</li>
            <li>自費メニューの提案機会がなく、客単価が伸び悩み</li>
          </ul>
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">導入後に実施した施策</h3>

        <FlowSteps steps={[
          { title: "LINE予約への完全移行", desc: "電話予約からLINE予約に段階的に移行。友だち追加→メニュー選択→日時指定がLINE上で完結する仕組みを構築" },
          { title: "事前WEB問診の導入", desc: "予約確定後にLINEで問診フォームを自動送信。来院前に回答が完了し、受付での転記作業がゼロに" },
          { title: "自動フォローアップ配信", desc: "施術後3日・1週間・1ヶ月のタイミングで経過確認メッセージを自動配信。ダウンタイムケアの案内も含む" },
          { title: "セグメント配信で自費メニュー提案", desc: "施術履歴・年齢・肌悩みに応じたセグメント配信。たとえば「ヒアルロン酸注入後3ヶ月経過」の患者にリタッチの案内を自動送信" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">導入後の数値変化</h3>

        <ResultCard
          before="月間売上 650万円"
          after="月間売上 920万円"
          metric="月間売上が270万円（+41.5%）増加"
          description="自費率の向上とリピート率の改善が売上を押し上げ"
        />

        <StatGrid stats={[
          { value: "-85", unit: "%", label: "予約電話" },
          { value: "-80", unit: "%", label: "問診時間" },
          { value: "+15", unit: "pt", label: "自費率" },
          { value: "+22", unit: "pt", label: "リピート率" },
        ]} />

        <p>
          予約電話は1日40件から6件に激減。受付スタッフの電話対応時間は1日3時間からわずか25分に短縮されました。問診の事前完了により、来院後すぐにカウンセリングに入れるようになり、回転率も向上。セグメント配信による自費メニュー提案が奏功し、自費率は48%から63%に上昇しています。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">スタッフの声</h3>

        <Callout type="point" title="院長（50代・開業医）">
          以前は受付から「電話が鳴りっぱなしです」と報告を受けるたびにストレスを感じていました。Lオペ導入後は予約管理をほぼ見なくて済むようになり、診療に集中できるようになりました。自費率が上がったのは想定以上の成果です。
        </Callout>

        <Callout type="point" title="受付スタッフ（30代）">
          紙の問診票を転記する作業が本当に苦痛でした。字が読めない、記入漏れがある、確認のために患者さんを呼び戻す――そんなことがなくなっただけで気持ちが楽になりました。電話が減って、目の前の患者さんに丁寧に対応できるようになったのが一番嬉しいです。
        </Callout>

        <Callout type="point" title="カウンセラー（40代）">
          セグメント配信の効果に驚いています。以前はカウンセリング中に「こんなメニューもありますよ」と提案していたのですが、反応は薄かった。LINEで事前に情報を届けておくと、患者さんの方から「これ気になっていたんです」と話してくれるようになりました。提案のストレスがなくなり、成約率も上がっています。
        </Callout>

        <p>
          売上アップの詳細なメカニズムについては<Link href="/lp/column/clinic-line-revenue-growth" className="text-emerald-700 underline">LINE活用でクリニック売上を伸ばす方法</Link>で体系的に解説しています。
        </p>
      </section>

      <InlineCTA />

      {/* ══════════════════════════════════════════════════════════════════
         事例2: 内科クリニック
         ══════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 id="case-internal" className="text-xl font-bold text-gray-800">事例2: 内科クリニックB院 — 1日の診察人数が45人から58人へ</h2>

        <p>
          郊外のベッドタウンに位置する内科クリニック。院長1名、看護師2名、受付2名の体制で、生活習慣病の患者が多くを占めます。慢性的な待ち時間の長さが口コミ評価にも影響していました。
        </p>

        <Callout type="warning" title="導入前の課題">
          <ul className="mt-1 space-y-1 list-disc pl-4">
            <li>電話対応のために診療を中断することが1日10回以上。患者の待ち時間が平均38分に</li>
            <li>定期検診のリマインドはハガキで対応。コストが月5万円、到着確認不可</li>
            <li>待ち時間が長いことがGoogle口コミで低評価の原因に</li>
            <li>事務スタッフの残業が常態化（月平均20時間の時間外労働）</li>
          </ul>
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">導入後に実施した施策</h3>

        <FlowSteps steps={[
          { title: "LINE予約＋順番管理の導入", desc: "LINE上で予約と当日の順番確認が可能に。患者は自宅や車内で待機し、順番が近づくとLINE通知を受信" },
          { title: "定期検診リマインドの自動化", desc: "前回受診日から3ヶ月・6ヶ月のタイミングでLINEリマインドを自動送信。ワンタップで予約完了" },
          { title: "WEB問診による事前情報取得", desc: "来院前にLINEで問診を完了。主訴・既往歴・服薬情報が事前にカルテに反映" },
          { title: "検査結果のLINE通知", desc: "血液検査などの結果が出たらLINEで通知。結果確認のための再来院が不要に" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">導入後の数値変化</h3>

        <ResultCard
          before="1日の診察人数 45人"
          after="1日の診察人数 58人"
          metric="1日の診察人数が13人（+28.9%）増加"
          description="待ち時間短縮による回転率向上で実現"
        />

        <BarChart
          data={[
            { label: "電話対応", value: 180, color: "bg-gray-300" },
            { label: "電話対応(後)", value: 30, color: "bg-sky-500" },
            { label: "問診受付", value: 120, color: "bg-gray-300" },
            { label: "問診受付(後)", value: 15, color: "bg-sky-500" },
            { label: "リマインド", value: 60, color: "bg-gray-300" },
            { label: "リマインド(後)", value: 0, color: "bg-emerald-500" },
          ]}
          unit="分/日"
        />

        <StatGrid stats={[
          { value: "-18", unit: "分", label: "待ち時間" },
          { value: "+28", unit: "pt", label: "患者満足度" },
          { value: "+180", unit: "万円", label: "月間売上増" },
        ]} />

        <p>
          待ち時間は平均38分から20分に短縮。Google口コミの評価は3.2から4.1に改善しました。電話対応の中断がなくなったことで診療のリズムが安定し、1日あたりの診察可能人数が大幅に増加。定期検診リマインドの自動化により、ハガキ代月5万円のコスト削減と検診受診率の向上を同時に達成しています。
        </p>

        <p>
          スタッフの残業時間は月平均20時間から4時間に削減。LINE予約・WEB問診・自動リマインドの導入によって、受付業務の多くが自動化されたことが最大の要因です。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">スタッフの声</h3>

        <Callout type="point" title="院長（40代・開業医）">
          電話が鳴るたびに診察を中断していたのが、振り返ると本当に非効率でした。今はLINEの通知を確認するだけで予約状況がわかる。患者さんとの対話に集中できるようになり、診療の質も上がった実感があります。
        </Callout>

        <Callout type="point" title="受付スタッフ（20代）">
          前は「まだ呼ばれませんか？」と聞かれるのが怖くて、受付に立つのが憂鬱でした。今は患者さんがLINEで順番を確認できるので、そういったクレームがほぼゼロに。仕事が楽しくなりました。
        </Callout>

        <Callout type="point" title="看護師（30代）">
          事前問診のおかげで、患者さんが来院された時点で主訴が把握できている。バイタル測定の段階で先生に伝えるべき情報が整理されているので、診察の流れがスムーズになりました。
        </Callout>

        <p>
          クリニック日常業務のDX変革について詳しく知りたい方は<Link href="/lp/column/clinic-dx-daily-transformation" className="text-emerald-700 underline">クリニックDXで日常業務はこう変わる</Link>もご覧ください。
        </p>
      </section>

      <InlineCTA />

      {/* ══════════════════════════════════════════════════════════════════
         事例3: 歯科クリニック
         ══════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 id="case-dental" className="text-xl font-bold text-gray-800">事例3: 歯科クリニックC院 — 定期検診来院率38%から64%へ</h2>

        <p>
          住宅街に位置する歯科クリニック。院長1名、歯科衛生士3名、受付1名。定期検診の離脱率の高さが経営の安定性を損なう最大の課題でした。
        </p>

        <Callout type="warning" title="導入前の課題">
          <ul className="mt-1 space-y-1 list-disc pl-4">
            <li>定期検診（3ヶ月ごと）の来院率がわずか38%。治療終了後に患者との接点が切れてしまう</li>
            <li>無断キャンセルが月平均25件。空き枠が埋まらず機会損失に</li>
            <li>電話でリマインドしても不在が多く、効率が悪い</li>
            <li>紹介キャンペーンの告知手段がなく、新患の獲得ルートが限定的</li>
          </ul>
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">導入後に実施した施策</h3>

        <FlowSteps steps={[
          { title: "定期検診リマインドの自動配信", desc: "前回の検診日から2ヶ月半経過時点でLINEリマインドを自動送信。「前回の検診から3ヶ月が近づいています」と具体的な経過日数を記載" },
          { title: "LINE予約への移行", desc: "電話予約からLINE予約に段階的に移行。24時間いつでも予約可能にすることで、仕事帰りや休日の予約ハードルを低減" },
          { title: "前日リマインド＋簡単リスケ", desc: "予約前日にLINEで自動リマインド。都合が悪くなった場合はLINE上でワンタップで日程変更が可能" },
          { title: "紹介キャンペーンの配信", desc: "定期検診の受診者に「ご家族・お友達紹介キャンペーン」のメッセージを自動配信。紹介経由の新患を開拓" },
        ]} />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">導入後の数値変化</h3>

        <ResultCard
          before="定期検診来院率 38%"
          after="定期検診来院率 64%"
          metric="定期検診来院率が26ポイント改善"
          description="リマインド自動化とLINE予約の利便性が寄与"
        />

        <DonutChart percentage={64} label="定期検診来院率 64%達成" sublabel="導入前38%から26ポイント改善" />

        <StatGrid stats={[
          { value: "-72", unit: "%", label: "無断キャンセル" },
          { value: "+26", unit: "pt", label: "定期検診来院率" },
          { value: "+360", unit: "万円", label: "年間売上増" },
        ]} />

        <p>
          無断キャンセルは月25件から7件に減少（72%削減）。前日リマインドに「日程変更」ボタンを付けたことで、「行けないけど電話するのが面倒」という理由での無断キャンセルが大幅に減りました。定期検診来院率の改善は安定的な売上に直結し、年間で約360万円の増収を実現しています。
        </p>

        <p>
          紹介キャンペーンの配信効果もあり、紹介経由の新患は月平均3名から8名に増加。Lオペのセグメント配信機能を活用し、直近の来院者のみに配信することで、高い反応率を維持しています。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">スタッフの声</h3>

        <Callout type="point" title="院長（40代・開業医）">
          歯科は定期検診のリピートが経営の生命線です。以前はハガキを出してもほとんど反応がなく、受付スタッフに「電話でリマインドして」と頼んでいましたが、不在ばかりで徒労感がありました。LINEリマインドに切り替えてから来院率が明らかに上がり、経営の見通しが立てやすくなりました。
        </Callout>

        <Callout type="point" title="歯科衛生士（30代）">
          定期検診が途切れてしまった患者さんが戻ってきてくれるようになりました。中には「LINEで通知が来たから思い出しました」と言ってくださる方も。予防歯科を広げたいという想いがあったので、Lオペのリマインド機能にはとても助けられています。
        </Callout>

        <Callout type="point" title="受付スタッフ（20代）">
          電話でのリマインドは正直つらかったです。何度かけても出ない方もいますし、「今忙しい」と言われることも。LINE配信に変わってからはその負担がゼロに。無断キャンセルが減ったことで、当日のスケジュール調整も楽になりました。
        </Callout>
      </section>

      <InlineCTA />

      {/* ══════════════════════════════════════════════════════════════════
         共通パターン
         ══════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 id="common-patterns" className="text-xl font-bold text-gray-800">3院に共通する成功パターン</h2>

        <p>
          診療科も規模も異なる3つのクリニックですが、DX導入に成功した背景には明確な共通パターンがあります。ここでは、3院の取り組みを横断的に分析して見えてきた成功の法則を整理します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3院の導入効果を比較</h3>

        <BarChart
          data={[
            { label: "美容皮膚科(売上)", value: 41, color: "bg-sky-500" },
            { label: "内科(売上)", value: 22, color: "bg-emerald-500" },
            { label: "歯科(年間売上)", value: 18, color: "bg-violet-500" },
            { label: "美容(リピート)", value: 22, color: "bg-sky-400" },
            { label: "内科(満足度)", value: 28, color: "bg-emerald-400" },
            { label: "歯科(検診率)", value: 26, color: "bg-violet-400" },
          ]}
          unit="pt改善"
        />

        <ComparisonTable
          headers={["項目", "美容皮膚科", "内科", "歯科"]}
          rows={[
            ["月間売上変化", "+270万円", "+180万円", "+30万円/月"],
            ["最大削減業務", "予約電話-85%", "待ち時間-18分", "無断キャンセル-72%"],
            ["患者体験の向上", "自費率+15pt", "満足度+28pt", "検診率+26pt"],
            ["スタッフ負担", "転記作業ゼロ", "残業-80%", "電話リマインドゼロ"],
          ]}
        />

        <Callout type="success" title="成功する3つの共通点">
          <ol className="mt-2 space-y-3 list-decimal pl-4">
            <li>
              <strong>段階的に導入する</strong> — いきなり全業務をデジタル化するのではなく、最もインパクトが大きい1つの業務（予約 or リマインド）から着手。成功体験を積み上げてから範囲を広げる
            </li>
            <li>
              <strong>スタッフ教育に投資する</strong> — ツールを導入しても使いこなせなければ意味がない。3院とも導入初月にLオペの操作研修を実施し、全スタッフが基本操作を習得してからスタートしている
            </li>
            <li>
              <strong>データを活用して改善を続ける</strong> — 導入して終わりではなく、配信の開封率・予約率・再来院率をLオペのダッシュボードで定期的に確認。データに基づいて配信内容やタイミングを継続的に最適化
            </li>
          </ol>
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">成功パターンの導入ステップ</h3>

        <p>
          3院の取り組みから抽出した、DX導入を成功させるための5ステップです。
        </p>

        <FlowSteps steps={[
          { title: "現状の業務フローを可視化", desc: "予約・問診・フォローアップ・リマインドなど、各業務にどれだけの時間とコストがかかっているかを棚卸し。改善インパクトの大きい業務を特定する" },
          { title: "最もインパクトの大きい業務から着手", desc: "3院とも初手は「予約」か「リマインド」。患者接点が多く、自動化の効果が出やすい業務を選定" },
          { title: "スタッフ研修と運用ルールの整備", desc: "Lオペの基本操作研修を全スタッフに実施。「誰が・いつ・何を確認するか」の運用ルールを明文化" },
          { title: "1ヶ月間のテスト運用と数値測定", desc: "本格導入前に1ヶ月間のトライアルを実施。導入前と比較して数値がどう変化したかを測定" },
          { title: "データに基づく改善と範囲拡大", desc: "テスト結果をもとに配信内容やタイミングを最適化。成果が確認できたら対象業務を順次拡大" },
        ]} />

        <p>
          DX導入のステップについてより詳しく知りたい方は<Link href="/lp/column/lope-complete-introduction" className="text-emerald-700 underline">Lオペ完全導入ガイド</Link>をご覧ください。全機能を活用した包括的な導入方法を解説しています。
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
         まとめ
         ══════════════════════════════════════════════════════════════════ */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: DX導入はクリニックの「当たり前」を変える</h2>

        <p>
          3つのクリニックのビフォーアフターを通じて見えてきたのは、DX導入の効果が単なる「業務効率化」にとどまらないということです。
        </p>

        <Callout type="info" title="DX導入がもたらす3つの変化">
          <ol className="mt-2 space-y-2 list-decimal pl-4">
            <li><strong>業務効率の向上</strong> — 電話対応・紙問診・手動リマインドなど、時間を食っていた業務が自動化される</li>
            <li><strong>患者体験の改善</strong> — 待ち時間短縮・24時間予約・適切なフォローアップにより、患者満足度が向上する</li>
            <li><strong>売上の増加</strong> — 効率化で生まれた時間をカウンセリングや自費提案に充てることで、客単価とリピート率が改善する</li>
          </ol>
        </Callout>

        <p>
          重要なのは、これらの変化は大規模なシステム投資なしに実現できるという点です。Lオペ for CLINICは、LINE公式アカウントを基盤にしたクリニック専用プラットフォームであり、患者が日常的に使っているLINEをそのまま活用します。新しいアプリのインストールは不要で、患者側の導入ハードルはほぼゼロです。
        </p>

        <p>
          本記事で紹介した3院のように、まずは最もインパクトの大きい1つの業務からスタートし、段階的に範囲を広げていくアプローチが成功の鍵です。DX導入の全体設計図は<Link href="/lp/column/clinic-dx-complete-guide" className="text-sky-600 underline hover:text-sky-800">クリニックDX完全ガイド</Link>でも体系的にまとめています。Lオペでは導入前の業務診断から運用定着までを一貫してサポートしています。
        </p>

        <InlineCTA />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">関連記事</h3>
        <ul className="space-y-2 text-[14px]">
          <li>
            <Link href="/lp/column/clinic-line-case-studies" className="text-emerald-700 underline hover:text-emerald-900">クリニックのLINE公式アカウント活用事例5選</Link> — LINE活用の事例を幅広く紹介
          </li>
          <li>
            <Link href="/lp/column/clinic-line-revenue-growth" className="text-emerald-700 underline hover:text-emerald-900">LINE活用でクリニック売上を伸ばす方法</Link> — 売上アップのメカニズムを体系的に解説
          </li>
          <li>
            <Link href="/lp/column/clinic-dx-daily-transformation" className="text-emerald-700 underline hover:text-emerald-900">クリニックDXで日常業務はこう変わる</Link> — 日々の業務がどう変化するかを具体的に紹介
          </li>
          <li>
            <Link href="/lp/column/lope-complete-introduction" className="text-emerald-700 underline hover:text-emerald-900">Lオペ完全導入ガイド</Link> — 導入から運用定着までのステップを網羅
          </li>
          <li>
            <Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談・資料請求</Link> — まずはお気軽にご相談ください
          </li>
        </ul>
      </section>
    </ArticleLayout>
  );
}
