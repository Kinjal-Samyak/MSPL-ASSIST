# MSPL Assist — UAT Quick Start Guide

## ✅ Project Status: Ready for UAT

All automated checks pass. Manual interactive testing required.

---

## 🚀 Quick Start (5 minutes)

### 1. Start Backend Server

```bash
cd backend
npm install  # if needed
npm start
```

**Expected Output:**
```
[startup] Starting server on port 4000
✓ Tenant ID loaded
✓ Client ID loaded  
✓ Redirect URI loaded
✓ Server listening on http://localhost:4000
```

### 2. Start Frontend Dev Server (in separate terminal)

```bash
cd frontend
npm install  # if needed
npm run dev
```

**Expected Output:**
```
  VITE v5.x.x  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

### 3. Open Browser

Navigate to: **http://localhost:5173**

---

## 🧪 Test Scenarios (15–30 minutes each)

### Test 1: Authentication Flow ⏱️ 5 min

1. Go to **http://localhost:5173/login**
2. Enter credentials: `admin@mspl.local` / `password123` (adjust for your test data)
3. Click **Sign In**
4. **✅ Expected:** Redirected to dashboard, no errors
5. Refresh page (Cmd+R or Ctrl+R)
6. **✅ Expected:** Still logged in (session persists)

**Debug if fails:**
```bash
# Check backend logs for auth errors
tail -f backend/dist/logs/app.log

# Verify JWT secret is set
node -e "require('dotenv').config(); console.log('JWT Secret:', process.env.JWT_ACCESS_SECRET ? 'SET' : 'MISSING')"
```

---

### Test 2: OAuth Authorization URL Generation ⏱️ 5 min

1. Log in (Test 1)
2. Navigate to **Settings** → **Operational Data** tab
3. Click **"Authenticate Microsoft 365"** button
4. **✅ Expected:** Browser redirects to `https://login.microsoftonline.com/...`
5. Inspect URL; verify it contains **real tenant ID** (not `<PASTE_TENANT_ID>`)

**Debug if fails:**
```bash
# Check if M365 config is loaded with real values (not placeholder)
node -e "require('dotenv').config(); const c = require('./dist/config').config; console.log('Tenant:', c.m365.tenantId)"

# Verify endpoint is reachable
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:4000/api/v1/settings/operational-data/wizard/auth/url
```

---

### Test 3: OAuth Callback ⏱️ 10 min

**Requires:** Microsoft 365 account (work or personal)

1. Continue from Test 2 (already on Microsoft login page)
2. Authenticate with **real Microsoft 365 credentials**
3. **If MFA enabled:** Complete MFA challenge
4. **✅ Expected:** Browser redirects to `http://localhost:5173/settings?graphAuth=success`
5. Settings page loads; "Graph Auth Status" shows "Authenticated"

**If fails (redirects to `?graphAuth=failed`):**
- Check **backend logs** for detailed error:
  ```bash
  grep "Authorization Callback Failed" backend/dist/logs/app.log
  grep "AADSTS" backend/dist/logs/app.log  # Microsoft error codes
  ```
- Common issues:
  - Redirect URI mismatch (should be `http://localhost:4000/api/v1/settings/operational-data/wizard/auth/callback`)
  - Client secret incorrect
  - User denied permissions
  - Expired credentials

---

### Test 4: Protected API Routes ⏱️ 5 min

1. Open **DevTools** (F12) → **Application** → **Local Storage**
2. **Delete** the `auth` entry (clears all tokens)
3. Manually navigate to: `http://localhost:4000/api/v1/admin/users`
4. **✅ Expected:** Error `{"error":"Authorization header is required."}`

**Debug if passes (should fail):**
```bash
# Verify middleware is protecting routes
curl http://localhost:4000/api/v1/admin/users
# Should return 401, not 200
```

---

### Test 5: Workbook Validation ⏱️ 10 min

**Requires:** Valid Excel workbooks shared via SharePoint

1. In Settings, paste a **valid SharePoint-shared workbook URL** for:
   - Master Workbook
   - Inventory Workbook
2. Click **"Validate Workbooks"**
3. **✅ Expected:**
   - API calls to Microsoft Graph (check Network tab)
   - Worksheets enumerated
   - Status shows "Valid" for each workbook

**If fails:**
- Verify SharePoint URL is **shared** (not private)
- Check backend logs for Microsoft Graph API errors:
  ```bash
  grep "Microsoft Graph" backend/dist/logs/app.log
  grep "403\|404" backend/dist/logs/app.log
  ```

---

### Test 6: Scheduler Runtime Observation ⏱️ 15–30 min

**Requires:** Operational data configured with auto-sync enabled

1. In Settings, enable **"Auto Sync"**
2. Set **Sync Frequency** to **"Every 5 Minutes"**
3. Click **"Save Configuration"**
4. Leave the app running; **observe backend logs**
5. **✅ Expected:** Sync events every 5 minutes (check timestamps):
   ```
   [12:00:05] Sync started (Master workbook)
   [12:00:15] Sync completed (3 rows synced)
   [12:05:08] Sync started (Master workbook)
   [12:05:18] Sync completed (3 rows synced)
   ```

**Debug if scheduler doesn't trigger:**
```bash
# Check if scheduler is running
curl http://localhost:4000/api/v1/sync/status
# Should return sync status with last sync time

# Check for advisory lock issues
npx prisma studio  # Browse ExcelSyncLog table

# Restart backend (ensures clean scheduler start)
# Ctrl+C to stop backend, then npm start
```

---

## 🔍 Monitoring Checklist During UAT

### Backend Logs

Monitor for errors:
```bash
# Terminal 1 (Backend running)
# Watch real-time logs
tail -f backend/dist/logs/app.log | grep -i "error\|failed\|unauthorized"
```

### Frontend Console

Open **DevTools** (F12) → **Console**:
- ❌ Red errors = **FAIL** (address immediately)
- ⚠️ Yellow warnings = **OK** (typically non-critical)

### Network Tab

**DevTools** → **Network** tab:
- ✅ All API calls should return 200/201/204 (success) or 401/403 (auth expected)
- ❌ Any 404 or 500 = **FAIL**
- Watch for **pending requests** (should complete within 5s)

### Database

Check data persistence:
```bash
# In backend directory
npx prisma studio

# Browse:
# - User table (should have test user)
# - MicrosoftGraphToken table (should have encrypted tokens after OAuth)
# - ExcelSyncLog table (should have sync records after sync runs)
# - AppSetting table (should have operational config)
```

---

## ⚠️ Known Limitations & Blockers

### None Currently 🎉

All critical issues resolved. Only manual testing remains.

---

## 🆘 Troubleshooting

### Backend Won't Start

```bash
# Port 4000 already in use?
lsof -i :4000
kill -9 <PID>
npm start

# Missing .env file?
cat backend/.env | head -10
# Should show: DATABASE_URL, PORT, M365_TENANT_ID, etc.

# Node/npm version issue?
node --version  # Require >=18
npm --version   # Require >=8
```

### OAuth Fails with AADSTS Error

```bash
# Check backend diagnostics
grep -A5 "Authorization Callback Failed" backend/dist/logs/app.log

# Common AADSTS codes:
# AADSTS50058 = Silent sign-in failed (try explicit login)
# AADSTS50059 = Tenant not found (verify M365_TENANT_ID)
# AADSTS65001 = User/admin denied permissions (check Azure App Registration)
```

### Frontend Can't Connect to Backend

```bash
# Is backend running on 4000?
curl http://localhost:4000/health
# Should return: {"status":"ok","application":"MSPL Assist","version":"1.0.0"}

# Frontend env correct?
cat frontend/.env | grep API_BASE_URL
# Should be: http://localhost:4000

# CORS issue? Check:
curl -H "Origin: http://localhost:5173" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS http://localhost:4000/api/v1/auth/login -v
# Should return 204 with Access-Control-Allow-Origin header
```

### Sync Not Triggering

```bash
# Is scheduler enabled?
curl http://localhost:4000/api/v1/sync/status
# Should show sync status

# Check for lock
npx prisma db execute --stdin << 'SQL'
SELECT * FROM pg_advisory_locks;
SQL

# Force clear if stuck
npx prisma db execute --stdin << 'SQL'
SELECT pg_advisory_unlock_all();
SQL

# Restart backend
# Ctrl+C, then npm start
```

---

## 📞 Support

### During UAT

1. **Check logs first:**
   ```bash
   tail -f backend/dist/logs/app.log
   # Look for errors, stack traces, diagnostics
   ```

2. **Review the audit report:**
   - `MASTER_UAT_VALIDATION_REPORT.md` — comprehensive reference

3. **Verify environment:**
   ```bash
   node -e "require('dotenv').config(); \
     console.log('DB:', process.env.DATABASE_URL ? 'SET' : 'MISSING'); \
     console.log('M365 Tenant:', process.env.M365_TENANT_ID); \
     console.log('JWT Secret:', process.env.JWT_ACCESS_SECRET ? 'SET' : 'MISSING')"
   ```

4. **Restart from clean state:**
   ```bash
   # Kill any stuck processes
   lsof -i :4000 | grep node | awk '{print $2}' | xargs kill -9
   
   # Clean rebuild
   cd backend && npm run build
   
   # Fresh start
   npm start
   ```

---

## ✅ Completion Criteria

UAT phase is complete when:

- [x] Backend builds without errors
- [x] Frontend builds without errors
- [x] Login works (Test 1)
- [x] OAuth URL generates with real credentials (Test 2)
- [x] OAuth callback succeeds (Test 3)
- [x] Protected routes enforced (Test 4)
- [x] Workbook validation works (Test 5)
- [x] Scheduler runs on schedule (Test 6)
- [x] No unhandled errors in logs
- [x] No database constraint violations
- [x] Sign-off from UAT team

---

**Document Updated:** July 14, 2026  
**Status:** ✅ Ready for UAT Entry
