# Calorie & Exercise Planner

An installable phone app (PWA) built around the **Lean Muscle & Fat-Loss Plan · 1,900 kcal · 5-day split**.

- **Food log:** enter what you eat **in grams, raw or cooked**. Calories and protein, carbs and fat are calculated for you.
- **Your own foods:** add any food type by typing the values from the label (per 100 g or per serving), marked as raw or cooked.
- **Food history:** see past days, averages for the last 7 or 30 days, and how often you hit your targets. You can also look up when you ate a particular food.
- **Supplements:** daily checklist (creatine, protein shake, Centrum, backup 2nd shake) with streaks and 30-day history. Shakes count toward your calories automatically.
- **Workouts:** the plan's Mon–Fri split with sets × reps, kg/reps per set, last-time values and a "add weight" hint, plus Saturday jogs.
- **Workout history:** past sessions, a weekly summary, a 5-week calendar and a strength chart for each exercise.
- **Expected weight change:** your kcal per day and kg per week, the date you'd reach your goal weight, a weight chart with a 7-day average, and the plan's adjustment alerts.

On first launch the app asks for your stats (age, height, weight, goal, waist). They are stored **only on your device** (browser storage), never in the code. Use **Settings → Export backup** regularly.

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
| Built-in foods | Cooked values for the plan's foods come from the plan's food table. Raw values and extra Filipino foods are typical USDA/FNRI figures. Brand labels are more accurate, so add your own foods for those. |
| Daily burn | everyday burn (BMR × 1.4 from your stats, Mifflin-St Jeor) + lifting `(MET 3.5 − 1) × kg × 1 h × share of exercises done` + jog `(MET 7 − 1) × kg × hours`. All of these can be changed in Settings. |
| Expected change | `(eaten − burned) ÷ 7,700 kcal per kg`. The weekly pace averages the last 7/14/28 days **that have food logged**. Days with no log are skipped, not counted as 0 kcal. |
| Goal date | (current 7-day average weight − goal weight) ÷ weekly pace |

These are estimates. Water, salt and creatine move the scale, so go by the weekly average and your waist. This is a general fitness tool, not medical advice.

## Project layout

```
index.html, manifest.webmanifest, sw.js   app shell, install manifest, offline cache
css/styles.css                            mobile-first styles (light & dark)
js/app.js                                 router + date selector
js/plan.js                                targets, workout split, supplements from the PDF
js/foods.js                               built-in food database (raw & cooked per 100 g)
js/calc.js                                all calculations (unit-tested)
js/store.js                               saving, backup export/import
js/chart.js                               SVG chart with hover tooltip
js/views/*.js                             Today, Food, Workout, Progress, Settings screens
tests/calc.test.mjs                       npm test
tools/make-icons.mjs                      regenerates the PNG icons
server.mjs                                local test server
```

After changing app files for a hosted version, bump `CACHE` in `sw.js` (for example `planner-v2`) so installed phones drop the old offline copy.
