# Release Engineering

## Version management

- `app.json`'s `expo.version` (currently `1.0.0`) is the single source of truth for the
  human-facing app version, read at runtime via `Constants.expoConfig?.version` in
  `getAppVersion()` (`src/utils/appInfo.ts`) — Splash/Login/Settings all read this, so they can
  never drift from the real build.
- **Build numbers (`ios.buildNumber` / `android.versionCode`) are intentionally not set in
  `app.json`.** `eas.json`'s `cli.appVersionSource: "remote"` plus `build.production.autoIncrement:
  true` means EAS manages and increments them remotely per build — the modern, correct approach,
  not a gap. `getBuildNumber()` reads `Constants.expoConfig?.ios?.buildNumber` /
  `...android?.versionCode` and falls back to the literal string `'Not set'`; that fallback is
  what you'll see running a local dev build, not a bug — it will show a real number in any binary
  actually produced by `eas build`.
- Bumping `expo.version` for a release is a manual step (`app.json`), not automatic — do it as
  part of the release checklist below, not ad hoc mid-development.

## Environment configuration

`eas.json` build profiles now set `EXPO_PUBLIC_APP_ENV` explicitly per profile (fixed this phase —
previously unset, which meant a `preview`/internal-QA build would silently resolve to the
`production` branch of `src/config/env.ts`'s `resolveEnvironment()`, since `__DEV__` is `false` in
any non-dev build, and start hitting the throwing `Api*Repository` stubs instead of Mock data):

| Profile | `EXPO_PUBLIC_APP_ENV` | Repository factory resolves to |
|---|---|---|
| `development` | `development` | Mock |
| `preview` | `training` | Mock |
| `production` | `production` | Api (throws until real backends exist) |

**Still required before any real build**: `EXPO_PUBLIC_API_BASE_URL` is not set per-profile in
`eas.json` — it isn't safe to guess or hard-code a training/production backend URL here. Set it
via `eas secret:create` or an `.env` file consumed at build time before running an actual
`preview`/`production` build against a real backend.

## Android release configuration

- `android.package`: `com.msplassist.mobile` — set.
- `android.adaptiveIcon`: foreground/background/monochrome all set, `backgroundColor: #E6F4FE`.
- `android.predictiveBackGestureEnabled: false` — deliberately disabled; revisit once every screen
  in `MainNavigator`/`AuthNavigator` has been manually verified against predictive back's
  interrupted-transition gesture.
- No `android.versionCode` — see Version management above; this is intentional under
  `appVersionSource: "remote"`.
- Permissions requested (via plugins): camera (`expo-camera`), photo library
  (`expo-image-picker`) — both have MSPL-specific rationale strings already set in `app.json`.

## iOS release configuration

- `ios.bundleIdentifier`: `com.msplassist.mobile` — set.
- `ios.supportsTablet: true`.
- No `ios.buildNumber` — same rationale as Android's `versionCode`.
- Camera/photo-library `NSCameraUsageDescription`/`NSPhotoLibraryUsageDescription`-equivalent
  strings are supplied via the `expo-camera`/`expo-image-picker` plugin config in `app.json`, not
  hand-written in an `Info.plist` (there is no prebuilt `ios/` directory — this is a managed Expo
  project).

## CI/CD readiness

No CI pipeline exists for `mobile/` yet (no `.github/workflows` entry references it). Before
wiring one, it needs at minimum:
1. `npm ci` (mobile has its own `package-lock.json`, decoupled from the root workspace).
2. `npx tsc --noEmit`.
3. `npm test` (23 tests across 8 suites as of this phase — see [TESTING.md](./TESTING.md)).
4. `npx expo-doctor`.
5. `npx expo export --platform android` as a bundle-validation smoke check (not a real build —
   `eas build` is the actual release build step, not run here).

No deployment step is included in this checklist per this phase's explicit scope.

## Pre-release checklist

- [ ] `app.json`'s `expo.version` bumped for this release.
- [ ] `npx tsc --noEmit` — zero errors.
- [ ] `npm test` — all suites green.
- [ ] `npx expo-doctor` — zero issues.
- [ ] `npx expo export --platform android` succeeds (then delete the `dist/` output).
- [ ] `EXPO_PUBLIC_API_BASE_URL` confirmed correct for the target environment (EAS secret, not
      committed).
- [ ] No `console.log`/`console.warn`/`console.error` left in application code outside
      `src/services/observability/` (grep for it — there are none as of this phase).
- [ ] `CHANGELOG`/release notes updated (no mobile-specific changelog exists yet — see Future
      Recommendations in the Production Readiness Review).
