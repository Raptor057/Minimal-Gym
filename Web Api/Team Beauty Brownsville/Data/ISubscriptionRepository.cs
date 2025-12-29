using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface ISubscriptionRepository
{
    Task<IReadOnlyList<Subscription>> GetByMemberId(int memberId);
    Task<Subscription?> GetById(int id);
    Task<int> Create(Subscription subscription);
    Task Update(
        int id,
        DateTime? startDate,
        DateTime? endDate,
        string? status,
        DateTime? pausedAtUtc,
        DateTime updatedAtUtc);
    Task Pause(int id, DateTime pausedAtUtc, DateTime updatedAtUtc);
    Task Resume(int id, DateTime endDate, DateTime updatedAtUtc);
}
