using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IMembershipPlanRepository
{
    Task<IReadOnlyList<MembershipPlan>> GetAll();
    Task<MembershipPlan?> GetById(int id);
    Task<int> Create(MembershipPlan plan);
    Task Update(
        int id,
        string? name,
        int? durationDays,
        decimal? priceUsd,
        string? rules,
        bool? isActive,
        DateTime updatedAtUtc);
    Task SoftDelete(int id, DateTime updatedAtUtc);
}
