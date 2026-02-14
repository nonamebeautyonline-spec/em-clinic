-- 既存の受信メッセージのdirectionを修正（DEFAULT 'outgoing'で全てoutgoingになっていた）
UPDATE message_log SET direction = 'incoming' WHERE status = 'received';

-- デフォルト値をNULLに変更（今後はコード側で明示的にセットする）
ALTER TABLE message_log ALTER COLUMN direction DROP DEFAULT;
