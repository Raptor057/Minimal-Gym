using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class PaymentRepository : IPaymentRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public PaymentRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Payment>> GetAll()
    {
        const string sql = """
            SELECT Id, SubscriptionId, PaymentMethodId, AmountUsd, CurrencyCode, PaidAtUtc, Reference, Status, CreatedAtUtc
            FROM dbo.Payments
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var payments = await connection.QueryAsync<Payment>(sql);
        return payments.ToList();
    }

    public async Task<Payment?> GetById(int id)
    {
        const string sql = """
            SELECT Id, SubscriptionId, PaymentMethodId, AmountUsd, CurrencyCode, PaidAtUtc, Reference, Status, CreatedAtUtc
            FROM dbo.Payments
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<Payment>(sql, new { Id = id });
    }

    public async Task<IReadOnlyList<Payment>> GetByMemberId(int memberId)
    {
        const string sql = """
            SELECT p.Id, p.SubscriptionId, p.PaymentMethodId, p.AmountUsd, p.CurrencyCode, p.PaidAtUtc, p.Reference, p.Status, p.CreatedAtUtc
            FROM dbo.Payments p
            INNER JOIN dbo.Subscriptions s ON s.Id = p.SubscriptionId
            WHERE s.MemberId = @MemberId
            ORDER BY p.Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var payments = await connection.QueryAsync<Payment>(sql, new { MemberId = memberId });
        return payments.ToList();
    }

    public async Task<int> Create(Payment payment)
    {
        const string sql = """
            INSERT INTO dbo.Payments (SubscriptionId, PaymentMethodId, AmountUsd, CurrencyCode, PaidAtUtc, Reference, Status, CreatedAtUtc)
            OUTPUT INSERTED.Id
            VALUES (@SubscriptionId, @PaymentMethodId, @AmountUsd, @CurrencyCode, @PaidAtUtc, @Reference, @Status, @CreatedAtUtc)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, payment);
    }
}
