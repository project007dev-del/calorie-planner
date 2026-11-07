// Food screen: Log (by meal), History (past days), My Foods (your own food types).
import { esc, fmt, fmtDate, fmtLongDate, num, numOrNull, uid, addDays, todayISO, isValidISO } from '../util.js';
import { getDay } from '../store.js';
import { MEALS, EXAMPLE_DAY, mealForNow } from '../plan.js';
import { CATEGORIES, categoryName, allFoods, findFood, statesOf, stateLabel, BUILTIN_FOODS, portionChips, searchFoods } from '../foods.js';
import {
  scale, makeEntry, entryNutrients, foodTotals, dayIntake, buildExampleEntries, recentFoods,
  foodHistory, summarizeFoodDays, foodUsage, per100FromServing, macroKcal, kcalStatus,
} from '../calc.js';
import { openSheet, confirmSheet, toast, stateBadge, subtabs, formValues } from '../ui.js';
import { foodRecommendations } from '../food-recommendations.js';
import { foodVisual } from '../food-visuals.js';

const TABS = [
  ['log', 'Log', '#/food/log'],
  ['history', 'History', '#/food/history'],
  ['foods', 'My Foods', '#/food/foods'],
];

export function render(root, ctx, params) {
  const tab = params[0] || 'log';
  if (tab === 'history' && params[1] && isValidISO(params[1])) return renderDayDetail(root, ctx, params[1]);
  if (tab === 'history') return renderHistory(root, ctx);
  if (tab === 'foods') return renderMyFoods(root, ctx);
  return renderLog(root, ctx);
}

const macroLine = (v) => `P ${fmt(v.protein)} · C ${fmt(v.carbs)} · F ${fmt(v.fat)} g`;
const mealName = (id) => MEALS.find((m) => m.id === id)?.name || id;

const nutrientLabels = { kcal: 'calories', protein: 'protein', carbs: 'carbs', fat: 'fat' };
const remainingLine = (values) => `${fmt(values.kcal)} kcal · P ${fmt(values.protein, 1)} · C ${fmt(values.carbs, 1)} · F ${fmt(values.fat, 1)} g`;

function portionRow(suggestion, index, focus, state) {
  const food = findFood(state, suggestion.foodId);
  const over = ['protein', 'carbs', 'fat'].filter((key) => suggestion.over[key] >= 1).map((key) => `${nutrientLabels[key]} ${fmt(suggestion.over[key], 1)} g over target`);
  const closesGap = focus === 'kcal' ? suggestion.remainingAfter.kcal < 10 : suggestion.remainingAfter[focus] < 0.05;
  return `<li class="food-suggestion">
    <div class="row between"><div class="grow"><div class="food-label">${foodVisual(food, 'sm')}<div class="title grow"><b>${fmt(suggestion.grams)} g ${esc(suggestion.name)}</b></div></div><div class="meta">${esc(stateLabel(food, suggestion.state))} weight · ${closesGap ? `closes your ${nutrientLabels[focus]} gap` : `toward your ${nutrientLabels[focus]} goal`}</div></div>
      <button class="btn btn-sm" type="button" data-suggest-food="${index}" aria-label="Review ${fmt(suggestion.grams)} grams of ${esc(suggestion.name)}">Review &amp; add</button></div>
    <div class="small num"><b>${fmt(suggestion.nutrients.kcal)} kcal</b> · ${macroLine(suggestion.nutrients)}</div>
    <p class="tiny muted num">Remaining after this portion: ${remainingLine(suggestion.remainingAfter)}.${over.length ? ` ${esc(over.join(' · '))}.` : ''}</p>
  </li>`;
}

export function portionRecommendations(rec, state, { compact = false, hasIntake = true } = {}) {
  let body;
  if (rec.status === 'invalid') body = `<p class="small">${esc(rec.reason)}</p>`;
  else if (compact && !hasIntake) body = '<p class="small muted">Log what you ate to get portion ideas based on your intake for this day.</p>';
  else if (rec.status === 'reached') {
    const proteinGap = rec.remaining.protein >= 5;
    body = `<p class="small">Your calorie goal is reached.${proteinGap ? ` You still have ${fmt(rec.remaining.protein, 1)} g of protein left; consider protein-rich swaps when planning meals.` : ' No extra portion is suggested.'}</p>`;
  } else {
    body = compact ? '' : `<div class="recommendation-stats num remaining-targets" aria-label="Remaining intake for this day">
      <div><b>${fmt(rec.remaining.kcal)}</b><span>kcal left</span></div>
      <div><b>${fmt(rec.remaining.protein, 1)} g</b><span>protein left</span></div>
      <div><b>${fmt(rec.remaining.carbs, 1)} g</b><span>carbs left</span></div>
      <div><b>${fmt(rec.remaining.fat, 1)} g</b><span>fat left</span></div>
    </div>`;
    if (!rec.suggestions.length) body += '<p class="small">No practical portion fits the remaining calories. Review your food log and targets.</p>';
    else {
      body += `<p class="small muted">${compact ? 'Adjusted to your logged food and supplements. ' : ''}Focus on ${nutrientLabels[rec.focus]}. Choose one option; portions update after you log food. ${state.profile.dietStyle === 'plant' ? 'Showing plant-based choices.' : ''}</p>`;
      if (compact) {
        body += `<ul class="list">${portionRow(rec.suggestions[0], 0, rec.focus, state)}</ul>`;
        if (rec.suggestions.length > 1) body += `<details class="guidance"><summary>More food options</summary><ul class="list">${rec.suggestions.slice(1).map((suggestion, index) => portionRow(suggestion, index + 1, rec.focus, state)).join('')}</ul></details>`;
      } else body += `<ul class="list">${rec.suggestions.map((suggestion, index) => portionRow(suggestion, index, rec.focus, state)).join('')}</ul>`;
    }
  }
  if (compact) return `<div class="food-goals intake-recommendation" aria-labelledby="intake-recommendation-title"><h3 id="intake-recommendation-title">What to eat next</h3>${body}</div>`;
  return `<section class="card food-goals" aria-labelledby="food-goals-title">
    <div class="card-head"><h2 id="food-goals-title">What to eat next</h2><a class="btn btn-sm" href="#/settings/targets">Daily targets</a></div>
    ${body}<p class="tiny muted">Based on this day’s log, counted supplements and saved targets. Portions are estimates; review the weight and meal before adding.</p>
  </section>`;
}

export function wireFoodRecommendations(root, ctx, recommendations, date) {
  root.querySelectorAll('[data-suggest-food]').forEach((button) => button.addEventListener('click', () => {
    const suggestion = recommendations.suggestions[Number(button.dataset.suggestFood)];
    if (suggestion) openAddFood(ctx, { date, foodId: suggestion.foodId, state: suggestion.state, grams: suggestion.grams });
  }));
}

// =====================================================================
// LOG
// =====================================================================
function renderLog(root, ctx) {
  const { state } = ctx;
  const date = ctx.ui.date;
  const day = getDay(state, date);
  const intake = dayIntake(day, state.supplements);
  const t = state.targets;
  const recommendations = foodRecommendations(state, date);

  const meals = MEALS.map((m) => {
    const list = (day?.food || []).filter((e) => e.meal === m.id);
    const tot = foodTotals(day, m.id);
    const rows = list.map((e) => {
      const v = entryNutrients(e);
      return `<li><button class="item" data-edit="${esc(e.id)}">
        ${foodVisual({ ...findFood(state, e.foodId), foodId: e.foodId })}
        <span class="grow"><span class="title">${esc(e.name)}</span> ${stateBadge(e.state)}<br>
          <span class="meta num">${fmt(e.grams)} g · ${macroLine(v)}</span></span>
        <span class="val"><b>${fmt(v.kcal)}</b> <span class="muted small">kcal</span></span>
      </button></li>`;
    }).join('');
    return `<section class="card meal" aria-labelledby="meal-${m.id}">
      <div class="card-head">
        <div><h2 id="meal-${m.id}">${esc(m.name)}</h2><div class="sub">${list.length ? `${fmt(tot.kcal)} kcal · ${fmt(tot.protein)} g protein` : esc(m.hint)}</div></div>
        <button class="btn btn-sm btn-primary" data-add="${m.id}" aria-label="Add food to ${esc(m.name)}">+ Add</button>
      </div>
      ${rows ? `<ul class="list">${rows}</ul>` : ''}
    </section>`;
  }).join('');

  const suppsCounted = state.supplements.filter((s) => day?.supps?.[s.id] && num(s.kcal) > 0);
  const suppCard = suppsCounted.length ? `<section class="card">
      <div class="card-head"><h2>Supplements counted</h2><a class="btn btn-sm" href="#/today">Change</a></div>
      <ul class="list">${suppsCounted.map((s) => `<li class="item" style="cursor:default"><span class="grow"><span class="title">${esc(s.name)}</span><br><span class="meta">${macroLine(s)}</span></span><span class="val"><b>${fmt(s.kcal)}</b> <span class="muted small">kcal</span></span></li>`).join('')}</ul>
    </section>` : '';

  root.innerHTML = `
    ${subtabs(TABS, 'log')}
    <section class="card">
      <div class="row between">
        <div><div class="hero num" style="font-size:2rem">${fmt(intake.total.kcal)} <span class="muted" style="font-size:1rem;font-weight:500">/ ${fmt(t.kcal)} kcal</span></div>
        <div class="small num">Protein <b>${fmt(intake.total.protein)}</b>/${fmt(t.protein)} · Carbs <b>${fmt(intake.total.carbs)}</b>/${fmt(t.carbs)} · Fat <b>${fmt(intake.total.fat)}</b>/${fmt(t.fat)} g</div></div>
      </div>
      <div class="row wrap" style="margin-top:10px">
        <button class="btn btn-sm" data-copy>Copy previous day</button>
        <button class="btn btn-sm" data-example>Load plan example day</button>
        <button class="btn btn-sm" data-newfood>+ New food</button>
      </div>
    </section>
    ${portionRecommendations(recommendations, state)}
    ${meals}
    ${suppCard}
    <p class="muted small" style="text-align:center">Weigh food the way you log it: pick <b>Raw</b> for uncooked/dry weight, <b>Cooked</b> for cooked weight.</p>`;

  root.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => openAddFood(ctx, { meal: b.dataset.add, date })));
  root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => openEditEntry(ctx, date, b.dataset.edit)));
  wireFoodRecommendations(root, ctx, recommendations, date);
  root.querySelector('[data-newfood]').addEventListener('click', () => openFoodForm(ctx, {}));
  root.querySelector('[data-copy]').addEventListener('click', () => copyYesterday(ctx, date));
  root.querySelector('[data-example]').addEventListener('click', () => loadExample(ctx, date));
}

async function copyYesterday(ctx, date) {
  const { state } = ctx;
  const prev = getDay(state, addDays(date, -1));
  if (!prev?.food?.length) { toast('Nothing logged the day before'); return; }
  await copyFoodInto(ctx, prev.food, date, 'the previous day');
}

/** Append copies of food entries to a date (asks first if that day already has food). */
async function copyFoodInto(ctx, entries, date, fromLabel) {
  const day = getDay(ctx.state, date, true);
  if (day.food.length && !(await confirmSheet('Copy food', `${fmtLongDate(date)} already has ${day.food.length} item(s). Add the ${entries.length} item(s) from ${fromLabel} as well?`, 'Add them'))) return false;
  day.food.push(...entries.map((e) => ({ ...e, id: uid(), per100: { ...e.per100 } })));
  ctx.save();
  toast(`Copied ${entries.length} item(s)`);
  ctx.render();
  return true;
}

async function loadExample(ctx, date) {
  const { state } = ctx;
  const day = getDay(state, date, true);
  if (day.food.length && !(await confirmSheet('Load example day', `This day already has ${day.food.length} item(s). Add the plan’s example day on top?`, 'Add it'))) return;
  day.food.push(...buildExampleEntries(state, uid));
  for (const id of EXAMPLE_DAY.supplements) day.supps[id] = true;
  ctx.save();
  toast('Example day added – edit the grams to match what you ate');
  ctx.render();
}

// ---------- Add food sheet ----------
function foodRow(f) {
  const states = statesOf(f);
  const vals = states.map((s) => `${stateLabel(f, s)} ${fmt(f[s].kcal)}`).join(' · ');
  return `<li><button type="button" class="item" data-pick="${esc(f.id)}">
    ${foodVisual(f)}
    <span class="grow"><span class="title">${esc(f.name)}</span> ${f.custom ? '<span class="badge custom">MINE</span>' : ''}<br>
      <span class="meta num">kcal/100 g: ${esc(vals)}</span></span>
  </button></li>`;
}

function renderResults(state, query, filter = 'all') {
  const foods = searchFoods(state, query, filter);
  if (!foods.length) {
    return `<div class="empty">${query.trim() ? `No matches for “${esc(query)}” in this filter.` : 'No foods in this filter.'}<br>Try All foods or add your own.<br><button type="button" class="btn btn-primary" style="margin-top:8px" data-create>+ Create food</button></div>`;
  }
  const groups = [];
  const mine = foods.filter((f) => f.custom);
  if (mine.length) groups.push(['My foods', mine]);
  for (const c of CATEGORIES) {
    const g = foods.filter((f) => !f.custom && f.category === c.id);
    if (g.length) groups.push([c.name, g]);
  }
  return `<p class="muted tiny" role="status">${foods.length} food${foods.length === 1 ? '' : 's'} found</p>` + groups.map(([name, list]) => `<h3 class="muted small" style="margin:10px 0 2px">${esc(name)}</h3><ul class="list">${list.map(foodRow).join('')}</ul>`).join('');
}

function previewHtml(v) {
  return `<div><b>${fmt(v.kcal)}</b><span>kcal</span></div><div><b>${fmt(v.protein, 1)}</b><span>protein g</span></div><div><b>${fmt(v.carbs, 1)}</b><span>carbs g</span></div><div><b>${fmt(v.fat, 1)}</b><span>fat g</span></div>`;
}

function stateRadios(food, current, name = 'state') {
  return `<div class="radio-row" role="radiogroup" aria-label="Raw or cooked">${['raw', 'cooked'].map((s) => `
    <label><input type="radio" name="${name}" value="${s}" ${s === current ? 'checked' : ''} ${food[s] ? '' : 'disabled'}>
    <span>${esc(food[s] ? stateLabel(food, s) : (s === 'raw' ? 'Raw' : 'Cooked'))}${food[s] ? '' : ' –'}</span></label>`).join('')}</div>`;
}

function mealSelect(current) {
  return `<select class="input" name="meal">${MEALS.map((m) => `<option value="${m.id}" ${m.id === current ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>`;
}

export function openAddFood(ctx, { meal = mealForNow(), date, foodId = null, state: st = null, grams = null }) {
  const { state } = ctx;
  const recent = recentFoods(state, 10).filter((r) => findFood(state, r.foodId)?.[r.state]);
  const body = `
    <div class="search-stage">
      <input class="input" type="search" placeholder="Search: togue, munggo, kanin, chicken…" data-q autocomplete="off" aria-label="Search foods in English or Filipino">
      <div class="chips" role="group" aria-label="Filter foods">${[['all', 'All foods'], ['filipino', 'Filipino foods'], ['veg', 'Vegetables'], ['protein', 'Protein foods']].map(([id, label]) => `<button type="button" class="chip" data-filter="${id}" aria-pressed="${id === 'all'}">${label}</button>`).join('')}</div>
      ${recent.length ? `<div><div class="muted small" style="margin-bottom:4px">Recent</div><div class="chips">${recent.map((r, i) =>
        `<button type="button" class="chip" data-recent="${i}">${esc(r.name)} · ${r.state === 'raw' ? 'raw' : 'cooked'} · ${fmt(r.grams)} g</button>`).join('')}</div></div>` : ''}
      <div class="results" data-results></div>
      <button type="button" class="btn btn-block" data-newfood>+ Add a new food type</button>
    </div>
    <div class="detail-stage hidden" data-detail></div>`;

  openSheet({
    title: `Add to ${mealName(meal)}`,
    body,
    onMount(dlg) {
      const q = dlg.querySelector('[data-q]');
      const results = dlg.querySelector('[data-results]');
      const searchStage = dlg.querySelector('.search-stage');
      const detail = dlg.querySelector('[data-detail]');
      let filter = 'all';

      const drawResults = () => {
        results.innerHTML = renderResults(state, q.value, filter);
        results.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => showDetail(b.dataset.pick)));
        results.querySelector('[data-create]')?.addEventListener('click', () => createNew(q.value));
      };
      const createNew = (name) => {
        openFoodForm(ctx, { prefillName: name, onSaved: (food) => { drawResults(); showDetail(food.id); } });
      };

      function showDetail(id, preset = {}) {
        const food = findFood(state, id);
        if (!food) return;
        // Default to cooked weight when the food has it (the plan weighs most food cooked).
        let cur = preset.state && food[preset.state] ? preset.state : food.cooked ? 'cooked' : statesOf(food)[0];
        detail.innerHTML = `
          <button type="button" class="btn btn-sm" data-back>‹ Back to list</button>
          <div class="food-label">${foodVisual(food, 'lg')}<div><div class="strong" style="font-size:1.1rem">${esc(food.name)}</div>
            <div class="muted small">${esc(categoryName(food.category))}${food.custom ? ' · my food' : ''}</div></div></div>
          <div class="field"><span>Weighed</span>${stateRadios(food, cur)}</div>
          <div class="grid2">
            <label class="field"><span>Grams</span><input class="input num" name="grams" inputmode="decimal" placeholder="0" value="${preset.grams ?? ''}" autocomplete="off"></label>
            <label class="field"><span>Meal</span>${mealSelect(meal)}</label>
          </div>
          <div class="chips" data-portions></div>
          <div class="chips" data-gramchips>${[25, 50, 100, 150, 200, 250].map((g) => `<button type="button" class="chip" data-g="${g}">${g} g</button>`).join('')}</div>
          <div class="preview" data-preview></div>
          <p class="muted small" data-per100></p>
          <p class="tiny" data-food-source></p>
          ${food.note ? `<p class="muted small">${esc(food.note)}</p>` : ''}
          <button type="button" class="btn btn-primary btn-block" data-addit>Add</button>`;
        searchStage.classList.add('hidden');
        detail.classList.remove('hidden');
        const gramsIn = detail.querySelector('[name=grams]');
        const portionsEl = detail.querySelector('[data-portions]');
        const drawPortions = () => {
          const chips = portionChips(food, cur);
          portionsEl.classList.toggle('hidden', !chips.length);
          portionsEl.innerHTML = chips.map((p) => `<button type="button" class="chip" data-g="${p.grams}">${esc(p.label)} · ${fmt(p.grams)} g</button>`).join('');
          portionsEl.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => { gramsIn.value = b.dataset.g; update(); }));
        };
        let drawnFor = null;
        const update = () => {
          cur = detail.querySelector('[name=state]:checked')?.value || cur;
          if (drawnFor !== cur) { drawnFor = cur; drawPortions(); }
          const per = food[cur];
          detail.querySelector('[data-preview]').innerHTML = previewHtml(scale(per, gramsIn.value));
          detail.querySelector('[data-per100]').textContent = `Per 100 g ${stateLabel(food, cur).toLowerCase()}: ${fmt(per.kcal)} kcal · P ${fmt(per.protein, 1)} · C ${fmt(per.carbs, 1)} · F ${fmt(per.fat, 1)} g`;
          const source = food.sources?.[cur];
          detail.querySelector('[data-food-source]').innerHTML = source ? `Source: <a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a> · per 100 g edible portion` : 'Approximate reference values. Use your product label for branded foods.';
        };
        detail.querySelectorAll('[name=state]').forEach((r) => r.addEventListener('change', update));
        gramsIn.addEventListener('input', update);
        detail.querySelectorAll('[data-gramchips] [data-g]').forEach((b) => b.addEventListener('click', () => { gramsIn.value = b.dataset.g; update(); }));
        detail.querySelector('[data-back]').addEventListener('click', () => { detail.classList.add('hidden'); searchStage.classList.remove('hidden'); q.focus(); });
        const submit = () => {
          const g = num(gramsIn.value);
          if (!(g > 0) || g > 5000) { toast('Enter how many grams'); gramsIn.focus(); return; }
          const m = detail.querySelector('[name=meal]').value;
          const d = getDay(state, date, true);
          d.food.push(makeEntry(food, cur, g, m, uid()));
          ctx.save();
          toast(`Added ${fmt(g)} g ${food.name}`);
          dlg.close();
          ctx.render();
        };
        detail.querySelector('[data-addit]').addEventListener('click', submit);
        gramsIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
        update();
        gramsIn.focus();
      }

      q.addEventListener('input', drawResults);
      dlg.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
        filter = button.dataset.filter;
        dlg.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
        drawResults();
      }));
      dlg.querySelector('[data-newfood]').addEventListener('click', () => createNew(q.value));
      dlg.querySelectorAll('[data-recent]').forEach((b) => b.addEventListener('click', () => {
        const r = recent[Number(b.dataset.recent)];
        showDetail(r.foodId, { state: r.state, grams: r.grams });
      }));
      drawResults();
      if (foodId) showDetail(foodId, { state: st, grams });
      else q.focus();
    },
  });
}

// ---------- Edit a logged entry ----------
function openEditEntry(ctx, date, entryId) {
  const { state } = ctx;
  const day = getDay(state, date);
  const entry = day?.food.find((e) => e.id === entryId);
  if (!entry) return;
  const food = findFood(state, entry.foodId);
  // Food may have been deleted/changed: the entry's own snapshot is always available for its state.
  const view = { name: entry.name, labels: food?.labels, raw: null, cooked: null };
  for (const s of ['raw', 'cooked']) view[s] = s === entry.state ? entry.per100 : food?.[s] || null;

  openSheet({
    title: 'Edit food',
    body: `
      <div class="food-label">${foodVisual({ ...food, foodId: entry.foodId }, 'lg')}<span class="strong" style="font-size:1.1rem">${esc(entry.name)}</span></div>
      <div class="field"><span>Weighed</span>${stateRadios(view, entry.state)}</div>
      <div class="grid2">
        <label class="field"><span>Grams</span><input class="input num" name="grams" inputmode="decimal" value="${entry.grams}"></label>
        <label class="field"><span>Meal</span>${mealSelect(entry.meal)}</label>
      </div>
      <div class="preview" data-preview></div>
      <div class="row between">
        <button type="button" class="btn btn-danger" data-del>Delete</button>
        <button type="button" class="btn btn-primary" data-save>Save</button>
      </div>`,
    onMount(dlg) {
      const gramsIn = dlg.querySelector('[name=grams]');
      const curState = () => dlg.querySelector('[name=state]:checked')?.value || entry.state;
      const update = () => { dlg.querySelector('[data-preview]').innerHTML = previewHtml(scale(view[curState()], gramsIn.value)); };
      dlg.querySelectorAll('[name=state]').forEach((r) => r.addEventListener('change', update));
      gramsIn.addEventListener('input', update);
      update();
      dlg.querySelector('[data-save]').addEventListener('click', () => {
        const g = num(gramsIn.value);
        if (!(g > 0) || g > 5000) { toast('Enter how many grams'); return; }
        const s = curState();
        if (s !== entry.state) { entry.per100 = { ...view[s] }; entry.state = s; }
        entry.grams = g;
        entry.meal = dlg.querySelector('[name=meal]').value;
        ctx.save();
        dlg.close();
        toast('Saved');
        ctx.render();
      });
      dlg.querySelector('[data-del]').addEventListener('click', () => {
        const index = day.food.findIndex((e) => e.id === entryId);
        const [removed] = day.food.splice(index, 1);
        ctx.save();
        dlg.close();
        ctx.render();
        toast(`Removed ${removed.name}`, {
          action: 'Undo',
          onAction: () => {
            const d = getDay(ctx.state, date, true);
            d.food.splice(Math.min(index, d.food.length), 0, removed);
            ctx.save();
            ctx.render();
          },
        });
      });
    },
  });
}

// =====================================================================
// NEW / EDIT FOOD TYPE
// =====================================================================
export function openFoodForm(ctx, { food = null, prefillName = '', onSaved = null }) {
  const { state } = ctx;
  const editing = !!food;
  const label = food?.label || (food ? { basis: 'per100', grams: '', ...food.per100 } : { basis: 'per100' });
  const v = (k) => (label[k] ?? '') === '' ? '' : esc(String(label[k]));

  openSheet({
    title: editing ? 'Edit food' : 'New food',
    body: `
      <label class="field"><span>Food name</span><input class="input" name="name" maxlength="80" placeholder="e.g. Pork liempo, Lucky Me pancit canton" value="${esc(food?.name || prefillName)}"></label>
      <div class="field"><span>Is this the raw or the cooked weight?</span>
        <div class="radio-row">
          <label><input type="radio" name="state" value="raw" ${food?.state === 'raw' ? 'checked' : ''}><span>Raw / not cooked</span></label>
          <label><input type="radio" name="state" value="cooked" ${food?.state === 'cooked' ? 'checked' : ''}><span>Cooked</span></label>
        </div>
        <p class="muted tiny" style="margin-top:4px">Have both? Save it twice – once raw, once cooked.</p>
      </div>
      <label class="field"><span>Category</span><select class="input" name="category">${CATEGORIES.map((c) => `<option value="${c.id}" ${(food?.category || 'other') === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
      <div class="field"><span>Nutrition values are for</span>
        <div class="radio-row">
          <label><input type="radio" name="basis" value="per100" ${label.basis !== 'serving' ? 'checked' : ''}><span>100 g</span></label>
          <label><input type="radio" name="basis" value="serving" ${label.basis === 'serving' ? 'checked' : ''}><span>1 serving (label)</span></label>
        </div>
      </div>
      <label class="field ${label.basis === 'serving' ? '' : 'hidden'}" data-serving><span>Serving size (g)</span><input class="input num" name="grams" inputmode="decimal" placeholder="e.g. 35" value="${v('grams')}"></label>
      <div class="grid2">
        <label class="field"><span>Calories (kcal)</span><input class="input num" name="kcal" inputmode="decimal" value="${v('kcal')}"></label>
        <label class="field"><span>Protein (g)</span><input class="input num" name="protein" inputmode="decimal" value="${v('protein')}"></label>
        <label class="field"><span>Carbs (g)</span><input class="input num" name="carbs" inputmode="decimal" value="${v('carbs')}"></label>
        <label class="field"><span>Fat (g)</span><input class="input num" name="fat" inputmode="decimal" value="${v('fat')}"></label>
      </div>
      <label class="field"><span>Note (optional)</span><input class="input" name="note" maxlength="140" placeholder="brand, recipe, where you buy it" value="${esc(food?.note || '')}"></label>
      <div><div class="muted small" style="margin-bottom:4px">Saved as per 100 g:</div><div class="preview" data-preview></div></div>
      <p class="small" data-check></p>
      <button type="button" class="btn btn-primary btn-block" data-save>${editing ? 'Save changes' : 'Save food'}</button>
      ${editing ? '<p class="muted tiny">Changing values only affects new logs – days you already logged keep their numbers.</p>' : ''}`,
    onMount(dlg) {
      const servingField = dlg.querySelector('[data-serving]');
      const read = () => {
        const f = formValues(dlg);
        const vals = { kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat };
        let per100 = null;
        try { per100 = f.basis === 'serving' ? per100FromServing(f.grams, vals) : per100FromServing(100, vals); } catch { per100 = null; }
        return { f, per100 };
      };
      const update = () => {
        const { f, per100 } = read();
        servingField.classList.toggle('hidden', f.basis !== 'serving');
        dlg.querySelector('[data-preview]').innerHTML = per100 ? previewHtml(per100) : '<div class="muted small" style="grid-column:1/-1">Enter the serving size</div>';
        const check = dlg.querySelector('[data-check]');
        const typed = num(f.kcal);
        const implied = macroKcal({ protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat) });
        if (typed > 0 && implied > 0 && Math.abs(implied - typed) / typed > 0.2) {
          check.innerHTML = `<span class="status warning">Check the numbers</span> <span class="muted">The macros add up to about ${fmt(implied)} kcal, but you typed ${fmt(typed)} kcal.</span>`;
        } else check.innerHTML = '';
      };
      dlg.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', update));
      dlg.querySelectorAll('input[type=radio]').forEach((el) => el.addEventListener('change', update));
      update();
      if (!food) dlg.querySelector('[name=name]').focus();

      dlg.querySelector('[data-save]').addEventListener('click', () => {
        const { f, per100 } = read();
        const name = f.name.trim();
        if (!name) { toast('Give the food a name'); return; }
        if (!f.state) { toast('Choose raw or cooked'); return; }
        if (f.basis === 'serving' && !(num(f.grams) > 0)) { toast('Enter the serving size in grams'); return; }
        const typed = ['kcal', 'protein', 'carbs', 'fat'].map((k) => numOrNull(f[k]));
        if (typed[0] === null) { toast('Enter the calories'); return; }
        if (typed.some((x) => x !== null && x < 0)) { toast('Values can’t be negative'); return; }
        if (per100.kcal > 950) { toast('That’s more than 900 kcal per 100 g – check the numbers'); return; }
        const dup = state.customFoods.find((c) => c.id !== food?.id && c.name.trim().toLowerCase() === name.toLowerCase() && c.state === f.state);
        if (dup) { toast(`You already have “${name}” (${f.state})`); return; }
        const record = {
          id: food?.id || `c_${uid()}`,
          name,
          state: f.state,
          category: f.category,
          note: f.note.trim(),
          per100: Object.fromEntries(Object.entries(per100).map(([k, x]) => [k, Math.round(x * 100) / 100])),
          label: { basis: f.basis, grams: f.basis === 'serving' ? num(f.grams) : '', kcal: num(f.kcal), protein: num(f.protein), carbs: num(f.carbs), fat: num(f.fat) },
          createdAt: food?.createdAt || new Date().toISOString(),
        };
        if (record.label.basis === 'serving') record.serving = { grams: record.label.grams };
        if (editing) state.customFoods = state.customFoods.map((c) => (c.id === record.id ? record : c));
        else state.customFoods.unshift(record);
        ctx.save();
        dlg.close();
        toast(editing ? 'Food updated' : `Saved “${name}”`);
        if (onSaved) onSaved(findFood(state, record.id));
        else ctx.render();
      });
    },
  });
}

// =====================================================================
// MY FOODS
// =====================================================================
function renderMyFoods(root, ctx) {
  const { state } = ctx;
  const q = ctx.ui.foodQuery || '';

  root.innerHTML = `
    ${subtabs(TABS, 'foods')}
    <section class="card">
      <div class="card-head"><div><h2>My foods</h2><div class="sub">Foods you added yourself</div></div><button class="btn btn-sm btn-primary" data-new>+ New food</button></div>
      <input class="input" type="search" placeholder="Search" value="${esc(q)}" data-q aria-label="Search foods">
      <div data-mine></div>
    </section>
    <section class="card">
      <details data-builtin-wrap>
        <summary class="strong" style="cursor:pointer">Built-in foods (${BUILTIN_FOODS.length}) · values per 100 g</summary>
        <table class="table" style="margin-top:8px">
          <thead><tr><th>Food</th><th class="r">kcal</th><th class="r">P</th><th class="r">C</th><th class="r">F</th></tr></thead>
          <tbody data-builtin></tbody>
        </table>
        <p class="muted tiny">Plan foods use the original plan table. New Filipino foods include linked DOST-FNRI references. Tap a food for its preparation, source and history.</p>
      </details>
    </section>`;

  const mineEl = root.querySelector('[data-mine]');
  const builtinEl = root.querySelector('[data-builtin]');
  const wrap = root.querySelector('[data-builtin-wrap]');
  const draw = (query) => {
    const needle = query.trim().toLowerCase();
    const matched = new Set(searchFoods(state, query).map((food) => food.id));
    const mine = state.customFoods.filter((c) => matched.has(c.id));
    mineEl.innerHTML = mine.length ? `<ul class="list" style="margin-top:8px">${mine.map((c) => `<li><button class="item" data-food="${esc(c.id)}">${foodVisual(c)}
      <span class="grow"><span class="title">${esc(c.name)}</span> ${stateBadge(c.state)}<br>
        <span class="meta num">${esc(categoryName(c.category))} · per 100 g: ${fmt(c.per100.kcal)} kcal · P ${fmt(c.per100.protein, 1)} · C ${fmt(c.per100.carbs, 1)} · F ${fmt(c.per100.fat, 1)}</span></span>
      <span class="muted">›</span></button></li>`).join('')}</ul>`
      : `<div class="empty">${needle ? 'No matching foods of your own.' : 'No foods yet. Tap <b>+ New food</b> and type the values from the label or a nutrition site. Pick raw or cooked so the grams you weigh match.'}</div>`;
    const rows = CATEGORIES.map((cat) => {
      const list = BUILTIN_FOODS.filter((f) => f.category === cat.id && matched.has(f.id));
      if (!list.length) return '';
      return `<tr><th colspan="5" style="padding-top:12px">${esc(cat.name)}</th></tr>` + list.map((f) => statesOf(f).map((st, i) => `
        <tr data-food="${esc(f.id)}" tabindex="0" role="button" aria-label="${esc(f.name)}, ${st}" style="cursor:pointer">
          <td><span class="food-table-name">${i === 0 ? foodVisual(f, 'table') + esc(f.name) : ''} ${stateBadge(st)}</span></td>
          <td class="r">${fmt(f[st].kcal)}</td><td class="r">${fmt(f[st].protein, 1)}</td><td class="r">${fmt(f[st].carbs, 1)}</td><td class="r">${fmt(f[st].fat, 1)}</td>
        </tr>`).join('')).join('');
    }).join('');
    builtinEl.innerHTML = rows || '<tr><td colspan="5" class="muted">No match</td></tr>';
    if (needle) wrap.open = true;
  };
  draw(q);

  const qIn = root.querySelector('[data-q]');
  qIn.addEventListener('input', () => { ctx.ui.foodQuery = qIn.value; draw(qIn.value); });
  root.querySelector('[data-new]').addEventListener('click', () => openFoodForm(ctx, { prefillName: qIn.value }));
  // One listener for both lists (they are redrawn while typing).
  const open = (e) => {
    const el = e.target.closest('[data-food]');
    if (!el || (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    openFoodDetail(ctx, el.dataset.food);
  };
  root.addEventListener('click', open);
  root.addEventListener('keydown', open);
}

function openFoodDetail(ctx, foodId) {
  const { state } = ctx;
  const food = findFood(state, foodId);
  if (!food) return;
  const custom = state.customFoods.find((c) => c.id === foodId);
  const usage = foodUsage(state, foodId);
  const totalG = usage.reduce((s, u) => s + u.grams, 0);
  const valueRows = statesOf(food).map((s) => `<tr><td>${stateBadge(s)} ${esc(stateLabel(food, s))}</td><td class="r">${fmt(food[s].kcal)}</td><td class="r">${fmt(food[s].protein, 1)}</td><td class="r">${fmt(food[s].carbs, 1)}</td><td class="r">${fmt(food[s].fat, 1)}</td></tr>`).join('');
  const servingLine = custom?.label?.basis === 'serving'
    ? `<p class="small muted">From label: ${fmt(custom.label.grams)} g serving = ${fmt(custom.label.kcal)} kcal · P ${fmt(custom.label.protein, 1)} · C ${fmt(custom.label.carbs, 1)} · F ${fmt(custom.label.fat, 1)} g</p>` : '';

  openSheet({
    title: food.name,
    body: `
      <div class="food-detail-visual">${foodVisual(food, 'lg')}<span class="small muted">${esc(categoryName(food.category))}</span></div>
      <table class="table"><thead><tr><th>Per 100 g</th><th class="r">kcal</th><th class="r">P</th><th class="r">C</th><th class="r">F</th></tr></thead><tbody>${valueRows}</tbody></table>
      ${servingLine}
      ${food.note ? `<p class="small muted">${esc(food.note)}</p>` : ''}
      ${statesOf(food).filter((s) => food.sources?.[s]).map((s) => `<p class="tiny">${esc(stateLabel(food, s))} source: <a href="${esc(food.sources[s].url)}" target="_blank" rel="noopener noreferrer">${esc(food.sources[s].title)}</a></p>`).join('')}
      <div class="row wrap">
        <button type="button" class="btn btn-primary" data-log>Log it</button>
        ${custom ? '<button type="button" class="btn" data-editfood>Edit</button><button type="button" class="btn btn-danger" data-delfood>Delete</button>' : ''}
      </div>
      <h3>History</h3>
      ${usage.length ? `<p class="small muted">Logged ${usage.length} time${usage.length > 1 ? 's' : ''} · ${fmt(totalG)} g in total</p>
        <table class="table"><thead><tr><th>Date</th><th>Meal</th><th class="r">Grams</th><th class="r">kcal</th></tr></thead><tbody>
        ${usage.slice(0, 60).map((u) => `<tr><td>${esc(fmtDate(u.date))} ${stateBadge(u.state)}</td><td>${esc(mealName(u.meal))}</td><td class="r">${fmt(u.grams)}</td><td class="r">${fmt(u.kcal)}</td></tr>`).join('')}
        </tbody></table>` : '<div class="empty">Not logged yet.</div>'}`,
    onMount(dlg) {
      dlg.querySelector('[data-log]').addEventListener('click', () => {
        dlg.close();
        openAddFood(ctx, { date: ctx.ui.date, foodId });
      });
      dlg.querySelector('[data-editfood]')?.addEventListener('click', () => { dlg.close(); openFoodForm(ctx, { food: custom }); });
      dlg.querySelector('[data-delfood]')?.addEventListener('click', async () => {
        dlg.close();
        if (!(await confirmSheet('Delete food', `Delete “${custom.name}” from My Foods? Days you already logged keep their numbers.`))) return;
        state.customFoods = state.customFoods.filter((c) => c.id !== foodId);
        ctx.save();
        toast('Food deleted');
        ctx.render();
      });
    },
  });
}

// =====================================================================
// HISTORY
// =====================================================================
const STATUS = {
  on: ['good', 'On target'],
  under: ['', 'Under'],
  over: ['serious', 'Over'],
};

function renderHistory(root, ctx) {
  const { state } = ctx;
  const range = ctx.ui.foodRange || '30';
  const today = todayISO();
  const from = range === 'all' ? null : addDays(today, -(Number(range) - 1));
  const rows = foodHistory(state, { from, to: today });
  const sum = summarizeFoodDays(rows, state.targets);
  const t = state.targets;

  const list = rows.map((r) => {
    const [cls, label] = STATUS[r.status];
    const pct = t.kcal > 0 ? Math.min(100, (r.total.kcal / t.kcal) * 100) : 0;
    return `<li><a class="item" href="#/food/history/${r.date}">
      <span class="grow"><span class="title">${esc(fmtLongDate(r.date))}</span> <span class="status ${cls}">${label}</span><br>
        <span class="meta num">${macroLine(r.total)} · ${r.entries} item${r.entries > 1 ? 's' : ''}</span>
        <span class="meter-track" style="display:block;height:4px;margin-top:5px;background:var(--s1-weak)"><span class="meter-fill" style="display:block;width:${pct}%;background:var(--s1)"></span></span></span>
      <span class="val"><b>${fmt(r.total.kcal)}</b><br><span class="muted tiny">/ ${fmt(t.kcal)} kcal</span></span>
    </a></li>`;
  }).join('');

  root.innerHTML = `
    ${subtabs(TABS, 'history')}
    <div class="chips" role="group" aria-label="Range">
      ${[['7', 'Last 7 days'], ['30', 'Last 30 days'], ['all', 'All']].map(([id, l]) => `<button class="chip" data-range="${id}" aria-pressed="${range === id}">${l}</button>`).join('')}
    </div>
    ${sum ? `<section class="card">
      <div class="card-head"><h2>Averages</h2><span class="sub">${sum.days} day${sum.days > 1 ? 's' : ''} logged</span></div>
      <div class="grid4">
        <div class="stat"><div class="label">Calories</div><div class="value num">${fmt(sum.kcal)}<small> / ${fmt(t.kcal)}</small></div></div>
        <div class="stat"><div class="label">Protein</div><div class="value num">${fmt(sum.protein)}<small> / ${fmt(t.protein)} g</small></div></div>
        <div class="stat"><div class="label">Carbs</div><div class="value num">${fmt(sum.carbs)}<small> / ${fmt(t.carbs)} g</small></div></div>
        <div class="stat"><div class="label">Fat</div><div class="value num">${fmt(sum.fat)}<small> / ${fmt(t.fat)} g</small></div></div>
      </div>
      <p class="small" style="margin-top:8px"><span class="status good">${sum.onTarget} on calorie target</span> &nbsp; <span class="status ${sum.proteinHit === sum.days ? 'good' : ''}">${sum.proteinHit} of ${sum.days} days near protein target</span></p>
      <p class="muted tiny">“On target” = within 5% of ${fmt(t.kcal)} kcal. Supplements with calories are included.</p>
    </section>` : ''}
    <section class="card">
      <div class="card-head"><h2>Days</h2></div>
      ${list ? `<ul class="list">${list}</ul>` : '<div class="empty">No food logged in this range yet.</div>'}
    </section>`;

  root.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => { ctx.ui.foodRange = b.dataset.range; ctx.render(); }));
}

function renderDayDetail(root, ctx, date) {
  const { state } = ctx;
  const day = getDay(state, date);
  const intake = dayIntake(day, state.supplements);
  const t = state.targets;
  const status = STATUS[kcalStatus(intake.total.kcal, t.kcal)];

  const meals = MEALS.map((m) => {
    const list = (day?.food || []).filter((e) => e.meal === m.id);
    if (!list.length) return '';
    const tot = foodTotals(day, m.id);
    return `<h3 style="margin-top:14px">${esc(m.name)} <span class="muted small">· ${fmt(tot.kcal)} kcal</span></h3>
      <table class="table"><thead><tr><th>Food</th><th class="r">g</th><th class="r">kcal</th><th class="r">P</th><th class="r">C</th><th class="r">F</th></tr></thead><tbody>
      ${list.map((e) => { const v = entryNutrients(e); return `<tr><td><span class="food-table-name">${foodVisual({ ...findFood(state, e.foodId), foodId: e.foodId }, 'table')}${esc(e.name)} ${stateBadge(e.state)}</span></td><td class="r">${fmt(e.grams)}</td><td class="r">${fmt(v.kcal)}</td><td class="r">${fmt(v.protein)}</td><td class="r">${fmt(v.carbs)}</td><td class="r">${fmt(v.fat)}</td></tr>`; }).join('')}
      </tbody></table>`;
  }).join('');
  const supps = state.supplements.filter((s) => day?.supps?.[s.id]);

  root.innerHTML = `
    <a class="btn btn-sm" href="#/food/history">‹ Food history</a>
    <section class="card">
      <div class="card-head"><div><h2>${esc(fmtLongDate(date))}</h2><span class="status ${status[0]}">${status[1]}</span></div>
        <div class="row wrap" style="justify-content:flex-end">${date !== todayISO() && day?.food?.length ? '<button class="btn btn-sm" data-copytoday>Copy to today</button>' : ''}<button class="btn btn-sm btn-primary" data-editday>Edit this day</button></div></div>
      <div class="grid4">
        <div class="stat"><div class="label">Calories</div><div class="value num">${fmt(intake.total.kcal)}<small> / ${fmt(t.kcal)}</small></div></div>
        <div class="stat"><div class="label">Protein</div><div class="value num">${fmt(intake.total.protein)}<small> g</small></div></div>
        <div class="stat"><div class="label">Carbs</div><div class="value num">${fmt(intake.total.carbs)}<small> g</small></div></div>
        <div class="stat"><div class="label">Fat</div><div class="value num">${fmt(intake.total.fat)}<small> g</small></div></div>
      </div>
      ${meals || '<div class="empty">No food logged on this day.</div>'}
      ${supps.length ? `<h3 style="margin-top:14px">Supplements taken</h3><p class="small">${supps.map((s) => `${esc(s.name)}${num(s.kcal) > 0 ? ` (${fmt(s.kcal)} kcal)` : ''}`).join(' · ')}</p>` : ''}
    </section>`;

  root.querySelector('[data-editday]').addEventListener('click', () => { ctx.setDate(date); ctx.go('#/food/log'); });
  root.querySelector('[data-copytoday]')?.addEventListener('click', async () => {
    if (await copyFoodInto(ctx, day.food, todayISO(), fmtLongDate(date))) { ctx.setDate(todayISO()); ctx.go('#/food/log'); }
  });
}
