using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class SaleRepository : ISaleRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public SaleRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Sale>> GetAll()
    {
        const string sql = """
            SELECT Id, MemberId, CashSessionId, SubtotalUsd, DiscountUsd, TaxUsd, TotalUsd, CurrencyCode, Status, ReceiptNumber, CreatedAtUtc, CreatedByUserId
            FROM dbo.Sales
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var sales = await connection.QueryAsync<Sale>(sql);
        return sales.ToList();
    }

    public async Task<Sale?> GetById(int id)
    {
        const string sql = """
            SELECT Id, MemberId, CashSessionId, SubtotalUsd, DiscountUsd, TaxUsd, TotalUsd, CurrencyCode, Status, ReceiptNumber, CreatedAtUtc, CreatedByUserId
            FROM dbo.Sales
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<Sale>(sql, new { Id = id });
    }

    public async Task<int> CreateSaleWithItems(Sale sale, IReadOnlyList<SaleItem> items)
    {
        const string saleSql = """
            INSERT INTO dbo.Sales (MemberId, CashSessionId, SubtotalUsd, DiscountUsd, TaxUsd, TotalUsd, CurrencyCode, Status, ReceiptNumber, CreatedAtUtc, CreatedByUserId)
            OUTPUT INSERTED.Id
            VALUES (@MemberId, @CashSessionId, @SubtotalUsd, @DiscountUsd, @TaxUsd, @TotalUsd, @CurrencyCode, @Status, @ReceiptNumber, @CreatedAtUtc, @CreatedByUserId)
            """;

        const string itemSql = """
            INSERT INTO dbo.SaleItems (SaleId, ProductId, Quantity, UnitPriceUsd, DiscountUsd, TaxUsd, LineTotalUsd)
            VALUES (@SaleId, @ProductId, @Quantity, @UnitPriceUsd, @DiscountUsd, @TaxUsd, @LineTotalUsd)
            """;

        const string movementSql = """
            INSERT INTO dbo.InventoryMovements (ProductId, MovementType, Quantity, UnitCostUsd, Notes, CreatedAtUtc, CreatedByUserId)
            VALUES (@ProductId, 'Out', @Quantity, NULL, @Notes, @CreatedAtUtc, @CreatedByUserId)
            """;

        using var connection = _connectionFactory.Create();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        var saleId = await connection.ExecuteScalarAsync<int>(saleSql, sale, transaction);

        if (items.Count > 0)
        {
            var rows = items.Select(item => new
            {
                SaleId = saleId,
                item.ProductId,
                item.Quantity,
                item.UnitPriceUsd,
                item.DiscountUsd,
                item.TaxUsd,
                item.LineTotalUsd
            });
            await connection.ExecuteAsync(itemSql, rows, transaction);

            var movements = items.Select(item => new
            {
                item.ProductId,
                item.Quantity,
                Notes = $"Sale #{saleId}",
                CreatedAtUtc = sale.CreatedAtUtc,
                CreatedByUserId = sale.CreatedByUserId
            });
            await connection.ExecuteAsync(movementSql, movements, transaction);
        }

        transaction.Commit();
        return saleId;
    }

    public async Task CreateSalePayment(SalePayment payment)
    {
        const string sql = """
            INSERT INTO dbo.SalePayments (SaleId, PaymentMethodId, AmountUsd, PaidAtUtc, Reference, ProofBase64)
            VALUES (@SaleId, @PaymentMethodId, @AmountUsd, @PaidAtUtc, @Reference, @ProofBase64)
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, payment);
    }

    public async Task CreateSalePayments(IReadOnlyList<SalePayment> payments)
    {
        if (payments.Count == 0)
        {
            return;
        }

        const string sql = """
            INSERT INTO dbo.SalePayments (SaleId, PaymentMethodId, AmountUsd, PaidAtUtc, Reference, ProofBase64)
            VALUES (@SaleId, @PaymentMethodId, @AmountUsd, @PaidAtUtc, @Reference, @ProofBase64)
            """;

        using var connection = _connectionFactory.Create();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        await connection.ExecuteAsync(sql, payments, transaction);

        transaction.Commit();
    }

    public async Task<IReadOnlyList<SaleItem>> GetItemsBySaleId(int saleId)
    {
        const string sql = """
            SELECT Id, SaleId, ProductId, Quantity, UnitPriceUsd, DiscountUsd, TaxUsd, LineTotalUsd
            FROM dbo.SaleItems
            WHERE SaleId = @SaleId
            """;

        using var connection = _connectionFactory.Create();
        var items = await connection.QueryAsync<SaleItem>(sql, new { SaleId = saleId });
        return items.ToList();
    }

    public async Task<IReadOnlyList<SalePayment>> GetPaymentsBySaleId(int saleId)
    {
        const string sql = """
            SELECT Id, SaleId, PaymentMethodId, AmountUsd, PaidAtUtc, Reference, ProofBase64
            FROM dbo.SalePayments
            WHERE SaleId = @SaleId
            ORDER BY Id ASC
            """;

        using var connection = _connectionFactory.Create();
        var rows = await connection.QueryAsync<SalePayment>(sql, new { SaleId = saleId });
        return rows.ToList();
    }

    public async Task UpdateStatus(int saleId, string status)
    {
        const string sql = "UPDATE dbo.Sales SET Status = @Status WHERE Id = @Id";
        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new { Id = saleId, Status = status });
    }

    public async Task AddRefundInventory(int saleId, IReadOnlyList<SaleItem> items, int? userId)
    {
        if (items.Count == 0)
        {
            return;
        }

        const string sql = """
            INSERT INTO dbo.InventoryMovements (ProductId, MovementType, Quantity, UnitCostUsd, Notes, CreatedAtUtc, CreatedByUserId)
            VALUES (@ProductId, 'In', @Quantity, NULL, @Notes, @CreatedAtUtc, @CreatedByUserId)
            """;

        using var connection = _connectionFactory.Create();
        var rows = items.Select(item => new
        {
            item.ProductId,
            item.Quantity,
            Notes = $"Refund Sale #{saleId}",
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = userId
        });

        await connection.ExecuteAsync(sql, rows);
    }
}
