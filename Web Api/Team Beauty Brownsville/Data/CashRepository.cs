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

    public async Task<CashSession?> GetById(int id)
    {
        const string sql = """
            SELECT Id, OpenedByUserId, OpenedAtUtc, OpeningAmountUsd, Status, ClosedByUserId, ClosedAtUtc
            FROM dbo.CashSessions
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<CashSession>(sql, new { Id = id });
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

    public async Task<CashSessionSummary?> GetSessionSummary(int cashSessionId)
    {
        var session = await GetById(cashSessionId);
        if (session is null)
        {
            return null;
        }

        var fromUtc = session.OpenedAtUtc;
        var toUtc = session.ClosedAtUtc ?? DateTime.UtcNow;

        const string paymentSql = """
            SELECT PaymentMethodId, COALESCE(SUM(AmountUsd), 0) AS AmountUsd
            FROM (
                SELECT PaymentMethodId, AmountUsd, PaidAtUtc FROM dbo.SalePayments
                UNION ALL
                SELECT PaymentMethodId, AmountUsd, PaidAtUtc FROM dbo.Payments
            ) p
            WHERE p.PaidAtUtc >= @FromUtc AND p.PaidAtUtc <= @ToUtc
            GROUP BY PaymentMethodId
            """;

        const string expenseSql = """
            SELECT PaymentMethodId, COALESCE(SUM(AmountUsd), 0) AS AmountUsd
            FROM dbo.Expenses
            WHERE PaymentMethodId IS NOT NULL
              AND CreatedAtUtc >= @FromUtc AND CreatedAtUtc <= @ToUtc
            GROUP BY PaymentMethodId
            """;

        const string movementSql = """
            SELECT
                COALESCE(SUM(CASE WHEN MovementType = 'In' THEN AmountUsd ELSE 0 END), 0) AS TotalInUsd,
                COALESCE(SUM(CASE WHEN MovementType = 'Out' THEN AmountUsd ELSE 0 END), 0) AS TotalOutUsd
            FROM dbo.CashMovements
            WHERE CashSessionId = @CashSessionId
            """;

        using var connection = _connectionFactory.Create();
        var paymentTotals = (await connection.QueryAsync<CashMethodTotal>(paymentSql, new { FromUtc = fromUtc, ToUtc = toUtc })).ToList();
        var expenseTotals = (await connection.QueryAsync<CashMethodTotal>(expenseSql, new { FromUtc = fromUtc, ToUtc = toUtc })).ToList();
        var movementTotals = await connection.QuerySingleAsync<MovementTotals>(movementSql, new { CashSessionId = cashSessionId });

        return new CashSessionSummary
        {
            Session = session,
            PaymentTotals = paymentTotals,
            ExpenseTotals = expenseTotals,
            CashMovementsInUsd = movementTotals.TotalInUsd,
            CashMovementsOutUsd = movementTotals.TotalOutUsd
        };
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

    public async Task<IReadOnlyList<CashMovement>> GetMovements(int? cashSessionId)
    {
        var sql = """
            SELECT Id, CashSessionId, MovementType, AmountUsd, Notes, CreatedAtUtc, CreatedByUserId
            FROM dbo.CashMovements
            """;

        if (cashSessionId is not null)
        {
            sql += " WHERE CashSessionId = @CashSessionId";
        }

        sql += " ORDER BY Id DESC";

        using var connection = _connectionFactory.Create();
        var rows = await connection.QueryAsync<CashMovement>(sql, new { CashSessionId = cashSessionId });
        return rows.ToList();
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

    private sealed class MovementTotals
    {
        public decimal TotalInUsd { get; set; }
        public decimal TotalOutUsd { get; set; }
    }
}
