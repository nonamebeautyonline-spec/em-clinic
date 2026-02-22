"use client";

import { useState } from "react";
import { DEMO_PATIENTS, type DemoPatient } from "../_data/mock";

const ALL_TAGS = ["VIP", "GLP-1", "新規", "リピーター"];

export default function DemoFriendsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<DemoPatient | null>(null);

  const filtered = DEMO_PATIENTS.filter((p) => {
    const matchSearch = !searchQuery || p.name.includes(searchQuery) || p.kana.includes(searchQuery) || p.lineDisplayName.includes(searchQuery);
    const matchTag = !selectedTag || p.tags.some((t) => t.name === selectedTag);
    return matchSearch && matchTag;
  });

  return (
    <div className="p-6 pb-16 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">友だち管理</h1>
        <p className="text-sm text-slate-500 mt-1">LINE友だちの一覧管理・タグ・フィルタリング</p>
      </div>

      {/* 検索・フィルタ */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="名前・カナ・LINE名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !selectedTag ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              全て
            </button>
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedTag === tag ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2">{filtered.length}件の友だち</p>
      </div>

      <div className="flex gap-4">
        {/* テーブル */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">名前</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">LINE名</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">タグ</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">マーク</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">最終来院</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden xl:table-cell">メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((patient) => (
                  <tr
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`hover:bg-slate-50 cursor-pointer transition-colors ${
                      selectedPatient?.id === patient.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{patient.name}</p>
                        <p className="text-xs text-slate-500">{patient.kana}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden md:table-cell">{patient.lineDisplayName}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {patient.tags.map((tag) => (
                          <span key={tag.name} className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-lg hidden sm:table-cell">{patient.mark}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 hidden lg:table-cell">{patient.lastVisit}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 hidden xl:table-cell max-w-[200px] truncate">{patient.memo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 詳細パネル */}
        {selectedPatient && (
          <div className="hidden lg:block w-80 bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">患者詳細</h3>
              <button onClick={() => setSelectedPatient(null)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <DetailRow label="氏名" value={selectedPatient.name} />
              <DetailRow label="カナ" value={selectedPatient.kana} />
              <DetailRow label="性別" value={selectedPatient.gender} />
              <DetailRow label="年齢" value={`${selectedPatient.age}歳 (${selectedPatient.birthDate})`} />
              <DetailRow label="電話番号" value={selectedPatient.tel} />
              <DetailRow label="LINE名" value={selectedPatient.lineDisplayName} />
              <DetailRow label="マーク" value={selectedPatient.mark} />
              <DetailRow label="最終来院" value={selectedPatient.lastVisit} />
              <DetailRow label="メモ" value={selectedPatient.memo} />
              <div>
                <p className="text-xs text-slate-500 mb-1">タグ</p>
                <div className="flex gap-1 flex-wrap">
                  {selectedPatient.tags.map((tag) => (
                    <span key={tag.name} className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <button className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                トークを開く
              </button>
              <button className="w-full py-2 px-4 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
                予約履歴を見る
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-slate-800 font-medium">{value}</p>
    </div>
  );
}
