# Nutrition references and planner choices

Reviewed online on 7 November 2026. Recommendation text and food data are bundled with the app and work offline. Source links need an internet connection. No profile information is sent to a nutrition service.

## Guidance used

- [DOST-FNRI Pinggang Pinoy adult guide](https://www.fnri.dost.gov.ph/images/sources/PinggangPinoy-Adult.pdf): the local balanced-meal model. The app uses half vegetables/fruit, roughly one-third rice or alternatives, and one-sixth protein foods as a meal-planning guide; gram targets are separate.
- [WHO healthy diet](https://www.who.int/news-room/fact-sheets/detail/healthy-diet): variety, minimally processed foods, fruit, vegetables and moderation of salt and sugar.
- [ISSN position stand on protein and exercise](https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/): 1.4–2.0 g/kg/day is a reference range for healthy exercising adults. It does not prescribe that amount for everyone.
- [WHO physical activity guidelines](https://www.who.int/publications/i/item/9789240015128): adults should aim for 150–300 moderate or 75–150 vigorous aerobic minutes weekly and muscle strengthening on at least two days.
- [Mifflin et al., 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/): the resting-energy equation used by the original app.
- [Helms et al., 2023: small and large energy surpluses in trained lifters](https://link.springer.com/article/10.1186/s40798-023-00651-y): this small eight-week study compared maintenance, 5% and 15% surpluses; faster weight gain primarily increased fat gain. It does not establish an optimal surplus for every person. The app’s light/heavy choices and calorie caps are product defaults, not the study’s prescriptions.
- [2024 Compendium: conditioning exercise](https://pacompendium.com/conditioning-exercise/) and [running](https://pacompendium.com/running/): lifting and jogging MET presets. These represent activities, not a personalized measurement of calorie expenditure.
- [ACSM 2026 resistance-training guidance](https://acsm.org/resistance-training-guidelines-update-2026/): train the major muscle groups at least twice weekly and tailor training to consistency and recovery. The app's 2-, 3-, 4- and 5-day routines are editable planner examples, not ACSM-prescribed programs. Muscle illustrations indicate broad focus areas rather than demonstrating exercise form.

No source establishes one universally best diet. The app offers locally practical patterns and makes its calculation choices visible.

## Calculation assumptions

1. Use the last seven days' average weight, excluding future entries. Fall back to the latest weigh-in, then starting weight.
2. Suggest everyday burn using Mifflin-St Jeor × an app-selected activity factor: 1.2, 1.4, 1.6 or 1.8. These categories describe movement **outside planned exercise**. They are estimates rather than validated individual activity measurements.
3. Recommendations honor the saved everyday burn. Add planned lifting sessions and jog minutes as net exercise energy `(MET − 1) × kg × hours`, averaged over seven days. Actual daily burn still uses only workouts marked completed.
4. Goal Auto compares current and goal weight with a 0.5 kg tolerance. An explicit loss/maintain/gain preference overrides it.
5. The app's starting adjustment is −10% (maximum 300 kcal) for loss, or zero for maintenance. An automatic weight-gain goal uses +5% (maximum 200 kcal) for gradual gain. Bulking is an explicit Nutrition goal choice and reveals the intensity selector: Light bulk +5% (maximum 200 kcal), or Heavy bulk +10% (maximum 400 kcal). Other goals ignore the saved intensity while keeping it for later use. Old profiles default to Light bulk when bulking is selected. These are planner choices, not agency prescriptions; a larger surplus can increase fat gain. Round the resulting target to 10 kcal and review recent weight trends and training recovery after 2–3 weeks.
6. Suggested calories have app lower limits of 1,200 for female and 1,500 for male profiles. These are guardrails, not guarantees of nutritional adequacy. If a floor is applied, the app discloses it; weight loss is not guaranteed.
7. Diet style defaults to Recommend from my profile: suggest the higher-protein pattern for weight change with at least two planned lifting days; otherwise suggest balanced Filipino eating. This is an app inference from the profile, not a clinical judgment. A selected balanced, higher-protein or plant-forward preference overrides it. Start protein at 1.6 g/kg with planned exercise, 1.0 without it, or 1.8 for the higher-protein pattern. Cap it at 30% of calories and disclose when capped. Fat is about 30%; carbohydrates fill the remaining energy. Rounding can leave a difference of up to 2 kcal. These macro splits are planner choices.
8. Withhold automatic targets for incomplete/invalid profiles, age below 18, the special nutrition context, current BMI below 18.5 or at least 40, a goal below BMI 18.5, or estimated maintenance above 6,000 kcal/day. The upper energy threshold prompts review of unusually high burn settings. BMI is only a screening guardrail, not a diagnosis. Dietitian-set targets can still be entered manually.

Save profile and burn changes before filling a recommendation. Filling a suggestion does not save it; the user reviews it and presses Save targets. Changing diet preferences does not replace food logs or supplement choices.

## Entered calorie targets and workout plans

The advanced daily-target editor recomputes macro suggestions from the typed calories using the same protein-per-kg, 30%-fat and remaining-carbohydrate assumptions. It does not replace the entered calories with the profile's suggested calorie target. It uses the existing adult eligibility checks and an automatic-guidance range of 1,200–6,000 kcal for female profiles or 1,500–6,000 kcal for male profiles. Manually entered targets remain supported.

Expandable WHO reference amounts are at least 25 g naturally occurring fibre, at least 400 g fruit/vegetables and less than 2,000 mg sodium daily. Free sugars and saturated-fat limits each use less than 10% of the entered energy, divided by 4 or 9 kcal/g respectively. These reference nutrients are not measured by the current four-value food log. General guidance does not determine individual needs for conditions requiring a prescribed diet.

Saved workout routines supply planned lifting/cardio counts and session minutes to nutrition estimates from their effective date. Earlier dates use the relevant earlier revision. Daily completed burn uses a recorded session's duration and snapshot; planned exercise alone does not add completed burn. Backups include routine revisions and snapshots so changing a plan cannot rewrite logged exercise lists or targets.

## Food portion suggestions

Food → Log uses the selected day’s saved food entries plus counted supplements to calculate remaining calories, protein, carbohydrate and fat against saved daily targets. This feature does not set new daily targets. It offers up to three alternative next portions from familiar foods, prioritizing a protein gap, then carbohydrate, then fat, then calories. The plant-forward preference uses plant foods.

Portions use each food’s own preparation-specific per-100 g values, usually cooked weight. Oats use dry weight and fruit uses edible raw weight. Amounts round to 5 g and are bounded by a practical portion cap and the remaining calorie budget. Other macro overages are displayed; one food cannot always close every gap. Large gaps may need several meals. The suggestions stop within 10 kcal of the calorie goal, even if a macro remains below target. A suggestion opens a review form; it never automatically logs food. Food allergies and ingredient restrictions are not inferred, so choose alternatives appropriate to your needs.

## Added Filipino foods

PhilFCT release: **1 December 2019**, as identified in the online reports. All values are **per 100 g edible portion**, not whole purchased weight. Missing preparations are unavailable rather than copied from another state. Different reference databases can disagree; these additions consistently use the Philippine reports.

| Food | Preparation and source |
| --- | --- |
| Togue / mung bean sprouts | [Raw D131](https://i.fnri.dost.gov.ph/fct/library/report/3410), [boiled D132](https://i.fnri.dost.gov.ph/fct/library/report/3411) |
| Munggo, green beans | [Boiled C028](https://i.fnri.dost.gov.ph/fct/library/report/3238) |
| Ampalaya | [Raw D018](https://i.fnri.dost.gov.ph/fct/library/report/3297), [boiled D019](https://i.fnri.dost.gov.ph/fct/library/report/3298) |
| Kalabasa | [Raw D225](https://i.fnri.dost.gov.ph/fct/library/report/3504), [boiled D226](https://i.fnri.dost.gov.ph/fct/library/report/3505) |
| Okra | [Raw D139](https://i.fnri.dost.gov.ph/fct/library/report/3418) |
| Malunggay leaves | [Raw D094](https://i.fnri.dost.gov.ph/fct/library/report/3373), [boiled D095](https://i.fnri.dost.gov.ph/fct/library/report/3374) |
| Kamoteng kahoy | [Cassava, boiled, root crop table](https://i.fnri.dost.gov.ph/fct/library/food_content/B) |
| Pinya | [Fresh E073](https://i.fnri.dost.gov.ph/fct/library/report/3655) |
| Saba banana | [Raw E014, fruit table](https://i.fnri.dost.gov.ph/fct/library/food_content/E), [boiled E015](https://i.fnri.dost.gov.ph/fct/library/report/3597) |
| Galunggong | [Raw G105](https://i.fnri.dost.gov.ph/fct/library/report/4085) |
| Tinapa, galunggong | [Smoked G208](https://i.fnri.dost.gov.ph/fct/library/report/4188) |
| Sardinas in tomato sauce | [Canned, including sauce, G203](https://i.fnri.dost.gov.ph/fct/library/report/4183) |
| Turon | [Prepared E102, fruit table](https://i.fnri.dost.gov.ph/fct/library/food_content/E) |
| Banana cue | [Prepared E101, fruit table](https://i.fnri.dost.gov.ph/fct/library/food_content/E) |

Raw/boiled ingredient values exclude added oil, eggs, meat and sauce. Prepared snacks already include recipe ingredients; do not add them twice. Actual home recipes and branded canned foods can differ. Existing plan foods retain their previous values, and logged entries keep their original nutrient snapshots.
