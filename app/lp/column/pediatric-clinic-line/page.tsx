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
const self = articles.find((a) => a.slug === "pediatric-clinic-line")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "予防接種スケジュールをLINEで自動リマインドして接種漏れを防止",
  "成長記録・発達チェックリストをLINEで保護者と共有",
  "感染症流行シーズンに合わせたセグメント配信で来院促進",
  "保護者向け育児情報の定期配信で信頼関係を構築",
];

const toc = [
  { id: "challenges", label: "小児科クリニックが抱える課題" },
  { id: "vaccination-remind", label: "予防接種リマインドの自動化" },
  { id: "growth-record", label: "成長記録の共有と発達フォロー" },
  { id: "infection-season", label: "感染症シーズンの配信戦略" },
  { id: "parenting-info", label: "保護者向け育児情報配信" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">小児科クリニックでは、予防接種のスケジュール管理や感染症シーズンの対応など、保護者への<strong>きめ細かいコミュニケーション</strong>が求められます。LINE公式アカウントを活用すれば、予防接種リマインド・成長記録の共有・育児情報の配信を自動化でき、<strong>保護者の安心感と来院率の向上</strong>を同時に実現できます。</p>

      {/* ── 課題 ── */}
      <section>
        <h2 id="challenges" className="text-xl font-bold text-gray-800">小児科クリニックが抱える課題</h2>
        <p>小児科クリニックには、他の診療科にはない固有の課題があります。子どもの診察は保護者を介して行うため、情報伝達が複雑になりやすく、予防接種のスケジュール管理は保護者の負担が大きい領域です。</p>

        <FlowSteps steps={[
          { title: "予防接種の接種漏れ", desc: "0歳〜6歳で20回以上の接種が必要。保護者がスケジュールを把握しきれず、接種漏れや遅れが発生しやすい。" },
          { title: "感染症シーズンの急増", desc: "インフルエンザ・RSウイルス・手足口病など、流行期には予約が殺到し、電話対応が追いつかなくなる。" },
          { title: "保護者への情報提供不足", desc: "発熱時の対応・ホームケアのアドバイスなど、保護者が求める情報を診察時間内では十分に伝えきれない。" },
        ]} />

        <StatGrid stats={[
          { value: "22", unit: "回", label: "6歳までの定期接種回数" },
          { value: "30", unit: "%", label: "接種スケジュール遅延率" },
          { value: "3", unit: "倍", label: "流行期の問い合わせ増加" },
          { value: "85", unit: "%", label: "保護者のLINE利用率" },
        ]} />
      </section>

      {/* ── 予防接種リマインド ── */}
      <section>
        <h2 id="vaccination-remind" className="text-xl font-bold text-gray-800">予防接種リマインドの自動化</h2>
        <p>LINE公式アカウントを活用すれば、子どもの生年月日に基づいて予防接種のリマインドを自動配信できます。保護者が「次はいつ何を打てばいいのか」を把握しやすくなり、接種漏れを防止できます。</p>

        <FlowSteps steps={[
          { title: "生年月日の登録", desc: "LINE友だち追加時にお子さまの生年月日を登録。問診フォームと連動して自動取得も可能。" },
          { title: "接種スケジュールの自動計算", desc: "月齢に応じた接種タイミングを自動算出。Hib・肺炎球菌・四種混合などの同時接種も考慮。" },
          { title: "接種2週間前にリマインド配信", desc: "「そろそろ○○ワクチンの時期です」とLINEでお知らせ。予約ボタン付きで即予約可能。" },
          { title: "接種後の経過観察フォロー", desc: "接種翌日に「お変わりありませんか？」とフォローメッセージを自動送信。副反応の確認も。" },
        ]} />

        <Callout type="info" title="同時接種の管理がポイント">
          小児の予防接種は同時接種が推奨されており、1回の来院で複数ワクチンを接種するケースが一般的です。LINE上でスケジュールを可視化することで、保護者が「次回は3本同時接種」と事前に把握でき、心理的な準備にもつながります。
        </Callout>

        <p>予約管理の自動化について詳しくは<Link href="/lp/column/clinic-line-case-studies" className="text-sky-600 underline hover:text-sky-800">クリニックのLINE活用事例5選</Link>もご覧ください。</p>
      </section>

      {/* ── 成長記録 ── */}
      <section>
        <h2 id="growth-record" className="text-xl font-bold text-gray-800">成長記録の共有と発達フォロー</h2>
        <p>乳幼児健診や定期検診で測定した身長・体重のデータをLINEで保護者に共有できます。成長曲線をグラフ化して配信すれば、保護者が子どもの発育状況を一目で把握でき、不安の軽減にもつながります。</p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span>健診後に身長・体重データをLINEで自動送信</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span>成長曲線グラフを定期的に配信（3か月ごとなど）</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span>発達チェックリストを月齢に応じて配信（首座り・寝返り・つかまり立ち等）</li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">4.</span>気になる点があれば、LINEから直接相談・予約が可能</li>
        </ul>

        <ResultCard
          before="紙の母子手帳のみで記録"
          after="LINEで成長記録を自動共有"
          metric="保護者の満足度が92%に向上"
          description="「子どもの成長が見える化されて安心」という保護者の声が多数"
        />
      </section>

      <InlineCTA />

      {/* ── 感染症シーズン ── */}
      <section>
        <h2 id="infection-season" className="text-xl font-bold text-gray-800">感染症シーズンの配信戦略</h2>
        <p>小児科は季節ごとの感染症流行に大きく影響を受けます。LINEのセグメント配信を活用すれば、流行状況に合わせたタイムリーな情報提供と予約促進が可能です。季節別の配信戦略については<Link href="/lp/column/clinic-seasonal-campaign" className="text-sky-600 underline hover:text-sky-800">季節別LINE配信戦略</Link>も参考にしてください。</p>

        <StatGrid stats={[
          { value: "9〜3", unit: "月", label: "インフルエンザ流行期" },
          { value: "6〜9", unit: "月", label: "RSウイルス流行期" },
          { value: "7〜9", unit: "月", label: "手足口病・ヘルパンギーナ" },
          { value: "通年", unit: "", label: "胃腸炎（冬季ピーク）" },
        ]} />

        <Callout type="success" title="流行期の配信で予防啓発と来院促進">
          <ul className="mt-1 space-y-1">
            <li>・インフルエンザ流行前に予防接種の案内を配信（9月〜10月）</li>
            <li>・RSウイルス流行期に乳児のいる家庭へ注意喚起を配信</li>
            <li>・感染性胃腸炎の流行時にホームケア情報を配信</li>
            <li>・学級閉鎖情報と連動した受診案内の配信</li>
          </ul>
        </Callout>
      </section>

      {/* ── 育児情報配信 ── */}
      <section>
        <h2 id="parenting-info" className="text-xl font-bold text-gray-800">保護者向け育児情報配信</h2>
        <p>月齢に応じた育児情報を定期配信することで、保護者との信頼関係を構築できます。「かかりつけ小児科」としてのポジションが強化され、他院への流出防止にもつながります。LINE自動化の具体的な方法は<Link href="/lp/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">LINE自動化完全ガイド</Link>で解説しています。</p>

        <FlowSteps steps={[
          { title: "0〜6か月: 授乳・睡眠のアドバイス", desc: "母乳/ミルクの量の目安、夜泣き対策、肌トラブルのケアなど、新生児期の保護者が不安に感じやすいテーマ。" },
          { title: "6〜12か月: 離乳食・発達の情報", desc: "離乳食の進め方、アレルギー対策、つかまり立ち・はいはい期の安全対策など。" },
          { title: "1〜3歳: イヤイヤ期・生活習慣", desc: "トイレトレーニング、歯磨き習慣、言葉の発達チェックなど、幼児期の発達段階に応じた情報。" },
          { title: "3〜6歳: 集団生活・入学準備", desc: "保育園・幼稚園での感染症対策、視力検査の重要性、小学校入学前の健康チェックなど。" },
        ]} />

        <ResultCard
          before="診察時の口頭説明のみ"
          after="月齢別育児情報をLINE定期配信"
          metric="友だちブロック率が5%以下に低下"
          description="有益な情報配信がブロック防止の最大の武器"
        />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="小児科クリニックのLINE活用ポイント">
          <ul className="mt-1 space-y-1">
            <li>・予防接種リマインドの自動化で接種漏れを大幅に削減</li>
            <li>・成長記録のLINE共有で保護者の安心感と信頼を醸成</li>
            <li>・感染症シーズンに合わせたタイムリーな情報配信で来院促進</li>
            <li>・月齢別の育児情報配信で「かかりつけ」としてのポジションを確立</li>
          </ul>
        </Callout>

        <p>小児科クリニックは、保護者とのコミュニケーションが経営の鍵を握ります。Lオペ for CLINICは、予防接種管理から育児情報配信まで、小児科特有のニーズに対応したLINE運用を実現します。他の診療科での活用事例は<Link href="/lp/column/clinic-line-case-studies" className="text-sky-600 underline hover:text-sky-800">LINE活用事例5選</Link>をご覧ください。</p>
      </section>
    </ArticleLayout>
  );
}
