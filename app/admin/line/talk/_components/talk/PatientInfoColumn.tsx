"use client";

import Link from "next/link";
import { useTalkContext } from "./TalkContext";
import { TagBadge } from "@/components/admin/TagBadge";


// セクションラベル
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{children}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

// 情報行
function InfoRow({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-[3px]">
      <span className="text-[11px] text-gray-400">{label}</span>
      <span className={`text-[11px] text-gray-800 ${mono ? "font-mono" : ""}`}>{children}</span>
    </div>
  );
}

export default function PatientInfoColumn() {
  const ctx = useTalkContext();
  const {
    selectedPatient, mobileView,
    patientDetail, patientTags, patientMark, patientFields,
    allTags, allFieldDefs, markOptions, currentMark,
    showTagPicker, setShowTagPicker,
    showMarkDropdown, setShowMarkDropdown,
    showSectionSettings, setShowSectionSettings,
    visibleSections, setVisibleSections, isSectionVisible,
    assignedTagIds, availableTags,
    userRichMenu, showMenuPicker, setShowMenuPicker, allRichMenus, changingMenu,
    handleMarkChange, handleAddTag, handleRemoveTag,
    openMenuPicker, changeRichMenu,
    calcAge,
  } = ctx;

  if (!selectedPatient) return null;

  return (
    <div className={`w-full md:w-[320px] flex-1 md:flex-none md:flex-shrink-0 border-l border-gray-200/80 bg-white flex flex-col min-h-0 ${
      mobileView !== "info" ? "hidden md:flex" : "flex"
    }`}>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* プロフィール */}
        <div className="px-4 pt-5 pb-4 text-center border-b border-gray-100">
          {/* アイコン＋PID */}
          <div className="relative w-fit mx-auto">
            {selectedPatient.line_picture_url ? (
              <img src={selectedPatient.line_picture_url} alt="" className="w-14 h-14 rounded-full shadow-sm object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white text-xl font-bold shadow-sm">
                {selectedPatient.patient_name?.charAt(0) || selectedPatient.line_display_name?.charAt(0) || "?"}
              </div>
            )}
            <button
              onClick={() => { navigator.clipboard.writeText(selectedPatient.patient_id); }}
              title="PIDをコピー"
              className="absolute -top-2 left-full ml-3 text-[10px] text-gray-400 font-mono leading-none whitespace-nowrap hover:text-gray-600 cursor-pointer"
            >
              PID：{selectedPatient.patient_id}
            </button>
          </div>
          <h3 className="font-bold text-gray-900 mt-2.5 text-[15px]">{selectedPatient.patient_id?.startsWith("LINE_") ? "🟧 " : ""}{selectedPatient.patient_name || selectedPatient.line_display_name || "（名前なし）"}</h3>
          {selectedPatient.line_display_name && selectedPatient.line_display_name !== selectedPatient.patient_name && (
            <p className="text-[10px] text-gray-400 mt-0.5">{selectedPatient.line_display_name}</p>
          )}
          {selectedPatient.line_id ? (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-[#00B900] bg-[#00B900]/5 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00B900]" />連携済み
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />未連携
            </span>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Link
              href={`/admin/line/friends/${encodeURIComponent(selectedPatient.patient_id)}`}
              className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[11px] font-medium hover:bg-gray-50 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              友だち詳細
            </Link>
            {patientDetail?.registeredAt && (
              <span className="text-[10px] text-gray-400">登録日時：{(() => {
                try {
                  const d = new Date(patientDetail.registeredAt);
                  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                  return `${jst.getUTCFullYear()}/${String(jst.getUTCMonth() + 1).padStart(2, "0")}/${String(jst.getUTCDate()).padStart(2, "0")} ${String(jst.getUTCHours()).padStart(2, "0")}:${String(jst.getUTCMinutes()).padStart(2, "0")}`;
                } catch { return patientDetail.registeredAt.slice(0, 16).replace("T", " "); }
              })()}</span>
            )}
          </div>
        </div>

        {/* 個人情報 */}
        {isSectionVisible("personal") && (patientDetail?.medicalInfo || patientDetail?.verifiedPhone) && (
          <div className="px-4 py-3 border-b border-gray-100">
            <SectionLabel>個人情報</SectionLabel>
            {patientDetail.medicalInfo?.kana && <InfoRow label="カナ">{patientDetail.medicalInfo.kana}</InfoRow>}
            {patientDetail.medicalInfo?.gender && <InfoRow label="性別">{patientDetail.medicalInfo.gender}</InfoRow>}
            {patientDetail.medicalInfo?.birthday && (
              <InfoRow label="生年月日">
                {(() => {
                  const raw = patientDetail.medicalInfo!.birthday;
                  try {
                    const d = new Date(raw);
                    if (isNaN(d.getTime())) return raw;
                    const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
                    return `${jst.getUTCFullYear()}年${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;
                  } catch { return raw; }
                })()}
                {(() => { const a = calcAge(patientDetail.medicalInfo!.birthday); return a !== null ? `（${a}歳）` : ""; })()}
              </InfoRow>
            )}
            {patientDetail.verifiedPhone && <InfoRow label="電話番号" mono>{patientDetail.verifiedPhone}</InfoRow>}
          </div>
        )}

        {/* 次回予約 */}
        {isSectionVisible("reservation") && patientDetail?.nextReservation && (
          <div className="px-4 py-2 border-b border-gray-100 bg-blue-50/30">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-blue-500 font-bold tracking-wider uppercase">予約</span>
              <span className="text-[12px] text-blue-700 font-semibold">{patientDetail.nextReservation}</span>
            </div>
          </div>
        )}

        {/* 対応マーク - ドロップダウン */}
        {isSectionVisible("mark") && <div className="px-4 py-3 border-b border-gray-100">
          <SectionLabel>対応マーク</SectionLabel>
          <div className="relative">
            <button
              onClick={() => setShowMarkDropdown(!showMarkDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors bg-white"
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: currentMark.color }} />
                <span className="text-[12px] text-gray-800 font-medium">
                  {currentMark.label}
                </span>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showMarkDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showMarkDropdown && (
              <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {markOptions.map(m => (
                  <button
                    key={m.value}
                    onClick={() => handleMarkChange(m.value)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50 transition-colors text-[12px] ${patientMark === m.value ? "bg-gray-50 font-semibold" : "text-gray-600"}`}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: m.color }} />
                    {m.label}
                    {patientMark === m.value && <svg className="w-3.5 h-3.5 ml-auto text-[#00B900]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>}

        {/* タグ */}
        {isSectionVisible("tags") && <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <SectionLabel>タグ</SectionLabel>
            <button
              onClick={() => setShowTagPicker(!showTagPicker)}
              className="text-[10px] text-[#00B900] hover:text-[#009900] font-semibold flex items-center gap-0.5 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              追加
            </button>
          </div>
          {showTagPicker && (
            <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              {availableTags.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-gray-400">追加できるタグなし</div>
              ) : (
                <div className="max-h-28 overflow-y-auto">
                  {availableTags.map(t => (
                    <button key={t.id} onClick={() => handleAddTag(t.id)} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 text-left transition-colors">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-xs text-gray-700">{t.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {patientTags.length === 0 ? (
            <p className="text-[10px] text-gray-300">タグなし</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {patientTags.map(t => (
                <TagBadge
                  key={t.tag_id}
                  name={t.tag_definitions.name}
                  color={t.tag_definitions.color}
                  size="sm"
                  onRemove={() => handleRemoveTag(t.tag_id)}
                />
              ))}
            </div>
          )}
        </div>}

        {/* 友だち情報 */}
        {isSectionVisible("friendFields") && allFieldDefs.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <SectionLabel>友だち情報</SectionLabel>
            {allFieldDefs.map(fd => {
              const val = patientFields.find(pf => pf.field_id === fd.id);
              return <InfoRow key={fd.id} label={fd.name}>{val?.value || <span className="text-gray-200">—</span>}</InfoRow>;
            })}
          </div>
        )}

        {/* 問診事項（問診提出済みの場合のみ） */}
        {isSectionVisible("medical") && patientDetail?.medicalInfo?.hasIntake && (
          <div className="px-4 py-3 border-b border-gray-100">
            <SectionLabel>問診事項</SectionLabel>
            <div className="space-y-2">
              {[
                { label: "既往歴", value: patientDetail.medicalInfo.medicalHistory || "特記事項なし" },
                { label: "GLP-1 使用歴", value: patientDetail.medicalInfo.glp1History || "使用歴なし" },
                { label: "内服歴", value: patientDetail.medicalInfo.medicationHistory || "なし" },
                { label: "アレルギー", value: patientDetail.medicalInfo.allergies || "アレルギーなし" },
              ].map((item) => (
                <div key={item.label}>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">{item.label}</span>
                  <p className="text-[11px] text-gray-700 mt-0.5 bg-gray-50/80 rounded-md px-2 py-1 leading-relaxed">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 最新決済（配送情報含む） */}
        {isSectionVisible("latestOrder") && patientDetail?.latestOrder && (
          <div className="px-4 py-3 border-b border-gray-100">
            <SectionLabel>最新決済</SectionLabel>
            <InfoRow label="メニュー">{patientDetail.latestOrder.product}</InfoRow>
            <InfoRow label="金額">{patientDetail.latestOrder.amount}</InfoRow>
            <InfoRow label="決済方法">{patientDetail.latestOrder.payment}</InfoRow>
            <InfoRow label="日時">{patientDetail.latestOrder.date}</InfoRow>
            {patientDetail.latestOrder.refund_status && (
              <div className="flex items-center justify-between py-[3px]">
                <span className="text-[11px] text-gray-400">{patientDetail.latestOrder.refund_status === "CANCELLED" ? "状態" : "返金"}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  patientDetail.latestOrder.refund_status === "CANCELLED" ? "bg-gray-100 text-gray-500" : "bg-red-50 text-red-600"
                }`}>
                  {patientDetail.latestOrder.refund_status === "CANCELLED" ? "キャンセル" : patientDetail.latestOrder.refund_status === "PENDING" ? "返金待ち" : "返金済み"}
                </span>
              </div>
            )}
            <InfoRow label="追跡番号" mono>{patientDetail.latestOrder.tracking && patientDetail.latestOrder.tracking !== "-" ? (
              <a href={`https://member.kms.kuronekoyamato.co.jp/parcel/detail?pno=${patientDetail.latestOrder.tracking.replace(/-/g, "")}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">{patientDetail.latestOrder.tracking}</a>
            ) : (patientDetail.latestOrder.tracking || "-")}</InfoRow>
            {patientDetail.latestOrder.phone && <InfoRow label="電話" mono>{patientDetail.latestOrder.phone}</InfoRow>}
            {patientDetail.latestOrder.email && (
              <div className="flex items-start justify-between py-[3px] gap-2">
                <span className="text-[11px] text-gray-400 flex-shrink-0">メール</span>
                <span className="text-[11px] text-gray-800 break-all text-right">{patientDetail.latestOrder.email}</span>
              </div>
            )}
            {patientDetail.latestOrder.address && (
              <div className="flex items-start justify-between py-[3px] gap-2">
                <span className="text-[11px] text-gray-400 flex-shrink-0">住所</span>
                <span className="text-[11px] text-gray-800 text-right leading-relaxed">
                  {patientDetail.latestOrder.postal_code && <span className="text-gray-400 text-[10px]">{patientDetail.latestOrder.postal_code}<br /></span>}
                  {patientDetail.latestOrder.address}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 処方履歴 */}
        {isSectionVisible("orderHistory") && patientDetail && patientDetail.orderHistory.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <SectionLabel>処方履歴</SectionLabel>
            {patientDetail.orderHistory.map((o, i) => (
              <div key={i} className={`flex items-center justify-between py-[3px] ${o.refund_status === "CANCELLED" ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-300 font-mono">{o.date}</span>
                  <span className="text-[11px] text-gray-700">{o.product}</span>
                </div>
                {o.refund_status && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                    o.refund_status === "CANCELLED" ? "bg-gray-100 text-gray-500" : "bg-red-50 text-red-500"
                  }`}>
                    {o.refund_status === "CANCELLED" ? "キャンセル" : o.refund_status === "PENDING" ? "返金待ち" : "返金済み"}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 銀行振込待ち */}
        {isSectionVisible("bankTransfer") && patientDetail?.pendingBankTransfer && (
          <div className="px-4 py-2 border-b border-gray-100 bg-amber-50/30">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">振込待ち</span>
              <span className="text-[11px] text-amber-800">{patientDetail.pendingBankTransfer.product}</span>
              <span className="text-[10px] text-amber-500 ml-auto">{patientDetail.pendingBankTransfer.date}</span>
            </div>
          </div>
        )}

        {/* 再処方 */}
        {isSectionVisible("reorders") && patientDetail && patientDetail.reorders.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-100">
            <SectionLabel>再処方</SectionLabel>
            {patientDetail.reorders.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-[3px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-gray-300 font-mono">{r.date}</span>
                  <span className="text-[11px] text-gray-700">{r.product}</span>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                  r.status === "承認済み" || r.status === "決済済み" ? "bg-emerald-50 text-emerald-600"
                    : r.status === "却下" || r.status === "キャンセル" ? "bg-red-50 text-red-500"
                      : "bg-blue-50 text-blue-600"
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* リッチメニュー */}
        {isSectionVisible("richMenu") && <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <SectionLabel>リッチメニュー</SectionLabel>
            {selectedPatient?.line_id && (
              <button
                onClick={openMenuPicker}
                className="text-[10px] text-[#00B900] hover:text-[#009900] font-medium cursor-pointer"
              >
                変更
              </button>
            )}
          </div>
          {showMenuPicker && (
            <div className="mb-2 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-medium">メニューを選択</span>
                <button onClick={() => setShowMenuPicker(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              {allRichMenus.length === 0 ? (
                <div className="px-3 py-3 text-center text-[10px] text-gray-400">読み込み中...</div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {allRichMenus.map(m => (
                    <button
                      key={m.id}
                      onClick={() => changeRichMenu(m.id)}
                      disabled={changingMenu}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 flex items-center gap-2 cursor-pointer ${
                        userRichMenu?.id === m.id ? "bg-[#00B900]/5" : ""
                      } ${changingMenu ? "opacity-50" : ""}`}
                    >
                      {m.image_url ? (
                        <img src={m.image_url} alt="" className="w-10 h-5 rounded object-cover flex-shrink-0 border border-gray-200" />
                      ) : (
                        <div className="w-10 h-5 rounded bg-gray-100 flex-shrink-0" />
                      )}
                      <span className="text-[11px] text-gray-700 truncate">{m.name}</span>
                      {userRichMenu?.id === m.id && (
                        <svg className="w-3.5 h-3.5 text-[#00B900] flex-shrink-0 ml-auto" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {userRichMenu ? (
            <div>
              <div className="text-[12px] text-gray-800 font-medium mb-1.5">{userRichMenu.name}</div>
              {userRichMenu.image_url && (
                <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                  <img src={userRichMenu.image_url} alt={userRichMenu.name} className="w-full h-auto" />
                </div>
              )}
              {!userRichMenu.image_url && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-center">
                  <svg className="w-8 h-8 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                  <span className="text-[10px] text-gray-400">プレビューなし</span>
                </div>
              )}
              {userRichMenu.is_default && (
                <span className="inline-block mt-1.5 text-[9px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">デフォルト</span>
              )}
            </div>
          ) : selectedPatient?.line_id ? (
            <div className="text-[11px] text-gray-300">読み込み中...</div>
          ) : (
            <div className="text-[11px] text-gray-300">LINE未連携</div>
          )}
        </div>}
      </div>
    </div>
  );
}
