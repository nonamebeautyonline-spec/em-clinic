// __tests__/helpers/supabase-mock.ts
// Supabase クエリビルダーのモック
// チェーンメソッド（.from().select().eq().order().limit()...）を再現

export interface MockQueryResult {
  data: any;
  error: any;
}

export function createMockQueryBuilder(defaultResult: MockQueryResult = { data: null, error: null }) {
  let result = { ...defaultResult };

  const builder: any = {};

  // 全チェーンメソッドを自身を返すように設定
  const chainMethods = [
    "from", "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "not", "is", "in", "like", "ilike",
    "order", "limit", "single", "maybeSingle",
    "gt", "gte", "lt", "lte", "range",
  ];

  for (const method of chainMethods) {
    builder[method] = (..._args: any[]) => builder;
  }

  // 最終結果を返すために then を実装（await 対応）
  builder.then = (resolve: (val: MockQueryResult) => void) => {
    resolve(result);
  };

  // 結果を上書きするヘルパー
  builder._setResult = (newResult: MockQueryResult) => {
    result = { ...newResult };
  };

  return builder;
}

// Supabase Admin モックファクトリ
export function createMockSupabaseAdmin(tableResults: Record<string, MockQueryResult> = {}) {
  return {
    from: (table: string) => {
      const result = tableResults[table] || { data: null, error: null };
      return createMockQueryBuilder(result);
    },
  };
}
