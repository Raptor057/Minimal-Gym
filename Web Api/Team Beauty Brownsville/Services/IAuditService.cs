namespace Team_Beauty_Brownsville.Services;

public interface IAuditService
{
    Task LogAsync(string action, string entityName, string entityId, int? userId, object? data);
}
