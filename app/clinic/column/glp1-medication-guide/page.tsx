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
const self = articles.find((a) => a.slug === "glp1-medication-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "GLP-1受容体作動薬とははオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "GLP-1はインクレチンホルモンの一種で、血糖依存的にインスリン分泌を促す",
  "低血糖リスクは他の糖尿病薬と比較して低い — 正しく理解する",
  "世界初の経口GLP-1受容体作動薬リベルサスはSNAC技術で実現した",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「GLP-1ってよく聞くけど、結局なんなの？」——そんな疑問、ありますよね。実はGLP-1は私たちの体が<strong>もともと持っているホルモン</strong>です。この記事では、GLP-1が体の中で何をしているのか、なぜ低血糖になりにくいのか、注射薬から飲み薬（リベルサス）が生まれるまでの道のりを、<strong>できるだけわかりやすく</strong>お話しします。
      </p>

      {/* ── セクション1: GLP-1ってそもそも何？ ── */}
      <section>
        <h2 id="glp1-mechanism" className="text-xl font-bold text-gray-800">GLP-1ってそもそも何？ 体の中で何をしているのか</h2>

        <p>まず大前提として知っておいてほしいのが、<strong>GLP-1は「薬の名前」ではなく「ホルモンの名前」</strong>だということ。食事をとると、小腸のL細胞というところからGLP-1が分泌されます。つまり、あなたの体は毎日GLP-1を作っているんです。</p>

        <p>では、このGLP-1は体の中で何をしているのか？ ざっくり言うと、<strong>「血糖値が高いときだけインスリンを出す司令塔」</strong>です。ここがポイントで、血糖値が正常に戻ればインスリンの分泌も自然とおさまります。さらに、胃の動きをゆっくりにして満腹感を持続させたり、脳の食欲中枢に「もうお腹いっぱいだよ」と信号を送ったりもします。</p>

        <FlowSteps steps={[
          { title: "食事をとる", desc: "食べ物が小腸に届くと、L細胞が「食事が来たぞ」と感知してGLP-1を分泌。" },
          { title: "GLP-1が血中へ", desc: "ただし天然のGLP-1はたった2分で分解される。ものすごく短命なホルモン。" },
          { title: "インスリンが出る", desc: "膵臓のβ細胞に届いて、血糖値が高い場合だけインスリン分泌をブースト。" },
          { title: "血糖が下がり、食欲も落ち着く", desc: "血糖コントロールに加え、胃の動きを緩やかにして食欲も自然に抑えてくれる。" },
        ]} />

        <p>つまりGLP-1は、<strong>血糖値と食欲の両方に効く「体内の調整役」</strong>なんです。GLP-1受容体作動薬（オゼンピックやリベルサスなど）は、この天然ホルモンの働きを真似した薬。ただし天然のGLP-1は半減期がたった2分なので、そのままでは薬にならない——ここから製薬メーカーの挑戦が始まりました。リベルサス・オゼンピック・マンジャロの3薬剤を比較したい方は<Link href="/clinic/column/glp1-medication-comparison" className="text-sky-600 underline hover:text-sky-800">GLP-1薬剤比較ガイド</Link>もあわせてどうぞ。なかでもGIP/GLP-1デュアル作動薬として注目されるマンジャロについては<Link href="/clinic/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロの詳細ガイド</Link>で詳しく解説しています。</p>
      </section>

      {/* ── セクション2: 低血糖が怖い？ ── */}
      <section>
        <h2 id="insulin-risk" className="text-xl font-bold text-gray-800">「低血糖にならないの？」その不安、ほぼ心配いりません</h2>

        <p>GLP-1の薬を検討するとき、多くの方が気にするのが<strong>「血糖が下がりすぎないか」</strong>という点。これはとても大事な質問です。でも結論から言うと、GLP-1受容体作動薬を単独で使う場合、低血糖リスクはかなり低いです。</p>

        <p>なぜか？ さきほどお話しした「血糖依存的」という性質を思い出してください。<strong>血糖値が正常まで下がると、GLP-1の作用も自動的にブレーキがかかる</strong>仕組みになっています。これは他の糖尿病薬と比べると大きな違いです。</p>

        <ComparisonTable
          headers={["薬の種類", "代表的な薬", "仕組み", "低血糖リスク"]}
          rows={[
            ["SU剤（スルホニル尿素薬）", "アマリール、グリミクロン", "血糖値に関係なくインスリンを出し続ける", "高い"],
            ["インスリン製剤", "ノボラピッド、ランタス等", "外からインスリンを直接注入", "高い"],
            ["DPP-4阻害薬", "ジャヌビア、エクア等", "体内のGLP-1が分解されにくくする", "低い（単剤時）"],
            ["GLP-1受容体作動薬", "リベルサス、オゼンピック等", "血糖が高いときだけインスリン分泌を促す", "低い（単剤時）"],
          ]}
        />

        <p>表を見るとわかるとおり、SU剤やインスリンは「血糖値がどうであろうとお構いなし」に作用します。だから食事を抜いたり運動しすぎたりすると低血糖が起きやすい。一方、<strong>GLP-1受容体作動薬には「血糖値が正常なら作用しない」という安全装置が組み込まれている</strong>わけです。</p>

        <Callout type="info" title="じゃあ絶対に低血糖にならないの？">
          薬そのものが低血糖を起こすことはほぼありません。ただし注意が必要なのは、<strong>食欲抑制の効果が強く出て、極端に食事量が減ってしまうケース</strong>です。薬のせいではなく「食べなさすぎ」が原因ということ。だからこそ、適切な食事を続けることがとても大切です。また、SU剤やインスリンと併用する場合はリスクが上がるので、必ず主治医と相談してください。
        </Callout>
      </section>

      {/* ── セクション3: 注射薬の誕生 ── */}
      <section>
        <h2 id="injection-history" className="text-xl font-bold text-gray-800">オゼンピックやサクセンダはどうやって生まれた？</h2>

        <p>天然のGLP-1は体内でたった2分で消えてしまう——これが最大の壁でした。2分しか効かないホルモンを、どうやって薬にするのか？ 研究者たちが取った戦略は、<strong>「分解されにくいように分子構造を改造する」</strong>というものでした。</p>

        <p>たとえばオゼンピックの有効成分「セマグルチド」は、天然GLP-1のアミノ酸配列を<strong>94%そのまま残しつつ</strong>、分解酵素（DPP-4）に切られやすい部分だけを巧みに変更しています。さらに脂肪酸の「しっぽ」をくっつけて血中のアルブミンにくっつきやすくした結果、半減期が2分から<strong>なんと約1週間</strong>にまで延びました。</p>

        <p>この技術のおかげで、オゼンピックは<strong>週1回の注射</strong>、サクセンダ（リラグルチド）は<strong>1日1回の注射</strong>で効果が続く薬として実用化されたのです。</p>

        <p>ただ、ここで新たな問題が出てきます。<strong>「注射はやっぱり怖い」</strong>という患者さんの声です。特にダイエット目的の方や、糖尿病の初期段階の方にとって、自分で注射を打つというのはかなりハードルが高い。「同じ成分を飲み薬で出せないのか？」——そう考えるのは自然な流れですよね。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: 飲み薬は不可能だった ── */}
      <section>
        <h2 id="oral-challenge" className="text-xl font-bold text-gray-800">なぜ「GLP-1を飲み薬にするのは無理」と言われていたのか</h2>

        <p>実は、GLP-1を飲み薬にするのは製薬業界で<strong>「ほぼ不可能」</strong>とされていました。なぜか？ 理由は3つあります。</p>

        <p>まず、<strong>胃酸で壊れる</strong>。GLP-1はペプチド（アミノ酸のつながり）なので、pH1〜2という強酸性の胃の中ではあっという間にボロボロになります。次に、<strong>消化酵素にも分解される</strong>。胃にはペプシンというタンパク質分解酵素がいて、ペプチド結合を容赦なく切ってしまう。そして最後に、<strong>分子が大きすぎて腸から吸収できない</strong>。普通の飲み薬は分子量500以下ですが、セマグルチドは約4,000。桁が違います。</p>

        <p>つまり、飲んでも胃で壊され、仮に壊されなくても吸収されない。<strong>「ペプチドの飲み薬は原理的に無理」</strong>——これが長年の常識だったんです。しかし、この常識をひっくり返す技術が登場しました。</p>
      </section>

      {/* ── セクション5: リベルサス誕生 ── */}
      <section>
        <h2 id="rybelsus-birth" className="text-xl font-bold text-gray-800">「不可能」を可能にしたSNAC——リベルサス誕生の裏側</h2>

        <p>2019年、ノボ ノルディスク社がついに世界初の経口GLP-1受容体作動薬「リベルサス」を発売しました。その秘密が<strong>SNAC（サルカプロザートナトリウム）</strong>という吸収促進剤です。</p>

        <p>SNACはセマグルチドと1:1でくっついて複合体を作り、3段階のメカニズムで「飲んで効く」を実現します。まず、胃の中の酸性度を<strong>局所的にやわらげて</strong>セマグルチドが壊れるのを防ぐ。次に、消化酵素からセマグルチドを<strong>ガードする</strong>。そして、胃の粘膜細胞の隙間を一時的に広げて、セマグルチドを<strong>胃壁から直接吸収させる</strong>。</p>

        <Callout type="point" title="リベルサスの吸収場所は「胃」——だから服用ルールが独特">
          ここが面白いポイントなのですが、リベルサスが吸収されるのは小腸ではなく<strong>胃</strong>です。SNACが胃の粘膜に局所的に作用して吸収を促すので、<strong>「空腹時にコップ半分の水で飲み、その後30分は飲食しない」</strong>というルールが必要になります。食べ物や水が多いとSNACの濃度が薄まって、せっかくの薬がうまく吸収されなくなるからです。
        </Callout>

        <p>「ペプチドは飲み薬にできない」——この常識を覆したSNAC技術のインパクトは計り知れません。注射が怖くて治療に踏み出せなかった患者さんにも、<strong>同じ有効成分を口から届けられる</strong>という選択肢が生まれたのですから。</p>
      </section>

      {/* ── セクション6: バイオアベイラビリティ ── */}
      <section>
        <h2 id="bioavailability" className="text-xl font-bold text-gray-800">吸収率たった1%——それでもリベルサスが毎日の服用で効くワケ</h2>

        <p>SNACのおかげで飲み薬になったリベルサスですが、実は<strong>吸収率（バイオアベイラビリティ）はわずか約1%</strong>です。飲んだ薬の99%は体に吸収されずに出ていってしまう。注射のオゼンピックがほぼ100%吸収されることを考えると、驚くほど低い数字ですよね。</p>

        <StatGrid stats={[
          { value: "約1", unit: "%", label: "リベルサスのバイオアベイラビリティ" },
          { value: "約1週間", unit: "", label: "セマグルチドの血中半減期" },
          { value: "94", unit: "%", label: "ヒトGLP-1とのアミノ酸配列同一率" },
        ]} />

        <p>「1%しか吸収されないのに、ちゃんと効くの？」と思いますよね。ここがポイントです。セマグルチドは一度血中に入ると<strong>約1週間も残り続ける</strong>という性質を持っています。注射のオゼンピックが週1回で済むのもこの長い半減期のおかげ。</p>

        <p>リベルサスの場合は、1回あたりの吸収量は少ないけれど、<strong>毎日コツコツ吸収させることで血中濃度を積み上げていく</strong>という戦略を取っています。たとえるなら、バケツに毎日少しずつ水を入れて、蒸発（分解）する量と釣り合うところで水位を保つイメージです。</p>

        <p>だからこそ、<strong>服用ルールを守ることが本当に大切</strong>。もともと1%しか吸収されないのに、空腹時に飲まなかったり水が多すぎたりすると、その1%すらさらに減ってしまいます。LINEでの服薬リマインドなど、患者さんの服用習慣をサポートする仕組みが効果に直結します。</p>
      </section>

      <InlineCTA />

      {/* ── セクション7: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ——GLP-1の薬を正しく知ることが、正しい治療の第一歩</h2>

        <p>ここまでの内容を振り返ると、GLP-1受容体作動薬は<strong>体がもともと持っているホルモンの仕組みを活かした薬</strong>であり、血糖値が正常なら作用しないという安全装置が備わっていること、注射薬は分子構造の改造で半減期を2分から1週間に延ばしたこと、そして飲み薬のリベルサスはSNAC技術で「不可能」を可能にしたことがわかりました。</p>

        <p>吸収率1%という数字だけ見ると不安になるかもしれませんが、毎日の服用と長い半減期の組み合わせで<strong>しっかりと治療に必要な血中濃度が維持できる</strong>ことが臨床試験で確認されています。大事なのは、仕組みを正しく理解したうえで、服用ルールをきちんと守ること。それがGLP-1受容体作動薬の効果を最大限に引き出す鍵です。</p>

        <Callout type="point" title="もっと詳しく知りたい方へ">
          GLP-1受容体作動薬の<strong>安全性エビデンス</strong>については<Link href="/clinic/column/glp1-diet-safety-evidence" className="text-emerald-700 underline">「GLP-1ダイエットは危険？ — 臨床エビデンスから安全性を検証」</Link>、リベルサスの<strong>副作用と対処法</strong>については<Link href="/clinic/column/rybelsus-side-effects-guide" className="text-emerald-700 underline">「リベルサスの副作用ガイド」</Link>、<strong>用量調整と服用方法</strong>の詳細は<Link href="/clinic/column/rybelsus-effective-dosing" className="text-emerald-700 underline">「リベルサスの効果的な服用ガイド」</Link>をあわせてご覧ください。
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
