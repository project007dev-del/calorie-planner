import { esc, fmt, fmtDate, fmtSigned, fmtLongDate, numOrNull, todayISO, diffDays } from '../util.js';
import { getDay, getLastBackup } from '../store.js';
import { planDayById, planDayForDate, profileComplete, DEFAULT_BURN, mealForNow } from '../plan.js';
import {
  dayIntake, dayBalance, strengthStatus, cardioStatus, completeWorkout, projection, hasFood, weightEntries, avgInWindow,
  suggestBaseKcal, suppSchedule, isScheduled, isDue, nextDue, suppStreak, scheduleLabel,
} from '../calc.js';
import { ring, meter, toast, backupNow } from '../ui.js';
import { foodRecommendations } from '../food-recommendations.js';
import { openAddFood, portionRecommendations, wireFoodRecommendations } from './food.js';

export function render(root, ctx) {
  const { state } = ctx;
  const date = ctx.ui.date;
  const day = getDay(state, date);
  const t = state.targets;
  const intake = dayIntake(day, state.supplements);
  const recommendations = foodRecommendations(state, date);
  const bal = dayBalance(state, date);
  const isToday = date === todayISO();

  // ----- Calories & macros -----
  const caloriesCard = `
    <section class="card calories-card" aria-labelledby="h-cal">
      <div class="card-head"><h2 id="h-cal">Calories in</h2>
        <div class="row"><a class="btn btn-sm" href="#/food/log">Food log</a><button class="btn btn-sm btn-primary" data-quickadd>+ Add food</button></div></div>
      <div class="ring-wrap">
        ${ring(intake.total.kcal, t.kcal)}
        <dl class="kv grow">
          <dt>Food</dt><dd>${fmt(intake.food.kcal)} kcal</dd>
          <dt>Supplements</dt><dd>${fmt(intake.supps.kcal)} kcal</dd>
          <dt>Target</dt><dd>${fmt(t.kcal)} kcal</dd>
          <dt>${intake.total.kcal <= t.kcal ? 'Remaining' : 'Over'}</dt><dd>${fmt(Math.abs(t.kcal - intake.total.kcal))} kcal</dd>
        </dl>
      </div>
      ${meter('m-protein', 'Protein', intake.total.protein, t.protein)}
      ${meter('m-carbs', 'Carbs', intake.total.carbs, t.carbs)}
      ${meter('m-fat', 'Fat', intake.total.fat, t.fat)}
      ${portionRecommendations(recommendations, state, { compact: true, hasIntake: hasFood(day) || intake.total.kcal > 0 })}
      <p class="small" style="margin-top:12px"><a href="#/settings/targets">Review diet &amp; daily target recommendations</a></p>
    </section>`;

  // ----- Energy balance -----
  const p = projection(state, date);
  const s = strengthStatus(day);
  const c = cardioStatus(day);
  const burnParts = [`${fmt(bal.burn.base)} everyday`];
  if (bal.burn.strength > 0) burnParts.push(`${fmt(bal.burn.strength)} lifting (${s.done}/${s.total})`);
  if (bal.burn.cardio > 0) burnParts.push(`${fmt(bal.burn.cardio)} jog (${fmt(c.minutes)} min)`);
  let paceLine;
  if (p.status === 'nodata') paceLine = 'Log food for a few days to see your weekly pace.';
  else {
    paceLine = `Last ${p.daysUsed} logged day${p.daysUsed > 1 ? 's' : ''}: <b>${fmtSigned(p.kgPerWeek, 2)} kg/week</b>`;
    if (p.status === 'on-track') paceLine += ` · ${fmt(p.goalWeight, 1)} kg around <b>${esc(fmtLongDate(p.goalDate))}</b>`;
    else if (p.status === 'away') paceLine += ` · not moving toward ${fmt(p.goalWeight, 1)} kg at this rate`;
    else if (p.status === 'reached') paceLine += ' · goal weight reached';
  }
  const balanceCard = `
    <section class="card" aria-labelledby="h-bal">
      <div class="card-head"><h2 id="h-bal">Expected weight change</h2><a class="btn btn-sm" href="#/progress">Details</a></div>
      ${hasFood(day) ? `
        <div class="row between">
          <div><div class="hero num">${fmtSigned(bal.kg * 1000, 0)} g</div>
            <div class="muted small">${isToday ? 'today' : 'this day'}, if logging is complete</div></div>
          <dl class="kv">
            <dt>Eaten</dt><dd>${fmt(bal.intake.total.kcal)}</dd>
            <dt>Burned (est.)</dt><dd>${fmt(bal.burn.total)}</dd>
            <dt>Balance</dt><dd>${fmtSigned(bal.net)} kcal</dd>
          </dl>
        </div>
        <p class="muted small">Burn = ${burnParts.join(' + ')} kcal. Tick workouts done to count them.</p>`
      : `<p class="muted">No food logged for this day yet. Expected change is shown once you log what you eat.</p>`}
      <hr class="divider">
      <p class="small">${paceLine}</p>
    </section>`;

  // ----- Supplements (follow each one's schedule) -----
  const rank = (sup) => (!isScheduled(sup) ? 2 : isDue(sup, date) ? 0 : 1);
  const supps = state.supplements.map((sup, i) => ({ sup, i })).sort((a, b) => rank(a.sup) - rank(b.sup) || a.i - b.i).map((x) => x.sup);
  const dueToday = supps.filter((sup) => rank(sup) === 0);
  const dueTaken = dueToday.filter((sup) => day?.supps?.[sup.id]).length;
  const suppRows = supps.map((sup) => {
    const on = !!day?.supps?.[sup.id];
    const r = rank(sup);
    const sched = suppSchedule(sup);
    let right;
    if (r === 2) right = '<span class="badge neutral">as needed</span>';
    else if (r === 0) {
      const st = suppStreak(state, sup, date);
      right = `<span class="status ${st > 0 ? 'good' : ''}" title="Scheduled doses in a row">${sched.type === 'daily' ? `${st}-day streak` : `${st} in a row`}</span>`;
    } else {
      const nd = nextDue(sup, date);
      const gap = nd ? diffDays(date, nd) : null;
      const when = gap === 1 ? 'tomorrow' : gap !== null && gap <= 6 ? fmtDate(nd, { weekday: 'short' }) : nd ? fmtDate(nd, { month: 'short', day: 'numeric' }) : '';
      right = `<span class="badge neutral">${nd ? `next ${esc(when)}` : 'not due'}</span>`;
    }
    const extra = Number(sup.kcal) > 0 ? ` · +${fmt(sup.kcal)} kcal, ${fmt(sup.protein)} g protein` : '';
    const when = sched.type === 'daily' || sched.type === 'asneeded' ? '' : ` · ${esc(scheduleLabel(sup))}`;
    return `<li><label class="check ${r === 1 && !on ? 'notdue' : ''}">
      <input type="checkbox" data-supp="${esc(sup.id)}" ${on ? 'checked' : ''}>
      <span class="grow"><span class="title">${esc(sup.name)}</span><br><span class="meta">${esc(sup.dose || '')}${when}${extra}</span></span>
      ${right}
    </label></li>`;
  }).join('');
  const suppCard = `
    <section class="card" aria-labelledby="h-supp">
      <div class="card-head"><div><h2 id="h-supp">Supplements</h2>${dueToday.length ? `<div class="sub">${dueTaken} of ${dueToday.length} due ${isToday ? 'today' : 'this day'} taken</div>` : ''}</div>
        <a class="btn btn-sm" href="#/progress">History</a></div>
      <ul class="list">${suppRows || '<li class="empty">No supplements set up – add them in Settings.</li>'}</ul>
    </section>`;

  // ----- Workout -----
  const plan = planDayById(day?.workout?.planDayId) || planDayForDate(date);
  let wStatus;
  if (plan.type === 'strength') {
    const done = day?.workout?.planDayId === plan.id ? s.done : 0;
    wStatus = done === plan.exercises.length
      ? '<span class="status good">Workout done</span>'
      : done > 0 ? `<span class="status warning">${done} of ${plan.exercises.length} exercises done</span>`
        : '<span class="status">Not started</span>';
  } else if (plan.type === 'cardio') {
    wStatus = c.done ? `<span class="status good">Jog done · ${fmt(c.minutes)} min</span>` : '<span class="status">Not done yet</span>';
  } else {
    wStatus = c.done ? `<span class="status good">Easy jog · ${fmt(c.minutes)} min</span>` : '<span class="status">Rest day</span>';
  }
  const workoutCard = `
    <section class="card" aria-labelledby="h-work">
      <div class="card-head"><h2 id="h-work">Workout</h2><div class="row wrap"><a class="btn btn-sm" href="#/workout/today">Open</a>
        ${['strength', 'cardio'].includes(plan.type) ? `<button class="btn btn-sm btn-primary" type="button" data-workout-all ${plan.type === 'strength' ? s.done === plan.exercises.length ? 'disabled' : '' : c.done ? 'disabled' : ''}>All done</button>` : ''}</div></div>
      <div class="row between"><div><div class="strong">${esc(plan.short)} · ${esc(plan.title)}</div><div class="muted small">${esc(plan.focus)}</div></div></div>
      <div style="margin-top:8px">${wStatus}</div>
    </section>`;

  // ----- Body -----
  const entries = weightEntries(state);
  const avg7 = avgInWindow(entries, date);
  const bodyCard = `
    <section class="card" aria-labelledby="h-body">
      <div class="card-head"><h2 id="h-body">Body</h2><span class="sub">Morning, after the bathroom</span></div>
      <div class="grid2">
        <label class="field"><span>Weight (kg)</span><input class="input num" name="weightKg" inputmode="decimal" placeholder="e.g. 72.6" value="${day?.weightKg ?? ''}"></label>
        <label class="field"><span>Waist (cm)</span><input class="input num" name="waistCm" inputmode="decimal" placeholder="weekly" value="${day?.waistCm ?? ''}"></label>
      </div>
      <p class="muted small" style="margin-top:8px">7-day average: <b>${avg7 ? fmt(avg7, 1) + ' kg' : '–'}</b> · Compare weekly averages, not single readings.${Number(state.profile.waistGoalCm) > 0 ? ` Waist goal: under ${fmt(state.profile.waistGoalCm, 1)} cm.` : ''}</p>
    </section>`;

  const dayCount = Object.keys(state.days).length;
  const lastBackup = getLastBackup();
  const backupAge = lastBackup ? diffDays(lastBackup.slice(0, 10), todayISO()) : null;
  const backupCard = isToday && dayCount >= 7 && (backupAge === null || backupAge > 30) ? `
    <section class="alert info" style="align-items:center"><span class="ico" aria-hidden="true">i</span>
      <div class="grow">${backupAge === null ? 'You haven’t backed up yet.' : `Last backup was ${backupAge} days ago.`} Your logs are stored only on this device.</div>
      <button class="btn btn-sm" data-backup>Back up</button></section>` : '';

  const needsSetup = !profileComplete(state.profile);
  const migration = needsSetup && ctx.native ? '<section class="card"><h2>Already use the web planner?</h2><p class="small">Move your saved logs and settings with a backup.</p><a class="btn btn-sm" href="#/settings/backup">Import your backup</a></section>' : '';
  root.innerHTML = migration + (needsSetup ? setupCard(state.profile) : '') + caloriesCard + balanceCard + suppCard + workoutCard + bodyCard + backupCard;
  if (needsSetup) wireSetup(root, ctx);
  root.querySelector('[data-quickadd]').addEventListener('click', () => openAddFood(ctx, { meal: mealForNow(), date }));
  root.querySelector('[data-workout-all]')?.addEventListener('click', () => {
    const record = getDay(state, date, true);
    const previous = structuredClone(record.workout || {});
    record.workout = completeWorkout(record.workout, plan);
    ctx.save();
    ctx.render();
    toast(plan.type === 'cardio' ? `Jog marked done · ${fmt(record.workout.cardio.minutes)} min` : 'All exercises marked done', {
      action: 'Undo',
      onAction() {
        const current = getDay(state, date)?.workout;
        if (!current || current.planDayId !== plan.id) return;
        if (plan.type === 'strength') {
          for (const exercise of plan.exercises) if (current.exercises?.[exercise.id]) current.exercises[exercise.id].done = !!previous.exercises?.[exercise.id]?.done;
        } else current.cardio.done = !!previous.cardio?.done;
        ctx.save();
        ctx.render();
      },
    });
  });
  wireFoodRecommendations(root, ctx, recommendations, date);
  root.querySelector('[data-backup]')?.addEventListener('click', async () => { if (await backupNow(state)) ctx.render(); });

  root.querySelectorAll('[data-supp]').forEach((cb) => cb.addEventListener('change', () => {
    const d = getDay(state, date, true);
    if (cb.checked) d.supps[cb.dataset.supp] = true;
    else delete d.supps[cb.dataset.supp];
    ctx.save();
    ctx.render();
  }));
  root.querySelectorAll('input[name="weightKg"], input[name="waistCm"]').forEach((inp) => inp.addEventListener('change', () => {
    const v = numOrNull(inp.value);
    const [lo, hi] = inp.name === 'weightKg' ? [20, 400] : [30, 300];
    if (v !== null && (v < lo || v > hi)) { toast(`Please enter a number between ${lo} and ${hi}`); inp.value = day?.[inp.name] ?? ''; return; }
    const d = getDay(state, date, true);
    if (v === null) delete d[inp.name];
    else d[inp.name] = v;
    ctx.save();
    toast(inp.name === 'weightKg' ? 'Weight saved' : 'Waist saved');
    ctx.render();
  }));
}

// ----- First-run setup: personal stats live only on this device -----
function setupCard(p) {
  const v = (x) => (x ?? '') === '' || x === null ? '' : esc(String(x));
  return `
    <section class="card" aria-labelledby="h-setup" data-setup>
      <div class="card-head"><div><h2 id="h-setup">Enter your stats</h2>
        <div class="sub">Used for calorie burn and your goal date · saved only on this device</div></div></div>
      <div class="grid2">
        <label class="field"><span>Age</span><input class="input num" name="age" inputmode="numeric" value="${v(p.age)}"></label>
        <label class="field"><span>Sex</span><select class="input" name="sex">
          <option value="" ${!p.sex ? 'selected' : ''}>Choose…</option>
          <option value="male" ${p.sex === 'male' ? 'selected' : ''}>Male</option>
          <option value="female" ${p.sex === 'female' ? 'selected' : ''}>Female</option></select></label>
        <label class="field"><span>Height (cm)</span><input class="input num" name="heightCm" inputmode="decimal" value="${v(p.heightCm)}"></label>
        <label class="field"><span>Current weight (kg)</span><input class="input num" name="startWeightKg" inputmode="decimal" value="${v(p.startWeightKg)}"></label>
        <label class="field"><span>Goal weight (kg)</span><input class="input num" name="goalWeightKg" inputmode="decimal" value="${v(p.goalWeightKg)}"></label>
        <label class="field"><span>Waist (cm) · optional</span><input class="input num" name="startWaistCm" inputmode="decimal" value="${v(p.startWaistCm)}"></label>
        <label class="field"><span>Waist goal (cm) · optional</span><input class="input num" name="waistGoalCm" inputmode="decimal" value="${v(p.waistGoalCm)}" placeholder="½ of height"></label>
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:12px" data-setup-save>Save my stats</button>
      <p class="muted tiny" style="margin-top:8px">Daily targets start at the plan’s 1,900 kcal. After saving, open Settings → Daily targets to review suggestions based on your profile.</p>
    </section>`;
}

const RANGES = {
  age: [10, 100, 'Age'],
  heightCm: [100, 250, 'Height'],
  startWeightKg: [25, 400, 'Current weight'],
  goalWeightKg: [25, 400, 'Goal weight'],
  startWaistCm: [30, 300, 'Waist', true],
  waistGoalCm: [30, 300, 'Waist goal', true],
};

function wireSetup(root, ctx) {
  const card = root.querySelector('[data-setup]');
  card.querySelector('[data-setup-save]').addEventListener('click', () => {
    const { state } = ctx;
    const sex = card.querySelector('[name=sex]').value;
    if (!sex) { toast('Choose male or female'); return; }
    const values = {};
    for (const [key, [lo, hi, label, optional]] of Object.entries(RANGES)) {
      const n = numOrNull(card.querySelector(`[name=${key}]`).value);
      if (n === null) {
        if (optional) { values[key] = null; continue; }
        toast(`Enter your ${label.toLowerCase()}`);
        return;
      }
      if (n < lo || n > hi) { toast(`${label} should be between ${lo} and ${hi}`); return; }
      values[key] = n;
    }
    if (values.waistGoalCm === null) values.waistGoalCm = Math.round(values.heightCm / 2 * 10) / 10;
    Object.assign(state.profile, values, { sex });
    // Personalise the everyday burn unless it was already changed by hand.
    if (values.age >= 18 && state.profile.nutritionContext !== 'special' && Number(state.burn.baseKcal) === DEFAULT_BURN.baseKcal) state.burn.baseKcal = suggestBaseKcal(state.profile, values.startWeightKg);
    // Use today's numbers as the first weigh-in so the chart has a starting point.
    const today = getDay(state, todayISO(), true);
    if (!today.weightKg) today.weightKg = values.startWeightKg;
    if (!today.waistCm && values.startWaistCm) today.waistCm = values.startWaistCm;
    ctx.save();
    toast('Stats saved. Review your daily target recommendations in Settings.');
    ctx.render();
  });
}
