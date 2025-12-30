using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IUserRepository
{
    Task<User?> GetByUserName(string userName);
    Task<User?> GetById(int id);
    Task<IReadOnlyList<User>> GetAll();
    Task<IReadOnlyList<User>> GetPublicUsers();
    Task<int> Create(User user);
    Task Update(
        int id,
        string? passwordHash,
        string? fullName,
        string? email,
        string? phone,
        string? photoBase64,
        bool? isActive,
        bool? isLocked,
        DateTime updatedAtUtc);
    Task SoftDelete(int id, DateTime updatedAtUtc);
    Task<IReadOnlyList<string>> GetRolesForUser(int userId);
    Task<Dictionary<int, List<string>>> GetRolesByUserIds(IEnumerable<int> userIds);
    Task SetRolesForUser(int userId, IEnumerable<string> roleNames);
    Task CreateRefreshToken(int userId, string token, DateTime expiresAtUtc, string? createdByIp);
    Task<RefreshToken?> GetRefreshToken(string token);
    Task RevokeRefreshToken(int refreshTokenId, DateTime revokedAtUtc, string? revokedByIp, string? replacedByToken);
    Task<int> GetCount();
    Task<IReadOnlyList<string>> GetAllRoleNames();
}
