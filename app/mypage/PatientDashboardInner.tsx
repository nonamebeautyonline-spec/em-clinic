"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

// ------------------------- 型定義 -------------------------
type ReservationStatus = "scheduled" | "completed" | "canceled";
type ShippingStatus = "pending" | "preparing" | "shipped" | "delivered";
type PaymentStatus = "paid" | "pending" | "failed";

interface PatientInfo {
  id: string;
  displayName: string;
}

interface Reservation {
  id: string;
  datetime: string;
  title: string;
  status: ReservationStatus;
}

interface Order {
  id: string;
  productName: string;
  shippingStatus: ShippingStatus;
  shippingEta?: string;
  trackingNumber?: string;
  paymentStatus: PaymentStatus;
}

interface PrescriptionHistoryItem {
  id: string;
  date: string;
  title: string;
  detail: string;
}

interface PatientDashboardData {
  patient: PatientInfo;
  nextReservation?: Reservation | null;
  activeOrders: Order[];
  history: PrescriptionHistoryItem[];
}

interface QueryPatientParams {
  customer_id?: string | null;
  name?: string | null;
  kana?: string | null;
  sex?: string | null;
  birth?: string | null;
  phone?: string | null;
}

// ------------------------- util -------------------------
const useQueryPatientParams = (): QueryPatientParams => {
  const sp = useSearchParams();
  return {
    customer_id: sp.get("customer_id"),
    name: sp.get("name"),
    kana: sp.get("kana"),
    sex: sp.get("sex"),
    birth: sp.get("birth"),
    phone: sp.get("phone"),
  };
};

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const date = d.toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  const time = d.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
};

const reservationStatusLabel = (s: ReservationStatus) => {
  switch (s) {
    case "scheduled":
      return "予約済み";
    case "completed":
      return "診察完了";
    case "canceled":
      return "キャンセル済み";
    default:
      return "";
  }
};

const shippingStatusLabel = (s: ShippingStatus) => {
  switch (s) {
    case "pending":
      return "受付済み";
    case "preparing":
      return "準備中";
    case "shipped":
      return "発送済み";
    case "delivered":
      return "配達完了";
    default:
      return "";
  }
};

const paymentStatusLabel = (s: PaymentStatus) => {
  switch (s) {
    case "paid":
      return "決済済み";
    case "pending":
      return "確認中";
    case "failed":
      return "エラー";
    default:
      return "";
  }
};

const reservationStatusBadgeClass = (s: ReservationStatus) => {
  switch (s) {
    case "scheduled":
      return "bg-pink-50 text-pink-600";
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "canceled":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
};

const shippingStatusClass = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    case "preparing":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "shipped":
      return "bg-sky-50 text-sky-700 border border-sky-100";
    case "delivered":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "on_hold":
      return "bg-slate-50 text-rose-700 border border-rose-200";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-100";
  }
};

const paymentStatusClass = (status: string) => {
  switch (status) {
    case "unpaid":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    case "paid":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "refunded":
      return "bg-slate-50 text-slate-600 border border-slate-200";
    case "failed":
      return "bg-red-50 text-red-700 border border-red-100";
    default:
      return "bg-slate-50 text-slate-600 border border-slate-100";
  }
};

// ------------------------- 本体 -------------------------
export default function PatientDashboardInner() {
  const query = useQueryPatientParams();
  const router = useRouter();

  const [data, setData] = useState<PatientDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showCancelSuccess, setShowCancelSuccess] = useState(false);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      let finalData: PatientDashboardData = {
        patient: { id: "unknown", displayName: "ゲスト" },
        nextReservation: null,
        activeOrders: [],
        history: [],
      };

      try {
        // ① localStorage
        let storedBasic: any = {};
        let storedReservation: any = null;

        if (typeof window !== "undefined") {
          const rawBasic = window.localStorage.getItem("patient_basic");
          if (rawBasic) {
            try {
              storedBasic = JSON.parse(rawBasic);
            } catch {
              storedBasic = {};
            }
          }

          const rawResv = window.localStorage.getItem("last_reservation");
          if (rawResv) {
            try {
              storedReservation = JSON.parse(rawResv);
            } catch {
              storedReservation = null;
            }
          }
        }

        // ② /api/mypage/profile
        let profile: { patientId: string; name: string } | null = null;
        try {
          const profileRes = await fetch("/api/mypage/profile");

          if (profileRes.status === 401) {
            setLoading(false);
            router.push("/mypage/init");
            return;
          }

          if (profileRes.ok) {
            const p = await profileRes.json();
            profile = { patientId: p.patientId, name: p.name };
          }
        } catch (e) {
          console.warn("profile fetch error:", e);
        }

        // ③ 患者情報
        const patient: PatientInfo = {
          id:
            profile?.patientId ||
            query.customer_id ||
            storedBasic.customer_id ||
            "unknown",
          displayName:
            profile?.name || query.name || storedBasic.name || "ゲスト",
        };

        // ④ localStorage予約
        let nextReservation: Reservation | null = null;
        if (
          storedReservation &&
          storedReservation.date &&
          storedReservation.start
        ) {
          const iso = `${storedReservation.date}T${storedReservation.start}:00+09:00`;
          nextReservation = {
            id:
              storedReservation.reserveId ||
              `local-${storedReservation.date}-${storedReservation.start}`,
            datetime: iso,
            title: storedReservation.title || "オンライン診察予約",
            status: "scheduled",
          };
        }

        finalData = {
          patient,
          nextReservation,
          activeOrders: [],
          history: [],
        };

        // ⑤ /api/mypage
        try {
          const res = await fetch("/api/mypage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer_id: patient.id,
              name: patient.displayName,
            }),
          });

          if (res.ok) {
            const api = (await res.json()) as Partial<
              PatientDashboardData
            > & { patient?: PatientInfo };

            finalData = {
              patient: {
                id: api.patient?.id || patient.id,
                displayName: api.patient?.displayName || patient.displayName,
              },
              nextReservation: api.nextReservation ?? nextReservation,
              activeOrders: api.activeOrders ?? [],
              history: api.history ?? [],
            };
          } else {
            console.error("api/mypage response not ok:", res.status);
          }
        } catch (err) {
          console.error("api/mypage fetch error:", err);
        }

        setData(finalData);
        setError(null);

        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            "patient_basic",
            JSON.stringify({
              customer_id:
                profile?.patientId ??
                query.customer_id ??
                storedBasic.customer_id ??
                finalData.patient.id ??
                "",
              name:
                profile?.name ??
                query.name ??
                storedBasic.name ??
                finalData.patient.displayName ??
                "",
              kana: storedBasic.kana ?? "",
              sex: storedBasic.sex ?? "",
              birth: storedBasic.birth ?? "",
              phone: storedBasic.phone ?? "",
            })
          );
        }
      } catch (e) {
        console.error(e);
        setError("データの取得に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [
    query.customer
