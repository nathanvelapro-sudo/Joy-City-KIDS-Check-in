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
