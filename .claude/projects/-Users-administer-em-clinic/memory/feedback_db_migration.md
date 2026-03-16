---
name: DB SQL実行は必ずManagement API
description: SQL実行時は.env.localを探すな。MEMORY.mdのManagement API手順を即使え
type: feedback
---

DB SQL実行は**毎回MEMORY.md記載のManagement API手順を使え**。他の方法を探すな。

**Why:** .env.localにSUPABASE_DB_PASSWORDは存在しない。毎回探して見つからず、ユーザーに指摘されている。

**How to apply:** マイグレーションSQL実行時は以下を即実行（探索不要）:
```bash
TOKEN_RAW=$(security find-generic-password -s "Supabase CLI" -w)
TOKEN=$(echo "$TOKEN_RAW" | sed 's/go-keyring-base64://' | base64 -d)
SQL=$(cat supabase/migrations/XXXX.sql)
curl -s -X POST "https://api.supabase.com/v1/projects/fzfkgemtaxsrocbucmza/database/query" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg q "$SQL" '{query: $q}')"
```
成功時は`[]`、エラー時は`{"message": "..."}`。
