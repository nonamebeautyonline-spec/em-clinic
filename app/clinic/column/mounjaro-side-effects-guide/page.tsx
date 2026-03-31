import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, {
  InlineCTA,
  Callout,
  ComparisonTable,
  FlowSteps,
  StatGrid,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "mounjaro-side-effects-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/clinic/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "マンジャロの副作用と対処法はオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "便秘には酸化マグネシウム（浸透圧性下剤）が有効。コーラック等の刺激性下剤はNG",
  "抜け毛はマンジャロの直接作用ではなく栄養不足が原因。タンパク質・鉄・亜鉛で回復",
  "副作用の有無と減量効果は無関係。副作用がないから効いていないわけではない",
];

const toc = [
  { id: "overview", label: "副作用の大前提" },
  { id: "constipation", label: "便秘の原因と対処法" },
  { id: "diarrhea", label: "下痢の原因と対処法" },
  { id: "nausea", label: "吐き気の原因と対処法" },
  { id: "hair-loss", label: "抜け毛の原因と対処法" },
  { id: "hearing", label: "聴覚症状について" },
  { id: "risk-factors", label: "副作用が出やすい人の特徴" },
  { id: "when-to-see-doctor", label: "受診すべきタイミング" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        マンジャロを始めるとき、一番気になるのが副作用ですよね。「便秘がひどい」「髪が抜けた」……SNSにはいろんな体験談が飛び交っていますが、<strong>正しく理解すれば対策できるもの</strong>がほとんどです。この記事では、よくある副作用の原因と具体的な対処法を整理しました。
      </p>

      {/* ── セクション1: 大前提 ── */}
      <section>
        <h2 id="overview" className="text-xl font-bold text-gray-800">副作用の大前提 — 知っておいてほしい2つのこと</h2>

        <p>まず最初に押さえておきたいのが、以下の2点です。</p>

        <Callout type="info" title="副作用に関する2つの大前提">
          <strong>1. 継続使用で副作用は軽減する</strong> — 最初の1〜2週間が一番つらく、体が慣れるにつれて落ち着いていくパターンが大半です。<br />
          <strong>2. 副作用がない＝効いていない、ではない</strong> — 副作用の有無と減量効果には相関がありません。副作用なしでしっかり痩せている人はたくさんいます。
        </Callout>

        <p>「副作用が出ないから自分には合ってないのかな」と不安になる必要はまったくありません。むしろラッキーだと思ってください。</p>

      </section>

      {/* ── セクション2: 便秘 ── */}
      <section>
        <h2 id="constipation" className="text-xl font-bold text-gray-800">便秘の原因と対処法 — 下剤の選び方に要注意</h2>

        <p>マンジャロの副作用で一番多いのが便秘です。GLP-1の作用で<strong>腸の蠕動運動（ぜんどう）が低下</strong>するのが原因で、これは薬が効いている証拠でもあります。</p>

        <ComparisonTable
          headers={["下剤の種類", "代表例", "マンジャロとの相性"]}
          rows={[
            ["浸透圧性下剤", "酸化マグネシウム、マグミット", "OK — 腸に水分を集めて自然な排便を促す"],
            ["刺激性下剤", "コーラック（ビサコジル）、センノシド", "NG — マンジャロの効果を局所的に減弱させる可能性あり"],
          ]}
        />

        <p>ポイントは<strong>下剤の種類</strong>です。ドラッグストアで手軽に買えるコーラック（ビサコジル）は腸を刺激して動かすタイプですが、マンジャロの作用と干渉する可能性があるので避けましょう。酸化マグネシウム系が第一選択です。あわせて<strong>水分をしっかり摂る</strong>（1日2L目安）ことも大事です。</p>
      </section>

      {/* ── セクション3: 下痢 ── */}
      <section>
        <h2 id="diarrhea" className="text-xl font-bold text-gray-800">下痢の原因と対処法 — 整腸剤だけでは足りない理由</h2>

        <p>便秘とは逆に下痢になる方もいます。「じゃあビオフェルミン飲めばいいでしょ」と思うかもしれませんが、実は<strong>整腸剤だけでは根本的な解決にならない</strong>ケースが多いんです。</p>

        <p>マンジャロによる下痢の原因は、腸の蠕動運動の変化や脂肪の吸収不良。腸内細菌のバランスが崩れているわけではないので、整腸剤の出番が限定的なんですね。</p>

        <FlowSteps steps={[
          { title: "用量調整を相談", desc: "増量直後に下痢がひどくなった場合、一時的に減量するのが最も効果的" },
          { title: "食事内容を見直す", desc: "油分の多い食事を控え、食物繊維を増やす。消化の良いものを中心に" },
          { title: "少量ずつ食べる", desc: "一度に大量に食べると腸への負担が大きい。こまめに分けて食べる" },
        ]} />
      </section>

      {/* ── セクション4: 吐き気 ── */}
      <section>
        <h2 id="nausea" className="text-xl font-bold text-gray-800">吐き気の原因と対処法 — 「食べられない」ときどうする？</h2>

        <p>吐き気は特に<strong>開始直後や増量直後</strong>に出やすい副作用です。マンジャロは胃の動きをゆっくりにするので、胃に食べ物が残っている状態だと悪化しやすくなります。</p>

        <p>「気持ち悪くて何も食べられない」というときは、まず<strong>ゼリーや飴で低血糖を防ぐ</strong>のが優先。症状が落ち着いてきたら少量ずつ食事を再開してください。市販の吐き気止めもありますが、効果は限定的です。数日経っても改善しない場合は医師に相談しましょう。</p>

      </section>

      <InlineCTA />

      {/* ── セクション5: 抜け毛 ── */}
      <section>
        <h2 id="hair-loss" className="text-xl font-bold text-gray-800">抜け毛の原因と対処法 — マンジャロのせいじゃない</h2>

        <p>「マンジャロで髪が抜けた！」という声をSNSで見かけますが、これは正確ではありません。マンジャロが直接毛根に作用して抜け毛を起こすわけではなく、<strong>急激な減量に伴う栄養不足</strong>が原因なんです。</p>

        <p>特に不足しやすいのが以下の栄養素です。</p>

        <ComparisonTable
          headers={["栄養素", "役割", "多く含む食品"]}
          rows={[
            ["タンパク質", "毛髪の主成分ケラチンの材料", "肉・魚・卵・大豆製品"],
            ["鉄", "毛母細胞への酸素運搬", "赤身肉・レバー・ほうれん草"],
            ["亜鉛", "ケラチン合成に必要", "牡蠣・牛肉・ナッツ"],
            ["ビタミンB群", "毛髪の代謝を促進", "豚肉・うなぎ・納豆"],
          ]}
        />

        <Callout type="info" title="毛根は死んでいません">
          栄養不足による抜け毛は<strong>休止期脱毛</strong>と呼ばれ、毛根自体は死滅していません。栄養を改善すれば数ヶ月で回復するので、育毛薬を慌てて買う必要はありません。
        </Callout>

        <img src="/clinic/column/images/mounjaro/1948671484622229748-GwsSYexbgAE-88g.jpg" alt="抜け毛に必要な栄養素一覧" className="rounded-xl my-4 w-full" />

        <p>抜け毛が気になる方は、タンパク質・亜鉛・鉄・ビタミンB群を意識的に摂るようにしましょう。サプリメントの活用も有効です。</p>
      </section>

      {/* ── セクション6: 聴覚症状 ── */}
      <section>
        <h2 id="hearing" className="text-xl font-bold text-gray-800">聴覚症状について — 稀だけど知っておきたい</h2>

        <p>あまり知られていませんが、急激な体重減少に伴って<strong>耳管開放症</strong>を発症するケースが稀にあります。自分の声が響く、耳が詰まった感じがする、といった症状です。</p>

        <img src="/clinic/column/images/mounjaro/1977745344399384744-G3JcsqBacAAJiqx.jpg" alt="急激なダイエットと聴覚症状の関係" className="rounded-xl my-4 w-full" />

        <p>これはマンジャロ特有の副作用ではなく、<strong>急激なダイエット全般で起こりうる</strong>症状です。耳管周囲の脂肪が減ることで耳管が開きっぱなしになるのが原因で、特に女性に多いとされています。症状が出たら耳鼻科を受診してください。</p>
      </section>

      {/* ── セクション7: 副作用が出やすい人 ── */}
      <section>
        <h2 id="risk-factors" className="text-xl font-bold text-gray-800">副作用が出やすい人の特徴</h2>

        <p>同じ用量でも副作用の出方には個人差があります。以下に当てはまる方は、特に注意が必要です。</p>

        <ComparisonTable
          headers={["特徴", "理由"]}
          rows={[
            ["女性でBMI低め", "体重あたりの薬物濃度が高くなりやすい"],
            ["GLP-1系薬が初めて", "体がGLP-1の作用に慣れていない"],
            ["一度に多く食べるタイプ", "胃排出遅延の影響を受けやすい"],
            ["早めに増量した", "体が十分に適応する前に用量が上がった"],
            ["もともと胃がもたれやすい", "胃の感受性が高い"],
            ["早食いの習慣がある", "胃への急激な負担がかかる"],
            ["脂っこい食事が多い", "脂質の消化に時間がかかり不快感増"],
            ["食事量がもともと少ない", "栄養不足に陥りやすい"],
          ]}
        />
      </section>

      {/* ── セクション8: 受診タイミング ── */}
      <section>
        <h2 id="when-to-see-doctor" className="text-xl font-bold text-gray-800">受診すべきタイミング — この症状は放置しないで</h2>

        <p>多くの副作用は自宅で対処できますが、以下の症状が出た場合は<strong>速やかに医師に相談</strong>してください。</p>

        <Callout type="warning" title="すぐ受診すべき症状">
          <strong>耐えきれない腹痛・背中の痛み</strong> — 膵炎の可能性。リスクは低いですが、ゼロではありません。<br />
          <strong>不正出血が続く</strong> — 急激な減量によるホルモンバランスの乱れの可能性。<br />
          <strong>気分の落ち込みが強い</strong> — 抑うつ傾向がある方は、マンジャロ開始後に悪化する可能性があります。
        </Callout>

      </section>

      {/* ── セクション9: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>マンジャロの副作用は「怖い」ものではなく、<strong>正しく理解して対策すればコントロールできる</strong>ものがほとんどです。便秘には酸化マグネシウム、抜け毛には栄養補給、吐き気には食事タイミングの工夫。そして副作用がなくても薬は効いているので安心してくださいね。</p>

        <p>マンジャロの基本は<Link href="/clinic/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロとは？初心者向け入門ガイド</Link>を、リベルサスの副作用との比較は<Link href="/clinic/column/rybelsus-side-effects-guide" className="text-sky-600 underline hover:text-sky-800">リベルサスの副作用ガイド</Link>もあわせてご覧ください。</p>
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
