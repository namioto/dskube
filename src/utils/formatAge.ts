export function formatAge(isoStr: string | null | undefined): string {
  if (!isoStr) return "-";
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff <= 0) return "0m";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "0m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
