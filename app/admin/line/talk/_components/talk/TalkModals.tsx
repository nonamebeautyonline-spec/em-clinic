"use client";

import { useTalkContext } from "./TalkContext";

export default function TalkModals() {
  const ctx = useTalkContext();

  return (
    <>
      {/* テンプレート送信確認モーダル */}
      {ctx.pendingTemplate && ctx.selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => ctx.setPendingTemplate(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 text-sm">テンプレート送信確認</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">「{ctx.pendingTemplate.name}」を {ctx.selectedPatient.patient_name} に送信しますか？</p>
            </div>
            <div className="px-5 py-4 max-h-60 overflow-y-auto">
              {ctx.pendingTemplate.message_type === "image" ? (
                <img src={ctx.pendingTemplate.content} alt="" className="max-w-full rounded-lg" />
              ) : (
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{ctx.pendingTemplate.content}</p>
              )}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => ctx.setPendingTemplate(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
              >キャンセル</button>
              {ctx.pendingTemplate.message_type !== "image" && (
                <button
                  onClick={() => {
                    ctx.setNewMessage(ctx.pendingTemplate!.content);
                    ctx.setPendingTemplate(null);
                    setTimeout(() => {
                      if (ctx.inputRef.current) {
                        ctx.inputRef.current.focus();
                        ctx.inputRef.current.style.height = "auto";
                        ctx.inputRef.current.style.height = Math.min(ctx.inputRef.current.scrollHeight, 200) + "px";
                      }
                    }, 0);
                  }}
                  className="px-4 py-2 text-sm text-[#00B900] border border-[#00B900] font-medium rounded-lg hover:bg-[#00B900]/5 transition-colors"
                >修正して使用</button>
              )}
              <button
                onClick={() => ctx.sendTemplate(ctx.pendingTemplate!)}
                disabled={ctx.sending}
                className="px-4 py-2 bg-[#00B900] text-white text-sm font-medium rounded-lg hover:bg-[#009900] disabled:opacity-50 transition-colors"
              >送信</button>
            </div>
          </div>
        </div>
      )}

      {/* 通話フォーム確認モーダル */}
      {ctx.showCallConfirm && ctx.selectedPatient && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => ctx.setShowCallConfirm(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-1">通話フォームを送信</h3>
                <p className="text-sm text-gray-500 mb-1">
                  <span className="font-semibold text-gray-800">{ctx.selectedPatient.patient_name}</span> さんに
                </p>
                <p className="text-sm text-gray-500 mb-5">
                  通話リクエストのメッセージを送信しますか？
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => ctx.setShowCallConfirm(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-medium transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={ctx.handleSendCallForm}
                    disabled={ctx.sendingCall}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-40 text-sm font-medium shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    {ctx.sendingCall ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    )}
                    送信する
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* メディアピッカーモーダル */}
      {ctx.showMediaPicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => ctx.setShowMediaPicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                メディアから選択
              </h3>
              <button onClick={() => ctx.setShowMediaPicker(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <select
                value={ctx.mediaFolderFilter ?? ""}
                onChange={e => ctx.setMediaFolderFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">すべてのフォルダ</option>
                {ctx.mediaFolders.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.file_count})</option>
                ))}
              </select>
              <input
                type="text"
                value={ctx.mediaSearch}
                onChange={e => ctx.setMediaSearch(e.target.value)}
                placeholder="ファイル名で検索"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {ctx.mediaLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
              ) : (() => {
                const filtered = ctx.mediaFiles.filter(f => {
                  if (f.file_type !== "image") return false;
                  if (ctx.mediaFolderFilter && f.folder_id !== ctx.mediaFolderFilter) return false;
                  if (ctx.mediaSearch && !f.name.toLowerCase().includes(ctx.mediaSearch.toLowerCase())) return false;
                  return true;
                });
                return filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-300 text-sm">画像がありません</div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {filtered.map(f => (
                      <button
                        key={f.id}
                        onClick={() => ctx.handleMediaImageSend(f)}
                        disabled={ctx.sendingMediaImage}
                        className="group relative aspect-square rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-500 transition-all disabled:opacity-50"
                      >
                        <img src={f.file_url} alt={f.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-lg px-3 py-1.5 shadow-lg">
                            <span className="text-xs font-medium text-indigo-600">送信</span>
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-[10px] text-white truncate">{f.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            {ctx.sendingMediaImage && (
              <div className="px-5 py-3 border-t border-gray-100 text-center">
                <span className="text-sm text-indigo-600 font-medium">送信中...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDFピッカーモーダル */}
      {ctx.showPdfPicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => ctx.setShowPdfPicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                PDF送信
              </h3>
              <button onClick={() => ctx.setShowPdfPicker(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <select
                value={ctx.pdfFolderFilter ?? ""}
                onChange={e => ctx.setPdfFolderFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="">すべてのフォルダ</option>
                {ctx.pdfFolders.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.file_count})</option>
                ))}
              </select>
              <input
                type="text"
                value={ctx.pdfSearch}
                onChange={e => ctx.setPdfSearch(e.target.value)}
                placeholder="ファイル名で検索"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {ctx.pdfLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
              ) : (() => {
                const filtered = ctx.pdfFiles.filter(f => {
                  if (f.file_type !== "pdf") return false;
                  if (ctx.pdfFolderFilter && f.folder_id !== ctx.pdfFolderFilter) return false;
                  if (ctx.pdfSearch && !f.name.toLowerCase().includes(ctx.pdfSearch.toLowerCase())) return false;
                  return true;
                });
                return filtered.length === 0 ? (
                  <div className="text-center py-12 text-gray-300 text-sm">PDFファイルがありません</div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(f => (
                      <button
                        key={f.id}
                        onClick={() => ctx.handleMediaPdfSend(f)}
                        disabled={ctx.sendingMediaPdf}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50/50 transition-all disabled:opacity-50 group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 transition-colors">
                          <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-gray-800 truncate group-hover:text-orange-700 transition-colors">{f.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {f.media_folders?.name || "未分類"} / {(f.file_size / 1024).toFixed(0)}KB
                          </p>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2.5 py-1 rounded-lg">送信</span>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            {ctx.sendingMediaPdf && (
              <div className="px-5 py-3 border-t border-gray-100 text-center">
                <span className="text-sm text-orange-600 font-medium">送信中...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* アクション選択モーダル */}
      {ctx.showActionPicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => ctx.setShowActionPicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }} onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-bold text-gray-800">アクション実行</h3>
              <button onClick={() => ctx.setShowActionPicker(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-5 py-3 border-b border-gray-100">
              <input
                type="text"
                value={ctx.actionSearch}
                onChange={e => ctx.setActionSearch(e.target.value)}
                placeholder="アクション名で検索"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900]"
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {ctx.actionList.filter(a => !ctx.actionSearch || a.name.toLowerCase().includes(ctx.actionSearch.toLowerCase())).length === 0 ? (
                <div className="text-center py-12 text-gray-300 text-sm">アクションがありません</div>
              ) : (
                ctx.actionList
                  .filter(a => !ctx.actionSearch || a.name.toLowerCase().includes(ctx.actionSearch.toLowerCase()))
                  .map(a => (
                    <button
                      key={a.id}
                      onClick={() => ctx.executeAction(a.id)}
                      disabled={ctx.executingAction}
                      className="w-full text-left px-5 py-3 hover:bg-gray-50 border-b border-gray-50 transition-colors disabled:opacity-50"
                    >
                      <div className="text-sm font-medium text-gray-800">{a.name}</div>
                      <div className="mt-0.5 space-y-0.5">
                        {a.steps.map((step: { type: string; content?: string; tag_name?: string; mark?: string }, si: number) => (
                          <p key={si} className="text-[10px] text-gray-400">
                            {step.type === "send_text" && `テキスト送信: ${step.content?.slice(0, 30) || ""}`}
                            {step.type === "send_template" && "テンプレート送信"}
                            {step.type === "tag_add" && `タグ追加: ${step.tag_name || ""}`}
                            {step.type === "tag_remove" && `タグ削除: ${step.tag_name || ""}`}
                            {step.type === "mark_change" && `マーク変更: ${step.mark || ""}`}
                          </p>
                        ))}
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* テンプレート選択モーダル */}
      {ctx.showTemplatePicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => ctx.setShowTemplatePicker(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ maxHeight: "80vh" }} onClick={(e) => e.stopPropagation()}>
            {/* ヘッダー */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h2 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#00B900]/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-[#00B900]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                テンプレート送信
              </h2>
              <button onClick={() => ctx.setShowTemplatePicker(false)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 検索 & カテゴリフィルタ */}
            <div className="px-5 py-3 border-b border-gray-100 space-y-2 flex-shrink-0">
              <div className="relative">
                <svg className="w-4 h-4 text-gray-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input
                  type="text"
                  value={ctx.templateSearch}
                  onChange={(e) => ctx.setTemplateSearch(e.target.value)}
                  placeholder="テンプレート名・内容で検索"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00B900]/20 focus:border-[#00B900] bg-gray-50/50"
                  autoFocus
                />
              </div>
              {ctx.templateCategories.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {ctx.templateCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => ctx.setTemplateCategoryFilter(ctx.templateCategoryFilter === cat.name ? null : cat.name)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                        ctx.templateCategoryFilter === cat.name ? "bg-[#00B900] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >{cat.name}</button>
                  ))}
                </div>
              )}
            </div>

            {/* テンプレートリスト */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {ctx.templatesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-6 h-6 border-2 border-gray-200 border-t-[#00B900] rounded-full animate-spin" />
                </div>
              ) : ctx.filteredTemplates.length === 0 ? (
                <div className="text-center py-16 text-gray-400 text-sm">
                  {ctx.filteredTemplates.length === 0 ? "テンプレートがありません" : "該当するテンプレートがありません"}
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {ctx.filteredTemplates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => ctx.confirmTemplate(t)}
                      disabled={ctx.sending}
                      className="w-full text-left px-5 py-3 hover:bg-[#00B900]/[0.03] transition-colors group disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 group-hover:text-[#00B900] transition-colors">{t.name}</span>
                        <svg className="w-4 h-4 text-gray-300 group-hover:text-[#00B900] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{t.content}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 画像ライトボックス */}
      {ctx.lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center"
          onClick={() => ctx.setLightboxUrl(null)}
        >
          <button
            onClick={() => ctx.setLightboxUrl(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={ctx.lightboxUrl}
            alt="拡大画像"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
