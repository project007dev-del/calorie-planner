import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const android = fileURLToPath(new URL('../android/', import.meta.url));
const windows = process.platform === 'win32';
const result = spawnSync(windows ? 'gradlew.bat' : './gradlew', ['assembleDebug', '--no-daemon'], {
  cwd: android, shell: windows, stdio: 'inherit',
});
if (result.error) console.error(result.error.message);
if (result.status !== 0) {
  console.error('Android builds require JDK 21 and Android SDK 36. You can also use the Android APK GitHub workflow.');
  process.exit(result.status || 1);
}
console.log('APK: android/app/build/outputs/apk/debug/app-debug.apk');
