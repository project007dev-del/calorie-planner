// Settings: profile, targets, burn model, supplements, foods, backup.
import { esc, fmt, num, numOrNull, uid, todayISO } from '../util.js';
import { exportJSON, importJSON, defaultState } from '../store.js';
import { WORKOUT_DAYS, profileComplete } from '../plan.js';
import { bmrMifflin, dayBurn, currentWeight, suggestBaseKcal } from '../calc.js';
import { openSheet, confirmSheet, toast, formValues, download } from '../ui.js';

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

  root.innerHTML = `
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
        <span class="grow"><span class="title">${esc(s.name)}</span> ${s.daily ? '' : '<span class="badge neutral">backup</span>'}<br>
          <span class="meta">${esc(s.dose || '')}${num(s.kcal) ? ` · ${fmt(s.kcal)} kcal · P ${fmt(s.protein)} g` : ''}</span></span><span class="muted">›</span></button></li>`).join('')}</ul>
    </section>

    <section class="card">
      <div class="card-head"><h2>Foods</h2></div>
      <p class="small">Add, edit or delete your own food types (raw or cooked) in <a href="#/food/foods">Food → My Foods</a>. You have ${state.customFoods.length} custom food${state.customFoods.length === 1 ? '' : 's'}.</p>
    </section>

    <section class="card">
      <div class="card-head"><div><h2>Backup</h2><div class="sub">Your data is saved only on this device</div></div></div>
      <div class="row wrap">
        <button class="btn" data-export>Export backup</button>
        <label class="btn">Import backup<input type="file" accept="application/json,.json" data-import hidden></label>
        <button class="btn btn-danger" data-reset>Reset everything</button>
      </div>
      <p class="muted tiny" style="margin-top:8px">Export regularly, and use Import to move your history to another phone or browser. ${Object.keys(state.days).length} day(s) stored.</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Install on your phone</h2></div>
      <p class="small"><b>Android (Chrome):</b> menu ⋮ → <i>Install app</i> / <i>Add to Home screen</i>.<br>
      <b>iPhone (Safari):</b> Share → <i>Add to Home Screen</i>.</p>
      <p class="muted tiny">Works offline once installed. Installing needs the app to be opened from an https:// address (or localhost on a computer).</p>
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

  root.querySelector('[data-export]').addEventListener('click', () => {
    download(`planner-backup-${todayISO()}.json`, exportJSON(state));
    toast('Backup downloaded');
  });
  root.querySelector('[data-import]').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const next = importJSON(await file.text());
      if (!(await confirmSheet('Import backup', `Replace the data on this device with the backup (${Object.keys(next.days).length} days)?`, 'Replace'))) return;
      ctx.state = next;
      ctx.save();
      toast('Backup imported');
      ctx.render();
    } catch (err) {
      toast(err.message || 'Could not read that file');
    }
  });
  root.querySelector('[data-reset]').addEventListener('click', async () => {
    if (!(await confirmSheet('Reset everything', 'Delete all food logs, workouts, weigh-ins, custom foods and settings on this device? Export a backup first if you might need it.', 'Delete all'))) return;
    ctx.state = defaultState();
    ctx.save();
    toast('All data reset');
    ctx.render();
  });
}

function openSupplement(ctx, sup) {
  const { state } = ctx;
  const s = sup || { name: '', dose: '', daily: true, kcal: 0, protein: 0, carbs: 0, fat: 0 };
  openSheet({
    title: sup ? 'Edit supplement' : 'New supplement',
    body: `
      <label class="field"><span>Name</span><input class="input" name="name" maxlength="60" value="${esc(s.name)}"></label>
      <label class="field"><span>Dose / note</span><input class="input" name="dose" maxlength="100" value="${esc(s.dose)}"></label>
      <label class="check"><input type="checkbox" name="daily" ${s.daily ? 'checked' : ''}><span><span class="title">Take every day</span><br><span class="meta">Untick for backups like the 2nd shake (no streak)</span></span></label>
      <p class="muted small">Nutrition per dose (leave 0 for pills / creatine):</p>
      <div class="grid2">
        ${field('kcal', 'kcal', s.kcal)}${field('protein', 'Protein (g)', s.protein)}${field('carbs', 'Carbs (g)', s.carbs)}${field('fat', 'Fat (g)', s.fat)}
      </div>
      <div class="row between">
        ${sup ? '<button type="button" class="btn btn-danger" data-del>Delete</button>' : '<span></span>'}
        <button type="button" class="btn btn-primary" data-ok>Save</button>
      </div>`,
    onMount(dlg) {
      dlg.querySelector('[data-ok]').addEventListener('click', () => {
        const v = formValues(dlg);
        if (!v.name.trim()) { toast('Give it a name'); return; }
        const rec = {
          id: sup?.id || `s_${uid()}`,
          name: v.name.trim(), dose: v.dose.trim(), daily: !!v.daily,
          kcal: Math.max(0, num(v.kcal)), protein: Math.max(0, num(v.protein)), carbs: Math.max(0, num(v.carbs)), fat: Math.max(0, num(v.fat)),
        };
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
