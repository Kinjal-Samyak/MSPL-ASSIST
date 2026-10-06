# Migrations

Generate the initial schema after entities are stable:

```bash
dotnet ef migrations add Initial \
  --project src/NimboB2B.Migrations \
  --startup-project src/NimboB2B.Api

dotnet ef database update \
  --project src/NimboB2B.Migrations \
  --startup-project src/NimboB2B.Api
```
