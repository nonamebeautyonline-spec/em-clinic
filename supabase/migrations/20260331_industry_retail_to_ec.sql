-- 業種タイプ変更: retail → ec（ブランド名「Lオペ for EC」と一致させる）
UPDATE tenants SET industry = 'ec' WHERE industry = 'retail';
