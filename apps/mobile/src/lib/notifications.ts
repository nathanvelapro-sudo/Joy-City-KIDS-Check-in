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
