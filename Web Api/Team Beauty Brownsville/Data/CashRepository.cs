using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class CashRepository : ICashRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public CashRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<CashSession?> GetOpenSession()
    {
        const string sql = """
            SELECT TOP 1 Id, OpenedByUserId, OpenedAtUtc, OpeningAmountUsd, Status, ClosedByUserId, ClosedAtUtc
            FROM dbo.CashSessions
            WHERE Status = 'Open'
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<CashSession>(sql);
    }

    public async Task<IReadOnlyList<CashSession>> GetClosures()
    {
        const string sql = """
            SELECT Id, OpenedByUserId, OpenedAtUtc, OpeningAmountUsd, Status, ClosedByUserId, ClosedAtUtc
            FROM dbo.CashSessions
            WHERE Status = 'Closed'
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var sessions = await connection.QueryAsync<CashSession>(sql);
        return sessions.ToList();
    }

    public async Task<int> OpenSession(CashSession session)
    {
        const string sql = """
            INSERT INTO dbo.CashSessions (OpenedByUserId, OpenedAtUtc, OpeningAmountUsd, Status)
            OUTPUT INSERTED.Id
            VALUES (@OpenedByUserId, @OpenedAtUtc, @OpeningAmountUsd, @Status)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, session);
    }

    public async Task AddMovement(CashMovement movement)
    {
        const string sql = """
            INSERT INTO dbo.CashMovements (CashSessionId, MovementType, AmountUsd, Notes, CreatedAtUtc, CreatedByUserId)
            VALUES (@CashSessionId, @MovementType, @AmountUsd, @Notes, @CreatedAtUtc, @CreatedByUserId)
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, movement);
    }

    public async Task CloseSession(CashClosure closure)
    {
        const string closeSql = """
            UPDATE dbo.CashSessions
            SET Status = 'Closed',
                ClosedByUserId = @ClosedByUserId,
                ClosedAtUtc = @ClosedAtUtc
            WHERE Id = @CashSessionId
            """;

        const string closureSql = """
            INSERT INTO dbo.CashClosures (CashSessionId, ClosedByUserId, ClosedAtUtc, CashTotalUsd, CardTotalUsd, TransferTotalUsd, OtherTotalUsd, CountedCashUsd, DifferenceUsd)
            VALUES (@CashSessionId, @ClosedByUserId, @ClosedAtUtc, @CashTotalUsd, @CardTotalUsd, @TransferTotalUsd, @OtherTotalUsd, @CountedCashUsd, @DifferenceUsd)
            """;

        using var connection = _connectionFactory.Create();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        await connection.ExecuteAsync(closeSql, closure, transaction);
        await connection.ExecuteAsync(closureSql, closure, transaction);

        transaction.Commit();
    }
}
