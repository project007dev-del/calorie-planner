// Small dependency-free SVG time chart with a crosshair tooltip.
// Marks follow simple rules: 2px lines, ≥8px dots with a 2px surface ring,
// solid hairline grid, one y-axis, text in ink colours (never series colours).
import { diffDays, addDays, fmt, fmtDate } from './util.js';

const M = { top: 14, right: 62, bottom: 28, left: 36 };

function niceStep(range, target = 4) {
  const raw = range / target;
  const steps = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 500];
  return steps.find((s) => s >= raw) || raw;
}

/**
 * @param {HTMLElement} el container (gets class "chart")
 * @param {object} opt
 *   series: [{ id, label, kind: 'line'|'dots'|'dash', points: [{date, y}], endLabel?: bool, soft?: bool }]
 *   goal: { y, label } | null
 *   unit: 'kg', digits: 1, height: 220, ariaLabel
 */
export function timeChart(el, opt) {
  const { series, goal = null, unit = '', digits = 1, height = 220, ariaLabel = 'Chart' } = opt;
  el.classList.add('chart');
  const H = height;
  // Draw at the container's real pixel width so 11px text stays 11px on phones.
  const W = Math.max(300, Math.round(el.clientWidth || 600));
  const all = series.flatMap((s) => s.points);
  if (!all.length) { el.innerHTML = '<div class="empty">No data yet.</div>'; return; }

  // ----- Domains -----
  const dates = all.map((p) => p.date).sort();
  let d0 = dates[0], d1 = dates.at(-1);
  if (d0 === d1) { d0 = addDays(d0, -3); d1 = addDays(d1, 3); }
  const span = Math.max(1, diffDays(d0, d1));
  const ys = all.map((p) => p.y).concat(goal ? [goal.y] : []);
  let y0 = Math.min(...ys), y1 = Math.max(...ys);
  if (y1 - y0 < 1) { y0 -= 0.5; y1 += 0.5; }
  const pad = (y1 - y0) * 0.08;
  y0 -= pad; y1 += pad;
  const step = niceStep(y1 - y0);
  y0 = Math.floor(y0 / step) * step;
  y1 = Math.ceil(y1 / step) * step;

  const iw = W - M.left - M.right, ih = H - M.top - M.bottom;
  const x = (date) => M.left + (diffDays(d0, date) / span) * iw;
  const y = (v) => M.top + (1 - (v - y0) / (y1 - y0)) * ih;

  // ----- Grid & axes -----
  let grid = '';
  for (let v = y0; v <= y1 + 1e-9; v += step) {
    const yy = y(v).toFixed(1);
    grid += `<line x1="${M.left}" x2="${W - M.right}" y1="${yy}" y2="${yy}"/>`;
    grid += `<text class="tick" x="${M.left - 6}" y="${(+yy + 4).toFixed(1)}" text-anchor="end">${fmt(v, step < 1 ? 1 : 0)}</text>`;
  }
  const xTicks = [];
  const nX = Math.min(W < 420 ? 3 : 5, span);
  for (let i = 0; i <= nX; i++) xTicks.push(addDays(d0, Math.round((span * i) / nX)));
  const xLabels = [...new Set(xTicks)].map((d) => `<text class="tick" x="${x(d).toFixed(1)}" y="${H - 8}" text-anchor="middle">${fmtDate(d, { month: 'short', day: 'numeric' })}</text>`).join('');

  // ----- Marks -----
  const pathOf = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join('');
  let marks = '';
  let labels = '';
  for (const s of series) {
    const pts = [...s.points].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!pts.length) continue;
    if (s.kind === 'line' || s.kind === 'dash') {
      marks += `<path class="${s.kind === 'dash' ? 'proj-line' : 'series-line'}" d="${pathOf(pts)}"/>`;
      if (s.endDot !== false && s.kind === 'line') {
        const last = pts.at(-1);
        marks += `<circle class="dot" r="4" cx="${x(last.date).toFixed(1)}" cy="${y(last.y).toFixed(1)}"/>`;
      }
    } else {
      marks += pts.map((p) => `<circle class="dot ${s.soft ? 'soft' : ''}" r="4" cx="${x(p.date).toFixed(1)}" cy="${y(p.y).toFixed(1)}"/>`).join('');
    }
    if (s.endLabel) {
      const last = pts.at(-1);
      labels += `<text class="end-label" x="${(x(last.date) + 8).toFixed(1)}" y="${(y(last.y) + 4).toFixed(1)}">${fmt(last.y, digits)} ${unit}</text>`;
    }
  }
  let goalSvg = '';
  if (goal) {
    const gy = y(goal.y).toFixed(1);
    goalSvg = `<line class="goal-line" x1="${M.left}" x2="${W - M.right}" y1="${gy}" y2="${gy}"/>
      <text class="goal-label" x="${W - M.right + 6}" y="${(+gy + 4).toFixed(1)}">${goal.label}</text>`;
  }

  el.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${ariaLabel}" tabindex="0">
      <g class="grid">${grid}</g>
      <g class="axis"><line x1="${M.left}" x2="${W - M.right}" y1="${H - M.bottom}" y2="${H - M.bottom}"/></g>
      ${xLabels}
      ${goalSvg}
      ${marks}
      ${labels}
      <line class="crosshair" y1="${M.top}" y2="${H - M.bottom}" x1="-10" x2="-10" visibility="hidden"/>
      <rect x="${M.left}" y="0" width="${iw}" height="${H}" fill="transparent" data-hit/>
    </svg>
    <div class="tooltip" aria-hidden="true"></div>`;

  // ----- Hover / focus layer -----
  const svg = el.querySelector('svg');
  const cross = el.querySelector('.crosshair');
  const tip = el.querySelector('.tooltip');
  const uniqDates = [...new Set(all.map((p) => p.date))].sort();
  const byDate = new Map(uniqDates.map((d) => [d, series.map((s) => ({ s, p: s.points.find((p) => p.date === d) })).filter((r) => r.p)]));
  let idx = uniqDates.length - 1;

  const show = (i) => {
    idx = Math.max(0, Math.min(uniqDates.length - 1, i));
    const d = uniqDates[idx];
    const cx = x(d);
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx);
    cross.setAttribute('visibility', 'visible');
    tip.replaceChildren();
    const head = document.createElement('div');
    head.className = 't-date';
    head.textContent = fmtDate(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    tip.append(head);
    for (const { s, p } of byDate.get(d)) {
      const row = document.createElement('div');
      row.className = 't-row';
      const key = document.createElement('i');
      if (s.kind === 'dash') key.className = 'dash';
      if (s.kind === 'dots') { key.className = 'dotk'; key.style.background = s.soft ? 'var(--s1-weak)' : 'var(--s1)'; }
      const val = document.createElement('b');
      val.textContent = `${fmt(p.y, digits)} ${unit}`;
      const lab = document.createElement('span');
      lab.className = 'muted';
      lab.textContent = s.label;
      row.append(key, val, lab);
      tip.append(row);
    }
    const scaleX = svg.getBoundingClientRect().width / W;
    tip.style.display = 'block';
    const tw = tip.offsetWidth;
    let left = cx * scaleX + 10;
    if (left + tw > el.clientWidth) left = cx * scaleX - tw - 10;
    tip.style.left = `${Math.max(0, left)}px`;
    tip.style.top = '4px';
  };
  const hide = () => { cross.setAttribute('visibility', 'hidden'); tip.style.display = 'none'; };
  const nearest = (clientX) => {
    const r = svg.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    let best = 0, bd = Infinity;
    uniqDates.forEach((d, i) => { const dd = Math.abs(x(d) - vx); if (dd < bd) { bd = dd; best = i; } });
    return best;
  };
  svg.addEventListener('pointermove', (e) => show(nearest(e.clientX)));
  svg.addEventListener('pointerdown', (e) => show(nearest(e.clientX)));
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('focus', () => show(idx));
  svg.addEventListener('blur', hide);
  svg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { show(idx - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); }
    if (e.key === 'Escape') hide();
  });
}
