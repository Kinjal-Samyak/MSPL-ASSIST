using Microsoft.EntityFrameworkCore;
using NimboB2B.Application.Services;
using NimboB2B.Domain.Entities;
using NimboB2B.Domain.Enums;
using NimboB2B.Infrastructure.Persistence;
using Xunit;

namespace NimboB2B.Tests;

public class UnassignPreservesHistoryTests
{
    private static AppDbContext NewDb() =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task Unassign_clears_assignment_but_keeps_registration_and_policy()
    {
        await using var db = NewDb();
        db.Vehicles.Add(new Vehicle
        {
            Id = Guid.NewGuid(), Vin = "VIN123",
            AssignedOrderId = "APX-001-DLP", AssignedClient = "Apex",
            RegistrationNumber = "DL-01-AA-1234", PolicyNumber = "POL-9",
        });
        await db.SaveChangesAsync();

        var svc = new VehicleService(db);
        await svc.UnassignAsync("VIN123", Guid.NewGuid(), "Tester", "trial", default);

        var v = await db.Vehicles.FirstAsync(x => x.Vin == "VIN123");
        Assert.Null(v.AssignedOrderId);
        Assert.Null(v.AssignedClient);
        Assert.Equal("DL-01-AA-1234", v.RegistrationNumber);
        Assert.Equal("POL-9", v.PolicyNumber);

        var evt = await db.VehicleAssignmentEvents.SingleAsync();
        Assert.Equal(AssignmentEventType.Unassigned, evt.EventType);
        Assert.Equal("APX-001-DLP", evt.PreviousOrderId);
    }
}
