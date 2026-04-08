"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useDashboardContext } from "./DashboardContext";
import {
  isActiveOrder,
  formatDateSafe,
  shippingStatusLabel,
  paymentStatusLabel,
  shippingStatusClass,
  paymentStatusClass,
  buildTrackingUrl,
  normalizeTrackingNumber,
  getTimeSafe,
  type Order,
} from "./types";

// 分野バッジ（マルチ分野モード時のみ表示）
const FIELD_BADGE_COLORS: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  pink: "bg-pink-100 text-pink-700",
  amber: "bg-amber-100 text-amber-700",
  rose: "bg-rose-100 text-rose-700",
  teal: "bg-teal-100 text-teal-700",
  indigo: "bg-indigo-100 text-indigo-700",
  orange: "bg-orange-100 text-orange-700",
};

function FieldBadge({ name, color }: { name?: string; color?: string }) {
  if (!name) return null;
  const cls = FIELD_BADGE_COLORS[color || "blue"] ?? FIELD_BADGE_COLORS.blue;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {name}
    </span>
  );
}

export function OrdersSection() {
  const router = useRouter();
  const {
    data,
    reorders,
    mpSections,
    mpLabels,
    reorderRequiresReservation,
    intakeStatus,
    handleOpenTracking,
    handleCopyTrackingIfYamato,
    handleSaveAddress,
    handleReorderChange,
    setShowReorderCancelConfirm,
    editingAddressOrderId,
    setEditingAddressOrderId,
    editPostalCode,
    setEditPostalCode,
    editAddress,
    setEditAddress,
    editShippingName,
    setEditShippingName,
    addressSaving,
    displayReorder,
    displayReorderStatus,
    productLabels,
    multiFieldEnabled,
    selectedFieldId,
    fieldConfigs,
  } = useDashboardContext();

  if (!mpSections.showOrders) return null;

  const { activeOrders, history, ordersFlags } = data;
  const hasHistory = history.length > 0;
  const isNG = intakeStatus === "NG";
  const hasPendingReorder = reorders.some((r) => r.status === "pending");

  // 初回購入ボタン
  const showInitialPurchase =
    hasHistory &&
    !isNG &&
    !(ordersFlags?.hasAnyPaidOrder ?? false) &&
    !hasPendingReorder;

  const canPurchaseInitial =
    showInitialPurchase && (ordersFlags?.canPurchaseCurrentCourse ?? true);

  // 注文：アクティブ分だけ表示（分野フィルタ対応）
  const visibleOrders = activeOrders
    .filter(isActiveOrder)
    .filter((o) => !selectedFieldId || (o as Order & { fieldId?: string }).fieldId === selectedFieldId)
    .slice()
    .sort(
      (a, b) =>
        getTimeSafe(b.paidAt || b.shippingEta) - getTimeSafe(a.paidAt || a.shippingEta)
    )
    .slice(0, 5);

  return (
    <section className="bg-white rounded-3xl shadow-sm p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800">
          {mpLabels.ordersTitle}
        </h2>
      </div>

      {/* 再処方申請カード（show_in_reorder=false の分野では非表示） */}
      {displayReorder && !isNG && !(selectedFieldId && fieldConfigs[selectedFieldId]?.show_in_reorder === false) && (
        <div className="mb-3 rounded-2xl border border-[var(--mp-primary)] bg-[var(--mp-light)] px-4 py-3">
          <div className="text-xs font-semibold text-[var(--mp-text)] mb-1">
            {displayReorderStatus === "pending"
              ? "再処方申請中"
              : "再処方申請が許可されました"}
          </div>

          <div className="text-sm font-medium text-slate-900 flex items-start gap-1.5">
            <span className="whitespace-pre-line">{(() => {
              const code = displayReorder.productCode || "";
              if (code.includes(",")) {
                return code.split(",").map(c => productLabels[c.trim()] || c.trim()).join("\n");
              }
              return productLabels[code] || displayReorder.productLabel;
            })()}</span>
            {multiFieldEnabled && mpSections.showFieldBadges && <FieldBadge name={displayReorder.fieldName} color={displayReorder.fieldColor} />}
          </div>

          {displayReorderStatus === "pending" && (
            <div className="mt-2 flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleReorderChange}
                className="px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700"
              >
                申請内容を変更する
              </button>
              <button
                type="button"
                onClick={() => setShowReorderCancelConfirm(true)}
                className="px-3 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700"
              >
                申請をキャンセルする
              </button>
            </div>
          )}

          {displayReorderStatus === "confirmed" && displayReorder && (
            <div className="mt-2 flex gap-2 text-[11px]">
              <button
                type="button"
                onClick={async () => {
                  const raw = String((displayReorder.product_code ?? displayReorder.productCode ?? "")).trim();
                  if (!raw) {
                    alert("再処方の決済情報（product_code）が見つかりません。管理者にお問い合わせください。");
                    return;
                  }
                  const reorderNum = displayReorder.reorder_number ?? displayReorder.id;
                  if (!reorderNum) {
                    alert("再処方の識別子が見つかりません。管理者にお問い合わせください。");
                    return;
                  }
                  const reorderId = encodeURIComponent(String(reorderNum));
                  // カンマ区切りの複数商品コード（カート再処方）
                  if (raw.includes(",")) {
                    const codes = raw.split(",").map(c => c.trim()).filter(Boolean);
                    // カートをlocalStorageにセットしてカートモードで遷移
                    try {
                      const productsRes = await fetch("/api/mypage/products", { credentials: "include" });
                      const productsJson = await productsRes.json();
                      const allProducts = productsJson.products || [];
                      const cartItems = codes.map((code: string) => {
                        const p = allProducts.find((pr: { code: string }) => pr.code === code);
                        return p ? { code: p.code, title: p.title, price: p.price, qty: 1, coolType: p.cool_type || null } : null;
                      }).filter(Boolean);
                      localStorage.setItem("lope_cart", JSON.stringify(cartItems));
                    } catch { /* ignore */ }
                    router.push(`/mypage/purchase/confirm?cart=1&mode=reorder&reorder_id=${reorderId}`);
                  } else {
                    const code = encodeURIComponent(raw);
                    router.push(`/mypage/purchase/confirm?code=${code}&mode=reorder&reorder_id=${reorderId}`);
                  }
                }}
                className="px-4 py-1.5 rounded-full bg-emerald-500 text-white font-semibold shadow-sm"
              >
                決済へ進む
              </button>
              <button
                type="button"
                onClick={() => setShowReorderCancelConfirm(true)}
                className="px-3 py-1 rounded-full border border-rose-200 bg-rose-50 text-rose-700"
              >
                キャンセルする
              </button>
            </div>
          )}
        </div>
      )}

      {/* 通常の注文・発送状況 */}
      {activeOrders.length === 0 ? (
        <div className="text-sm text-slate-600">
          {mpLabels.noOrdersText}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              productLabels={productLabels}
              multiFieldEnabled={multiFieldEnabled}
              showFieldBadges={mpSections.showFieldBadges}
              editingAddressOrderId={editingAddressOrderId}
              setEditingAddressOrderId={setEditingAddressOrderId}
              editPostalCode={editPostalCode}
              setEditPostalCode={setEditPostalCode}
              editAddress={editAddress}
              setEditAddress={setEditAddress}
              editShippingName={editShippingName}
              setEditShippingName={setEditShippingName}
              addressSaving={addressSaving}
              handleSaveAddress={handleSaveAddress}
              handleOpenTracking={handleOpenTracking}
              handleCopyTrackingIfYamato={handleCopyTrackingIfYamato}
            />
          ))}
        </div>
      )}

      {/* 初回決済ボタン（上部CTAセクション外に表示する場合のための条件。元コードは上部CTAセクションに配置） */}

      {/* 再処方申請ボタン（show_in_reorder=false の分野では非表示） */}
      {ordersFlags?.hasAnyPaidOrder && !isNG && !(selectedFieldId && fieldConfigs[selectedFieldId]?.show_in_reorder === false) && (
        <div className="mt-4">
          <button
            type="button"
            disabled={!ordersFlags?.canApplyReorder || !!displayReorder}
            onClick={() => {
              if (!ordersFlags?.canApplyReorder || displayReorder) return;
              router.push("/mypage/purchase?flow=reorder");
            }}
            className={
              "w-full rounded-xl text-center py-3 text-base font-semibold border " +
              (ordersFlags?.canApplyReorder && !displayReorder
                ? "bg-white text-[var(--mp-primary)] border-[var(--mp-primary)] hover:bg-[var(--mp-light)] transition"
                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed")
            }
          >
            {mpLabels.reorderButtonLabel}
          </button>

          {reorderRequiresReservation && (
            <p className="mt-2 text-[11px] text-amber-600 leading-relaxed">
              ※ 再処方には事前の予約・診察が必要です。予約・診察後に再処方をお申し込みいただけます。
            </p>
          )}
          {displayReorder ? (
            <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
              ※ 申請中または許可済みの再処方があります。キャンセルまたは決済完了後に再度お申し込みください。
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
              ① 再処方内容を医師に申請します。<br />
              ② 医師が内容を確認し、問題なければ処方となります。
              <br />
              （平日10〜19時は申請後1時間以内、祝休日は当日中に反映されます）<br />
              ③ マイページを更新すると、再処方の情報が反映されます。
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// 注文カード（内部コンポーネント）
function OrderCard({
  order,
  productLabels,
  multiFieldEnabled,
  showFieldBadges,
  editingAddressOrderId,
  setEditingAddressOrderId,
  editPostalCode,
  setEditPostalCode,
  editAddress,
  setEditAddress,
  editShippingName,
  setEditShippingName,
  addressSaving,
  handleSaveAddress,
  handleOpenTracking,
  handleCopyTrackingIfYamato,
}: {
  order: Order;
  productLabels: Record<string, string>;
  multiFieldEnabled: boolean;
  showFieldBadges: boolean;
  editingAddressOrderId: string | null;
  setEditingAddressOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  editPostalCode: string;
  setEditPostalCode: React.Dispatch<React.SetStateAction<string>>;
  editAddress: string;
  setEditAddress: React.Dispatch<React.SetStateAction<string>>;
  editShippingName: string;
  setEditShippingName: React.Dispatch<React.SetStateAction<string>>;
  addressSaving: boolean;
  handleSaveAddress: (orderId: string) => Promise<void>;
  handleOpenTracking: (order: Order) => void;
  handleCopyTrackingIfYamato: (order: Order) => Promise<void>;
}) {
  return (
    <div className="rounded-2xl bg-white shadow-[0_4px_18px_rgba(15,23,42,0.06)] px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex-1">
        {order.paidAt && (
          <div className="text-[11px] text-slate-500 mb-0.5">
            {formatDateSafe(order.paidAt)}
          </div>
        )}
        <div className="text-[15px] font-medium text-slate-900 flex items-center gap-1.5">
          <span className="whitespace-pre-line">{(() => {
            const name = order.productName || "";
            if (name.includes("\n")) return name;
            const code = order.productCode || "";
            return productLabels[code] || name || code;
          })()}</span>
          {multiFieldEnabled && showFieldBadges && <FieldBadge name={order.fieldName} color={order.fieldColor} />}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
          <div className="flex items-center gap-1">
            <span className="text-slate-600">発送：</span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${shippingStatusClass(order.shippingStatus)}`}
            >
              {shippingStatusLabel(order.shippingStatus)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-600">決済：</span>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${paymentStatusClass(order.paymentStatus)}`}
            >
              {paymentStatusLabel(order.paymentStatus)}
            </span>
          </div>
        </div>

        {/* 返金手続き中の表示 */}
        {order.refundStatus === "PENDING" && (
          <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-[10px] text-amber-800 leading-relaxed font-medium">
              返金手続き中です。完了までしばらくお待ちください。
            </p>
          </div>
        )}

        {/* 銀行振込の場合の説明 */}
        {order.paymentMethod === "bank_transfer" && !order.refundStatus && (
          <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2">
            <p className="text-[10px] text-blue-900 leading-relaxed">
              <strong>銀行振込について</strong>
              <br />
              金曜15時〜月曜9時のお振込みはご利用の銀行次第で反映が翌営業日となる場合があります。振込確認後の発送となります。
            </p>
          </div>
        )}

        <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
          {order.trackingNumber ? (
            <p className="flex flex-wrap items-center gap-2">
              <span>追跡番号：</span>
              {order.carrier === "japanpost" ? (
                <a
                  href={buildTrackingUrl("japanpost", order.trackingNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--mp-primary)] underline"
                >
                  {order.trackingNumber}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCopyTrackingIfYamato(order)}
                  className="inline-flex items-center gap-1 text-[var(--mp-primary)] underline"
                  title="タップでコピー"
                >
                  <span>{order.trackingNumber}</span>
                  <span className="text-[11px] text-slate-400 no-underline">⧉</span>
                </button>
              )}
              <span className="text-[10px] text-slate-400">
                （{order.carrier === "japanpost" ? "日本郵便" : "ヤマト"}）
              </span>
            </p>
          ) : order.shippingEta ? (
            <p>発送予定日：{formatDateSafe(order.shippingEta)} まで</p>
          ) : null}
        </div>

        {/* 配送先情報 */}
        <div className="mt-2">
          {editingAddressOrderId === order.id ? (
            <div className="rounded-xl border border-[var(--mp-primary)] bg-[var(--mp-light)] px-3 py-2.5 space-y-2">
              <label className="block">
                <span className="text-[13px] text-slate-600">配送先名義</span>
                <input
                  type="text"
                  value={editShippingName}
                  onChange={(e) => setEditShippingName(e.target.value)}
                  placeholder="氏名"
                  className="mt-0.5 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[13px] text-slate-600">郵便番号</span>
                <input
                  type="text"
                  value={editPostalCode}
                  onChange={(e) => setEditPostalCode(e.target.value)}
                  placeholder="1234567"
                  className="mt-0.5 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[13px] text-slate-600">住所</span>
                <textarea
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  rows={2}
                  className="mt-0.5 block w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={addressSaving}
                  onClick={() => handleSaveAddress(order.id)}
                  className="px-5 py-2 rounded-full bg-[var(--mp-primary)] text-white text-[13px] font-semibold disabled:opacity-50"
                >
                  {addressSaving ? "保存中…" : "保存"}
                </button>
                <button
                  type="button"
                  disabled={addressSaving}
                  onClick={() => setEditingAddressOrderId(null)}
                  className="px-5 py-2 rounded-full border border-slate-200 bg-white text-slate-600 text-[13px]"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="rounded-xl bg-sky-50 px-3 py-2.5 text-[13px] text-blue-900 space-y-1">
                <p>配送先名義：{order.shippingName || "―"}</p>
                {order.postalCode && <p>郵便番号：{order.postalCode}</p>}
                {order.address && <p>住所：{order.address}</p>}
              </div>

              {order.shippingStatus === "shipped" || order.trackingNumber ? (
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  ※ 届け先の変更・営業所留めをご希望の場合は、追跡番号からヤマト運輸のサイトでお手続きください。
                </p>
              ) : (
                <>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    ※ 営業所留めをご希望の場合は、発送後に追跡番号からヤマト運輸のサイトでお手続きください。
                  </p>
                  {!order.shippingListCreatedAt ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditShippingName(order.shippingName || "");
                        setEditPostalCode(order.postalCode || "");
                        setEditAddress(order.address || "");
                        setEditingAddressOrderId(order.id);
                      }}
                      className="mt-1.5 px-5 py-2 rounded-full border border-[var(--mp-primary)] bg-white text-[var(--mp-primary)] text-[13px] font-semibold"
                    >
                      届け先を変更
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ※ 発送準備に入ったため、届け先の変更はLINEからお問い合わせください。
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3 md:mt-0 flex w-full md:w-auto gap-2 md:flex-col md:items-end">
        {order.trackingNumber && (
          <button
            type="button"
            onClick={() => handleOpenTracking(order)}
            className="w-full md:w-[160px] h-11 inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white text-[13px] font-medium text-slate-700 active:scale-[0.98]"
          >
            配送状況を確認
          </button>
        )}
      </div>
    </div>
  );
}
