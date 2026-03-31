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
const self = articles.find((a) => a.slug === "metformin-personal-import-risk")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "メトホルミンの個人輸入は危険？はオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "海外通販サイトでのメトホルミン個人輸入は偽造薬・不純物混入のリスクが高い",
  "メトホルミンの重篤副作用「乳酸アシドーシス」は命に関わる — 医師の管理下で使うべき薬",
  "国内オンライン診療なら安全かつ比較的安価にメトホルミンを処方してもらえる",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「メトホルミンって海外通販で買えるらしいけど、大丈夫なの？」——SNSやダイエット系掲示板でこんな話題を目にする機会が増えました。<strong>結論から言うと、個人輸入はかなりリスキーです。</strong>偽造薬、品質管理の問題、そして最悪の場合は命に関わる副作用まで。この記事では、メトホルミンの基本から個人輸入の具体的な危険性、安全に手に入れる方法までまとめてお伝えします。
      </p>

      {/* ── セクション1: メトホルミンとは ── */}
      <section>
        <h2 id="what-is-metformin" className="text-xl font-bold text-gray-800">メトホルミンってそもそもどんな薬？</h2>

        <p>メトホルミンは<strong>60年以上の歴史を持つ糖尿病治療薬</strong>です。世界中で最も処方されている血糖降下薬のひとつで、主に肝臓での糖の産生を抑えて血糖値を下げる仕組み。安価で実績が豊富なことから「糖尿病治療の第一選択」とされています。</p>

        <p>最近では、ダイエット目的で<Link href="/clinic/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロ</Link>などのGLP-1受容体作動薬と併用するケースも増えています。特にマンジャロ7.5mg以上で体重減少が鈍ってきた場合に、メトホルミンを追加して代謝をもうひと押しする……という使い方ですね。</p>

        <StatGrid stats={[
          { label: "使用歴", value: "60年以上" },
          { label: "世界処方ランキング", value: "トップクラス" },
          { label: "主な作用", value: "肝臓での糖産生抑制" },
          { label: "日本での扱い", value: "処方薬（要診察）" },
        ]} />
      </section>

      {/* ── セクション2: 個人輸入が増えている背景 ── */}
      <section>
        <h2 id="why-personal-import" className="text-xl font-bold text-gray-800">なぜ個人輸入する人が増えているの？</h2>

        <p>理由はシンプルで、<strong>「安く手軽に買えるから」</strong>です。海外通販サイトでは1ヶ月分が数百円〜数千円程度で出回っていて、しかも処方箋なしで購入できてしまいます。</p>

        <p>「クリニックに行くのが面倒」「診察代がもったいない」という気持ちはわかります。でも、その手軽さの裏にはかなり深刻なリスクが潜んでいるんです。</p>
      </section>

      {/* ── セクション3: 海外通販のリスク5選 ── */}
      <section>
        <h2 id="five-risks" className="text-xl font-bold text-gray-800">海外通販のリスク5選 — 知らなかったでは済まない</h2>

        <h3 id="risk-fake" className="text-lg font-bold text-gray-800 mt-6">リスク1: 偽造薬の可能性</h3>
        <p>これが一番怖い話です。海外通販で流通している医薬品の中には、<strong>有効成分がまったく入っていないもの、不純物が混入しているもの、用量が表示と違うもの</strong>が確認されています。見た目は本物そっくりでも、中身は別物——なんてケースが実際にあるわけです。</p>

        <h3 id="risk-quality" className="text-lg font-bold text-gray-800 mt-6">リスク2: 品質管理の問題</h3>
        <p>正規の医薬品メーカーはGMP（医薬品適正製造基準）という厳しい品質管理のもとで製造しています。ところが、海外の安価なジェネリック工場の中には<strong>GMPを満たしていない製造環境</strong>で作っているところもあります。保管・輸送中の温度管理も不十分なことが多いです。</p>

        <h3 id="risk-side-effects" className="text-lg font-bold text-gray-800 mt-6">リスク3: 副作用が出ても管理できない</h3>
        <p>メトホルミンには後で詳しく説明する<strong>「乳酸アシドーシス」という命に関わる副作用</strong>があります。本来は定期的な血液検査で腎機能をチェックしながら使う薬なのですが、個人輸入だとそのモニタリングがゼロ。副作用の初期症状に気づいても、「自分で勝手に買った薬なので相談しにくい」と受診が遅れがちになります。</p>

        <h3 id="risk-legal" className="text-lg font-bold text-gray-800 mt-6">リスク4: 税関規制と法律リスク</h3>
        <p>個人使用目的であっても、医薬品の輸入には<strong>数量制限</strong>があります。処方薬は原則1ヶ月分まで。それを超えると税関で止められるだけでなく、薬機法違反になる可能性もあります。</p>

        <h3 id="risk-no-consultation" className="text-lg font-bold text-gray-800 mt-6">リスク5: 医師に相談できない</h3>
        <p>個人輸入で入手した薬について「実は飲んでます」と医師に打ち明けるのは、心理的にかなりハードルが高いですよね。でも、<strong>飲み合わせの問題や体質に合わない場合、相談できないのは致命的</strong>です。</p>

        <Callout type="warning" title="自己責任では済まないリスク">
          海外個人輸入で入手したメトホルミンによる健康被害は自己責任です。万が一偽造薬や不良品で健康被害が生じても、国の医薬品副作用被害救済制度の対象外となります。つまり、補償を受けられません。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セクション4: 乳酸アシドーシスの危険性 ── */}
      <section>
        <h2 id="lactic-acidosis" className="text-xl font-bold text-gray-800">乳酸アシドーシス — メトホルミン最大の「怖い副作用」</h2>

        <p>乳酸アシドーシスは、血液中に乳酸が異常に蓄積して体が酸性に傾く状態のこと。<strong>発症頻度は低い（10万人年あたり数件）ものの、発症すると致死率は約50%</strong>とされています。</p>

        <FlowSteps steps={[
          { title: "メトホルミン蓄積", desc: "腎機能低下などで排出が追いつかない" },
          { title: "乳酸が増加", desc: "代謝経路が乳酸産生に傾く" },
          { title: "アシドーシス発症", desc: "嘔吐・腹痛・過呼吸・意識障害" },
          { title: "緊急入院", desc: "透析や集中治療が必要になることも" },
        ]} />

        <p>特にリスクが高いのは<strong>腎機能が低下している人、脱水状態の人、過度の飲酒者</strong>です。医師のもとで処方を受けていれば、定期的な腎機能チェックでこうしたリスクを事前に回避できます。個人輸入だと、この安全ネットがまったくないわけです。</p>

        <ComparisonTable
          headers={["項目", "医師処方の場合", "個人輸入の場合"]}
          rows={[
            ["処方前の検査", "腎機能・肝機能を確認", "なし"],
            ["定期モニタリング", "血液検査で腎機能を追跡", "なし"],
            ["用量調整", "体調に合わせて増減", "自己判断"],
            ["副作用対応", "すぐ相談・変更可能", "受診をためらいがち"],
            ["薬の品質保証", "GMP準拠の正規品", "保証なし"],
          ]}
        />
      </section>

      {/* ── セクション5: 安全な入手方法 ── */}
      <section>
        <h2 id="safe-access" className="text-xl font-bold text-gray-800">安全な入手方法 — オンライン診療という選択肢</h2>

        <p>「でもクリニックに行く時間がない……」という人に朗報です。今は<strong>オンライン診療でメトホルミンを処方してもらえる</strong>クリニックがかなり増えています。</p>

        <p>スマホで15分程度の診察を受けて、薬が自宅に届く。しかも国内の正規品なので品質は確実。個人輸入と比べても費用はそこまで変わらないことが多いです。</p>

        <FlowSteps steps={[
          { title: "オンライン予約", desc: "スマホから数分で完了" },
          { title: "ビデオ診察", desc: "医師と15分程度の問診" },
          { title: "処方・決済", desc: "必要な検査もあわせて相談" },
          { title: "自宅に届く", desc: "正規品が最短翌日到着" },
        ]} />

        <p>特に<Link href="/clinic/column/mounjaro-blood-sugar-medications" className="text-sky-600 underline hover:text-sky-800">マンジャロと血糖関連薬の併用</Link>を検討している方は、必ず医師に相談して適切な用量を決めてもらいましょう。メトホルミンとGLP-1受容体作動薬の併用は効果的ですが、低血糖リスクなどの管理が必要です。</p>

        <p><Link href="/clinic/column/glp1-medication-comparison" className="text-sky-600 underline hover:text-sky-800">GLP-1受容体作動薬の種類比較</Link>も参考にしてみてください。自分に合った治療の組み合わせを見つけるヒントになるはずです。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 安さの代償は健康で支払うことになる</h2>

        <p>メトホルミンは素晴らしい薬です。60年以上の実績があり、糖尿病治療だけでなくダイエットのサポートとしても注目されています。でも、<strong>「安全に使えてこそ」の話</strong>です。</p>

        <p>海外通販サイトで安く手に入るからといって、偽造薬のリスク、品質管理の不備、乳酸アシドーシスの危険——これらを天秤にかけたとき、「数千円の節約」は割に合いません。</p>

        <p>国内のオンライン診療なら、自宅にいながら医師の診察を受けて正規品を入手できます。定期的な検査も相談できるので、安心して使い続けられますよ。</p>

        <Callout type="info" title="ポイントまとめ">
          メトホルミンは必ず医師の処方のもとで使いましょう。海外個人輸入は偽造薬・乳酸アシドーシス・法律違反のリスクがあります。オンライン診療なら安全かつ手軽に処方を受けられます。
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
