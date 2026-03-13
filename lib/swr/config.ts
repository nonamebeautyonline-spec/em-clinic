import type { SWRConfiguration } from "swr";

/** SWRエラー型（HTTPステータス付き） */
export interface SWRError extends Error {
  status: number;
  info: unknown;
}

/**
 * 管理画面用デフォルトfetcher
 * - credentials: "include" を常に付与（CSRF Cookieの送信に必要）
 * - 非OKレスポンスでError throw（サイレント障害を防止）
 * - CSRFトークンは layout.tsx の window.fetch モンキーパッチが自動付与
 */
export const adminFetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
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
};

/** SWRグローバル設定 */
export const swrConfig: SWRConfiguration = {
  fetcher: adminFetcher,
  // 医療データはタブ切替で自動再取得しない（各ページでオプトイン可）
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  shouldRetryOnError: (err: unknown) => {
    const swrErr = err as SWRError | undefined;
    // 401/403はリトライ不要（認証切れ・権限なし）
    if (swrErr?.status === 401 || swrErr?.status === 403) return false;
    return true;
  },
  onError: (error: unknown) => {
    const swrErr = error as SWRError | undefined;
    // 401は認証切れ → ログイン画面へ
    if (swrErr?.status === 401 && typeof window !== "undefined") {
      window.location.href = "/admin/login";
    }
  },
};
