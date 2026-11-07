# Calorie & Exercise Planner

An installable phone app (PWA) built around the **Lean Muscle & Fat-Loss Plan · 1,900 kcal · 5-day split**.

The original plan remains the starting preset. **Settings → Daily targets** now offers profile-based suggestions for gradual fat loss, maintenance or gradual weight gain. Diet style defaults to a profile-based suggestion; balanced Filipino, higher-protein and plant-forward preferences are also available. Fill the suggested values, review them and save to apply. Recommendations use your saved burn settings, planned weekly exercise and recent weight; they do not change your logged workouts. On your first profile save, the untouched default burn is personalized automatically; existing custom burn settings stay in place.

**Settings → Calorie burn** includes everyday movement levels, lifting/jogging presets, a live preview and advanced controls. Food search accepts Filipino names such as **kanin, itlog, tokwa, togue and monggo**, with quick filters and 14 additional Filipino foods. The new entries show state-specific DOST-FNRI sources and preparation notes. [Nutrition sources and calculation choices](docs/nutrition-sources.md).

- **Food log:** enter what you eat **in grams, raw or cooked**. Calories and protein, carbs and fat are calculated for you. Portion buttons (e.g. "2 eggs · 100 g", "1 cup cooked rice") fill in the grams, the meal is picked from the time of day, and a deleted item can be undone.
- **Your own foods:** add any food type by typing the values from the label (per 100 g or per serving), marked as raw or cooked.
- **Food history:** see past days, averages for the last 7 or 30 days, and how often you hit your targets. You can also look up when you ate a particular food.
- **Supplements:** checklist with a schedule for each one: every day, every N days (e.g. every 2 days), certain weekdays, or only when needed. Streaks and the 30-day history follow the schedule (taken / missed / not due). Shakes count toward your calories automatically.
- **Workouts:** the plan's Mon–Fri split with sets × reps, kg/reps per set, last-time values, a "Same as last time" button and an "add weight" hint, plus Saturday jogs.
- **Workout history:** past sessions, a weekly summary, a 5-week calendar and a strength chart for each exercise.
- **Expected weight change:** your kcal per day and kg per week, the date you'd reach your goal weight, a weight chart with a 7-day average, and the plan's adjustment alerts.

- **Appearance:** follow your phone, or choose Light, Dark or **Sand** in Settings → Appearance. Sand uses deeper cream `#e6dfd3`, beige `#d3c4b1`, tan `#b9a38a` and slate `#50646e`. The moon/sun button switches to dark and back to your last chosen light palette.
- **Phone friendly:** the Back button/gesture closes pop-ups, works offline, and Settings has an Install button where the browser supports it.

On first launch the app asks for your stats (age, height, weight, goal, waist). They are stored **only on your device** (browser storage), never in the code. Use **Settings → Back up now** regularly (on a phone it opens the share menu so you can save the file to Files or Google Drive); the app reminds you if it has been a while.

**Food → Log → What to eat next** suggests measured portions, such as 100 g cooked chicken, based on the selected day’s remaining calories and macros. Counted shakes are included. Each suggestion is an alternative next portion: **Review & add** fills the existing food form, where you can change the grams and meal before logging it. Suggestions recalculate after you log food and stop once the calorie goal is reached.

The same recommendations appear in **Today → Calories in** after you log food or a caloric supplement. They use what you actually entered, including custom foods and edited portions, so the example meal plan is optional. Today shows one suggestion, with alternatives under **More food options**. Adding, editing or deleting food, or ticking a shake, recalculates the remaining intake and suggestions against your saved daily targets.

Choose **Settings → Profile → Nutrition goal → Bulking / weight gain** to reveal **Bulking intensity**: **Light bulk** (+5%, up to 200 kcal/day) or **Heavy bulk** (+10%, up to 400 kcal/day). Other goals hide that control; an automatic weight-gain goal uses the smaller gradual-gain surplus. Save your profile, then **Fill suggested targets → Save targets**. Existing saved targets are kept until you apply a suggestion. The version number appears in **Settings → Appearance**.

Settings keeps the main controls visible and puts optional profile fields, calculation details, manual targets, burn settings, supplements, custom-food management and installation help in expandable **Advanced view** sections. Filling suggested targets opens the editor for review; settings shortcuts open the relevant section.

## Run it on your computer

Needs [Node.js](https://nodejs.org) (no `npm install`, there are no dependencies).

```bash
npm start
```

Then open http://localhost:5173. On the same Wi-Fi your phone can open the `http://192.168.x.x:5173` address printed in the terminal. That works for trying it out, but installing and offline use need HTTPS (see below).

## Put it on your phone (install + offline)

Phones only install web apps served over **HTTPS**. The easiest free option is GitHub Pages or Netlify:

1. Upload these files and folders: `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/`, `icons/`.
2. Open the https:// address on your phone.
3. **Android (Chrome):** menu ⋮ → *Install app*. **iPhone (Safari):** Share → *Add to Home Screen*.

Data does not sync between devices. To move it, use Export backup on one device and Import backup on the other.

## How the numbers work

| What | How |
|---|---|
| Food | `value per 100 g × grams ÷ 100`, using the raw or cooked values you picked |
| Built-in foods | Original entries retain the plan's table and approximate USDA/FNRI-style values. The 14 new Filipino entries use linked PhilFCT references for each available preparation. Branded and home-cooked foods vary; use a product label or your own recipe values when available. |
| Daily burn | saved everyday burn + lifting `(MET − 1) × kg × hours × share of exercises done` + jog `(MET − 1) × kg × hours`. A suggested everyday burn uses Mifflin-St Jeor × 1.2 / 1.4 / 1.6 / 1.8 for movement outside workouts. Workouts count only when completed. |
| Suggested targets | saved everyday burn + planned weekly exercise ÷ 7, then a modest goal adjustment. This is separate from actual logged daily burn. Diet and macro assumptions are explained in Settings and the nutrition notes. |
| Expected change | `(eaten − burned) ÷ 7,700 kcal per kg`. The weekly pace averages the last 7/14/28 days **that have food logged**. Days with no log are skipped, not counted as 0 kcal. |
| Goal date | (current 7-day average weight − goal weight) ÷ weekly pace |

These are estimates. Water, salt and creatine move the scale, so go by the weekly average and your waist. This is a general fitness tool, not medical advice.

Automatic nutrition targets are limited to generally healthy adults and are withheld for under-18s, pregnancy/breastfeeding or diet-related conditions, BMI below 18.5 or at least 40, or a goal below BMI 18.5. Manual tracking remains available.

## Android APK feasibility

An APK is feasible using Capacitor to package the existing HTML/CSS/JavaScript with the app. No framework rewrite or backend is needed for the current features. Native backup/share, persistent storage, Android Back behavior and device testing need additional work. An APK has **not** been built in this update. See the [Android feasibility and implementation checklist](docs/android-feasibility.md).

## Project layout

```
index.html, manifest.webmanifest, sw.js   app shell, install manifest, offline cache
css/styles.css                            mobile-first styles (light & dark)
js/app.js                                 router + date selector
js/plan.js                                targets, workout split, supplements from the PDF
js/foods.js                               built-in food database (raw & cooked per 100 g)
js/calc.js                                all calculations (unit-tested)
js/recommendations.js                     profile-based diet and target suggestions
js/settings-model.js                      whole-section settings validation
js/store.js                               saving, backup export/import
js/chart.js                               SVG chart with hover tooltip
js/views/*.js                             Today, Food, Workout, Progress, Settings screens
tests/calc.test.mjs                       npm test
tests/recommendations.test.mjs            recommendations, validation, foods and offline coverage
tools/make-icons.mjs                      regenerates the PNG icons
server.mjs                                local test server
```

After changing app files for a hosted version, bump `CACHE` in `sw.js` (for example `planner-v2`) so installed phones drop the old offline copy.
