using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IConfigRepository
{
    Task<Config?> Get();
    Task Update(decimal? taxRate, string? receiptPrefix, int? nextReceiptNo);
}
