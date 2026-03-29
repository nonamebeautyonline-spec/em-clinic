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
const self = articles.find((a) => a.slug === "mounjaro-rebound-prevention")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "マンジャロとリバウンドはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "マンジャロ中止後のリバウンドリスクと「使用前ほど太る人は少ない」というエビデンス",
  "投与間隔を7日→10日→14日と延ばす段階的休薬法＋リベルサス維持への移行",
  "効果が薄れたときの4つの対処法（休薬・増量・メトホルミン併用・生活改善）",
];

const toc = [
  { id: "rebound-myth", label: "「やめたら全部戻る」は本当？" },
  { id: "why-rebound", label: "リバウンドが起きるメカニズム" },
  { id: "tapering", label: "段階的な休薬ステップ" },
  { id: "rybelsus-switch", label: "リベルサス維持への移行" },
  { id: "plateau", label: "効果が薄れてきたときの対処法" },
  { id: "long-term-risk", label: "長期使用のリスクと対策" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「マンジャロやめたら一気にリバウンドするんでしょ？」――SNSではこんな声をよく見かけますよね。でも実際のところ、エビデンスが示しているのは<strong>ちょっと違う話</strong>なんです。この記事では、リバウンドの実態から段階的な休薬の方法、効果が落ちてきたときの対処法までまとめて解説します。
      </p>

      {/* ── やめたら全部戻る？ ── */}
      <section>
        <h2 id="rebound-myth" className="text-xl font-bold text-gray-800">「やめたら全部戻る」は本当？ — SNSの誤情報を検証</h2>

        <p>SNSやYouTubeでは「マンジャロをやめたら即リバウンド」「結局意味ない」みたいな投稿がバズったりしますよね。確かに、過去の臨床試験では<strong>投与中止後に体重が戻る傾向</strong>は報告されています。</p>

        <p>ただし、ここがポイントなんですが――<strong>使用前の体重まで完全に戻ってしまう人は実は少ない</strong>んです。多くの研究で、中止後1年経っても使用前より数%軽い状態を維持できている人が多数派という結果が出ています。</p>

        <img src="/lp/column/images/mounjaro/2010224113693143183-G-XALLybYAABJWm.jpg" alt="マンジャロとリバウンドに関するSNS投稿" className="rounded-xl my-4 w-full" />

        <StatGrid stats={[
          { value: "約2/3", unit: "", label: "中止後も使用前より軽い体重を維持" },
          { value: "1〜2", unit: "ヶ月", label: "はじめに一気に落ちる期間" },
          { value: "7→14", unit: "日", label: "推奨される休薬時の間隔延長" },
        ]} />

        <p>つまり「やめたら全部パー」というのは誤解で、<strong>正しい減薬プロセスと生活習慣の改善を組み合わせれば</strong>、リバウンドを最小限に抑えることは十分可能なんです。</p>
      </section>

      {/* ── リバウンドが起きるメカニズム ── */}
      <section>
        <h2 id="why-rebound" className="text-xl font-bold text-gray-800">リバウンドが起きるメカニズム — 体重のセットポイント理論</h2>

        <p>そもそもなぜリバウンドするのか。マンジャロの使い始め1〜2ヶ月は、落とせる脂肪に「余力」があるのでガクッと体重が落ちます。でもその後は<strong>身体が新しい体重に慣れてきて、減量ペースは緩やか</strong>になります。</p>

        <p>これは身体の「セットポイント」が関係しています。人間の脳は現在の体重を「正常」と認識して維持しようとするんですね。マンジャロで強制的に食欲を抑えて体重を落としても、薬をやめると脳が「元の体重に戻さなきゃ」と食欲を増進させてしまうわけです。</p>

        <Callout type="info" title="目標体重までの短期使用がおすすめ">
          マンジャロは「一生飲み続ける薬」ではなく、<strong>目標体重に達するまでの短期集中使用</strong>が基本的な考え方です。減量中に食事・運動の習慣を身につけ、セットポイントを徐々に下げていくことがリバウンド防止の鍵になります。
        </Callout>
      </section>

      {/* ── 段階的な休薬ステップ ── */}
      <section>
        <h2 id="tapering" className="text-xl font-bold text-gray-800">段階的な休薬ステップ — いきなりやめちゃダメ</h2>

        <p>リバウンドを防ぐ上で最も重要なのが、<strong>いきなり中止しないこと</strong>です。「もう目標体重になったから今日で終わり！」はNGなんですよね。</p>

        <FlowSteps steps={[
          { title: "ステップ1: 投与間隔を10日に延長", desc: "通常の7日間隔を10日に広げて、身体を徐々に慣らします。2〜4週間はこの間隔で様子を見ましょう。" },
          { title: "ステップ2: 投与間隔を14日に延長", desc: "10日間隔で体重が安定していたら、さらに14日（2週間）に延ばします。ここでも2〜4週間キープ。" },
          { title: "ステップ3: 中止", desc: "14日間隔でも体重・食欲が安定していれば、投与を中止します。中止後も1〜2ヶ月は体重を定期的に計測しましょう。" },
        ]} />

        <p>この段階的なテーパリング（漸減法）を行うことで、身体のセットポイントが新しい体重に順応する時間を確保できます。徐々に用量を減らしつつ、食事と運動の習慣を維持していけば、<strong>リバウンドなく経過する人も多い</strong>んですよ。</p>
      </section>

      <InlineCTA />

      {/* ── リベルサス維持への移行 ── */}
      <section>
        <h2 id="rybelsus-switch" className="text-xl font-bold text-gray-800">リベルサス維持への移行 — 注射→内服でソフトランディング</h2>

        <p>「いきなり何もなしは不安…」という方には、<strong>リベルサス3mg（内服GLP-1）を維持量として使う</strong>という方法もあります。注射から内服に変えることで、心理的なハードルも下がりますよね。</p>

        <Callout type="info" title="切り替えのタイミング">
          マンジャロの最終投与から<strong>7日後</strong>にリベルサスの内服を開始できます。リベルサス3mgは維持量としての位置づけなので、大きな副作用も出にくいです。
        </Callout>

        <p>リベルサス3mgでしばらく維持して、体重が安定してきたらリベルサスも徐々にやめていく――という二段階の離脱法です。注射→内服→なし、という<strong>ソフトランディング</strong>ができるので、不安な方にはおすすめの方法です。</p>
      </section>

      {/* ── 効果が薄れてきたときの対処法 ── */}
      <section>
        <h2 id="plateau" className="text-xl font-bold text-gray-800">効果が薄れてきたときの対処法 — 4つのアプローチ</h2>

        <p>「最初はどんどん痩せたのに、最近全然落ちない…」という声もよく聞きます。これは珍しいことではなく、身体が薬に慣れてきた証拠です。対処法は主に4つあります。</p>

        <ComparisonTable
          headers={["対処法", "内容", "おすすめの状況"]}
          rows={[
            ["一時的な休薬", "2週間〜1〜3ヶ月休薬して感受性をリセット", "長期使用で効果が鈍化した場合"],
            ["用量の増量", "医師と相談して次の用量ステップへ", "現在の用量で頭打ちの場合"],
            ["メトホルミン併用", "インスリン抵抗性を改善して相乗効果", "特に7.5mg以上で効果が薄い場合"],
            ["生活習慣の見直し", "食事内容・運動量・睡眠の再チェック", "どの段階でも基本として"],
          ]}
        />

        <p>特に<strong>メトホルミンの併用</strong>は、マンジャロ7.5mg以上を使用していて効果が感じづらくなった場合に有効なケースが多いです。メトホルミンの詳細については<Link href="/lp/column/glp1-medication-comparison" className="text-sky-600 underline hover:text-sky-800">GLP-1受容体作動薬の比較ガイド</Link>もあわせてご覧ください。</p>
      </section>

      {/* ── 長期使用のリスクと対策 ── */}
      <section>
        <h2 id="long-term-risk" className="text-xl font-bold text-gray-800">長期使用のリスクと対策 — 骨と筋肉を守る</h2>

        <p>マンジャロを長期間使い続けると、体重だけでなく<strong>筋肉量や骨密度にも影響が出る可能性</strong>があります。急激な体重減少は骨粗鬆症や筋力低下のリスクを高めるんですよね。</p>

        <Callout type="warning" title="長期使用時の注意点">
          <strong>タンパク質を多めに摂取</strong>（体重1kgあたり1.2〜1.6g/日）し、<strong>週2〜3回の筋力トレーニング</strong>を取り入れることで、筋肉量の低下を最小限に抑えられます。減量＝脂肪だけ落とす、が理想です。
        </Callout>

        <p>だからこそ、マンジャロは目標体重に到達したら段階的にやめていくのが基本なんです。「楽だから」とずっと使い続けるのは、骨や筋肉の健康を考えるとあまりおすすめできません。休薬中は食事と運動の習慣づくりが体重維持のカギになります。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 正しくやめれば怖くない</h2>

        <p>マンジャロのリバウンドについて、ポイントをまとめると：</p>

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li>「やめたら使用前に戻る」は誤解。正しい休薬で体重を維持できる人が多い</li>
          <li>投与間隔を<strong>7日→10日→14日</strong>と段階的に延ばしてから中止する</li>
          <li>不安な場合はリベルサス3mgへの移行でソフトランディング</li>
          <li>効果が薄れたら休薬・増量・メトホルミン併用・生活改善の4択</li>
          <li>長期使用は骨・筋肉リスクあり。タンパク質＋筋トレで対策</li>
        </ul>

        <p>マンジャロはあくまで<strong>目標体重に到達するための短期集中ツール</strong>。使っている間に食事と運動の習慣を身につけて、自然にやめられる状態を目指しましょう。詳しい使い方については<Link href="/lp/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロ完全ガイド</Link>をご覧ください。</p>
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
