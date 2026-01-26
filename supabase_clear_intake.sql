-- intakeテーブルの全データを削除
-- 移行スクリプト再実行前にクリーンアップ

DELETE FROM intake;

-- 確認：削除後の件数（0になるはず）
SELECT COUNT(*) FROM intake;
