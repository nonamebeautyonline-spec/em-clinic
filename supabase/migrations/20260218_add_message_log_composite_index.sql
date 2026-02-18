-- message_log のパフォーマンス改善用複合インデックス
-- friends-list API の DISTINCT ON / 個別トークの ORDER BY 高速化
CREATE INDEX IF NOT EXISTS idx_message_log_patient_sent
ON message_log(patient_id, sent_at DESC);
