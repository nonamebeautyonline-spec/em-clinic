-- answerers テーブルを patients にリネーム
-- 互換性のため answerers VIEW を作成（旧コードが動作し続ける）
ALTER TABLE answerers RENAME TO patients;
CREATE VIEW answerers AS SELECT * FROM patients;
