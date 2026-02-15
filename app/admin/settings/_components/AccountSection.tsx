// 設定ページ: アカウント管理（パスワード・メールアドレス変更）
"use client";

import { useState, useEffect } from "react";

interface AccountSectionProps {
  onToast: (message: string, type: "success" | "error") => void;
}

export default function AccountSection({ onToast }: AccountSectionProps) {
  // セッション情報
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentName, setCurrentName] = useState("");

  // パスワード変更
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // メール変更
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.user) {
          setCurrentEmail(data.user.email || "");
          setCurrentName(data.user.name || "");
        }
      })
      .catch(() => {});
  }, []);

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      onToast("現在のパスワードと新しいパスワードを入力してください", "error");
      return;
    }
    if (newPassword.length < 8) {
      onToast("パスワードは8文字以上で入力してください", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      onToast("新しいパスワードが一致しません", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "変更に失敗しました");
      onToast("パスワードを変更しました", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      onToast(err.message || "パスワード変更に失敗しました", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleEmailChange = async () => {
    if (!newEmail || !emailPassword) {
      onToast("新しいメールアドレスとパスワードを入力してください", "error");
      return;
    }

    setSavingEmail(true);
    try {
      const res = await fetch("/api/admin/account", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password: emailPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "変更に失敗しました");
      onToast(data.message || "メールアドレスを変更しました", "success");
      setCurrentEmail(newEmail);
      setNewEmail("");
      setEmailPassword("");
    } catch (err: any) {
      onToast(err.message || "メールアドレス変更に失敗しました", "error");
    } finally {
      setSavingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 現在のアカウント情報 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">アカウント情報</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24 shrink-0">名前</span>
            <span className="text-sm text-gray-900">{currentName || "—"}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 w-24 shrink-0">メール</span>
            <span className="text-sm text-gray-900">{currentEmail || "—"}</span>
          </div>
        </div>
      </div>

      {/* パスワード変更 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">パスワード変更</h2>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">現在のパスワード</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="8文字以上"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（確認）</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handlePasswordChange}
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingPassword ? "変更中..." : "パスワードを変更"}
          </button>
        </div>
      </div>

      {/* メールアドレス変更 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">メールアドレス変更</h2>
          <p className="text-xs text-gray-500 mt-0.5">変更後、次回ログイン時から新しいメールアドレスを使用します</p>
        </div>
        <div className="px-5 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">新しいメールアドレス</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">現在のパスワード（確認用）</label>
            <input
              type="password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleEmailChange}
            disabled={savingEmail || !newEmail || !emailPassword}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {savingEmail ? "変更中..." : "メールアドレスを変更"}
          </button>
        </div>
      </div>
    </div>
  );
}
