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
const self = articles.find((a) => a.slug === "mounjaro-injection-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/clinic/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/clinic/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "マンジャロの正しい打ち方ガイドはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "アテオスの5ステップ手順 — 消毒→キャップ外す→ロック解除→押し当て→10秒待つ",
  "注射部位はお腹・太もも・上腕をローテーション。脂肪萎縮防止で毎回ずらす",
  "投与間隔は原則7日。短縮は副作用リスク↑、延長はOK。保管は冷蔵2〜8℃",
];

const toc = [
  { id: "injection-steps", label: "打ち方5ステップ" },
  { id: "injection-site", label: "注射部位の選び方とローテーション" },
  { id: "timing-interval", label: "投与間隔とタイミング" },
  { id: "pain-tips", label: "痛みを減らすコツ" },
  { id: "check-success", label: "正しく打てたか確認する方法" },
  { id: "storage", label: "保管方法と注意点" },
  { id: "myths", label: "液漏れ・失敗時の対処" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        マンジャロを処方されたけど、「自分で注射するの怖い……」と不安に思っている方、意外と多いんです。でも大丈夫。マンジャロのアテオス（オートインジェクター）はボタンひとつで完了する設計で、慣れれば30秒もかかりません。この記事では、正しい手順・部位選び・投与間隔・失敗時の対処法まで全部まとめました。
      </p>

      {/* ── セクション1: 打ち方5ステップ ── */}
      <section>
        <h2 id="injection-steps" className="text-xl font-bold text-gray-800">打ち方5ステップ — アテオスの使い方</h2>

        <p>マンジャロの注射器「アテオス」は、ペン型のオゼンピックと違って<strong>オートインジェクター</strong>方式。難しい操作は一切ありません。</p>

        <FlowSteps steps={[
          { title: "ステップ1: アルコール消毒", desc: "注射部位をアルコール綿で拭いて清潔にする" },
          { title: "ステップ2: 灰色キャップを外す", desc: "底面の灰色キャップをまっすぐ引き抜く" },
          { title: "ステップ3: ロック解除", desc: "紫のロックリングを回して解除。カチッと音がする" },
          { title: "ステップ4: お腹の脂肪に押し当ててボタン", desc: "皮膚に垂直に押し当て、紫のボタンを押す。1回目のカチッで注射開始" },
          { title: "ステップ5: 10秒待つ", desc: "2回目のカチッ音が鳴るまでそのまま保持。これで投与完了" },
        ]} />

        <img src="/clinic/column/images/mounjaro/1814993947313537264-GTAjzztbIAA8uJx.jpg" alt="マンジャロ アテオスの使い方手順" className="rounded-xl my-4 w-full" />

        <Callout type="info" title="皮下注射のポイント">
          マンジャロは<strong>皮下注射</strong>、つまり脂肪層に打つ薬です。筋肉に打ってしまうと薬の吸収が早くなりすぎて、効果が短期間で切れてしまいます。お腹のつまめる脂肪部分に打つのがベストです。
        </Callout>
      </section>

      {/* ── セクション2: 注射部位の選び方 ── */}
      <section>
        <h2 id="injection-site" className="text-xl font-bold text-gray-800">注射部位の選び方とローテーション</h2>

        <p>注射できる部位は<strong>3か所</strong>あります。</p>

        <ComparisonTable
          headers={["部位", "ポイント", "注意点"]}
          rows={[
            ["お腹", "おへそから5cm以上離す。一番脂肪が多く打ちやすい", "おへそ周辺は避ける"],
            ["太もも", "前面の中央あたり。座った状態でつまめる部分", "内側・外側は避ける"],
            ["上腕", "二の腕の裏側。自分では打ちにくいので、人に頼むのが理想", "自己注射には不向き"],
          ]}
        />

        <p>ここで重要なのが<strong>「毎回ずらす」</strong>こと。同じ場所に打ち続けると<strong>炎症やしこり、あるいは脂肪萎縮</strong>（皮下脂肪がへこむ）の原因になります。おへそ周辺は吸収が不安定になる可能性があるため、<strong>へそから5cm以上離して脂肪がしっかりあるところ</strong>に打つようにしましょう。</p>

        <img src="/clinic/column/images/mounjaro/1843474464627143113-GZVWEoeasAE1eXA.jpg" alt="注射部位のローテーション方法" className="rounded-xl my-4 w-full" />
      </section>

      {/* ── セクション3: 投与間隔とタイミング ── */}
      <section>
        <h2 id="timing-interval" className="text-xl font-bold text-gray-800">投与間隔とタイミング — 7日ルールの理由</h2>

        <p>マンジャロの投与間隔は<strong>原則7日（週1回）</strong>です。これには薬物動態的な理由があります。</p>

        <StatGrid stats={[
          { value: "24", unit: "時間", label: "最高血中濃度到達" },
          { value: "5〜6", unit: "日", label: "半減期（血中濃度が半分になるまで）" },
          { value: "7", unit: "日", label: "推奨投与間隔" },
        ]} />

        <p>投与後約24時間で血中濃度がピークに達し、5〜6日かけて半分に減っていきます。7日間隔で打つことで、<strong>血中濃度が適度な範囲で安定</strong>するように設計されているんですね。</p>

        <Callout type="warning" title="間隔を短くするのはNG">
          7日より短い間隔で打つと、前回分がまだ残っている状態で追加されるため<strong>血中濃度が蓄積</strong>します。これは副作用（吐き気・下痢）のリスクを大幅に上げるのでやめましょう。逆に、旅行などで1〜2日遅れるのは問題ありません。
        </Callout>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">打つタイミング</h3>
        <p>食後すぐは避けるのがベター。マンジャロは胃の動きをゆっくりにする作用があるので、食後に打つと吐き気が出やすくなります。<strong>朝起きてすぐ</strong>や、<strong>食後数時間経った空腹時</strong>が理想的です。</p>
      </section>

      <InlineCTA />

      {/* ── セクション4: 痛みを減らすコツ ── */}
      <section>
        <h2 id="pain-tips" className="text-xl font-bold text-gray-800">痛みを減らすコツ — 4つのテクニック</h2>

        <p>「注射が痛そう」と心配する方は多いですが、アテオスの針は極細なので、<strong>実際はほとんど痛くない</strong>という声が大半です。それでも不安な方は、以下のテクニックを試してみてください。</p>

        <FlowSteps steps={[
          { title: "冷やす", desc: "注射前に保冷剤で部位を10秒ほど冷やすと感覚が鈍くなる" },
          { title: "薬液を常温に戻す", desc: "冷蔵庫から出して30分ほど室温に置く。冷たい液は刺激を感じやすい" },
          { title: "皮膚を押さえてから打つ", desc: "注射部位の周囲を軽く押さえることで痛みが分散する" },
          { title: "リラックスして息を吐く", desc: "力が入ると痛みを感じやすい。深呼吸して息を吐くタイミングでボタンを押す" },
        ]} />
      </section>

      {/* ── セクション5: 正しく打てたか確認 ── */}
      <section>
        <h2 id="check-success" className="text-xl font-bold text-gray-800">正しく打てたか確認する方法</h2>

        <p>打ち終わった後に「ちゃんと入った？」と不安になること、ありますよね。確認ポイントは<strong>2つだけ</strong>です。</p>

        <ComparisonTable
          headers={["チェック項目", "OK", "NG"]}
          rows={[
            ["ボタンの状態", "押し込まれている", "元に戻っている"],
            ["薬液窓", "空（透明）になっている", "液が残っている"],
          ]}
        />

        <p>この2つがOKなら、<strong>痛みがなくても、出血がなくても、問題ありません</strong>。「痛くなかったから入ってないのでは？」と心配する方がいますが、痛みの有無は注射の成否とは関係ないんです。</p>

        <img src="/clinic/column/images/mounjaro/1831742544939720775-GWuoIpCaQAAZDwG.jpg" alt="マンジャロ注射の成功確認方法" className="rounded-xl my-4 w-full" />
      </section>

      {/* ── セクション6: 保管方法 ── */}
      <section>
        <h2 id="storage" className="text-xl font-bold text-gray-800">保管方法と注意点</h2>

        <StatGrid stats={[
          { value: "2〜8", unit: "℃", label: "冷蔵保管の温度" },
          { value: "21", unit: "日", label: "室温30℃以下での保管上限" },
        ]} />

        <p>基本は<strong>冷蔵庫（2〜8℃）</strong>で保管してください。ドアポケットは温度変化が大きいので、奥の方に置くのがベスト。室温（30℃以下）なら最大21日まで保管できるので、旅行先に持っていくことも可能です。</p>

        <Callout type="warning" title="凍結はNG">
          一度でも凍結した場合は廃棄してください。解凍しても薬効が保証されません。冬場に宅配便で届いた際、保冷剤が凍結していて薬も凍ってしまうケースがあるので注意。
        </Callout>
      </section>

      {/* ── セクション7: 液漏れ・失敗時 ── */}
      <section>
        <h2 id="myths" className="text-xl font-bold text-gray-800">液漏れ・失敗時の対処 — 慌てなくて大丈夫</h2>

        <p>注射後に針を抜いたら<strong>数滴液が漏れた</strong>……これ、結構あるあるなんです。でも安心してください。アテオスの構造上、微量の液漏れは想定内で、<strong>効果への影響はほぼありません</strong>。</p>

        <p>ただし、薬液窓に液が大量に残っている場合は注射が途中で止まった可能性があります。その場合は<strong>同じアテオスで再注射せず、医師に相談</strong>してください。</p>

      </section>

      {/* ── セクション8: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <p>マンジャロの注射は、慣れてしまえば本当に簡単です。5ステップの手順を守り、部位をローテーションし、7日間隔を維持すれば問題なし。「痛くない」「液漏れしても大丈夫」「冷蔵保管」の3つを覚えておけば、日常生活に無理なく組み込めますよ。</p>

        <p>マンジャロの基本について知りたい方は<Link href="/clinic/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロとは？初心者向け入門ガイド</Link>を、副作用が気になる方は<Link href="/clinic/column/mounjaro-side-effects-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロの副作用と対処法</Link>をご覧ください。リバウンド対策は<Link href="/clinic/column/mounjaro-rebound-prevention" className="text-sky-600 underline hover:text-sky-800">マンジャロとリバウンド</Link>で解説しています。</p>
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
