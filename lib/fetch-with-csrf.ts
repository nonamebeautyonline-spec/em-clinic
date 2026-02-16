// lib/fetch-with-csrf.ts — CSRF トークン付き fetch ラッパー（管理画面用）

let csrfToken: string | null = null;

/**
 * CSRFトークンを取得（初回のみサーバーから取得、以降はキャッシュ）
 */
async function getCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  // Cookieから取得を試みる
  const cookieToken = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrf_token="))
    ?.split("=")[1];
  if (cookieToken) {
    csrfToken = cookieToken;
    return csrfToken;
  }

  // サーバーから取得
  const res = await fetch("/api/csrf-token", { credentials: "include" });
  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken!;
}

/**
 * CSRFトークン付きfetch（管理画面用）
 * credentials: "include" + x-csrf-token ヘッダー を自動付与
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getCsrfToken();

  const headers = new Headers(options.headers);
  if (!headers.has("x-csrf-token")) {
    headers.set("x-csrf-token", token);
  }
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  return fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });
}

/**
 * CSRFトークンキャッシュをクリア（ログアウト時等）
 */
export function clearCsrfToken(): void {
  csrfToken = null;
}
