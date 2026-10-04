import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const APP_TIME_ZONE = "America/Chicago";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: APP_TIME_ZONE,
  weekday: "short",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: APP_TIME_ZONE,
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: APP_TIME_ZONE,
  year: "numeric",
});

function getDateKey(value: Date) {
  const parts = Object.fromEntries(
    dateKeyFormatter
      .formatToParts(value)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(dateKey: string, days: number) {
  const value = new Date(`${dateKey}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

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
  if (Number.isNaN(value.getTime())) {
    return "Not scheduled";
  }

  const todayKey = getDateKey(new Date());
  const valueKey = getDateKey(value);

  if (valueKey === todayKey) {
    return `Today at ${timeFormatter.format(value)}`;
  }

  if (valueKey === addDays(todayKey, 1)) {
    return `Tomorrow at ${timeFormatter.format(value)}`;
  }

  return `${dateFormatter.format(value)} at ${timeFormatter.format(value)}`;
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

export function calculateAgeMonths(birthdate: string, asOf = new Date()) {
  const dob = new Date(birthdate);

  if (Number.isNaN(dob.getTime())) {
    return null;
  }

  return Math.max(
    (asOf.getFullYear() - dob.getFullYear()) * 12 +
      (asOf.getMonth() - dob.getMonth()) -
      (asOf.getDate() < dob.getDate() ? 1 : 0),
    0,
  );
}

export function findRoomForBirthdate(
  birthdate: string,
  rooms: Array<{
    id: string;
    name?: string;
    location?: string | null;
    min_age_months: number | null;
    max_age_months: number | null;
    active?: boolean | null;
  }>,
) {
  const ageMonths = calculateAgeMonths(birthdate);

  if (ageMonths === null) {
    return null;
  }

  return (
    rooms
      .filter((room) => room.active !== false)
      .sort((left, right) => {
        const leftMin = left.min_age_months ?? -1;
        const rightMin = right.min_age_months ?? -1;

        if (leftMin !== rightMin) {
          return rightMin - leftMin;
        }

        return (left.max_age_months ?? Number.MAX_SAFE_INTEGER) - (right.max_age_months ?? Number.MAX_SAFE_INTEGER);
      })
      .find(
        (room) =>
          (room.min_age_months === null || ageMonths >= room.min_age_months) &&
          (room.max_age_months === null || ageMonths <= room.max_age_months),
      ) ?? null
  );
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
