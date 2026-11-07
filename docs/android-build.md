# Android app: first test build

Updated 7 November 2026. This repository contains a Capacitor 8 Android project and a GitHub Actions workflow that builds a signed **debug APK**. Physical-device and emulator acceptance checks are still required before a production Android release.

- App ID: `io.github.project007dev.calorieplanner`
- App name: Calorie & Exercise Planner
- Android minimum: API 24 (Android 7), with Android System WebView/Chrome 110 or newer
- Compile/target SDK: 36; JDK: 21; Node: 24 recommended
- Assets are bundled. No development server or GitHub Pages connection is required to open the app.

## Download the test APK

Open **Actions → Android APK** in the repository. After a successful run, download the **calorie-planner-android-debug** artifact and extract it. It contains `calorie-planner-debug.apk` and `SHA256SUMS.txt`. The workflow verifies the APK signature and prints package/version metadata before uploading it.

This is a development build, not a Play Store release. Its debug signing key is cached between workflow runs to allow test updates. If that cache is evicted, the signing key can change; keep a backup before replacing a test installation. A production release needs a separately managed, stable private signing key and release testing. No signing key is committed to Git.

## Move your existing logs

1. In the existing web/PWA app, use **Settings → Backup → Back up now**.
2. In the APK, choose **Import your backup**, or **Settings → Backup → Import backup**.
3. Select the JSON backup and review the replacement confirmation.

The APK has private app storage. It does not automatically inherit data from Chrome, Firefox or the installed PWA. Imports retain the existing backup format and nutrient snapshots.

## Native behavior

- Preferences restores planner data, theme and last-backup time before startup. WebView localStorage is a working copy; native writes are ordered. A failed restore stops startup, and failed writes prompt a backup.
- Back closes sheets, navigates through history, then exits at the root after pending saves finish.
- Backups use the app cache and Android's share chooser. Import uses the file picker.
- Source links open with the native browser plugin.
- Bundled assets support first-launch offline use. Native service-worker registration is skipped; browser/PWA caching remains enabled.
- Launcher/adaptive icons reuse the planner icon. System-bar text follows the selected theme, and Capacitor handles safe-area insets.
- Android setup includes a link to import a web backup.

Preferences suits the current small JSON store; large histories or high write volume may warrant SQLite. Uninstalling or clearing app data removes native data. Android automatic cloud backup is disabled; use the explicit backup feature.

## Build locally

Install Android Studio with JDK 21 and Android SDK 36. Configure `ANDROID_HOME`/`JAVA_HOME` if needed:

```powershell
npm ci
npm test
npm run android:sync
npm run android:open
# Or compile without opening Android Studio:
npm run android:apk
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Generated `www/` and Gradle outputs are ignored by Git. The configuration script synchronizes the native version with `package.json`.

## Device acceptance checks pending

- Fresh install in airplane mode; all five screens and food data available.
- Import a real backup and check food history, supplements, workouts, themes and body entries.
- Restart, background and update without losing logs.
- Test Back with stacked sheets, tabs, root exit and predictive-back gestures.
- Export through Files/Drive, cancel sharing, and import the exported JSON.
- Check keyboard resizing, cutouts/navigation bars, large text, rotation and all themes.

References: [Capacitor setup](https://capacitorjs.com/docs/getting-started), [Android](https://capacitorjs.com/docs/android), [Preferences](https://capacitorjs.com/docs/apis/preferences), [Back handling](https://capacitorjs.com/docs/apis/app#addlistenerbackbutton-), [Filesystem](https://capacitorjs.com/docs/apis/filesystem), [Share](https://capacitorjs.com/docs/apis/share).
