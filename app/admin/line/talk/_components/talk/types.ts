import type { ReactNode } from "react";

export interface Friend {
  patient_id: string;
  patient_name: string;
  line_id: string | null;
  line_display_name?: string | null;
  line_picture_url?: string | null;
  mark: string;
  tags: { id: number; name: string; color: string }[];
  fields: Record<string, string>;
  is_blocked?: boolean;
  last_message?: string | null;
  last_sent_at?: string | null;
  last_text_at?: string | null;
  last_activity_at?: string | null;
}

export interface MessageLog {
  id: number;
  content: string;
  status: string;
  message_type: string;
  event_type?: string;
  sent_at: string;
  direction?: "incoming" | "outgoing";
  flex_json?: Record<string, unknown>;
}

export interface Template {
  id: number;
  name: string;
  content: string;
  message_type: string;
  category: string | null;
}

export interface TemplateCategory {
  id: number;
  name: string;
}

export interface TagDef {
  id: number;
  name: string;
  color: string;
}

export interface PatientTag {
  tag_id: number;
  tag_definitions: { id: number; name: string; color: string };
}

export interface FieldValue {
  field_id: number;
  value: string;
  friend_field_definitions: { id: number; name: string };
}

export interface FieldDef {
  id: number;
  name: string;
  field_type: string;
  options: string[] | null;
}

export interface PatientDetail {
  patient: { id: string; name: string; lstep_uid: string };
  latestOrder: {
    date: string;
    product: string;
    amount: string;
    payment: string;
    tracking: string;
    postal_code: string;
    address: string;
    phone: string;
    email: string;
    refund_status: string | null;
  } | null;
  orderHistory: { date: string; product: string; refund_status: string | null }[];
  reorders: { id: number; date: string; product: string; status: string }[];
  pendingBankTransfer: { product: string; date: string } | null;
  nextReservation: string | null;
  medicalInfo: {
    hasIntake?: boolean;
    kana: string;
    gender: string;
    birthday: string;
    medicalHistory: string;
    glp1History: string;
    medicationHistory: string;
    allergies: string;
    prescriptionMenu: string;
  } | null;
  verifiedPhone: string | null;
  registeredAt: string | null;
}

export interface MarkOption {
  value: string;
  label: string;
  color: string;
  icon: string;
}

/** Flex ノードの型定義 */
export interface FlexNode {
  type: string;
  contents?: FlexNode[];
  text?: string;
  url?: string;
  label?: string;
  color?: string;
  size?: string;
  weight?: string;
  decoration?: string;
  align?: string;
  margin?: string;
  wrap?: boolean;
  aspectMode?: string;
  aspectRatio?: string;
  style?: string;
  action?: { type?: string; label?: string; uri?: string };
  backgroundColor?: string;
  flex?: number;
  layout?: string;
  paddingAll?: string;
  paddingStart?: string;
  paddingEnd?: string;
  paddingTop?: string;
  paddingBottom?: string;
  spacing?: string;
  gravity?: string;
  cornerRadius?: string;
  alignItems?: string;
}

/** Flex Bubble の型定義 */
export interface FlexBubble {
  type: string;
  header?: FlexNode;
  hero?: FlexNode;
  body?: FlexNode;
  footer?: FlexNode;
}

export interface TalkClientProps {
  initialFriends?: Friend[];
  initialHasMore?: boolean;
  initialPinnedIds?: string[];
  initialReadTimestamps?: Record<string, string>;
  initialVisibleSections?: Record<string, boolean>;
}
