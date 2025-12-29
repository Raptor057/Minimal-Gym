using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IAuditRepository
{
    Task<int> Create(AuditLog log);
    Task<IReadOnlyList<AuditLog>> Get(
        string? entityName,
        string? action,
        int? userId,
        DateTime? fromUtc,
        DateTime? toUtc,
        int limit);
}
