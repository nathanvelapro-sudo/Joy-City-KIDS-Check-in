export type AppRole = "parent" | "volunteer" | "admin";
export type BackgroundCheckStatus = "pending" | "approved" | "expired" | "rejected";
export type CheckinStatus = "pending" | "checked_in" | "picked_up" | "cancelled";
export type CheckinSource = "kiosk" | "parent_portal" | "mobile";
export type VerificationMethod = "security_code" | "qr_scan" | "manual_override";
export type NotificationStatus = "queued" | "sent" | "failed";

export interface AppProfile {
  id: string;
  email: string | null;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  role: AppRole;
  background_check_status: BackgroundCheckStatus;
  background_check_completed_at: string | null;
  is_active: boolean;
}

export interface Family {
  id: string;
  household_name: string;
  primary_phone: string;
  secondary_phone: string | null;
  email: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  sms_opt_in: boolean;
  emergency_notes: string | null;
}

export interface Child {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  preferred_name: string | null;
  birthdate: string;
  grade_label: string | null;
  allergies: string | null;
  medical_notes: string | null;
  special_instructions: string | null;
  photo_url: string | null;
  default_room_id: string | null;
  active: boolean;
}

export interface Room {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  color_hex: string;
  min_age_months: number | null;
  max_age_months: number | null;
  capacity: number | null;
  active: boolean;
}

export interface ServiceEvent {
  id: string;
  name: string;
  campus: string;
  starts_at: string;
  ends_at: string | null;
  status: "scheduled" | "live" | "closed";
}

export interface AuthorizedPickup {
  id: string;
  family_id: string;
  linked_user_id: string | null;
  full_name: string;
  phone: string | null;
  relationship: string | null;
  email: string | null;
  photo_id_last4: string | null;
  can_pick_up: boolean;
  notes: string | null;
}

export interface Precheckin {
  id: string;
  family_id: string;
  service_event_id: string;
  requested_by: string;
  status: "queued" | "confirmed" | "cancelled" | "expired";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CheckinSession {
  id: string;
  family_id: string;
  service_event_id: string;
  source: CheckinSource;
  status: CheckinStatus;
  security_code: string;
  security_code_last4: string;
  security_qr_token: string;
  parent_note: string | null;
  checked_in_at: string;
  picked_up_at: string | null;
  label_printed_at: string | null;
}

export interface CheckinRecord {
  id: string;
  checkin_session_id: string;
  family_id: string;
  service_event_id: string;
  child_id: string;
  room_id: string | null;
  dropoff_time: string;
  pickup_time: string | null;
  status: CheckinStatus;
  allergies_snapshot: string | null;
  medical_notes_snapshot: string | null;
  special_instructions_snapshot: string | null;
  photo_url_snapshot: string | null;
}

export interface NotificationRecord {
  id: string;
  family_id: string;
  checkin_session_id: string | null;
  recipient_phone: string | null;
  template_key: string;
  message_body: string;
  status: NotificationStatus;
  sent_at: string | null;
  created_at: string;
  metadata?: {
    error?: string;
    [key: string]: unknown;
  } | null;
}

export interface PickupLogRecord {
  id: string;
  checkin_session_id: string;
  checkin_id: string;
  verification_method: VerificationMethod;
  security_code_entered: string | null;
  notes: string | null;
  released_at: string;
}

export interface AttendanceRollup {
  service_event_id: string;
  service_name: string;
  service_day: string;
  room_id: string | null;
  room_name: string | null;
  active_count: number;
  picked_up_count: number;
  total_count: number;
}

export interface FamilySnapshot {
  family: Family;
  children: Child[];
  authorizedPickups: AuthorizedPickup[];
  activeSession: CheckinSession | null;
  activeCheckins: CheckinRecord[];
  notifications: NotificationRecord[];
}

export interface KioskLabelPayload {
  family: Family;
  session: CheckinSession;
  service: ServiceEvent | null;
  children: Array<
    Child & {
      roomName: string;
      allergyText: string;
      displayLabel: string;
      displayLabelType: "grade" | "age";
    }
  >;
}
