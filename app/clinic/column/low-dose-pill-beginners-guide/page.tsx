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
const self = articles.find((a) => a.slug === "low-dose-pill-beginners-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "低用量ピルの飲み方完全ガイドはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "低用量ピルは避妊だけでなくPMS・生理痛の改善にも使われるホルモン薬",
  "28錠タイプなら休薬管理が不要——飲み忘れ防止に向いている",
  "飲み忘れは「何時間経ったか」で対処が変わる——焦る前にフローを確認",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「低用量ピルを飲んでみたいけど、種類が多すぎてどれを選べばいいかわからない」「飲み忘れたらどうすれば？」——そんな不安を抱えていませんか？ この記事では、<strong>初めてピルを飲む方</strong>のために、種類の違い・飲み始めのタイミング・飲み忘れたときの対処法まで、<strong>これ1本で全部わかる</strong>ようにまとめました。
      </p>

      {/* ── セクション1: 低用量ピルって何？ ── */}
      <section>
        <h2 id="what-is-pill" className="text-xl font-bold text-gray-800">低用量ピルって何？ 避妊だけじゃない「もうひとつの役割」</h2>

        <p>低用量ピルは、<strong>エストロゲン（卵胞ホルモン）とプロゲスチン（黄体ホルモン）の2種類を含んだホルモン薬</strong>です。「避妊薬」のイメージが強いかもしれませんが、実は避妊だけが目的ではありません。</p>

        <p>生理痛がつらい、PMS（月経前症候群）で仕事にならない、肌荒れがひどい——こうした悩みに対して、<strong>低用量ピルは婦人科で最もよく処方される選択肢のひとつ</strong>です。排卵を抑えることでホルモンの波を穏やかにし、生理にまつわるさまざまな症状を和らげてくれます。</p>

        <StatGrid stats={[
          { value: "99.7", unit: "%", label: "正しく服用した場合の避妊効果" },
          { value: "約50", unit: "%↓", label: "生理痛の軽減報告率" },
          { value: "21 or 28", unit: "錠", label: "1シートの錠数" },
        ]} />

        <p>日本では長らく「ピル＝避妊」というイメージが根強かったのですが、月経困難症やPMSの治療薬として<strong>保険適用の低用量ピル（LEP製剤）</strong>も増えています。つまり、「治療のために飲む」のもごく普通のことなんです。</p>
      </section>

      {/* ── セクション2: ピルの種類 ── */}
      <section>
        <h2 id="pill-types" className="text-xl font-bold text-gray-800">一相性 vs 三相性、21錠 vs 28錠——どう違う？</h2>

        <p>低用量ピルにはいくつかの分類がありますが、まず知っておくべきは<strong>「ホルモン量の変化パターン」</strong>と<strong>「1シートの錠数」</strong>の2つです。</p>

        <p><strong>一相性</strong>は21錠すべてが同じホルモン量。飲む順番を気にしなくていいのがメリットです。一方、<strong>三相性</strong>は3段階でホルモン量が変わるため、自然なホルモン変動に近い——ただし飲む順番を間違えるとNG。初心者には一相性のほうがシンプルで扱いやすいと言われています。</p>

        <ComparisonTable
          headers={["分類", "代表的な薬剤", "特徴", "飲み順の管理"]}
          rows={[
            ["一相性", "マーベロン、ファボワール", "全錠同じホルモン量。シンプルで飲み忘れ時のリカバリーもラク", "順番自由"],
            ["三相性", "トリキュラー、ラベルフィーユ", "3段階でホルモン量が変化。不正出血が少ないとされる", "順番厳守"],
          ]}
        />

        <p>次に<strong>シートの錠数</strong>。21錠タイプは実薬のみで、飲み終わったら7日間休薬します。28錠タイプは実薬21錠＋偽薬（プラセボ）7錠のセット。偽薬にはホルモンが入っていないので、<strong>「毎日1錠飲む習慣」を途切れさせずに済む</strong>のが最大のメリットです。</p>

        <Callout type="point" title="28錠タイプと21錠タイプ、どっちがラク？">
          結論から言えば、<strong>飲み忘れが心配な人は28錠タイプ一択</strong>です。21錠タイプは「7日間の休薬期間」を自分でカウントしなければなりません。「あれ、休薬何日目だっけ？」と不安になった経験がある方は、28錠タイプに切り替えるだけで管理がぐっとラクになります。
        </Callout>
      </section>

      {/* ── セクション3: 服用方法 ── */}
      <section>
        <h2 id="how-to-take" className="text-xl font-bold text-gray-800">基本の飲み方——「毎日・同じ時間・1錠」が鉄則</h2>

        <p>低用量ピルの飲み方はとてもシンプルです。<strong>毎日1錠を、できるだけ同じ時間帯に飲む</strong>。これだけです。食前・食後は問いません。</p>

        <FlowSteps steps={[
          { title: "毎日1錠を服用", desc: "朝でも夜でもOK。大事なのは毎日同じ時間帯に飲むこと。スマホのアラームを活用しましょう。" },
          { title: "21錠（実薬）を飲み終える", desc: "28錠タイプの場合はそのまま偽薬へ。21錠タイプの場合は7日間の休薬期間に入ります。" },
          { title: "休薬・偽薬期間に出血", desc: "通常2〜3日目から消退出血（生理のような出血）が始まります。出血がなくても心配不要。" },
          { title: "次のシートを開始", desc: "28錠タイプは偽薬を飲み終えたら翌日から新シート。21錠タイプは7日間の休薬後に開始。" },
        ]} />

        <p>ここで多くの方が不安に思うのが、<strong>「偽薬期間に出血がなかったらどうすればいい？」</strong>という点。結論、出血がなくても<strong>予定どおり次のシートを始めてOK</strong>です。ピルを正しく飲んでいれば妊娠の可能性は極めて低い。ただし2シート連続で出血がない場合は念のため妊娠検査をしましょう。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: 服用開始のタイミング ── */}
      <section>
        <h2 id="when-to-start" className="text-xl font-bold text-gray-800">いつから飲み始める？ 3つのスタート法を比較</h2>

        <p>ピルの飲み始めには3つの方法があります。医師の指示に従うのが前提ですが、それぞれの特徴を知っておくと<strong>自分に合った方法を相談しやすく</strong>なります。</p>

        <ComparisonTable
          headers={["開始法", "飲み始めるタイミング", "避妊効果の発現", "メリット・注意点"]}
          rows={[
            ["月経初日法", "生理が始まった日", "初日から避妊効果あり", "最もスタンダード。生理初日を見極める必要あり"],
            ["Day1スタート（日曜開始法）", "生理開始後、最初の日曜日", "7日間は他の避妊法を併用", "週末に生理が重ならない。旅行やイベント管理がしやすい"],
            ["クイックスタート法", "処方された日（生理周期に関係なく）", "7日間は他の避妊法を併用", "すぐ始められる。妊娠していないことの確認が必要"],
          ]}
        />

        <p>最近はオンライン診療の普及もあり、<strong>クイックスタート法</strong>を採用するクリニックが増えています。「次の生理まで待つ」必要がないので、思い立ったその日から始められるのが大きなメリット。ただし、妊娠の可能性がないことの確認と、最初の7日間は<strong>コンドームなど他の避妊法との併用</strong>が必要です。オンラインでのピル処方の流れについては<Link href="/clinic/column/pill-online-clinic-lope" className="text-sky-600 underline hover:text-sky-800">ピルのオンライン診療ガイド</Link>も参考になります。</p>
      </section>

      {/* ── セクション5: 飲み忘れ対応 ── */}
      <section>
        <h2 id="missed-pill" className="text-xl font-bold text-gray-800">飲み忘れた！——焦る前に読むフローチャート</h2>

        <p>ピルを飲み忘れたとき、まず確認すべきは<strong>「忘れたのは何錠分か」</strong>です。1錠か、2錠以上かで対応がまったく違います。</p>

        <ComparisonTable
          headers={["状況", "対処法", "避妊効果への影響"]}
          rows={[
            ["1錠飲み忘れ（24時間以内）", "気づいた時点ですぐ1錠飲む。次の分は予定どおりの時間に服用（1日2錠になってもOK）", "ほぼ影響なし"],
            ["2錠以上連続で忘れた", "気づいた時点で1錠飲み、翌日から通常どおり再開。7日間は他の避妊法を併用", "低下あり。7日間は要注意"],
            ["第3週（15〜21錠目）に忘れた", "現シートの残りを飲み続け、休薬せずに次のシートへ直結", "休薬期間を挟むと排卵リスクが上がるため"],
            ["偽薬（プラセボ）を忘れた", "何もしなくてOK。偽薬にはホルモンが入っていない", "影響なし"],
          ]}
        />

        <Callout type="info" title="「2錠まとめて飲んでも大丈夫？」">
          1錠忘れの場合、翌日に2錠まとめて飲むことになりますが、<strong>医学的に問題ありません</strong>。吐き気が出ることはありますが、一時的なものです。ただし3錠以上まとめて飲むのはNG。2錠以上連続で飲み忘れた場合は、自己判断せず処方医に相談しましょう。
        </Callout>

        <p>飲み忘れを防ぐ最大のコツは、<strong>「毎日の生活ルーティンにくっつける」</strong>こと。歯磨きの横に置く、LINEのリマインド通知を設定する、スマホのアラームをかける——小さな工夫の積み重ねが、飲み忘れゼロへの近道です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション6: 中止・休薬 ── */}
      <section>
        <h2 id="stopping-pill" className="text-xl font-bold text-gray-800">やめたいとき、休みたいとき——中止のルール</h2>

        <p>ピルをやめるときの基本ルールは、<strong>今飲んでいるシートを最後まで飲み切ってから中止する</strong>こと。途中でやめると不正出血が起きやすくなります。</p>

        <FlowSteps steps={[
          { title: "妊娠を希望するとき", desc: "シートを飲み切って中止。多くの場合、1〜3ヶ月以内に排卵が再開します。ピルを長期間飲んでいても妊娠能力への影響はありません。" },
          { title: "副作用がつらいとき", desc: "吐き気・頭痛が2〜3ヶ月経っても改善しない場合は、薬剤の変更を医師に相談。自己判断での中止はNG。" },
          { title: "手術・長期安静の予定があるとき", desc: "血栓リスクが上がるため、手術の4週間前から中止するのが一般的。必ず主治医に伝えましょう。" },
        ]} />

        <p>「ピルは定期的に休んだほうがいい」という話を聞いたことがあるかもしれませんが、<strong>医学的にはその必要はありません</strong>。WHOのガイドラインでも、問題がなければ継続使用が推奨されています。むしろ、やめて再開するたびに初期の副作用（吐き気や不正出血）をもう一度経験することになるので、デメリットのほうが大きいケースも。</p>
      </section>

      {/* ── セクション7: 副作用と対処 ── */}
      <section>
        <h2 id="side-effects" className="text-xl font-bold text-gray-800">副作用は「最初の2〜3ヶ月」がヤマ場</h2>

        <p>低用量ピルの副作用で最も多いのは、<strong>吐き気・不正出血・頭痛</strong>の3つ。ただし、これらの多くは飲み始めの2〜3ヶ月に集中し、体がホルモンに慣れるとともに<strong>自然と軽くなっていく</strong>のが一般的です。</p>

        <ComparisonTable
          headers={["副作用", "発現頻度", "いつ頃おさまる？", "対処法"]}
          rows={[
            ["吐き気", "飲み始めの5〜10%", "1〜2ヶ月で軽快", "就寝前の服用に切り替える。食後に飲む"],
            ["不正出血", "飲み始めの20〜30%", "2〜3ヶ月で軽快", "飲み忘れがないか確認。3ヶ月以上続く場合は薬剤変更"],
            ["頭痛", "飲み始めの5〜10%", "1〜2ヶ月で軽快", "鎮痛剤OK。前兆のある片頭痛がある方はピル不可"],
            ["血栓症（まれ）", "1万人に3〜9人/年", "—", "ふくらはぎの痛み・息切れ・激しい頭痛があれば即受診"],
          ]}
        />

        <Callout type="info" title="血栓症リスク——35歳以上・喫煙者は要注意">
          低用量ピルの最も重大な副作用は<strong>静脈血栓塞栓症（VTE）</strong>です。発症率は非常に低いものの、<strong>35歳以上で1日15本以上の喫煙者</strong>はリスクが大幅に上がるため、ピルの処方が原則できません。BMI 30以上の方や、片頭痛に前兆（チカチカした光が見える等）がある方も処方に制限があります。これらに該当する場合は、必ず医師に伝えてください。
        </Callout>

        <p>副作用の出方には個人差があり、ある薬剤で合わなくても別の薬剤に切り替えるとうまくいくケースは多々あります。<strong>「合わないからピルは無理」と決めつけるのではなく、種類を変えて試す</strong>という選択肢があることを覚えておいてください。副作用がより抑えめな<Link href="/clinic/column/ultra-low-dose-pill-guide" className="text-sky-600 underline hover:text-sky-800">超低用量ピル（LEP製剤）</Link>への切り替えも選択肢のひとつです。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ——「正しく知って、正しく飲む」がピルの第一歩</h2>

        <p>低用量ピルは、正しく服用すれば<strong>避妊効果99.7%</strong>、さらにPMSや生理痛の改善にも効果がある、非常に優れた薬です。種類選びは一相性（マーベロン・ファボワール）がシンプルで初心者向き、シートは28錠タイプが飲み忘れ防止に有利。飲み始めは月経初日法が基本ですが、クイックスタート法ならすぐに始められます。</p>

        <p>飲み忘れは「1錠なら気づいた時点で飲む、2錠以上は医師に相談」が大原則。副作用は最初の2〜3ヶ月がヤマ場で、多くの方がそのあとは快適に過ごせるようになります。<strong>大事なのは、自己判断でやめたり再開したりしないこと</strong>。迷ったら処方医に相談してください。</p>

        <Callout type="point" title="もっと詳しく知りたい方へ">
          低用量ピルの<strong>種類・世代別の違い</strong>については<Link href="/clinic/column/pill-types-comparison" className="text-emerald-700 underline">「低用量ピルの種類と選び方」</Link>、<strong>PMS・月経困難症の処方設計</strong>については<Link href="/clinic/column/pms-online-prescription-guide" className="text-emerald-700 underline">「PMS・月経困難症のオンライン処方ガイド」</Link>をあわせてご覧ください。
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
