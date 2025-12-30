using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IProductRepository
{
    Task<IReadOnlyList<Product>> GetAll();
    Task<Product?> GetById(int id);
    Task<Product?> GetBySku(string sku);
    Task<int> Create(Product product);
    Task Update(
        int id,
        string? sku,
        string? barcode,
        string? name,
        decimal? salePriceUsd,
        decimal? costUsd,
        string? category,
        string? photoBase64,
        bool? isActive,
        DateTime updatedAtUtc);
    Task SoftDelete(int id, DateTime updatedAtUtc);
}
