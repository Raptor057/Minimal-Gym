using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class SubscriptionRepository : ISubscriptionRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public SubscriptionRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Subscription>> GetAll()
    {
        const string sql = """
            SELECT Id, MemberId, PlanId, StartDate, EndDate, Status, PriceUsd, PausedAtUtc, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.Subscriptions
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var subs = await connection.QueryAsync<Subscription>(sql);
        return subs.ToList();
    }

    public async Task<IReadOnlyList<Subscription>> GetByMemberId(int memberId)
    {
        const string sql = """
            SELECT Id, MemberId, PlanId, StartDate, EndDate, Status, PriceUsd, PausedAtUtc, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.Subscriptions
            WHERE MemberId = @MemberId
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var subs = await connection.QueryAsync<Subscription>(sql, new { MemberId = memberId });
        return subs.ToList();
    }

    public async Task<Subscription?> GetById(int id)
    {
        const string sql = """
            SELECT Id, MemberId, PlanId, StartDate, EndDate, Status, PriceUsd, PausedAtUtc, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.Subscriptions
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<Subscription>(sql, new { Id = id });
    }

    public async Task<int> Create(Subscription subscription)
    {
        const string sql = """
            INSERT INTO dbo.Subscriptions (MemberId, PlanId, StartDate, EndDate, Status, PriceUsd, PausedAtUtc, CreatedAtUtc)
            OUTPUT INSERTED.Id
            VALUES (@MemberId, @PlanId, @StartDate, @EndDate, @Status, @PriceUsd, @PausedAtUtc, @CreatedAtUtc)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, subscription);
    }

    public async Task Update(
        int id,
        DateTime? startDate,
        DateTime? endDate,
        string? status,
        DateTime? pausedAtUtc,
        DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.Subscriptions
            SET StartDate = COALESCE(@StartDate, StartDate),
                EndDate = COALESCE(@EndDate, EndDate),
                Status = COALESCE(@Status, Status),
                PausedAtUtc = COALESCE(@PausedAtUtc, PausedAtUtc),
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new
        {
            Id = id,
            StartDate = startDate,
            EndDate = endDate,
            Status = status,
            PausedAtUtc = pausedAtUtc,
            UpdatedAtUtc = updatedAtUtc
        });
    }

    public async Task Pause(int id, DateTime pausedAtUtc, DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.Subscriptions
            SET Status = 'Paused',
                PausedAtUtc = @PausedAtUtc,
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new { Id = id, PausedAtUtc = pausedAtUtc, UpdatedAtUtc = updatedAtUtc });
    }

    public async Task Resume(int id, DateTime endDate, DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.Subscriptions
            SET Status = 'Active',
                EndDate = @EndDate,
                PausedAtUtc = NULL,
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new { Id = id, EndDate = endDate, UpdatedAtUtc = updatedAtUtc });
    }
}
