using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IPaymentRepository
{
    Task<IReadOnlyList<Payment>> GetAll();
    Task<Payment?> GetById(int id);
    Task<IReadOnlyList<Payment>> GetByMemberId(int memberId);
    Task<int> Create(Payment payment);
}
