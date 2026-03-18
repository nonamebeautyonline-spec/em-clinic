import type { Metadata } from "next";
import Link from "next/link";
import { articles } from "../articles";
import ArticleLayout, { InlineCTA, Callout, StatGrid, ResultCard, FlowSteps, ComparisonTable, DonutChart } from "../_components/article-layout";

const SITE_URL = "https://l-ope.jp";
const self = articles[17];

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
  "皮膚科特有の課題（慢性疾患の継続治療・処方薬の定期補充）をLINEで解決",
  "写真送信による再診フローとオンライン決済・配送の自動化",
  "アトピー・ニキビ等の長期フォローアップシナリオの設計方法",
];

const toc = [
  { id: "challenges", label: "皮膚科クリニック特有の課題" },
  { id: "online-consultation", label: "オンライン診療×LINE" },
  { id: "prescription-delivery", label: "処方薬のオンライン決済と配送自動化" },
  { id: "photo-management", label: "治療経過の写真管理" },
  { id: "skincare-content", label: "スキンケア情報の定期配信" },
  { id: "follow-up", label: "長期フォローアップシナリオ" },
  { id: "summary", label: "まとめ" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="皮膚科LINE活用" keyPoints={keyPoints} toc={toc}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section>
        <h2 id="challenges" className="text-xl font-bold text-gray-800">皮膚科クリニック特有の課題</h2>
        <p>皮膚科クリニックは、他の診療科にはない特有の課題を抱えています。</p>
        <Callout type="warning" title="皮膚科が抱える4つの課題">
          <ul className="list-disc pl-4 space-y-1 text-sm">
            <li><strong>慢性疾患の継続治療が難しい</strong> — アトピー・乾癬・ニキビ等は数ヶ月〜数年単位の治療が必要だが、症状改善で自己中断されがち</li>
            <li><strong>処方薬の定期補充の手間</strong> — 外用薬は定期補充が必要だが、来院の負担で治療中断に</li>
            <li><strong>視覚情報の重要性</strong> — 症状の「見た目」が診断の重要な手がかり。写真での経過確認が不可欠</li>
            <li><strong>季節変動への対応</strong> — 紫外線・乾燥・花粉など、季節ごとのタイムリーな情報提供が必要</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="online-consultation" className="text-xl font-bold text-gray-800">オンライン診療×LINE — 再診は写真送信で完結</h2>
        <p>皮膚科はオンライン診療との相性が非常に良い診療科です。オンライン診療とLINEの連携について詳しくは<Link href="/lp/column/online-medical-line" className="text-blue-600 underline">オンライン診療×LINEの活用法</Link>もあわせてご覧ください。特に再診では、患者が<strong>LINEで患部の写真を送信する</strong>だけで診察が完結するケースが多くあります。</p>
        <FlowSteps steps={[
          { title: "処方薬の残量確認", desc: "薬がなくなる2週間前にLINEで自動通知「お薬の残りはありますか？」" },
          { title: "症状写真の送信", desc: "患者がLINEのトーク画面から患部の写真を撮影・送信" },
          { title: "医師の確認・判断", desc: "管理画面で写真と前回カルテを並べて確認し、処方内容を決定" },
          { title: "処方・決済", desc: "患者にLINE上で決済リンクを送信、クレジットカードで即時決済" },
          { title: "配送", desc: "決済完了後に自動で配送手配、追跡番号をLINEで通知" },
        ]} />
        <Callout type="point" title="対面が必要なケースの切り分け">
          <p>すべての再診をオンラインで完結させるのではなく、<strong>症状が安定している患者</strong>のみを対象にします。症状が悪化している場合や新しい症状が出た場合は、LINE上で「来院予約」に誘導するフローを設計することで、患者の利便性と医療の質を両立できます。</p>
        </Callout>
      </section>

      <section>
        <h2 id="prescription-delivery" className="text-xl font-bold text-gray-800">処方薬のオンライン決済と配送自動化</h2>
        <p>皮膚科では外用薬の処方が中心であり、処方薬の配送ニーズが高い診療科です。</p>
        <DonutChart percentage={95} label="決済完了率" sublabel="ワンタップ決済による高い完了率" />
        <FlowSteps steps={[
          { title: "医師が処方内容を確定", desc: "患者のLINEに自動で決済リンクが送信される" },
          { title: "ワンタップ決済", desc: "患者がクレジットカードで即時決済。2回目以降はカード再入力不要" },
          { title: "自動配送手配", desc: "決済完了と同時に配送手配リストに自動登録" },
          { title: "LINE通知", desc: "出荷時に追跡番号を自動通知、配達完了時にフォローメッセージを送信" },
        ]} />
        <ResultCard before="薬切れで来院必要" after="LINEで注文→自宅に届く" metric="再診の来院数 30% 削減" description="オンライン決済+配送導入後、売上は維持しながら来院負担を軽減" />
      </section>

      <InlineCTA />

      <section>
        <h2 id="photo-management" className="text-xl font-bold text-gray-800">治療経過の写真管理 — 患者撮影→LINE送信→カルテ連携</h2>
        <p>皮膚科での治療経過管理に、写真は欠かせません。</p>
        <FlowSteps steps={[
          { title: "定期的な写真送付リクエスト", desc: "治療開始から2週間後・1ヶ月後・3ヶ月後にLINEで自動通知" },
          { title: "患者がLINEで写真送信", desc: "特別なアプリ不要、LINEのカメラ機能で撮影してそのまま送信" },
          { title: "カルテへの自動連携", desc: "送信された写真は管理画面で患者のカルテと自動的に紐付け" },
          { title: "時系列での比較表示", desc: "初診時→2週間後→1ヶ月後の写真を並べて治療効果を視覚的に確認" },
        ]} />
        <Callout type="point" title="写真管理の運用ポイント">
          <ul className="list-disc pl-4 space-y-1 text-sm">
            <li><strong>撮影ガイドライン共有</strong>: 初回にLINEで「写真の撮り方ガイド」を送付（照明条件・距離・角度の指示）</li>
            <li><strong>プライバシー配慮</strong>: 送信された写真は暗号化保存し、医療従事者のみアクセス可能</li>
            <li><strong>患者への治療効果の可視化</strong>: 写真比較を共有することで、治療継続のモチベーション向上に</li>
          </ul>
        </Callout>
      </section>

      <section>
        <h2 id="skincare-content" className="text-xl font-bold text-gray-800">スキンケア情報の定期配信で患者エンゲージメント向上</h2>
        <p>診療に直接関わるメッセージだけでなく、<strong>スキンケア情報の定期配信</strong>が患者エンゲージメントの維持・向上に非常に効果的です。</p>
        <ComparisonTable
          headers={["季節", "配信コンテンツ例"]}
          rows={[
            ["春（3〜5月）", "花粉による肌荒れ対策、紫外線対策の開始時期"],
            ["夏（6〜8月）", "日焼け止めの正しい塗り方、虫刺され・あせもの対処法"],
            ["秋（9〜11月）", "夏のダメージ回復スキンケア、乾燥対策の準備"],
            ["冬（12〜2月）", "乾燥肌対策、かゆみ対策、加湿器の活用法"],
          ]}
        />
        <StatGrid stats={[
          { value: "月2〜4", unit: "回", label: "最適な配信頻度" },
        ]} />
        <Callout type="info" title="配信のポイント">
          <p><Link href="/lp/column/segment-delivery-repeat" className="text-blue-600 underline">セグメント配信</Link>を活用して「アトピー性皮膚炎の患者」「ニキビ治療中の患者」など、関心のある情報のみを届けることで、開封率とクリック率を最大化できます。「かかりつけの皮膚科」としてのブランド認知を維持し、症状が出た際に真っ先に相談される関係性を構築しましょう。配信頻度が高すぎるとブロックにつながるため、<Link href="/lp/column/line-block-rate-reduction" className="text-blue-600 underline">ブロック率を下げる5つの鉄則</Link>も参考にしてください。</p>
        </Callout>
      </section>

      <section>
        <h2 id="follow-up" className="text-xl font-bold text-gray-800">アトピー・ニキビ等の長期フォローアップシナリオ</h2>
        <p>慢性皮膚疾患の治療継続を支えるために、LINEを活用した長期フォローアップシナリオを設計します。</p>
        <h3 className="text-lg font-semibold text-gray-700 mt-4">アトピー性皮膚炎のフォローアップ</h3>
        <FlowSteps steps={[
          { title: "治療開始直後", desc: "外用薬の正しい塗り方・量のガイドをLINEで送付" },
          { title: "1週間後", desc: "「お薬は問題なく使えていますか？副作用はありませんか？」と確認" },
          { title: "2週間後", desc: "症状写真の送付リクエスト、改善度合いに応じてアドバイス" },
          { title: "1ヶ月後", desc: "再診リマインド+オンライン再診の案内" },
          { title: "薬がなくなる前", desc: "「お薬の残りが少なくなっていませんか？補充のご注文はこちらから」" },
        ]} />
        <h3 className="text-lg font-semibold text-gray-700 mt-4">ニキビ治療のフォローアップ</h3>
        <FlowSteps steps={[
          { title: "治療開始直後", desc: "治療薬の使用方法と「好転反応（一時的な悪化）」の説明" },
          { title: "2週間後", desc: "「初期の悪化期を乗り越えましょう」と励ましのメッセージ+写真リクエスト" },
          { title: "1ヶ月後", desc: "治療効果の確認+食事・睡眠のアドバイス" },
          { title: "3ヶ月後", desc: "症状改善の写真比較を共有+維持療法への切替相談" },
          { title: "6ヶ月後", desc: "再発防止のスキンケア指導+定期チェック推奨" },
        ]} />
        <Callout type="success" title="シナリオ設計のコツ">
          <p>フォローアップメッセージは「押し付けがましくない」トーンが重要です。「予約してください」ではなく「症状はいかがですか？」と患者の状態を気遣うメッセージにすることで、医療従事者としての信頼感を維持しながら通院継続を促せます。</p>
        </Callout>
      </section>

      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ: 皮膚科×LINEで患者に寄り添う診療体験を</h2>
        <FlowSteps steps={[
          { title: "写真ベースのオンライン再診", desc: "安定期の再診はLINEで完結させ、患者の通院負担を軽減" },
          { title: "処方薬の決済・配送自動化", desc: "ワンタップ決済と自動配送で薬切れによる治療中断を防止" },
          { title: "長期フォローアップの自動化", desc: "治療段階に応じたメッセージ配信で慢性疾患の継続治療をサポート" },
        ]} />
        <p className="mt-4">Lオペ for CLINICは、これらの皮膚科特化機能をすべて備えたLINE運用プラットフォームです。処方薬の配送管理から患者の写真管理、フォローアップの自動化まで、皮膚科クリニックのDXを強力にサポートします。</p>
      </section>
    </ArticleLayout>
  );
}
