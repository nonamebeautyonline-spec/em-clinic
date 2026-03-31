/**
 * FAQのtoc追加が壊れた記事を修正するスクリプト
 * jsonLdの閉じ括弧の直後に孤立した `{ id: "faq", label: "よくある質問" },` を削除
 */
import fs from "fs";
import path from "path";

const errorFiles = [
  "aga-domestic-vs-imported-drugs",
  "daily-tadalafil-ed-guide",
  "dienogest-endometriosis-guide",
  "doxy-pep-std-prevention",
  "glp1-diet-safety-evidence",
  "glp1-medication-guide",
  "hiv-prep-prevention-guide",
  "isotretinoin-acne-guide",
  "low-dose-pill-beginners-guide",
  "medium-dose-pill-guide",
  "metformin-personal-import-risk",
  "rybelsus-effective-dosing",
  "rybelsus-side-effects-guide",
  "smoking-cessation-drugs-guide",
  "syphilis-diagnosis-treatment-guide",
  "ultra-low-dose-pill-guide",
  "wegovy-obesity-treatment-guide",
  "xolair-hay-fever-guide",
];

const COLUMN_DIR = path.resolve("app/lp/column");
let fixed = 0;

for (const slug of errorFiles) {
  const pagePath = path.join(COLUMN_DIR, slug, "page.tsx");
  if (!fs.existsSync(pagePath)) continue;

  let content = fs.readFileSync(pagePath, "utf-8");

  // パターン: };\n  { id: "faq", label: "よくある質問" },
  const brokenPattern = /};\n\s*\{ id: "faq", label: "よくある質問" \},/g;
  if (brokenPattern.test(content)) {
    content = content.replace(brokenPattern, "};");
    fs.writeFileSync(pagePath, content, "utf-8");
    fixed++;
    console.log(`✅ ${slug}: 修正完了`);
  } else {
    console.log(`⏭️ ${slug}: パターン不一致、手動確認が必要`);
  }
}

console.log(`\n修正完了: ${fixed}/${errorFiles.length} ファイル`);
