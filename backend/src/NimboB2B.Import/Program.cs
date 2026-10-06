// One-shot CLI for admin seeding + one-time migration from a legacy Supabase
// deployment to the self-hosted Postgres + local file store.
//
// Commands:
//   seed-admin <email> <pw> <name>
//   create-user <email> <pw> <name> <role>
//   create-users --csv path.csv               (email,name,role,temp_password)
//   import-db  --source-conn "<pg connstr>"   (copies every business table)
//   import-files --source-url <url> --service-key <key> --bucket nimbo-files [--bucket ...]
//                                             (downloads Supabase Storage objects and
//                                              rewrites file_url columns to local URLs)
using System.Globalization;
using System.Net.Http.Headers;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using NimboB2B.Domain.Entities;
using NimboB2B.Domain.Enums;
using NimboB2B.Infrastructure.Persistence;
using Npgsql;

var cmd = args.FirstOrDefault() ?? "help";

if (cmd is "help" or "--help" or "-h")
{
    Console.WriteLine("NimboB2B.Import commands:");
    Console.WriteLine("  seed-admin  <email> <password> <name>");
    Console.WriteLine("  create-user <email> <password> <name> <role>");
    Console.WriteLine("  create-users --csv path.csv                     # CSV: email,name,role,temp_password");
    Console.WriteLine("  import-db  --source-conn \"<Supabase pg connstr>\"");
    Console.WriteLine("  import-files --source-url <url> --service-key <key> --bucket <name> [--bucket ...]");
    Console.WriteLine();
    Console.WriteLine("Env vars:");
    Console.WriteLine("  TARGET_DB   Postgres connection string for the destination .NET database.");
    Console.WriteLine("  FILE_ROOT   Local filesystem root for storage (matches LocalFileStore RootPath).");
    Console.WriteLine("  PUBLIC_URL  Public base URL of the .NET API (matches LocalFileStore PublicBaseUrl).");
    return 0;
}

var conn = Environment.GetEnvironmentVariable("TARGET_DB")
    ?? throw new InvalidOperationException("TARGET_DB env var is required (destination Postgres connection string).");
var opts = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(conn).UseSnakeCaseNamingConvention().Options;
await using var db = new AppDbContext(opts);

switch (cmd)
{
    case "seed-admin":
    case "create-user":
        return await CreateSingleUser(db, cmd, args);
    case "create-users":
        return await CreateUsersCsv(db, args);
    case "import-db":
        return await ImportDb(conn, args);
    case "import-files":
        return await ImportFiles(conn, args);
    default:
        Console.Error.WriteLine($"Unknown command: {cmd}. Try --help.");
        return 1;
}

// ─────────────────────────────────────────────────────────────────────────
// User seeding
// ─────────────────────────────────────────────────────────────────────────
static async Task<int> CreateSingleUser(AppDbContext db, string cmd, string[] args)
{
    if (args.Length < 4) { Console.Error.WriteLine("Missing arguments. See --help."); return 1; }
    var email = args[1].ToLower().Trim();
    var password = args[2];
    var name = args[3];
    var role = cmd == "seed-admin" ? AppRole.Admin : ParseRole(args.ElementAtOrDefault(4) ?? "admin");
    if (!Regex.IsMatch(email, @"^[^\s@]+@[^\s@]+\.[^\s@]+$"))
    { Console.Error.WriteLine("Invalid email."); return 1; }
    if (password.Length < 8) { Console.Error.WriteLine("Password must be at least 8 chars."); return 1; }

    await UpsertUser(db, email, password, name, role);
    Console.WriteLine($"OK: {email} ({role})");
    return 0;
}

static async Task<int> CreateUsersCsv(AppDbContext db, string[] args)
{
    var path = ArgValue(args, "--csv") ?? throw new InvalidOperationException("--csv path is required.");
    var lines = await File.ReadAllLinesAsync(path);
    if (lines.Length == 0) { Console.Error.WriteLine("Empty CSV."); return 1; }
    int created = 0, updated = 0;
    var skipHeader = lines[0].Contains("email", StringComparison.OrdinalIgnoreCase);
    for (int i = skipHeader ? 1 : 0; i < lines.Length; i++)
    {
        var raw = lines[i].Trim();
        if (raw.Length == 0) continue;
        var parts = raw.Split(',');
        if (parts.Length < 4) { Console.Error.WriteLine($"Row {i}: expected 4 cols (email,name,role,temp_password), got {parts.Length}"); continue; }
        var email = parts[0].Trim().ToLower();
        var name = parts[1].Trim();
        var role = ParseRole(parts[2].Trim());
        var pw = parts[3].Trim();
        var existed = await db.Users.AnyAsync(u => u.Email == email);
        await UpsertUser(db, email, pw, name, role);
        if (existed) updated++; else created++;
    }
    Console.WriteLine($"Users: {created} created, {updated} updated.");
    return 0;
}

static async Task UpsertUser(AppDbContext db, string email, string password, string name, AppRole role)
{
    var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
    if (existing is null)
    {
        var u = new AppUser { Email = email, Name = name, PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, 12) };
        db.Users.Add(u);
        db.UserRoles.Add(new UserRole { UserId = u.Id, Role = role });
    }
    else
    {
        existing.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, 12);
        existing.Name = name;
        if (!await db.UserRoles.AnyAsync(r => r.UserId == existing.Id && r.Role == role))
            db.UserRoles.Add(new UserRole { UserId = existing.Id, Role = role });
    }
    await db.SaveChangesAsync();
}

// ─────────────────────────────────────────────────────────────────────────
// import-db — copy every business table, preserving UUIDs. Idempotent
// (ON CONFLICT DO NOTHING). Auth passwords are NOT copied: run create-users
// afterwards to reset them, since Supabase stores its own crypt() hashes.
// ─────────────────────────────────────────────────────────────────────────
static async Task<int> ImportDb(string targetConn, string[] args)
{
    var src = ArgValue(args, "--source-conn")
        ?? throw new InvalidOperationException("--source-conn is required (Supabase Postgres connection string).");

    // Table copy specs. Order matters for FKs.
    var specs = new (string Src, string Dst, string Cols)[]
    {
        ("profiles",                     "profiles",                     "id, user_id, name, created_at, updated_at"),
        ("user_roles",                   "user_roles",                   "id, user_id, role, created_at"),
        ("orders",                       "orders",                       "id, client_name, pi_type, funded_by, finance_partner, quantity, state, state_code, gst_number, contact_person, notes, created_by, created_at, updated_at"),
        ("vehicles",                     "vehicles",                     "id, vehicle_id, vin, motor_id, controller_id, vcu_id, mcu_id, diu_number, iot_imei, iot_sim, item_code, item_name, production_date, customer_vendor, is_low_speed, registration_number, registration_date, policy_number, insurance_invoice_number, insurance_start_date, insurance_end_date, assigned_order_id, assigned_client, assigned_at, assigned_by, vendor_flagged, created_at, updated_at"),
        ("stage_documents",              "stage_documents",              "id, order_id, stage_id, document_name, status, form_type, file_name, file_size, file_url, uploaded_by, uploaded_at, notes, created_at, updated_at"),
        ("stage_skips",                  "stage_skips",                  "id, order_id, stage_id, reason, skipped_by, skipped_at, created_at, updated_at"),
        ("billing_notes",                "billing_notes",                "id, order_id, notes, updated_by, created_at, updated_at"),
        ("pdi_uploads",                  "pdi_uploads",                  "id, order_id, pdi_type, file_name, file_size, file_url, vehicle_count, uploaded_by, uploaded_at, created_at, updated_at"),
        ("individual_invoices",          "individual_invoices",          "id, order_id, vehicle_vin, file_name, file_size, file_url, uploaded_by, uploaded_at, created_at, updated_at"),
        ("bulk_invoices",                "bulk_invoices",                "id, order_id, file_name, file_size, file_url, uploaded_by, uploaded_at, created_at, updated_at"),
        ("rto_slips",                    "rto_slips",                    "id, order_id, registration_number, file_name, file_size, file_url, uploaded_by, uploaded_at, created_at, updated_at"),
        ("rto_excel_uploads",            "rto_excel_uploads",            "id, order_id, file_name, file_size, file_url, row_count, uploaded_by, uploaded_at, created_at, updated_at"),
        ("insurance_policies",           "insurance_policies",           "id, order_id, policy_number, file_name, file_size, file_url, uploaded_by, uploaded_at, created_at, updated_at"),
        ("insurance_excel_uploads",      "insurance_excel_uploads",      "id, order_id, file_name, file_size, file_url, vehicles_updated, uploaded_by, uploaded_at, created_at, updated_at"),
        ("vehicle_insurance_policies",   "vehicle_insurance_policies",   "id, vehicle_vin, order_id, policy_number, provider, start_date, end_date, is_current, file_name, file_size, file_url, notes, uploaded_by, uploaded_by_name, created_at, updated_at"),
        ("vehicle_assignment_events",    "vehicle_assignment_events",    "id, vehicle_vin, order_id, event_type, previous_order_id, actor_user_id, actor_name, notes, created_at"),
        ("final_pdi_verifications",      "final_pdi_verifications",      "id, order_id, vehicle_vin, vehicle_id, check_type, status, expected, actual, created_at, updated_at"),
    };

    await using var srcConn = new NpgsqlConnection(src);
    await srcConn.OpenAsync();
    await using var dstConn = new NpgsqlConnection(targetConn);
    await dstConn.OpenAsync();

    foreach (var (srcTbl, dstTbl, cols) in specs)
    {
        var colList = cols.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        long copied = 0, skipped = 0;
        await using var readCmd = new NpgsqlCommand($"SELECT {cols} FROM public.{srcTbl}", srcConn);
        await using var reader = await readCmd.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var placeholders = string.Join(",", colList.Select((_, i) => $"${i + 1}"));
            await using var ins = new NpgsqlCommand($"INSERT INTO public.{dstTbl} ({cols}) VALUES ({placeholders}) ON CONFLICT DO NOTHING", dstConn);
            for (int i = 0; i < colList.Length; i++)
                ins.Parameters.AddWithValue(reader.IsDBNull(i) ? (object)DBNull.Value : reader.GetValue(i));
            var n = await ins.ExecuteNonQueryAsync();
            if (n > 0) copied++; else skipped++;
        }
        Console.WriteLine($"  {dstTbl,-32} copied={copied,6}  skipped={skipped}");
    }
    Console.WriteLine("import-db: done.");
    return 0;
}

// ─────────────────────────────────────────────────────────────────────────
// import-files — download every object from a Supabase Storage bucket,
// place it into the local file store, and rewrite file_url columns to the
// new signed local URLs.
// ─────────────────────────────────────────────────────────────────────────
static async Task<int> ImportFiles(string targetConn, string[] args)
{
    var baseUrl = ArgValue(args, "--source-url") ?? throw new InvalidOperationException("--source-url required");
    var key = ArgValue(args, "--service-key") ?? throw new InvalidOperationException("--service-key required");
    var buckets = ArgValues(args, "--bucket").ToList();
    if (buckets.Count == 0) buckets.Add("nimbo-files");
    var fileRoot = Environment.GetEnvironmentVariable("FILE_ROOT") ?? "/var/lib/nimbob2b/files";
    var publicBase = Environment.GetEnvironmentVariable("PUBLIC_URL") ?? "http://localhost:5080";

    using var http = new HttpClient { BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/") };
    http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", key);
    http.DefaultRequestHeaders.Add("apikey", key);

    await using var pg = new NpgsqlConnection(targetConn);
    await pg.OpenAsync();

    var urlRewrites = new List<(string OldFragment, string NewUrl)>();
    foreach (var bucket in buckets)
    {
        Console.WriteLine($"Bucket: {bucket}");
        // List objects (paginated). Supabase Storage API: POST /storage/v1/object/list/{bucket}
        int offset = 0; const int page = 100;
        while (true)
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, $"storage/v1/object/list/{bucket}")
            {
                Content = new StringContent(
                    $"{{\"prefix\":\"\",\"limit\":{page},\"offset\":{offset},\"sortBy\":{{\"column\":\"name\",\"order\":\"asc\"}}}}",
                    System.Text.Encoding.UTF8, "application/json"),
            };
            using var resp = await http.SendAsync(req);
            resp.EnsureSuccessStatusCode();
            var body = await resp.Content.ReadAsStringAsync();
            using var doc = System.Text.Json.JsonDocument.Parse(body);
            var items = doc.RootElement.EnumerateArray().ToList();
            if (items.Count == 0) break;
            foreach (var item in items)
            {
                var name = item.GetProperty("name").GetString();
                if (string.IsNullOrEmpty(name)) continue;
                await DownloadOne(http, bucket, name, fileRoot, publicBase, urlRewrites);
            }
            if (items.Count < page) break;
            offset += page;
        }
    }

    // Rewrite file_url columns wherever they appear.
    var tables = new (string Table, string Col)[]
    {
        ("stage_documents", "file_url"), ("individual_invoices", "file_url"), ("bulk_invoices", "file_url"),
        ("rto_slips", "file_url"), ("rto_excel_uploads", "file_url"),
        ("insurance_policies", "file_url"), ("insurance_excel_uploads", "file_url"),
        ("vehicle_insurance_policies", "file_url"), ("pdi_uploads", "file_url"),
    };
    long rewritten = 0;
    foreach (var (t, c) in tables)
    {
        foreach (var (frag, newUrl) in urlRewrites)
        {
            await using var upd = new NpgsqlCommand($"UPDATE public.{t} SET {c} = @new WHERE {c} LIKE @pat", pg);
            upd.Parameters.AddWithValue("new", newUrl);
            upd.Parameters.AddWithValue("pat", "%" + frag + "%");
            rewritten += await upd.ExecuteNonQueryAsync();
        }
    }
    Console.WriteLine($"import-files: {urlRewrites.Count} object(s) copied, {rewritten} url column(s) rewritten.");
    return 0;
}

static async Task DownloadOne(HttpClient http, string bucket, string key, string fileRoot,
    string publicBase, List<(string, string)> rewrites)
{
    using var resp = await http.GetAsync($"storage/v1/object/{bucket}/{key}");
    if (!resp.IsSuccessStatusCode)
    {
        Console.Error.WriteLine($"  skip {bucket}/{key}: {(int)resp.StatusCode}");
        return;
    }
    var relative = $"nimbo-files/{bucket}/{key}".Replace('\\', '/');
    var full = Path.Combine(fileRoot, relative);
    Directory.CreateDirectory(Path.GetDirectoryName(full)!);
    await using (var fs = File.Create(full))
        await resp.Content.CopyToAsync(fs);
    var url = $"{publicBase.TrimEnd('/')}/api/v1/files/{Uri.EscapeDataString(relative)}";
    rewrites.Add(($"{bucket}/{key}", url));
    Console.WriteLine($"  + {bucket}/{key}");
}

// ─────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────
static string? ArgValue(string[] args, string flag)
{
    for (int i = 0; i < args.Length - 1; i++) if (args[i] == flag) return args[i + 1];
    return null;
}
static IEnumerable<string> ArgValues(string[] args, string flag)
{
    for (int i = 0; i < args.Length - 1; i++) if (args[i] == flag) yield return args[i + 1];
}
static AppRole ParseRole(string wire) => wire.ToLowerInvariant() switch
{
    "admin" => AppRole.Admin,
    "rajat_team" => AppRole.RajatTeam,
    "accounts" => AppRole.Accounts,
    "pdi_team" => AppRole.PdiTeam,
    "rto_agent" => AppRole.RtoAgent,
    "insurance_agent" => AppRole.InsuranceAgent,
    "service_team" => AppRole.ServiceTeam,
    _ => throw new ArgumentException($"Unknown role '{wire}'."),
};
