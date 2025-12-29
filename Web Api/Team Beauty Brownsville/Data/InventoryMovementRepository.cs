using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class InventoryMovementRepository : IInventoryMovementRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public InventoryMovementRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<InventoryMovement>> GetAll()
    {
        const string sql = """
            SELECT Id, ProductId, MovementType, Quantity, UnitCostUsd, Notes, CreatedAtUtc, CreatedByUserId
            FROM dbo.InventoryMovements
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var movements = await connection.QueryAsync<InventoryMovement>(sql);
        return movements.ToList();
    }

    public async Task<InventoryMovement?> GetById(int id)
    {
        const string sql = """
            SELECT Id, ProductId, MovementType, Quantity, UnitCostUsd, Notes, CreatedAtUtc, CreatedByUserId
            FROM dbo.InventoryMovements
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<InventoryMovement>(sql, new { Id = id });
    }

    public async Task<decimal> GetStockForProduct(int productId)
    {
        const string sql = """
            SELECT COALESCE(SUM(CASE
                WHEN MovementType IN ('In', 'Adjust') THEN Quantity
                WHEN MovementType IN ('Out', 'Waste') THEN -Quantity
                ELSE 0 END), 0)
            FROM dbo.InventoryMovements
            WHERE ProductId = @ProductId
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<decimal>(sql, new { ProductId = productId });
    }

    public async Task<int> Create(InventoryMovement movement)
    {
        const string sql = """
            INSERT INTO dbo.InventoryMovements (ProductId, MovementType, Quantity, UnitCostUsd, Notes, CreatedAtUtc, CreatedByUserId)
            OUTPUT INSERTED.Id
            VALUES (@ProductId, @MovementType, @Quantity, @UnitCostUsd, @Notes, @CreatedAtUtc, @CreatedByUserId)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, movement);
    }
}
