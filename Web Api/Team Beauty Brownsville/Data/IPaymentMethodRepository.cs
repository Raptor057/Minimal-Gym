using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IPaymentMethodRepository
{
    Task<IReadOnlyList<PaymentMethod>> GetAll();
    Task<PaymentMethod?> GetById(int id);
    Task<bool> Exists(int id);
    Task<int> Create(PaymentMethod method);
    Task Update(int id, string? name, bool? isActive);
    Task SoftDelete(int id);
}
