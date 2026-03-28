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
const self = articles.find((a) => a.slug === "mounjaro-pill-menstruation-guide")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};

const keyPoints = [
  "マンジャロとピルの併用は基本OK。ただし胃排出遅延で一時的に避妊効果が低下する可能性",
  "急激な体重減少がホルモンバランスを乱して月経不順・無月経を引き起こすメカニズム",
  "妊娠希望者は最終投与後1ヶ月以上空ける必要あり。動物実験で催奇形性の報告",
];

const toc = [
  { id: "pill-combination", label: "マンジャロとピルの併用" },
  { id: "contraception", label: "避妊効果への影響と対策" },
  { id: "other-hormones", label: "その他のホルモン剤との関係" },
  { id: "menstruation", label: "月経不順が起きる理由" },
  { id: "pregnancy", label: "妊娠を考えている方へ" },
  { id: "during-period", label: "生理中の投与について" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="医薬品解説" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        「マンジャロ飲みながらピルも飲んで大丈夫？」「生理が来なくなったんだけど…」――ダイエット目的でマンジャロを使う女性が増える中、ピルとの併用や月経への影響を心配する声がとても多いです。この記事では、<strong>実際のリスクと正しい対処法</strong>を整理してお伝えします。
      </p>

      {/* ── マンジャロとピルの併用 ── */}
      <section>
        <h2 id="pill-combination" className="text-xl font-bold text-gray-800">マンジャロとピルの併用 — 基本的にはOK、でも注意点あり</h2>

        <p>結論から言うと、マンジャロとピル（低用量ピル）の併用は<strong>基本的に問題ありません</strong>。禁忌ではないので、両方使うこと自体はOKです。</p>

        <p>ただし、ここに落とし穴があるんですよね。マンジャロには<strong>胃排出を遅らせる作用</strong>があります。これがピルの吸収にも影響して、<strong>一時的にピルの避妊効果が下がる可能性</strong>があるんです。</p>

        <Callout type="warning" title="特に注意が必要なタイミング">
          <strong>マンジャロの使い始め</strong>と<strong>用量を増量したとき</strong>は、胃排出遅延の影響が大きく出やすいです。この時期は特にピルの効果が低下するリスクがあるので、追加の避妊措置を講じてください。
        </Callout>

        <p>安心材料もあります。マンジャロ投与から<strong>1週間経てばピルの吸収は正常に戻る</strong>と考えられています。つまり毎週の注射直後〜数日間が特に注意が必要な期間ということですね。</p>
      </section>

      {/* ── 避妊効果への影響と対策 ── */}
      <section>
        <h2 id="contraception" className="text-xl font-bold text-gray-800">避妊効果への影響と対策 — 経口以外なら影響なし</h2>

        <p>マンジャロの胃排出遅延が影響するのは<strong>「経口」で服用する避妊薬</strong>に限ります。つまり口から飲むタイプだけが影響を受けるんです。</p>

        <ComparisonTable
          headers={["避妊法", "マンジャロの影響", "備考"]}
          rows={[
            ["経口ピル（低用量・中用量）", "あり（効果低下の可能性）", "使い始め・増量時に特に注意"],
            ["アフターピル（緊急避妊薬）", "あり（効果低下の可能性）", "経口のため同様のリスク"],
            ["避妊パッチ", "なし", "皮膚から吸収のため影響を受けない"],
            ["避妊インプラント", "なし", "皮下埋め込みのため影響を受けない"],
            ["子宮内避妊具（IUD）", "なし", "子宮内に直接作用のため影響を受けない"],
            ["コンドーム", "なし", "物理的避妊のため影響を受けない"],
          ]}
        />

        <p>マンジャロ使用中に確実な避妊をしたい場合は、<strong>パッチ・インプラント・IUDへの切り替え</strong>を担当医と相談するのが安心です。経口ピルを続ける場合は、マンジャロの注射日前後はコンドーム併用など<strong>追加の避妊措置</strong>を取りましょう。</p>
      </section>

      <InlineCTA />

      {/* ── その他のホルモン剤 ── */}
      <section>
        <h2 id="other-hormones" className="text-xl font-bold text-gray-800">その他のホルモン剤との関係 — 経口なら同じ注意</h2>

        <p>ピル以外にも、経口で服用するホルモン剤は同じ影響を受ける可能性があります。</p>

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li><strong>中用量ピル</strong> — 月経移動やPMS治療で処方されるもの。低用量と同様の注意</li>
          <li><strong>ジエノゲスト</strong> — 子宮内膜症治療薬。経口なので効果減弱の可能性あり</li>
          <li><strong>経口ホルモン補充療法（HRT）</strong> — 更年期障害の治療薬も経口なら同じリスク</li>
        </ul>

        <p>更年期障害の治療をされている方は、<strong>経皮（パッチやジェル）タイプのHRT</strong>に切り替えることで、マンジャロの影響を回避できます。担当の婦人科医にマンジャロを使用していることを必ず伝えてくださいね。</p>

      </section>

      {/* ── 月経不順が起きる理由 ── */}
      <section>
        <h2 id="menstruation" className="text-xl font-bold text-gray-800">月経不順が起きる理由 — GLP-1のせいじゃなくて体重減少のせい</h2>

        <p>「マンジャロを始めてから生理が不順になった」という声を聞くことがありますが、実はこれ、<strong>マンジャロ（GLP-1）が直接ホルモンに作用しているわけではない</strong>んです。</p>

        <FlowSteps steps={[
          { title: "急激な体重減少が起きる", desc: "マンジャロの食欲抑制効果で短期間に大幅な体重減少が生じます。" },
          { title: "脂肪細胞からのホルモン分泌が変化", desc: "脂肪組織はアディポカイン（レプチンなど）を分泌しています。脂肪が急減するとこの分泌バランスが崩れます。" },
          { title: "エストロゲン・プロゲステロンが不均衡に", desc: "アディポカインの変化が視床下部-下垂体-卵巣系に影響し、女性ホルモンのバランスが乱れます。" },
          { title: "月経不順・不正出血が発生", desc: "結果として月経周期の乱れ、不正出血、経血量の変化などが起きることがあります。" },
        ]} />

        <Callout type="warning" title="極端な体重減少は無月経リスク">
          短期間で体重の<strong>10%以上</strong>を失うような極端な減量は、<strong>無月経</strong>を引き起こすリスクがあります。月経が3ヶ月以上止まった場合は、速やかに婦人科を受診してください。
        </Callout>
      </section>

      {/* ── 妊娠を考えている方へ ── */}
      <section>
        <h2 id="pregnancy" className="text-xl font-bold text-gray-800">妊娠を考えている方へ — 最終投与から1ヶ月空ける</h2>

        <p>これはとても重要な話です。動物実験では、チルゼパチド（マンジャロの成分）に<strong>催奇形性</strong>が報告されています。人間での大規模データはまだ不十分ですが、安全側に立って以下のルールが設けられています。</p>

        <Callout type="warning" title="妊娠希望者への処方ルール">
          マンジャロの<strong>最終投与から1ヶ月以上</strong>経過してから妊娠するのが安全とされています。<strong>1ヶ月以内に妊娠を希望している方にはマンジャロを処方しない</strong>のが原則です。
        </Callout>

        <p>「マンジャロで目標体重まで落としてから妊活したい」という方は、<strong>最終投与→1ヶ月以上待機→妊活開始</strong>というスケジュールを立てましょう。この待機期間中の体重維持については<Link href="/lp/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロ完全ガイド</Link>も参考にしてください。</p>
      </section>

      {/* ── 生理中の投与について ── */}
      <section>
        <h2 id="during-period" className="text-xl font-bold text-gray-800">生理中の投与について — 基本は問題なし</h2>

        <p>「生理中に注射していいの？」という質問もよくいただきますが、<strong>生理中のマンジャロ投与は問題ありません</strong>。生理周期に合わせて投与日を変える必要はないです。</p>

        <p>ただし面白い使い方をしている人もいて、生理前〜生理中は食欲が爆発しがちですよね。そこで<strong>生理期間だけ用量を少し増やす</strong>という方法を取る方もいます。もちろん自己判断ではなく、必ず担当医と相談の上でやってくださいね。</p>

        <p>ピルの種類や選び方については<Link href="/lp/column/low-dose-pill-beginners-guide" className="text-sky-600 underline hover:text-sky-800">低用量ピル初心者ガイド</Link>や<Link href="/lp/column/pill-types-comparison" className="text-sky-600 underline hover:text-sky-800">ピルの種類比較</Link>もあわせてどうぞ。</p>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — 女性特有の注意点を押さえて安全に使おう</h2>

        <ul className="list-disc pl-6 space-y-1 text-gray-700">
          <li>マンジャロとピルの併用は基本OK。ただし<strong>使い始めと増量時</strong>はピルの効果が下がる可能性</li>
          <li>パッチ・インプラント・IUDはマンジャロの影響を受けない</li>
          <li>アフターピル・中用量ピル・ジエノゲスト・経口HRTも経口なら同じ注意</li>
          <li>月経不順はGLP-1の直接作用ではなく、<strong>急激な体重減少</strong>が原因</li>
          <li>妊娠希望者は<strong>最終投与から1ヶ月以上</strong>空けること</li>
          <li>生理中の投与は問題なし</li>
        </ul>

        <p>女性がマンジャロを使う際は、婦人科の担当医にもマンジャロの使用を伝えて、ピルや他のホルモン剤との兼ね合いを確認してもらいましょう。総合的な使い方については<Link href="/lp/column/mounjaro-complete-guide" className="text-sky-600 underline hover:text-sky-800">マンジャロ完全ガイド</Link>をご参照ください。</p>
      </section>

    </ArticleLayout>
  );
}
