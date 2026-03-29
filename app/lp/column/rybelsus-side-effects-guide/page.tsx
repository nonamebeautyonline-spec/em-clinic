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
const self = articles.find((a) => a.slug === "rybelsus-side-effects-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "リベルサスの副作用と対処法はオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "セマグルチドの最も多い副作用は消化器症状（吐き気・嘔吐・下痢・便秘）",
  "吐き気の主因は胃運動抑制による消化管内圧上昇 — 通常1〜3日で消失",
  "休薬・食事調整・水分管理で対処可能 — 改善しない場合は必ず医師に相談",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「リベルサスを飲み始めたら気持ち悪い……これって大丈夫？」そんな不安を抱えてこの記事にたどり着いた方も多いはずです。<strong>結論からいうと、吐き気は最も多い副作用ですが、ほとんどの場合1〜3日で治まります。</strong>この記事では、吐き気が起きる理由から具体的な対処法、「こうなったら病院へ」のラインまで、現役医師の視点でわかりやすく解説します。
      </p>

      {/* ── セクション1: 「副作用で痩せてる」は本当？ ── */}
      <section>
        <h2 id="side-effect-definition" className="text-xl font-bold text-gray-800">「副作用で痩せてる」は本当？ まずは誤解を解こう</h2>

        <p>SNSで「リベルサスの副作用で痩せた」という投稿を見かけたことはありませんか？ 実はこれ、<strong>医学的には正確ではありません。</strong></p>

        <p>リベルサス（セマグルチド）はGLP-1受容体作動薬という種類のお薬です。もともとは血糖値を下げる糖尿病治療薬ですが、<strong>食欲を抑える作用</strong>と<strong>胃の動きをゆっくりにする作用</strong>も持っています。ダイエット目的で処方される場合、体重が減るのはまさにこの「狙いどおりの効果」なんです。</p>

        <Callout type="info" title="体重減少は「副作用」ではなく「本来の効果」">
          副作用とは「薬の目的以外で起きる、望ましくない反応」のこと。メディカルダイエットでリベルサスを使う場合、体重減少は<strong>治療として意図された効果</strong>です。一方、吐き気や胃のムカムカは「意図していない有害な反応」、つまり正真正銘の副作用。この違いを知っておくだけで、だいぶ気持ちが楽になりますよ。
        </Callout>

        <p>つまり、<strong>痩せること自体は薬が正しく効いている証拠。</strong>問題は「吐き気」や「胃の不快感」のほうです。ここからは、なぜ吐き気が起きるのか、どうすれば楽になるのかを順番にお話しします。</p>
      </section>

      {/* ── セクション2: なぜ吐き気が起きる？ ── */}
      <section>
        <h2 id="mechanism" className="text-xl font-bold text-gray-800">そもそもなぜ気持ち悪くなるの？ 胃の中で起きていること</h2>

        <p>「薬を飲んだだけでなんで吐き気が？」と思いますよね。実はメカニズムはとてもシンプルです。</p>

        <p>セマグルチドは胃の蠕動運動（食べ物を腸へ送り出す動き）をゆっくりにします。すると食べ物が胃の中に長く留まり、<strong>胃の内圧が上がって「ムカムカ」や「膨満感」</strong>として感じるわけです。</p>

        <FlowSteps steps={[
          { title: "セマグルチド服用", desc: "GLP-1受容体が刺激される" },
          { title: "胃の動きがスロー化", desc: "蠕動運動が抑えられる" },
          { title: "食べ物が胃に滞留", desc: "胃の中の圧力がアップ" },
          { title: "吐き気・膨満感", desc: "ムカムカとして自覚" },
        ]} />

        <p><strong>特に吐き気が出やすいタイミングは3つあります。</strong></p>

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>飲み始めの数日間</strong> — 身体がまだ薬に慣れていないため、消化管への影響が最も大きい</li>
          <li><strong>増量直後</strong> — 3mg→7mg、7mg→14mgに上げたタイミングで血中濃度がグッと上がる</li>
          <li><strong>中断して再開したとき</strong> — せっかく身体が慣れていたのに、耐性がリセットされてしまう</li>
        </ul>

        <p>だからこそリベルサスは<strong>4週間以上の間隔をあけて段階的に増量する</strong>ルールになっています。「早く効果を出したい」と自己判断で一気に量を増やすのは、吐き気を悪化させる原因になるのでやめましょう。</p>
      </section>

      {/* ── セクション3: 副作用の全リスト ── */}
      <section>
        <h2 id="frequency" className="text-xl font-bold text-gray-800">どんな副作用がどれくらい出る？ 頻度つき一覧表</h2>

        <p>「吐き気以外にも副作用ってあるの？」心配になりますよね。リベルサスの添付文書と臨床試験データから、主な副作用を頻度つきでまとめました。<strong>見てのとおり、圧倒的に多いのは消化器系の症状</strong>で、その大半は軽度〜中等度です。</p>

        <ComparisonTable
          headers={["副作用", "頻度", "備考"]}
          rows={[
            ["嘔気（吐き気）", "5%以上", "最も多い。ほとんどは一過性"],
            ["嘔吐", "5%以上", "吐き気を感じた人のうち実際に吐くのは10%未満"],
            ["下痢", "5%以上", "軟便〜水様便が中心"],
            ["胃痛（腹痛）", "5%以上", "みぞおち付近に集中しやすい"],
            ["便秘", "5%以上", "胃腸の動きが鈍くなることが原因"],
            ["低血糖", "5%以上", "単独使用では起きにくい。インスリン併用時に注意"],
            ["消化不良", "5%未満", "胃もたれ・すぐお腹いっぱいになる感じ"],
            ["ゲップ（噯気）", "5%未満", "お腹にガスが溜まりやすくなる"],
            ["胃酸逆流（GERD）", "5%未満", "胃の中身が停滞することが一因"],
            ["胃炎", "5%未満", "胃粘膜への持続的な刺激による"],
            ["倦怠感", "5%未満", "食事量が減ってエネルギー不足になっている可能性"],
            ["味覚変化", "5%未満", "金属っぽい味や苦味を感じることがある"],
            ["めまい", "5%未満", "低血糖や脱水が関係している場合も"],
            ["胆石（胆嚢結石）", "頻度不明", "急激に体重が落ちたときにリスク上昇"],
            ["膵炎", "0.1%", "まれだが重篤。後半で詳しく解説"],
          ]}
        />

        <p>低血糖については、セマグルチドは<strong>血糖値が高いときだけインスリン分泌を促す</strong>仕組みなので、薬を単独で使う分にはリスクは低めです。ただしSU薬やインスリンと併用している方は注意してください。</p>
      </section>

      {/* ── セクション4: 吐き気はいつ終わる？ ── */}
      <section>
        <h2 id="duration" className="text-xl font-bold text-gray-800">「この吐き気、いつ終わるの？」いちばん気になる疑問に答えます</h2>

        <p>服用を始めたばかりの方にとって、これがいちばん知りたいことですよね。臨床試験（PIONEERシリーズ）のデータをもとにお答えします。</p>

        <StatGrid stats={[
          { value: "1〜3", unit: "日", label: "吐き気の典型的な消失期間" },
          { value: "10%未満", unit: "", label: "実際に嘔吐まで至る割合" },
          { value: "3〜4", unit: "%", label: "副作用で服薬をやめた人の割合" },
        ]} />

        <p><strong>吐き気は飲み始めや増量後の数日以内にピークを迎え、多くの場合1〜3日で自然に治まります。</strong>身体がセマグルチドに順応していくにつれて症状は和らぎ、数週間もすればほとんど気にならなくなるのが一般的です。</p>

        <p>「吐き気がある＝必ず吐く」というわけでもありません。臨床試験では、吐き気を感じた人のうち<strong>実際に嘔吐したのは10%未満</strong>。つまり、ムカムカはするけど実際に吐くケースは少数派です。</p>

        <p>そしてここが大事なポイント。<strong>副作用を理由にリベルサスをやめた人は全体のわずか3〜4%。</strong>言い換えれば、96〜97%の人は対処法を使いながら服薬を続けられているということです。次のセクションで、その具体的な対処法を見ていきましょう。</p>
      </section>

      <InlineCTA />

      {/* ── セクション5: 吐き気をラクにする3つの方法 ── */}
      <section>
        <h2 id="management" className="text-xl font-bold text-gray-800">吐き気をラクにする3つの方法 — 休薬・食事・水分</h2>

        <p>「つらいけど我慢するしかない」と思っていませんか？ そんなことはありません。<strong>休薬・食事の工夫・水分管理</strong>の3つで、かなり楽になるケースが多いです。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. 無理せず休薬する</h3>

        <Callout type="info" title="リベルサスは「休みやすい」薬">
          吐き気がひどくて日常生活に支障が出ているなら、<strong>いったん服薬をお休みしましょう。</strong>リベルサスは経口薬なので、服用をやめると約1日で血中濃度が下がり始めます。注射タイプ（オゼンピックなど）と比べて、休薬の効果が早く出るのがメリットです。ただし、<strong>休薬しても数日間吐き気が続く場合は腸閉塞の可能性があるため、すぐに処方医に連絡してください。</strong>
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. 胃にやさしい食事にスイッチ</h3>

        <Callout type="info" title="「少量×回数多め」がコツ">
          胃の動きがゆっくりになっているときに、脂っこいものや食物繊維たっぷりの食事は逆効果。胃の中にさらに長く留まって、吐き気が悪化します。おすすめは<strong>豆腐・ヨーグルト・白身魚・おかゆ・ひき肉</strong>など、消化の良い柔らかいもの。一度にたくさん食べるのではなく、<strong>少量ずつ回数を分けて食べる「分食」</strong>にすると胃への負担がぐっと減ります。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. 水分は「いつもどおり」がベスト</h3>

        <Callout type="info" title="意外な落とし穴：水の飲みすぎ">
          「吐き気があるなら水をたくさん飲もう」と思いがちですが、実はこれが逆効果になることがあります。胃の動きが鈍っている状態で大量に水を飲むと、<strong>胃の内圧がさらに上がってムカムカが悪化</strong>します。基本は<strong>普段どおりの水分量を維持すること。</strong>もし嘔吐や下痢で脱水が心配なときは、経口補水液を少量ずつこまめに摂ってください。
        </Callout>
      </section>

      {/* ── セクション6: 市販薬やサプリで楽になれる？ ── */}
      <section>
        <h2 id="otc-medicine" className="text-xl font-bold text-gray-800">市販薬やサプリで楽になれる？ 使えるものと注意点</h2>

        <p>「何か飲んで楽になりたい」という気持ち、よくわかります。いくつか選択肢をご紹介しますが、<strong>あくまで補助的な手段であり、処方医への相談が前提</strong>という点だけは忘れないでくださいね。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">プリンペラン（メトクロプラミド）</h3>
        <p>消化管の動きを活発にする処方薬です。セマグルチドが胃の動きを抑えるのに対し、<strong>プリンペランは逆に胃の動きを促進する</strong>ので、理論的にも相性は良好。医師の処方が必要ですが、副作用対策として併用されるケースがあります。吐き気がつらいときは遠慮なく主治医に相談しましょう。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">パントテン酸（ビタミンB5）</h3>
        <p>腸の蠕動運動をサポートするビタミンで、サプリメントとして市販されています。術後の腸管麻痺にも使われることがある成分です。ただし、セマグルチドの副作用に対する<strong>明確なエビデンスはまだ限定的</strong>なので、「あくまで補助」という位置づけで考えてください。</p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">市販の胃腸薬</h3>
        <p>ドラッグストアで買える制酸薬や消化酵素配合剤は、一時的な胃の不快感には使えます。ただし、セマグルチドによる胃運動抑制という根本原因に対処するものではありません。<strong>吐き気が2〜3日経っても改善しない場合は、市販薬で粘らずに処方医に相談してください。</strong></p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ジンジャーティー（生姜茶）</h3>
        <p>生姜には制吐作用があるという研究報告があり、妊娠中のつわりや術後の吐き気にも使われてきた歴史があります。GLP-1薬の副作用に対する正式なエビデンスはまだ確立されていませんが、<strong>温かい生姜茶を少しずつ飲むのは気分的にも落ち着く</strong>ので、試してみる価値はあります。</p>
      </section>

      {/* ── セクション7: これが出たら迷わず病院へ ── */}
      <section>
        <h2 id="emergency" className="text-xl font-bold text-gray-800">これが出たら迷わず病院へ — 4つの危険サイン</h2>

        <p>ここまで「副作用の多くは軽度で一過性」とお伝えしてきましたが、<strong>絶対に見逃してはいけないサインが4つあります。</strong>以下の症状が出たら、様子見せずに医療機関を受診してください。</p>

        <Callout type="warning" title="緊急受診が必要な症状">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>激しい腹痛が背中にまで広がる</strong> — 急性膵炎の可能性。みぞおちの強い痛みが背部に放散する場合は、血液検査（アミラーゼ・リパーゼ）が必要です。まれ（0.1%）ですが、放置すると重篤化します。</li>
            <li><strong>休薬しても吐き気が数日続く＋お腹がパンパンに張る</strong> — 麻痺性イレウス（腸閉塞）のサイン。ガスやお通じが止まっている場合は緊急性が高いです。</li>
            <li><strong>冷汗・手の震え・動悸・意識がぼんやり</strong> — 重度の低血糖。すぐにブドウ糖やジュースを口にして、医療機関に連絡してください。単独使用では起きにくいですが、インスリンやSU薬との併用時は要注意です。</li>
            <li><strong>右上腹部の激痛＋発熱</strong> — 胆石・胆嚢炎の疑い。急激な体重減少に伴って胆石ができやすくなるため、短期間で大幅に痩せた方は特に注意してください。</li>
          </ul>
        </Callout>

        <p>繰り返しになりますが、<strong>こうした重篤な副作用が起きる確率はごくわずかです。</strong>ただ、「知っている」と「知らない」では万が一のときの対応速度がまるで違います。頭の片隅に入れておいてくださいね。</p>
      </section>

      <InlineCTA />

      {/* ── セクション8: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 副作用を「怖がる」から「上手に付き合う」へ</h2>

        <p>リベルサスの副作用で最も多いのは吐き気ですが、その正体は<strong>胃の動きがゆっくりになることで起きる一時的な反応</strong>です。ほとんどの場合、1〜3日で自然に治まります。</p>

        <p>対処法は<strong>「休薬」「胃にやさしい食事」「水分は普段どおり」</strong>の3つが基本。特に水分の摂りすぎが逆効果になるという点は、意外と知られていないポイントです。こうした工夫を組み合わせることで、<strong>96〜97%の方が服薬を続けられている</strong>というデータがあります。</p>

        <p>副作用はゼロにはできませんが、正しく理解して対策すれば「怖いもの」ではなくなります。不安なことがあれば、いつでも処方医に相談してくださいね。</p>

        <p>関連記事もあわせてご参照ください。</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><Link href="/lp/column/glp1-medication-guide" className="text-blue-600 hover:underline">GLP-1受容体作動薬の総合ガイド</Link> — セマグルチドを含むGLP-1薬全般の解説</li>
          <li><Link href="/lp/column/glp1-diet-safety-evidence" className="text-blue-600 hover:underline">GLP-1ダイエットの安全性エビデンス</Link> — 臨床試験データに基づく安全性評価</li>
          <li><Link href="/lp/column/rybelsus-effective-dosing" className="text-blue-600 hover:underline">リベルサスの正しい服用方法</Link> — 効果を最大化するための服用ルール</li>
          <li><Link href="/lp/column/mounjaro-side-effects-guide" className="text-blue-600 hover:underline">マンジャロの副作用と対処法</Link> — チルゼパチド特有の副作用と管理方法</li>
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
