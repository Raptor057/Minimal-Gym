using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class AuditRepository : IAuditRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public AuditRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<int> Create(AuditLog log)
    {
        const string sql = """
            INSERT INTO dbo.AuditLog (EntityName, EntityId, Action, UserId, CreatedAtUtc, DataJson)
            OUTPUT INSERTED.Id
            VALUES (@EntityName, @EntityId, @Action, @UserId, @CreatedAtUtc, @DataJson)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, log);
    }

    public async Task<IReadOnlyList<AuditLog>> Get(
        string? entityName,
        string? action,
        int? userId,
        DateTime? fromUtc,
        DateTime? toUtc,
        int limit)
    {
        const string sql = """
            SELECT TOP (@Limit)
                Id, EntityName, EntityId, Action, UserId, CreatedAtUtc, DataJson
            FROM dbo.AuditLog
            WHERE (@EntityName IS NULL OR EntityName = @EntityName)
              AND (@Action IS NULL OR Action = @Action)
              AND (@UserId IS NULL OR UserId = @UserId)
              AND (@FromUtc IS NULL OR CreatedAtUtc >= @FromUtc)
              AND (@ToUtc IS NULL OR CreatedAtUtc <= @ToUtc)
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var logs = await connection.QueryAsync<AuditLog>(sql, new
        {
            EntityName = entityName,
            Action = action,
            UserId = userId,
            FromUtc = fromUtc,
            ToUtc = toUtc,
            Limit = limit
        });
        return logs.ToList();
    }
}
