# DB リストアテスト手順

Supabase バックアップからのリストアと検証手順。

## バックアップの種類

| 方式 | 頻度 | 保持期間 | プラン |
|------|------|----------|--------|
| 日次スナップショット | 毎日 | 7日間 | Pro以上 |
| Point-in-Time Recovery | 常時 | 7日間 | Pro以上 |

## リストア手順

### 1. Supabase ダッシュボードからのリストア

1. [Supabase Dashboard](https://supabase.com/dashboard) → プロジェクト選択
2. **Settings** → **Database** → **Backups**
3. 復元したい日時のスナップショットを選択 → **Restore**

> Point-in-Time Recovery の場合は任意の時刻を指定可能

### 2. pg_dump / pg_restore によるローカルリストア

```bash
# バックアップ取得（本番から）
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres" \
  --format=custom \
  --no-owner \
  --exclude-schema=auth \
  --exclude-schema=storage \
  -f backup_$(date +%Y%m%d).dump

# ローカル PostgreSQL にリストア
pg_restore \
  --dbname="postgresql://postgres:postgres@localhost:54322/postgres" \
  --no-owner \
  --clean \
  --if-exists \
  backup_YYYYMMDD.dump
```

## リストア後の検証チェックリスト

### 主要テーブルのレコード数確認

`scripts/verify-all-tables.mjs` を実行して全テーブルのレコード数を確認:

```bash
node scripts/verify-all-tables.mjs
```

### 手動確認 SQL

```sql
-- 主要テーブルの件数
SELECT 'patients' AS tbl, COUNT(*) FROM patients
UNION ALL SELECT 'intake', COUNT(*) FROM intake
UNION ALL SELECT 'reservations', COUNT(*) FROM reservations
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'reorders', COUNT(*) FROM reorders
UNION ALL SELECT 'message_logs', COUNT(*) FROM message_logs
UNION ALL SELECT 'audit_logs', COUNT(*) FROM audit_logs;

-- tenant_id が NULL のレコードがないか確認
SELECT 'patients' AS tbl, COUNT(*) FROM patients WHERE tenant_id IS NULL
UNION ALL SELECT 'intake', COUNT(*) FROM intake WHERE tenant_id IS NULL
UNION ALL SELECT 'orders', COUNT(*) FROM orders WHERE tenant_id IS NULL;

-- RLS が有効か確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- search_path の確認
SHOW search_path;
```

### データ整合性チェック

```sql
-- intake と reservations の紐付け確認
SELECT COUNT(*) AS orphan_intakes
FROM intake i
WHERE i.reserve_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM reservations r WHERE r.reserve_id = i.reserve_id
  );

-- reorders と patients の紐付け確認
SELECT COUNT(*) AS orphan_reorders
FROM reorders r
WHERE NOT EXISTS (
  SELECT 1 FROM patients p WHERE p.patient_id = r.patient_id
);

-- orders の決済データ確認
SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY status;
```

### 機能テスト

リストア後に以下の画面が正常に表示されることを確認:

1. **管理画面ログイン** → ダッシュボード表示
2. **患者一覧** → 患者データが表示される
3. **予約カレンダー** → 予約枠が表示される
4. **カルテ画面** → 患者のカルテが閲覧可能
5. **LINE トーク** → メッセージ履歴が表示される

## 注意事項

- リストア後は **Supabase Auth のユーザー** はリストアされない（別管理）
- `admin_sessions` テーブルは古いセッションを含むため、ログインし直す必要がある場合がある
- `tenant_settings` の暗号化された値は暗号化キー（`ENCRYPTION_KEY`）が同一環境でのみ復号可能
