import Constants from 'expo-constants';

/** Reads the version from app.json at runtime so Splash/Login/Settings never drift from the real build number. */
export function getAppVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/** Native build number/version code - not set in app.json yet, so this reads as a placeholder
 * until a release pipeline configures `ios.buildNumber`/`android.versionCode`. */
export function getBuildNumber(): string {
  const iosBuildNumber = Constants.expoConfig?.ios?.buildNumber;
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;
  return iosBuildNumber ?? (androidVersionCode ? String(androidVersionCode) : 'Not set');
}
