// DOM helpers shared by the views.
import { esc, fmt } from './util.js';
import { badge } from './foods.js';

export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/**
 * Bottom sheet built on <dialog>. `body` is trusted HTML built by the caller
 * (escape user strings with esc()). Returns the dialog element.
 */
export function openSheet({ title, body, onMount, onClose }) {
  const dlg = document.createElement('dialog');
  dlg.className = 'sheet';
  dlg.innerHTML = `
    <div class="sheet-inner">
      <div class="sheet-head">
        <h2>${esc(title)}</h2>
        <button type="button" class="icon-btn plain" data-close aria-label="Close">✕</button>
      </div>
      <div class="sheet-body">${body}</div>
    </div>`;
  document.body.append(dlg);
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }); // tap backdrop
  dlg.addEventListener('close', () => { dlg.remove(); onClose?.(); });
  dlg.showModal();
  onMount?.(dlg);
  return dlg;
}

export function confirmSheet(title, message, okLabel = 'Delete') {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title,
      body: `<p>${esc(message)}</p>
        <div class="row" style="justify-content:flex-end">
          <button type="button" class="btn" data-no>Cancel</button>
          <button type="button" class="btn btn-primary" data-yes>${esc(okLabel)}</button>
        </div>`,
      onMount(dlg) {
        dlg.querySelector('[data-no]').onclick = () => dlg.close();
        dlg.querySelector('[data-yes]').onclick = () => { answered = true; resolve(true); dlg.close(); };
      },
      onClose() { if (!answered) resolve(false); },
    });
  });
}

export const stateBadge = (st) => `<span class="badge ${st === 'raw' ? 'raw' : 'cooked'}">${badge(st)}</span>`;

export function subtabs(items, active) {
  return `<nav class="subtabs" aria-label="Sections">${items
    .map(([id, label, href]) => `<a href="${href}" class="${id === active ? 'active' : ''}" ${id === active ? 'aria-current="page"' : ''}>${esc(label)}</a>`)
    .join('')}</nav>`;
}

/** Macro meter: track is a lighter step of the same hue; value always printed. */
export function meter(cls, label, value, target, unit = 'g') {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return `<div class="meter ${cls}">
    <div class="meter-label"><span class="key"><i></i>${esc(label)}</span>
      <span class="num"><b>${fmt(value)}</b> / ${fmt(target)} ${unit}</span></div>
    <div class="meter-track" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${Math.round(value)}">
      <div class="meter-fill" style="width:${pct}%"></div></div>
  </div>`;
}

/** Calorie ring (a meter): fill = eaten / target. */
export function ring(eaten, target) {
  const r = 52, c = 2 * Math.PI * r;
  const frac = target > 0 ? eaten / target : 0;
  const over = frac > 1.05;
  const len = Math.min(1, frac) * c;
  const left = target - eaten;
  return `<svg class="ring ${over ? 'over' : ''}" viewBox="0 0 132 132" role="img" aria-label="${fmt(eaten)} of ${fmt(target)} kcal eaten">
    <circle class="track" cx="66" cy="66" r="${r}" fill="none" stroke-width="12"/>
    <circle class="fill" cx="66" cy="66" r="${r}" fill="none" stroke-width="12" stroke-linecap="round"
      stroke-dasharray="${len} ${c}" transform="rotate(-90 66 66)" ${eaten <= 0 ? 'stroke-opacity="0"' : ''}/>
    <text x="66" y="64" text-anchor="middle" class="big">${fmt(eaten)}</text>
    <text x="66" y="82" text-anchor="middle" class="lbl">${left >= 0 ? `${fmt(left)} kcal left` : `${fmt(-left)} kcal over`}</text>
  </svg>`;
}

export function alertBox(level, text) {
  const ico = level === 'warn' ? '!' : level === 'ok' ? '✓' : 'i';
  return `<div class="alert ${level}"><span class="ico" aria-hidden="true">${ico}</span><div>${esc(text)}</div></div>`;
}

/** Read a form's named inputs into a plain object. */
export function formValues(root) {
  const out = {};
  root.querySelectorAll('[name]').forEach((el) => {
    if (el.type === 'radio') { if (el.checked) out[el.name] = el.value; }
    else if (el.type === 'checkbox') out[el.name] = el.checked;
    else out[el.name] = el.value;
  });
  return out;
}

export function download(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
