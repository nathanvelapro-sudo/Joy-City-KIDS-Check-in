export interface Family {
  id: string;
  household_name: string;
  primary_phone: string;
  email: string | null;
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
  special_instructions: string | null;
  default_room_id: string | null;
}

export interface AuthorizedPickup {
  id: string;
  family_id: string;
  full_name: string;
  phone: string | null;
  relationship: string | null;
  email: string | null;
  can_pick_up: boolean;
}

export interface CheckinSession {
  id: string;
  family_id: string;
  service_event_id: string;
  security_code: string;
  security_qr_token: string;
  checked_in_at: string;
  status: string;
}

export interface NotificationRecord {
  id: string;
  template_key: string;
  message_body: string;
  status: string;
  created_at: string;
}

export interface ServiceEvent {
  id: string;
  name: string;
  starts_at: string;
  status: string;
}

export interface FamilySnapshot {
  family: Family;
  children: Child[];
  authorizedPickups: AuthorizedPickup[];
  activeSession: CheckinSession | null;
  notifications: NotificationRecord[];
}

