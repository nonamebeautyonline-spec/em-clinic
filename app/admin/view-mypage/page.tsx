"use client";

import { useState } from "react";
import AdminMypageView from "./AdminMypageView";

export default function AdminViewMypagePage() {
  const [patientId, setPatientId] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);
  const [showJson, setShowJson] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setData(null);

    try {
      const res = await fetch(
        `/api/admin/view-mypage?patient_id=${encodeURIComponent(patientId)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${adminToken}`,
          },
        }
      );

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || `HTTP ${res.status} error`);
        return;
      }

      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setData(null);
    setError("");
    setShowJson(false);
  };

  // ログインフォームまたはエラー表示
  if (!data || error) {
    return (
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <h1 style={{ marginBottom: "2rem" }}>管理者用：マイページデータ確認</h1>

        <form onSubmit={handleSubmit} style={{ marginBottom: "2rem" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="patientId" style={{ display: "block", marginBottom: "0.5rem" }}>
              患者ID (Patient ID):
            </label>
            <input
              id="patientId"
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="例: 20251200128"
              required
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: "0.5rem",
                fontSize: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="adminToken" style={{ display: "block", marginBottom: "0.5rem" }}>
              管理者トークン (Admin Token):
            </label>
            <input
              id="adminToken"
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="ADMIN_TOKEN"
              required
              style={{
                width: "100%",
                maxWidth: "400px",
                padding: "0.5rem",
                fontSize: "1rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.75rem 2rem",
              fontSize: "1rem",
              backgroundColor: loading ? "#ccc" : "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "読み込み中..." : "データ取得"}
          </button>
        </form>

        {error && (
          <div
            style={{
              padding: "1rem",
              backgroundColor: "#fee",
              border: "1px solid #fcc",
              borderRadius: "4px",
              marginBottom: "1rem",
              color: "#c00",
            }}
          >
            エラー: {error}
          </div>
        )}
      </div>
    );
  }

  // データ取得成功：レンダリングビューまたはJSONビュー
  return (
    <div>
      {/* 管理者用ヘッダー */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          backgroundColor: "#1e293b",
          color: "white",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={handleBack}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#475569",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            ← 戻る
          </button>
          <div style={{ fontSize: "0.875rem" }}>
            <strong>患者ID:</strong> {data.patientId} |{" "}
            <strong>ソース:</strong> {data.source === "cache" ? "キャッシュ" : "Supabase"}
          </div>
        </div>
        <button
          onClick={() => setShowJson(!showJson)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: showJson ? "#ec4899" : "#475569",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "0.875rem",
          }}
        >
          {showJson ? "UI表示" : "JSON表示"}
        </button>
      </div>

      {/* コンテンツ */}
      {showJson ? (
        <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
          <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem", fontWeight: "600" }}>
            JSONデータ
          </h2>
          <pre
            style={{
              padding: "1rem",
              backgroundColor: "#f9f9f9",
              border: "1px solid #ddd",
              borderRadius: "4px",
              overflow: "auto",
              fontSize: "0.875rem",
              lineHeight: "1.5",
            }}
          >
            {JSON.stringify(data.data, null, 2)}
          </pre>
        </div>
      ) : (
        <AdminMypageView data={data.data} />
      )}
    </div>
  );
}
