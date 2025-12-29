using System.Text.Json;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Services;

public sealed class AuditService : IAuditService
{
    private readonly IAuditRepository _repository;

    public AuditService(IAuditRepository repository)
    {
        _repository = repository;
    }

    public Task LogAsync(string action, string entityName, string entityId, int? userId, object? data)
    {
        var log = new AuditLog
        {
            EntityName = entityName,
            EntityId = entityId,
            Action = action,
            UserId = userId,
            CreatedAtUtc = DateTime.UtcNow,
            DataJson = data is null ? null : JsonSerializer.Serialize(data)
        };

        return _repository.Create(log);
    }
}
