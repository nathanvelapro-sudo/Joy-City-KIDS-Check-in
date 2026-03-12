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
