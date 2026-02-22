import { test as base } from "@playwright/test";

// 認証済み管理者ページを提供するfixture
// storageState は playwright.config.ts の projects で設定済みのため
// このファイルでは追加のfixture定義が必要な場合に使う

export const test = base.extend<{
  // 将来の拡張用（テストデータ作成、API クライアント等）
}>({});

export { expect } from "@playwright/test";
