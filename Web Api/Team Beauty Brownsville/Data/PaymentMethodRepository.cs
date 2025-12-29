using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class PaymentMethodRepository : IPaymentMethodRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public PaymentMethodRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<PaymentMethod>> GetAll()
    {
        const string sql = """
            SELECT Id, Name, IsActive
            FROM dbo.PaymentMethods
            ORDER BY Id ASC
            """;

        using var connection = _connectionFactory.Create();
        var methods = await connection.QueryAsync<PaymentMethod>(sql);
        return methods.ToList();
    }

    public async Task<PaymentMethod?> GetById(int id)
    {
        const string sql = """
            SELECT Id, Name, IsActive
            FROM dbo.PaymentMethods
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<PaymentMethod>(sql, new { Id = id });
    }

    public async Task<bool> Exists(int id)
    {
        const string sql = "SELECT COUNT(1) FROM dbo.PaymentMethods WHERE Id = @Id AND IsActive = 1";
        using var connection = _connectionFactory.Create();
        var count = await connection.ExecuteScalarAsync<int>(sql, new { Id = id });
        return count > 0;
    }

    public async Task<int> Create(PaymentMethod method)
    {
        const string sql = """
            INSERT INTO dbo.PaymentMethods (Name, IsActive)
            OUTPUT INSERTED.Id
            VALUES (@Name, @IsActive)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, method);
    }

    public async Task Update(int id, string? name, bool? isActive)
    {
        const string sql = """
            UPDATE dbo.PaymentMethods
            SET Name = COALESCE(@Name, Name),
                IsActive = COALESCE(@IsActive, IsActive)
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new { Id = id, Name = name, IsActive = isActive });
    }

    public async Task SoftDelete(int id)
    {
        const string sql = "UPDATE dbo.PaymentMethods SET IsActive = 0 WHERE Id = @Id";
        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new { Id = id });
    }
}
