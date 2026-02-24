// components/PermissionDenied.tsx — 権限不足時の表示コンポーネント
"use client";

export default function PermissionDenied() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="text-6xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          アクセス権限がありません
        </h2>
        <p className="text-slate-500">
          この機能へのアクセス権限がありません。管理者にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
