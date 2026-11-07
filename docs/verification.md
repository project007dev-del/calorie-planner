# Change verification: v1.7.0

Checked 7 November 2026 for program continuation, clickable movement guides and the new Sand palette.

## Automated checks

- `npm test`: 78 passing, 0 failing.
- `npm run android:sync`: bundled assets compile and synchronize with Capacitor; native version 1.7.0 / 10700.
- Offline-shell coverage includes every app module and all 24 movement images.

New tests cover resuming at a chosen week/day without creating logs or burn, recovery-day sequencing and week rollover, dated revisions, custom routines, JSON backup restoration, unchanged logged sessions, invalid positions, return to calendar mode and legible PNG resources. Existing nutrition, macro, food, storage, plan and completion tests pass.

## Browser and visual checks

Used a fresh localhost:5175 origin with sample program state. No production food or workout records were changed.

- Set Week 3 / Day 3 in the original routine. Session opens Upper body - pull; History still reports no workouts logged, and workout burn remains zero.
- Updated the plan name and changed Lat pulldown to 2 x 8-10. Save and reload retain Week 3 / Day 3. The movement dialog shows the edited targets.
- Session and catalogue thumbnails open enlarged start/finish diagrams and written cues. Back closes the dialog and returns to the same screen.
- Compared all 24 extracted panels in a contact sheet; no clipped figures or labels were found. Superset guides show both curl and extension.
- Applied Sand, reloaded and confirmed the saved theme and status-bar color #3c4245. Text on the #5f6769 cards uses a lighter warm tint for readable contrast.
- Checked the phone layout at a requested 390 x 844 viewport; effective content width is 375 px with the scrollbar. No horizontal document overflow was observed. Enlarged guides and instructions fit the bottom sheet.
- Stopped the local server, reloaded the program, then opened an unseen arms-superset guide. Both diagram images loaded from the offline cache with full 978 px intrinsic width.
- Checked online flows produced no browser console errors. Proof images are in ignored artifacts/ files.

## Compatibility and limits

Old plans retain weekday scheduling. Program position is optional and is included in plan revisions and backups; it never adds past completion records. Recorded sessions keep their own snapshots and nutrient history is unaffected. Cache v10 includes the guide modules and all movement images. Android copies the same assets into its offline bundle.

Physical Android/emulator installation, native sharing/import, system-bar appearance and upgrade retention still require device acceptance testing. The APK remains a debug build; production signing and store release are separate work.
