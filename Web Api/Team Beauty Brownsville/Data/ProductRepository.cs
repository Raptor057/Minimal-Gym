using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class ProductRepository : IProductRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public ProductRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Product>> GetAll()
    {
        const string sql = """
            SELECT
                p.Id,
                p.Sku,
                p.Barcode,
                p.Name,
                p.SalePriceUsd,
                p.CostUsd,
                p.Category,
                p.PhotoBase64,
                p.IsActive,
                p.CreatedAtUtc,
                p.UpdatedAtUtc,
                COALESCE(SUM(CASE
                    WHEN m.MovementType IN ('In', 'Adjust') THEN m.Quantity
                    WHEN m.MovementType IN ('Out', 'Waste') THEN -m.Quantity
                    ELSE 0 END), 0) AS Stock
            FROM dbo.Products p
            LEFT JOIN dbo.InventoryMovements m ON m.ProductId = p.Id
            GROUP BY
                p.Id,
                p.Sku,
                p.Barcode,
                p.Name,
                p.SalePriceUsd,
                p.CostUsd,
                p.Category,
                p.PhotoBase64,
                p.IsActive,
                p.CreatedAtUtc,
                p.UpdatedAtUtc
            ORDER BY p.Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var products = await connection.QueryAsync<Product>(sql);
        return products.ToList();
    }

    public async Task<Product?> GetById(int id)
    {
        const string sql = """
            SELECT
                p.Id,
                p.Sku,
                p.Barcode,
                p.Name,
                p.SalePriceUsd,
                p.CostUsd,
                p.Category,
                p.PhotoBase64,
                p.IsActive,
                p.CreatedAtUtc,
                p.UpdatedAtUtc,
                COALESCE(SUM(CASE
                    WHEN m.MovementType IN ('In', 'Adjust') THEN m.Quantity
                    WHEN m.MovementType IN ('Out', 'Waste') THEN -m.Quantity
                    ELSE 0 END), 0) AS Stock
            FROM dbo.Products p
            LEFT JOIN dbo.InventoryMovements m ON m.ProductId = p.Id
            WHERE p.Id = @Id
            GROUP BY
                p.Id,
                p.Sku,
                p.Barcode,
                p.Name,
                p.SalePriceUsd,
                p.CostUsd,
                p.Category,
                p.PhotoBase64,
                p.IsActive,
                p.CreatedAtUtc,
                p.UpdatedAtUtc
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<Product>(sql, new { Id = id });
    }

    public async Task<Product?> GetBySku(string sku)
    {
        const string sql = """
            SELECT
                p.Id,
                p.Sku,
                p.Barcode,
                p.Name,
                p.SalePriceUsd,
                p.CostUsd,
                p.Category,
                p.PhotoBase64,
                p.IsActive,
                p.CreatedAtUtc,
                p.UpdatedAtUtc,
                COALESCE(SUM(CASE
                    WHEN m.MovementType IN ('In', 'Adjust') THEN m.Quantity
                    WHEN m.MovementType IN ('Out', 'Waste') THEN -m.Quantity
                    ELSE 0 END), 0) AS Stock
            FROM dbo.Products p
            LEFT JOIN dbo.InventoryMovements m ON m.ProductId = p.Id
            WHERE p.Sku = @Sku
            GROUP BY
                p.Id,
                p.Sku,
                p.Barcode,
                p.Name,
                p.SalePriceUsd,
                p.CostUsd,
                p.Category,
                p.PhotoBase64,
                p.IsActive,
                p.CreatedAtUtc,
                p.UpdatedAtUtc
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<Product>(sql, new { Sku = sku });
    }

    public async Task<int> Create(Product product)
    {
        const string sql = """
            INSERT INTO dbo.Products (Sku, Barcode, Name, SalePriceUsd, CostUsd, Category, PhotoBase64, IsActive, CreatedAtUtc)
            OUTPUT INSERTED.Id
            VALUES (@Sku, @Barcode, @Name, @SalePriceUsd, @CostUsd, @Category, @PhotoBase64, @IsActive, @CreatedAtUtc)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, product);
    }

    public async Task Update(
        int id,
        string? sku,
        string? barcode,
        string? name,
        decimal? salePriceUsd,
        decimal? costUsd,
        string? category,
        string? photoBase64,
        bool? isActive,
        DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.Products
            SET Sku = COALESCE(@Sku, Sku),
                Barcode = COALESCE(@Barcode, Barcode),
                Name = COALESCE(@Name, Name),
                SalePriceUsd = COALESCE(@SalePriceUsd, SalePriceUsd),
                CostUsd = COALESCE(@CostUsd, CostUsd),
                Category = COALESCE(@Category, Category),
                PhotoBase64 = COALESCE(@PhotoBase64, PhotoBase64),
                IsActive = COALESCE(@IsActive, IsActive),
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new
        {
            Id = id,
            Sku = sku,
            Barcode = barcode,
            Name = name,
            SalePriceUsd = salePriceUsd,
            CostUsd = costUsd,
            Category = category,
            PhotoBase64 = photoBase64,
            IsActive = isActive,
            UpdatedAtUtc = updatedAtUtc
        });
    }

    public async Task SoftDelete(int id, DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.Products
            SET IsActive = 0,
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new { Id = id, UpdatedAtUtc = updatedAtUtc });
    }
}
