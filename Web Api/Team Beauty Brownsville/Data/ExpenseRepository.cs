using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class ExpenseRepository : IExpenseRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public ExpenseRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Expense>> GetAll()
    {
        const string sql = """
            SELECT Id, Description, AmountUsd, PaymentMethodId, ExpenseDateUtc, Notes, ProofBase64, CashSessionId, CreatedAtUtc, CreatedByUserId
            FROM dbo.Expenses
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var rows = await connection.QueryAsync<Expense>(sql);
        return rows.ToList();
    }

    public async Task<int> Create(Expense expense)
    {
        const string sql = """
            INSERT INTO dbo.Expenses (Description, AmountUsd, PaymentMethodId, ExpenseDateUtc, Notes, ProofBase64, CashSessionId, CreatedAtUtc, CreatedByUserId)
            OUTPUT INSERTED.Id
            VALUES (@Description, @AmountUsd, @PaymentMethodId, @ExpenseDateUtc, @Notes, @ProofBase64, @CashSessionId, @CreatedAtUtc, @CreatedByUserId)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, expense);
    }
}
