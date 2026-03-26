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
  ResultCard,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles.find((a) => a.slug === "clinic-line-coupon-shopcard")!;

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
  "LINEクーポンの種類（全員配布・条件付き・抽選）と自費クリニックでの使い分け",
  "初回限定・紹介特典・季節限定クーポンの具体的な設計パターン",
  "ショップカード（デジタルポイントカード）で来院回数を可視化する方法",
  "オンライン診療の初回利用促進と定期処方の継続インセンティブ設計",
  "配信タイミングの最適化で利用率を高めるコツ",
];

const toc = [
  { id: "coupon-types", label: "LINEクーポンの種類と特徴" },
  { id: "self-pay-patterns", label: "自費クリニックでの活用パターン" },
  { id: "shopcard", label: "ショップカードのデジタル化" },
  { id: "benefit-design", label: "来院回数に応じた特典設計" },
  { id: "timing", label: "配信タイミングの最適化" },
  { id: "online-clinic", label: "オンライン診療での活用" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="マーケティング" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        自費メニューの再来院率を高めるには、「また来たい」と思わせるインセンティブ設計が不可欠です。
        LINEクーポンとショップカードを組み合わせれば、紙のポイントカードでは実現できなかった柔軟な特典管理と自動配信が可能になります。
        本記事では、クリニックに適したクーポン・ショップカードの設計方法を具体例とともに解説します。
        紹介制度との連携については<Link href="/lp/column/clinic-referral-program" className="text-sky-600 underline hover:text-sky-800">LINE紹介プログラムの設計ガイド</Link>もご覧ください。
      </p>

      {/* ── クーポンの種類 ── */}
      <section>
        <h2 id="coupon-types" className="text-xl font-bold text-gray-800">LINEクーポンの種類と特徴</h2>
        <p>
          LINE公式アカウントで配布できるクーポンには複数の種類があります。
          クリニックの目的に合わせて使い分けることで、集患・再来院促進・口コミ拡大に活用できます。
        </p>

        <ComparisonTable
          headers={["クーポン種類", "配布対象", "主な用途", "クリニックでの活用例"]}
          rows={[
            ["全員配布クーポン", "友だち全員", "認知拡大・キャンペーン", "季節限定の施術割引（花粉症対策等）"],
            ["条件付きクーポン", "特定条件を満たした友だち", "再来院促進・ロイヤルティ", "3ヶ月以上来院なしの患者に限定割引"],
            ["抽選クーポン", "当選者のみ", "エンタメ性・ブロック防止", "友だち追加時の初回特典抽選"],
            ["紹介クーポン", "紹介者・被紹介者の両方", "口コミ拡大", "紹介者に次回施術割引、被紹介者に初回特典"],
          ]}
        />

        <Callout type="info" title="医療広告ガイドラインへの配慮">
          クーポンの表現には注意が必要です。「無料」「○%OFF」等の過度な値引き訴求は医療広告ガイドラインに抵触する可能性があります。
          「初回カウンセリング優待」「施術パッケージの特別ご案内」等、品位を保った表現を心がけましょう。
        </Callout>
      </section>

      {/* ── 自費クリニック活用 ── */}
      <section>
        <h2 id="self-pay-patterns" className="text-xl font-bold text-gray-800">自費クリニックでの活用パターン</h2>
        <p>
          自費診療を主体とするクリニックでは、LINEクーポンを戦略的に活用することで再来院率の向上が期待できます。
          3つの代表的な活用パターンを紹介します。
        </p>

        <h3 className="text-lg font-bold text-gray-800 mt-6">パターン1: 初回限定クーポン</h3>
        <p>
          友だち追加直後に配信する初回限定クーポンは、新規患者の来院ハードルを下げる効果があります。
          「友だち追加で初回カウンセリング無料」のような特典を設定し、友だち追加から来院までの導線を短くしましょう。
        </p>

        <h3 className="text-lg font-bold text-gray-800 mt-6">パターン2: 紹介特典クーポン</h3>
        <p>
          既存患者が知人にLINE公式アカウントを紹介した場合、紹介者・被紹介者の双方にクーポンを付与します。
          LINEの友だち紹介機能と組み合わせることで、手間なく紹介経路を追跡できます。
        </p>

        <h3 className="text-lg font-bold text-gray-800 mt-6">パターン3: 季節限定クーポン</h3>
        <p>
          花粉症シーズン、夏の紫外線ケア、冬の乾燥対策など、季節イベントに合わせた期間限定クーポンを配信します。
          期間限定にすることで行動を促しやすくなります。
        </p>

        <BarChart
          data={[
            { label: "初回限定クーポン", value: 34, color: "#2563eb" },
            { label: "紹介特典クーポン", value: 22, color: "#3b82f6" },
            { label: "季節限定クーポン", value: 28, color: "#60a5fa" },
            { label: "再来院促進クーポン", value: 41, color: "#1d4ed8" },
          ]}
          unit="%"
        />
        <p className="text-sm text-gray-500 mt-1">※ 各クーポンの利用率の一般的な傾向（クリニック規模・診療科により異なります）</p>

        <p>
          自費クリニックのLTV最大化の全体戦略については<Link href="/lp/column/self-pay-clinic-ltv-maximize" className="text-sky-600 underline hover:text-sky-800">自費クリニックのLTV最大化ガイド</Link>で詳しく解説しています。
        </p>
      </section>

      {/* ── ショップカード ── */}
      <section>
        <h2 id="shopcard" className="text-xl font-bold text-gray-800">ショップカードのデジタル化</h2>
        <p>
          LINE公式アカウントのショップカード機能を使えば、紙のポイントカードをデジタル化できます。
          患者がカードを忘れる・紛失するリスクがなくなり、来院データの自動蓄積も可能になります。
        </p>

        <ComparisonTable
          headers={["比較項目", "紙のポイントカード", "LINEショップカード"]}
          rows={[
            ["携帯性", "忘れ・紛失リスクあり", "スマートフォン内で常時携帯"],
            ["管理コスト", "印刷費・保管スペースが必要", "初期費用なし・自動管理"],
            ["データ活用", "来院回数の把握が困難", "来院回数・頻度を自動記録"],
            ["特典付与", "スタンプ手動押印", "QRコード読み取りで自動付与"],
            ["セグメント配信との連携", "不可", "ポイント数に応じた自動配信が可能"],
          ]}
        />

        <StatGrid stats={[
          { value: "0", unit: "円", label: "ショップカード導入費用" },
          { value: "95", unit: "%", label: "紛失リスク削減" },
          { value: "3〜5", unit: "倍", label: "データ活用の精度向上" },
        ]} />

        <Callout type="info" title="ショップカード導入のポイント">
          ショップカードのゴール（特典付与に必要なポイント数）は、平均的な来院間隔を考慮して設定しましょう。
          たとえば月1回来院のペースなら5〜6ポイントでゴール（半年で達成）が目安です。ゴールが遠すぎるとモチベーションが下がります。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── 特典設計 ── */}
      <section>
        <h2 id="benefit-design" className="text-xl font-bold text-gray-800">来院回数に応じた特典設計</h2>
        <p>
          ショップカードとクーポンを組み合わせ、来院回数に応じた段階的な特典を設計することで、患者のロイヤルティを高められます。
        </p>

        <FlowSteps steps={[
          { title: "初回来院：ウェルカム特典", desc: "友だち追加＋初回来院で1ポイント付与。初回カウンセリング優待クーポンで来院を促す。" },
          { title: "3回目来院：リピーター特典", desc: "3ポイント達成で施術オプションの優待クーポンを自動配信。継続来院のモチベーションを維持。" },
          { title: "6回目来院：ロイヤル特典", desc: "ゴール達成で特別メニューの優待や次回施術の特典を付与。長期的な関係構築を図る。" },
          { title: "ゴール後：リセット＋ボーナス", desc: "ショップカードをリセットし、新しいカードのスタートボーナスとして1ポイント付与。継続利用を促す。" },
        ]} />

        <BarChart
          data={[
            { label: "特典なし", value: 32, color: "#94a3b8" },
            { label: "初回特典のみ", value: 45, color: "#60a5fa" },
            { label: "段階的特典（3段階）", value: 61, color: "#2563eb" },
            { label: "段階的特典＋自動配信", value: 72, color: "#1d4ed8" },
          ]}
          unit="%"
        />
        <p className="text-sm text-gray-500 mt-1">※ 6ヶ月以内の再来院率の一般的な傾向（クリニックの施策内容により異なります）</p>
      </section>

      {/* ── 配信タイミング ── */}
      <section>
        <h2 id="timing" className="text-xl font-bold text-gray-800">配信タイミングの最適化</h2>
        <p>
          クーポンは「いつ配信するか」で利用率が大きく変わります。患者の行動パターンに合わせた最適なタイミングを設計しましょう。
        </p>

        <ComparisonTable
          headers={["配信タイミング", "対象", "クーポン内容例", "期待される効果"]}
          rows={[
            ["友だち追加直後", "新規友だち", "初回カウンセリング優待", "友だち追加→来院の転換率向上"],
            ["来院翌日", "来院済み患者", "次回予約の優待案内", "リピート率の向上"],
            ["最終来院から60日後", "休眠患者", "「お久しぶりです」＋再来院特典", "休眠患者の掘り起こし"],
            ["誕生月", "該当患者", "バースデー特典", "特別感の演出・ロイヤルティ向上"],
            ["季節イベント前", "全患者", "季節限定メニュー案内", "需要喚起・来院タイミングの創出"],
          ]}
        />

        <Callout type="info" title="ステップ配信との組み合わせが効果的">
          Lオペのステップ配信機能を活用すれば、「友だち追加→3日後に初回クーポン→来院後翌日にお礼→30日後に2回目促進」のように、
          タイミングごとのクーポン配信を自動化できます。手動配信の手間を省きながら、最適なタイミングでアプローチが可能です。
        </Callout>
      </section>

      {/* ── オンライン診療 ── */}
      <section>
        <h2 id="online-clinic" className="text-xl font-bold text-gray-800">オンライン診療での活用</h2>
        <p>
          オンライン診療を導入しているクリニックでは、クーポン・ショップカードをオンライン特有の施策に活用できます。
        </p>

        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">1.</span><span><strong>初回オンライン診療クーポン</strong>：対面のみ利用していた患者にオンライン診療の初回利用促進クーポンを配信。「初回オンライン診療はシステム利用料無料」等の特典で利用ハードルを下げる。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">2.</span><span><strong>定期処方の継続インセンティブ</strong>：オンライン診療で定期処方を受けている患者に、継続利用に応じたポイントを付与。3回目の処方で配送料優待クーポンを自動配信するなど、継続利用を後押し。</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">3.</span><span><strong>対面→オンラインの移行促進</strong>：安定期に入った患者に対し、次回からオンライン診療に切り替える特典を提示。クリニック側の対面枠の確保にもつながる。</span></li>
        </ul>

        <ResultCard
          before="オンライン診療の初回利用率 8%（案内のみ）"
          after="初回利用率 19%（初回クーポン配信後）"
          metric="初回利用率 2.4倍 — クーポンによる心理的ハードルの低下"
          description="オンライン診療の初回利用促進クーポンを導入した場合に期待できる効果"
        />
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="LINEクーポン・ショップカード活用のポイント">
          <ul className="mt-1 space-y-1">
            <li>クーポンは目的に応じて全員配布・条件付き・紹介・抽選を使い分け</li>
            <li>初回限定・紹介特典・季節限定の3パターンを軸に設計</li>
            <li>ショップカードで来院データを自動蓄積し、段階的な特典で再来院を促進</li>
            <li>配信タイミングはステップ配信で自動化し、最適なタイミングでアプローチ</li>
            <li>オンライン診療の初回利用促進・定期処方の継続にもクーポンが有効</li>
          </ul>
        </Callout>

        <p>
          Lオペ for CLINICでは、クーポン配信・ショップカード管理・ステップ配信の連携を一元管理できます。
          患者の来院状況に応じた特典の自動配信で、スタッフの手間をかけずに再来院率の向上を実現しましょう。
          季節キャンペーンの設計については<Link href="/lp/column/clinic-seasonal-campaign" className="text-sky-600 underline hover:text-sky-800">クリニックの季節キャンペーン設計ガイド</Link>も併せてご確認ください。
        </p>
      </section>
    </ArticleLayout>
  );
}
