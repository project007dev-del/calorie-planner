// DOM helpers shared by the views.
import { esc, fmt, todayISO } from './util.js';
import { badge } from './foods.js';
import { exportJSON, markBackedUp } from './store.js';
import { shareNativeBackup } from './native.js';

/**
 * Short message at the bottom. With { action, onAction } it shows a button
 * (e.g. "Undo") and stays a little longer.
 */
export function toast(msg, { action = null, onAction = null, ms = null } = {}) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.replaceChildren(document.createTextNode(msg));
  if (action && onAction) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'toast-action';
    b.textContent = action;
    b.addEventListener('click', () => { el.classList.remove('show'); onAction(); });
    el.append(b);
  }
  el.classList.toggle('has-action', !!action);
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), ms ?? (action ? 5000 : 2200));
}

// ----- Bottom sheets & the phone's Back button -----
// While a sheet is open we add one history entry, so Back (or the Android back
// gesture) closes the sheet instead of leaving the screen.
const openSheets = () => [...document.querySelectorAll('dialog.sheet')].filter((d) => d.open);
let backPending = false; // we called history.back() ourselves and it hasn't landed yet
let settleWaiters = [];
const settle = () => {
  backPending = false;
  const waiters = settleWaiters;
  settleWaiters = [];
  waiters.forEach((resolve) => resolve());
};
/** Resolves once our own history clean-up is done – navigate only after this. */
export function historySettled() {
  if (!backPending) return Promise.resolve();
  return new Promise((resolve) => {
    settleWaiters.push(resolve);
    setTimeout(settle, 800); // safety net: never wait forever
  });
}
window.addEventListener('popstate', () => {
  if (backPending) {
    // Our own clean-up after a sheet closed. If another sheet opened meanwhile, re-arm Back for it.
    settle();
    if (openSheets().length && !history.state?.sheet) history.pushState({ sheet: true }, '');
    return;
  }
  const top = openSheets().at(-1);
  if (!top) return;
  top.dataset.closedByBack = '1';
  top.close();
  if (openSheets().length) history.pushState({ sheet: true }, ''); // a sheet below is still open
});

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
  // Close on a tap on the dimmed backdrop – only when the press also started there,
  // so selecting text in a field and releasing outside doesn't close the sheet.
  let downOnBackdrop = false;
  dlg.addEventListener('pointerdown', (e) => { downOnBackdrop = e.target === dlg; });
  dlg.addEventListener('click', (e) => { if (e.target === dlg && downOnBackdrop) dlg.close(); });
  // Clean up right when the sheet closes (the 'close' event can arrive late), exactly once.
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    dlg.remove();
    // Closed by a button/backdrop: drop the history entry we added (once, and only if nothing else is open).
    if (!dlg.dataset.closedByBack && !backPending && !openSheets().length && history.state?.sheet) {
      backPending = true;
      history.back();
    }
    onClose?.();
  };
  const nativeClose = dlg.close.bind(dlg);
  dlg.close = (value) => { if (dlg.open) nativeClose(value); cleanup(); };
  dlg.addEventListener('close', cleanup); // e.g. closed with the Esc key
  // One history entry covers all open sheets; while our own Back is in flight the popstate handler re-adds it.
  if (!history.state?.sheet && !backPending) history.pushState({ sheet: true }, '');
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

/** Save a backup: share sheet on phones (Files, Drive, Messenger…), normal download elsewhere. */
export async function shareOrDownload(filename, text, type = 'application/json') {
  const nativeResult = await shareNativeBackup(filename, text);
  if (nativeResult) return nativeResult;
  try {
    const file = new File([text], filename, { type });
    if (navigator.canShare?.({ files: [file] }) && matchMedia('(pointer: coarse)').matches) {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    }
  } catch (e) {
    if (e?.name === 'AbortError') return 'cancelled';
    // fall through to a normal download
  }
  download(filename, text, type);
  return 'downloaded';
}

/** Export all planner data now (share sheet on phones, download on computers). */
export async function backupNow(state) {
  try {
    const how = await shareOrDownload(`planner-backup-${todayISO()}.json`, exportJSON(state));
    if (how === 'cancelled') return false;
    markBackedUp();
    toast(how === 'shared' ? 'Backup ready – keep it somewhere safe' : 'Backup downloaded');
    return true;
  } catch {
    toast('Could not create a backup. Please try again.');
    return false;
  }
}
