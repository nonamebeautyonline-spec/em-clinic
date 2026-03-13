import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import type { SWRConfiguration } from "swr";
import { adminMutationFetcher } from "./mutation";

/**
 * 管理画面用SWRフック
 * グローバルfetcher（credentials: "include" 付き）を使用
 * @param key - APIのURL（nullでfetch無効化）
 * @param options - SWR設定のオーバーライド
 */
export function useAdminSWR<T>(
  key: string | null,
  options?: SWRConfiguration<T>,
) {
  return useSWR<T>(key, options);
}

/**
 * 管理画面用ミューテーションフック（POST/PUT/DELETE）
 * @param key - ミューテーション対象のAPIのURL
 * @param options - onSuccess, onError コールバック
 */
export function useAdminMutation<T>(
  key: string,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (err: Error) => void;
  },
) {
  return useSWRMutation<T, Error, string, { method?: string; body?: unknown }>(
    key,
    adminMutationFetcher,
    options,
  );
}

/**
 * ポーリング用SWRフック
 * @param key - APIのURL（nullでfetch無効化）
 * @param intervalMs - ポーリング間隔（ミリ秒）
 * @param options - SWR設定のオーバーライド
 */
export function usePolling<T>(
  key: string | null,
  intervalMs: number,
  options?: SWRConfiguration<T>,
) {
  return useSWR<T>(key, {
    refreshInterval: intervalMs,
    revalidateOnFocus: true,
    ...options,
  });
}
