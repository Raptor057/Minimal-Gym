using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class MembershipPlanRepository : IMembershipPlanRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public MembershipPlanRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<MembershipPlan>> GetAll()
    {
        const string sql = """
            SELECT Id, Name, DurationDays, PriceUsd, Rules, IsActive, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.MembershipPlans
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var plans = await connection.QueryAsync<MembershipPlan>(sql);
        return plans.ToList();
    }

    public async Task<MembershipPlan?> GetById(int id)
    {
        const string sql = """
            SELECT Id, Name, DurationDays, PriceUsd, Rules, IsActive, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.MembershipPlans
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<MembershipPlan>(sql, new { Id = id });
    }

    public async Task<int> Create(MembershipPlan plan)
    {
        const string sql = """
            INSERT INTO dbo.MembershipPlans (Name, DurationDays, PriceUsd, Rules, IsActive, CreatedAtUtc)
            OUTPUT INSERTED.Id
            VALUES (@Name, @DurationDays, @PriceUsd, @Rules, @IsActive, @CreatedAtUtc)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, plan);
    }

    public async Task Update(
        int id,
        string? name,
        int? durationDays,
        decimal? priceUsd,
        string? rules,
        bool? isActive,
        DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.MembershipPlans
            SET Name = COALESCE(@Name, Name),
                DurationDays = COALESCE(@DurationDays, DurationDays),
                PriceUsd = COALESCE(@PriceUsd, PriceUsd),
                Rules = COALESCE(@Rules, Rules),
                IsActive = COALESCE(@IsActive, IsActive),
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new
        {
            Id = id,
            Name = name,
            DurationDays = durationDays,
            PriceUsd = priceUsd,
            Rules = rules,
            IsActive = isActive,
            UpdatedAtUtc = updatedAtUtc
        });
    }

    public async Task SoftDelete(int id, DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.MembershipPlans
            SET IsActive = 0,
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new { Id = id, UpdatedAtUtc = updatedAtUtc });
    }
}
