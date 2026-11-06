// Settings: profile, targets, burn model, supplements, foods, backup.
import { esc, fmt, fmtDate, fmtLongDate, num, numOrNull, uid, todayISO, isValidISO, diffDays } from '../util.js';
import { importJSON, defaultState, getLastBackup } from '../store.js';
import { WORKOUT_DAYS, profileComplete } from '../plan.js';
import { bmrMifflin, dayBurn, currentWeight, suggestBaseKcal, suppSchedule, scheduleLabel, nextDue } from '../calc.js';
import { openSheet, confirmSheet, toast, formValues, backupNow } from '../ui.js';
import { getThemeMode, setThemeMode } from '../theme.js';

const field = (name, label, value, attrs = 'inputmode="decimal"') =>
  `<label class="field"><span>${label}</span><input class="input num" name="${name}" value="${esc(value ?? '')}" ${attrs}></label>`;

export function render(root, ctx) {
  const { state } = ctx;
  const p = state.profile, t = state.targets, b = state.burn;
  const weight = currentWeight(state, todayISO());
  const hasStats = profileComplete(p);
  const bmr = hasStats ? bmrMifflin({ ...p, weightKg: weight }) : null;
  const suggested = hasStats ? suggestBaseKcal(p, weight) : null;

  // Weekly average burn if every planned session is done (jog 30 min on Saturday).
  let weekTotal = 0;
  for (const d of WORKOUT_DAYS) {
    const exercises = Object.fromEntries(d.exercises.map((e) => [e.id, { done: true }]));
    weekTotal += dayBurn({ workout: { planDayId: d.id, exercises, cardio: { done: d.type === 'cardio', minutes: 30 } } }, b, weight).total;
  }
  const macroSum = num(t.protein) * 4 + num(t.carbs) * 4 + num(t.fat) * 9;

  const mode = getThemeMode();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const lastBackup = getLastBackup();
  const backupDays = lastBackup ? diffDays(lastBackup.slice(0, 10), todayISO()) : null;

  root.innerHTML = `
    <section class="card">
      <div class="card-head"><div><h2>Appearance</h2><div class="sub">Also switch with the moon/sun button at the top</div></div></div>
      <div class="radio-row" role="radiogroup" aria-label="Theme">
        ${[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([v, l]) => `<label><input type="radio" name="theme" value="${v}" ${mode === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </div>
    </section>

    <section class="card" data-form="profile">
      <div class="card-head"><h2>Profile</h2></div>
      <div class="grid2">
        ${field('age', 'Age', p.age, 'inputmode="numeric"')}
        <label class="field"><span>Sex</span><select class="input" name="sex">${p.sex ? '' : '<option value="" selected>Choose…</option>'}<option value="male" ${p.sex === 'male' ? 'selected' : ''}>Male</option><option value="female" ${p.sex === 'female' ? 'selected' : ''}>Female</option></select></label>
        ${field('heightCm', 'Height (cm)', p.heightCm)}
        ${field('startWeightKg', 'Starting weight (kg)', p.startWeightKg)}
        ${field('goalWeightKg', 'Goal / checkpoint (kg)', p.goalWeightKg)}
        ${field('startWaistCm', 'Starting waist (cm)', p.startWaistCm)}
        ${field('waistGoalCm', 'Waist goal (cm)', p.waistGoalCm)}
      </div>
      <p class="muted tiny" style="margin-top:6px">${num(p.heightCm) > 0 ? `Waist under half your height (${fmt(num(p.heightCm) / 2, 1)} cm) is a useful long-term health marker. ` : ''}Waist fields are optional.</p>
      <button class="btn btn-primary" style="margin-top:8px" data-save="profile">Save profile</button>
    </section>

    <section class="card" data-form="targets">
      <div class="card-head"><h2>Daily targets</h2></div>
      <div class="grid2">
        ${field('kcal', 'Calories (kcal)', t.kcal)}
        ${field('protein', 'Protein (g)', t.protein)}
        ${field('carbs', 'Carbs (g)', t.carbs)}
        ${field('fat', 'Fat (g)', t.fat)}
      </div>
      <p class="muted tiny" style="margin-top:6px">Macros add up to ${fmt(macroSum)} kcal. Plan rule: losing faster than ~0.5–0.7 kg/week with poor recovery → add 100–200 kcal; weight and waist flat for 3 weeks → reduce 100–150 kcal.</p>
      <button class="btn btn-primary" style="margin-top:8px" data-save="targets">Save targets</button>
    </section>

    <section class="card" data-form="burn">
      <div class="card-head"><div><h2>Calorie burn estimate</h2><div class="sub">Used for expected weight change</div></div></div>
      <div class="grid2">
        ${field('baseKcal', 'Everyday burn without workouts (kcal)', b.baseKcal)}
        ${field('kcalPerKg', 'kcal per kg of body weight', b.kcalPerKg)}
        ${field('strengthMet', 'Lifting intensity (MET)', b.strengthMet)}
        ${field('strengthMinutes', 'Lifting session length (min)', b.strengthMinutes)}
        ${field('jogMet', 'Easy jog intensity (MET)', b.jogMet)}
      </div>
      <p class="small" style="margin-top:8px">With all 5 lifting days + a 30-min Saturday jog, your average burn is <b>${fmt(weekTotal / 7)} kcal/day</b>.</p>
      <p class="muted tiny">Workouts add (MET − 1) × ${fmt(weight, 1)} kg × hours, only when ticked done.${hasStats ? ` From your stats: BMR (Mifflin-St Jeor) = ${fmt(bmr)} kcal, so everyday burn ≈ BMR × 1.4 = ${fmt(suggested)} kcal.` : ' Enter your stats in Profile to get a suggested everyday burn.'}</p>
      <div class="row wrap" style="margin-top:8px">
        <button class="btn btn-primary" data-save="burn">Save burn settings</button>
        ${hasStats && suggested !== num(b.baseKcal) ? `<button class="btn" data-suggest>Use ${fmt(suggested)} from my stats</button>` : ''}
      </div>
    </section>

    <section class="card">
      <div class="card-head"><div><h2>Supplements</h2><div class="sub">Calories from shakes are counted automatically when ticked</div></div>
        <button class="btn btn-sm btn-primary" data-addsupp>+ Add</button></div>
      <ul class="list">${state.supplements.map((s) => `<li><button class="item" data-supp="${esc(s.id)}">
        <span class="grow"><span class="title">${esc(s.name)}</span> <span class="badge neutral">${esc(scheduleLabel(s))}</span><br>
          <span class="meta">${esc(s.dose || '')}${num(s.kcal) ? ` · ${fmt(s.kcal)} kcal · P ${fmt(s.protein)} g` : ''}</span></span><span class="muted">›</span></button></li>`).join('')}</ul>
    </section>

    <section class="card">
      <div class="card-head"><h2>Foods</h2></div>
      <p class="small">Add, edit or delete your own food types (raw or cooked) in <a href="#/food/foods">Food → My Foods</a>. You have ${state.customFoods.length} custom food${state.customFoods.length === 1 ? '' : 's'}.</p>
    </section>

    <section class="card">
      <div class="card-head"><div><h2>Backup</h2><div class="sub">Your data is saved only on this device</div></div></div>
      <div class="row wrap">
        <button class="btn btn-primary" data-export>Back up now</button>
        <label class="btn">Import backup<input type="file" accept="application/json,.json" data-import hidden></label>
        <button class="btn btn-danger" data-reset>Reset everything</button>
      </div>
      <p class="small" style="margin-top:8px">Last backup: <b>${lastBackup ? `${esc(fmtLongDate(lastBackup.slice(0, 10)))}${backupDays === 0 ? ' (today)' : ` (${backupDays} day${backupDays === 1 ? '' : 's'} ago)`}` : 'never'}</b></p>
      <p class="muted tiny">On a phone, Back up opens the share menu so you can save the file to Files, Google Drive or send it to yourself. Use Import to move your history to another phone or browser. ${Object.keys(state.days).length} day(s) stored.</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Install on your phone</h2>${ctx.installPrompt && !standalone ? '<button class="btn btn-sm btn-primary" data-install>Install app</button>' : ''}</div>
      ${standalone ? '<p class="small"><span class="status good">Installed</span> You’re using the installed app. It works offline.</p>' : `
      <p class="small"><b>Android (Chrome):</b> ${ctx.installPrompt ? 'tap <b>Install app</b> above, or ' : ''}menu ⋮ → <i>Install app</i> / <i>Add to Home screen</i>.<br>
      <b>iPhone (Safari):</b> Share → <i>Add to Home Screen</i>.</p>
      <p class="muted tiny">Works offline once installed. Installing needs the app to be opened from an https:// address (or localhost on a computer).</p>`}
      <p class="muted tiny">This is a general fitness tool based on your plan, not medical advice. If you have kidney or liver disease, ask your doctor before increasing protein or taking creatine.</p>
    </section>`;

  // ----- Save handlers -----
  root.querySelectorAll('[data-save]').forEach((btn) => btn.addEventListener('click', () => {
    const which = btn.dataset.save;
    const form = root.querySelector(`[data-form="${which}"]`);
    const v = formValues(form);
    const target = which === 'profile' ? state.profile : which === 'targets' ? state.targets : state.burn;
    for (const [k, raw] of Object.entries(v)) {
      if (k === 'sex') { if (raw) target.sex = raw; continue; }
      const n = numOrNull(raw);
      if (which === 'profile' && n === null) { target[k] = null; continue; }
      if (n === null || n < 0) { toast('Please fill every field with a number'); return; }
      target[k] = n;
    }
    if (which === 'burn' && !(state.burn.kcalPerKg > 0)) state.burn.kcalPerKg = 7700;
    ctx.save();
    toast('Saved');
    ctx.render();
  }));

  root.querySelector('[data-suggest]')?.addEventListener('click', () => {
    state.burn.baseKcal = suggested;
    ctx.save();
    toast(`Everyday burn set to ${fmt(suggested)} kcal`);
    ctx.render();
  });

  root.querySelector('[data-addsupp]').addEventListener('click', () => openSupplement(ctx, null));
  root.querySelectorAll('[data-supp]').forEach((b2) => b2.addEventListener('click', () => openSupplement(ctx, state.supplements.find((s) => s.id === b2.dataset.supp))));

  root.querySelectorAll('[name=theme]').forEach((r) => r.addEventListener('change', () => setThemeMode(r.value)));

  root.querySelector('[data-export]').addEventListener('click', async () => {
    if (await backupNow(state)) ctx.render();
  });
  root.querySelector('[data-import]').addEventListener('change', async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const next = importJSON(await file.text());
      if (!(await confirmSheet('Import backup', `Replace the data on this device with the backup (${Object.keys(next.days).length} days)?`, 'Replace'))) return;
      ctx.state = next;
      ctx.save();
      toast('Backup imported');
      ctx.render();
    } catch (err) {
      toast(err instanceof SyntaxError ? 'That file isn’t a valid backup' : err.message || 'Could not read that file');
    } finally {
      input.value = ''; // so choosing the same file again still works
    }
  });
  root.querySelector('[data-install]')?.addEventListener('click', async () => {
    const prompt = ctx.installPrompt;
    if (!prompt) return;
    prompt.prompt();
    try { await prompt.userChoice; } catch { /* dismissed */ }
    ctx.installPrompt = null;
    ctx.render();
  });
  root.querySelector('[data-reset]').addEventListener('click', async () => {
    if (!(await confirmSheet('Reset everything', 'Delete all food logs, workouts, weigh-ins, custom foods and settings on this device? Export a backup first if you might need it.', 'Delete all'))) return;
    ctx.state = defaultState();
    ctx.save();
    toast('All data reset');
    ctx.render();
  });
}

const WEEK = [[1, 'M'], [2, 'T'], [3, 'W'], [4, 'T'], [5, 'F'], [6, 'S'], [0, 'S']];
const WEEK_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function openSupplement(ctx, sup) {
  const { state } = ctx;
  const s = sup || { name: '', dose: '', schedule: { type: 'daily' }, kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const sc = suppSchedule(s);
  const today = todayISO();
  const every = sc.type === 'interval' ? sc.every : 2;
  const start = sc.type === 'interval' && isValidISO(sc.start) ? sc.start : today;
  const days = sc.type === 'weekdays' ? sc.days || [] : [];
  openSheet({
    title: sup ? 'Edit supplement' : 'New supplement',
    body: `
      <label class="field"><span>Name</span><input class="input" name="name" maxlength="60" value="${esc(s.name)}" placeholder="e.g. Vitamin D, Fish oil"></label>
      <label class="field"><span>Dose / note</span><input class="input" name="dose" maxlength="100" value="${esc(s.dose)}" placeholder="e.g. 1 capsule after breakfast"></label>
      <label class="field"><span>How often</span><select class="input" name="schedType">
        <option value="daily" ${sc.type === 'daily' ? 'selected' : ''}>Every day</option>
        <option value="interval" ${sc.type === 'interval' ? 'selected' : ''}>Every few days (e.g. every 2 days)</option>
        <option value="weekdays" ${sc.type === 'weekdays' ? 'selected' : ''}>On certain days of the week</option>
        <option value="asneeded" ${sc.type === 'asneeded' ? 'selected' : ''}>Only when needed (no streak)</option>
      </select></label>
      <div class="grid2" data-for="interval">
        <label class="field"><span>Every … days</span><input class="input num" name="every" inputmode="numeric" value="${esc(every)}"></label>
        <label class="field"><span>Starting on</span><input class="input" type="date" name="start" value="${start}"></label>
      </div>
      <div class="field" data-for="weekdays"><span>Days</span>
        <div class="radio-row weekpick">${WEEK.map(([d, l]) => `<label title="${WEEK_NAMES[d]}"><input type="checkbox" name="wd" value="${d}" ${days.includes(d) ? 'checked' : ''} aria-label="${WEEK_NAMES[d]}"><span>${l}</span></label>`).join('')}</div>
      </div>
      <p class="small muted" data-next></p>
      <p class="muted small">Nutrition per dose (leave 0 for pills / creatine):</p>
      <div class="grid2">
        ${field('kcal', 'kcal', s.kcal)}${field('protein', 'Protein (g)', s.protein)}${field('carbs', 'Carbs (g)', s.carbs)}${field('fat', 'Fat (g)', s.fat)}
      </div>
      <div class="row between">
        ${sup ? '<button type="button" class="btn btn-danger" data-del>Delete</button>' : '<span></span>'}
        <button type="button" class="btn btn-primary" data-ok>Save</button>
      </div>`,
    onMount(dlg) {
      const typeSel = dlg.querySelector('[name=schedType]');
      const readSchedule = () => {
        const type = typeSel.value;
        if (type === 'interval') {
          const n = Math.round(num(dlg.querySelector('[name=every]').value));
          const st = dlg.querySelector('[name=start]').value;
          if (!(n >= 2 && n <= 60)) return { error: 'Choose every 2 to 60 days (or pick Every day)' };
          if (!isValidISO(st)) return { error: 'Pick the first day to take it' };
          return { schedule: { type, every: n, start: st } };
        }
        if (type === 'weekdays') {
          const picked = [...dlg.querySelectorAll('[name=wd]:checked')].map((c) => Number(c.value));
          if (!picked.length) return { error: 'Pick at least one day' };
          return { schedule: picked.length === 7 ? { type: 'daily' } : { type, days: picked } };
        }
        return { schedule: { type } };
      };
      const refresh = () => {
        dlg.querySelectorAll('[data-for]').forEach((el) => el.classList.toggle('hidden', el.dataset.for !== typeSel.value));
        const { schedule, error } = readSchedule();
        const hint = dlg.querySelector('[data-next]');
        if (error || schedule.type === 'asneeded') { hint.textContent = schedule?.type === 'asneeded' ? 'No reminder or streak – tick it on the days you take it.' : ''; return; }
        const nd = nextDue({ schedule }, today);
        hint.textContent = nd ? `${scheduleLabel({ schedule })} · next due ${nd === today ? 'today' : fmtDate(nd, { weekday: 'long', month: 'short', day: 'numeric' })}` : '';
      };
      dlg.querySelectorAll('select, input').forEach((el) => { el.addEventListener('change', refresh); el.addEventListener('input', refresh); });
      refresh();
      if (!sup) dlg.querySelector('[name=name]').focus();

      dlg.querySelector('[data-ok]').addEventListener('click', () => {
        const v = formValues(dlg);
        if (!v.name.trim()) { toast('Give it a name'); return; }
        const { schedule, error } = readSchedule();
        if (error) { toast(error); return; }
        const rec = {
          id: sup?.id || `s_${uid()}`,
          name: v.name.trim(), dose: v.dose.trim(), schedule,
          kcal: Math.max(0, num(v.kcal)), protein: Math.max(0, num(v.protein)), carbs: Math.max(0, num(v.carbs)), fat: Math.max(0, num(v.fat)),
        };
        // New supplements are tracked from today (history before it isn't counted as missed).
        if (sup?.since || !sup) rec.since = sup?.since || today;
        if (sup) state.supplements = state.supplements.map((x) => (x.id === sup.id ? rec : x));
        else state.supplements.push(rec);
        ctx.save();
        dlg.close();
        toast('Saved');
        ctx.render();
      });
      dlg.querySelector('[data-del]')?.addEventListener('click', async () => {
        dlg.close();
        if (!(await confirmSheet('Delete supplement', `Remove “${sup.name}”? Past ticks stay in your history file but won’t be shown.`))) return;
        state.supplements = state.supplements.filter((x) => x.id !== sup.id);
        ctx.save();
        ctx.render();
      });
    },
  });
}
