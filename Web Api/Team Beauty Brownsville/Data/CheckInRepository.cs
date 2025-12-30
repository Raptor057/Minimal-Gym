using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class CheckInRepository : ICheckInRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public CheckInRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<bool> HasActiveSubscription(int memberId, DateTime dateUtc)
    {
        const string sql = """
            SELECT COUNT(1)
            FROM dbo.Subscriptions
            WHERE MemberId = @MemberId
              AND Status = 'Active'
              AND StartDate <= @DateUtc
              AND EndDate >= @DateUtc
            """;

        using var connection = _connectionFactory.Create();
        var count = await connection.ExecuteScalarAsync<int>(sql, new { MemberId = memberId, DateUtc = dateUtc.Date });
        return count > 0;
    }

    public async Task<IReadOnlyList<CheckIn>> GetAll()
    {
        const string sql = """
            SELECT Id, MemberId, CheckedInAtUtc, CreatedByUserId
            FROM dbo.CheckIns
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var rows = await connection.QueryAsync<CheckIn>(sql);
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CheckInWithMemberPhoto>> GetAllWithMemberPhoto()
    {
        const string sql = """
            SELECT c.Id, c.MemberId, c.CheckedInAtUtc, c.CreatedByUserId, m.PhotoBase64 AS MemberPhotoBase64
            FROM dbo.CheckIns c
            INNER JOIN dbo.Members m ON m.Id = c.MemberId
            ORDER BY c.Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var rows = await connection.QueryAsync<CheckInWithMemberPhoto>(sql);
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CheckInWithMemberSummary>> GetTodayWithMemberSummary(DateTime dateUtc)
    {
        const string sql = """
            SELECT
                c.Id,
                c.MemberId,
                c.CheckedInAtUtc,
                m.FullName,
                m.PhotoBase64,
                m.IsActive,
                s.Status AS SubscriptionStatus,
                s.EndDate AS SubscriptionEndDate
            FROM dbo.CheckIns c
            INNER JOIN dbo.Members m ON m.Id = c.MemberId
            LEFT JOIN dbo.Subscriptions s ON s.MemberId = m.Id
                AND s.Status = 'Active'
                AND s.StartDate <= @DateUtc
                AND s.EndDate >= @DateUtc
            WHERE c.CheckedInAtUtc >= @StartUtc
              AND c.CheckedInAtUtc < @EndUtc
            ORDER BY c.Id DESC
            """;

        var startUtc = dateUtc.Date;
        var endUtc = startUtc.AddDays(1);

        using var connection = _connectionFactory.Create();
        var rows = await connection.QueryAsync<CheckInWithMemberSummary>(sql, new
        {
            DateUtc = startUtc,
            StartUtc = startUtc,
            EndUtc = endUtc
        });
        return rows.ToList();
    }

    public async Task<int> Create(CheckIn checkIn)
    {
        const string sql = """
            INSERT INTO dbo.CheckIns (MemberId, CheckedInAtUtc, CreatedByUserId)
            OUTPUT INSERTED.Id
            VALUES (@MemberId, @CheckedInAtUtc, @CreatedByUserId)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, checkIn);
    }
}
