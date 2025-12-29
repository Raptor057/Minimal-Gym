using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IMemberRepository
{
    Task<IReadOnlyList<Member>> GetAll();
    Task<Member?> GetById(int id);
    Task<int> Create(Member member);
    Task Update(
        int id,
        string? fullName,
        string? phone,
        string? email,
        DateTime? birthDate,
        string? emergencyContact,
        string? notes,
        string? photoBase64,
        bool? isActive,
        DateTime updatedAtUtc);
    Task SoftDelete(int id, DateTime updatedAtUtc);
}
