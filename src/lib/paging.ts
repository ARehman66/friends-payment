export function parsePage(value?: string) {
  return Math.max(1, Number(value || 1) || 1);
}

export function parsePageSize(value?: string, fallback = 10) {
  const n = Number(value || fallback) || fallback;
  return [5, 10, 20, 50].includes(n) ? n : fallback;
}
