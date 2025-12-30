using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface ISaleRepository
{
    Task<IReadOnlyList<Sale>> GetAll();
    Task<Sale?> GetById(int id);
    Task<int> CreateSaleWithItems(Sale sale, IReadOnlyList<SaleItem> items);
    Task CreateSalePayment(SalePayment payment);
    Task<IReadOnlyList<SaleItem>> GetItemsBySaleId(int saleId);
    Task<IReadOnlyList<SalePayment>> GetPaymentsBySaleId(int saleId);
    Task UpdateStatus(int saleId, string status);
    Task AddRefundInventory(int saleId, IReadOnlyList<SaleItem> items, int? userId);
}
