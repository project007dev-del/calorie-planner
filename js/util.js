// Small pure helpers (no DOM) shared by the app and the unit tests.

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function toISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export const todayISO = () => toISO(new Date());

export function parseISO(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
/** Whole days from a to b (b - a). */
export function diffDays(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 86400000);
}
/** Monday of the week containing iso. */
export function weekStart(iso) {
  const wd = parseISO(iso).getDay(); // 0 = Sun
  return addDays(iso, wd === 0 ? -6 : 1 - wd);
}
export function isValidISO(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;
}

export function fmtDate(iso, opts = { weekday: 'short', month: 'short', day: 'numeric' }) {
  return parseISO(iso).toLocaleDateString(undefined, opts);
}
export const fmtLongDate = (iso) => fmtDate(iso, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Parse a user-typed number; returns 0 for blanks/invalid. Accepts comma decimals. */
export function num(v) {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
/** Like num() but returns null for blank/invalid input. */
export function numOrNull(v) {
  if (v === null || v === undefined || String(v).trim() === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

export function fmt(n, digits = 0) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '–';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
/** Up to `digits` decimals, but no trailing zeros (20 → "20", 22.5 → "22.5"). */
export function fmtUpTo(n, digits = 1) {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '–';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits });
}
/** Format with sign, e.g. +0.12 / −0.40 (uses a real minus sign). */
export function fmtSigned(n, digits = 0) {
  if (!Number.isFinite(n)) return '–';
  const r = Number(n.toFixed(digits));
  if (r === 0) return fmt(0, digits);
  return (r > 0 ? '+' : '−') + fmt(Math.abs(r), digits);
}
export const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
