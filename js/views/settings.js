// Settings: profile, targets, burn model, supplements, foods, backup.
import { esc, fmt, fmtDate, fmtLongDate, num, numOrNull, uid, todayISO, isValidISO, diffDays } from '../util.js';
import { importJSON, defaultState, getLastBackup } from '../store.js';
import { APP_VERSION, DEFAULT_BURN, profileComplete } from '../plan.js';
import { bmrMifflin, currentWeight, suggestBaseKcal, suppSchedule, scheduleLabel, nextDue } from '../calc.js';
import { ACTIVITY_LEVELS, DIET_STYLES, BULK_INTENSITIES, dailyRecommendation, intakeForCalories } from '../recommendations.js';
import { workoutPlanSummary } from '../workout-plans.js';
import { parseSettings } from '../settings-model.js';
import { openSheet, confirmSheet, toast, formValues, backupNow } from '../ui.js';
import { THEME_OPTIONS, getThemeMode, setThemeMode } from '../theme.js';

const field = (name, label, value, attrs = 'inputmode="decimal"') =>
  `<label class="field"><span>${label}</span><input class="input num" name="${name}" value="${esc(value ?? '')}" ${attrs}></label>`;
const select = (name, label, value, options) => `<label class="field"><span>${label}</span><select class="input" name="${name}">${options.map(([id, text]) => `<option value="${id}" ${value === id ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;

function enteredIntakeCard(rec) {
  if (!rec.available) return `<div class="intake-suggestion"><h3>Match intake to your calories</h3><p class="small muted">${esc(rec.reason)}</p></div>`;
  const t = rec.targets;
  const parts = [['protein', 'Protein', 4], ['carbs', 'Carbs', 4], ['fat', 'Fat', 9]];
  return `<div class="intake-suggestion">
    <div class="eyebrow">YOUR CALORIE TARGET</div><h3>Intake for ${fmt(t.kcal)} kcal</h3>
    <p class="small muted">${esc(rec.style.label)} · based on your saved profile. Updates as you type.</p>
    <div class="macro-segments" role="img" aria-label="Suggested calorie split: ${parts.map(([id, label, factor]) => `${label} ${Math.round(t[id] * factor / t.kcal * 100)}%`).join(', ')}">${parts.map(([id, , factor]) => `<span class="segment-${id}" style="flex:${t[id] * factor}"></span>`).join('')}</div>
    <div class="macro-tiles">${parts.map(([id, label, factor]) => `<div class="macro-tile ${id}"><span>${label}</span><b class="num">${fmt(t[id])}<small> g</small></b><span class="tiny">${Math.round(t[id] * factor / t.kcal * 100)}% of calories</span></div>`).join('')}</div>
    <button class="btn btn-sm btn-primary" type="button" data-fill-calorie-macros>Fill these macros</button>
    <p class="tiny muted">Protein uses ${rec.proteinPerKg} g/kg${rec.proteinCapped ? ', capped at 30% of calories' : ''}; fat uses about 30%; carbs fill the remaining calories. Review, then Save targets.</p>
    <details class="guidance"><summary>Other daily intake guides</summary>
      <dl class="kv small"><dt>Fibre</dt><dd>At least 25 g</dd><dt>Fruit &amp; vegetables</dt><dd>At least 400 g</dd><dt>Free sugars</dt><dd>Less than ${fmt(rec.guides.freeSugars, 1)} g</dd><dt>Saturated fat</dt><dd>Less than ${fmt(rec.guides.saturatedFat, 1)} g</dd><dt>Sodium</dt><dd>Less than 2,000 mg</dd></dl>
      <p class="tiny muted">Sugars and saturated-fat limits each use 10% of your entered calories. Fibre, produce and sodium use general adult guidance. These are reference amounts; the food log tracks calories, protein, carbs and fat.</p>
      <a class="tiny" href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank" rel="noopener noreferrer">WHO healthy diet guidance</a>
    </details>
  </div>`;
}

function recommendationCard(rec) {
  if (!rec.available) return `<div class="recommendation"><h3>Your recommendation</h3><p class="small">${esc(rec.reason)}</p></div>`;
  const goalLabel = rec.bulk?.label || { lose: 'Gradual fat loss', maintain: 'Maintain weight', gain: 'Gradual weight gain' }[rec.goal];
  const adjustmentLabel = rec.goal === 'lose' ? '10% deficit (up to 300 kcal)' : `${rec.bulk?.percent ?? 5}% surplus (up to ${rec.bulk?.maxKcal ?? 200} kcal)`;
  return `<div class="recommendation" data-recommendation>
    <div class="small muted">Based on your saved profile and burn settings</div>
    <h3>${esc(rec.style.label)}</h3>
    <p class="small">${goalLabel}</p>
    <div class="recommendation-stats num">
      <div><b>${fmt(rec.targets.kcal)}</b><span>kcal / day</span></div>
      <div><b>${fmt(rec.targets.protein)} g</b><span>protein</span></div>
      <div><b>${fmt(rec.targets.carbs)} g</b><span>carbs</span></div>
      <div><b>${fmt(rec.targets.fat)} g</b><span>fat</span></div>
    </div>
    ${rec.floorApplied ? '<p class="small">The calorie target was raised to the app’s lower limit; it may not produce weight loss.</p>' : ''}
    <button class="btn btn-primary btn-block" type="button" data-fill-targets>Fill suggested targets</button>
    <p class="tiny muted">Opens the target fields for review. Save targets to apply.</p>
    <details class="guidance"><summary>Advanced view: recommendation details</summary>
      <p class="small">Using ${fmt(rec.weight, 1)} kg (recent 7-day average when available).</p>
      ${rec.automaticStyle ? `<p class="small">${rec.style.id === 'protein' ? 'Suggested because you plan regular strength training while changing weight.' : 'Suggested as a varied everyday eating pattern for your current goal.'} You can choose a different diet style in Profile → Advanced view.</p>` : ''}
      <p class="small">Estimated maintenance: <b>${fmt(rec.maintenance)} kcal/day</b>, including ${rec.strengthDays} lifting days and ${fmt(rec.cardioMinutes)} jog minutes per week. ${rec.goal === 'maintain' ? 'The starting target matches maintenance.' : `The starting target uses a ${adjustmentLabel}.`}</p>
      ${rec.bulk ? `<p class="small">${esc(rec.bulk.label)} adds about <b>${fmt(rec.targets.kcal - rec.maintenance)} kcal/day</b> above estimated maintenance. Light bulking is the smaller starting surplus; heavy bulking adds more calories and can increase fat gain. Review your weight trend and training recovery after 2–3 weeks.</p>` : ''}
      ${Math.abs(rec.base - rec.suggestedBase) > 20 ? `<p class="small">Your saved everyday burn is ${fmt(rec.base)} kcal; your profile estimate is ${fmt(rec.suggestedBase)} kcal. Review <a href="#/settings/burn">Calorie burn</a> if your activity or profile has changed.</p>` : ''}
      <p class="small">Protein starts at ${rec.proteinPerKg} g/kg; fat is about 30% of calories and carbs fill the rest.${rec.proteinCapped ? ' Protein is capped at 30% of calories to leave room for other nutrients.' : ''}</p>
      <p class="small">Use Pinggang Pinoy: half your plate vegetables and fruit, about one-third rice or alternatives, and one-sixth fish or other protein foods. Adjust portions to your daily targets.</p>
      ${rec.meals.map((line) => `<p class="small">${esc(line)}</p>`).join('')}
      <p class="small">Choose water often; favor minimally processed foods and limit salty sauces and sugary drinks. Build toward 150–300 minutes of moderate activity (or 75–150 vigorous minutes) weekly, plus strength work on at least 2 days.</p>
      <p class="tiny muted">These are adult starting estimates, not a prescribed diet. Review your weight trend, hunger and recovery after 2–3 weeks. Activity factors, calorie adjustments, 30% fat and the 1,200 / 1,500 kcal lower limits are planner choices; no single diet is best for everyone.</p>
      <ul class="source-links small">
        <li><a href="https://www.fnri.dost.gov.ph/images/sources/PinggangPinoy-Adult.pdf" target="_blank" rel="noopener noreferrer">DOST-FNRI: Pinggang Pinoy adult guide</a></li>
        <li><a href="https://www.who.int/news-room/fact-sheets/detail/healthy-diet" target="_blank" rel="noopener noreferrer">WHO: healthy diet</a></li>
        <li><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" target="_blank" rel="noopener noreferrer">ISSN: protein for healthy exercising adults (1.4–2.0 g/kg)</a></li>
        <li><a href="https://www.who.int/publications/i/item/9789240015128" target="_blank" rel="noopener noreferrer">WHO: physical activity guidelines</a></li>
        <li><a href="https://link.springer.com/article/10.1186/s40798-023-00651-y" target="_blank" rel="noopener noreferrer">Energy-surplus study: larger surpluses can increase fat gain</a></li>
      </ul>
    </details>
  </div>`;
}

export function render(root, ctx, params = []) {
  const { state } = ctx;
  const p = state.profile, t = state.targets, b = state.burn;
  const weight = currentWeight(state, todayISO());
  const hasStats = profileComplete(p);
  const canEstimate = hasStats && num(p.age) >= 18 && p.nutritionContext !== 'special';
  const bmr = canEstimate ? bmrMifflin({ ...p, weightKg: weight }) : null;
  const suggested = canEstimate ? suggestBaseKcal(p, weight) : null;
  const activity = ACTIVITY_LEVELS.find((a) => a.id === p.activityLevel) || ACTIVITY_LEVELS[1];
  const rec = dailyRecommendation(state, todayISO());
  const planned = workoutPlanSummary(state, todayISO());
  const strengthExtra = Math.max(0, num(b.strengthMet) - 1) * weight * num(b.strengthMinutes) / 60;
  const cardioExtra = Math.max(0, num(b.jogMet) - 1) * weight * (planned?.cardioMinutes ?? num(p.cardioMinutes)) / 60;
  const weeklyStrength = planned ? Math.max(0, num(b.strengthMet) - 1) * weight * planned.strengthMinutes / 60 : num(p.strengthDays) * strengthExtra;
  const weeklyBurn = num(b.baseKcal) + (weeklyStrength + cardioExtra) / 7;
  const macroSum = num(t.protein) * 4 + num(t.carbs) * 4 + num(t.fat) * 9;

  const mode = getThemeMode();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const lastBackup = getLastBackup();
  const backupDays = lastBackup ? diffDays(lastBackup.slice(0, 10), todayISO()) : null;

  root.innerHTML = `
    <nav class="chips settings-shortcuts" aria-label="Settings sections">
      <a class="chip" href="#/settings/profile" data-jump="profile-settings">Profile</a>
      <a class="chip" href="#/settings/targets" data-jump="target-settings">Daily targets</a>
      <a class="chip" href="#/settings/burn" data-jump="burn-settings">Calorie burn</a>
      <a class="chip" href="#/settings/backup" data-jump="backup-settings">Backup</a>
    </nav>
    <section class="card">
      <div class="card-head"><h2>Appearance</h2><span class="badge neutral">Version ${APP_VERSION}${ctx.native ? ' · Android' : ''}</span></div>
      <div class="radio-row" role="radiogroup" aria-label="Theme">
        ${THEME_OPTIONS.map(([v, l]) => `<label><input type="radio" name="theme" value="${v}" ${mode === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      </div>
    </section>

    <section class="card" id="profile-settings" data-form="profile">
      <div class="card-head"><h2>Profile</h2></div>
      <div class="grid2">
        ${field('age', 'Age', p.age, 'inputmode="numeric"')}
        <label class="field"><span>Sex</span><select class="input" name="sex">${p.sex ? '' : '<option value="" selected>Choose…</option>'}<option value="male" ${p.sex === 'male' ? 'selected' : ''}>Male</option><option value="female" ${p.sex === 'female' ? 'selected' : ''}>Female</option></select></label>
        ${field('heightCm', 'Height (cm)', p.heightCm)}
        ${field('startWeightKg', 'Starting weight (kg)', p.startWeightKg)}
        ${field('goalWeightKg', 'Goal / checkpoint (kg)', p.goalWeightKg)}
      </div>
      <div class="stack profile-preferences">
        ${select('goalMode', 'Nutrition goal', p.goalMode, [['auto', 'Use my current and goal weight'], ['lose', 'Gradual fat loss'], ['maintain', 'Maintain weight'], ['gain', 'Bulking / weight gain']])}
        <div class="stack bulking-options" data-bulking-options ${p.goalMode === 'gain' ? '' : 'hidden'}>
          ${select('bulkIntensity', 'Bulking intensity', p.bulkIntensity || 'light', BULK_INTENSITIES.map((x) => [x.id, `${x.label} · +${x.percent}% (up to ${x.maxKcal} kcal/day)`]))}
          <p class="tiny muted">Choose a smaller or larger calorie surplus for bulking.</p>
        </div>
        ${select('activityLevel', 'Everyday movement (outside workouts)', activity.id, ACTIVITY_LEVELS.map((a) => [a.id, a.label]))}
        ${select('nutritionContext', 'Nutrition guidance', p.nutritionContext, [['general', 'General adult fitness'], ['special', 'Pregnancy, breastfeeding or a diet-related condition']])}
      </div>
      <details class="guidance"><summary>Advanced view: profile options</summary><div class="stack profile-preferences">
        <div class="grid2">${field('startWaistCm', 'Starting waist (cm)', p.startWaistCm)}${field('waistGoalCm', 'Waist goal (cm)', p.waistGoalCm)}</div>
        <p class="muted tiny">${num(p.heightCm) > 0 ? `Waist under half your height (${fmt(num(p.heightCm) / 2, 1)} cm) is a useful long-term health marker. ` : ''}Waist fields are optional.</p>
        ${select('dietStyle', 'Preferred diet style', p.dietStyle, DIET_STYLES.map((d) => [d.id, d.label]))}
        ${planned ? `<input type="hidden" name="strengthDays" value="${p.strengthDays}"><input type="hidden" name="cardioMinutes" value="${p.cardioMinutes}"><p class="small">Your workout plan supplies <b>${planned.strengthDays} lifting days</b> and <b>${planned.cardioMinutes} cardio minutes</b> per week. <a href="#/workout/plan">Update workout plan</a></p>` : `<div class="grid2">${field('strengthDays', 'Planned lifting days / week', p.strengthDays, 'type="number" min="0" max="7" step="1" inputmode="numeric"')}${field('cardioMinutes', 'Planned jog minutes / week', p.cardioMinutes, 'type="number" min="0" max="1260" inputmode="numeric"')}</div><p class="muted tiny">Planned sessions help estimate maintenance. <a href="#/workout/plan">Choose a workout plan</a> to set your weekly schedule.</p>`}
      </div></details>
      <button class="btn btn-primary" style="margin-top:8px" data-save="profile">Save profile</button>
    </section>

    <section class="card" id="target-settings" data-form="targets">
      <div class="card-head"><h2>Daily targets</h2></div>
      <p class="small muted saved-targets num">Saved: ${fmt(t.kcal)} kcal · P ${fmt(t.protein)} · C ${fmt(t.carbs)} · F ${fmt(t.fat)} g</p>
      ${recommendationCard(rec)}
      <details class="guidance" data-target-editor><summary>Advanced view: edit daily targets</summary>
      <div class="grid2">
        ${field('kcal', 'Calories (kcal)', t.kcal)}
        ${field('protein', 'Protein (g)', t.protein)}
        ${field('carbs', 'Carbs (g)', t.carbs)}
        ${field('fat', 'Fat (g)', t.fat)}
      </div>
      <p class="muted tiny" style="margin-top:6px" data-macro-total>Macros add up to ${fmt(macroSum)} kcal.</p>
      <div data-calorie-intake aria-live="polite">${enteredIntakeCard(intakeForCalories(state, todayISO(), t.kcal))}</div>
      <p class="small" data-target-feedback aria-live="polite"></p>
      <button class="btn btn-primary" style="margin-top:8px" data-save="targets">Save targets</button>
      </details>
    </section>

    <details class="card settings-panel" id="burn-settings" data-form="burn">
      <summary>Calorie burn estimate <span>Advanced view</span></summary>
      <div class="settings-panel-body">
      ${field('baseKcal', 'Everyday burn without workouts (kcal)', b.baseKcal)}
      <p class="small">${canEstimate ? `From your profile: resting burn ≈ <b>${fmt(bmr)} kcal</b> × ${activity.factor} for daily movement = <b>${fmt(suggested)} kcal/day</b>.` : 'Complete an adult profile to see a suggested everyday burn.'}</p>
      ${canEstimate ? `<button class="btn btn-sm" type="button" data-suggest>Fill ${fmt(suggested)} kcal from my profile</button>` : ''}
      <div class="grid2 profile-preferences">
        ${select('strengthPreset', 'Lifting intensity preset', '', [['', 'Choose preset…'], ['3.5', 'Multiple exercises · 3.5 MET'], ['6', 'Vigorous lifting · 6 MET']])}
        ${select('jogPreset', 'Jog intensity preset', '', [['', 'Choose preset…'], ['6', 'Walk / jog mix · 6 MET'], ['7.5', 'General jogging · 7.5 MET'], ['8.5', 'Running 8 km/h · 8.5 MET']])}
        ${field('strengthMinutes', 'Lifting session length (min)', b.strengthMinutes)}
      </div>
      <details class="guidance"><summary>Advanced burn settings</summary><div class="grid2 profile-preferences">
        ${field('kcalPerKg', 'kcal per kg of body weight', b.kcalPerKg)}
        ${field('strengthMet', 'Lifting intensity (MET)', b.strengthMet)}
        ${field('jogMet', 'Jog intensity (MET)', b.jogMet)}
      </div></details>
      <p class="small" style="margin-top:8px" data-burn-preview aria-live="polite">Saved settings: rest day ${fmt(b.baseKcal)} kcal · full lifting session +${fmt(strengthExtra)} kcal · planned weekly average ${fmt(weeklyBurn)} kcal/day.</p>
      <p class="muted tiny">Workouts add (MET − 1) × ${fmt(weight, 1)} kg × hours, only when ticked done. Everyday movement excludes these sessions, so exercise is counted once. MET values and the 7,700 kcal/kg conversion are estimates; session effort and recovery vary.</p>
      <p class="tiny"><a href="https://pacompendium.com/conditioning-exercise/" target="_blank" rel="noopener noreferrer">Compendium: lifting METs</a> · <a href="https://pacompendium.com/running/" target="_blank" rel="noopener noreferrer">Jogging METs</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noopener noreferrer">Mifflin-St Jeor study</a></p>
      <div class="row wrap" style="margin-top:8px">
        <button class="btn btn-primary" data-save="burn">Save burn settings</button>
      </div>
      </div>
    </details>

    <details class="card settings-panel">
      <summary>Supplements <span>${state.supplements.length} saved · Advanced view</span></summary>
      <div class="settings-panel-body">
      <div class="card-head"><div><h2>Supplements</h2><div class="sub">Calories from shakes are counted automatically when ticked</div></div>
        <button class="btn btn-sm btn-primary" data-addsupp>+ Add</button></div>
      <ul class="list">${state.supplements.map((s) => `<li><button class="item" data-supp="${esc(s.id)}">
        <span class="grow"><span class="title">${esc(s.name)}</span> <span class="badge neutral">${esc(scheduleLabel(s))}</span><br>
          <span class="meta">${esc(s.dose || '')}${num(s.kcal) ? ` · ${fmt(s.kcal)} kcal · P ${fmt(s.protein)} g` : ''}</span></span><span class="muted">›</span></button></li>`).join('')}</ul>
      </div>
    </details>

    <details class="card settings-panel">
      <summary>My foods <span>${state.customFoods.length} saved · Advanced view</span></summary>
      <div class="settings-panel-body">
      <p class="small">Add, edit or delete your own food types (raw or cooked) in <a href="#/food/foods">Food → My Foods</a>. You have ${state.customFoods.length} custom food${state.customFoods.length === 1 ? '' : 's'}.</p>
      </div>
    </details>

    <section class="card" id="backup-settings">
      <div class="card-head"><div><h2>Backup</h2><div class="sub">Your data is saved only on this device</div></div></div>
      <div class="row wrap">
        <button class="btn btn-primary" data-export>Back up now</button>
        <label class="btn">Import backup<input type="file" accept="application/json,.json" data-import hidden></label>
      </div>
      <p class="small" style="margin-top:8px">Last backup: <b>${lastBackup ? `${esc(fmtLongDate(lastBackup.slice(0, 10)))}${backupDays === 0 ? ' (today)' : ` (${backupDays} day${backupDays === 1 ? '' : 's'} ago)`}` : 'never'}</b></p>
      <details class="guidance"><summary>Advanced view: backup &amp; reset</summary>
        <p class="muted tiny">On a phone, Back up opens the share menu so you can save the file to Files, Google Drive or send it to yourself. Use Import to move your history to another phone or browser. ${Object.keys(state.days).length} day(s) stored.</p>
        <button class="btn btn-danger" style="margin-top:8px" data-reset>Reset everything</button>
      </details>
    </section>

    ${ctx.native ? `<section class="card"><div class="card-head"><h2>Android app</h2></div><p class="small">Works offline. To transfer your web planner data, export a backup from the website and import it here.</p></section>` : `<details class="card settings-panel">
      <summary>Install on your phone <span>Advanced view</span></summary>
      <div class="settings-panel-body">
      <div class="card-head"><h2>Install on your phone</h2>${ctx.installPrompt && !standalone ? '<button class="btn btn-sm btn-primary" data-install>Install app</button>' : ''}</div>
      ${standalone ? '<p class="small"><span class="status good">Installed</span> You’re using the installed app. It works offline.</p>' : `
      <p class="small"><b>Android (Chrome):</b> ${ctx.installPrompt ? 'tap <b>Install app</b> above, or ' : ''}menu ⋮ → <i>Install app</i> / <i>Add to Home screen</i>.<br>
      <b>iPhone (Safari):</b> Share → <i>Add to Home Screen</i>.</p>
      <p class="muted tiny">Works offline once installed. Installing needs the app to be opened from an https:// address (or localhost on a computer).</p>`}
      <p class="muted tiny">This is a general fitness tool based on your plan, not medical advice. If you have kidney or liver disease, ask your doctor before increasing protein or taking creatine.</p>
      </div>
    </details>`}`;

  const goalInput = root.querySelector('[name=goalMode]');
  goalInput.addEventListener('change', () => {
    root.querySelector('[data-bulking-options]').hidden = goalInput.value !== 'gain';
  });

  function showSection(id, behavior = 'smooth') {
    const target = root.querySelector(`#${id}`);
    if (!target) return;
    if (target.tagName === 'DETAILS') target.open = true;
    for (let parent = target.parentElement; parent && parent !== root; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    target.scrollIntoView({ behavior, block: 'start' });
  }

  // ----- Save handlers -----
  root.querySelectorAll('[data-save]').forEach((btn) => btn.addEventListener('click', () => {
    const which = btn.dataset.save;
    const form = root.querySelector(`[data-form="${which}"]`);
    const v = formValues(form);
    let next;
    try { next = parseSettings(which, v); }
    catch (err) { toast(err.message); return; }
    const target = which === 'profile' ? state.profile : which === 'targets' ? state.targets : state.burn;
    const firstProfile = which === 'profile' && !profileComplete(state.profile);
    Object.assign(target, next);
    if (firstProfile && next.age >= 18 && next.nutritionContext === 'general' && state.burn.baseKcal === DEFAULT_BURN.baseKcal) state.burn.baseKcal = suggestBaseKcal(state.profile, next.startWeightKg);
    ctx.save();
    toast('Saved');
    ctx.render();
  }));

  root.querySelector('[data-suggest]')?.addEventListener('click', () => {
    root.querySelector('[name=baseKcal]').value = suggested;
    updateBurnPreview();
    toast('Profile estimate filled. Save burn settings to apply.');
  });

  root.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => {
    e.preventDefault();
    showSection(a.dataset.jump);
  }));
  const targetForm = root.querySelector('[data-form=targets]');
  const updateMacroTotal = () => {
    const v = formValues(targetForm);
    const total = num(v.protein) * 4 + num(v.carbs) * 4 + num(v.fat) * 9;
    targetForm.querySelector('[data-macro-total]').textContent = `Macros add up to ${fmt(total)} kcal.${Math.abs(total - num(v.kcal)) > 50 ? ' Check the calories or macro amounts: they differ by more than 50 kcal.' : ''}`;
    targetForm.querySelector('[data-calorie-intake]').innerHTML = enteredIntakeCard(intakeForCalories(state, todayISO(), v.kcal));
  };
  targetForm.querySelector('[data-calorie-intake]').addEventListener('click', (event) => {
    if (!event.target.closest('[data-fill-calorie-macros]')) return;
    const suggestion = intakeForCalories(state, todayISO(), targetForm.querySelector('[name=kcal]').value);
    if (!suggestion.available) return;
    for (const key of ['protein', 'carbs', 'fat']) targetForm.querySelector(`[name=${key}]`).value = suggestion.targets[key];
    updateMacroTotal();
    targetForm.querySelector('[data-target-feedback]').textContent = 'Macros filled for your calorie target. Save targets to apply.';
  });
  targetForm.querySelectorAll('input').forEach((input) => input.addEventListener('input', updateMacroTotal));
  targetForm.querySelector('[name=kcal]').addEventListener('input', () => {
    targetForm.querySelector('[data-target-feedback]').textContent = 'Calories changed. Fill the matching macros or enter your own before saving.';
  });
  root.querySelector('[data-fill-targets]')?.addEventListener('click', () => {
    targetForm.querySelector('[data-target-editor]').open = true;
    for (const [key, value] of Object.entries(rec.targets)) targetForm.querySelector(`[name=${key}]`).value = value;
    updateMacroTotal();
    targetForm.querySelector('[data-target-feedback]').textContent = 'Suggestion filled. Review the amounts and Save targets to apply.';
    targetForm.querySelector('[data-target-editor]').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  const burnForm = root.querySelector('[data-form=burn]');
  function updateBurnPreview() {
    try {
      const next = parseSettings('burn', formValues(burnForm));
      const extra = Math.max(0, next.strengthMet - 1) * weight * next.strengthMinutes / 60;
      const cardio = Math.max(0, next.jogMet - 1) * weight * (planned?.cardioMinutes ?? num(p.cardioMinutes)) / 60;
      const strength = planned ? Math.max(0, next.strengthMet - 1) * weight * planned.strengthMinutes / 60 : num(p.strengthDays) * extra;
      const avg = next.baseKcal + (strength + cardio) / 7;
      burnForm.querySelector('[data-burn-preview]').textContent = `Preview: rest day ${fmt(next.baseKcal)} kcal · full lifting session +${fmt(extra)} kcal · planned weekly average ${fmt(avg)} kcal/day. Save burn settings to apply.`;
    } catch (err) { burnForm.querySelector('[data-burn-preview]').textContent = err.message; }
  }
  burnForm.querySelectorAll('input').forEach((input) => input.addEventListener('input', updateBurnPreview));
  for (const [preset, name] of [['strengthPreset', 'strengthMet'], ['jogPreset', 'jogMet']]) {
    burnForm.querySelector(`[name=${preset}]`).addEventListener('change', (e) => {
      if (e.target.value) burnForm.querySelector(`[name=${name}]`).value = e.target.value;
      updateBurnPreview();
    });
  }

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

  const section = { profile: 'profile-settings', targets: 'target-settings', burn: 'burn-settings', backup: 'backup-settings' }[params[0]];
  if (section) requestAnimationFrame(() => showSection(section, 'auto'));
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
