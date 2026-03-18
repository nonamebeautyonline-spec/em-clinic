import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ComparisonTable, FlowSteps, BarChart, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[8];

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
  datePublished: self.date,
  dateModified: self.date,
  image: `${SITE_URL}/lp/opengraph-image`,
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` } },
  mainEntityOfPage: `${SITE_URL}/lp/column/${self.slug}`,
};

const keyPoints = [
  "クリニックのリッチメニューでよくある失敗パターン",
  "患者の行動に合わせた5つの設計ポイント",
  "状態連動切替で患者導線を最適化する方法",
];

const toc = [
  { id: "what-is-rich-menu", label: "リッチメニューとは" },
  { id: "common-mistakes", label: "よくある失敗" },
  { id: "point-1", label: "ポイント1: 行動パターンに合わせた配置" },
  { id: "point-2", label: "ポイント2: 状態連動切替" },
  { id: "point-3", label: "ポイント3: デザインの統一感" },
  { id: "point-4", label: "ポイント4: タップ数の最小化" },
  { id: "point-5", label: "ポイント5: A/Bテストと改善" },
  { id: "checklist", label: "設計チェックリスト" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="リッチメニュー" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="what-is-rich-menu" className="text-xl font-bold text-gray-800">リッチメニューとは何か</h2>
        <p>リッチメニューとは、LINE公式アカウントのトーク画面下部に常時表示される<strong>タップ可能な画像メニュー</strong>です。最大6つのエリアに分割でき、各エリアにURL遷移・テキスト送信・クーポン表示などのアクションを設定できます。</p>

        <Callout type="point" title="リッチメニュー = クリニックのデジタルな「顔」">
          リッチメニューは患者が最初に目にするUIであり、予約・問診・お問い合わせなど主要機能への入口です。設計がそのまま患者の行動導線と利便性を決定します。
        </Callout>

        <p>LINE公式アカウントの標準機能では1パターンのリッチメニューしか設定できませんが、Lオペのようなツールを使えば、患者の状態に応じて<strong>複数のリッチメニューを動的に切り替える</strong>ことが可能になります。なお、友だち数を効率よく増やす施策については<Link href="/lp/column/clinic-line-friends-growth" className="text-sky-600 underline hover:text-sky-800">LINE友だち集め月100人増やす7つの施策</Link>をご覧ください。</p>
      </section>

      <section>
        <h2 id="common-mistakes" className="text-xl font-bold text-gray-800">クリニックのリッチメニューでよくある失敗</h2>
        <p>多くのクリニックが陥りがちなリッチメニューの失敗パターンを紹介します。自院に当てはまるものがないかチェックしてみてください。</p>

        <Callout type="warning" title="情報の詰め込みすぎ">
          6エリアすべてに異なる機能を配置し、文字が小さくなりタップしづらい状態。患者はどれを押せばいいか迷い、結局何もタップしません。
        </Callout>

        <ComparisonTable
          headers={["失敗パターン", "問題点", "患者への影響"]}
          rows={[
            ["情報を詰め込みすぎ", "文字が小さくタップしづらい", "何もタップしない"],
            ["デザインが素人感", "ブランドイメージを損なう", "信頼感の低下"],
            ["全患者に同じメニュー", "不要なボタンが多い", "使いづらく感じる"],
            ["リンク切れ・機能停止", "期限切れのボタンが残存", "信頼を失う"],
            ["設置したまま放置", "古い情報のまま", "利便性の低下"],
          ]}
        />
      </section>

      <section>
        <h2 id="point-1" className="text-xl font-bold text-gray-800">ポイント1: 患者の行動パターンに合わせたボタン配置</h2>
        <p>リッチメニューのボタン配置は、<strong>患者が最も頻繁に使う機能を最も目立つ位置</strong>に配置することが基本です。</p>

        <BarChart
          data={[
            { label: "予約・予約確認", value: 95, color: "bg-sky-500" },
            { label: "問診票の入力", value: 75, color: "bg-emerald-500" },
            { label: "アクセス・診療時間", value: 60, color: "bg-violet-500" },
            { label: "お問い合わせ", value: 45, color: "bg-amber-500" },
            { label: "お知らせ", value: 30, color: "bg-rose-400" },
            { label: "マイページ", value: 25, color: "bg-gray-400" },
          ]}
          unit="（優先度）"
        />

        <Callout type="point" title="右下が最もタップされやすい">
          スマートフォン操作では、右利きユーザーの親指が自然に届く右下エリアが最もタップされやすいです。最重要の「予約」ボタンをここに配置するのが効果的です。
        </Callout>

        <p>また、6分割ではなく<strong>大きめの2〜3分割</strong>にして、各ボタンのタップ領域を広くするのも有効です。特に高齢の患者が多いクリニックでは、ボタンの大きさとテキストの読みやすさを優先しましょう。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="point-2" className="text-xl font-bold text-gray-800">ポイント2: 状態連動切替（予約前/予約後/来院後でメニュー変更）</h2>
        <p>リッチメニューの真価を発揮するのが<strong>状態連動切替</strong>です。患者の現在のステータスに応じてメニューを自動的に切り替えることで、常に最適な導線を提供できます。</p>

        <ComparisonTable
          headers={["患者の状態", "表示ボタン例", "目的"]}
          rows={[
            ["予約前（友だち追加直後）", "初回予約・診療メニュー・アクセス・FAQ", "初回予約への誘導"],
            ["予約後（来院前）", "事前問診・予約確認/変更・アクセス・持ち物", "来院準備の促進"],
            ["来院後（フォロー期間）", "次回予約・処方薬の再注文・体調相談・紹介", "リピート促進"],
          ]}
        />

        <Callout type="success" title="Lオペなら自動切替が可能">
          LINE標準機能だけでは難しい状態連動切替も、Lオペのようなクリニック専用ツールでは予約・来院・決済データと連動して自動切替が可能です。患者は常に「今の自分に必要な機能」だけが表示されます。
        </Callout>
      </section>

      <section>
        <h2 id="point-3" className="text-xl font-bold text-gray-800">ポイント3: デザインの統一感とブランディング</h2>
        <p>リッチメニューのデザインは、クリニックの第一印象を左右します。以下のポイントを押さえて、<strong>プロフェッショナルで信頼感のあるデザイン</strong>に仕上げましょう。</p>

        <FlowSteps steps={[
          { title: "カラースキームの統一", desc: "クリニックのロゴ・Webサイトと同じカラーパレットを使用。ブランドカラーをベースにアクセントカラーを設定" },
          { title: "アイコンの統一感", desc: "各ボタンのアイコンは同じテイスト（フラット/線画/塗り）に統一。バラバラなアイコンは雑多な印象に" },
          { title: "フォントの読みやすさ", desc: "最低14px以上のフォントサイズを確保。ラベルは短く明快に（2〜6文字が理想）" },
          { title: "余白の確保", desc: "ボタン間の余白を十分に確保し、誤タップを防止。余裕のあるレイアウトが上質な印象に" },
          { title: "写真の活用", desc: "院内写真やスタッフ写真で親しみやすさを演出。文字の可読性を損なわないようオーバーレイを入れる" },
        ]} />
      </section>

      <section>
        <h2 id="point-4" className="text-xl font-bold text-gray-800">ポイント4: タップ数を最小にする導線設計</h2>
        <p>リッチメニューから患者が目的を達成するまでの<strong>タップ数は最小限</strong>に設計しましょう。タップ数が増えるほど離脱率が上がります。</p>

        <StatGrid stats={[
          { value: "2", unit: "タップ", label: "予約完了" },
          { value: "1", unit: "タップ", label: "問診開始" },
          { value: "1", unit: "タップ", label: "お問い合わせ" },
        ]} />

        <ComparisonTable
          headers={["機能", "タップ数", "フロー"]}
          rows={[
            ["予約", "最短2タップ", "メニュー→カレンダー選択→確定（2回目以降は自動識別）"],
            ["問診", "最短1タップ", "メニュー→LINE内ブラウザで即時表示"],
            ["お問い合わせ", "最短1タップ", "メニュー→トーク画面でメッセージ入力。AI自動応答"],
          ]}
        />

        <Callout type="warning" title="3タップルールを意識">
          リッチメニューから3タップ以内で目的が達成できない導線は、設計を見直す必要があります。
        </Callout>
      </section>

      <section>
        <h2 id="point-5" className="text-xl font-bold text-gray-800">ポイント5: 定期的なA/Bテストと改善</h2>
        <p>リッチメニューは作って終わりではなく、<strong>継続的にテスト・改善するもの</strong>です。配信施策全体のブロック率を抑える工夫については<Link href="/lp/column/line-block-rate-reduction" className="text-sky-600 underline hover:text-sky-800">ブロック率を下げる5つの鉄則</Link>も併せて確認しておくと効果的です。以下の要素をA/Bテストし、クリック率やコンバージョン率を改善していきましょう。</p>

        <ComparisonTable
          headers={["テスト要素", "パターン例", "検証ポイント"]}
          rows={[
            ["ラベル文言", "「予約する」vs「今すぐ予約」vs「空き枠を確認」", "クリック率"],
            ["カラー", "暖色系 vs 寒色系 / 濃淡", "視認性・クリック率"],
            ["レイアウト", "2分割 vs 3分割 vs 6分割", "タップ率・誤タップ率"],
            ["ボタン位置", "左上 vs 右下 vs 中央大", "予約CVR"],
            ["デザイン", "写真背景 vs フラットデザイン", "印象・クリック率"],
          ]}
        />

        <Callout type="info" title="A/Bテストの最低条件">
          2週間以上の期間で、最低500人以上にリーチしてから結果を判断しましょう。短期間・少人数では統計的に有意な差が出にくいためです。
        </Callout>
      </section>

      <section>
        <h2 id="checklist" className="text-xl font-bold text-gray-800">リッチメニュー設計のチェックリスト</h2>
        <p>リッチメニューを作成・更新する際に確認すべき項目をまとめました。</p>

        <ComparisonTable
          headers={["チェック項目", "確認内容", "OK?"]}
          rows={[
            ["予約ボタンの配置", "最も目立つ位置にあるか", ""],
            ["ラベルの簡潔さ", "短く明快か（長文になっていないか）", ""],
            ["タップ領域", "十分に大きいか（シニア患者対応）", ""],
            ["ブランド整合性", "クリニックのイメージと一致しているか", ""],
            ["リンク有効性", "リンク切れ・期限切れがないか", ""],
            ["状態連動切替", "患者状態に応じたメニュー切替が設定されているか", ""],
            ["3タップルール", "各機能が3タップ以内で完了するか", ""],
            ["実機確認", "スマートフォン実機で表示確認したか", ""],
            ["A/Bテスト反映", "前回のテスト結果を反映しているか", ""],
            ["季節・キャンペーン更新", "最新の情報に更新されているか", ""],
          ]}
        />
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: リッチメニューはクリニックLINEの「顔」</h2>
        <p>リッチメニューは患者がLINE公式アカウントを開いたときに最初に目にするUIであり、<strong>クリニックのデジタル上の「顔」</strong>とも言えます。ボタン配置・状態連動切替・デザイン・導線設計・継続改善の5つのポイントを押さえることで、患者の利便性と満足度を大きく向上させられます。美容クリニックでのリッチメニュー活用例は<Link href="/lp/column/beauty-clinic-line" className="text-sky-600 underline hover:text-sky-800">美容クリニックのLINE活用術</Link>でも紹介しています。</p>
        <p>Lオペ for CLINICでは、クリニック専用に設計されたリッチメニューテンプレートと、予約・来院状態に連動した自動切替機能を標準搭載。デザインの知識がなくても、<strong>プロ品質のリッチメニュー</strong>をすぐに導入できます。</p>
      </section>
    </ArticleLayout>
  );
}
