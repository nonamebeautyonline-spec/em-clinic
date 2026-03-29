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
const self = articles.find((a) => a.slug === "isotretinoin-acne-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const faqItems = [
  { q: "イソトレチノイン（アキュテイン）完全ガイドはオンライン診療で処方できますか？", a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
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
  "イソトレチノインは累積投与量120-150mg/kgで長期寛解率85%以上の重症ニキビ治療薬",
  "催奇形性はFDAカテゴリーX（絶対禁忌）— 女性は治療前後含め厳格な避妊管理が必須",
  "日本では未承認のため自費診療 — 定期的な血液検査と医師の管理のもとで使う薬",
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={[]}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「何をやってもニキビが治らない」「抗生物質もダメだった」——そんな方が最後にたどり着くのがイソトレチノイン（商品名: アキュテイン、ロアキュタン、イソトロインなど）です。<strong>重症ニキビに対する「最後の切り札」</strong>とも呼ばれるこの薬、効果は非常に高いのですが、知っておくべきリスクもかなりあります。この記事では、作用の仕組みからエビデンス、必要な検査、副作用まで全部まとめてお伝えします。
      </p>

      {/* ── セクション1: イソトレチノインとは ── */}
      <section>
        <h2 id="what-is-isotretinoin" className="text-xl font-bold text-gray-800">イソトレチノインってどんな薬？</h2>

        <p>イソトレチノインはビタミンA誘導体（レチノイド）に分類される内服薬です。もともとは1982年にアメリカで承認されて以来、<strong>重症の結節性・嚢胞性ニキビの治療</strong>に使われてきました。</p>

        <p>日本では未承認医薬品なので保険は使えませんが、自費診療（オンライン診療含む）で処方してもらうことは可能です。<strong>日本で処方されるイソトレチノインはすべて海外からの輸入品</strong>になります。</p>

        <StatGrid stats={[
          { label: "分類", value: "ビタミンA誘導体" },
          { label: "治療期間", value: "通常4〜6ヶ月" },
          { label: "長期寛解率", value: "85%以上" },
          { label: "日本での扱い", value: "未承認・自費診療" },
        ]} />

        <h3 id="brand-names" className="text-lg font-bold text-gray-800 mt-6">イソトレチノインの商品名・種類一覧</h3>

        <p>イソトレチノインにはいくつかの商品名があります。先発品のアキュテインは現在すでに販売終了しており、クリニックで処方されるのは基本的にジェネリック品です。</p>

        <ComparisonTable
          headers={["商品名", "製造元", "用量規格", "特徴"]}
          rows={[
            ["アキュテイン（Accutane）", "ロシュ（米国）", "10mg / 20mg / 40mg", "先発品。現在は販売終了"],
            ["ロアキュタン（Roaccutane）", "ロシュ（欧州）", "10mg / 20mg", "欧州での先発品ブランド名"],
            ["イソトロイン（Isotroin）", "シプラ（インド）", "5mg / 10mg / 20mg / 30mg", "インド製ジェネリック。国内で多く流通"],
            ["アクネトレント（Acnetrent）", "各社", "10mg / 20mg / 40mg", "Absoricaと同成分。吸収性改良型もあり"],
            ["トレティヴァ（Tretiva）", "インタスファーマ（インド）", "5mg / 10mg / 20mg / 40mg", "インド製。用量バリエーションが豊富"],
            ["クラビス（Clavis）", "韓国製", "10mg / 20mg", "韓国で多く使用。国内一部クリニックで採用"],
          ]}
        />

        <p>どのブランドも有効成分は同じイソトレチノインです。クリニックによって取り扱い品が異なるので、処方時に確認してみてください。</p>
      </section>

      {/* ── セクション2: 他の治療との位置づけ ── */}
      <section>
        <h2 id="treatment-position" className="text-xl font-bold text-gray-800">他のニキビ治療と何が違う？</h2>

        <p>ニキビ治療にはいろんな選択肢がありますが、イソトレチノインが出てくるのは基本的に<strong>「他の治療で十分な効果が得られなかったとき」</strong>です。抗生物質（ミノサイクリンなど）、外用レチノイド（アダパレン）、BPO（過酸化ベンゾイル）……これらを数ヶ月試しても改善しない中等症〜重症のニキビが対象になります。</p>

        <ComparisonTable
          headers={["治療法", "主な特徴", "効果の強さ", "主な副作用"]}
          rows={[
            ["外用レチノイド", "角質のターンオーバー促進", "軽〜中等症", "皮膚刺激・乾燥"],
            ["BPO（過酸化ベンゾイル）", "殺菌＋角質除去", "軽〜中等症", "乾燥・かぶれ"],
            ["抗生物質（内服）", "アクネ菌を抑制", "中等症", "耐性菌リスク"],
            ["イソトレチノイン", "皮脂腺萎縮＋多角的作用", "中等〜重症", "乾燥・催奇形性"],
          ]}
        />

        <p>つまり「いきなりイソトレチノイン」ではなく、段階を踏んだうえでの選択肢ということですね。</p>
      </section>

      {/* ── セクション3: 作用機序 ── */}
      <section>
        <h2 id="mechanism" className="text-xl font-bold text-gray-800">なぜこんなに効くの？ 4つの作用メカニズム</h2>

        <p>イソトレチノインが「最後の切り札」と呼ばれる理由は、<strong>ニキビの原因に多角的にアプローチする</strong>からです。</p>

        <FlowSteps steps={[
          { title: "皮脂腺の萎縮", desc: "皮脂分泌を80%以上抑制。ニキビの根本原因を断つ" },
          { title: "角化異常の改善", desc: "毛穴の詰まりを解消し、新たなニキビを防ぐ" },
          { title: "抗炎症作用", desc: "赤く腫れたニキビの炎症を直接鎮める" },
          { title: "アクネ菌の間接的減少", desc: "皮脂が減ることでアクネ菌のエサがなくなる" },
        ]} />

        <p>特に大きいのが最初の「皮脂腺の萎縮」です。他の治療はニキビを「抑える」アプローチが多いのに対して、イソトレチノインは皮脂腺そのものを縮小させるので、<strong>治療終了後も効果が持続しやすい</strong>のが特徴です。</p>
      </section>

      {/* ── セクション4: 臨床エビデンス ── */}
      <section>
        <h2 id="evidence" className="text-xl font-bold text-gray-800">臨床エビデンス — 数字で見る効果</h2>

        <p>Layton（2009）やStrauss（2007）のデータによると、<strong>累積投与量120〜150mg/kgを達成した場合の長期寛解率は85%以上</strong>とされています。つまり、きちんと飲み切れば大半の人が長期的に改善するということです。</p>

        <p>ただし注意点もあります。低用量（0.25〜0.5mg/kg/日）でも効果はあるのですが、<strong>累積投与量が不足すると再発率が上がる</strong>ことがわかっています。「副作用が怖いから少なめで……」という気持ちはわかりますが、中途半端な量で終わると再発してまた治療をやり直す羽目になりかねません。</p>

        <p>エビデンスの読み方に興味がある方は、<Link href="/lp/column/glp1-diet-safety-evidence" className="text-sky-600 underline hover:text-sky-800">GLP-1ダイエットのエビデンス解説</Link>も参考になります。臨床データの見方が身につくと、こうした情報の判断力がぐっと上がりますよ。</p>
      </section>

      {/* ── セクション5: 用量と治療期間 ── */}
      <section>
        <h2 id="dosage" className="text-xl font-bold text-gray-800">用量と治療期間</h2>

        <p>標準的な用量は<strong>0.5〜1.0mg/kg/日</strong>。体重60kgの人なら1日30〜60mgが目安です。治療期間は通常<strong>4〜6ヶ月</strong>で、累積投与量120〜150mg/kgに達するまで続けます。</p>

        <p>最初の1〜2ヶ月は低めの用量から始めて、副作用の出方を見ながら徐々に増やすことが多いです。飲み始めに一時的にニキビが悪化する「初期悪化」が起きることもありますが、これは薬が効いているサインでもあるので、慌てずに。</p>
      </section>

      <InlineCTA />

      {/* ── セクション6: 必要な検査一覧 ── */}
      <section>
        <h2 id="required-tests" className="text-xl font-bold text-gray-800">必要な検査 — これをやらずに飲むのは危険</h2>

        <p>イソトレチノインは「飲んでおしまい」の薬ではありません。<strong>定期的な血液検査が必須</strong>です。</p>

        <ComparisonTable
          headers={["タイミング", "検査項目", "目的"]}
          rows={[
            ["治療開始前", "肝機能（AST/ALT）", "ベースラインの確認"],
            ["治療開始前", "脂質（TG/TC/LDL）", "脂質異常がないか確認"],
            ["治療開始前", "CBC（血球数）", "全身状態の評価"],
            ["治療開始前", "妊娠検査（女性）", "催奇形性リスクの除外"],
            ["治療中（毎月）", "肝機能＋脂質パネル", "薬剤性の異常を早期発見"],
            ["治療中（毎月・女性）", "妊娠検査", "妊娠の有無を毎月確認"],
          ]}
        />

        <Callout type="info" title="中性脂肪に要注意">
          治療中に中性脂肪（TG）が500mg/dLを超えた場合は、急性膵炎のリスクがあるため中止を検討します。だからこそ毎月の血液検査が欠かせないのです。
        </Callout>
      </section>

      {/* ── セクション7: 催奇形性リスク ── */}
      <section>
        <h2 id="teratogenicity" className="text-xl font-bold text-gray-800">催奇形性リスク — イソトレチノイン最大の注意点</h2>

        <p>ここが一番大事な話です。イソトレチノインはFDAカテゴリーXに分類される<strong>「妊娠中の使用が絶対禁忌」</strong>の薬です。</p>

        <Callout type="warning" title="催奇形性リスクについて">
          妊娠中にイソトレチノインを使用すると、50%以上の確率で重篤な先天異常が生じるとされています。心臓・脳・顔面などに影響を及ぼす可能性があり、妊娠を計画中の女性は絶対に使用してはいけません。
        </Callout>

        <p>アメリカではiPLEDGEプログラムという厳格な管理システムが導入されていて、処方を受けるには月1回の妊娠検査と避妊の誓約が必要です。<strong>女性は治療開始1ヶ月前〜終了1ヶ月後まで避妊必須</strong>で、2種類の避妊法の併用が推奨されています。</p>

        <p>日本では未承認薬のためiPLEDGEのような公的管理はありませんが、処方する医師は同等の厳格さで管理すべきものです。「個人輸入で自分で買って飲む」のがいかに危険か、おわかりいただけると思います。</p>
      </section>

      {/* ── セクション8: その他の副作用 ── */}
      <section>
        <h2 id="side-effects" className="text-xl font-bold text-gray-800">その他の副作用 — ほぼ全員に起きるものから稀なものまで</h2>

        <p>催奇形性以外にも、知っておくべき副作用があります。副作用管理の考え方については<Link href="/lp/column/mounjaro-side-effects-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロの副作用ガイド</Link>にも共通するポイントがあるので、あわせて読んでみてください。</p>

        <ComparisonTable
          headers={["頻度", "副作用", "対処のポイント"]}
          rows={[
            ["ほぼ全員", "皮膚・唇の乾燥", "保湿剤・リップクリーム必須"],
            ["ほぼ全員", "ドライアイ", "人工涙液を常備。コンタクトは注意"],
            ["高頻度", "筋肉痛・関節痛", "激しい運動は控えめに"],
            ["高頻度", "鼻出血", "鼻腔の乾燥対策。ワセリン塗布が有効"],
            ["まれ", "肝機能異常", "毎月の血液検査でモニタリング"],
            ["まれ", "高脂血症", "TG>500mg/dLなら中止検討"],
            ["議論中", "うつ症状", "因果関係は議論中。気分の変化は医師に報告"],
          ]}
        />

        <p>乾燥系の副作用はほぼ避けられません。保湿剤とリップクリームは治療中の必需品だと思ってください。</p>
      </section>

      {/* ── セクション9: 治療中の生活注意点 ── */}
      <section>
        <h2 id="lifestyle" className="text-xl font-bold text-gray-800">治療中の生活で気をつけること</h2>

        <p>イソトレチノインを飲んでいる間は、日常生活でもいくつか気をつけるべきポイントがあります。</p>

        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li><strong>日焼け止め必須</strong> — 皮膚が非常に敏感になっているため、紫外線ダメージを受けやすい。SPF30以上を毎日塗りましょう</li>
          <li><strong>保湿を徹底</strong> — 顔だけでなく全身の乾燥対策が必要。セラミド配合の保湿剤がおすすめ</li>
          <li><strong>飲酒は控えめに</strong> — 肝臓への負担が増すため、治療中はなるべく飲まない方がいい</li>
          <li><strong>レーザー・ピーリングNG</strong> — 治療中〜終了後6ヶ月は瘢痕リスクが高まるため避ける</li>
          <li><strong>献血はNG</strong> — 治療終了後1ヶ月以上経つまで献血はできません</li>
        </ul>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 強力な薬だからこそ、正しい管理が不可欠</h2>

        <p>イソトレチノインは、他の治療で効果がなかった重症ニキビに対して<strong>長期寛解率85%以上</strong>という圧倒的な実績を持つ薬です。でも、催奇形性や肝機能への影響など、「強力だからこそのリスク」も同時に存在します。</p>

        <p>大事なのは<strong>「怖いから使わない」ではなく「正しく管理して使う」</strong>ということ。定期的な血液検査、女性の場合は厳格な避妊管理、そして副作用が出たときにすぐ相談できる環境——これらが揃って初めて、安全に治療を進められます。</p>

        <p>日本では未承認薬ですが、オンライン診療を含む自費診療のクリニックで処方を受けることは可能です。ニキビに長年悩んでいる方は、まず医師に相談するところから始めてみてください。</p>

        <Callout type="info" title="ポイントまとめ">
          イソトレチノインは重症ニキビの最後の切り札。効果は非常に高いが、催奇形性や肝機能への影響など管理すべきリスクも多い薬です。必ず医師の処方のもと、定期検査を受けながら使いましょう。
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
