"use client";

import { useState } from "react";
import {
  DEMO_PATIENTS,
  DEMO_MESSAGES,
  DEMO_TEMPLATES,
  DEMO_ORDERS,
  DEMO_REORDERS,
  DEMO_RESERVATIONS,
  DEMO_RICH_MENUS,
  DEMO_TAG_DEFINITIONS,
  getNextReservation,
  getPatientReorders,
  type DemoMessage,
  type DemoPatient,
} from "../_data/mock";

const FRIENDS = DEMO_PATIENTS.slice(0, 10);

function getInitial(name: string) {
  return name.charAt(0);
}

function getAvatarColor(id: string) {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-purple-500", "bg-pink-500", "bg-amber-500", "bg-cyan-500", "bg-red-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500"];
  const idx = parseInt(id.replace("P", ""), 10) % colors.length;
  return colors[idx];
}

// 対応マーク選択肢
const MARK_OPTIONS = ["◎", "○", "△", "×", "−"];

// 右カラムセクションの表示設定
const DEFAULT_SECTIONS = {
  personalInfo: true,
  nextReservation: true,
  mark: true,
  tags: true,
  medicalInfo: true,
  latestOrder: true,
  orderHistory: true,
  reorder: true,
  richMenu: true,
};

type SectionKey = keyof typeof DEFAULT_SECTIONS;
const SECTION_LABELS: Record<SectionKey, string> = {
  personalInfo: "個人情報",
  nextReservation: "次回予約",
  mark: "対応マーク",
  tags: "タグ",
  medicalInfo: "問診事項",
  latestOrder: "最新決済",
  orderHistory: "処方履歴",
  reorder: "再処方",
  richMenu: "リッチメニュー",
};

export default function DemoTalkPage() {
  const [selectedFriendId, setSelectedFriendId] = useState<string>(FRIENDS[0].id);
  const [messages, setMessages] = useState<Record<string, DemoMessage[]>>(DEMO_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [showProfile, setShowProfile] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [searchQuery, setSearchQuery] = useState("");

  // 右カラム用ステート
  const [patientMarks, setPatientMarks] = useState<Record<string, string>>(
    Object.fromEntries(FRIENDS.map((f) => [f.id, f.mark]))
  );
  const [patientTags, setPatientTags] = useState<Record<string, { name: string; color: string }[]>>(
    Object.fromEntries(FRIENDS.map((f) => [f.id, [...f.tags]]))
  );
  const [patientMenus, setPatientMenus] = useState<Record<string, string>>(
    Object.fromEntries(FRIENDS.map((f) => [f.id, f.richMenuName]))
  );
  const [sectionVisibility, setSectionVisibility] = useState(DEFAULT_SECTIONS);
  const [showSectionSettings, setShowSectionSettings] = useState(false);
  const [showTagAdd, setShowTagAdd] = useState(false);

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

    // 自動返信シミュレーション
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

  // タグ追加
  const handleAddTag = (tagName: string, tagColor: string) => {
    setPatientTags((prev) => {
      const current = prev[selectedFriendId] || [];
      if (current.find((t) => t.name === tagName)) return prev;
      return { ...prev, [selectedFriendId]: [...current, { name: tagName, color: tagColor }] };
    });
    setShowTagAdd(false);
  };

  // タグ削除
  const handleRemoveTag = (tagName: string) => {
    setPatientTags((prev) => ({
      ...prev,
      [selectedFriendId]: (prev[selectedFriendId] || []).filter((t) => t.name !== tagName),
    }));
  };

  // 注文データ取得
  const orders = DEMO_ORDERS[selectedFriendId] || [];
  const latestOrder = orders[0] || null;
  const nextRes = getNextReservation(selectedFriendId);
  const reorders = getPatientReorders(selectedFriendId);
  const currentTags = patientTags[selectedFriendId] || [];

  return (
    <div className="h-full flex">
      {/* 友だち一覧（左カラム） */}
      <div className={`w-full md:w-80 lg:w-80 border-r border-slate-200 bg-white flex flex-col ${mobileView === "chat" ? "hidden md:flex" : "flex"}`}>
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
                  {(patientTags[friend.id] || friend.tags).length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {(patientTags[friend.id] || friend.tags).map((tag) => (
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
            className={`p-2 rounded-lg transition-colors ${showProfile ? "bg-blue-100 text-blue-600" : "hover:bg-slate-100 text-slate-500"}`}
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
          {DEMO_TEMPLATES.slice(0, 6).map((tmpl) => (
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

      {/* 右カラム（詳細プロフィール） */}
      {showProfile && (
        <div className="hidden lg:flex w-80 xl:w-96 bg-white border-l border-slate-200 flex-col">
          {/* 右カラムヘッダー */}
          <div className="p-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full ${getAvatarColor(selectedFriendId)} flex items-center justify-center text-white font-bold text-xs`}>
                {getInitial(selectedFriend.lineDisplayName)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{selectedFriend.name}</p>
                <p className="text-xs text-slate-500">{selectedFriend.lineDisplayName}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSectionSettings(!showSectionSettings)}
                className="p-1.5 hover:bg-slate-100 rounded text-slate-400"
                title="表示設定"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button onClick={() => setShowProfile(false)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* セクション表示設定モーダル */}
          {showSectionSettings && (
            <div className="p-3 border-b border-slate-200 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 mb-2">表示セクション設定</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(sectionVisibility) as SectionKey[]).map((key) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sectionVisibility[key]}
                      onChange={() => setSectionVisibility((prev) => ({ ...prev, [key]: !prev[key] }))}
                      className="rounded text-blue-500"
                    />
                    {SECTION_LABELS[key]}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* スクロール可能セクション一覧 */}
          <div className="flex-1 overflow-y-auto">
            {/* 1. 個人情報 */}
            {sectionVisibility.personalInfo && (
              <Section title="個人情報">
                <InfoGrid>
                  <InfoItem label="カナ" value={selectedFriend.kana} />
                  <InfoItem label="性別" value={selectedFriend.gender} />
                  <InfoItem label="生年月日" value={`${selectedFriend.birthDate}（${selectedFriend.age}歳）`} />
                  <InfoItem label="電話番号" value={selectedFriend.tel} />
                  <InfoItem label="メール" value={selectedFriend.email} />
                </InfoGrid>
              </Section>
            )}

            {/* 2. 次回予約 */}
            {sectionVisibility.nextReservation && (
              <Section title="次回予約">
                {nextRes ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-blue-600 font-semibold text-sm">{nextRes.date} {nextRes.time}</span>
                    </div>
                    <p className="text-xs text-blue-700">{nextRes.menu}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">予約なし</p>
                )}
              </Section>
            )}

            {/* 3. 対応マーク */}
            {sectionVisibility.mark && (
              <Section title="対応マーク">
                <div className="flex items-center gap-2">
                  <select
                    value={patientMarks[selectedFriendId] || "○"}
                    onChange={(e) => setPatientMarks((prev) => ({ ...prev, [selectedFriendId]: e.target.value }))}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {MARK_OPTIONS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-500">
                    {patientMarks[selectedFriendId] === "◎" && "最重要"}
                    {patientMarks[selectedFriendId] === "○" && "通常"}
                    {patientMarks[selectedFriendId] === "△" && "要注意"}
                    {patientMarks[selectedFriendId] === "×" && "対応不可"}
                    {patientMarks[selectedFriendId] === "−" && "未設定"}
                  </span>
                </div>
              </Section>
            )}

            {/* 4. タグ */}
            {sectionVisibility.tags && (
              <Section title="タグ">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {currentTags.map((tag) => (
                    <span key={tag.name} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white font-medium" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag.name)}
                        className="ml-0.5 hover:bg-white/20 rounded-full w-3.5 h-3.5 flex items-center justify-center text-[10px]"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {currentTags.length === 0 && <span className="text-xs text-slate-400">タグなし</span>}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowTagAdd(!showTagAdd)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + タグを追加
                  </button>
                  {showTagAdd && (
                    <div className="absolute top-6 left-0 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-10 w-48">
                      {DEMO_TAG_DEFINITIONS.filter((t) => !currentTags.find((ct) => ct.name === t.name)).map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => handleAddTag(tag.name, tag.color)}
                          className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50 rounded flex items-center gap-2"
                        >
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </button>
                      ))}
                      {DEMO_TAG_DEFINITIONS.filter((t) => !currentTags.find((ct) => ct.name === t.name)).length === 0 && (
                        <p className="text-xs text-slate-400 p-2">すべてのタグが追加済み</p>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* 5. 問診事項 */}
            {sectionVisibility.medicalInfo && (
              <Section title="問診事項">
                <InfoGrid>
                  <InfoItem label="既往歴" value={selectedFriend.medHistory} />
                  <InfoItem label="GLP-1使用歴" value={selectedFriend.glp1History} />
                  <InfoItem label="内服薬" value={selectedFriend.currentMeds} />
                  <InfoItem label="アレルギー" value={selectedFriend.allergies} />
                </InfoGrid>
              </Section>
            )}

            {/* 6. 最新決済 */}
            {sectionVisibility.latestOrder && (
              <Section title="最新決済">
                {latestOrder ? (
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">商品</span>
                      <span className="text-xs font-medium text-slate-800">{latestOrder.product}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">金額</span>
                      <span className="text-xs font-medium text-slate-800">¥{latestOrder.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">決済方法</span>
                      <span className="text-xs font-medium text-slate-800">{latestOrder.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">日時</span>
                      <span className="text-xs font-medium text-slate-800">{latestOrder.paidAt}</span>
                    </div>
                    {latestOrder.trackingNumber && (
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">追跡番号</span>
                        <span className="text-xs font-medium text-blue-600 cursor-pointer hover:underline">{latestOrder.trackingNumber}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">注文履歴なし</p>
                )}
              </Section>
            )}

            {/* 7. 処方履歴 */}
            {sectionVisibility.orderHistory && (
              <Section title="処方履歴">
                {orders.length > 0 ? (
                  <div className="space-y-1.5">
                    {orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-xs font-medium text-slate-700">{order.product}</p>
                          <p className="text-[10px] text-slate-400">{order.paidAt.split(" ")[0]}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-medium text-slate-800">¥{order.amount.toLocaleString()}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${order.status === "完了" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {order.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">履歴なし</p>
                )}
              </Section>
            )}

            {/* 8. 再処方 */}
            {sectionVisibility.reorder && (
              <Section title="再処方">
                {reorders.length > 0 ? (
                  <div className="space-y-2">
                    {reorders.map((ro) => {
                      const statusColor: Record<string, string> = {
                        "申請中": "bg-yellow-100 text-yellow-700",
                        "承認済み": "bg-green-100 text-green-700",
                        "決済済み": "bg-blue-100 text-blue-700",
                        "発送済み": "bg-purple-100 text-purple-700",
                        "拒否": "bg-red-100 text-red-700",
                      };
                      return (
                        <div key={ro.id} className="bg-slate-50 rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700">{ro.product}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[ro.status] || ""}`}>
                              {ro.status}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400">{ro.requestedAt}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">再処方なし</p>
                )}
              </Section>
            )}

            {/* 9. リッチメニュー */}
            {sectionVisibility.richMenu && (
              <Section title="リッチメニュー">
                <div className="flex items-center gap-2">
                  <select
                    value={patientMenus[selectedFriendId] || ""}
                    onChange={(e) => setPatientMenus((prev) => ({ ...prev, [selectedFriendId]: e.target.value }))}
                    className="flex-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DEMO_RICH_MENUS.map((menu) => (
                      <option key={menu.id} value={menu.name}>{menu.name}</option>
                    ))}
                  </select>
                </div>
              </Section>
            )}

            {/* メモ */}
            <Section title="メモ">
              <p className="text-xs text-slate-700 bg-slate-50 rounded-lg p-2">{selectedFriend.memo || "メモなし"}</p>
            </Section>

            {/* 最終来院 */}
            <div className="px-4 py-2 text-[10px] text-slate-400">
              最終来院: {selectedFriend.lastVisit}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// セクションラッパー
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-slate-100">
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  );
}

// 情報グリッド
function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

// 情報行
function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-800 text-right max-w-[60%]">{value}</span>
    </div>
  );
}
