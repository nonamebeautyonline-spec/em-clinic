-- patients.line_id に部分ユニークインデックスを追加
-- 同一テナント内で同一 LINE UID の患者レコードが2つ以上作成されることを防止
--
-- 設計判断:
-- - COALESCE: tenant_id が NULL のケースも重複防止（PostgreSQL の UNIQUE は NULL を別値扱いするため）
-- - WHERE line_id IS NOT NULL: LINE未連携の患者（line_id = NULL）は複数存在可能
-- - マルチテナント対応: 異なるテナントでは同一 LINE UID を許可（LINE公式アカウントが異なるため）
--
-- 前提: scripts/cleanup-dup-line-id.cjs で既存の重複データをクリーンアップ済みであること
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_tenant_line_id_unique
  ON patients (COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), line_id)
  WHERE line_id IS NOT NULL;
