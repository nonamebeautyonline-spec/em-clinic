#!/usr/bin/env node
// 各記事page.tsxからArticle JSON-LD定義を削除するスクリプト
// ArticleLayoutに集約したため不要になった個別定義を除去
// FAQPage JSON-LDは残す

const fs = require("fs");
const path = require("path");
const glob = require("glob");

const columnDir = path.join(__dirname, "../app/lp/column");

// 除外: カテゴリページ、コラム一覧ページ、コンポーネント
const excludeDirs = ["_components", "category"];

const files = glob.sync(path.join(columnDir, "*/page.tsx")).filter((f) => {
  return !excludeDirs.some((d) => f.includes(`/column/${d}/`));
});

console.log(`対象ファイル数: ${files.length}`);

let modifiedCount = 0;
let skippedCount = 0;

for (const file of files) {
  const slug = path.basename(path.dirname(file));
  let content = fs.readFileSync(file, "utf-8");
  const original = content;

  // パターン1: const jsonLd = { ... }; (単一Articleオブジェクト)
  // 複数行にわたるオブジェクトリテラルを削除
  const singleObjRegex = /\nconst jsonLd = \{[\s\S]*?\n\};\n/;

  // パターン2: const jsonLd = [ ... ]; (Article + FAQPage配列)
  // → Article部分のみ削除してFAQPage部分は残す
  const arrayRegex = /\nconst jsonLd = \[[\s\S]*?\n\];\n/;

  if (singleObjRegex.test(content)) {
    // 単一Article — 定義ごと削除
    content = content.replace(singleObjRegex, "\n");

    // <script type="application/ld+json"> タグも削除
    content = content.replace(
      /\s*<script type="application\/ld\+json" dangerouslySetInnerHTML=\{\{ __html: JSON\.stringify\(jsonLd\) \}\} \/>\n?/g,
      "\n"
    );
  } else if (arrayRegex.test(content)) {
    // 配列（FAQPage付き） — Article部分のみ削除、FAQPage残す
    // jsonLd配列からArticle要素を除去してFAQPageのみにする
    const match = content.match(arrayRegex);
    if (match) {
      // faqItemsは残す、jsonLd定義をFAQPageのみに書き換え
      content = content.replace(arrayRegex, (matched) => {
        // FAQPage部分を抽出
        const faqMatch = matched.match(/(\{[\s\S]*?"@type": "FAQPage"[\s\S]*?\})\s*,?\s*\]/);
        if (faqMatch) {
          // Article要素を削除して、FAQPageのみの配列に
          return `\nconst jsonLd = [\n  ${faqMatch[1].trim()},\n];\n`;
        }
        // FAQPageが見つからない場合はそのまま
        return matched;
      });
    }
    console.log(`  [FAQPage残し] ${slug}`);
  } else {
    skippedCount++;
    continue;
  }

  // SITE_URL定義が不要になるか確認（他で使われている場合は残す）
  // jsonLd以外でSITE_URLを使っている箇所があるか
  const siteUrlUsages = (content.match(/SITE_URL/g) || []).length;
  // SITE_URL定義行自体のカウントを除外
  const siteUrlDef = content.includes('const SITE_URL = ');
  if (siteUrlDef && siteUrlUsages <= 1) {
    // SITE_URLが定義のみ（他で使われていない）→ 定義も削除
    // ただしmetadataでSITE_URLを使ってる場合が多いので削除しない
  }

  if (content !== original) {
    fs.writeFileSync(file, content, "utf-8");
    modifiedCount++;
  } else {
    skippedCount++;
  }
}

console.log(`\n完了: ${modifiedCount}ファイル修正, ${skippedCount}ファイルスキップ`);
