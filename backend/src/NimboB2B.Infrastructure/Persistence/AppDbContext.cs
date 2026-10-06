using Microsoft.EntityFrameworkCore;
using NimboB2B.Domain.Entities;
using NimboB2B.Domain.Enums;

namespace NimboB2B.Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<MasterOrderGroup> MasterOrderGroups => Set<MasterOrderGroup>();
    public DbSet<OrderEtdHistory> OrderEtdHistories => Set<OrderEtdHistory>();
    public DbSet<OrderChangeLog> OrderChangeLogs => Set<OrderChangeLog>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<StageDocument> StageDocuments => Set<StageDocument>();
    public DbSet<StageSkip> StageSkips => Set<StageSkip>();
    public DbSet<BillingNote> BillingNotes => Set<BillingNote>();
    public DbSet<PdiUpload> PdiUploads => Set<PdiUpload>();
    public DbSet<FinalPdiVerification> FinalPdiVerifications => Set<FinalPdiVerification>();
    public DbSet<IndividualInvoice> IndividualInvoices => Set<IndividualInvoice>();
    public DbSet<BulkInvoice> BulkInvoices => Set<BulkInvoice>();
    public DbSet<RtoSlip> RtoSlips => Set<RtoSlip>();
    public DbSet<RtoExcelUpload> RtoExcelUploads => Set<RtoExcelUpload>();
    public DbSet<InsurancePolicy> InsurancePolicies => Set<InsurancePolicy>();
    public DbSet<InsuranceExcelUpload> InsuranceExcelUploads => Set<InsuranceExcelUpload>();
    public DbSet<VehicleInsurancePolicy> VehicleInsurancePolicies => Set<VehicleInsurancePolicy>();
    public DbSet<VehicleAssignmentEvent> VehicleAssignmentEvents => Set<VehicleAssignmentEvent>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        // Store enums as text — avoids needing CREATE TYPE + Npgsql enum mapping setup.
        b.Entity<VehicleAssignmentEvent>().Property(e => e.EventType).HasConversion<string>();
        b.Entity<UserRole>().Property(e => e.Role).HasConversion<string>();
        b.Entity<Order>().Property(e => e.PiType).HasConversion<string>();

        b.Entity<AppUser>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Email).IsUnique();
            e.Property(x => x.Email).HasMaxLength(320);
        });

        b.Entity<Order>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasMaxLength(40);
            e.HasIndex(x => x.ClientId);
            e.HasIndex(x => x.MasterOrderGroupId);
            e.HasOne<Client>().WithMany().HasForeignKey(x => x.ClientId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne<MasterOrderGroup>().WithMany().HasForeignKey(x => x.MasterOrderGroupId).OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Client>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.ClientName);
        });

        b.Entity<MasterOrderGroup>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.ClientId).IsUnique(); // one group per client
            e.HasIndex(x => x.Code).IsUnique();
        });

        b.Entity<OrderEtdHistory>(e => e.HasIndex(x => x.OrderId));
        b.Entity<OrderChangeLog>(e => e.HasIndex(x => x.OrderId));

        b.Entity<Vehicle>(e =>
        {
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.Vin).IsUnique();
            e.HasIndex(x => x.AssignedOrderId);
        });

        b.Entity<Profile>(e => e.HasIndex(x => x.UserId).IsUnique());
        b.Entity<UserRole>(e => e.HasIndex(x => new { x.UserId, x.Role }).IsUnique());

        b.Entity<StageDocument>(e => e.HasIndex(x => new { x.OrderId, x.StageId }));
        b.Entity<StageSkip>(e => e.HasIndex(x => new { x.OrderId, x.StageId }).IsUnique());
        b.Entity<BillingNote>(e => e.HasIndex(x => x.OrderId).IsUnique());

        b.Entity<VehicleInsurancePolicy>(e =>
        {
            e.HasIndex(x => x.VehicleVin);
            e.HasIndex(x => new { x.VehicleVin, x.IsCurrent });
        });

        b.Entity<VehicleAssignmentEvent>(e =>
        {
            e.HasIndex(x => x.VehicleVin);
            e.HasIndex(x => x.OrderId);
            e.HasIndex(x => x.CreatedAt);
        });

        base.OnModelCreating(b);
    }
}
