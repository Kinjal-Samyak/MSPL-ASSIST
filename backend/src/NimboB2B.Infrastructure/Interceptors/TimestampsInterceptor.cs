using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace NimboB2B.Infrastructure.Interceptors;

/// Sets CreatedAt / UpdatedAt on any entity that exposes those properties.
public sealed class TimestampsInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData, InterceptionResult<int> result, CancellationToken ct = default)
    {
        var ctx = eventData.Context;
        if (ctx is null) return base.SavingChangesAsync(eventData, result, ct);

        var now = DateTime.UtcNow;
        foreach (var entry in ctx.ChangeTracker.Entries())
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified)) continue;
            Set(entry, "UpdatedAt", now);
            if (entry.State == EntityState.Added) Set(entry, "CreatedAt", now);
        }
        return base.SavingChangesAsync(eventData, result, ct);
    }

    private static void Set(EntityEntry entry, string prop, DateTime value)
    {
        var p = entry.Metadata.FindProperty(prop);
        if (p is null) return;
        var current = entry.Property(prop).CurrentValue as DateTime?;
        if (entry.State == EntityState.Added && (current is null || current == default(DateTime)))
            entry.Property(prop).CurrentValue = value;
        else if (entry.State == EntityState.Modified)
            entry.Property(prop).CurrentValue = value;
    }
}
