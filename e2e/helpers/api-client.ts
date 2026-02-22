// e2e/helpers/api-client.ts — テスト用APIクライアント
// Playwright の APIRequestContext を使い、Cookie認証ベースで患者APIを呼び出す

import { APIRequestContext } from "@playwright/test";

/** 患者APIのベースURL */
const BASE_URL = "http://localhost:3000";

/**
 * 患者IDをCookieに設定したリクエストヘッダーを生成
 * 患者APIは `__Host-patient_id` or `patient_id` Cookie で認証する
 * テスト環境ではHTTPSではないため `patient_id` を使用
 */
function patientCookie(patientId: string): string {
  return `patient_id=${patientId}`;
}

/**
 * テスト用APIクライアント
 *
 * 使い方:
 *   const client = new PatientApiClient(request, "TEST_PATIENT_001");
 *   const res = await client.submitIntake({ answers: { ... } });
 */
export class PatientApiClient {
  constructor(
    private request: APIRequestContext,
    private patientId: string
  ) {}

  /** Cookie付きの共通ヘッダー */
  private headers() {
    return {
      Cookie: patientCookie(this.patientId),
      "Content-Type": "application/json",
    };
  }

  // ========================================
  // 問診 API
  // ========================================

  /**
   * 問診を保存する — POST /api/intake
   *
   * @param data - 問診データ（answers, name, tel 等）
   * @returns APIレスポンス
   *
   * リクエストbody例:
   * {
   *   answers: { 氏名: "テスト太郎", 電話番号: "09012345678", ng_check: "問題なし" },
   *   name: "テスト太郎",
   *   tel: "09012345678"
   * }
   */
  async submitIntake(data: {
    answers?: Record<string, unknown>;
    name?: string;
    name_kana?: string;
    sex?: string;
    birth?: string;
    tel?: string;
    email?: string;
    line_id?: string;
    answerer_id?: string;
  }) {
    return this.request.post(`${BASE_URL}/api/intake`, {
      headers: this.headers(),
      data,
    });
  }

  /**
   * 問診データを取得する — GET /api/intake?patient_id=xxx
   * ※ このエンドポイントが存在しない場合は管理APIで代替
   */
  async getIntake() {
    return this.request.get(
      `${BASE_URL}/api/intake?patient_id=${this.patientId}`,
      {
        headers: this.headers(),
      }
    );
  }

  // ========================================
  // 予約 API
  // ========================================

  /**
   * 予約を作成する — POST /api/reservations
   *
   * @param data - 予約データ（date, time）
   * @returns APIレスポンス（ok: true, reserveId が返る）
   *
   * リクエストbody例:
   * {
   *   type: "createReservation",
   *   date: "2026-03-15",
   *   time: "14:00",
   *   patient_id: "TEST_PATIENT_001"
   * }
   */
  async createReservation(data: { date: string; time: string }) {
    return this.request.post(`${BASE_URL}/api/reservations`, {
      headers: this.headers(),
      data: {
        type: "createReservation",
        date: data.date,
        time: data.time,
        patient_id: this.patientId,
      },
    });
  }

  /**
   * 予約をキャンセルする — POST /api/reservations
   *
   * @param reserveId - キャンセル対象の予約ID
   */
  async cancelReservation(reserveId: string) {
    return this.request.post(`${BASE_URL}/api/reservations`, {
      headers: this.headers(),
      data: {
        type: "cancelReservation",
        reserveId,
        patient_id: this.patientId,
      },
    });
  }

  /**
   * 予約枠を取得する — GET /api/reservations?date=YYYY-MM-DD
   *
   * @param date - 取得対象の日付
   */
  async getAvailableSlots(date: string) {
    return this.request.get(
      `${BASE_URL}/api/reservations?date=${date}`,
      {
        headers: this.headers(),
      }
    );
  }

  // ========================================
  // 決済 API
  // ========================================

  /**
   * 決済リンクを生成する — POST /api/checkout
   *
   * @param data - 決済データ（productCode, mode）
   * @returns APIレスポンス（checkoutUrl が返る）
   *
   * リクエストbody例:
   * {
   *   productCode: "MJL_2.5mg_1m",
   *   mode: "first",
   *   patientId: "TEST_PATIENT_001"
   * }
   */
  async createCheckout(data: {
    productCode: string;
    mode?: "current" | "first" | "reorder";
    reorderId?: string;
  }) {
    return this.request.post(`${BASE_URL}/api/checkout`, {
      headers: this.headers(),
      data: {
        productCode: data.productCode,
        mode: data.mode || "first",
        patientId: this.patientId,
        reorderId: data.reorderId || null,
      },
    });
  }
}
