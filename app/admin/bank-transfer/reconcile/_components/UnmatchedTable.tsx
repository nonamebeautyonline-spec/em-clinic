// 未マッチテーブル（確定後の未マッチ結果表示）
"use client";

interface UnmatchedTableProps {
  count: number;
}

export default function UnmatchedTable({ count }: UnmatchedTableProps) {
  if (count === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden p-4">
      <p className="text-sm text-slate-600">
        未マッチ {count}件は入出金詳細で確認・紐づけできます
      </p>
    </div>
  );
}
