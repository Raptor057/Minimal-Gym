using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Services;

public interface ITokenService
{
    string CreateAccessToken(User user, IReadOnlyList<string> roles, DateTime utcNow, out DateTime expiresAtUtc);
    string GenerateRefreshToken();
    DateTime GetRefreshTokenExpirationUtc(DateTime utcNow);
}
