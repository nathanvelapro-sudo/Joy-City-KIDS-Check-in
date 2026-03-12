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
