using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> GetAll();
    Task<Product?> GetById(int id);
    Task<int> Create(Product product);
    Task Update(
        int id,
        string? sku,
        string? barcode,
        string? name,
        decimal? salePriceUsd,
        decimal? costUsd,
        string? category,
        bool? isActive,
        DateTime updatedAtUtc);
    Task SoftDelete(int id, DateTime updatedAtUtc);
}
