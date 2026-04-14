"use client";

import { useTalkContext } from "./TalkContext";
import { MAX_PINS, isImageUrl, formatDateShortUtil } from "./constants";
import FriendItem from "./FriendItem";

export default function FriendListColumn() {
  const ctx = useTalkContext();

  return (
    <div className={`w-full md:w-[300px] flex-1 md:flex-none md:flex-shrink-0 border-r border-gray-200/80 flex flex-col min-h-0 bg-white ${
      ctx.selectedPatient && ctx.mobileView !== "list" ? "hidden md:flex" : "flex"
    }`}>
      {/* 検索 */}
      <div className="p-3 border-b border-gray-100 space-y-1.5">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-400 font-bold tracking-wider">ID</span>
          <input
            type="text"
            value={ctx.searchId}
            onChange={(e) => ctx.setSearchId(e.target.value)}
            placeholder="患者IDで検索"
            className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
          />
          {ctx.searchId && (
            <button onClick={() => ctx.setSearchId("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="relative">
          <svg className="w-3.5 h-3.5 text-gray-300 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            value={ctx.searchName}
            onChange={(e) => ctx.setSearchName(e.target.value)}
            placeholder="氏名で検索"
            className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
          />
          {ctx.searchName && (
            <button onClick={() => ctx.setSearchName("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="relative">
          <svg className="w-3.5 h-3.5 text-gray-300 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          <input
            type="text"
            value={ctx.searchMessage}
            onChange={(e) => ctx.setSearchMessage(e.target.value)}
            placeholder="メッセージ内容で検索"
            className="w-full pl-8 pr-7 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50 transition-all"
          />
          {ctx.searchMessage && (
            <button onClick={() => ctx.setSearchMessage("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-0.5">
          <span>{ctx.filteredFriends.length}{ctx.hasMore ? "+" : ""}件</span>
          {ctx.pinnedFriends.length > 0 && (
            <span className="flex items-center gap-0.5 text-amber-500">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
              {ctx.pinnedFriends.length}
            </span>
          )}
          <label className="flex items-center gap-1 cursor-pointer select-none ml-auto">
            <input
              type="checkbox"
              checked={ctx.showUnreadOnly}
              onChange={(e) => ctx.setShowUnreadOnly(e.target.checked)}
              className="w-3 h-3 accent-[#00B900] rounded"
            />
            <span className="text-[10px] text-gray-500">未読のみ（{ctx.showUnreadOnly ? ctx.filteredFriends.length : ctx.unreadCount}件）</span>
          </label>
        </div>
      </div>

      {/* 友達一覧 / メッセージ検索結果 */}
      <div
        ref={ctx.listRef}
        onScroll={ctx.handleListScroll}
        onTouchStart={ctx.handleTouchStart}
        onTouchMove={ctx.handleTouchMove}
        onTouchEnd={ctx.handleTouchEnd}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        {/* プルダウンリフレッシュ表示 */}
        {(ctx.pullDistance > 0 || ctx.pullRefreshing) && (
          <div
            className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
            style={{ height: ctx.pullRefreshing ? ctx.PULL_THRESHOLD : ctx.pullDistance }}
          >
            {ctx.pullRefreshing ? (
              <div className="w-5 h-5 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
            ) : (
              <div className={`text-[11px] transition-all ${ctx.pullDistance >= ctx.PULL_THRESHOLD ? "text-[#00B900] font-medium" : "text-gray-300"}`}>
                {ctx.pullDistance >= ctx.PULL_THRESHOLD ? "離して更新" : "↓ 引っ張って更新"}
              </div>
            )}
          </div>
        )}
        {ctx.searchMessage.trim() ? (
          /* メッセージ検索結果モード */
          ctx.msgSearching ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
            </div>
          ) : ctx.msgSearchResults.length === 0 ? (
            <div className="text-center py-16 text-gray-300 text-xs">該当するメッセージなし</div>
          ) : (
            <div>
              <div className="px-3 py-1.5 bg-blue-50/60 border-b border-blue-100/50">
                <span className="text-[9px] font-bold text-blue-500 tracking-wider flex items-center gap-1">
                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                  メッセージ検索結果 {ctx.msgSearchResults.length}件
                </span>
              </div>
              {ctx.msgSearchResults.map((msg, i) => {
                const friend = ctx.friends.find(f => f.patient_id === msg.patient_id);
                const displayName = friend?.patient_name || msg.patient_id;
                const snippet = isImageUrl(msg.content) ? "[画像]" : msg.content.length > 60 ? msg.content.slice(0, 60) + "…" : msg.content;
                const sentDate = formatDateShortUtil(msg.sent_at);
                return (
                  <button
                    key={`${msg.patient_id}-${msg.sent_at}-${i}`}
                    onClick={() => {
                      const f = friend || { patient_id: msg.patient_id, pid: null, patient_name: msg.patient_id, line_id: null, mark: "none", tags: [], fields: {} };
                      ctx.selectPatient(f);
                    }}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50/80 transition-colors ${ctx.selectedPatient?.patient_id === msg.patient_id ? "bg-[#00B900]/[0.12]" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-medium text-gray-800 truncate">{displayName}</span>
                      <span className="text-[11px] text-gray-700 flex-shrink-0 ml-2">{sentDate}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-2">{snippet}</p>
                  </button>
                );
              })}
            </div>
          )
        ) : ctx.friendsLoading || (ctx.friendsSearching && ctx.friends.length === 0) ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
          </div>
        ) : ctx.filteredFriends.length === 0 ? (
          <div className="text-center py-16 text-gray-300 text-xs">該当なし</div>
        ) : (
          <>
            {ctx.pinnedFriends.length > 0 && ctx.pinnedFriends.map(f => (
              <FriendItem key={f.patient_id} f={f} isPinned={true}
                isSelected={ctx.selectedPatient?.patient_id === f.patient_id}
                onSelect={ctx.selectPatient} onTogglePin={ctx.togglePin}
                getMarkColor={ctx.getMarkColor} getMarkLabel={ctx.getMarkLabel} formatDateShort={ctx.formatDateShort}
                canPin={ctx.pinnedIds.length < MAX_PINS}
              />
            ))}
            {ctx.unpinnedFriends.map(f => (
              <FriendItem key={f.patient_id} f={f} isPinned={ctx.pinnedIds.includes(f.patient_id)}
                isSelected={ctx.selectedPatient?.patient_id === f.patient_id}
                onSelect={ctx.selectPatient} onTogglePin={ctx.togglePin}
                getMarkColor={ctx.getMarkColor} getMarkLabel={ctx.getMarkLabel} formatDateShort={ctx.formatDateShort}
                canPin={ctx.pinnedIds.length < MAX_PINS}
              />
            ))}
            {ctx.hasMore && (
              <div className="px-3 py-3 text-center">
                {ctx.friendsSearching ? (
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin mx-auto" />
                ) : (
                <button
                  onClick={() => { ctx.setFriendsSearching(true); ctx.fetchFriends({ id: ctx.searchId, name: ctx.searchName, offset: ctx.friendsOffsetRef.current, append: true, unreadOnly: ctx.showUnreadOnly }); }}
                  className="text-[11px] text-[#00B900] hover:text-[#009900] font-medium transition-colors"
                >
                  さらに表示
                </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
