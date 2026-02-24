-- 監査ログアーカイブテーブル（元テーブルと同じスキーマ）
CREATE TABLE IF NOT EXISTS audit_logs_archive (LIKE audit_logs INCLUDING ALL);
