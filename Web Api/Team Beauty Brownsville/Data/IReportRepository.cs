using Team_Beauty_Brownsville.Dtos;

namespace Team_Beauty_Brownsville.Data;

public interface IReportRepository
{
    Task<(decimal SubscriptionPayments, decimal SalesPayments)> GetRevenue(DateTime fromUtc, DateTime toUtc);
    Task<IReadOnlyList<StatusCountResponse>> GetSubscriptionStatusCounts();
    Task<SubscriptionsDueResponse> GetSubscriptionsDue(DateTime fromUtc, DateTime toUtc);
    Task<SalesReportResponse> GetSalesReport(DateTime fromUtc, DateTime toUtc);
    Task<IReadOnlyList<LowStockItemResponse>> GetLowStock(decimal threshold);
}
