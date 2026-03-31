"use client";
// SALON: スタンプカード管理画面

import { useState, useEffect, useCallback } from "react";

// ---------- 型定義 ----------
interface StampCard {
  id: string;
  patient_id: number;
  current_stamps: number;
  completed_count: number;
  last_stamp_at: string | null;
  patients: { id: number; name: string; name_kana: string } | null;
}

interface Settings {
  stamps_required: number;
  reward_type: string;
  reward_config: Record<string, unknown>;
}

interface Stats {
  total_cards: number;
  active_cards: number;
  total_completed: number;
}

// ---------- 特典タイプラベル ----------
const REWARD_LABELS: Record<string, string> = {
  coupon: "クーポン",
  discount: "割引",
  free_menu: "無料メニュー",
};

export default function StampCardsPage() {
  const [settings, setSettings] = useState<Settings>({
    stamps_required: 10,
    reward_type: "coupon",
    reward_config: {},
  });
  const [cards, setCards] = useState<StampCard[]>([]);
  const [stats, setStats] = useState<Stats>({ total_cards: 0, active_cards: 0, total_completed: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stampingId, setStampingId] = useState<number | null>(null);

  // 設定フォーム用
  const [formRequired, setFormRequired] = useState(10);
  const [formRewardType, setFormRewardType] = useState("coupon");

  // データ取得
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stamp-cards");
      if (!res.ok) throw new Error("取得失敗");
      const json = await res.json();
      setCards(json.cards || []);
      setStats(json.stats || { total_cards: 0, active_cards: 0, total_completed: 0 });
      if (json.settings) {
        setSettings(json.settings);
        setFormRequired(json.settings.stamps_required || 10);
        setFormRewardType(json.settings.reward_type || "coupon");
      }
    } catch (err) {
      console.error("スタンプカードデータ取得エラー:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 設定保存
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/stamp-cards/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stamps_required: formRequired,
          reward_type: formRewardType,
          reward_config: {},
        }),
      });
      if (!res.ok) throw new Error("保存失敗");
      const json = await res.json();
      setSettings(json.settings);
      // 一覧もリロード（stamps_requiredが変わるとプログレスバーに影響）
      await fetchData();
    } catch (err) {
      console.error("設定保存エラー:", err);
      alert("設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  // スタンプ付与
  const handleStamp = async (patientId: number) => {
    setStampingId(patientId);
    try {
      const res = await fetch("/api/admin/stamp-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patientId }),
      });
      if (!res.ok) throw new Error("スタンプ付与失敗");
      const json = await res.json();
      if (json.completed) {
        alert("特典達成！おめでとうございます！");
      }
      await fetchData();
    } catch (err) {
      console.error("スタンプ付与エラー:", err);
      alert("スタンプの付与に失敗しました");
    } finally {
      setStampingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900">スタンプカード</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
          <p className="text-slate-400">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">スタンプカード</h1>
      </div>

      {/* 設定カード */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">スタンプカード設定</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              特典獲得に必要なスタンプ数
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={formRequired}
              onChange={(e) => setFormRequired(parseInt(e.target.value, 10) || 1)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              特典タイプ
            </label>
            <select
              value={formRewardType}
              onChange={(e) => setFormRewardType(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="coupon">クーポン</option>
              <option value="discount">割引</option>
              <option value="free_menu">無料メニュー</option>
            </select>
          </div>
          <div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full bg-purple-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? "保存中..." : "設定を保存"}
            </button>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          現在の設定: {settings.stamps_required}スタンプで{REWARD_LABELS[settings.reward_type] || settings.reward_type}を付与
        </p>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">総カード数</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total_cards}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">スタンプ付与済み</p>
          <p className="text-3xl font-bold text-purple-600 mt-1">{stats.active_cards}</p>
          <p className="text-xs text-slate-400 mt-1">1つ以上スタンプがある顧客</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <p className="text-sm text-slate-500">特典達成回数</p>
          <p className="text-3xl font-bold text-green-600 mt-1">{stats.total_completed}</p>
          <p className="text-xs text-slate-400 mt-1">累計コンプリート回数</p>
        </div>
      </div>

      {/* 顧客別スタンプ一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">顧客別スタンプ一覧</h2>
        </div>
        {cards.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-4xl mb-4">🎫</p>
            <p className="text-slate-500 text-sm">まだスタンプカードがありません</p>
            <p className="text-slate-400 text-xs mt-1">
              来店時にスタンプを付与すると、ここに表示されます
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    お客様名
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    スタンプ進捗
                  </th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    達成回数
                  </th>
                  <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    最終付与日
                  </th>
                  <th className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cards.map((card) => {
                  const progress =
                    settings.stamps_required > 0
                      ? Math.min((card.current_stamps / settings.stamps_required) * 100, 100)
                      : 0;
                  return (
                    <tr key={card.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {card.patients?.name || `患者ID: ${card.patient_id}`}
                          </p>
                          {card.patients?.name_kana && (
                            <p className="text-xs text-slate-400">{card.patients.name_kana}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-3 bg-purple-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                            {card.current_stamps}/{settings.stamps_required}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {card.completed_count}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-sm text-slate-500">
                        {card.last_stamp_at
                          ? new Date(card.last_stamp_at).toLocaleDateString("ja-JP")
                          : "-"}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => handleStamp(card.patient_id)}
                          disabled={stampingId === card.patient_id}
                          className="inline-flex items-center gap-1 bg-purple-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {stampingId === card.patient_id ? (
                            "付与中..."
                          ) : (
                            <>
                              <span>+1</span>
                              <span>スタンプ</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
