import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  BarChart,
  StatGrid,
  FlowSteps,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "wegovy-obesity-treatment-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "ウゴービはBMI 35以上、またはBMI 27以上+2つ以上の肥満関連健康障害が処方条件",
  "STEP 1試験で-14.9%の体重減少を達成 — プラセボとの差は歴然",
  "SELECT試験で主要心血管イベント（MACE）を20%低減 — 肥満症薬初の心血管保護効果",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「ウゴービって聞いたことあるけど、普通のGLP-1ダイエットと何が違うの？」——2024年2月、日本で初めて<strong>保険が使える肥満症治療薬</strong>としてウゴービが登場しました。ただし処方のハードルはかなり高い。この記事では、処方条件・用量スケジュール・臨床エビデンス・費用・オゼンピックとの違いまで、<strong>ウゴービのすべてをわかりやすく</strong>解説します。
      </p>

      {/* ── セクション1: ウゴービとは ── */}
      <section>
        <h2 id="what-is-wegovy" className="text-xl font-bold text-gray-800">ウゴービとは？ — オゼンピックと「同じ成分、違う薬」</h2>

        <p>ウゴービの有効成分は<strong>セマグルチド</strong>。糖尿病治療薬のオゼンピックとまったく同じ成分です。「じゃあ同じ薬では？」と思うかもしれませんが、決定的な違いがあります。<strong>用量が2.4mgと、オゼンピックの最大用量1.0mgの2倍以上</strong>に設定されているんです。</p>

        <p>セマグルチドはGLP-1受容体作動薬の一種で、食欲を抑え、満腹感を持続させる作用があります。オゼンピックは血糖コントロールが主目的ですが、ウゴービは<strong>「体重を減らすこと」そのものが治療目標</strong>。だから必要な用量も多い。週1回の皮下注射で投与します。</p>

        <StatGrid stats={[
          { value: "2.4", unit: "mg", label: "ウゴービの維持用量（週1回）" },
          { value: "1.0", unit: "mg", label: "オゼンピックの最大用量（週1回）" },
          { value: "2024年2月", unit: "", label: "日本での薬価収載" },
        ]} />

        <p>そしてここが最大のポイント——ウゴービは<strong>日本初の保険適用GLP-1肥満症治療薬</strong>です。これまで肥満症の薬は「マジンドール（サノレックス）」くらいしか保険が使えませんでした。GLP-1受容体作動薬を肥満症に使いたければ自費で月3〜5万円。それが保険適用になったことで、条件を満たせば3割負担で使えるようになったのです。</p>
      </section>

      {/* ── セクション2: 処方条件 ── */}
      <section>
        <h2 id="prescription-requirements" className="text-xl font-bold text-gray-800">処方条件はかなり厳しい — 「痩せたいから」では使えません</h2>

        <p>ここが一番重要なところ。ウゴービは保険適用ですが、<strong>誰でも処方してもらえるわけではありません</strong>。最適使用推進ガイドラインに基づく厳格な条件をすべて満たす必要があります。</p>

        <ComparisonTable
          headers={["条件", "詳細"]}
          rows={[
            ["BMI基準", "BMI 35以上（高度肥満症）、またはBMI 27以上で2つ以上の肥満関連健康障害（2型糖尿病、脂質異常症、高血圧等）"],
            ["事前治療", "3ヶ月以上の食事療法・運動療法を実施しても効果不十分"],
            ["施設要件", "肥満症診療の要件を満たす保険医療機関（日本肥満学会認定の肥満症専門病院等）"],
            ["処方医要件", "肥満症治療に十分な知識・経験を有する医師"],
            ["投与判断", "最適使用推進ガイドラインに基づく投与開始・継続の判断"],
          ]}
        />

        <Callout type="info" title="「BMI 27以上 + 2つ以上の健康障害」とは？">
          肥満関連の健康障害には、<strong>2型糖尿病・脂質異常症・高血圧・高尿酸血症・冠動脈疾患・脳梗塞・脂肪肝・月経異常・睡眠時無呼吸症候群</strong>などが含まれます。「ちょっと太っている」レベルではなく、肥満が原因で明確に健康を害しているケースが対象です。自費のGLP-1ダイエットとはまったく別の位置づけだと理解してください。
        </Callout>
      </section>

      {/* ── セクション3: 用量漸増スケジュール ── */}
      <section>
        <h2 id="dose-escalation" className="text-xl font-bold text-gray-800">いきなり2.4mgではない — 17週かけてゆっくり増やす</h2>

        <p>ウゴービは最初から2.4mgを打つわけではありません。<strong>消化器症状を最小限に抑えるため、4週間ごとに段階的に増量</strong>していきます。維持用量に到達するまで約4ヶ月。この漸増がとても重要です。</p>

        <FlowSteps steps={[
          { title: "0〜4週目: 0.25mg/週1回", desc: "最低用量からスタート。体を慣らす期間。吐き気が出やすいが軽度で済むことが多い。" },
          { title: "5〜8週目: 0.5mg/週1回", desc: "倍量に増加。消化器症状が落ち着いてきたら次のステップへ。" },
          { title: "9〜12週目: 1.0mg/週1回", desc: "オゼンピックの最大用量と同じ。ここで体重減少を実感し始める方が多い。" },
          { title: "13〜16週目: 1.7mg/週1回", desc: "オゼンピックにはない高用量域。食欲抑制効果がさらに強まる。" },
          { title: "17週目以降: 2.4mg/週1回（維持用量）", desc: "最終用量。ここから本格的な維持期に入る。継続が体重管理の鍵。" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── セクション4: 臨床エビデンス ── */}
      <section>
        <h2 id="step-trials" className="text-xl font-bold text-gray-800">STEP試験シリーズ — 数字で見るウゴービの実力</h2>

        <p>ウゴービの効果を支えるのが、<strong>STEP（Semaglutide Treatment Effect in People with Obesity）試験シリーズ</strong>です。数万人規模の大規模臨床試験で、一貫して高い体重減少効果が確認されています。</p>

        <BarChart
          data={[
            { label: "STEP 1（非糖尿病）", value: 14.9, color: "bg-emerald-500" },
            { label: "STEP 2（2型糖尿病）", value: 9.6, color: "bg-emerald-400" },
            { label: "STEP 3（行動療法併用）", value: 16.0, color: "bg-emerald-600" },
            { label: "STEP 5（2年間維持）", value: 15.2, color: "bg-emerald-500" },
          ]}
          unit="%減"
        />

        <p>特に注目すべきは<strong>STEP 1</strong>。BMI 30以上の糖尿病のない肥満の方を対象に、68週間投与した結果、<strong>体重が平均14.9%減少</strong>（プラセボはわずか2.4%）。体重80kgの人なら約12kgの減少に相当します。さらにSTEP 5では<strong>2年間の長期投与でも15.2%の減少が維持</strong>されており、効果の持続性も確認されています。</p>

        <p>STEP 2の2型糖尿病がある方で減少率がやや低い（-9.6%）のは、糖尿病治療薬との併用や血糖コントロールの影響。それでもプラセボの-3.4%を大きく上回る結果です。</p>
      </section>

      {/* ── セクション5: SELECT試験 ── */}
      <section>
        <h2 id="select-trial" className="text-xl font-bold text-gray-800">SELECT試験 — 「痩せるだけじゃない」心臓も守るという衝撃</h2>

        <p>2023年に発表されたSELECT試験は、ウゴービの評価を根底から変えました。<strong>17,604人</strong>の過体重・肥満の心血管疾患既往者を対象にした大規模試験で、セマグルチド2.4mgが主要心血管イベント（MACE：心血管死・非致死性心筋梗塞・非致死性脳卒中の複合）を<strong>20%低減</strong>させたのです。</p>

        <StatGrid stats={[
          { value: "17,604", unit: "人", label: "SELECT試験の被験者数" },
          { value: "20", unit: "%", label: "MACE（主要心血管イベント）の低減" },
          { value: "初", unit: "", label: "肥満症薬で心血管保護効果を実証" },
        ]} />

        <p>これは肥満症治療薬として<strong>史上初めて心血管保護効果を示したデータ</strong>です。「体重を減らすだけの薬」ではなく「心臓を守る薬」でもある——この結果は、肥満症治療の概念そのものを変えるインパクトがありました。</p>
      </section>

      {/* ── セクション6: 費用 ── */}
      <section>
        <h2 id="cost" className="text-xl font-bold text-gray-800">気になるお値段 — 保険3割負担で月いくら？</h2>

        <p>ウゴービ皮下注2.4mgSD 1キットの薬価は<strong>約11,000円</strong>。週1回投与なので月4〜5回分。3割負担なら<strong>維持期で月約1.3万円</strong>程度の自己負担です。</p>

        <p>漸増期は用量が低いため薬価も安く、最初の1ヶ月は自己負担がさらに少なくなります。また、所得に応じて<strong>高額療養費制度</strong>の対象にもなるため、他の治療費と合算して負担上限に達すれば還付が受けられます。</p>

        <Callout type="point" title="自費のGLP-1ダイエットとの費用比較">
          自費でセマグルチド（オゼンピック等）を肥満目的に処方する場合、月3〜5万円が相場です。保険適用のウゴービなら<strong>月約1.3万円</strong>。ただし前述のとおり処方条件は非常に厳格で、「自費の代わりに保険で」とはいきません。条件を満たさない方は、引き続き自費処方が選択肢になります。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション7: オゼンピック・リベルサスとの違い ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">ウゴービ vs オゼンピック vs リベルサス — 何がどう違う？</h2>

        <p>同じセマグルチドでも、3つの薬は<strong>適応・用量・投与方法・保険適用の意味</strong>がまったく異なります。混同している患者さんも多いので、ここで整理しましょう。</p>

        <ComparisonTable
          headers={["", "ウゴービ", "オゼンピック", "リベルサス"]}
          rows={[
            ["適応症", "肥満症", "2型糖尿病", "2型糖尿病"],
            ["保険適用", "あり（厳格な条件）", "あり（糖尿病診断）", "あり（糖尿病診断）"],
            ["用量", "最大2.4mg", "0.25〜1.0mg", "3・7・14mg"],
            ["投与方法", "週1回 皮下注射", "週1回 皮下注射", "毎日 内服"],
            ["主な目的", "体重減少", "血糖コントロール", "血糖コントロール"],
          ]}
        />

        <p>よく誤解されるのが、「オゼンピックを肥満で保険処方してもらえないか」という質問。答えは<strong>NO</strong>です。オゼンピックの保険適用はあくまで2型糖尿病。肥満症で保険が使えるのはウゴービだけです。一方、自費クリニックではオゼンピックやリベルサスをダイエット目的で処方するケースがありますが、これは<strong>適応外使用</strong>であり保険は効きません。各薬剤の詳細な比較は<Link href="/lp/column/glp1-medication-comparison" className="text-sky-600 underline hover:text-sky-800">GLP-1薬剤比較ガイド</Link>をご覧ください。</p>
      </section>

      {/* ── セクション8: 副作用 ── */}
      <section>
        <h2 id="side-effects" className="text-xl font-bold text-gray-800">副作用は「消化器症状」が圧倒的に多い</h2>

        <p>ウゴービの副作用で最も多いのは<strong>消化器症状</strong>。STEP試験のデータをまとめると、吐き気が約40%、下痢が約30%、便秘が約25%の頻度で報告されています。</p>

        <BarChart
          data={[
            { label: "吐き気", value: 40, color: "bg-amber-400" },
            { label: "下痢", value: 30, color: "bg-amber-300" },
            { label: "便秘", value: 25, color: "bg-amber-300" },
            { label: "嘔吐", value: 20, color: "bg-amber-200" },
            { label: "腹痛", value: 15, color: "bg-amber-200" },
          ]}
          unit="%"
        />

        <p>「40%って多くない？」と感じるかもしれませんが、ほとんどは<strong>投与初期や増量時に出現し、体が慣れるにつれて軽減</strong>します。だからこそ4週間ごとの漸増スケジュールが重要なんです。重篤な副作用としては<strong>膵炎（まれ）</strong>と<strong>胆嚢関連障害</strong>が報告されていますが、頻度は低く、定期的な経過観察で対応します。</p>
      </section>

      {/* ── セクション9: 注意点・リバウンド ── */}
      <section>
        <h2 id="rebound-and-caution" className="text-xl font-bold text-gray-800">最大の課題は「やめたあと」 — リバウンドにどう向き合うか</h2>

        <p>ウゴービの最大の課題は<strong>投与中止後のリバウンド</strong>です。STEP 1の延長試験では、投与を中止して1年後に<strong>減った体重の約2/3が戻った</strong>というデータがあります。つまり15kg痩せても、やめたら10kgは戻る可能性がある。</p>

        <Callout type="info" title="ウゴービは「痩せ薬」ではなく「肥満症治療薬」">
          ここが患者さんへの説明で最も重要なポイント。ウゴービは<strong>高血圧の薬と同じように、飲み続けて（打ち続けて）コントロールする薬</strong>です。血圧の薬をやめたら血圧が上がるのと同じで、ウゴービをやめたら体重が戻るのは「副作用」ではなく「当然の結果」。だからこそ、投与中に<strong>食事・運動療法の習慣を確立</strong>し、中止後も維持できる生活基盤を作ることが不可欠です。
        </Callout>

        <p>また、ウゴービはあくまで<strong>食事・運動療法との併用</strong>が前提。薬だけで痩せようとする姿勢では、保険適用の継続判断にも影響します。処方医による定期的な評価で、投与継続の可否が判断される点も覚えておきましょう。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — ウゴービは「本当に必要な人」のための画期的な薬</h2>

        <p>ウゴービは、肥満症治療の歴史を変える画期的な薬です。STEP試験で最大16%の体重減少、SELECT試験で心血管イベント20%低減。これだけのエビデンスを持つ保険適用の肥満症治療薬は日本初であり、<strong>肥満で本当に健康を害している患者さんにとって大きな希望</strong>です。</p>

        <p>ただし、処方条件の厳格さは忘れてはいけません。BMI基準、事前治療、施設要件、処方医要件——すべてをクリアして初めて使える薬です。「楽して痩せる薬」ではなく、<strong>「医学的に肥満症と診断された方が、食事・運動療法と併用して使う治療薬」</strong>。この位置づけを正しく理解することが、ウゴービの恩恵を最大限に受ける第一歩です。</p>

        <Callout type="point" title="関連記事もあわせてどうぞ">
          GLP-1受容体作動薬の<strong>基本的な仕組み</strong>については<Link href="/lp/column/glp1-medication-guide" className="text-emerald-700 underline">「GLP-1受容体作動薬とは」</Link>、<strong>安全性エビデンス</strong>については<Link href="/lp/column/glp1-diet-safety-evidence" className="text-emerald-700 underline">「GLP-1ダイエットは危険？」</Link>、肥満症治療の<strong>最新動向</strong>については<Link href="/lp/column/obesity-treatment-trends-2026" className="text-emerald-700 underline">「肥満症治療の最新動向」</Link>をご覧ください。また、同じGIP/GLP-1デュアル作動薬の肥満症適応である<strong>ゼップバウンド</strong>については<Link href="/lp/column/zepbound-obesity-treatment-guide" className="text-emerald-700 underline">ゼップバウンド完全ガイド</Link>で詳しく解説しています。
        </Callout>
      </section>
    </ArticleLayout>
  );
}
