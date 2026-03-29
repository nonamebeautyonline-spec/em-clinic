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
const self = articles.find((a) => a.slug === "mounjaro-blood-sugar-medications")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "マンジャロと血糖値・併用薬はオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "マンジャロは血糖依存性にインスリン分泌を促進 — 膵臓疲弊の心配はむしろ逆で糖尿病予防効果あり",
  "メトホルミン併用で効果アップ。特にマンジャロ7.5mg以上で効果が鈍化した場合に有効",
  "健康診断への影響はほぼなし。血糖値・ケトン体・胃カメラで多少の影響が出る程度",
];

const toc = [
  { id: "blood-sugar", label: "マンジャロと血糖値の関係" },
  { id: "insulin-myth", label: "インスリン枯渇の誤解" },
  { id: "metformin", label: "メトホルミンとの併用" },
  { id: "health-check", label: "健康診断への影響" },
  { id: "psychiatric", label: "精神科薬・睡眠薬との関係" },
  { id: "contraindicated", label: "併用禁止の薬剤" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        マンジャロを使っていると「血糖値は大丈夫？」「将来糖尿病になりやすくならない？」「今飲んでる薬と併用できる？」といった疑問が出てきますよね。この記事では、マンジャロと血糖値の関係から、メトホルミン併用のメリット、健康診断への影響、精神科薬との相互作用まで、<strong>併用薬に関する気になるポイント</strong>をまるっと解説します。
      </p>

      {/* ── マンジャロと血糖値の関係 ── */}
      <section>
        <h2 id="blood-sugar" className="text-xl font-bold text-gray-800">マンジャロと血糖値の関係 — 血糖依存性がポイント</h2>

        <p>マンジャロ（チルゼパチド）は、GIP受容体とGLP-1受容体の両方に作用する「デュアルアゴニスト」です。その大きな特徴が<strong>血糖依存性のインスリン分泌促進</strong>なんですよね。</p>

        <p>これ、何がいいかというと――血糖値が高いときだけインスリンの分泌を促して、血糖値が正常なときはほとんど作用しないんです。だから<strong>低血糖を起こしにくい</strong>。従来の糖尿病薬（SU剤など）が「血糖値に関係なくインスリンを出す」のとは根本的に違います。</p>

        <StatGrid stats={[
          { value: "血糖依存性", unit: "", label: "インスリン分泌の特徴" },
          { value: "低リスク", unit: "", label: "低血糖の発生率" },
          { value: "GIP+GLP-1", unit: "", label: "デュアルアゴニスト作用" },
        ]} />

        <p>つまり、マンジャロは<strong>血糖値の急激な上昇（食後高血糖）を抑えつつ、低血糖は起こしにくい</strong>という、かなり理にかなった作用機序を持っているわけです。</p>
      </section>

      {/* ── インスリン枯渇の誤解 ── */}
      <section>
        <h2 id="insulin-myth" className="text-xl font-bold text-gray-800">インスリン枯渇の誤解 — 膵臓が疲弊する？むしろ逆です</h2>

        <p>SNSでよく見かける不安が2つあります。</p>

        <Callout type="info" title="よくある2つの誤解">
          <strong>誤解1</strong>: 「一生で分泌されるインスリン量は決まっている。マンジャロで使い切ったら終わり」<br />
          <strong>誤解2</strong>: 「膵臓が疲弊してインスリンが出なくなる」
        </Callout>

        <p>どちらも<strong>間違い</strong>です。インスリン分泌能力は膵臓のβ細胞の機能に依存していて、「一生分の上限」があるわけではありません。β細胞は適切な環境であれば機能を維持し続けます。</p>

        <p>むしろマンジャロは<strong>糖尿病予防に働く</strong>可能性があるんです。理由はこうです：</p>

        <FlowSteps steps={[
          { title: "血糖値の乱高下を改善", desc: "食後血糖のスパイクを抑えることで、膵臓への負担が減ります。" },
          { title: "インスリン抵抗性が改善", desc: "体重減少と血糖コントロールの改善により、インスリンが効きやすい身体に変わります。" },
          { title: "膵β細胞の保護", desc: "結果として膵臓のβ細胞が「休める」状態になり、長期的なインスリン分泌能力が保たれます。" },
        ]} />

        <img src="/lp/column/images/mounjaro/1966714297431802236-G0ssOd9bkAAtvC1.jpg" alt="インスリン分泌に関する誤解の解説" className="rounded-xl my-4 w-full" />

        <p>「マンジャロを使うと将来糖尿病になる」どころか、<strong>血糖の乱高下を改善してインスリン抵抗性を下げることで、むしろ糖尿病のリスクを減らせる</strong>というのが現在のエビデンスです。</p>
      </section>

      {/* ── メトホルミンとの併用 ── */}
      <section>
        <h2 id="metformin" className="text-xl font-bold text-gray-800">メトホルミンとの併用 — 60年以上の実績ある相棒</h2>

        <p>メトホルミンは60年以上の歴史を持つ糖尿病治療薬で、<strong>マンジャロとの併用で効果が上がるケース</strong>が少なくありません。特にマンジャロ7.5mg以上を使用していて「最近あんまり落ちないな」と感じている方に有効なことが多いです。</p>

        <img src="/lp/column/images/mounjaro/1916363996934164908-GphK5WMbEAMqAEM.png" alt="メトホルミンとマンジャロの併用解説" className="rounded-xl my-4 w-full" />

        <ComparisonTable
          headers={["項目", "マンジャロ単独", "マンジャロ＋メトホルミン"]}
          rows={[
            ["作用機序", "GIP/GLP-1受容体に作用", "＋肝臓の糖新生抑制・インスリン感受性改善"],
            ["体重減少効果", "高い", "相乗効果でさらに上がる場合あり"],
            ["消化器副作用", "嘔気・下痢", "両方の副作用が出る可能性あり（要慎重開始）"],
            ["コスト", "マンジャロ代のみ", "＋メトホルミン代（安価）"],
          ]}
        />

        <Callout type="warning" title="メトホルミンの個人輸入は危険">
          海外の個人輸入サイトでメトホルミンを購入する人がいますが、<strong>品質管理が不明な薬剤の使用は非常に危険</strong>です。偽薬や不純物混入のリスクがあり、重篤な副作用（乳酸アシドーシス等）を起こす可能性もあります。必ず医師の処方を受けてください。詳しくは<Link href="/lp/column/metformin-personal-import-risk" className="text-sky-600 underline hover:text-sky-800">メトホルミン個人輸入のリスク</Link>をご覧ください。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── 健康診断への影響 ── */}
      <section>
        <h2 id="health-check" className="text-xl font-bold text-gray-800">健康診断への影響 — ほとんど問題なし</h2>

        <p>「マンジャロを使っていると健康診断の結果がおかしくなる？」という心配もよくあります。結論から言うと、<strong>大きな問題はほぼありません</strong>。ただし以下のような軽微な影響が出る可能性はあります。</p>

        <ComparisonTable
          headers={["検査項目", "影響", "対策"]}
          rows={[
            ["血糖値（空腹時）", "低めに出る可能性", "前日に糖質60g以上を摂取すれば問題なし"],
            ["尿検査", "ケトン体が陽性になることがある", "脂肪燃焼の結果なので基本は問題なし"],
            ["胃カメラ", "胃内に食べ物の残渣が残ることがある", "検査前日の食事制限を厳密に守る"],
            ["大腸カメラ", "ほぼ影響なし", "下剤で前処置するので基本的にOK"],
          ]}
        />

        <Callout type="info" title="おすすめの対策">
          一番シンプルなのは、<strong>健診がある週はマンジャロの投与を控える</strong>こと。週1回の注射なので、健診日から逆算して投与スケジュールを調整しましょう。
        </Callout>
      </section>

      {/* ── 精神科薬・睡眠薬との関係 ── */}
      <section>
        <h2 id="psychiatric" className="text-xl font-bold text-gray-800">精神科薬・睡眠薬との関係 — 体重増加の副作用を相殺</h2>

        <p>精神科の薬を飲んでいる方にとって、マンジャロは意外と相性がいい場合があるんです。</p>

        <p>第二世代抗精神病薬（非定型抗精神病薬）には、<strong>体重増加の副作用</strong>があることで有名ですよね。オランザピン、クエチアピンなどが特に顕著です。この薬剤による体重増加を<strong>マンジャロで相殺できるケース</strong>が報告されています。</p>

        <img src="/lp/column/images/mounjaro/1966714297431802236-G0ssOeDbcAIeC9V.jpg" alt="マンジャロと精神科薬の併用に関する解説" className="rounded-xl my-4 w-full" />

        <p>一方で、<strong>睡眠薬</strong>については「効果が落ちた気がする」と感じる方がいます。マンジャロの胃排出遅延により睡眠薬の吸収タイミングがずれる可能性があるためです。睡眠薬を服用している方は、効果の変化を医師に伝えて調整してもらいましょう。</p>
      </section>

      {/* ── 併用禁止の薬剤 ── */}
      <section>
        <h2 id="contraindicated" className="text-xl font-bold text-gray-800">併用禁止・注意の薬剤 — これだけは絶対ダメ</h2>

        <Callout type="warning" title="他のGLP-1薬との併用は禁止">
          リベルサス・オゼンピック・サクセンダなど<strong>他のGLP-1受容体作動薬とマンジャロの併用は副作用リスクが大幅に上がる</strong>ため禁止です。消化器症状の重篤化、低血糖リスクの増大など、深刻な有害事象が起きる可能性があります。
        </Callout>

        <ComparisonTable
          headers={["薬剤", "リスク", "対応"]}
          rows={[
            ["他のGLP-1薬（リベルサス・オゼンピック等）", "副作用リスクが大幅に増大", "併用禁止。切り替え時は適切な間隔を空ける"],
            ["ワーファリン（ワルファリン）", "作用増強の可能性", "PT-INRのモニタリングを強化"],
            ["SU剤（グリメピリド等）", "低血糖リスク増大", "SU剤の減量を検討"],
          ]}
        />

        <p>併用薬がある方は、マンジャロを始める前に必ず担当医に全ての服用中の薬を伝えてください。副作用や相互作用の詳細については<Link href="/lp/column/mounjaro-side-effects-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロの副作用ガイド</Link>も参考にどうぞ。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 正しい知識で安全に併用</h2>

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li>マンジャロは<strong>血糖依存性</strong>にインスリン分泌を促す→低血糖リスクは低い</li>
          <li>「インスリンが枯渇する」は誤解。むしろ<strong>インスリン抵抗性を改善</strong>して糖尿病予防に</li>
          <li>メトホルミン併用は<strong>7.5mg以上で効果が鈍化した場合</strong>に特に有効</li>
          <li>健康診断への影響はほぼなし。気になるなら<strong>健診週は投与を控える</strong></li>
          <li>精神科薬の体重増加副作用を相殺できるケースあり</li>
          <li><strong>他のGLP-1薬との併用は絶対禁止</strong></li>
        </ul>

        <p>マンジャロは多くの薬と安全に併用できますが、「自己判断での併用」は危険です。必ず担当医に相談してから使い始めましょう。マンジャロ全般の使い方については<Link href="/lp/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロ完全ガイド</Link>、GLP-1薬の全体像は<Link href="/lp/column/glp1-diet-safety-evidence" className="text-sky-600 underline hover:text-sky-800">GLP-1ダイエットのエビデンス</Link>をご覧ください。</p>
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
