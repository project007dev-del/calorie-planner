# Change verification

Checked 7 November 2026. No regressions were found in the checks below. This is a bounded verification record, not a guarantee that every browser/device or possible input is bug-free.

## Automated checks

`npm test`: **40 passing, 0 failing** (28 original checks plus 12 new checks).

New coverage includes recommendation energy/macro consistency, planned versus completed exercise, goal directions and explicit overrides, recent weight averaging, special-profile guardrails, diet preferences, calorie/protein limits, implausible burn values, everyday activity factors, atomic settings validation, old-backup compatibility, Filipino aliases/filters, unique food IDs and state-specific sources, and offline-shell file coverage.

All JavaScript/module files passed Node syntax checks. `git diff --check` passed. This app has no compilation step or runtime npm dependencies.

## Browser checks

Used an isolated `127.0.0.1` origin with fabricated sample stats so the `localhost` preview profile remained blank.

- Blank-profile guidance renders without an exception.
- Sample adult profile (30, male, 175 cm, 80 kg, 75 kg goal) personalizes the untouched default burn and produces a target recommendation.
- Filling suggestions updates the visible fields; Save targets persists them across reloads.
- Entering a changed calorie value followed by a blank fat value rejects the whole save. Reload confirms the previous calories and macros remain saved.
- Plant-forward and explicit maintenance preferences update the recommendation. The special nutrition context withholds automatic targets.
- Jogging preset selection updates the preview and saves correctly.
- Food search finds togue through “bean sprout,” rice through “kanin” and tofu through “tokwa,” including the My Foods built-in table.
- Raw/boiled togue selection updates its nutrition and source: 150 g raw is 96 kcal; 150 g boiled is 81 kcal. The cooked entry logs correctly with 7.2 g protein before display rounding.
- Filipino filters, empty search results, source details and modal Back navigation work.
- Today, Food, Workout, Progress and Settings render without browser console errors/warnings during the checked flows.
- Phone viewports of 320, 360 and 390 px were checked for document overflow; no horizontal page overflow was observed. Light and dark themes were exercised. A sample screenshot is saved in `artifacts/daily-targets-mobile.jpg` (ignored by Git).
- Stopped the local server, reloaded the app and opened recommendations: cached screens, data and the new modules still worked. Restarted the server afterward.

## Fixed issue and compatibility

The previous Settings save loop changed fields while validating them. A later invalid field could leave earlier values changed in memory and subsequently saved by another action. Settings now validates an entire section into a separate object before applying it.

Existing food values, nutrient snapshots, customized targets, burn settings and logs remain compatible. New profile preferences are filled during normalization. The service-worker cache was bumped and includes both new modules.

## Limits

No physical Android/iOS device, native APK, signed build or store release was tested. Browser UI backup file sharing/import and native storage migration still need device verification. Online nutrition references support general estimates; recipes, food varieties and individual energy needs vary.
