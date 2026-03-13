import type { SWRError } from "./config";

/**
 * ミューテーション用fetcher（POST/PUT/DELETE）
 * - credentials: "include" を常に付与
 * - Content-Type: application/json を自動付与
 * - CSRFトークンは layout.tsx の window.fetch モンキーパッチが自動付与
 */
export async function adminMutationFetcher(
  url: string,
  { arg }: { arg: { method?: string; body?: unknown } },
) {
  const res = await fetch(url, {
    method: arg.method || "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: arg.body != null ? JSON.stringify(arg.body) : undefined,
  });
  if (!res.ok) {
    const error = new Error("API エラー") as SWRError;
    error.status = res.status;
    try {
      error.info = await res.json();
    } catch {
      error.info = null;
    }
    throw error;
  }
  return res.json();
}
