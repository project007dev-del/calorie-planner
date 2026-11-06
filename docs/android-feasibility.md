# Android APK feasibility

Assessed 7 November 2026. **Feasible, with high reuse of the existing app. No APK was built.**

## Recommended route: Capacitor

This project is static HTML/CSS, ES modules and local browser storage. It has no backend, runtime npm dependencies or remote API requirement. [Capacitor supports adding its native runtime to an existing web app](https://capacitorjs.com/docs/getting-started). Bundling the public files would let the APK launch offline from its first use, without hosting. The existing calculator, food data, screens and CSS can be reused.

| Route | Fit for this app | Additional requirements |
| --- | --- | --- |
| Capacitor | Best fit for a self-contained APK, with room for native features | Android toolchain, bundled public files, native integrations and device QA |
| Trusted Web Activity / Bubblewrap | Useful if the hosted PWA is the product | HTTPS deployment, domain ownership and Digital Asset Links; web-origin storage and offline caching remain relevant |
| Install current PWA | Already supported; fastest phone installation | HTTPS hosting; does not produce an APK |

[Chrome's TWA quick start](https://developer.chrome.com/docs/android/trusted-web-activity/quick-start) describes the hosted alternative and domain verification. The recommendation above is an assessment of this repository, not a guarantee about an untested Android build.

## Toolchain check

- Node **24.18.0** is available; this meets Capacitor 8's documented Node 22+ requirement.
- `java`, `adb` and `gradle` were not found on PATH.
- Android Studio was not found at `C:\Program Files\Android\Android Studio` and an SDK was not found at `C:\Users\ACER\AppData\Local\Android\Sdk`. Custom installation locations have not been ruled out.
- There is no Capacitor configuration, Android project, signing key or installed native dependency in this repository.

The current [Capacitor environment guide](https://capacitorjs.com/docs/getting-started/environment-setup) specifies Android Studio 2025.2.1 or newer for v8 and an Android SDK; Studio provides its JDK. Use a maintained SDK/target for the intended distribution. [Android setup](https://capacitorjs.com/docs/android) documents platform creation and emulator/device testing. Platform support is distinct from the JavaScript API support required by this app; test a current Android System WebView.

## Implementation work

1. Choose a permanent application ID and install matching Capacitor major versions. Put only `index.html`, `manifest.webmanifest`, `sw.js`, `css/`, `js/` and `icons/` into a generated `www/` directory. Keep Git metadata, tests, docs and tools out of the app bundle.
2. Initialize Capacitor with `webDir: "www"`, add Android and sync. Do not configure a development `server.url` in the production APK. Include the shipped assets so the app does not depend on the local Node server.
3. Replace or adapt localStorage persistence for mobile durability. [Capacitor storage guidance](https://capacitorjs.com/docs/guides/storage) describes the caveats and Preferences/SQLite options. Preserve the existing `planner.v1` data shape and JSON import/export. Browser data will not automatically appear in a native WebView; provide backup/import migration.
4. Add native Filesystem/Share backup support and test importing JSON. The current browser share/download fallback needs device verification in a WebView.
5. Integrate Android Back with the existing modal/history behavior. The [App plugin backButton event](https://capacitorjs.com/docs/apis/app#addlistenerbackbutton-) changes default behavior when a listener is installed; test closing sheets, changing tabs and exiting at the root.
6. Skip service-worker registration in the native shell, where assets are bundled; keep PWA caching for browser deployments. Replace browser installation instructions with native-appropriate text and open source links externally.
7. Configure launcher/adaptive icons, splash screen, keyboard resizing and safe-area/system-bar behavior. Test large text, accessibility, portrait phones, tablets, rotation and dark mode.
8. Build a debug APK, install it on an emulator and a physical phone, then test restart/update persistence, first-launch offline use, backups and all five screens. Produce a signed release APK for sideloading or an AAB for a store release; keep signing keys private and outside Git. A store release also needs applicable store declarations and review.

Example commands **for a later implementation**, after staging `www/` and installing the Android toolchain:

```powershell
npm install @capacitor/core@8 @capacitor/android@8
npm install --save-dev @capacitor/cli@8
npx cap init "Calorie & Exercise Planner" "com.example.calorieplanner" --web-dir www
npx cap add android
npx cap sync android
npx cap open android
# After configuring the generated Android project:
.\android\gradlew.bat -p android assembleDebug
```

Replace the example application ID before release. These commands were not executed. This update keeps the web app dependency-free and does not install or alter system software.
