/**
 * 全コラム記事にFAQPage JSON-LD + FAQセクションを一括追加するスクリプト
 * 既にFAQPageが実装済みの記事はスキップ
 */
import fs from "fs";
import path from "path";

const ARTICLES_PATH = path.resolve("app/lp/column/articles.ts");
const COLUMN_DIR = path.resolve("app/lp/column");

// articles.tsからメタデータを抽出
const articlesContent = fs.readFileSync(ARTICLES_PATH, "utf-8");
const articleRegex = /\{\s*slug:\s*"([^"]+)",\s*title:\s*"([^"]+)",\s*description:\s*"([^"]+)",[\s\S]*?category:\s*"([^"]+)"/g;
const articlesMeta = [];
let match;
while ((match = articleRegex.exec(articlesContent)) !== null) {
  articlesMeta.push({ slug: match[1], title: match[2], description: match[3], category: match[4] });
}

// カテゴリ別FAQ生成関数
function generateFaqItems(slug, title, description, category) {
  const items = [];

  // タイトルから主題を抽出
  const subject = title.split("—")[0].trim().replace(/【.*?】/g, "").trim();

  switch (category) {
    case "LINE運用・業務改善":
      items.push(
        { q: `${subject}の導入にどのくらいの期間がかかりますか？`, a: "基本的な設定は1〜2週間で完了します。LINE公式アカウントの開設からリッチメニュー設計・自動メッセージ設定まで、Lオペ for CLINICなら初期設定サポート付きで最短2週間で運用開始できます。" },
        { q: `${subject}でスタッフの負荷は増えませんか？`, a: "むしろ減ります。電話対応・手動での予約管理・問診確認などの定型業務を自動化することで、スタッフの作業時間を月40時間以上削減できた事例もあります。導入初月はサポートを受けながら進めれば、2ヶ月目以降はスムーズに運用できます。" },
        { q: "小規模クリニックでも導入効果はありますか？", a: "はい、むしろ小規模クリニックほど効果を実感しやすいです。スタッフ数が限られる分、業務自動化によるインパクトが大きく、受付1名分の工数を削減できた事例もあります。" },
      );
      break;

    case "集患・マーケティング":
      items.push(
        { q: `${subject}の効果はどのくらいで実感できますか？`, a: "施策にもよりますが、LINE配信やSEO対策は1〜3ヶ月で効果が出始めるケースが多いです。特にセグメント配信は導入直後から開封率・クリック率の改善が見られます。継続的な改善サイクルを回すことで、半年後には大きな成果に繋がります。" },
        { q: "集患施策にかかるコストはどのくらいですか？", a: "LINE公式アカウント自体は無料で開設でき、月額5,000〜15,000円程度で配信が可能です。Web広告と比較してCPA（獲得単価）が低く、既存患者のリピート促進にも効果的なため、費用対効果は非常に高いです。" },
        { q: "Web広告とLINE配信はどちらが効果的ですか？", a: "新規集患にはWeb広告、リピート促進にはLINE配信が効果的です。LINE配信はメッセージ開封率90%と圧倒的なリーチ力を持ち、既存患者への再来院促進・自費診療の訴求に適しています。両方を組み合わせるのが最も効率的です。" },
      );
      break;

    case "経営・開業":
      items.push(
        { q: `${subject}で最も重要なポイントは何ですか？`, a: "資金計画と集患戦略の両立です。開業資金だけでなく、運転資金（最低6ヶ月分）の確保と、開業前からのLINE公式アカウントやWebサイトによる認知獲得が成功の鍵です。" },
        { q: "開業前から準備すべきことは何ですか？", a: "開業3ヶ月前からLINE公式アカウントの開設、Webサイトの公開、Googleビジネスプロフィールの登録を始めましょう。内覧会の案内や開業日のお知らせをLINEで配信することで、開業初月から安定した来院数を確保できます。" },
        { q: "クリニック経営で失敗しやすいポイントは？", a: "集患に過度に広告費をかけてしまうこと、リピート率を軽視すること、DX化を後回しにすることが代表的な失敗パターンです。既存患者のLTV（生涯価値）を最大化する仕組みを早期に構築することが重要です。" },
      );
      break;

    case "自費診療の売上戦略":
      items.push(
        { q: `${subject}で売上を伸ばす最も効果的な方法は？`, a: "既存患者へのセグメント配信が最も即効性があります。来院履歴・診療内容に基づいて、関連する自費メニューをLINEで個別提案することで、押し売り感なく自費転換率を高められます。導入クリニックでは自費率が15%→35%に向上した事例もあります。" },
        { q: "自費診療の価格設定で注意すべき点は？", a: "原価率・地域相場・競合価格の3軸で分析し、松竹梅の3プランを用意するのが基本です。中間プランの選択率が60%以上になるよう設計すると、売上と患者満足度の両方を最大化できます。" },
        { q: "自費診療のLINE訴求で医療広告ガイドラインに抵触しませんか？", a: "一斉配信で自費診療を訴求する場合は、費用・リスク・副作用の明示が必要です（限定解除要件）。個別の患者へのフォローアップとしての1対1メッセージは広告規制の対象外です。Lオペ for CLINICではガイドラインに配慮した配信テンプレートを用意しています。" },
      );
      break;

    case "オンライン診療":
      items.push(
        { q: `${subject}を始めるために必要な準備は何ですか？`, a: "厚生労働省のオンライン診療ガイドラインに基づく届出、ビデオ通話システムの導入、オンライン決済の設定が必要です。Lオペ for CLINICならLINEビデオ通話・電話音声通話でのオンライン診療に対応しており、別途システム導入が不要です。" },
        { q: "オンライン診療で処方できる薬に制限はありますか？", a: "初診のオンライン診療では処方日数に制限があります（原則7日分まで）。再診では対面診療と同等の処方が可能です。向精神薬・麻薬等の一部薬剤はオンライン診療での処方が制限されています。" },
        { q: "オンライン診療の診療報酬はどのくらいですか？", a: "保険診療では対面診療より低い点数設定ですが、自費診療であれば自由に価格設定が可能です。通院負担の軽減による患者満足度向上と、遠方からの新患獲得を考慮すると、十分な収益性が見込めます。" },
      );
      break;

    case "診療科別ガイド":
      items.push(
        { q: `${subject}でLINE導入の効果はどのくらいですか？`, a: "導入クリニックの実績では、予約リマインドによる無断キャンセル60〜80%削減、セグメント配信によるリピート率20〜30%向上、AI自動返信による電話対応70%削減など、多面的な効果が報告されています。" },
        { q: "LINE導入にプログラミング知識は必要ですか？", a: "必要ありません。Lオペ for CLINICのようなクリニック専用ツールを使えば、ノーコードで予約管理・自動配信・リッチメニューの設定が可能です。管理画面上の操作だけで運用開始できます。" },
        { q: "患者の年齢層が高い診療科でもLINE活用は効果的ですか？", a: "はい、LINEは60代以上でも利用率が70%を超えており、幅広い年齢層にリーチできます。文字サイズの配慮や操作案内の工夫をすれば、高齢患者にも好評です。むしろ電話予約の負担が減り、患者・スタッフ双方にメリットがあります。" },
      );
      break;

    case "ツール・システム比較":
      items.push(
        { q: `${subject}で選ぶ際の最も重要な基準は何ですか？`, a: "クリニック業務への適合性が最も重要です。汎用ツールは安価ですが医療ワークフローへの対応に大量のカスタマイズが必要です。クリニック専用ツールなら予約管理・問診・カルテ・決済が標準搭載されており、導入直後から運用できます。" },
        { q: "ツール移行時にデータは引き継げますか？", a: "LINE公式アカウントはそのまま維持し、連携ツールだけを切り替える形になります。友だちリストやトーク履歴はLINE公式側に残るため、患者への影響はありません。Lオペ for CLINICでは移行サポートも提供しています。" },
        { q: "無料で使えるツールではダメですか？", a: "無料ツールは基本的な配信機能のみで、予約管理・問診・カルテ連携・セグメント配信などクリニックに必要な機能が不足しています。月額費用をかけてでも専用ツールを導入した方が、業務効率化による人件費削減で十分に元が取れます。" },
      );
      break;

    case "医薬品・処方ガイド":
      items.push(
        { q: `${subject}はオンライン診療で処方できますか？`, a: "多くの場合、オンライン診療での処方が可能です。ただし初診では処方日数に制限がある場合があります。再診であれば対面診療と同等の処方が可能です。詳しくは各薬剤の処方ルールをご確認ください。" },
        { q: "副作用が出た場合はどうすればいいですか？", a: "軽度の副作用であれば経過観察で改善することが多いですが、症状が強い場合は速やかに処方医に相談してください。LINEでの個別相談に対応しているクリニックであれば、気軽に症状を報告できます。" },
        { q: "オンラインクリニックでの処方薬の配送はどうなりますか？", a: "多くのオンラインクリニックでは決済後、最短翌日〜数日で発送されます。温度管理が必要な薬剤はクール便での配送に対応しているクリニックを選びましょう。Lオペ for CLINICでは配送管理・追跡番号の自動配信機能も搭載しています。" },
      );
      break;

    default:
      items.push(
        { q: "この記事の内容について詳しく相談できますか？", a: "はい、Lオペ for CLINICでは無料の導入相談を受け付けています。貴院の状況に合わせた具体的なアドバイスが可能です。お気軽にお問い合わせください。" },
        { q: "導入費用はどのくらいですか？", a: "初期相談・資料請求は無料です。貴院の規模・運用体制に合わせた最適プランをご提案します。" },
        { q: "導入までの期間はどのくらいですか？", a: "最短2週間で導入可能です。初期設定サポートも含まれているため、ITに不慣れなスタッフでもスムーズに運用を開始できます。" },
      );
  }

  return items;
}

// メイン処理
let updated = 0;
let skipped = 0;
let errors = [];

for (const article of articlesMeta) {
  const pageDir = path.join(COLUMN_DIR, article.slug);
  const pagePath = path.join(pageDir, "page.tsx");

  if (!fs.existsSync(pagePath)) {
    continue;
  }

  let content = fs.readFileSync(pagePath, "utf-8");

  // 既にFAQPage実装済みならスキップ
  if (content.includes("FAQPage") || content.includes("faqItems")) {
    skipped++;
    continue;
  }

  const faqItems = generateFaqItems(article.slug, article.title, article.description, article.category);

  // FAQ挿入コード生成
  const faqItemsCode = `\nconst faqItems = [\n${faqItems.map(item => `  { q: ${JSON.stringify(item.q)}, a: ${JSON.stringify(item.a)} },`).join("\n")}\n];\n\n/* FAQPage JSON-LD（Article JSON-LDはArticleLayoutで自動生成） */\nconst jsonLd = {\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  mainEntity: faqItems.map((item) => ({\n    "@type": "Question",\n    name: item.q,\n    acceptedAnswer: { "@type": "Answer", text: item.a },\n  })),\n};\n`;

  const faqSectionCode = `\n      {/* ── FAQ ── */}\n      <section id="faq">\n        <h2 className="text-2xl font-bold mt-12 mb-6">よくある質問</h2>\n        {faqItems.map((item, i) => (\n          <div key={i} className="mb-6 rounded-lg border border-gray-200 p-5">\n            <h3 className="font-bold text-lg mb-2">Q. {item.q}</h3>\n            <p className="text-gray-700 leading-relaxed">{item.a}</p>\n          </div>\n        ))}\n      </section>\n`;

  const jsonLdScript = `      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />\n`;

  try {
    // 1. faqItems + jsonLdを keyPoints の前に挿入
    const keyPointsMatch = content.match(/\nconst keyPoints/);
    if (!keyPointsMatch) {
      errors.push(`${article.slug}: keyPoints not found`);
      continue;
    }
    const keyPointsIndex = content.indexOf("\nconst keyPoints");
    content = content.slice(0, keyPointsIndex) + faqItemsCode + content.slice(keyPointsIndex);

    // 2. tocにFAQ追加
    const tocEndMatch = content.match(/\n\];\s*\n\s*\n\s*export default function/);
    if (tocEndMatch) {
      const tocEndIndex = content.indexOf(tocEndMatch[0]);
      // toc配列の最後の要素の後に追加
      const lastTocEntry = content.lastIndexOf("}", tocEndIndex);
      if (lastTocEntry > -1) {
        const afterLastEntry = content.indexOf("\n", lastTocEntry);
        content = content.slice(0, afterLastEntry) + '\n  { id: "faq", label: "よくある質問" },' + content.slice(afterLastEntry);
      }
    }

    // 3. ArticleLayout直後にJSON-LDスクリプト追加
    const layoutMatch = content.match(/<ArticleLayout[^>]*>\s*\n/);
    if (layoutMatch) {
      const layoutEnd = content.indexOf(layoutMatch[0]) + layoutMatch[0].length;
      content = content.slice(0, layoutEnd) + jsonLdScript + content.slice(layoutEnd);
    }

    // 4. </ArticleLayout> の直前にFAQセクション追加
    const closeLayout = content.lastIndexOf("</ArticleLayout>");
    if (closeLayout > -1) {
      content = content.slice(0, closeLayout) + faqSectionCode + "    " + content.slice(closeLayout);
    }

    fs.writeFileSync(pagePath, content, "utf-8");
    updated++;
  } catch (e) {
    errors.push(`${article.slug}: ${e.message}`);
  }
}

console.log(`\n✅ 完了: ${updated}記事にFAQ JSON-LDを追加`);
console.log(`⏭️ スキップ: ${skipped}記事（実装済み）`);
if (errors.length > 0) {
  console.log(`❌ エラー: ${errors.length}件`);
  errors.forEach(e => console.log(`  - ${e}`));
}
