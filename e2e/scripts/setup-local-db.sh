#!/bin/bash
# e2e/scripts/setup-local-db.sh — ローカルSupabaseでE2Eテスト環境を構築
# 使い方: ./e2e/scripts/setup-local-db.sh

set -e

echo "=== ローカルSupabase E2Eテスト環境セットアップ ==="

# Supabase が起動しているか確認
if npx supabase status 2>/dev/null | grep -q "API URL"; then
  echo "[OK] ローカルSupabaseは既に起動中"
else
  echo "[...] ローカルSupabaseを起動中（初回は数分かかります）"
  npx supabase start
fi

# 接続情報を取得
API_URL=$(npx supabase status --output json 2>/dev/null | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).API_URL" 2>/dev/null || echo "http://127.0.0.1:54321")
ANON_KEY=$(npx supabase status --output json 2>/dev/null | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).ANON_KEY" 2>/dev/null || echo "")
SERVICE_KEY=$(npx supabase status --output json 2>/dev/null | node -pe "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).SERVICE_ROLE_KEY" 2>/dev/null || echo "")

if [ -z "$SERVICE_KEY" ]; then
  echo "[ERROR] ローカルSupabaseの接続情報を取得できませんでした"
  echo "  → 'npx supabase start' を手動実行してください"
  exit 1
fi

echo "[OK] API URL: $API_URL"

# e2e/.env.test を更新
cat > e2e/.env.test << EOF
# E2Eテスト用環境変数（ローカルSupabase自動生成）
E2E_ADMIN_USERNAME=LP-TEST01
E2E_ADMIN_PASSWORD=test-password

# ローカルSupabase接続
E2E_SUPABASE_URL=$API_URL
E2E_SUPABASE_SERVICE_KEY=$SERVICE_KEY
EOF

echo "[OK] e2e/.env.test を更新しました"

# .env.local も更新（dev server用）
cat > .env.local << EOF
# ローカルSupabase接続（E2Eテスト用 — 自動生成）
NEXT_PUBLIC_SUPABASE_URL=$API_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
ADMIN_TOKEN=e2e-test-token
JWT_SECRET=e2e-jwt-secret-for-testing
EOF

echo "[OK] .env.local を更新しました"
echo ""
echo "=== セットアップ完了 ==="
echo "E2Eテスト実行: npm run test:e2e"
echo "患者APIテストのみ: npx playwright test --project=patient-api"
