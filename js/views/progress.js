// Progress: expected weight change, weight chart, supplement history, calendar, weekly check-ins.
import { esc, fmt, fmtSigned, fmtDate, fmtLongDate, addDays, todayISO, weekStart, parseISO, numOrNull, isValidISO, diffDays } from '../util.js';
import { getDay } from '../store.js';
import {
  projection, scaleTrend, planAlerts, weightEntries, waistEntries, rollingAverage, streak, suppTaken,
  adherence, hasFood, hasWorkout, dayIntake,
} from '../calc.js';
import { alertBox, openSheet, toast } from '../ui.js';
import { timeChart } from '../chart.js';

export function render(root, ctx) {
  const { state } = ctx;
  const today = todayISO();
  const win = Number(ctx.ui.projWindow || 7);
  const p = projection(state, today, win);
  const trend = scaleTrend(state, today);
  const alerts = planAlerts(state, today);
  const wEntries = weightEntries(state);
  const waEntries = waistEntries(state);

  root.innerHTML = `
    ${projectionCard(p, trend, win, state)}
    ${alerts.map((a) => alertBox(a.level, a.text)).join('')}
    <section class="card">
      <div class="card-head"><div><h2>Weight trend</h2><div class="sub">Compare weekly averages, not single readings</div></div>
        <button class="btn btn-sm btn-primary" data-addw>+ Weigh-in</button></div>
      <div data-chart></div>
      ${wEntries.length ? `<div class="legend">
        <span><i style="background:var(--s1);opacity:.45"></i>Weigh-ins</span>
        <span><i class="line" style="background:var(--s1)"></i>7-day average</span>
        ${p.kgPerWeek !== undefined ? '<span><i class="dash"></i>Expected (from calories)</span>' : ''}
      </div>` : ''}
    </section>
    ${supplementsCard(state, today)}
    ${calendarCard(state, today)}
    ${checkinCard(state, today)}
    ${logCard(wEntries, waEntries)}`;

  // Projection window
  root.querySelectorAll('[data-win]').forEach((b) => b.addEventListener('click', () => { ctx.ui.projWindow = b.dataset.win; ctx.render(); }));

  // Chart
  const chartEl = root.querySelector('[data-chart]');
  if (!wEntries.length) {
    chartEl.innerHTML = '<div class="empty">Add your morning weight (on Today or with <b>+ Weigh-in</b>) to see the trend.</div>';
  } else {
    const avg = rollingAverage(wEntries).map((r) => ({ date: r.date, y: r.kg }));
    const series = [
      { id: 'w', label: 'weigh-in', kind: 'dots', soft: true, points: wEntries.map((e) => ({ date: e.date, y: e.kg })) },
      { id: 'avg', label: '7-day avg', kind: 'line', points: avg, endLabel: true },
    ];
    const proj = projectionLine(p, today);
    if (proj) series.push({ id: 'proj', label: 'expected', kind: 'dash', points: proj });
    // Only draw the goal line when it is near the plotted values; otherwise it squashes the trend.
    const ys = series.flatMap((s) => s.points.map((pt) => pt.y));
    const goalNear = p.goalWeight && p.goalWeight >= Math.min(...ys) - 2 && p.goalWeight <= Math.max(...ys) + 2;
    timeChart(chartEl, {
      series,
      goal: goalNear ? { y: p.goalWeight, label: `Goal ${fmt(p.goalWeight, 1)}` } : null,
      unit: 'kg',
      digits: 1,
      height: 240,
      ariaLabel: 'Body weight over time with 7-day average and expected trend',
    });
  }

  root.querySelector('[data-addw]').addEventListener('click', () => openWeighIn(ctx, today));
  root.querySelectorAll('[data-editw]').forEach((b) => b.addEventListener('click', () => openWeighIn(ctx, b.dataset.editw)));
  root.querySelectorAll('[data-day]').forEach((b) => b.addEventListener('click', () => { ctx.setDate(b.dataset.day); ctx.go('#/today'); }));
}

/** Dashed line from today's average at the logged pace: 8 weeks ahead, or until the goal if sooner. */
function projectionLine(p, today) {
  if (p.kgPerWeek === undefined || !Number.isFinite(p.kgPerWeek)) return null;
  const toGoal = p.status === 'on-track' && p.weeksToGoal <= 8;
  const weeks = toGoal ? p.weeksToGoal : 8;
  const end = addDays(today, Math.max(1, Math.round(weeks * 7)));
  const endY = toGoal ? p.goalWeight : p.currentWeight + p.kgPerWeek * weeks;
  return [{ date: today, y: p.currentWeight }, { date: end, y: endY }];
}

function paceLabel(kgPerWeek) {
  if (kgPerWeek >= 0.02) return ['serious', 'Gaining'];
  if (kgPerWeek > -0.25) return ['', 'Slower than the plan (0.25–0.5 kg/week)'];
  if (kgPerWeek >= -0.5) return ['good', 'In the plan’s range (0.25–0.5 kg/week)'];
  if (kgPerWeek >= -0.7) return ['warning', 'A bit faster than the plan'];
  return ['critical', 'Too fast – consider adding 100–200 kcal'];
}

function projectionCard(p, trend, win, state) {
  const chips = `<div class="chips" role="group" aria-label="Based on">${[7, 14, 28].map((n) =>
    `<button class="chip" data-win="${n}" aria-pressed="${win === n}">Last ${n} days</button>`).join('')}</div>`;
  if (p.status === 'nodata') {
    return `<section class="card"><div class="card-head"><h2>Expected weight change</h2></div>${chips}
      <div class="empty">No food logged in the last ${win} days. Log what you eat and the app estimates your weekly change and the date you’d reach your goal weight.</div></section>`;
  }
  const [cls, label] = paceLabel(p.kgPerWeek);
  let goalLine;
  if (p.status === 'on-track') {
    goalLine = p.weeksToGoal > 260
      ? `At this pace ${fmt(p.goalWeight, 1)} kg is more than 5 years away.`
      : `You’d reach <b>${fmt(p.goalWeight, 1)} kg</b> around <b>${esc(fmtLongDate(p.goalDate))}</b> (${fmt(p.weeksToGoal, 0)} weeks).`;
  } else if (p.status === 'reached') goalLine = `You’re at your ${fmt(p.goalWeight, 1)} kg checkpoint – reassess it based on waist and muscle.`;
  else if (p.status === 'away') goalLine = `At this pace you’re moving away from ${fmt(p.goalWeight, 1)} kg.`;
  else goalLine = 'Enter your goal weight (on Today or in Settings) to get a target date.';

  return `<section class="card">
    <div class="card-head"><h2>Expected weight change</h2></div>
    ${chips}
    <div style="margin-top:12px"><span class="hero num">${fmtSigned(p.kgPerWeek, 2)}</span> <span class="muted">kg / week</span></div>
    <div style="margin:4px 0 8px"><span class="status ${cls}">${label}</span></div>
    <p>${goalLine}</p>
    <dl class="kv" style="margin-top:10px">
      <dt>Current weight (7-day avg)</dt><dd>${fmt(p.currentWeight, 1)} kg</dd>
      ${p.goalWeight ? `<dt>Goal / still to go</dt><dd>${fmt(p.goalWeight, 1)} kg / ${fmt(Math.abs(p.remaining), 1)} kg</dd>` : ''}
      <dt>Average eaten</dt><dd>${fmt(p.avgIntake)} kcal/day</dd>
      <dt>Average burned (est.)</dt><dd>${fmt(p.avgBurn)} kcal/day</dd>
      <dt>Average balance</dt><dd>${fmtSigned(p.avgNet)} kcal/day</dd>
      <dt>Expected per day</dt><dd>${fmtSigned(p.kgPerDay * 1000)} g</dd>
      ${trend ? `<dt>Scale says (avg vs last week)</dt><dd>${fmtSigned(trend.kgPerWeek, 2)} kg</dd>` : ''}
    </dl>
    <p class="muted tiny" style="margin-top:8px">Based on ${p.daysUsed} day${p.daysUsed > 1 ? 's' : ''} with food logged in the last ${win} (days without a log are skipped). ~7,700 kcal ≈ 1 kg. It’s an estimate: water, salt and creatine move the scale, so trust the weekly average and your waist.</p>
  </section>`;
}

function supplementsCard(state, today) {
  const rows = state.supplements.map((s) => {
    const pred = suppTaken(s.id);
    const st = streak(state, today, pred);
    const ad = adherence(state, today, pred, 30);
    const dots = Array.from({ length: 30 }, (_, i) => {
      const d = addDays(today, i - 29);
      return `<i class="${pred(state.days[d]) ? 'on' : ''}" title="${esc(fmtDate(d))}${pred(state.days[d]) ? ' ✓' : ''}"></i>`;
    }).join('');
    return `<li style="padding:10px 0">
      <div class="row between"><span class="strong">${esc(s.name)}</span>
        ${s.daily ? `<span class="status ${st ? 'good' : ''}">${st}-day streak</span>` : '<span class="badge neutral">backup</span>'}</div>
      <div class="muted small">${s.daily ? `Taken ${ad.count} of the last ${ad.days} day${ad.days !== 1 ? 's' : ''}` : `Used ${ad.count} time${ad.count !== 1 ? 's' : ''} in the last ${ad.days} day${ad.days !== 1 ? 's' : ''}`}</div>
      <div class="dots30" role="img" aria-label="${esc(s.name)}: last 30 days, ${ad.count} taken">${dots}</div>
    </li>`;
  }).join('');
  return `<section class="card">
    <div class="card-head"><div><h2>Supplement history</h2><div class="sub">Last 30 days · oldest → today</div></div></div>
    <ul class="list">${rows || '<li class="empty">No supplements set up.</li>'}</ul>
  </section>`;
}

function calendarCard(state, today) {
  const start = addDays(weekStart(today), -28);
  const daily = state.supplements.filter((s) => s.daily);
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = addDays(start, i);
    const day = state.days[d];
    const food = hasFood(day);
    const supps = daily.length > 0 && daily.every((s) => day?.supps?.[s.id]);
    const work = hasWorkout(day);
    const future = d > today;
    const label = `${fmtLongDate(d)}${food ? ', food logged' : ''}${supps ? ', all supplements' : ''}${work ? ', workout' : ''}`;
    return `<button ${future ? 'disabled' : ''} class="${d === today ? 'today' : ''} ${future ? 'future' : ''}" data-day="${d}" aria-label="${esc(label)}">
      ${parseISO(d).getDate()}<span class="marks">${food ? '<i class="mk-food"></i>' : ''}${supps ? '<i class="mk-supp"></i>' : ''}${work ? '<i class="mk-work"></i>' : ''}</span></button>`;
  }).join('');
  return `<section class="card">
    <div class="card-head"><div><h2>Calendar</h2><div class="sub">Tap a day to open it</div></div></div>
    <div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<div class="h">${d}</div>`).join('')}${cells}</div>
    <div class="legend"><span><i class="mk-food"></i>Food logged</span><span><i class="mk-supp"></i>All daily supplements</span><span><i class="mk-work"></i>Workout</span></div>
  </section>`;
}

function checkinCard(state, today) {
  const rows = [];
  const thisWeek = weekStart(today);
  const w = weightEntries(state);
  const wa = waistEntries(state);
  for (let k = 0; k < 8; k++) {
    const ws = addDays(thisWeek, -7 * k);
    const we = addDays(ws, 6);
    const inWeek = (e) => e.date >= ws && e.date <= we;
    const ww = w.filter(inWeek), waw = wa.filter(inWeek);
    const foodDays = [];
    let shakes2 = 0;
    for (let i = 0; i < 7; i++) {
      const day = state.days[addDays(ws, i)];
      if (hasFood(day)) foodDays.push(dayIntake(day, state.supplements).total.protein);
      if (day?.supps?.shake2) shakes2++;
    }
    if (!ww.length && !waw.length && !foodDays.length) continue;
    const avg = (xs) => xs.reduce((s, e) => s + (e.kg ?? e), 0) / xs.length;
    rows.push(`<tr><td>${esc(fmtDate(ws, { month: 'short', day: 'numeric' }))}</td>
      <td class="r">${ww.length ? fmt(avg(ww), 1) : '–'}</td>
      <td class="r">${waw.length ? fmt(avg(waw), 1) : '–'}</td>
      <td class="r">${foodDays.length ? fmt(avg(foodDays)) : '–'}</td>
      <td class="r">${shakes2}</td></tr>`);
  }
  return `<section class="card">
    <div class="card-head"><div><h2>Weekly check-in</h2><div class="sub">Like the plan’s 8-week log · review after 3–4 weeks</div></div></div>
    ${rows.length ? `<table class="table"><thead><tr><th>Week of</th><th class="r">Avg kg</th><th class="r">Waist cm</th><th class="r">Avg protein g</th><th class="r">2nd shakes</th></tr></thead><tbody>${rows.join('')}</tbody></table>`
      : '<div class="empty">Your weekly averages will appear here.</div>'}
  </section>`;
}

function logCard(wEntries, waEntries) {
  const dates = [...new Set([...wEntries, ...waEntries].map((e) => e.date))].sort().reverse();
  const avg = new Map(rollingAverage(wEntries).map((r) => [r.date, r.kg]));
  const wMap = new Map(wEntries.map((e) => [e.date, e.kg]));
  const waMap = new Map(waEntries.map((e) => [e.date, e.kg]));
  return `<section class="card">
    <div class="card-head"><h2>Weight &amp; waist log</h2></div>
    ${dates.length ? `<table class="table"><thead><tr><th>Date</th><th class="r">Weight</th><th class="r">7-day avg</th><th class="r">Waist</th><th></th></tr></thead><tbody>
      ${dates.slice(0, 90).map((d) => `<tr><td>${esc(fmtDate(d))}</td><td class="r">${wMap.has(d) ? fmt(wMap.get(d), 1) : '–'}</td><td class="r">${avg.has(d) ? fmt(avg.get(d), 1) : '–'}</td><td class="r">${waMap.has(d) ? fmt(waMap.get(d), 1) : '–'}</td>
        <td class="r"><button class="btn btn-sm" data-editw="${d}">Edit</button></td></tr>`).join('')}
    </tbody></table>` : '<div class="empty">No weigh-ins yet.</div>'}
  </section>`;
}

function openWeighIn(ctx, date) {
  const { state } = ctx;
  const day = getDay(state, date);
  openSheet({
    title: 'Weigh-in',
    body: `
      <label class="field"><span>Date</span><input class="input" type="date" name="date" value="${date}" max="${todayISO()}"></label>
      <div class="grid2">
        <label class="field"><span>Weight (kg)</span><input class="input num" name="weightKg" inputmode="decimal" value="${day?.weightKg ?? ''}"></label>
        <label class="field"><span>Waist (cm)</span><input class="input num" name="waistCm" inputmode="decimal" value="${day?.waistCm ?? ''}"></label>
      </div>
      <p class="muted small">Weigh 3–7 mornings a week after the bathroom. Waist once a week, relaxed, after a normal exhale.</p>
      <button type="button" class="btn btn-primary btn-block" data-save>Save</button>`,
    onMount(dlg) {
      const dateIn = dlg.querySelector('[name=date]');
      dateIn.addEventListener('change', () => {
        const d = getDay(state, dateIn.value);
        dlg.querySelector('[name=weightKg]').value = d?.weightKg ?? '';
        dlg.querySelector('[name=waistCm]').value = d?.waistCm ?? '';
      });
      dlg.querySelector('[data-save]').addEventListener('click', () => {
        const dt = dateIn.value;
        if (!isValidISO(dt) || diffDays(todayISO(), dt) > 0) { toast('Pick a valid date'); return; }
        const w = numOrNull(dlg.querySelector('[name=weightKg]').value);
        const wa = numOrNull(dlg.querySelector('[name=waistCm]').value);
        if ((w !== null && (w < 20 || w > 400)) || (wa !== null && (wa < 30 || wa > 300))) { toast('Please enter realistic numbers'); return; }
        const d = getDay(state, dt, true);
        if (w === null) delete d.weightKg; else d.weightKg = w;
        if (wa === null) delete d.waistCm; else d.waistCm = wa;
        ctx.save();
        dlg.close();
        toast('Saved');
        ctx.render();
      });
    },
  });
}
