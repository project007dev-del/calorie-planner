// Workout screen: today's session (checkboxes + kg × reps) and history.
import { esc, fmt, fmtUpTo, fmtDate, fmtLongDate, num, numOrNull, addDays, todayISO, weekStart, isValidISO, parseISO } from '../util.js';
import { getDay } from '../store.js';
import { JOG_STAGES, TRAINING_NOTES, allExercises } from '../plan.js';
import { workoutForDate, loggedWorkoutPlan, sessionOptions, scheduledWeek, scheduledWorkout } from '../workout-plans.js';
import { muscleVisual, muscleFocus, workoutIcon } from '../workout-visuals.js';
import { renderWorkoutPlan } from './workout-plan.js';
import {
  strengthStatus, cardioStatus, dayBurn, weightOn, lastExerciseLog, progressionHint, workoutSessions,
  weekSummary, weeklyStreak, exerciseHistory,
} from '../calc.js';
import { subtabs, toast } from '../ui.js';
import { timeChart } from '../chart.js';

const TABS = [
  ['today', 'Session', '#/workout/today'],
  ['plan', 'Plan', '#/workout/plan'],
  ['history', 'History', '#/workout/history'],
];
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function render(root, ctx, params) {
  const tab = params[0] || 'today';
  if (tab === 'history' && params[1] && isValidISO(params[1])) return renderSession(root, ctx, params[1]);
  if (tab === 'history') return renderHistory(root, ctx);
  if (tab === 'exercise' && params[1]) return renderExercise(root, ctx, params[1]);
  if (tab === 'plan') return renderWorkoutPlan(root, ctx, TABS);
  return renderToday(root, ctx);
}

const setsText = (e) => `${e.setsMin === e.setsMax ? e.setsMin : `${e.setsMin}–${e.setsMax}`} × ${e.repsMin}–${e.repsMax}${e.unit === 's' ? ' s' : ''}${e.perSide ? ` / ${e.perSide}` : ''}`;
const setStr = (s, ex) => (ex?.noWeight || !num(s.kg) ? `${fmt(s.reps)}${ex?.unit === 's' ? ' s' : ' reps'}` : `${fmtUpTo(s.kg, 2)} kg × ${fmt(s.reps)}`);

function ensureWorkout(state, date, plan) {
  const d = getDay(state, date, true);
  if (!d.workout) d.workout = { planDayId: plan.id, exercises: {}, cardio: { done: false, minutes: plan.type === 'cardio' ? plan.minutes ?? 30 : 30 }, notes: '' };
  if (!d.workout.planSnapshot || d.workout.planDayId !== plan.id) d.workout.planSnapshot = structuredClone(plan);
  d.workout.planDayId = plan.id;
  if (!d.workout.exercises) d.workout.exercises = {};
  if (!d.workout.cardio) d.workout.cardio = { done: false, minutes: 30 };
  return d.workout;
}

// =====================================================================
// TODAY / SESSION
// =====================================================================
function renderToday(root, ctx) {
  const { state } = ctx;
  const date = ctx.ui.date;
  const day = getDay(state, date);
  const plan = workoutForDate(state, date);
  const w = day?.workout?.planDayId === plan.id ? day.workout : null;
  const exLogs = w?.exercises || {};
  const cardio = day?.workout?.cardio || { done: false, minutes: plan.type === 'cardio' ? plan.minutes ?? 30 : 30 };
  const wd = parseISO(date).getDay();

  const available = sessionOptions(state, date);
  const scheduledId = scheduledWorkout(state, date).id;
  const options = available.map((d) => `<option value="${d.id}" ${d.id === plan.id ? 'selected' : ''}>${esc(d.short)} · ${esc(d.title)}${d.id === plan.id && d.id !== scheduledId ? ' (saved session)' : d.weekday === wd ? (date === todayISO() ? ' (today’s plan)' : ' (planned for this day)') : ''}</option>`).join('');

  const exercises = plan.exercises.map((e, i) => {
    const log = exLogs[e.id] || {};
    const last = lastExerciseLog(state, e.id, date);
    const hint = progressionHint(e, last);
    const lastKg = last?.sets?.[0]?.kg;
    const rows = Array.from({ length: e.setsMax }, (_, k) => {
      const s = log.sets?.[k] || {};
      const optional = k >= e.setsMin;
      return `<span class="n">Set ${k + 1}${optional ? '<span class="muted tiny"> opt.</span>' : ''}</span>
        ${e.noWeight ? '' : `<input class="input sm num" data-set="${k}" data-f="kg" inputmode="decimal" placeholder="${lastKg ? fmtUpTo(lastKg, 2) : 'kg'}" value="${esc(s.kg ?? '')}" aria-label="Set ${k + 1} weight in kg">`}
        <input class="input sm num" data-set="${k}" data-f="reps" inputmode="numeric" placeholder="${e.repsMin}–${e.repsMax}" value="${esc(s.reps ?? '')}" aria-label="Set ${k + 1} ${e.unit === 's' ? 'seconds' : 'reps'}">`;
    }).join('');
    return `<div class="ex ${log.done ? 'done' : ''}" data-ex="${e.id}">
      <div class="ex-head">
        <input type="checkbox" data-done ${log.done ? 'checked' : ''} aria-label="${esc(e.name)} done">
        <span class="session-muscle">${muscleVisual(e.id, e.name)}</span>
        <div class="grow"><div class="ex-name">${i + 1}. ${esc(e.name)}</div>
          <div class="ex-target">${setsText(e)} · rest ${esc(e.rest)}</div></div>
        <a class="btn btn-sm" href="#/workout/exercise/${e.id}" aria-label="${esc(e.name)} history">History</a>
      </div>
      ${last ? `<div class="row between wrap" style="margin-top:6px"><span class="small muted grow">Last time (${esc(fmtDate(last.date))}): ${last.sets.map((s) => setStr(s, e)).join(' · ')}</span><button type="button" class="btn btn-sm" data-samelast>Same as last time</button></div>` : ''}
      ${hint ? `<div class="hint ${hint.type === 'up' ? 'up' : ''}">${hint.type === 'up' ? '<span class="status good">Progress</span> ' : ''}${esc(hint.text)}</div>` : ''}
      <div class="sets" style="${e.noWeight ? 'grid-template-columns:52px 1fr' : ''}">
        <span class="h"></span>${e.noWeight ? '' : '<span class="h">kg</span>'}<span class="h">${e.unit === 's' ? 'seconds' : 'reps'}</span>
        ${rows}
      </div>
      ${e.swap ? `<div class="small muted" style="margin-top:6px">Swap: ${esc(e.swap)}</div>` : ''}
      <details class="tip"><summary>How to do it</summary>${esc(e.tip || '')}</details>
    </div>`;
  }).join('');

  const isCardioDay = plan.type !== 'strength';
  const cardioCard = `
    <section class="card" data-cardio>
      <div class="card-head"><div><h2>${isCardioDay ? 'Easy jog / walk' : 'Extra cardio (optional)'}</h2>
        <div class="sub">${isCardioDay ? 'Conversational pace – you can talk in full sentences' : 'e.g. an easy jog after an upper-body day'}</div></div></div>
      <label class="check"><input type="checkbox" data-cardio-done ${cardio.done ? 'checked' : ''}>
        <span class="grow"><span class="title">Done</span></span>
        <span class="row"><input class="input sm num" style="width:80px" data-cardio-min inputmode="numeric" value="${esc(cardio.minutes ?? 30)}" aria-label="Minutes"> <span class="muted small">min</span></span>
      </label>
      ${isCardioDay ? `<ul class="list">${JOG_STAGES.map((s) => `<li class="small" style="padding:8px 0"><b>${esc(s.name)}</b><br><span class="muted">${esc(s.text)}</span></li>`).join('')}</ul>` : ''}
    </section>`;

  root.innerHTML = `
    ${subtabs(TABS, 'today')}
    <section class="card session-hero">
      <div class="card-head"><div class="row"><span class="day-type-icon ${plan.type}">${workoutIcon(plan.type)}</span><div><div class="eyebrow">YOUR SESSION</div><h2>${esc(plan.title)}</h2></div></div><a class="btn btn-sm" href="#/workout/plan">Update plan</a></div>
      <label class="field"><span>Workout</span><select class="input" data-plan>${options}</select></label>
      <p class="small muted" style="margin-top:10px">${esc(plan.focus)}</p>
      <p class="small" style="margin-top:8px" data-progress></p>
      ${plan.type === 'strength' ? `<details class="tip"><summary>Warm-up &amp; effort</summary><p>${esc(TRAINING_NOTES.warmup)}</p><p>${esc(TRAINING_NOTES.effort)}</p></details>` : ''}
    </section>
    ${plan.type === 'strength' ? `<section class="card" aria-label="Exercises">${exercises}</section>` : `<section class="card"><p>${plan.type === 'rest' ? 'Rest day. Keep at least one day each week fully restful or very light. An easy jog is fine if your legs feel fresh.' : 'Easy cardio day – 20–40 minutes. Avoid hard jogging right before heavy leg days.'}</p></section>`}
    ${cardioCard}
    <section class="card">
      <label class="field"><span>Notes</span><textarea class="input" data-notes placeholder="How did it feel? Any pain, swaps, PRs…">${esc(day?.workout?.notes || '')}</textarea></label>
    </section>`;

  const progressEl = root.querySelector('[data-progress]');
  const refreshProgress = () => {
    const d = getDay(state, date);
    const s = strengthStatus(d);
    const b = dayBurn(d, state.burn, weightOn(state, date));
    const extra = b.strength + b.cardio;
    if (plan.type === 'strength') {
      const done = d?.workout?.planDayId === plan.id ? s.done : 0;
      progressEl.innerHTML = `<span class="status ${done === plan.exercises.length ? 'good' : done ? 'warning' : ''}">${done} of ${plan.exercises.length} exercises done</span> · ≈ ${fmt(extra)} kcal extra burn`;
    } else {
      progressEl.innerHTML = cardioStatus(d).done ? `<span class="status good">Done</span> · ≈ ${fmt(extra)} kcal extra burn` : '<span class="status">Not done yet</span>';
    }
  };
  refreshProgress();

  root.querySelector('[data-plan]').addEventListener('change', (e) => {
    const selected = available.find((d) => d.id === e.target.value);
    if (!selected) return;
    ensureWorkout(state, date, selected);
    ctx.save();
    ctx.render();
  });

  root.querySelectorAll('[data-ex]').forEach((card) => {
    const exId = card.dataset.ex;
    const ex = plan.exercises.find((x) => x.id === exId);
    const getLog = () => {
      const wk = ensureWorkout(state, date, plan);
      wk.planDayId = plan.id;
      return (wk.exercises[exId] ||= { done: false, sets: [] });
    };
    const doneBox = card.querySelector('[data-done]');
    doneBox.addEventListener('change', () => {
      getLog().done = doneBox.checked;
      card.classList.toggle('done', doneBox.checked);
      ctx.save();
      refreshProgress();
      if (doneBox.checked) toast(`${ex.name} ✓`);
    });
    card.querySelector('[data-samelast]')?.addEventListener('click', () => {
      const last = lastExerciseLog(state, exId, date);
      if (!last) return;
      const log = getLog();
      last.sets.slice(0, ex.setsMax).forEach((ls, k) => {
        while (log.sets.length <= k) log.sets.push({ kg: '', reps: '' });
        const row = log.sets[k];
        if (!ex.noWeight && !row.kg && ls.kg) row.kg = String(ls.kg);
        if (!row.reps) row.reps = String(ls.reps);
        const kgIn = card.querySelector(`[data-set="${k}"][data-f="kg"]`);
        const repsIn = card.querySelector(`[data-set="${k}"][data-f="reps"]`);
        if (kgIn) kgIn.value = row.kg;
        if (repsIn) repsIn.value = row.reps;
      });
      ctx.save();
      toast('Filled in from last time – change anything that differs');
    });
    card.querySelectorAll('[data-set]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const log = getLog();
        const k = Number(inp.dataset.set);
        while (log.sets.length <= k) log.sets.push({ kg: '', reps: '' });
        log.sets[k][inp.dataset.f] = inp.value.trim();
        ctx.save();
      });
      inp.addEventListener('change', () => {
        // Auto-tick the exercise once the required sets have reps.
        const log = getLog();
        const filled = log.sets.filter((s) => num(s.reps) > 0).length;
        if (!log.done && filled >= ex.setsMin) {
          log.done = true;
          doneBox.checked = true;
          card.classList.add('done');
          ctx.save();
          toast(`${ex.name} ✓`);
        }
        refreshProgress();
      });
    });
  });

  const cDone = root.querySelector('[data-cardio-done]');
  const cMin = root.querySelector('[data-cardio-min]');
  const saveCardio = () => {
    const wk = ensureWorkout(state, date, plan);
    const m = numOrNull(cMin.value);
    wk.cardio = { done: cDone.checked, minutes: m === null ? 30 : Math.max(0, Math.min(300, m)) };
    cMin.value = wk.cardio.minutes;
    ctx.save();
    refreshProgress();
  };
  cDone.addEventListener('change', saveCardio);
  cMin.addEventListener('change', saveCardio);

  const notes = root.querySelector('[data-notes]');
  notes.addEventListener('change', () => {
    const wk = ensureWorkout(state, date, plan);
    wk.notes = notes.value.trim();
    ctx.save();
    toast('Notes saved');
  });
}

// =====================================================================
// HISTORY
// =====================================================================
function renderHistory(root, ctx) {
  const { state } = ctx;
  const today = todayISO();
  const week = weekSummary(state, today);
  const wStreak = weeklyStreak(state, today);
  const schedule = scheduledWeek(state, today);
  const strengthGoal = schedule.filter((d) => d.type === 'strength').length;
  const cardioGoal = schedule.filter((d) => d.type === 'cardio').length;
  const sessions = workoutSessions(state);

  const weekStrip = week.days.map((d) => `
    <a class="d ${d.date === today ? 'today' : ''}" href="#/workout/history/${d.date}" style="text-decoration:none;color:inherit">
      ${WEEKDAY[parseISO(d.date).getDay()]}<b>${parseISO(d.date).getDate()}</b>
      <span class="marks">${d.strength ? '<i class="mk-work" title="Lifting"></i>' : ''}${d.cardio ? '<i class="mk-food" title="Jog"></i>' : ''}</span>
    </a>`).join('');

  // 5-week calendar (Mon-first)
  const start = addDays(weekStart(today), -28);
  const cal = Array.from({ length: 35 }, (_, i) => {
    const d = addDays(start, i);
    const s = strengthStatus(state.days[d]);
    const c = cardioStatus(state.days[d]);
    const future = d > today;
    return `<button ${future ? 'disabled' : ''} class="${d === today ? 'today' : ''} ${future ? 'future' : ''}" data-day="${d}" aria-label="${esc(fmtLongDate(d))}${s.done ? ', lifting' : ''}${c.done ? ', jog' : ''}">
      ${parseISO(d).getDate()}<span class="marks">${s.done ? '<i class="mk-work"></i>' : ''}${c.done ? '<i class="mk-food"></i>' : ''}</span></button>`;
  }).join('');

  const exRows = allExercises().map((e) => {
    const h = exerciseHistory(state, e.id);
    const last = h.find((r) => r.sets.length);
    return `<li><a class="item" href="#/workout/exercise/${e.id}">
      <span class="grow"><span class="title">${esc(e.name)}</span><br><span class="meta">${h.length ? `${h.length} session${h.length > 1 ? 's' : ''}` : 'No sets logged yet'}</span></span>
      <span class="val small">${last?.best ? esc(setStr(last.best, e)) : ''}</span><span class="muted">›</span></a></li>`;
  }).join('');

  const sessionRows = sessions.slice(0, 120).map((s) => {
    const pct = s.total ? Math.round(s.frac * 100) : null;
    const title = s.plan ? `${s.plan.short} · ${s.plan.title}` : 'Workout';
    const cls = s.total && s.done === s.total ? 'good' : s.done ? 'warning' : '';
    return `<li><a class="item" href="#/workout/history/${s.date}">
      <span class="grow"><span class="title">${esc(fmtLongDate(s.date))}</span><br>
        <span class="meta">${esc(title)}${s.cardio.done ? ` · jog ${fmt(s.cardio.minutes)} min` : ''}</span></span>
      <span class="val">${s.total ? `<span class="status ${cls}">${s.done}/${s.total} · ${pct}%</span><br><span class="muted tiny">${s.sets} sets</span>` : '<span class="status good">Cardio</span>'}</span>
    </a></li>`;
  }).join('');

  root.innerHTML = `
    ${subtabs(TABS, 'history')}
    <section class="card">
      <div class="card-head"><div><h2>This week</h2><div class="sub">${esc(fmtDate(week.start))} – ${esc(fmtDate(addDays(week.start, 6)))}</div></div></div>
      <div class="grid3">
        <div class="stat"><div class="label">Strength days</div><div class="value num">${week.strength}<small> / ${strengthGoal}</small></div></div>
        <div class="stat"><div class="label">Cardio days</div><div class="value num">${week.cardio}<small> / ${cardioGoal}</small></div></div>
        <div class="stat"><div class="label">Weekly goal streak</div><div class="value num">${wStreak}<small> weeks</small></div></div>
      </div>
      <div class="week" style="margin-top:10px">${weekStrip}</div>
      <div class="legend"><span><i class="mk-work"></i>Lifting</span><span><i class="mk-food"></i>Jog / walk</span></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Last 5 weeks</h2></div>
      <div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<div class="h">${d}</div>`).join('')}${cal}</div>
      <div class="legend"><span><i class="mk-work"></i>Lifting</span><span><i class="mk-food"></i>Jog / walk</span></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Sessions</h2><span class="sub">${sessions.length} logged</span></div>
      ${sessionRows ? `<ul class="list">${sessionRows}</ul>` : '<div class="empty">No workouts logged yet. Open <b>Session</b>, tick exercises and enter kg × reps.</div>'}
    </section>
    <section class="card">
      <div class="card-head"><div><h2>Exercise progress</h2><div class="sub">Best set last time · tap for history &amp; chart</div></div></div>
      <ul class="list">${exRows}</ul>
    </section>`;

  root.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => ctx.go(`#/workout/history/${b.dataset.day}`)));
}

function renderSession(root, ctx, date) {
  const { state } = ctx;
  const day = getDay(state, date);
  const s = strengthStatus(day);
  const c = cardioStatus(day);
  const burn = dayBurn(day, state.burn, weightOn(state, date));
  const plan = loggedWorkoutPlan(day);

  const exList = plan?.type === 'strength' ? plan.exercises.map((e) => {
    const log = day.workout.exercises?.[e.id];
    const sets = (log?.sets || []).filter((x) => num(x.reps) > 0);
    return `<tr><td><span class="status ${log?.done ? 'good' : ''}">${log?.done ? 'Done' : 'Skipped'}</span><br><a href="#/workout/exercise/${e.id}">${esc(e.name)}</a></td>
      <td>${sets.length ? sets.map((x) => esc(setStr(x, e))).join('<br>') : '<span class="muted">–</span>'}</td></tr>`;
  }).join('') : '';

  root.innerHTML = `
    <a class="btn btn-sm" href="#/workout/history">‹ Workout history</a>
    <section class="card">
      <div class="card-head"><div><h2>${esc(fmtLongDate(date))}</h2><div class="sub">${plan ? `${esc(plan.short)} · ${esc(plan.title)}` : 'No workout logged'}</div></div>
        <button class="btn btn-sm btn-primary" data-edit>Edit</button></div>
      ${plan?.type === 'strength' ? `<div class="grid3">
        <div class="stat"><div class="label">Exercises</div><div class="value num">${s.done}<small> / ${s.total}</small></div></div>
        <div class="stat"><div class="label">Sets logged</div><div class="value num">${s.sets}</div></div>
        <div class="stat"><div class="label">Extra burn</div><div class="value num">${fmt(burn.strength + burn.cardio)}<small> kcal</small></div></div>
      </div>
      <table class="table" style="margin-top:10px"><thead><tr><th>Exercise</th><th>Sets</th></tr></thead><tbody>${exList}</tbody></table>` : ''}
      ${c.done ? `<p style="margin-top:10px"><span class="status good">Jog / walk</span> ${fmt(c.minutes)} min · ≈ ${fmt(burn.cardio)} kcal</p>` : ''}
      ${day?.workout?.notes ? `<h3 style="margin-top:12px">Notes</h3><p class="small">${esc(day.workout.notes)}</p>` : ''}
      ${!plan && !c.done ? '<div class="empty">Nothing logged on this day.</div>' : ''}
    </section>`;
  root.querySelector('[data-edit]').addEventListener('click', () => { ctx.setDate(date); ctx.go('#/workout/today'); });
}

function renderExercise(root, ctx, exId) {
  const { state } = ctx;
  const ex = allExercises().find((e) => e.id === exId);
  if (!ex) { root.innerHTML = '<div class="empty">Unknown exercise.</div>'; return; }
  const rows = exerciseHistory(state, exId);
  const withSets = rows.filter((r) => r.sets.length);
  const usesKg = !ex.noWeight && withSets.some((r) => r.topKg > 0);
  const points = withSets.map((r) => ({ date: r.date, y: usesKg ? r.topKg : r.best.reps })).reverse();
  const planned = scheduledWeek(state, ctx.ui.date).filter((d) => d.exercises.some((e) => e.id === exId));
  const best = withSets.reduce((b, r) => (!b || (usesKg ? r.topKg > b.topKg : r.best.reps > b.best.reps) ? r : b), null);

  root.innerHTML = `
    <a class="btn btn-sm" href="#/workout/history">‹ Workout history</a>
    <section class="card">
      <div class="card-head"><div class="row"><span class="exercise-detail-visual">${muscleVisual(ex.id, ex.name)}</span><div><h2>${esc(ex.name)}</h2><div class="sub">${esc(muscleFocus(ex.id))} · Exercise progress</div></div></div></div>
      ${planned.length ? `<details class="guidance"><summary>Targets in this week’s plan</summary>${planned.map((d) => `<p class="small">${esc(d.short)} · ${setsText(d.exercises.find((e) => e.id === exId))}</p>`).join('')}</details>` : ''}
      ${best ? `<div class="grid2">
          <div class="stat"><div class="label">Best set</div><div class="value num">${esc(setStr(best.best, ex))}</div></div>
          <div class="stat"><div class="label">Sessions</div><div class="value num">${rows.length}</div></div>
        </div>` : ''}
      ${points.length >= 2 ? `<h3 style="margin:14px 0 6px">${usesKg ? 'Heaviest set (kg) per session' : `Best set (${ex.unit === 's' ? 'seconds' : 'reps'}) per session`}</h3><div data-chart></div>` : points.length === 1 ? '<p class="muted small" style="margin-top:10px">Log one more session to see the chart.</p>' : ''}
    </section>
    <section class="card">
      <div class="card-head"><h2>Sessions</h2></div>
      ${rows.length ? `<table class="table"><thead><tr><th>Date</th><th>Sets</th><th class="r">Best</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td><a href="#/workout/history/${r.date}">${esc(fmtDate(r.date))}</a></td><td>${r.sets.length ? r.sets.map((x) => esc(setStr(x, ex))).join(' · ') : '<span class="muted">ticked, no sets</span>'}</td><td class="r">${r.best ? esc(setStr(r.best, ex)) : '–'}</td></tr>`).join('')}
      </tbody></table>` : '<div class="empty">No sessions yet.</div>'}
      <p class="muted tiny">Strength holding or rising while your waist goes down is a great sign.</p>
    </section>`;

  const chartEl = root.querySelector('[data-chart]');
  if (chartEl) {
    timeChart(chartEl, {
      series: [{ id: 'best', label: usesKg ? 'heaviest set' : 'best set', kind: 'line', points, endLabel: true }],
      unit: usesKg ? 'kg' : ex.unit === 's' ? 's' : 'reps',
      digits: usesKg ? 1 : 0,
      height: 200,
      ariaLabel: `${ex.name}: ${usesKg ? 'heaviest set in kg' : 'best set'} per session`,
    });
  }
}
