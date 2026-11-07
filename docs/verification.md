# Change verification: v1.6.0

Checked 7 November 2026. This records the checks performed for calorie-based intake suggestions, editable workout plans and the design update.

## Automated checks

- `npm test`: **72 passing, 0 failing**.
- `npm run android:sync`: bundled assets compile and synchronize with Capacitor; native version 1.6.0 / 10600.
- `git diff --check`: passed.

New coverage checks entered-calorie macro energy and limits, invalid inputs, profile eligibility, all four workout templates, dated revisions and same-date replacement, plan validation, backup round trips, workout snapshots, preserved set logs and duration, planned versus completed burn, custom-plan nutrition estimates, and weekly goals including recovery-only routines. Existing nutrition, food, storage and completion checks also pass. The offline-shell check covers all new modules.

## Browser checks

Used fabricated profile and food data on localhost. No production food or workout records were changed.

- Entering 2,000 kcal updates the macro preview to P 144 / C 205 / F 67 g while saved targets remain unchanged. Fill these macros updates the fields; explicit Save persists matching targets after reload. A second 2,500 kcal preview and save also persists correctly.
- Previewed the 3-day routine, renamed it, changed Monday's squat sets and rep range, and changed session/cardio durations. Added and removed an exercise. Zero sets produces validation feedback without saving. Corrected targets save and survive reload.
- A later Monday session shows the saved 2 x 8-10 squat target and 50-minute session. New-plan mode opens an empty recovery week and supports changing a day to strength; Cancel preserves the saved plan.
- The catalogue search for core shows Plank and Dead bug with muscle-focus illustrations.
- Phone-width settings and workout layouts show no horizontal document overflow. Macro tiles, inputs, weekly cards and controls remain legible. The Sand active tab has readable contrast. Detailed controls remain expandable.
- Checked flows produce no browser console errors. Screenshots are saved in ignored artifacts/ files.

## Compatibility and limits

Old backups retain the original split and gain an empty routine-revision list. Logged sessions use snapshots, including exercise targets and custom duration, so later routine edits do not rewrite their history. Plans and snapshots are included in JSON backups. The service-worker cache is v9 and includes all new modules; native assets are bundled separately.

This update has not been installed or exercised on a physical Android device or emulator. Native backup sharing/import, keyboard/inset behavior and upgrade retention still require device acceptance testing, as listed in the Android build guide. The APK is a debug build; production signing and store release remain separate work.
