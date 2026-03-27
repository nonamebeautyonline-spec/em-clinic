import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import type { Article } from "../articles";
import ArticleLayout, {
  ResultCard,
  StatGrid,
  BarChart,
  ComparisonTable,
  Callout,
  FlowSteps,
  DonutChart,
  InlineCTA,
} from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";

const self: Article = {
  slug: "atopic-dermatitis-online-management",
  title: "アトピー性皮膚炎のオンライン管理 — ステロイド外用・保湿指導・フォローアップ設計",
  description: "アトピー性皮膚炎のオンライン診療における重症度評価・ステロイド外用薬のランク選択・保湿指導・プロアクティブ療法のフォローアップ設計を徹底解説。タクロリムス・デルゴシチニブの使い分け、Lオペ for CLINICによるLINE問診・画像共有・フォロー自動化まで網羅します。",
  date: "2026-03-26",
  category: "活用事例",
  readTime: "10分",
  tags: ["アトピー性皮膚炎", "ステロイド外用", "プロアクティブ療法", "オンライン診療", "皮膚科"],
};

if (!articles.find((a) => a.slug === self.slug)) {
  articles.push(self);
}

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const keyPoints = [
  "日本のアトピー性皮膚炎患者は推定約50万人（重症度を問わず全年齢で10〜15%が経験） — 慢性疾患のため継続管理が不可欠",
  "ステロイド外用薬のランク選択・プロアクティブ療法・保湿指導の3本柱をオンラインで継続フォロー",
  "Lオペ for CLINICで患部写真共有・塗布指導・フォローアップリマインド・増悪時のオンライン相談を一元管理",
];

const toc = [
  { id: "ad-overview", label: "アトピー性皮膚炎の基本と治療方針" },
  { id: "medication-guide", label: "外用薬の選択 — ステロイド・タクロリムス・デルゴシチニブ" },
  { id: "online-flow", label: "オンライン診療フローと画像評価" },
  { id: "lope-ad", label: "Lオペ for CLINICでアトピー診療を運用" },
  { id: "revenue", label: "収益モデル" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="活用事例" keyPoints={keyPoints} toc={toc}>

      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        アトピー性皮膚炎は<strong>慢性・再発性の炎症性皮膚疾患</strong>であり、治療の中心は「寛解を維持すること」にあります。ステロイド外用薬による急性期治療だけでなく、<strong>プロアクティブ療法（寛解後も定期的に外用薬を塗布する維持療法）</strong>と適切な保湿指導が長期管理の鍵です。しかし、通院のたびに待合室で長時間待たされる負担から、<strong>治療中断率が高い</strong>ことが大きな課題でした。オンライン診療により「定期的な皮膚状態の確認と処方の継続」が自宅から可能になり、<strong>治療継続率の大幅な改善</strong>が期待できます。本記事では、ステロイド外用薬のランク選択・非ステロイド外用薬の使い分け・保湿指導のポイント、そして<strong>Lオペ for CLINICによるLINE画像共有・フォローアップ自動化</strong>まで解説します。
      </p>

      {/* ── セクション1: 基本と治療方針 ── */}
      <section>
        <h2 id="ad-overview" className="text-xl font-bold text-gray-800">アトピー性皮膚炎の基本 — 病態・重症度評価・治療方針</h2>

        <p>
          アトピー性皮膚炎（AD: Atopic Dermatitis）は、<strong>皮膚バリア機能の低下と免疫応答の異常</strong>を背景とした慢性の炎症性皮膚疾患です。遺伝的素因（フィラグリン遺伝子変異等）に環境因子（乾燥・ダニ・ストレス等）が加わって発症し、増悪と寛解を繰り返します。乳幼児期に発症することが多く、成人になっても症状が持続するケースが少なくありません。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">重症度評価（日本皮膚科学会ガイドライン準拠）</h3>

        <ComparisonTable
          headers={["重症度", "皮疹の状態", "治療方針"]}
          rows={[
            ["軽微", "乾燥・軽度の鱗屑", "保湿剤のみ or 弱いステロイド"],
            ["軽症", "乾燥・軽い紅斑・丘疹", "ミディアムクラスのステロイド外用"],
            ["中等症", "紅斑・丘疹・掻破痕・浸潤", "ストロング〜ベリーストロングのステロイド外用"],
            ["重症", "高度の腫脹・浸潤・苔癬化・多数の掻破痕・びらん", "ベリーストロング〜ストロンゲストのステロイド外用＋全身療法検討"],
          ]}
        />

        <StatGrid stats={[
          { value: "10〜15", unit: "%", label: "小児の有病率" },
          { value: "2〜10", unit: "%", label: "成人の有病率" },
          { value: "50", unit: "万人", label: "推定患者数（日本）" },
          { value: "70", unit: "%", label: "乳幼児期発症の割合" },
        ]} />

        <p>
          治療の基本方針は、<strong>（1）薬物療法（ステロイド外用薬等による炎症の鎮静）、（2）スキンケア（保湿による皮膚バリア機能の補完）、（3）悪化因子の対策</strong>の3本柱です。急性期にはステロイド外用薬で速やかに炎症を鎮静し、寛解に導いた後はプロアクティブ療法に移行して再発を予防します。この「急性期治療→寛解維持」のサイクルを長期的に管理することが、アトピー性皮膚炎治療の本質です。
        </p>

        <Callout type="warning" title="オンライン診療の限界 — 対面が必要なケース">
          アトピー性皮膚炎のオンライン管理は<strong>軽症〜中等症の寛解維持期</strong>に最も適しています。以下のケースでは対面診療が必要です：重症・広範囲の増悪、二次感染（カポジ水痘様発疹症等）の疑い、全身療法（デュピルマブ・JAK阻害薬等）の導入、初診で重症度の正確な評価が必要な場合。<strong>初診は対面で行い、安定後にオンラインフォローに移行する</strong>フローが推奨されます。
        </Callout>
      </section>

      {/* ── セクション2: 外用薬の選択 ── */}
      <section>
        <h2 id="medication-guide" className="text-xl font-bold text-gray-800">外用薬の選択 — ステロイド・タクロリムス・デルゴシチニブ</h2>

        <p>
          アトピー性皮膚炎の外用薬治療の中心はステロイド外用薬です。日本では<strong>5段階のランク分類</strong>（ウィーク・ミディアム・ストロング・ベリーストロング・ストロンゲスト）が用いられ、部位と重症度に応じて適切なランクを選択します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">ステロイド外用薬のランクと代表薬</h3>

        <ComparisonTable
          headers={["ランク", "代表薬", "適応部位・状況"]}
          rows={[
            ["ストロンゲスト（I群）", "クロベタゾールプロピオン酸（デルモベート）", "体幹・四肢の重症病変（短期使用）"],
            ["ベリーストロング（II群）", "モメタゾンフランカルボン酸（フルメタ）", "体幹・四肢の中等症〜重症"],
            ["ストロング（III群）", "ベタメタゾン吉草酸（リンデロンV）", "体幹・四肢の軽症〜中等症"],
            ["ミディアム（IV群）", "アルクロメタゾンプロピオン酸（アルメタ）", "顔面・頸部・小児"],
            ["ウィーク（V群）", "プレドニゾロン（プレドニゾロン軟膏）", "乳児・間擦部"],
          ]}
        />

        <h3 className="text-lg font-semibold text-gray-700 mt-4">非ステロイド外用薬の位置づけ</h3>

        <ComparisonTable
          headers={["薬剤", "一般名", "特徴", "主な使用場面"]}
          rows={[
            ["プロトピック軟膏", "タクロリムス水和物", "カルシニューリン阻害薬、皮膚萎縮なし", "顔面・頸部の維持療法、プロアクティブ療法"],
            ["コレクチム軟膏", "デルゴシチニブ", "JAK阻害外用薬、2歳以上で使用可", "ステロイド長期使用を避けたい部位"],
            ["モイゼルト軟膏", "ジファミラスト", "PDE4阻害外用薬、2歳以上", "軽症〜中等症の維持療法"],
          ]}
        />

        <p>
          <strong>プロアクティブ療法</strong>では、寛解後もステロイド外用薬やタクロリムス軟膏を週2〜3回、以前炎症があった部位に予防的に塗布します。日本皮膚科学会のガイドラインでも推奨されている維持療法であり、再発頻度を大幅に減少させることが示されています。<strong>プロアクティブ療法の指導と経過モニタリング</strong>こそ、オンライン診療が最も威力を発揮する場面です。
        </p>

        <Callout type="info" title="ステロイド外用薬の塗布量 — FTU（フィンガーチップユニット）">
          患者への塗布量指導には<strong>FTU（Finger Tip Unit）</strong>が有用です。成人の人差し指の先端から第一関節までの量（約0.5g）を1FTUとし、手のひら2枚分の面積に塗布します。「薄く塗る」指導では量が不足しがちで効果不十分となるため、「ティッシュが皮膚にくっつく程度」と伝えるのが効果的です。FTUの画像付き指導資料をLINEで配信することで、理解度が大幅に向上します。
        </Callout>

        <BarChart data={[
          { label: "ステロイド外用", value: 60 },
          { label: "タクロリムス", value: 18 },
          { label: "デルゴシチニブ", value: 10 },
          { label: "ジファミラスト", value: 7 },
          { label: "その他", value: 5 },
        ]} />
      </section>

      {/* ── セクション3: オンライン診療フロー ── */}
      <section>
        <h2 id="online-flow" className="text-xl font-bold text-gray-800">オンライン診療フローと画像評価</h2>

        <p>
          アトピー性皮膚炎のオンライン診療では、<strong>患部の画像共有</strong>が診療の質を左右します。ビデオ診察だけでは皮膚の微細な変化を捉えにくいため、事前に高解像度の患部写真を提出してもらう運用が推奨されます。
        </p>

        <FlowSteps steps={[
          { title: "Step 1: 対面初診 — 重症度評価と治療計画策定", desc: "初診は対面で実施し、全身の皮膚を視診・触診して正確な重症度評価を行う。治療計画（ステロイドのランク・塗布量・プロアクティブ療法の移行時期）を策定し、保湿剤の選択・スキンケア指導も行う。次回からオンラインフォローに移行することを説明する。" },
          { title: "Step 2: 2週間後オンラインフォロー", desc: "患部の写真をLINEで事前提出。ビデオ診察で炎症の改善度を評価し、ステロイドのランクダウンまたは継続を判断する。保湿剤の使用状況・塗布量の確認も行う。" },
          { title: "Step 3: 1か月後 — プロアクティブ療法への移行判断", desc: "炎症が十分に鎮静している場合、プロアクティブ療法（週2〜3回の予防塗布）に移行する。移行のタイミングは「かゆみがなく、紅斑が消退し、触診で浸潤を感じない状態」が目安。" },
          { title: "Step 4: 月1回のオンラインフォロー", desc: "プロアクティブ療法中は月1回のオンラインフォローで皮膚状態を確認。季節変動（秋冬の乾燥悪化・春の花粉悪化）を考慮した処方調整を行う。増悪時には臨時のオンライン診察で対応する。" },
          { title: "Step 5: 増悪時の対面切り替え", desc: "オンラインフォロー中に広範囲の増悪・二次感染の疑い・全身療法の検討が必要になった場合は対面診療に切り替える。対面での精査後、再びオンラインフォローに戻る。" },
        ]} />

        <p>
          アトピー性皮膚炎の<strong>画像評価のポイント</strong>は、照明条件の統一（自然光・同じ角度）、同一部位の経時的比較、スケール（定規等）の併置です。患者に「毎回同じ条件で撮影してください」と指導し、LINEで写真を提出してもらうことで、<strong>経時的な改善・増悪を正確に評価</strong>できます。オンライン診療における<Link href="/lp/column/online-clinic-medical-record-guide" className="text-sky-600 underline hover:text-sky-800">カルテ記載のポイント</Link>も併せて確認しておくとよいでしょう。
        </p>
      </section>

      {/* ── セクション4: Lオペ活用 ── */}
      <section>
        <h2 id="lope-ad" className="text-xl font-bold text-gray-800">Lオペ for CLINICでアトピー診療を運用する</h2>

        <p>
          Lオペ for CLINICを活用することで、アトピー性皮膚炎の長期管理に必要な<strong>画像共有・塗布指導・フォローアップリマインド・増悪時の相談</strong>をLINE上で一元管理できます。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">1. LINE問診と患部画像の事前収集</h3>

        <p>
          アトピー専用の問診テンプレートで、現在の症状・かゆみの程度（VAS）・外用薬の使用状況・保湿剤の使用頻度を自動収集します。患部の写真もLINEのトーク画面から送信してもらい、管理画面で一元確認できます。医師はビデオ診察前に写真を確認できるため、<strong>診察時間の短縮と評価精度の向上</strong>を両立できます。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">2. スキンケア指導コンテンツのLINE配信</h3>

        <p>
          保湿剤の塗布方法（入浴後5分以内に塗布）、FTUの図解、季節別のスキンケアのポイントなど、<strong>画像付きの指導コンテンツ</strong>をLINEで配信します。テンプレートメッセージとして登録しておけば、患者のフェーズに応じてワンクリックで送信可能です。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">3. プロアクティブ療法のフォローアップ</h3>

        <p>
          プロアクティブ療法中の患者に対し、「今週の塗布日です」というリマインドをフォローアップルールで自動配信します。週2〜3回の予防塗布は忘れがちであるため、<strong>LINEリマインドで塗布の習慣化を支援</strong>します。1か月ごとの定期フォローリマインドも併せて配信し、治療中断を防止します。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-4">4. 増悪時の迅速対応</h3>

        <p>
          皮膚の増悪を感じた患者が、LINEから患部写真を送信して相談できる動線を構築します。AI自動返信で一次対応し、「写真を拝見しました。臨時のオンライン診察を予約しますか？」と予約動線を提示します。<strong>増悪の早期キャッチと迅速な治療介入</strong>が可能になります。
        </p>

        <ResultCard
          before="アトピー治療の継続率が低い（通院負担による中断）"
          after="Lオペ導入後: 治療継続率が大幅に改善（オンラインフォロー＋リマインド）"
          metric="治療継続率の大幅改善が期待"
          description="画像フォロー・塗布リマインド・増悪時のLINE相談で中断を大幅に削減"
        />

        <InlineCTA />
      </section>

      {/* ── セクション5: 収益モデル ── */}
      <section>
        <h2 id="revenue" className="text-xl font-bold text-gray-800">収益モデル — 慢性疾患管理のストック型収益</h2>

        <p>
          アトピー性皮膚炎は慢性疾患であるため、<strong>月1回の定期フォロー×長期継続</strong>のストック型収益モデルが構築できます。保険診療が中心ですが、保湿剤の自費販売や自費カウンセリングで付加価値を加えることも可能です。
        </p>

        <ComparisonTable
          headers={["項目", "単価", "備考"]}
          rows={[
            ["オンライン再診料（保険）", "730円（患者3割: 約220円）", "情報通信機器を用いた再診"],
            ["外来管理加算", "520円", "対面再診時のみ算定可能（オンライン診療では算定不可）"],
            ["処方箋料", "680円", "一般処方箋"],
            ["外用薬（ステロイド＋保湿剤）", "約1,500〜3,000円/月（患者3割）", "薬剤により異なる"],
            ["自費保湿剤販売", "2,000〜5,000円/本", "医療機関専売品"],
          ]}
        />

        <BarChart
          data={[
            { label: "保険診療報酬（80人）", value: 320000, color: "bg-blue-500" },
            { label: "新規初診（月5件）", value: 25000, color: "bg-sky-400" },
            { label: "自費保湿剤（30人）", value: 90000, color: "bg-indigo-500" },
          ]}
          unit="円"
        />

        <p>
          管理患者80人の場合、<strong>月間約43万円の収益</strong>が見込めます。アトピー性皮膚炎は患者数が多く、特に小児患者を含めると一家族で複数人が通院するケースも珍しくありません。オンライン診療で通院負担を軽減することで、<strong>家族全員の継続管理が可能</strong>になります。皮膚科のLINE活用については<Link href="/lp/column/dermatology-clinic-line" className="text-sky-600 underline hover:text-sky-800">皮膚科クリニックのLINE活用ガイド</Link>も参考にしてください。
        </p>
      </section>

      {/* ── セクション6: まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ — アトピー性皮膚炎オンライン管理の成功戦略</h2>

        <Callout type="success" title="アトピーオンライン管理 成功の3つの柱">
          <ul className="mt-1 space-y-1">
            <li>・<strong>初診は対面、安定後にオンラインフォローに移行</strong>: 正確な重症度評価と治療計画策定は対面、寛解維持期のフォローはオンラインで効率化</li>
            <li>・<strong>プロアクティブ療法の指導とモニタリングをLINEで実施</strong>: 塗布リマインド・画像フォロー・スキンケア指導で治療継続率を向上</li>
            <li>・<strong>増悪時の迅速対応で重症化を防止</strong>: LINE画像共有による早期キャッチ・臨時オンライン診察・必要時の対面切り替えで安全性を担保</li>
          </ul>
        </Callout>

        <p>
          アトピー性皮膚炎は「治す」のではなく「コントロールする」疾患です。長期にわたる治療を継続するには、<strong>通院負担の軽減と患者との密なコミュニケーション</strong>が不可欠です。Lオペ for CLINICで画像共有・塗布リマインド・フォローアップを自動化し、オンライン診療で定期的な処方継続を実現することで、<strong>患者のQOL向上とクリニックの安定経営を同時に実現</strong>できます。
        </p>

        <h3 className="text-lg font-semibold text-gray-700 mt-6">関連記事</h3>
        <ul className="space-y-1 text-gray-700">
          <li>
            <Link href="/lp/column/dermatology-clinic-line" className="text-sky-600 underline hover:text-sky-800">皮膚科クリニックのLINE活用ガイド</Link> — 皮膚科領域のLINE運用ノウハウ
          </li>
          <li>
            <Link href="/lp/column/hyperhidrosis-online-clinic-guide" className="text-sky-600 underline hover:text-sky-800">多汗症のオンライン診療ガイド</Link> — 皮膚科のもうひとつのオンライン診療領域
          </li>
          <li>
            <Link href="/lp/column/online-clinic-complete-guide" className="text-sky-600 underline hover:text-sky-800">オンライン診療完全ガイド</Link> — オンライン診療の始め方から運用まで
          </li>
          <li>
            <Link href="/lp/column/clinic-repeat-rate-improvement" className="text-sky-600 underline hover:text-sky-800">リピート率改善ガイド</Link> — 慢性疾患の治療継続率を向上させるノウハウ
          </li>
          <li>
            <Link href="/lp/contact" className="text-sky-600 underline hover:text-sky-800">無料相談・お問い合わせ</Link> — アトピー性皮膚炎のオンライン管理体制をご相談いただけます
          </li>
        </ul>
      </section>
    </ArticleLayout>
  );
}
