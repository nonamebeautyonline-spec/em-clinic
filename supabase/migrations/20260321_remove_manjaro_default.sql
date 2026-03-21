-- products.drug_name のデフォルト値を NULL に変更（マンジャロ固有ハードコード除去）
ALTER TABLE products ALTER COLUMN drug_name DROP DEFAULT;
