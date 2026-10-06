# Notification Framework

`NotificationManager` fronts `NotificationRepository` (Mock: 5 fixed `AppNotification` records in
a module-level array; `markAsRead`/`markAllAsRead` mutate it directly). `PlatformFacade` is the
only consumer above the manager; `useNotifications` and the Settings screen's notification center
depend on the facade, never the manager or repository directly.

## No push provider, by design

There is no push-token concept, no delivery-channel field, and no Firebase/APNs/OneSignal
integration anywhere in this framework — this is an explicit standing constraint, not a gap to
close casually. `AppNotification` today represents in-app-only notifications.

## What's missing before a push provider can be added

- A `registerPushToken(token, platform)` method on `NotificationRepository` (can ship as a no-op
  seam ahead of any real integration, the same way `BackgroundSyncManager` shipped as an
  interface-only seam in Phase 9).
- A `deliveryChannel: 'PUSH' | 'LOCAL' | 'IN_APP'` field on `AppNotification`, since every
  notification is implicitly in-app-only today.

See the Production Readiness Review's Future Recommendations for sequencing this against real
backend integration.

## Backend contract (expected shape, not implemented)

```
GET  /api/v1/mobile/notifications
POST /api/v1/mobile/notifications/:id/read
POST /api/v1/mobile/notifications/push-token   { token, platform: 'ios' | 'android' }
```
