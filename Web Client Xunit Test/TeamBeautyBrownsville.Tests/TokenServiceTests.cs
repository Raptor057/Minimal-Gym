using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class TokenServiceTests
{
    [Fact]
    public void CreateAccessToken_ReturnsJwt_WithExpectedClaims()
    {
        var settings = Options.Create(new JwtSettings
        {
            Issuer = "TestIssuer",
            Audience = "TestAudience",
            Key = "THIS_IS_A_TEST_KEY_32_CHARS_MIN_1234",
            AccessTokenMinutes = 10
        });

        var service = new TokenService(settings);
        var user = new User { Id = 5, UserName = "user", FullName = "User Name" };
        var token = service.CreateAccessToken(user, new[] { "Admin" }, DateTime.UtcNow, out var expires);

        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(token);

        Assert.Equal("TestIssuer", jwt.Issuer);
        Assert.Contains(jwt.Claims, c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == "5");
        Assert.True(expires > DateTime.UtcNow);
    }
}
