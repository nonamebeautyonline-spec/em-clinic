import type { Metadata } from "next";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA } from "../_components/article-layout";

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
  author: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
  publisher: { "@type": "Organization", name: "Lオペ for CLINIC", url: SITE_URL },
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
        <h2 id="what-is-rich-menu" className="text-xl font-bold text-slate-800">リッチメニューとは何か</h2>
        <p>リッチメニューとは、LINE公式アカウントのトーク画面下部に常時表示される<strong>タップ可能な画像メニュー</strong>です。最大6つのエリアに分割でき、各エリアにURL遷移・テキスト送信・クーポン表示などのアクションを設定できます。</p>
        <p>クリニックのLINE公式アカウントにおいて、リッチメニューは<strong>患者が最初に目にするUI</strong>であり、予約・問診・お問い合わせなど主要機能への入口となります。つまり、リッチメニューの設計がそのまま<strong>患者の行動導線と利便性を決定</strong>する重要な要素です。</p>
        <p>LINE公式アカウントの標準機能では1パターンのリッチメニューしか設定できませんが、Lオペのようなツールを使えば、患者の状態に応じて<strong>複数のリッチメニューを動的に切り替える</strong>ことが可能になります。</p>
      </section>

      <section>
        <h2 id="common-mistakes" className="text-xl font-bold text-slate-800">クリニックのリッチメニューでよくある失敗</h2>
        <p>多くのクリニックが陥りがちなリッチメニューの失敗パターンを紹介します。自院に当てはまるものがないかチェックしてみてください。</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>情報を詰め込みすぎ</strong>
            <p>6エリアすべてに異なる機能を配置し、文字が小さくなりタップしづらい。患者はどれを押せばいいか迷い、結局何もタップしません。</p>
          </li>
          <li>
            <strong>デザインが素人感満載</strong>
            <p>PowerPointやCanvaで急いで作ったメニューは、クリニックのブランドイメージを損ないます。特に美容系クリニックでは、デザインの質が信頼感に直結します。</p>
          </li>
          <li>
            <strong>全患者に同じメニューを表示</strong>
            <p>初診前の患者と定期通院の患者では、必要な機能が異なります。全員に同じメニューを見せていると、<strong>各患者にとって不要なボタンが多くなり</strong>使いづらくなります。</p>
          </li>
          <li>
            <strong>リンク切れ・機能停止</strong>
            <p>メニューに設定したURLが変更されてリンク切れ、またはキャンペーン終了後もクーポンボタンが残っているケース。患者の信頼を失う原因になります。</p>
          </li>
          <li>
            <strong>設置したまま放置</strong>
            <p>一度作ったら何ヶ月も更新しない。季節の変化や新サービスの追加に合わせて更新しないと、古い情報のままで患者の利便性が低下します。</p>
          </li>
        </ul>
      </section>

      <section>
        <h2 id="point-1" className="text-xl font-bold text-slate-800">ポイント1: 患者の行動パターンに合わせたボタン配置</h2>
        <p>リッチメニューのボタン配置は、<strong>患者が最も頻繁に使う機能を最も目立つ位置</strong>に配置することが基本です。クリニックのLINE公式アカウントで患者が求める機能の優先順位は以下の通りです。</p>
        <ol className="list-decimal pl-6 space-y-1">
          <li><strong>予約・予約確認</strong>（利用頻度が最も高い）</li>
          <li><strong>問診票の入力</strong>（来院前に必要）</li>
          <li><strong>アクセス・診療時間</strong>（基本情報の確認）</li>
          <li><strong>お問い合わせ</strong>（不明点がある場合）</li>
          <li><strong>お知らせ・キャンペーン</strong>（情報取得）</li>
          <li><strong>マイページ</strong>（予約履歴・処方履歴の確認）</li>
        </ol>
        <p>スマートフォンでの操作を考慮すると、<strong>右下のエリアが最もタップされやすい</strong>というデータがあります。右利きのユーザーが多いため、親指が自然に届く位置です。最重要の「予約」ボタンをここに配置するのが効果的です。</p>
        <p>また、6分割ではなく<strong>大きめの2〜3分割</strong>にして、各ボタンのタップ領域を広くするのも有効な方法です。特に高齢の患者が多いクリニックでは、ボタンの大きさとテキストの読みやすさを優先しましょう。</p>
      </section>

      <InlineCTA />

      <section>
        <h2 id="point-2" className="text-xl font-bold text-slate-800">ポイント2: 状態連動切替（予約前/予約後/来院後でメニュー変更）</h2>
        <p>リッチメニューの真価を発揮するのが<strong>状態連動切替</strong>です。患者の現在のステータスに応じてメニューを自動的に切り替えることで、常に最適な導線を提供できます。</p>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">予約前（友だち追加直後）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>「初回予約はこちら」（大きく目立つボタン）</li>
          <li>「診療メニュー一覧」</li>
          <li>「アクセス・診療時間」</li>
          <li>「よくある質問」</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">予約後（来院前）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>「事前問診を入力する」（最も目立つ位置）</li>
          <li>「予約の確認・変更」</li>
          <li>「アクセス・駐車場案内」</li>
          <li>「持ち物・注意事項」</li>
        </ul>

        <h3 className="text-lg font-semibold text-slate-700 mt-6">来院後（定期フォロー期間）</h3>
        <ul className="list-disc pl-6 space-y-1">
          <li>「次回予約」</li>
          <li>「処方薬の再注文」</li>
          <li>「体調の相談」</li>
          <li>「紹介キャンペーン」</li>
        </ul>

        <p className="mt-4">この切替をLINE標準機能だけで実現するのは難しいですが、Lオペのようなクリニック専用ツールでは<strong>予約・来院・決済データと連動して自動切替</strong>が可能です。患者は常に「今の自分に必要な機能」だけが表示されるため、迷わず目的を達成できます。</p>
      </section>

      <section>
        <h2 id="point-3" className="text-xl font-bold text-slate-800">ポイント3: デザインの統一感とブランディング</h2>
        <p>リッチメニューのデザインは、クリニックの第一印象を左右します。以下のポイントを押さえて、<strong>プロフェッショナルで信頼感のあるデザイン</strong>に仕上げましょう。</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>カラースキームの統一</strong>
            <p>クリニックのロゴ・Webサイトと同じカラーパレットを使用。ブランドカラーをベースに、ボタンのアクセントカラーを設定します。</p>
          </li>
          <li>
            <strong>アイコンの統一感</strong>
            <p>各ボタンのアイコンは同じテイスト（フラットデザイン、線画、塗りなど）に統一。バラバラなアイコンは雑多な印象を与えます。</p>
          </li>
          <li>
            <strong>フォントの読みやすさ</strong>
            <p>スマートフォンの画面サイズを考慮し、<strong>最低14px以上のフォントサイズ</strong>を確保。ボタンのラベルは短く明快に（2〜6文字が理想）。</p>
          </li>
          <li>
            <strong>余白の確保</strong>
            <p>ボタン間の余白を十分に確保し、誤タップを防止。見た目にも余裕のあるレイアウトが上質な印象を与えます。</p>
          </li>
          <li>
            <strong>写真の活用</strong>
            <p>院内の写真やスタッフの写真を背景に使うことで、親しみやすさと信頼感を演出。ただし文字の可読性を損なわないよう、写真の上にオーバーレイを入れましょう。</p>
          </li>
        </ul>
      </section>

      <section>
        <h2 id="point-4" className="text-xl font-bold text-slate-800">ポイント4: タップ数を最小にする導線設計</h2>
        <p>リッチメニューから患者が目的を達成するまでの<strong>タップ数は最小限</strong>に設計しましょう。タップ数が増えるほど離脱率が上がり、患者の満足度も低下します。</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>予約: 最短2タップ</strong>
            <p>リッチメニューの「予約」タップ → カレンダーで日時選択 → 確定。個人情報の入力は初回のみ。2回目以降はLINE IDで自動識別されるため、タップ1つで予約画面に直行。</p>
          </li>
          <li>
            <strong>問診: 最短1タップ</strong>
            <p>リッチメニューの「問診」タップ → LINE内ブラウザで問診フォームが即時表示。別アプリへの遷移やログインを挟まない設計。</p>
          </li>
          <li>
            <strong>お問い合わせ: 最短1タップ</strong>
            <p>リッチメニューの「お問い合わせ」タップ → そのままトーク画面でメッセージ入力。AIが自動応答し、必要に応じてスタッフに引き継ぎ。</p>
          </li>
        </ul>
        <p><strong>「3タップルール」</strong>を意識しましょう。リッチメニューから3タップ以内で目的が達成できない導線は、設計を見直す必要があります。</p>
      </section>

      <section>
        <h2 id="point-5" className="text-xl font-bold text-slate-800">ポイント5: 定期的なA/Bテストと改善</h2>
        <p>リッチメニューは作って終わりではなく、<strong>継続的にテスト・改善するもの</strong>です。以下の要素をA/Bテストし、クリック率やコンバージョン率を改善していきましょう。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>ボタンのラベル文言</strong>: 「予約する」vs「今すぐ予約」vs「空き枠を確認」</li>
          <li><strong>カラーバリエーション</strong>: 暖色系 vs 寒色系、ブランドカラーの濃淡</li>
          <li><strong>レイアウト</strong>: 2分割 vs 3分割 vs 6分割</li>
          <li><strong>ボタンの優先順位</strong>: 予約ボタンの位置（左上 vs 右下 vs 中央大）</li>
          <li><strong>画像 vs テキスト</strong>: 写真背景 vs シンプルなフラットデザイン</li>
        </ul>
        <p>A/Bテストは<strong>2週間以上の期間で、最低500人以上</strong>にリーチしてから結果を判断しましょう。短期間・少人数では統計的に有意な差が出にくいためです。テスト結果のデータに基づいてメニューを更新することで、確実にパフォーマンスが向上していきます。</p>
      </section>

      <section>
        <h2 id="checklist" className="text-xl font-bold text-slate-800">リッチメニュー設計のチェックリスト</h2>
        <p>リッチメニューを作成・更新する際に確認すべき項目をまとめました。</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>最も使用頻度の高い「予約」ボタンが目立つ位置にあるか</li>
          <li>ボタンのラベルは短く明快か（長文になっていないか）</li>
          <li>タップ領域は十分に大きいか（特にシニア患者向け）</li>
          <li>デザインがクリニックのブランドイメージと一致しているか</li>
          <li>リンク切れ・期限切れのボタンがないか</li>
          <li>患者の状態に応じたメニュー切替が設定されているか</li>
          <li>各ボタンから目的達成まで3タップ以内で完了するか</li>
          <li>スマートフォンの実機で表示確認したか</li>
          <li>前回のA/Bテスト結果を反映しているか</li>
          <li>季節・キャンペーンに合わせた更新がされているか</li>
        </ul>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-slate-800">まとめ: リッチメニューはクリニックLINEの「顔」</h2>
        <p>リッチメニューは患者がLINE公式アカウントを開いたときに最初に目にするUIであり、<strong>クリニックのデジタル上の「顔」</strong>とも言えます。ボタン配置・状態連動切替・デザイン・導線設計・継続改善の5つのポイントを押さえることで、患者の利便性と満足度を大きく向上させられます。</p>
        <p>Lオペ for CLINICでは、クリニック専用に設計されたリッチメニューテンプレートと、予約・来院状態に連動した自動切替機能を標準搭載。デザインの知識がなくても、<strong>プロ品質のリッチメニュー</strong>をすぐに導入できます。</p>
      </section>
    </ArticleLayout>
  );
}
