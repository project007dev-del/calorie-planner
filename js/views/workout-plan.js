import { esc, fmt, fmtLongDate, todayISO, parseISO } from '../util.js';
import { subtabs, toast } from '../ui.js';
import { WORKOUT_TEMPLATES, EXERCISES, WEEKDAYS, activeWorkoutPlan, createWorkoutPlan, recommendedTemplate } from '../workout-plans.js';
import { workoutIcon, muscleVisual, muscleFocus, weeklyVisual } from '../workout-visuals.js';

const clone = (p) => structuredClone(p);
const count = (days, type) => days.filter((d) => d.type === type).length;
const range = (e) => `${e.setsMin === e.setsMax ? e.setsMax : `${e.setsMin}–${e.setsMax}`} × ${e.repsMin}–${e.repsMax}${e.unit === 's' ? ' sec' : ' reps'}`;

export function renderWorkoutPlan(root, ctx, tabs) {
  const date = ctx.ui.date;
  const saved = activeWorkoutPlan(ctx.state, date);
  const days = saved?.days || WORKOUT_TEMPLATES[3].days;
  const recommended = recommendedTemplate(ctx.state, date);
  const upcoming = new Map((ctx.state.workoutPlans || []).filter((p) => p.effectiveFrom > date).map((p) => [p.effectiveFrom, p]));
  const future = [...upcoming.values()].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  let draft = null;
  root.innerHTML = `${subtabs(tabs, 'plan')}
    <section class="card routine-hero">
      <div class="eyebrow">YOUR TRAINING WEEK</div>
      <div class="card-head"><div><h2>${esc(saved?.name || '5-day gym split')}</h2><p class="sub">${count(days, 'strength')} lifting days · ${count(days, 'cardio')} cardio day${count(days, 'cardio') === 1 ? '' : 's'} · ${count(days, 'rest')} recovery day${count(days, 'rest') === 1 ? '' : 's'}</p></div><span class="routine-hero-icon">${workoutIcon('strength')}</span></div>
      ${weeklyVisual(days, { currentWeekday: parseISO(date).getDay() })}
      <details class="guidance"><summary>View all workouts in this plan</summary><div class="routine-workout-list">${days.map((d) => `<article><div class="row"><span class="day-type-icon ${d.type}">${workoutIcon(d.type)}</span><div><h3>${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.weekday]} · ${esc(d.title)}</h3><p class="tiny muted">${d.type === 'rest' ? 'Recovery day' : `${d.minutes ?? (d.type === 'strength' ? 60 : 30)} minutes`}</p></div></div>${d.type === 'strength' ? `<ol class="routine-exercise-list">${d.exercises.map((e) => `<li><span>${esc(e.name)}</span><span class="tiny muted num">${range(e)}</span></li>`).join('')}</ol>` : `<p class="small muted">${esc(d.focus)}</p>`}</article>`).join('')}</div></details>
      <div class="row wrap plan-actions"><button class="btn btn-primary" type="button" data-update-plan>Update plan</button><button class="btn" type="button" data-new-plan>+ New plan</button></div>
      <p class="tiny muted">${saved ? `Applies from ${esc(fmtLongDate(saved.effectiveFrom))}.` : 'Your original weekly routine.'} Saved workout logs keep the session details they were recorded with.</p>
      ${future.length ? `<details class="guidance"><summary>${future.length} upcoming plan update${future.length === 1 ? '' : 's'}</summary><ul class="list">${future.map((p) => `<li class="small plan-upcoming"><span>${esc(p.name)} · ${esc(fmtLongDate(p.effectiveFrom))}</span><button class="btn btn-sm" type="button" data-edit-revision="${esc(p.id)}">Edit</button></li>`).join('')}</ul></details>` : ''}
    </section>
    <section class="card plan-editor" data-plan-editor hidden></section>
    <section class="card">
      <div class="card-head"><div><div class="eyebrow">CHOOSE A STARTING POINT</div><h2>Recommended plans</h2></div></div>
      <p class="small muted">Preview a routine, then adjust its days, exercises and targets to fit your week.</p>
      <div class="plan-options">${WORKOUT_TEMPLATES.map((p) => `<article class="plan-option${p.id === recommended.id ? ' suggested' : ''}">
        <div class="row between wrap"><span class="badge neutral">${esc(p.tag)}</span>${p.id === recommended.id ? '<span class="badge good">Matches your planned days</span>' : ''}</div><h3>${esc(p.name)}</h3><p class="small muted">${esc(p.description)}</p>
        <div class="plan-mini-week" aria-label="${esc(p.name)} schedule">${WEEKDAYS.map(([d, label]) => { const s = p.days.find((x) => x.weekday === d); return `<span class="${s.type}" title="${label}: ${esc(s.title)}">${label.slice(0, 1)}${workoutIcon(s.type)}</span>`; }).join('')}</div>
        <button class="btn btn-sm" type="button" data-template="${p.id}">Preview &amp; customize</button>
      </article>`).join('')}</div>
      <details class="guidance"><summary>How to choose a routine</summary><p class="small">Start with a schedule you can keep. Include all major muscle groups at least twice weekly and build gradually. The 2-day option is a useful starting point; extra days depend on your experience and recovery. Walks and other everyday movement can help build toward your weekly activity goal.</p><p class="small">These editable routines are planner examples for general adult fitness. Use controlled form, keep 1–3 good reps in reserve and add load gradually. Stop an exercise if it causes pain.</p><a class="tiny" href="https://acsm.org/resistance-training-guidelines-update-2026/" target="_blank" rel="noopener noreferrer">ACSM: resistance training guidance</a></details>
    </section>
    <details class="card settings-panel exercise-library">
      <summary>All exercises <span>${EXERCISES.length} movements · Explore</span></summary><div class="settings-panel-body">
      <p class="small muted">Browse the full exercise library. Add movements to a day in the plan editor. Illustrations show muscle focus.</p>
      <label class="field"><span>Search exercises</span><input class="input" type="search" data-exercise-search placeholder="e.g. squat, back or core"></label>
      <p class="tiny muted" data-library-count aria-live="polite">${EXERCISES.length} exercises</p>
      <div class="exercise-grid">${EXERCISES.map((e) => `<article class="exercise-tile" data-library-exercise data-search="${esc(`${e.name} ${muscleFocus(e.id)}`.toLowerCase())}">${muscleVisual(e.id, e.name)}<div><span class="eyebrow">${muscleFocus(e.id)}</span><h3>${esc(e.name)}</h3><p class="tiny muted">${range(e)} · rest ${esc(e.rest)}</p><details class="tip"><summary>How to do it</summary><p>${esc(e.tip)}</p>${e.swap ? `<p>Alternative: ${esc(e.swap)}</p>` : ''}</details></div></article>`).join('')}</div>
      </div>
    </details>`;

  const editor = root.querySelector('[data-plan-editor]');
  function showDraft(source) {
    draft = clone(source);
    draft.effectiveFrom ||= date > todayISO() ? date : todayISO();
    editor.hidden = false;
    drawEditor();
    editor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    editor.querySelector('[data-plan-name]').focus({ preventScroll: true });
  }
  const preview = () => { editor.querySelector('[data-draft-visual]').innerHTML = weeklyVisual(draft.days, { draft: true }); };
  function drawEditor(openDay = null) {
    const opened = [...editor.querySelectorAll('details[open][data-day-editor]')].map((el) => Number(el.dataset.dayEditor));
    editor.innerHTML = `<div class="card-head"><div><div class="eyebrow">PLAN BUILDER</div><h2>Customize your week</h2></div><span class="badge neutral">Unsaved preview</span></div>
      <div class="grid2"><label class="field"><span>Plan name</span><input class="input" data-plan-name maxlength="80" value="${esc(draft.name)}"></label><label class="field"><span>Apply from</span><input class="input" type="date" data-plan-start value="${draft.effectiveFrom}"></label></div>
      <div data-draft-visual>${weeklyVisual(draft.days, { draft: true })}</div>
      <p class="small muted">Open a day to change its session, duration and exercise list.</p>
      <div class="plan-day-list">${WEEKDAYS.map(([weekday, label]) => {
        const d = draft.days.find((x) => x.weekday === weekday);
        return `<details class="plan-day" data-day-editor="${weekday}" ${opened.includes(weekday) || weekday === openDay ? 'open' : ''}>
          <summary><span class="day-type-icon ${d.type}">${workoutIcon(d.type)}</span><span class="grow"><b>${label}</b><span data-day-title>${esc(d.title)}</span></span><span class="tiny muted" data-day-count>${d.type === 'strength' ? `${d.exercises.length} exercises` : d.type === 'cardio' ? `${d.minutes} min` : 'Rest'}</span></summary>
          <div class="plan-day-body"><div class="grid2"><label class="field"><span>${label} session type</span><select class="input" data-day-type>${['strength', 'cardio', 'rest'].map((t) => `<option value="${t}" ${d.type === t ? 'selected' : ''}>${{strength:'Strength',cardio:'Easy cardio',rest:'Rest'}[t]}</option>`).join('')}</select></label><label class="field"><span>${label} session name</span><input class="input" data-day-field="title" maxlength="80" value="${esc(d.title)}"></label></div>
          ${d.type !== 'rest' ? `<label class="field duration-field"><span>${label} duration (min)</span><input class="input num" type="number" min="5" max="180" step="1" data-day-field="minutes" value="${d.minutes || (d.type === 'strength' ? 45 : 30)}"></label>` : '<p class="small muted">Give yourself time to recover. Gentle everyday movement is optional.</p>'}
          ${d.type === 'strength' ? `<div class="plan-exercises">${d.exercises.map((e, i) => `<fieldset class="plan-exercise" data-edit-exercise="${e.id}"><legend>${i + 1}. ${esc(e.name)}</legend><div class="plan-exercise-fields"><label class="field"><span>Sets</span><input class="input num" aria-label="${esc(e.name)} sets" type="number" min="1" max="8" data-ex-field="setsMax" value="${e.setsMax}"></label><label class="field"><span>Min ${e.unit === 's' ? 'sec' : 'reps'}</span><input class="input num" aria-label="${esc(e.name)} minimum ${e.unit === 's' ? 'seconds' : 'reps'}" type="number" min="1" max="${e.unit === 's' ? 300 : 100}" data-ex-field="repsMin" value="${e.repsMin}"></label><label class="field"><span>Max ${e.unit === 's' ? 'sec' : 'reps'}</span><input class="input num" aria-label="${esc(e.name)} maximum ${e.unit === 's' ? 'seconds' : 'reps'}" type="number" min="1" max="${e.unit === 's' ? 300 : 100}" data-ex-field="repsMax" value="${e.repsMax}"></label><button class="btn btn-sm btn-danger" type="button" data-remove-exercise="${e.id}" aria-label="Remove ${esc(e.name)}">Remove</button></div></fieldset>`).join('')}</div>
          <div class="add-exercise-row"><label class="field grow"><span>Add to ${label}</span><select class="input" data-add-choice><option value="">Choose an exercise…</option>${EXERCISES.filter((e) => !d.exercises.some((x) => x.id === e.id)).map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></label><button class="btn btn-sm" type="button" data-add-exercise>Add exercise</button></div>` : ''}
          </div></details>`;
      }).join('')}</div>
      <p class="small plan-feedback" role="status" data-plan-feedback></p>
      <div class="row wrap plan-actions"><button class="btn btn-primary" type="button" data-save-plan>Save plan</button><button class="btn" type="button" data-cancel-plan>Cancel</button></div>
      <p class="tiny muted">Applies to unlogged days from the chosen date. Existing logged sessions keep their exercises and targets. The new schedule also feeds daily target recommendations.</p>`;

    editor.querySelector('[data-plan-name]').addEventListener('input', (e) => { draft.name = e.target.value; });
    editor.querySelector('[data-plan-start]').addEventListener('input', (e) => { draft.effectiveFrom = e.target.value; });
    editor.querySelectorAll('[data-day-editor]').forEach((section) => {
      const weekday = Number(section.dataset.dayEditor);
      const d = draft.days.find((x) => x.weekday === weekday);
      section.querySelector('[data-day-type]').addEventListener('change', (event) => {
        d.type = event.target.value;
        d.title = { strength: 'Strength session', cardio: 'Easy jog / walk', rest: 'Rest / gentle movement' }[d.type];
        d.minutes = d.type === 'rest' ? 0 : d.type === 'strength' ? 45 : 30;
        drawEditor(weekday);
      });
      section.querySelectorAll('[data-day-field]').forEach((input) => input.addEventListener('input', () => {
        d[input.dataset.dayField] = input.dataset.dayField === 'minutes' ? Number(input.value) : input.value;
        section.querySelector('[data-day-title]').textContent = d.title;
        preview();
      }));
      section.querySelectorAll('[data-edit-exercise]').forEach((el) => {
        const exercise = d.exercises.find((e) => e.id === el.dataset.editExercise);
        el.querySelectorAll('[data-ex-field]').forEach((input) => input.addEventListener('input', () => {
          exercise[input.dataset.exField] = Number(input.value);
          if (input.dataset.exField === 'setsMax') exercise.setsMin = exercise.setsMax;
        }));
      });
      section.querySelector('[data-add-exercise]')?.addEventListener('click', () => {
        const selected = EXERCISES.find((e) => e.id === section.querySelector('[data-add-choice]').value);
        if (!selected) { toast('Choose an exercise first'); return; }
        if (d.exercises.length >= 15) { toast('Use up to 15 exercises per session'); return; }
        d.exercises.push(clone(selected)); drawEditor(weekday);
      });
      section.querySelectorAll('[data-remove-exercise]').forEach((button) => button.addEventListener('click', () => {
        d.exercises = d.exercises.filter((e) => e.id !== button.dataset.removeExercise); drawEditor(weekday);
      }));
    });
    editor.querySelector('[data-cancel-plan]').addEventListener('click', () => { draft = null; editor.hidden = true; editor.innerHTML = ''; });
    editor.querySelector('[data-save-plan]').addEventListener('click', () => {
      try {
        const plan = createWorkoutPlan(draft);
        const previous = ctx.state.workoutPlans || [];
        ctx.state.workoutPlans = [...previous, plan];
        if (ctx.save() === false) { ctx.state.workoutPlans = previous; editor.querySelector('[data-plan-feedback]').textContent = 'Could not save the plan. Back up your data and free some device storage.'; return; }
        ctx.render(); toast(`Plan saved from ${fmtLongDate(plan.effectiveFrom)}`);
      } catch (err) { editor.querySelector('[data-plan-feedback]').textContent = err.message; }
    });
  }
  root.querySelector('[data-update-plan]').addEventListener('click', () => showDraft({ ...(saved || WORKOUT_TEMPLATES[3]), name: saved?.name || WORKOUT_TEMPLATES[3].name, effectiveFrom: date > todayISO() ? date : todayISO() }));
  root.querySelector('[data-new-plan]').addEventListener('click', () => showDraft({ name: 'My weekly plan', templateId: 'custom', days: WEEKDAYS.map(([weekday, label]) => ({ weekday, type: 'rest', title: 'Rest / gentle movement', short: label.slice(0, 3), minutes: 0, exercises: [] })) }));
  root.querySelectorAll('[data-template]').forEach((button) => button.addEventListener('click', () => {
    const p = WORKOUT_TEMPLATES.find((x) => x.id === button.dataset.template);
    showDraft({ ...p, templateId: p.id });
  }));
  root.querySelectorAll('[data-edit-revision]').forEach((button) => button.addEventListener('click', () => showDraft(ctx.state.workoutPlans.find((p) => p.id === button.dataset.editRevision))));
  root.querySelector('[data-exercise-search]').addEventListener('input', (event) => {
    const search = event.target.value.trim().toLowerCase();
    let matches = 0;
    root.querySelectorAll('[data-library-exercise]').forEach((el) => { el.hidden = !el.dataset.search.includes(search); if (!el.hidden) matches++; });
    root.querySelector('[data-library-count]').textContent = `${fmt(matches)} exercise${matches === 1 ? '' : 's'}${matches ? '' : ' found. Try a different search.'}`;
  });
}
