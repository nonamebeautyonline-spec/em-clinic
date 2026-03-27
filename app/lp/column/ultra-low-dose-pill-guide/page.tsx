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
const self = articles.find((a) => a.slug === "ultra-low-dose-pill-guide")!;

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
  "超低用量ピル（LEP）はエストロゲン20μg以下で、血栓症リスクや副作用が抑えられた製剤",
  "ヤーズフレックスやジェミーナは連続投与で月経回数を年3〜4回に減らせる",
  "月経困難症の診断があれば保険適用——避妊目的の低用量ピル（OC）とは法的位置づけが異なる",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「低用量ピルと超低用量ピル、何が違うの？」——名前が似すぎていて混乱しますよね。実は超低用量ピル（LEP製剤）は、<strong>月経困難症の治療薬として保険が使える</strong>という大きな特徴があります。この記事では、代表的な4つの薬剤を比較しながら、なぜ「超低用量」が選ばれるのか、連続投与で月経回数を激減させるメリット、そして保険適用の条件まで、<strong>処方に必要な知識をまるごと</strong>お伝えします。
      </p>

      {/* ── セクション1: 超低用量ピルとは ── */}
      <section>
        <h2 id="what-is-ulp" className="text-xl font-bold text-gray-800">そもそも「超低用量ピル」って何？ 低用量ピルとの決定的な違い</h2>

        <p>まず用語を整理しましょう。ピルに含まれるエストロゲン（エチニルエストラジオール: EE）の量で分類が変わります。<strong>低用量ピル（OC）はEE 30〜35μg</strong>、それに対して<strong>超低用量ピルはEE 20μg以下</strong>です。たった10〜15μgの差ですが、この差が副作用プロファイルに大きく影響します。</p>

        <p>そしてもう一つ重要なのが法的な位置づけ。超低用量ピルの多くは<strong>LEP（Low dose Estrogen Progestin）製剤</strong>と呼ばれ、「月経困難症」や「子宮内膜症」の治療薬として<strong>保険適用</strong>を受けています。一方、避妊を目的とする低用量ピル（OC）は自費です。成分構成は似ていても、薬としてのカテゴリがまったく違うんです。</p>

        <StatGrid stats={[
          { value: "20", unit: "μg以下", label: "超低用量ピルのEE含有量" },
          { value: "30〜35", unit: "μg", label: "低用量ピル（OC）のEE含有量" },
          { value: "3割", unit: "負担", label: "LEP製剤の保険適用時" },
        ]} />

        <p>つまり超低用量ピルは、<strong>「エストロゲンを極力減らして副作用リスクを下げつつ、月経困難症を保険で治療できる薬」</strong>。この2つのメリットが重なっている点が、臨床で選ばれる理由です。</p>
      </section>

      {/* ── セクション2: 代表的な薬剤比較 ── */}
      <section>
        <h2 id="comparison" className="text-xl font-bold text-gray-800">ヤーズ・ヤーズフレックス・ルナベルULD・ジェミーナを一覧比較</h2>

        <p>超低用量ピルにもいくつか種類があり、それぞれ特徴が異なります。以下の表で一気に整理しましょう。</p>

        <ComparisonTable
          headers={["薬剤名", "黄体ホルモン成分", "EE含有量", "服用パターン", "連続投与"]}
          rows={[
            ["ヤーズ配合錠", "ドロスピレノン（DRSP）", "20μg", "24錠＋偽薬4錠（28日周期）", "不可"],
            ["ヤーズフレックス配合錠", "ドロスピレノン（DRSP）", "20μg", "最長120日連続＋4日休薬", "可（最長120日）"],
            ["ルナベルULD", "ノルエチステロン（NET）", "20μg", "21錠＋7日休薬（28日周期）", "不可"],
            ["ジェミーナ配合錠", "レボノルゲストレル（LNG）", "20μg", "21日服用＋7日休薬 or 77日連続＋7日休薬", "可（最長77日）"],
          ]}
        />

        <p>注目してほしいのは「連続投与」の列。<strong>ヤーズフレックスは最長120日、ジェミーナは最長77日</strong>の連続服用が認められています。これが従来の周期投与と比べて大きなアドバンテージになります（詳しくは後述）。</p>

        <p>黄体ホルモンの種類も見逃せません。ヤーズ系列のドロスピレノンは<strong>抗ミネラルコルチコイド作用</strong>を持ち、むくみが出にくいとされる一方で、血栓症リスクに関しては他の黄体ホルモンより注意が必要です。ルナベルULDのノルエチステロンやジェミーナのレボノルゲストレルは、より古くから使われてきた成分で血栓リスクのデータが豊富です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション3: なぜ超低用量が良いのか ── */}
      <section>
        <h2 id="why-ultra-low" className="text-xl font-bold text-gray-800">エストロゲンが少ないと何がうれしい？ 超低用量のメリットとトレードオフ</h2>

        <p>ピルの副作用の多くは、エストロゲン（EE）の量に比例します。EEが多いほど<strong>血栓症のリスク、吐き気、頭痛、乳房の張り</strong>が出やすい。だからこそ、EEを20μg以下に抑えた超低用量ピルが開発されました。</p>

        <FlowSteps steps={[
          { title: "エストロゲン量を減らす", desc: "EE 30〜35μg → 20μg以下。たった10μgの差が副作用プロファイルを変える。" },
          { title: "血栓症リスクが低下", desc: "凝固因子への影響が小さくなり、静脈血栓塞栓症（VTE）のリスクが相対的に下がる。" },
          { title: "吐き気・頭痛も軽減", desc: "エストロゲン由来の消化器症状や片頭痛様の症状が起きにくくなる。" },
          { title: "ただし不正出血は増える", desc: "子宮内膜を安定させる力がやや弱いため、服用初期に不正出血が出やすい傾向がある。" },
        ]} />

        <p>つまり超低用量ピルは、<strong>「重大な副作用のリスクを下げる代わりに、軽微な不正出血は受け入れる」</strong>というトレードオフの設計です。不正出血は多くの場合、2〜3シート目には落ち着いてきます。この点を患者さんに事前に伝えておくと、服薬の継続率がぐんと上がります。</p>
      </section>

      {/* ── セクション4: 連続投与のメリット ── */}
      <section>
        <h2 id="continuous-dosing" className="text-xl font-bold text-gray-800">月経が年3〜4回に？ 連続投与がもたらすインパクト</h2>

        <p>従来のピルは「21日飲んで7日休む」が基本でした。休薬期間中に消退出血（月経のような出血）が起き、年間で約13回の月経を経験します。これに対し、<strong>ヤーズフレックス（最長120日）やジェミーナ（最長77日）は連続服用が可能</strong>。月経の回数そのものを大幅に減らせるんです。</p>

        <StatGrid stats={[
          { value: "約13", unit: "回/年", label: "従来の周期投与での月経回数" },
          { value: "3〜4", unit: "回/年", label: "連続投与での月経回数" },
          { value: "120", unit: "日", label: "ヤーズフレックスの最長連続投与" },
        ]} />

        <p>「月経の回数を減らして大丈夫なの？」と心配される方は多いですが、医学的にはまったく問題ありません。そもそも月経困難症の症状（激しい腹痛、腰痛、吐き気）は<strong>月経のたびに繰り返される「発作」</strong>のようなもの。発作の回数を減らすこと自体が、最も直接的な治療なのです。</p>

        <Callout type="info" title="連続投与中に出血が起きたら？">
          ヤーズフレックスの場合、連続投与中に<strong>3日間連続で出血・点状出血</strong>があったら、そこで4日間の休薬を入れるルールになっています。自己判断で休薬せずに飲み続けるのはNG。ジェミーナは77日間の連続後に7日休薬というシンプルなパターンです。患者さんが混乱しやすいポイントなので、LINE等でリマインドする仕組みがあると安心です。
        </Callout>
      </section>

      {/* ── セクション5: 保険適用の条件 ── */}
      <section>
        <h2 id="insurance-coverage" className="text-xl font-bold text-gray-800">保険で処方できる条件——「月経困難症」の診断がカギ</h2>

        <p>超低用量ピル（LEP製剤）が保険適用になるのは、<strong>「月経困難症」の診断がついた場合</strong>に限られます。避妊目的では保険は使えません。</p>

        <p>月経困難症には2つのタイプがあり、<strong>どちらも保険適用の対象</strong>です。</p>

        <ComparisonTable
          headers={["タイプ", "原因", "特徴", "対象年齢層"]}
          rows={[
            ["器質性月経困難症", "子宮内膜症、子宮筋腫、子宮腺筋症など", "画像検査や内診で器質的病変が確認される", "20代後半〜"],
            ["機能性月経困難症", "明らかな器質的疾患なし", "プロスタグランジン過剰産生による痛み。10代に多い", "10代〜20代前半"],
          ]}
        />

        <p>特に機能性月経困難症は「検査で異常がないのに痛い」ケース。鎮痛剤（NSAIDs）で対応しきれない場合にLEP製剤へステップアップするのが一般的な流れです。<strong>若年患者でも保険が使える</strong>という点は、患者さんにとって大きな安心材料になります。</p>

        <Callout type="point" title="オンライン診療でのLEP処方">
          LEP製剤は<strong>再診からオンライン診療での処方が可能</strong>です。初診は対面が基本ですが、2回目以降は来院せずに処方を受けられるため、通院負担が大きく減ります。LINEを活用した予約・問診・処方管理との相性が非常に良い領域です。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション6: OCとの使い分け ── */}
      <section>
        <h2 id="lep-vs-oc" className="text-xl font-bold text-gray-800">LEPとOC、どう使い分ける？ 成分は似ているのに法的位置づけが違う理由</h2>

        <p>患者さんからよく聞かれるのが「低用量ピル（OC）と超低用量ピル（LEP）って中身は同じじゃないの？」という質問です。たしかに、<strong>成分構成が非常に近い製品もあります</strong>。しかし法的な扱いはまったく異なります。</p>

        <ComparisonTable
          headers={["項目", "OC（経口避妊薬）", "LEP（低用量エストロゲン・プロゲスチン配合剤）"]}
          rows={[
            ["主な目的", "避妊", "月経困難症・子宮内膜症の治療"],
            ["保険適用", "不可（自費）", "可（3割負担）"],
            ["月額コスト目安", "2,000〜3,000円（自費）", "600〜1,500円（3割負担時）"],
            ["処方の前提", "避妊の希望", "月経困難症の診断"],
            ["EE含有量", "30〜35μg", "20μg以下"],
          ]}
        />

        <p>ここで面白いのが、<strong>LEPにも避妊効果はある</strong>という事実。ただし、あくまで「治療の副次的効果」であり、「避妊薬」としての承認は受けていません。逆に、OCにも月経痛を軽減する作用がありますが、「治療薬」としては承認されていない。<strong>同じような薬なのに、承認の枠組みが違うから保険の扱いが変わる</strong>——日本の薬事制度ならではの事情です。</p>
      </section>

      {/* ── セクション7: 副作用 ── */}
      <section>
        <h2 id="side-effects" className="text-xl font-bold text-gray-800">知っておくべき副作用——不正出血・血栓症・頭痛のリアル</h2>

        <p>超低用量ピルはエストロゲン量が少ないぶん副作用も抑えめですが、ゼロではありません。処方前に必ず患者さんに伝えるべき3つの副作用を整理します。</p>

        <FlowSteps steps={[
          { title: "不正出血", desc: "最も多い副作用。特に連続投与の初期に起きやすく、2〜3シート目で改善することが多い。出血量が多い・長期間続く場合は受診を。" },
          { title: "血栓症（VTE）", desc: "頻度は低いが最も注意すべき副作用。特にドロスピレノン含有製剤（ヤーズ系列）は他の黄体ホルモンと比べやや血栓リスクが高い可能性が指摘されている。喫煙者・肥満・片頭痛（前兆あり）の方はリスク評価を慎重に。" },
          { title: "頭痛", desc: "服用開始後に一過性の頭痛が出ることがある。前兆のある片頭痛がある方はピル全般が禁忌となるため、問診での確認が必須。" },
        ]} />

        <Callout type="info" title="血栓症の初期症状を見逃さない">
          覚え方は<strong>「ACHES」</strong>——Abdominal pain（腹痛）、Chest pain（胸痛）、Headache（激しい頭痛）、Eye problems（視覚異常）、Severe leg pain（ふくらはぎの激痛）。どれか一つでも出たら服用を中止し、すぐに医療機関を受診するよう指導してください。
        </Callout>

        <p>副作用の説明は「怖がらせる」ためではなく、<strong>「何かあったときに正しく行動できる」ようにする</strong>ためのもの。超低用量ピルは適切に使えば月経困難症の強力な味方です。副作用のリスクを正しく理解したうえで、患者さんと一緒に最適な治療を選んでいきましょう。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ——超低用量ピルは「保険で使える、副作用が少ない、月経を減らせる」三拍子の治療薬</h2>

        <p>ここまでの内容を振り返ると、超低用量ピル（LEP製剤）は<strong>エストロゲンを20μg以下に抑えることで血栓症や吐き気のリスクを低減</strong>し、月経困難症に対して<strong>保険適用で処方できる</strong>治療薬です。ヤーズフレックスやジェミーナの連続投与を活用すれば、年間の月経回数を13回から3〜4回にまで減らせる可能性があります。</p>

        <p>避妊目的のOCとは法的位置づけが異なること、不正出血は初期に出やすいが多くは自然に改善すること、血栓症のスクリーニングと初期症状の教育が不可欠であること——この3点を押さえておけば、自信を持って処方に臨めるはずです。</p>

        <Callout type="point" title="関連記事もあわせてどうぞ">
          低用量ピル全般の種類比較は<Link href="/lp/column/pill-types-comparison" className="text-emerald-700 underline">「低用量ピルの種類と選び方」</Link>、初めてピルを飲む方向けの服用ガイドは<Link href="/lp/column/low-dose-pill-beginners-guide" className="text-emerald-700 underline">「低用量ピルの飲み方完全ガイド」</Link>、月経移動に使う中用量ピルについては<Link href="/lp/column/medium-dose-pill-guide" className="text-emerald-700 underline">「中用量ピルの処方ガイド」</Link>をご覧ください。
        </Callout>
      </section>
    </ArticleLayout>
  );
}
