using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Services;

public sealed class TokenService : ITokenService
{
    private readonly JwtSettings _settings;
    private readonly SymmetricSecurityKey _key;

    public TokenService(IOptions<JwtSettings> options)
    {
        _settings = options.Value;
        _key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Key));
    }

    public string CreateAccessToken(User user, IReadOnlyList<string> roles, DateTime utcNow, out DateTime expiresAtUtc)
    {
        expiresAtUtc = utcNow.AddMinutes(_settings.AccessTokenMinutes);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.UserName),
            new("name", user.FullName)
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var credentials = new SigningCredentials(_key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: utcNow,
            expires: expiresAtUtc,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        Span<byte> bytes = stackalloc byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    public DateTime GetRefreshTokenExpirationUtc(DateTime utcNow)
    {
        return utcNow.AddDays(_settings.RefreshTokenDays);
    }
}
