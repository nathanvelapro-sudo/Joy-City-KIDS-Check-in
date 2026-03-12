import { clsx, type ClassValue } from "clsx";
import { format, isToday, isTomorrow } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhone(phone?: string | null) {
  if (!phone) {
    return "No phone";
  }

  const cleaned = phone.replace(/\D/g, "");
  const normalized = cleaned.length === 11 && cleaned.startsWith("1") ? cleaned.slice(1) : cleaned;

  if (normalized.length !== 10) {
    return phone;
  }

  return `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
}

export function normalizeUsPhoneToE164(phone?: string | null) {
  if (!phone) {
    return null;
  }

  const trimmed = phone.trim();
  const cleaned = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+") && cleaned.length >= 8) {
    return `+${cleaned}`;
  }

  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+${cleaned}`;
  }

  return null;
}

export function formatTemplateLabel(templateKey?: string | null) {
  if (!templateKey) {
    return "Alert";
  }

  return templateKey
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeBrandCopy(value?: string | null) {
  if (!value) {
    return "";
  }

  return value.replace(/safe\s*kids/gi, "JoyKids");
}

export function formatNotificationError(value?: string | null) {
  if (!value) {
    return "";
  }

  if (/twilio|not configured|auth|credential/i.test(value)) {
    return "Alert delivery needs attention. Please resend the room update.";
  }

  return value;
}

export function formatDateTime(input?: string | Date | null) {
  if (!input) {
    return "Not scheduled";
  }

  const value = typeof input === "string" ? new Date(input) : input;
  if (isToday(value)) {
    return `Today at ${format(value, "h:mm a")}`;
  }

  if (isTomorrow(value)) {
    return `Tomorrow at ${format(value, "h:mm a")}`;
  }

  return format(value, "EEE, MMM d 'at' h:mm a");
}

export function calculateAgeLabel(birthdate: string) {
  const now = new Date();
  const dob = new Date(birthdate);
  const age = now.getFullYear() - dob.getFullYear();
  const hasHadBirthday =
    now.getMonth() > dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate());
  const years = hasHadBirthday ? age : age - 1;

  if (years <= 1) {
    const months =
      (now.getFullYear() - dob.getFullYear()) * 12 +
      now.getMonth() -
      dob.getMonth() -
      (now.getDate() < dob.getDate() ? 1 : 0);
    return `${Math.max(months, 0)} mo`;
  }

  return `${years} yrs`;
}

export function formatGradeOrAge(gradeLabel: string | null | undefined, birthdate: string) {
  if (gradeLabel?.trim()) {
    return gradeLabel.trim();
  }

  return calculateAgeLabel(birthdate);
}

export function getGradeOrAgeLabelType(gradeLabel: string | null | undefined) {
  return gradeLabel?.trim() ? "grade" : "age";
}

export function truncate(value: string, max = 120) {
  if (value.length <= max) {
    return value;
  }

  return `${value.slice(0, max - 1)}...`;
}
