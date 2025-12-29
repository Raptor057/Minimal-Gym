using Dapper;
using Team_Beauty_Brownsville.Dtos;

namespace Team_Beauty_Brownsville.Data;

public sealed class ReportRepository : IReportRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public ReportRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<(decimal SubscriptionPayments, decimal SalesPayments)> GetRevenue(DateTime fromUtc, DateTime toUtc)
    {
        const string sql = """
            SELECT
                (SELECT COALESCE(SUM(AmountUsd), 0) FROM dbo.Payments WHERE PaidAtUtc BETWEEN @FromUtc AND @ToUtc) AS SubscriptionPayments,
                (SELECT COALESCE(SUM(AmountUsd), 0) FROM dbo.SalePayments WHERE PaidAtUtc BETWEEN @FromUtc AND @ToUtc) AS SalesPayments
            """;

        using var connection = _connectionFactory.Create();
        var row = await connection.QuerySingleAsync<(decimal SubscriptionPayments, decimal SalesPayments)>(sql, new
        {
            FromUtc = fromUtc,
            ToUtc = toUtc
        });
        return row;
    }

    public async Task<IReadOnlyList<StatusCountResponse>> GetSubscriptionStatusCounts()
    {
        const string sql = """
            SELECT Status, COUNT(1) AS Count
            FROM dbo.Subscriptions
            GROUP BY Status
            ORDER BY Status
            """;

        using var connection = _connectionFactory.Create();
        var rows = await connection.QueryAsync<StatusCountResponse>(sql);
        return rows.ToList();
    }

    public async Task<SalesReportResponse> GetSalesReport(DateTime fromUtc, DateTime toUtc)
    {
        const string sql = """
            SELECT
                COUNT(1) AS Count,
                COALESCE(SUM(TotalUsd), 0) AS TotalUsd
            FROM dbo.Sales
            WHERE CreatedAtUtc BETWEEN @FromUtc AND @ToUtc
            """;

        using var connection = _connectionFactory.Create();
        var row = await connection.QuerySingleAsync<(int Count, decimal TotalUsd)>(sql, new
        {
            FromUtc = fromUtc,
            ToUtc = toUtc
        });

        return new SalesReportResponse(fromUtc, toUtc, row.Count, row.TotalUsd);
    }

    public async Task<IReadOnlyList<LowStockItemResponse>> GetLowStock(decimal threshold)
    {
        const string sql = """
            SELECT
                p.Id AS ProductId,
                p.Sku,
                p.Name,
                COALESCE(SUM(CASE
                    WHEN m.MovementType IN ('In', 'Adjust') THEN m.Quantity
                    WHEN m.MovementType IN ('Out', 'Waste') THEN -m.Quantity
                    ELSE 0 END), 0) AS Stock
            FROM dbo.Products p
            LEFT JOIN dbo.InventoryMovements m ON m.ProductId = p.Id
            WHERE p.IsActive = 1
            GROUP BY p.Id, p.Sku, p.Name
            HAVING COALESCE(SUM(CASE
                    WHEN m.MovementType IN ('In', 'Adjust') THEN m.Quantity
                    WHEN m.MovementType IN ('Out', 'Waste') THEN -m.Quantity
                    ELSE 0 END), 0) <= @Threshold
            ORDER BY Stock ASC, p.Name ASC
            """;

        using var connection = _connectionFactory.Create();
        var rows = await connection.QueryAsync<LowStockItemResponse>(sql, new { Threshold = threshold });
        return rows.ToList();
    }
}
