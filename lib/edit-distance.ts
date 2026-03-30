// 編集距離計算（Phase 2-2: Feedback学習強化）
// Wagner-Fischer アルゴリズムによる正規化編集距離

/**
 * 正規化編集距離（0.0〜1.0）
 * 0.0 = 完全一致、1.0 = 完全に異なる
 */
export function normalizedEditDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return 1;

  const maxLen = Math.max(a.length, b.length);
  const dist = editDistance(a, b);
  return dist / maxLen;
}

/**
 * レーベンシュタイン距離（Wagner-Fischer）
 */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // メモリ最適化: 2行のみ使用
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);

  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}
