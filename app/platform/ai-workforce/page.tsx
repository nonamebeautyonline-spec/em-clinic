"use client";

import useSWR from "swr";
import { useState } from "react";

// ============================================================
// 型定義（WFMMetrics）
// ============================================================

interface QueueStat {
  queueName: string;
  pendingCount: number;
  assignedCount: number;
  completedCount: number;
  oldestPendingMin: number | null;
}

interface AssigneeStat {
  assigneeId: string;
  pendingCount: number;
  completedCount: number;
  avgCompletionMin: number | null;
}

interface PeakHour {
  hour: number;
  taskCount: number;
}

interface BacklogAge {
  ageRangeName: string;
  count: number;
}

interface SLAPrediction {
  taskId: string;
  queueName: string;
  currentAgeMin: number;
  predictedBreachMin: number;
  risk: "low" | "medium" | "high";
}

interface WFMMetrics {
  queueStats: QueueStat[];
  assigneeStats: AssigneeStat[];
  peakHours: PeakHour[];
  backlogAging: BacklogAge[];
  slaPredictions: SLAPrediction[];
}

// ============================================================
// メインコンポーネント
// ============================================================

export default function AIWorkforcePage() {
  const [days, setDays] = useState(7);
  const { data, error, isLoading } = useSWR<{ ok: boolean; days: number; metrics: WFMMetrics }>(
    `/api/platform/ai-workforce?days=${days}`
  );

  const metrics = data?.metrics;

  return (
    <div className="p-6 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">AI Workforce</h1>
          <p className="text-sm text-zinc-500 mt-1">タスクキュー・担当者負荷・SLA監視</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600">期間:</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm bg-white"
          >
            <option value={1}>1日</option>
            <option value={3}>3日</option>
            <option value={7}>7日</option>
            <option value={14}>14日</option>
            <option value={30}>30日</option>
          </select>
        </div>
      </div>

      {/* ローディング/エラー */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent" />
          <p className="mt-3 text-zinc-500">読み込み中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          データの取得に失敗しました
        </div>
      )}

      {metrics && (
        <>
          {/* ============================================================ */}
          {/* 1. キュー別統計カード */}
          {/* ============================================================ */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4">キュー別統計</h2>
            {metrics.queueStats.length === 0 ? (
              <p className="text-sm text-zinc-400">データなし</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {metrics.queueStats.map((q) => (
                  <div key={q.queueName} className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm">
                    <h3 className="text-sm font-medium text-zinc-600 mb-3">{q.queueName}</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-zinc-400">未処理</div>
                        <div className="text-xl font-bold text-amber-600">{q.pendingCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400">処理中</div>
                        <div className="text-xl font-bold text-blue-600">{q.assignedCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400">完了</div>
                        <div className="text-xl font-bold text-emerald-600">{q.completedCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400">最古滞留</div>
                        <div className={`text-xl font-bold ${
                          q.oldestPendingMin !== null && q.oldestPendingMin > 240
                            ? "text-red-600"
                            : q.oldestPendingMin !== null && q.oldestPendingMin > 60
                            ? "text-amber-600"
                            : "text-zinc-600"
                        }`}>
                          {q.oldestPendingMin !== null ? `${q.oldestPendingMin}分` : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* 2. 担当者別負荷テーブル */}
          {/* ============================================================ */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4">担当者別負荷</h2>
            {metrics.assigneeStats.length === 0 ? (
              <p className="text-sm text-zinc-400">データなし</p>
            ) : (
              <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600">担当者</th>
                      <th className="text-right px-4 py-3 font-medium text-zinc-600">未処理</th>
                      <th className="text-right px-4 py-3 font-medium text-zinc-600">完了</th>
                      <th className="text-right px-4 py-3 font-medium text-zinc-600">平均完了時間</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {metrics.assigneeStats.map((a) => (
                      <tr key={a.assigneeId} className="hover:bg-zinc-50">
                        <td className="px-4 py-3 font-medium text-zinc-800">
                          {a.assigneeId === "unassigned" ? (
                            <span className="text-zinc-400">未アサイン</span>
                          ) : (
                            a.assigneeId
                          )}
                        </td>
                        <td className="text-right px-4 py-3">
                          <span className={a.pendingCount > 10 ? "text-red-600 font-bold" : ""}>
                            {a.pendingCount}
                          </span>
                        </td>
                        <td className="text-right px-4 py-3 text-emerald-600">{a.completedCount}</td>
                        <td className="text-right px-4 py-3 text-zinc-600">
                          {a.avgCompletionMin !== null ? `${a.avgCompletionMin}分` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* 3. バックログエイジング */}
          {/* ============================================================ */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4">バックログエイジング</h2>
            <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm">
              {metrics.backlogAging.every((b) => b.count === 0) ? (
                <p className="text-sm text-zinc-400 text-center py-4">未処理タスクなし</p>
              ) : (
                <div className="space-y-3">
                  {metrics.backlogAging.map((b) => {
                    const maxCount = Math.max(...metrics.backlogAging.map((x) => x.count), 1);
                    const pct = (b.count / maxCount) * 100;
                    const colorMap: Record<string, string> = {
                      "0-1h": "bg-emerald-500",
                      "1-4h": "bg-amber-500",
                      "4-24h": "bg-orange-500",
                      "24h+": "bg-red-500",
                    };
                    return (
                      <div key={b.ageRangeName} className="flex items-center gap-3">
                        <div className="w-16 text-sm text-zinc-600 font-medium text-right">{b.ageRangeName}</div>
                        <div className="flex-1 bg-zinc-100 rounded-full h-6 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colorMap[b.ageRangeName] || "bg-zinc-400"} transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="w-12 text-sm text-zinc-600 text-right font-mono">{b.count}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ============================================================ */}
          {/* 4. SLA breach予兆 */}
          {/* ============================================================ */}
          <section>
            <h2 className="text-lg font-semibold text-zinc-800 mb-4">SLA Breach 予兆</h2>
            {metrics.slaPredictions.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-emerald-700 text-sm">
                SLA超過リスクのあるタスクはありません
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600">リスク</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600">タスクID</th>
                      <th className="text-left px-4 py-3 font-medium text-zinc-600">キュー</th>
                      <th className="text-right px-4 py-3 font-medium text-zinc-600">経過時間</th>
                      <th className="text-right px-4 py-3 font-medium text-zinc-600">SLA残り</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {metrics.slaPredictions.map((s) => (
                      <tr
                        key={s.taskId}
                        className={s.risk === "high" ? "bg-red-50" : s.risk === "medium" ? "bg-amber-50" : ""}
                      >
                        <td className="px-4 py-3">
                          {s.risk === "high" ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">
                              HIGH
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                              MED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-zinc-600">
                          {s.taskId.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 text-zinc-700">{s.queueName}</td>
                        <td className="text-right px-4 py-3 text-zinc-600">{s.currentAgeMin}分</td>
                        <td className={`text-right px-4 py-3 font-bold ${
                          s.predictedBreachMin === 0 ? "text-red-600" : "text-amber-600"
                        }`}>
                          {s.predictedBreachMin === 0 ? "超過" : `${s.predictedBreachMin}分`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* ピーク時間帯（おまけ表示） */}
          {/* ============================================================ */}
          {metrics.peakHours.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-zinc-800 mb-4">ピーク時間帯</h2>
              <div className="bg-white rounded-lg border border-zinc-200 p-5 shadow-sm">
                <div className="flex items-end gap-1 h-32">
                  {Array.from({ length: 24 }, (_, h) => {
                    const peak = metrics.peakHours.find((p) => p.hour === h);
                    const count = peak?.taskCount || 0;
                    const maxCount = Math.max(...metrics.peakHours.map((p) => p.taskCount), 1);
                    const heightPct = (count / maxCount) * 100;
                    return (
                      <div key={h} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <div
                          className="w-full bg-amber-400 rounded-t transition-all"
                          style={{ height: `${heightPct}%`, minHeight: count > 0 ? "4px" : "0" }}
                          title={`${h}時: ${count}件`}
                        />
                        <span className="text-[10px] text-zinc-400">{h}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="text-center text-xs text-zinc-400 mt-2">時間帯（0-23時）</div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
