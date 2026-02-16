// __tests__/helpers/request-mock.ts
// NextRequest のモックヘルパー

/**
 * テスト用の Request オブジェクトを作成
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}) {
  const {
    method = "POST",
    url = "http://localhost:3000/api/test",
    body,
    headers = {},
    cookies = {},
  } = options;

  // Cookie ヘッダーを生成
  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  if (cookieStr) {
    headers["cookie"] = cookieStr;
  }

  const reqInit: RequestInit = {
    method,
    headers: new Headers(headers),
  };

  if (body && method !== "GET") {
    reqInit.body = JSON.stringify(body);
    (reqInit.headers as Headers).set("content-type", "application/json");
  }

  return new Request(url, reqInit);
}
