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
const self = articles.find((a) => a.slug === "clinic-line-tag-segment-design")!;

export const metadata: Metadata = {
  title: self.title,
  description: self.description,
  alternates: { canonical: `${SITE_URL}/lp/column/${self.slug}` },
  openGraph: { title: self.title, description: self.description, url: `${SITE_URL}/lp/column/${self.slug}`, type: "article", publishedTime: self.date },
};


const faqItems = [
  { q: "クリニックのLINEタグ管理・セグメント設計の導入にどのくらいの期間がかかりますか？", a: "基本的な設定は1〜2週間で完了します。LINE公式アカウントの開設からリッチメニュー設計・自動メッセージ設定まで、Lオペ for CLINICなら初期設定サポート付きで最短2週間で運用開始できます。" },
  { q: "クリニックのLINEタグ管理・セグメント設計でスタッフの負荷は増えませんか？", a: "むしろ減ります。電話対応・手動での予約管理・問診確認などの定型業務を自動化することで、スタッフの作業時間を月40時間以上削減できた事例もあります。導入初月はサポートを受けながら進めれば、2ヶ月目以降はスムーズに運用できます。" },
  { q: "小規模クリニックでも導入効果はありますか？", a: "はい、むしろ小規模クリニックほど効果を実感しやすいです。スタッフ数が限られる分、業務自動化によるインパクトが大きく、受付1名分の工数を削減できた事例もあります。" },
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
  "タグとは何か — クリニックのLINE運用におけるタグの役割と必要性",
  "クリニックで設計すべきタグ分類（診療科・施術歴・来院頻度・年代・関心メニュー）",
  "問診回答・リッチメニュータップ・予約完了時のタグ自動付与の仕組み",
  "タグを活用したセグメント配信の具体例と反応率の違い",
  "タグ管理の運用ルールと定期メンテナンスの方法",
];

const toc = [
  { id: "what-is-tag", label: "タグとは何か・なぜ必要か" },
  { id: "tag-design", label: "クリニックで使うべきタグ設計" },
  { id: "auto-tagging", label: "タグの自動付与の仕組み" },
  { id: "segment-combination", label: "セグメント配信との組み合わせ" },
  { id: "online-channel-tag", label: "オンライン/対面のチャネルタグ活用" },
  { id: "management-rules", label: "タグ管理の運用ルール" },
  { id: "summary", label: "まとめ" },
  { id: "faq", label: "よくある質問" },
];

export default function Page() {
  return (
    <ArticleLayout slug={self.slug} breadcrumbLabel="ガイド" keyPoints={keyPoints} toc={toc}>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[15px] leading-relaxed text-gray-700 font-medium bg-blue-50 rounded-xl p-5 border border-blue-100">
        LINE配信で「全員に同じメッセージを送る」運用は、ブロック率の上昇と配信コストの無駄を招きます。
        タグを使って患者を適切に分類し、属性に合わせたセグメント配信を行うことで、反応率の大幅な改善が期待できます。
        本記事では、クリニックに最適なタグ設計のフレームワークと自動付与の仕組みを実践的に解説します。
        セグメント配信の基本は<Link href="/clinic/column/segment-delivery-repeat" className="text-sky-600 underline hover:text-sky-800">セグメント配信でリピート率を向上させる方法</Link>も併せてご確認ください。
      </p>

      {/* ── タグとは ── */}
      <section>
        <h2 id="what-is-tag" className="text-xl font-bold text-gray-800">タグとは何か・なぜ必要か</h2>
        <p>
          タグとは、LINE公式アカウントの友だち一人ひとりに付与する「ラベル」のことです。
          たとえば「皮膚科受診」「30代」「再来院済み」のようなタグを付けることで、患者を属性ごとにグループ化できます。
        </p>
        <p>
          タグがないと、友だち全員に同じメッセージを配信するしかありません。
          結果として「自分に関係のない情報が多い」と感じた患者がブロックし、通数課金も無駄になります。
        </p>

        <StatGrid stats={[
          { value: "2〜3", unit: "倍", label: "セグメント配信 vs 一括配信のCTR差" },
          { value: "50", unit: "%↓", label: "ブロック率の改善（適切なタグ運用時）" },
          { value: "30〜40", unit: "%", label: "通数課金の削減効果" },
        ]} />

        <BarChart
          data={[
            { label: "一括配信", value: 8, color: "#94a3b8" },
            { label: "診療科タグ配信", value: 18, color: "#60a5fa" },
            { label: "施術歴タグ配信", value: 22, color: "#3b82f6" },
            { label: "関心メニュー＋来院頻度", value: 28, color: "#1d4ed8" },
          ]}
          unit="%"
        />
        <p className="text-sm text-gray-500 mt-1">※ タグ活用度別のクリック率（CTR）の一般的な傾向</p>

        <Callout type="info" title="タグは「配信しない」ためにも使う">
          タグの活用は「誰に配信するか」だけでなく「誰に配信しないか」を決めるためにも重要です。
          たとえば「AGA治療」のキャンペーンを女性患者に配信しないことで、ブロック率の抑制と通数コストの削減を同時に実現できます。
        </Callout>
      </section>

      {/* ── タグ設計 ── */}
      <section>
        <h2 id="tag-design" className="text-xl font-bold text-gray-800">クリニックで使うべきタグ設計</h2>
        <p>
          タグは闇雲に増やすと管理が破綻します。クリニック運用で実用的な5つのカテゴリに分類して設計しましょう。
        </p>

        <ComparisonTable
          headers={["タグカテゴリ", "タグ例", "付与タイミング", "活用場面"]}
          rows={[
            ["診療科", "皮膚科 / 内科 / 美容 / AGA", "問診回答時・予約完了時", "診療科別のキャンペーン配信"],
            ["施術歴", "ヒアルロン酸経験 / GLP-1経験 / ピル処方中", "カルテ連携・診察完了時", "リピート促進・関連施術の提案"],
            ["来院頻度", "初診 / 月1回以上 / 3ヶ月以上休眠", "来院データの自動集計", "休眠患者の掘り起こし"],
            ["属性", "20代 / 30代 / 40代 / 男性 / 女性", "問診回答時・登録時", "年代・性別に合わせた訴求"],
            ["関心メニュー", "美白関心 / ダイエット関心 / 薄毛関心", "リッチメニュータップ・アンケート", "関心に合わせたメニュー提案"],
          ]}
        />

        <h3 className="text-lg font-bold text-gray-800 mt-6">タグ命名規則を統一する</h3>
        <p>
          タグ名の表記ゆれは運用上の大きなトラブルの元です。以下のようなルールを事前に決めておきましょう。
        </p>
        <ul className="space-y-1 text-gray-700">
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">-</span><span>カテゴリ名をプレフィックスにする（例: 「科:皮膚科」「歴:ヒアルロン酸」「頻:月1」）</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">-</span><span>略称は使わず正式名称で統一する（「HA」ではなく「ヒアルロン酸」）</span></li>
          <li className="flex items-start gap-2"><span className="text-sky-500 font-bold">-</span><span>タグの追加・変更は管理者の承認制にし、勝手なタグ追加を防ぐ</span></li>
        </ul>
      </section>

      {/* ── 自動付与 ── */}
      <section>
        <h2 id="auto-tagging" className="text-xl font-bold text-gray-800">タグの自動付与の仕組み</h2>
        <p>
          タグを手動で付与し続けるのは現実的ではありません。患者の行動をトリガーにした自動付与の仕組みを構築することが重要です。
        </p>

        <FlowSteps steps={[
          { title: "問診回答時の自動タグ付与", desc: "問診で「気になる症状」「受診希望の診療科」を選択した際に、該当するタグを自動付与。Lオペの問診機能と連動し、回答内容に応じたタグが即時反映される。" },
          { title: "リッチメニュータップ時の自動タグ付与", desc: "「美容メニューを見る」「AGA相談」等のリッチメニューボタンをタップした際に関心タグを自動付与。患者の興味関心を行動データから把握できる。" },
          { title: "予約完了時の自動タグ付与", desc: "予約した診療科・メニューに応じてタグを自動付与。「初診」「再診」の区分も予約データから自動判定。" },
          { title: "来院データに基づく定期更新", desc: "来院頻度タグ（月1回以上/3ヶ月以上休眠等）を定期的に自動更新。休眠患者の早期検知と自動フォロー配信に活用。" },
        ]} />

        <ResultCard
          before="タグ手動付与：スタッフ1人あたり月3時間の作業"
          after="タグ自動付与：作業時間ほぼゼロ、付与漏れなし"
          metric="運用工数 95%削減 — 自動化による正確かつ網羅的なタグ管理"
          description="問診・リッチメニュー・予約の3トリガーで自動付与を設定した場合に期待できる効果"
        />

        <Callout type="info" title="Lオペならタグの自動付与をノーコードで設定可能">
          Lオペのフロービルダー機能を使えば、「問診で○○を選択 → タグ付与 → セグメント配信」のような自動化フローをドラッグ&ドロップで構築できます。
          プログラミング知識は不要で、スタッフでも設定・変更が可能です。
        </Callout>
      </section>

      <InlineCTA />

      {/* ── セグメント配信との組み合わせ ── */}
      <section>
        <h2 id="segment-combination" className="text-xl font-bold text-gray-800">セグメント配信との組み合わせ</h2>
        <p>
          タグを付与しただけでは意味がありません。タグを活用したセグメント配信と組み合わせることで、初めて成果につながります。
          具体的なセグメント配信のパターンを紹介します。
        </p>

        <ComparisonTable
          headers={["セグメント条件", "配信内容例", "期待される効果"]}
          rows={[
            ["科:美容 AND 歴:ヒアルロン酸", "ヒアルロン酸のメンテナンス時期のご案内", "施術リピート率の向上"],
            ["頻:3ヶ月以上休眠 AND 科:皮膚科", "季節の肌トラブル対策のご案内", "休眠患者の再来院促進"],
            ["関心:ダイエット AND NOT 歴:GLP-1", "GLP-1ダイエット外来の初回カウンセリング案内", "潜在ニーズの顕在化"],
            ["属性:30代女性 AND 関心:美白", "美白施術の新メニュー先行案内", "ターゲットへのピンポイント訴求"],
          ]}
        />

        <BarChart
          data={[
            { label: "一括配信（タグなし）", value: 4, color: "#94a3b8" },
            { label: "単一タグセグメント", value: 9, color: "#60a5fa" },
            { label: "複合タグセグメント", value: 15, color: "#3b82f6" },
            { label: "複合タグ＋配信タイミング最適化", value: 21, color: "#1d4ed8" },
          ]}
          unit="%"
        />
        <p className="text-sm text-gray-500 mt-1">※ セグメント精度別の予約CV率の一般的な傾向</p>

        <p>
          LINE運用の自動化全般については<Link href="/clinic/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">クリニックのLINE自動化ガイド</Link>で詳しく解説しています。
        </p>
      </section>

      {/* ── オンライン/対面チャネルタグ ── */}
      <section>
        <h2 id="online-channel-tag" className="text-xl font-bold text-gray-800">オンライン/対面のチャネルタグ活用</h2>
        <p>
          オンライン診療と対面診療の両方を提供しているクリニックでは、「チャネルタグ」を設けることで配信内容を適切に出し分けられます。
        </p>

        <ComparisonTable
          headers={["チャネルタグ", "配信内容の出し分け例"]}
          rows={[
            ["チャネル:オンライン", "処方薬の配送状況通知、次回オンライン予約の案内、アプリの使い方ガイド"],
            ["チャネル:対面", "来院リマインド、院内の混雑状況案内、対面限定メニューの案内"],
            ["チャネル:両方", "対面患者へのオンライン移行提案、オンライン患者への対面検査案内"],
          ]}
        />

        <p>
          チャネルタグは予約完了時に自動付与するのが効率的です。オンライン予約なら「チャネル:オンライン」、来院予約なら「チャネル:対面」が自動で付きます。
          両方の利用経験がある患者には「チャネル:両方」タグを付与し、よりパーソナライズされた配信を行いましょう。
        </p>

        <StatGrid stats={[
          { value: "25", unit: "%↑", label: "チャネル別配信の開封率改善" },
          { value: "40", unit: "%↓", label: "不要配信によるブロック率低下" },
          { value: "15", unit: "%↑", label: "オンライン→対面の誘導成功率" },
        ]} />
      </section>

      {/* ── 運用ルール ── */}
      <section>
        <h2 id="management-rules" className="text-xl font-bold text-gray-800">タグ管理の運用ルール</h2>
        <p>
          タグは増えすぎると管理が破綻し、「どのタグが何を意味するかわからない」状態になります。
          以下のルールを定め、定期的にメンテナンスしましょう。
        </p>

        <FlowSteps steps={[
          { title: "タグ台帳を作成する", desc: "全タグの一覧・定義・付与条件・管理者を台帳にまとめる。新規タグ追加時は必ず台帳に登録し、重複や表記ゆれを防止。" },
          { title: "四半期ごとに棚卸しする", desc: "3ヶ月に1回、使われていないタグ・対象者0人のタグを洗い出し、不要なものを整理。タグ数は50個以内を目安に。" },
          { title: "タグ追加は承認制にする", desc: "スタッフが勝手にタグを作らないよう、追加時は管理者の承認を必須にする。命名規則に沿っているかもチェック。" },
          { title: "自動タグの動作確認を月1回実施", desc: "自動付与フローが正しく動作しているか、テストアカウントで月1回検証。付与漏れや誤付与がないか確認する。" },
        ]} />

        <Callout type="info" title="タグのスリム化が配信精度を高める">
          「とりあえず付けておく」で増やしたタグは活用されず、管理コストだけが増えます。
          「このタグで配信を分けたことがあるか？」を基準に整理すると、本当に必要なタグだけが残ります。
          CRM全体の比較は<Link href="/clinic/column/clinic-crm-comparison" className="text-sky-600 underline hover:text-sky-800">クリニック向けCRMツール比較</Link>で解説しています。
        </Callout>
      </section>

      {/* ── まとめ ── */}
      <section>
        <h2 id="summary" className="text-xl font-bold text-gray-800">まとめ</h2>

        <Callout type="success" title="タグ管理・セグメント設計のポイント">
          <ul className="mt-1 space-y-1">
            <li>タグは診療科・施術歴・来院頻度・属性・関心メニューの5カテゴリで設計</li>
            <li>問診回答・リッチメニュータップ・予約完了の3トリガーで自動付与を構築</li>
            <li>複合タグのセグメント配信で予約CV率の大幅改善が期待できる</li>
            <li>オンライン/対面のチャネルタグで配信内容を適切に出し分け</li>
            <li>四半期ごとのタグ棚卸しとタグ台帳の運用で管理を維持</li>
          </ul>
        </Callout>

        <p>
          Lオペ for CLINICでは、タグの自動付与・セグメント配信・フロービルダーによる自動化を一元管理できます。
          問診やリッチメニューと連動したタグ付与で、スタッフの手間なく精度の高いセグメント配信を実現しましょう。
          LINE運用全体の自動化については<Link href="/clinic/column/clinic-line-automation" className="text-sky-600 underline hover:text-sky-800">クリニックのLINE自動化ガイド</Link>も併せてご確認ください。
        </p>
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
