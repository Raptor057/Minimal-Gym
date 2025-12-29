using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IInventoryMovementRepository
{
    Task<IReadOnlyList<InventoryMovement>> GetAll();
    Task<InventoryMovement?> GetById(int id);
    Task<decimal> GetStockForProduct(int productId);
    Task<int> Create(InventoryMovement movement);
}
