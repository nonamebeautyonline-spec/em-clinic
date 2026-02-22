"use client";

import { useState } from "react";
import { DEMO_PATIENTS, DEMO_MESSAGES, DEMO_TEMPLATES, type DemoMessage } from "../_data/mock";

const FRIENDS = DEMO_PATIENTS.slice(0, 10);

function getInitial(name: string) {
  return name.charAt(0);
}

function getAvatarColor(id: string) {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-pink-500", "bg-amber-500", "bg-cyan-500", "bg-red-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500"];
  const idx = parseInt(id.replace("P", ""), 10) % colors.length;
  return colors[idx];
}

export default function DemoTalkPage() {
  const [selectedFriendId, setSelectedFriendId] = useState<string>(FRIENDS[0].id);
  const [messages, setMessages] = useState<Record<string, DemoMessage[]>>(DEMO_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedFriend = FRIENDS.find((f) => f.id === selectedFriendId)!;
  const currentMessages = messages[selectedFriendId] || [];

  const filteredFriends = searchQuery
    ? FRIENDS.filter((f) => f.name.includes(searchQuery) || f.lineDisplayName.includes(searchQuery))
    : FRIENDS;

  const handleSend = () => {
    if (!inputText.trim()) return;
    const newMsg: DemoMessage = {
      id: Date.now(),
      content: inputText.trim(),
      direction: "outgoing",
      sentAt: new Date().toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      type: "text",
    };
    setMessages((prev) => ({
      ...prev,
      [selectedFriendId]: [...(prev[selectedFriendId] || []), newMsg],
    }));
    setInputText("");

    // 自動返信のシミュレーション（2秒後）
    setTimeout(() => {
      const autoReply: DemoMessage = {
        id: Date.now() + 1,
        content: "ありがとうございます。確認いたします。",
        direction: "incoming",
        sentAt: new Date().toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        type: "text",
      };
      setMessages((prev) => ({
        ...prev,
        [selectedFriendId]: [...(prev[selectedFriendId] || []), autoReply],
      }));
    }, 2000);
  };

  const handleTemplateClick = (body: string) => {
    setInputText(body);
  };

  const selectFriend = (id: string) => {
    setSelectedFriendId(id);
    setMobileView("chat");
  };

  return (
    <div className="h-full flex">
      {/* 友だち一覧（左カラム） */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 bg-white flex flex-col ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}>
        <div className="p-3 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800 mb-2">トーク</h2>
          <input
            type="text"
            placeholder="友だちを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredFriends.map((friend) => {
            const lastMsg = (messages[friend.id] || []).at(-1);
            const isSelected = friend.id === selectedFriendId;
            return (
              <button
                key={friend.id}
                onClick={() => selectFriend(friend.id)}
                className={`w-full px-3 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left ${
                  isSelected ? "bg-blue-50 border-l-4 border-blue-500" : ""
                }`}
              >
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(friend.id)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                  {getInitial(friend.lineDisplayName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800 truncate">{friend.lineDisplayName}</span>
                    {lastMsg && <span className="text-[10px] text-slate-400 ml-2 shrink-0">{lastMsg.sentAt.split(" ")[1]}</span>}
                  </div>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {lastMsg ? (lastMsg.direction === "outgoing" ? "✓ " : "") + lastMsg.content : "メッセージなし"}
                  </p>
                  {friend.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {friend.tags.map((tag) => (
                        <span key={tag.name} className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* メッセージスレッド（中央カラム） */}
      <div className={`flex-1 flex flex-col bg-slate-100 ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
        {/* ヘッダー */}
        <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center gap-3">
          <button
            onClick={() => setMobileView("list")}
            className="md:hidden p-1 hover:bg-slate-100 rounded"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className={`w-8 h-8 rounded-full ${getAvatarColor(selectedFriendId)} flex items-center justify-center text-white font-bold text-xs`}>
            {getInitial(selectedFriend.lineDisplayName)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">{selectedFriend.lineDisplayName}</p>
            <p className="text-xs text-slate-500">{selectedFriend.name}</p>
          </div>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {/* メッセージ表示エリア */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {currentMessages.length === 0 && (
            <div className="text-center text-slate-400 text-sm mt-12">メッセージはありません</div>
          )}
          {currentMessages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.direction === "outgoing" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.direction === "outgoing"
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-md"
                }`}
              >
                {msg.content}
                <div className={`text-[10px] mt-1 ${msg.direction === "outgoing" ? "text-blue-200" : "text-slate-400"}`}>
                  {msg.direction === "outgoing" && "✓ "}
                  {msg.sentAt.split(" ")[1] || msg.sentAt}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* テンプレートボタン */}
        <div className="px-4 py-2 bg-white border-t border-slate-200 flex gap-2 overflow-x-auto">
          {DEMO_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => handleTemplateClick(tmpl.body)}
              className="shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs text-slate-600 rounded-full border border-slate-200 transition-colors"
            >
              {tmpl.title}
            </button>
          ))}
        </div>

        {/* 入力エリア */}
        <div className="px-4 py-3 bg-white border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="メッセージを入力..."
              className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-full text-sm font-medium hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              送信
            </button>
          </div>
        </div>
      </div>

      {/* プロフィールパネル（右カラム） */}
      {showProfile && (
        <div className="hidden lg:flex w-80 bg-white border-l border-slate-200 flex-col">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">プロフィール</h3>
            <button onClick={() => setShowProfile(false)} className="p-1 hover:bg-slate-100 rounded">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            <div className="text-center">
              <div className={`w-16 h-16 rounded-full ${getAvatarColor(selectedFriendId)} flex items-center justify-center text-white font-bold text-2xl mx-auto mb-2`}>
                {getInitial(selectedFriend.lineDisplayName)}
              </div>
              <p className="font-semibold text-slate-800">{selectedFriend.name}</p>
              <p className="text-sm text-slate-500">{selectedFriend.lineDisplayName}</p>
            </div>

            <div className="space-y-3 text-sm">
              <InfoRow label="性別" value={selectedFriend.gender} />
              <InfoRow label="年齢" value={`${selectedFriend.age}歳`} />
              <InfoRow label="電話番号" value={selectedFriend.tel} />
              <InfoRow label="最終来院" value={selectedFriend.lastVisit} />
              <InfoRow label="メモ" value={selectedFriend.memo} />
              <div>
                <p className="text-slate-500 mb-1">タグ</p>
                <div className="flex flex-wrap gap-1">
                  {selectedFriend.tags.map((tag) => (
                    <span key={tag.name} className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-500 mb-1">マーク</p>
                <span className="text-lg">{selectedFriend.mark}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="text-slate-800 font-medium">{value}</p>
    </div>
  );
}
