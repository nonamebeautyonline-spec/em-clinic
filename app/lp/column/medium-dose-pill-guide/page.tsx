import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  StatGrid,
  FlowSteps,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "medium-dose-pill-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "中用量ピルの処方ガイドはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
  { q: "副作用が出た場合はどうすればいいですか？", a: "軽度の副作用であれば経過観察で改善することが多いですが、症状が強い場合は速やかに処方医に相談してください。LINEでの個別相談に対応しているクリニックであれば、気軽に症状を報告できます。" },
  { q: "オンラインクリニックでの処方薬の配送はどうなりますか？", a: "多くのオンラインクリニックでは決済後、最短翌日〜数日で発送されます。温度管理が必要な薬剤はクール便での配送に対応しているクリニックを選びましょう。Lオペ for CLINICでは配送管理・追跡番号の自動配信機能も搭載しています。" },
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
  "中用量ピルはエストロゲン50μg以上 — 月経移動の第一選択薬",
  "プラノバールが代表格。短期使用が原則で長期連用は推奨されない",
  "低用量ピルより副作用（吐き気・血栓リスク）が出やすい点に注意",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「月経をずらしたいんだけど、どの薬を使うの？」——旅行やイベントを控えた患者さんから、こんな相談を受けたことはありませんか？ そんなとき頼りになるのが<strong>中用量ピル</strong>です。この記事では、中用量ピルの基本から月経移動の具体的な方法、副作用への対処、低用量ピルとの使い分けまで、<strong>処方に必要な実践知識</strong>をまとめました。
      </p>

      {/* ── セクション1: 中用量ピルとは ── */}
      <section>
        <h2 id="what-is-medium-dose-pill" className="text-xl font-bold text-gray-800">そもそも「中用量ピル」って何が違うの？</h2>

        <p>ピルを分類するとき、ポイントになるのは<strong>含まれるエストロゲン（エチニルエストラジオール）の量</strong>です。低用量ピルが30〜35μgなのに対し、中用量ピルは<strong>50μg以上</strong>。この差が効果と副作用の両方に影響してきます。</p>

        <p>日本で最もよく使われる中用量ピルは<strong>プラノバール（ノルゲストレル＋エチニルエストラジオール）</strong>。1錠中にエチニルエストラジオールを50μg含む配合錠です。低用量ピルが「毎日飲んで避妊や月経コントロールを行う」薬なのに対し、中用量ピルは<strong>「短期間集中的に使って、ピンポイントで月経をコントロールする」</strong>のが基本的な立ち位置です。</p>

        <StatGrid stats={[
          { value: "50", unit: "μg以上", label: "中用量ピルのエストロゲン含有量" },
          { value: "30-35", unit: "μg", label: "低用量ピルのエストロゲン含有量" },
          { value: "1-2", unit: "週間", label: "中用量ピルの一般的な使用期間" },
        ]} />

        <p>「エストロゲンが多いなら効果も強いんでしょ？」——その通りです。ただし、エストロゲンが多いということは<strong>副作用も出やすい</strong>ということ。だからこそ短期使用が原則であり、処方時には患者さんへの丁寧な説明が欠かせません。</p>
      </section>

      {/* ── セクション2: 主な適応 ── */}
      <section>
        <h2 id="indications" className="text-xl font-bold text-gray-800">どんなときに使う？ 中用量ピルの3つの出番</h2>

        <p>中用量ピルの適応は大きく3つあります。なかでも<strong>圧倒的に多いのが月経移動</strong>です。</p>

        <p><strong>1つ目は月経移動。</strong>旅行、結婚式、試験、スポーツの大会——「この日だけは月経を避けたい」という患者さんのニーズに応えます。低用量ピルでも月経移動は可能ですが、中用量ピルの方が<strong>確実性が高い</strong>とされ、短期処方で完結する点も使いやすいポイントです。</p>

        <p><strong>2つ目は機能性子宮出血の止血。</strong>ホルモンバランスの乱れによる不正出血をコントロールする目的で処方されることがあります。エストロゲン量が多い分、<strong>子宮内膜を安定させる力が強い</strong>ため、出血を止める効果が期待できます。</p>

        <p><strong>3つ目は月経困難症（低用量で効果不十分な場合）。</strong>低用量ピルやLEPで痛みがコントロールしきれないケースで、一時的に中用量ピルが選択肢に入ることがあります。ただし長期使用は推奨されず、あくまで<strong>つなぎの位置づけ</strong>です。</p>

        <Callout type="info" title="月経移動の相談、増えていませんか？">
          近年、オンライン診療の普及とともに月経移動の相談件数は増加傾向にあります。「来月の旅行に間に合うように」といった相談は、LINEでの事前問診と組み合わせることで<strong>スムーズな処方フロー</strong>を実現できます。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション3: 月経移動の方法 ── */}
      <section>
        <h2 id="menstrual-shift-method" className="text-xl font-bold text-gray-800">月経を「遅らせる」「早める」——具体的な服用スケジュール</h2>

        <p>月経移動には<strong>「遅らせる方法」と「早める方法」</strong>の2パターンがあります。どちらを選ぶかは、イベントまでの日数と患者さんの希望で決まります。</p>

        <h3 className="text-lg font-bold text-gray-700 mt-6">パターンA: 月経を遅らせる（最も一般的）</h3>
        <p>イベント直前に月経が来る予定の場合に使います。確実性が高く、最もよく選ばれる方法です。</p>

        <FlowSteps steps={[
          { title: "予定月経の5日前から服用開始", desc: "月経が来る前にプラノバールを1日1錠、就寝前に服用し始める。" },
          { title: "月経を避けたい期間中は毎日継続", desc: "旅行やイベントが終わるまで服用を続ける。最大10〜14日程度が目安。" },
          { title: "服用を中止する", desc: "イベント終了後にプラノバールの服用をやめる。" },
          { title: "中止後2〜3日で月経が来る", desc: "消退出血として月経が始まる。出血量や期間は通常の月経とほぼ同じ。" },
        ]} />

        <h3 className="text-lg font-bold text-gray-700 mt-6">パターンB: 月経を早める</h3>
        <p>イベントまで十分な日数がある場合に使える方法です。イベント当日に薬を飲まなくて済むのがメリットです。</p>

        <FlowSteps steps={[
          { title: "前周期の月経5日目から服用開始", desc: "月経が始まって5日目からプラノバールを1日1錠、10日間服用する。" },
          { title: "10日間服用したら中止", desc: "決められた期間を飲み切ったら服用をやめる。" },
          { title: "中止後2〜3日で月経が来る", desc: "通常より早いタイミングで消退出血が起こる。" },
          { title: "次の月経はイベント後に", desc: "早めた分だけ次の月経周期がずれるので、イベント期間を避けられる。" },
        ]} />

        <Callout type="point" title="「遅らせる」と「早める」、どっちを勧める？">
          多くの場合、<strong>「遅らせる」方が確実性が高い</strong>ため第一選択になります。ただしイベント期間中に薬を飲み続ける必要があり、副作用（特に吐き気）が出た場合にイベントを楽しめなくなるリスクも。余裕がある場合は「早める」方法も選択肢に入れて、患者さんと相談して決めるのがベストです。
        </Callout>
      </section>

      {/* ── セクション4: 副作用 ── */}
      <section>
        <h2 id="side-effects" className="text-xl font-bold text-gray-800">覚えておきたい副作用——低用量ピルより出やすい理由</h2>

        <p>中用量ピルはエストロゲン含有量が低用量ピルの約1.5〜1.7倍。この差が副作用の出やすさに直結します。</p>

        <p>最も多いのが<strong>吐き気（悪心）</strong>です。服用者の20〜30%程度に出るとされ、特に飲み始めの数日間に強く出る傾向があります。就寝前の服用を推奨するのはこのためで、寝ている間に吐き気のピークをやり過ごす作戦です。</p>

        <p>次に注意したいのが<strong>血栓症リスク</strong>。エストロゲンには血液を固まりやすくする作用があり、用量が多いほどそのリスクは高まります。低用量ピルでも血栓リスクはありますが、中用量ピルでは<strong>さらに注意が必要</strong>です。喫煙者、35歳以上、肥満（BMI 30以上）、片頭痛（前兆あり）の方には処方を避けるべきです。</p>

        <p>そのほか、<strong>頭痛・むくみ・乳房の張り・不正出血</strong>なども報告されています。いずれもエストロゲンの影響で、短期使用であれば服用中止とともに改善するケースがほとんどです。</p>

        <StatGrid stats={[
          { value: "20-30", unit: "%", label: "吐き気の発現頻度" },
          { value: "就寝前", unit: "", label: "推奨される服用タイミング" },
          { value: "2-3", unit: "日", label: "中止後の月経開始までの日数" },
        ]} />
      </section>

      <InlineCTA />

      {/* ── セクション5: 低用量ピルとの使い分け ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">中用量 vs 低用量——結局どっちをいつ使う？</h2>

        <p>「低用量ピルでも月経移動できるのに、なぜ中用量を使うの？」と疑問に思う方もいるかもしれません。それぞれの特徴を並べてみましょう。</p>

        <ComparisonTable
          headers={["項目", "中用量ピル（プラノバール等）", "低用量ピル（マーベロン等）"]}
          rows={[
            ["エストロゲン量", "50μg以上", "30〜35μg"],
            ["主な用途", "月経移動・止血（短期）", "避妊・月経困難症（長期）"],
            ["月経移動の確実性", "高い", "やや劣る場合あり"],
            ["副作用の頻度", "多い（吐き気20-30%）", "比較的少ない"],
            ["血栓リスク", "やや高い", "低い（ただしゼロではない）"],
            ["長期使用", "非推奨", "可能（定期検査のうえ）"],
            ["処方期間の目安", "1〜2週間", "数か月〜数年"],
          ]}
        />

        <p>ざっくり言うと、<strong>「ピンポイントで短期勝負」が中用量ピル、「じっくり長期管理」が低用量ピル</strong>です。すでに低用量ピルを服用中の患者さんが月経移動を希望する場合は、実薬の延長やシート調整で対応できることも多いので、必ずしも中用量ピルに切り替える必要はありません。長期管理で副作用をさらに抑えたい場合は<Link href="/lp/column/ultra-low-dose-pill-guide" className="text-sky-600 underline hover:text-sky-800">超低用量ピル（LEP製剤）</Link>も選択肢に入ります。</p>
      </section>

      {/* ── セクション6: 処方のポイント ── */}
      <section>
        <h2 id="prescription-tips" className="text-xl font-bold text-gray-800">処方時に押さえておきたい5つのチェックポイント</h2>

        <p>中用量ピルの処方は決して難しくありませんが、いくつかの確認事項を忘れると患者さんの満足度が大きく下がります。以下の5点は必ずチェックしましょう。</p>

        <p><strong>1. 血栓リスク因子のスクリーニング。</strong>喫煙の有無、年齢、BMI、片頭痛の既往、血栓症の家族歴。これらを問診で確認してから処方に進むのが鉄則です。</p>

        <p><strong>2. 制吐剤の併用を検討する。</strong>吐き気が高頻度で出る薬なので、<strong>あらかじめ制吐剤（ドンペリドン等）を一緒に処方</strong>しておくと患者さんの安心感が違います。「吐き気が出たら飲んでください」と伝えるだけでもドロップアウト率が下がります。</p>

        <p><strong>3. 服用開始のタイミングを明確にする。</strong>「月経5日前から」と言われてもピンとこない患者さんは多いので、<strong>具体的な日付を伝える</strong>のがベスト。カレンダーに書いてもらう、LINEでリマインドするなどの工夫が有効です。</p>

        <p><strong>4. 服用中止後の出血について説明する。</strong>「飲むのをやめたら2〜3日で月経が来ますよ」と事前に伝えておくだけで、患者さんの不安はかなり軽減されます。</p>

        <p><strong>5. 短期使用が原則であることを強調する。</strong>「残った薬を次回も使おう」と自己判断する方がいるので、<strong>必ず毎回受診して処方を受ける</strong>よう伝えてください。</p>

        <Callout type="point" title="オンライン診療との相性は抜群">
          月経移動の相談は、対面でなくても完結できるケースがほとんどです。LINEでの事前問診で血栓リスク因子を確認し、オンライン診療で処方、薬の配送——この流れを仕組み化すれば、<strong>患者さんの利便性と処方の安全性を両立</strong>できます。処方後のリマインドや副作用フォローもLINEなら手軽に行えます。婦人科のオンライン診療全般については<Link href="/lp/column/gynecology-online-clinic-guide" className="text-sky-600 underline hover:text-sky-800">婦人科オンライン診療ガイド</Link>も参考にしてください。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ——中用量ピルは「短期集中の頼れる味方」</h2>

        <p>中用量ピルは、月経移動という<strong>患者さんのQOLに直結するニーズ</strong>に応えるための重要なツールです。低用量ピルと比べてエストロゲン量が多い分、副作用には注意が必要ですが、短期使用であればリスクは限定的。血栓リスクのスクリーニングと制吐剤の併用さえ押さえておけば、安心して処方できます。</p>

        <p>大切なのは、<strong>「遅らせる」「早める」の2パターンを患者さんの状況に合わせて選ぶこと</strong>、そして服用スケジュールを具体的な日付で伝えること。これだけで月経移動の成功率と患者満足度は大きく変わります。</p>

        <Callout type="point" title="関連記事もあわせてどうぞ">
          低用量ピルの種類と選び方については<Link href="/lp/column/pill-types-comparison" className="text-emerald-700 underline">「低用量ピルの種類と選び方ガイド」</Link>、初めてピルを飲む患者さん向けの説明資料としては<Link href="/lp/column/low-dose-pill-beginners-guide" className="text-emerald-700 underline">「低用量ピルの飲み方完全ガイド」</Link>をご覧ください。
        </Callout>
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
