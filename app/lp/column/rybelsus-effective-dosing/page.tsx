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
const self = articles.find((a) => a.slug === "rybelsus-effective-dosing")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "リベルサスが効かない？はオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "基本の服用ルール: 空腹時・120ml以下の水・服用後30分は飲食禁止",
  "薬物動態データでは絶食10時間＋食事2時間後でCmax・AUCが約2倍に上昇",
  "糖質の摂りすぎが効果を打ち消す — 低糖質への部分置換が減量効果を高める",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「リベルサスを飲んでいるのに全然痩せない...」そんな声、実はかなり多いんです。でも安心してください。<strong>飲み方をちょっと変えるだけで、薬の吸収量が2倍近く変わる</strong>ことがデータで証明されています。この記事では、絶食時間・水の量・食事のタイミングという3つの「コツ」を、薬物動態データをもとにわかりやすくお伝えします。
      </p>

      {/* ── セクション1: 基本の服用ルール ── */}
      <section>
        <h2 id="basic-rules" className="text-xl font-bold text-gray-800">まずはここから。リベルサスの「絶対守るべき4ステップ」</h2>

        <p>リベルサスの有効成分セマグルチドは、SNAC（サルカプロザートナトリウム）という特殊な吸収促進剤の力を借りて胃から吸収されます。この仕組みがとてもデリケートなので、<strong>飲み方のルールが他の薬より厳格</strong>です。</p>

        <p>まずは添付文書に書かれている基本の4ステップを押さえましょう。</p>

        <FlowSteps steps={[
          { title: "起床（空腹状態）", desc: "前夜の食事から少なくとも6時間以上の絶食状態で服用を開始する" },
          { title: "120ml以下の水で服用", desc: "コップ半分程度の水で錠剤を飲み込む。多量の水は薬の吸収を妨げる" },
          { title: "30分以上待つ", desc: "服用後30分間は飲食・他の薬の服用を控える" },
          { title: "朝食・他の薬を摂取", desc: "30分経過後に通常どおり朝食を取り、他の常用薬も服用する" },
        ]} />

        <p>ここまでは「最低限のルール」です。ここが盲点なのですが、実はこのルールの範囲内で、<strong>もっと吸収効率を上げる方法</strong>があるんです。次のセクションから具体的に見ていきましょう。</p>
      </section>

      {/* ── セクション2: 薬物動態のキホン ── */}
      <section>
        <h2 id="pharmacokinetics" className="text-xl font-bold text-gray-800">Cmax？ AUC？ 難しそうだけど、要するにこういうこと</h2>

        <p>薬物動態（PK）と聞くと難しそうですが、リベルサスの効果を理解するために知っておきたい数値はたった3つです。</p>

        <StatGrid stats={[
          { value: "Cmax", unit: "", label: "最高血中濃度 — 血中の薬物濃度が到達するピーク値" },
          { value: "AUC", unit: "", label: "血中濃度-時間曲線下面積 — 薬の総曝露量の指標" },
          { value: "tmax", unit: "", label: "最高血中濃度到達時間 — ピークに達するまでの時間" },
        ]} />

        <p>ざっくり言うと、<strong>Cmaxは「薬がどれだけ濃く届くか」、AUCは「薬がトータルでどれだけ体に効くか」</strong>です。どちらも数値が高いほど、薬がしっかり吸収されている証拠。</p>

        <p>驚くかもしれませんが、飲み方を変えるだけで<strong>これらの数値が2倍近く変わる</strong>ことがメーカーのデータで示されています。具体的に見ていきましょう。</p>
      </section>

      {/* ── セクション3: 絶食時間の影響 ── */}
      <section>
        <h2 id="fasting-duration" className="text-xl font-bold text-gray-800">夕食の時間がリベルサスの効き目を左右する</h2>

        <p>実は、リベルサスの吸収量に一番大きく影響するのが「前の晩、何時にご飯を食べたか」なんです。</p>

        <p>メーカーの薬物動態データで、<strong>絶食6時間後の服用</strong>と<strong>絶食10時間後の服用</strong>を比較した結果がこちらです。</p>

        <BarChart
          data={[
            { label: "絶食10時間 — Cmax", value: 100, color: "#2563eb" },
            { label: "絶食6時間 — Cmax", value: 52, color: "#93c5fd" },
            { label: "絶食10時間 — AUC", value: 100, color: "#7c3aed" },
            { label: "絶食6時間 — AUC", value: 56, color: "#c4b5fd" },
          ]}
          unit="%（絶食10時間を100とした相対値）"
        />

        <p>見てください。<strong>絶食6時間だと、10時間の場合の約半分しか吸収されていません。</strong>同じ薬を飲んでいるのに、前の晩の食事が遅いだけで効果が半減してしまうんです。</p>

        <Callout type="point" title="「寝ている時間」が味方になる">
          夜の睡眠時間は自然な絶食タイムです。たとえば<strong>夕食を21時までに済ませて、翌朝7時に服用</strong>すれば、それだけで10時間クリア。遅い夕食や夜食の習慣がある方は、ここを見直すだけでリベルサスの効きが大きく変わる可能性があります。
        </Callout>
      </section>

      {/* ── セクション4: 飲水量の影響 ── */}
      <section>
        <h2 id="water-volume" className="text-xl font-bold text-gray-800">「たっぷりの水で飲む」はリベルサスではNG</h2>

        <p>薬はたくさんの水で飲むほうがいい。そう思っていませんか？ リベルサスに限っては、<strong>その常識が逆効果</strong>です。</p>

        <StatGrid stats={[
          { value: "50ml", unit: "", label: "少量の水 — 120mlと有意差なし" },
          { value: "120ml", unit: "", label: "推奨量 — 添付文書の基準" },
          { value: "240ml", unit: "", label: "多量の水 — Cmax・AUCが有意に低下" },
        ]} />

        <p>50mlと120mlでは吸収に差がありませんでした。しかし<strong>240ml（コップ1杯強）で飲んだ群では、吸収量が明らかに下がった</strong>のです。水が多すぎると、胃の中でSNACの働きが薄まってしまうためと考えられています。</p>

        <Callout type="warning" title="コップ半分の水。これだけ覚えてください">
          リベルサスを飲むときの水は<strong>120ml以下（コップ半分程度）</strong>が鉄則です。お茶やコーヒーもNGです。「少なめの水でサッと飲む」を習慣にしてください。
        </Callout>
      </section>

      {/* ── セクション5: 食事タイミングの影響 ── */}
      <section>
        <h2 id="meal-timing" className="text-xl font-bold text-gray-800">服用後の朝ごはん、30分待てばOK...ではもったいない</h2>

        <p>添付文書には「服用後30分は飲食禁止」と書かれています。多くの方がきっちり30分後に朝食を食べていると思いますが、実はここにも改善の余地があります。</p>

        <ComparisonTable
          headers={["条件", "Cmax", "AUC"]}
          rows={[
            ["服用後30分で食事", "基準値（1.0倍）", "基準値（1.0倍）"],
            ["服用後120分で食事", "約1.5〜2倍に上昇", "約1.5〜2倍に上昇"],
          ]}
        />

        <p><strong>30分後に食べた場合と比べて、120分後に食べた場合はCmax・AUCが1.5〜2倍に上昇。</strong>食べ物が胃に入ると、SNACによる吸収プロセスが中断されてしまうんです。30分はあくまで「最低ライン」であって、「ベスト」ではありません。</p>

        <p>とはいえ、朝食を2時間も遅らせるのは現実的じゃない...と思いますよね。大丈夫です。次のセクションで、<strong>無理なく実現できるスケジュール</strong>をご紹介します。</p>
      </section>

      <InlineCTA />

      {/* ── セクション6: 理想のルーティン ── */}
      <section>
        <h2 id="optimal-method" className="text-xl font-bold text-gray-800">「夕食20時、服用6時、朝食8時」が最強ルーティン</h2>

        <p>ここまでの3つのコツを組み合わせると、リベルサスの吸収を最大化する条件が見えてきます。</p>

        <Callout type="point" title="吸収効率を高める3つのポイント">
          <ul className="space-y-1 mt-1">
            <li><strong>1. 夕食は20時までに済ませる</strong> — 翌朝6時の服用で絶食10時間を自然に確保</li>
            <li><strong>2. コップ半分（120ml以下）の水でサッと飲む</strong> — 水が多いと吸収が落ちる</li>
            <li><strong>3. 朝食は服用から2時間後に</strong> — 身支度や通勤の時間を「待機時間」に充てる</li>
          </ul>
        </Callout>

        <p>具体的には、<strong>夕食を20時に済ませて、翌朝6時に起きてすぐ服用、朝食は8時</strong>。このスケジュールなら絶食10時間と食事待機120分を両方クリアできます。起きてから朝食までの2時間は、シャワー・着替え・通勤などで自然と過ぎていきます。</p>

        <Callout type="warning" title="いきなり全部やらなくてOKです">
          吸収効率を上げると、その分<strong>副作用（吐き気・嘔吐・下痢など）が出やすくなる可能性</strong>もあります。特に3mg→7mg、7mg→14mgの増量時期は、まず基本ルールの遵守を優先してください。体調が安定してきたら、絶食時間を少しずつ延ばす、食事待機を少しずつ伸ばす...と<strong>段階的にステップアップ</strong>していくのが安全です。
        </Callout>
      </section>

      {/* ── セクション7: 食事内容の見直し ── */}
      <section>
        <h2 id="diet-adjustment" className="text-xl font-bold text-gray-800">飲み方は完璧なのに痩せない？ 犯人は「食事の中身」かも</h2>

        <p>服用ルールをバッチリ守っているのに体重が減らない。そんなときに見直してほしいのが、<strong>毎日の食事の中身</strong>です。</p>

        <p>リベルサスには食欲を抑える作用がありますが、糖質たっぷりの食事を続けていると、せっかくの血糖コントロール効果が帳消しになってしまいます。とはいえ、糖質を全部カットする必要はありません。<strong>「多すぎる糖質をタンパク質に置き換える」</strong>だけで十分です。</p>

        <ComparisonTable
          headers={["避けるべき食品", "おすすめの代替"]}
          rows={[
            ["白米の大盛り・おかわり", "白米を茶碗1杯に抑え、おかずを増やす"],
            ["菓子パン・甘いパン", "ゆで卵、チーズ、サラダチキン"],
            ["うどん・ラーメン（単品）", "肉・魚メインの定食、味噌汁を追加"],
            ["おにぎり・サンドイッチ（間食）", "焼き鳥、フランクフルト、さけるチーズ"],
            ["ケーキ・菓子類", "ナッツ、高カカオチョコ、プロテインバー"],
            ["清涼飲料水・フルーツジュース", "水、お茶、無糖炭酸水"],
          ]}
        />

        <p>コツは<strong>「糖質を減らす」のではなく「タンパク質を増やす」</strong>と考えること。肉・魚・卵・チーズ・大豆製品は血糖値の急上昇を抑えながら満腹感も維持してくれるので、リベルサスの食欲抑制効果との相乗効果が期待できます。コンビニで買えるサラダチキンやゆで卵を間食にするだけでも、かなり変わりますよ。</p>

        <Callout type="warning" title="「糖質ゼロ」は絶対にやめてください">
          極端な糖質制限はリベルサスとの併用で<strong>低血糖（めまい・冷や汗・動悸・意識障害）</strong>を引き起こすリスクがあります。主食を完全にゼロにする食事法は危険です。あくまで「多すぎる分を減らして、タンパク質に置き換える」を原則にしてください。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション8: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ：「飲み方」と「食べ方」の両方を変えれば、リベルサスはもっと効く</h2>

        <p>リベルサスは画期的な経口GLP-1薬ですが、<strong>体に吸収されるのはわずか約1%</strong>。だからこそ、飲み方の細かな違いが効果を大きく左右します。</p>

        <p>「効かない」と感じたら、まずこの3つをチェックしてみてください。</p>

        <ul className="space-y-1 text-gray-700">
          <li><strong>絶食時間</strong>: 前の晩の食事から10時間以上空いているか？</li>
          <li><strong>水の量</strong>: コップ半分（120ml以下）で飲んでいるか？</li>
          <li><strong>朝食のタイミング</strong>: 服用から30分以上（できれば120分）空けているか？</li>
        </ul>

        <p>それでもダメなら、<strong>食事の中身を見直してタンパク質の比率を上げる</strong>。この「飲み方×食べ方」の両輪を揃えることで、リベルサスの効果を最大限に引き出せます。</p>

        <Callout type="point" title="迷ったら、まず主治医に相談を">
          この記事の内容はリベルサスの一般的な薬物動態データに基づいた情報提供です。服用方法の変更や食事内容の見直しは、必ず処方医に相談してから始めてください。効果が十分でない場合は、用量の調整（7mg→14mg）や注射薬（オゼンピック・マンジャロ）への切り替えも選択肢になります。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">関連記事</h3>
        <ul className="space-y-1 text-gray-700">
          <li>
            <Link href="/lp/column/glp1-medication-guide" className="text-sky-600 underline hover:text-sky-800">GLP-1受容体作動薬ガイド</Link> — リベルサス・オゼンピック・マンジャロの基礎知識
          </li>
          <li>
            <Link href="/lp/column/glp1-diet-safety-evidence" className="text-sky-600 underline hover:text-sky-800">GLP-1ダイエットの安全性エビデンス</Link> — 副作用リスクと安全管理の要点
          </li>
          <li>
            <Link href="/lp/column/rybelsus-side-effects-guide" className="text-sky-600 underline hover:text-sky-800">リベルサスの副作用と対処法</Link> — 吐き気・下痢への具体的な対応策
          </li>
        </ul>
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
