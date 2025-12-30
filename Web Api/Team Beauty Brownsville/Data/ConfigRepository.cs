using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class ConfigRepository : IConfigRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public ConfigRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<Config?> Get()
    {
        const string sql = """
            SELECT TOP 1 Id, CurrencyCode, TaxRate, ReceiptPrefix, NextReceiptNo, LogoBase64, CreatedAtUtc
            FROM dbo.Config
            ORDER BY Id ASC
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<Config>(sql);
    }

    public async Task Update(decimal? taxRate, string? receiptPrefix, int? nextReceiptNo, string? logoBase64)
    {
        const string sql = """
            UPDATE dbo.Config
            SET TaxRate = COALESCE(@TaxRate, TaxRate),
                ReceiptPrefix = COALESCE(@ReceiptPrefix, ReceiptPrefix),
                NextReceiptNo = COALESCE(@NextReceiptNo, NextReceiptNo),
                LogoBase64 = @LogoBase64
            WHERE Id = (SELECT TOP 1 Id FROM dbo.Config ORDER BY Id ASC)
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new
        {
            TaxRate = taxRate,
            ReceiptPrefix = receiptPrefix,
            NextReceiptNo = nextReceiptNo,
            LogoBase64 = logoBase64
        });
    }

    public async Task<string?> ClaimNextReceiptNumber()
    {
        const string sql = """
            UPDATE dbo.Config
            SET NextReceiptNo = NextReceiptNo + 1
            OUTPUT DELETED.NextReceiptNo AS PreviousNo, INSERTED.ReceiptPrefix AS ReceiptPrefix
            WHERE Id = (SELECT TOP 1 Id FROM dbo.Config ORDER BY Id ASC)
            """;

        using var connection = _connectionFactory.Create();
        var row = await connection.QuerySingleOrDefaultAsync<(int PreviousNo, string? ReceiptPrefix)>(sql);
        if (row.PreviousNo <= 0)
        {
            return null;
        }

        var prefix = row.ReceiptPrefix ?? string.Empty;
        return $"{prefix}{row.PreviousNo}";
    }
}
