# Development Test Environment

## Safety

The development dataset is separately invoked and refuses to run unless `NODE_ENV` is `development`/`test`, or `MSPL_RUNTIME_ENV=training`, and `DEVELOPMENT_TEST_SEED=true`. It never runs as part of production startup or the standard seed.

## Prepare a clean development database

```powershell
cd backend
npx prisma migrate deploy
$env:NODE_ENV='development'
$env:DEVELOPMENT_TEST_SEED='true'
npm run seed:dev
npm run validate:dev
```

The idempotent seed creates Hub 1/Hub 2, URBN/HUM/M7/MVF7 model masters, three riders with active deployments, and the following development-only RBAC accounts. Existing users with these email addresses are never modified or duplicated.

| Role | Email | Default password |
| --- | --- | --- |
| Administrator | `admin@msplassist.com` | The existing administrator password (`Admin@123` unless overridden when the standard seed was run). |
| Coordinator | `coordinator@msplassist.local` | `coordinator@1234` |
| Technician | `technician@msplassist.local` | `technician@1234` |

These credentials are strictly for local development and testing. They must be changed or removed before any production deployment. Passwords are stored only as bcrypt hashes using the same configured work factor as the existing Administrator seed.

For a deployed Training environment, use a dedicated database and set `MSPL_RUNTIME_ENV=training`. Do not point a Training deployment at the Production database.

## Conversation Ticket validation

`npm run validate:dev` uses the compiled Express application to call the real `POST /api/v1/tickets/conversation` endpoint. It creates a temporary ticket using the development rider, two issue groups, rideability status, metadata, and a photo reference. It then verifies database persistence, existing ticket retrieval, ticket list visibility, and the conversation timeline activity.

Cleanup runs in `finally`: ticket activities, history, attachments, issue items, comments, notification logs, and the temporary ticket are removed. A failed cleanup causes the command to fail, so repeated runs do not silently leave test records behind.

## Scope and limitations

The current persistence model does not contain a standalone Vehicle Master or Issue Subcategory Master table. Development vehicles are represented by active deployment MV Track/vehicle values, and the existing Admin-managed issue category dataset remains the source for category tests. The script does not reset data; it only upserts its own explicitly named development records.
