using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("auth")]
public sealed class AuthController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly ITokenService _tokens;

    public AuthController(IUserRepository users, ITokenService tokens)
    {
        _users = users;
        _tokens = tokens;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthLoginResponse>> Login([FromBody] AuthLoginRequest request)
    {
        var userName = request.UserName?.Trim();
        if (string.IsNullOrWhiteSpace(userName) || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("UserName and Password are required.");
        }

        var user = await _users.GetByUserName(userName);
        if (user is null || !user.IsActive || user.IsLocked)
        {
            return Unauthorized();
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized();
        }

        var roles = await _users.GetRolesForUser(user.Id);
        var now = DateTime.UtcNow;
        var accessToken = _tokens.CreateAccessToken(user, roles, now, out var accessExpiresAtUtc);
        var refreshToken = _tokens.GenerateRefreshToken();
        var refreshExpiresAtUtc = _tokens.GetRefreshTokenExpirationUtc(now);

        await _users.CreateRefreshToken(user.Id, refreshToken, refreshExpiresAtUtc, GetRemoteIp());

        return Ok(new AuthLoginResponse(
            accessToken,
            accessExpiresAtUtc,
            refreshToken,
            refreshExpiresAtUtc,
            ToUserResponse(user, roles)
        ));
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthLoginResponse>> Refresh([FromBody] AuthRefreshRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest("RefreshToken is required.");
        }

        var storedToken = await _users.GetRefreshToken(request.RefreshToken);
        if (storedToken is null || storedToken.RevokedAtUtc is not null || storedToken.ExpiresAtUtc <= DateTime.UtcNow)
        {
            return Unauthorized();
        }

        var user = await _users.GetById(storedToken.UserId);
        if (user is null || !user.IsActive || user.IsLocked)
        {
            return Unauthorized();
        }

        var roles = await _users.GetRolesForUser(user.Id);
        var now = DateTime.UtcNow;
        var accessToken = _tokens.CreateAccessToken(user, roles, now, out var accessExpiresAtUtc);
        var newRefreshToken = _tokens.GenerateRefreshToken();
        var newRefreshExpiresAtUtc = _tokens.GetRefreshTokenExpirationUtc(now);

        await _users.RevokeRefreshToken(storedToken.Id, now, GetRemoteIp(), newRefreshToken);
        await _users.CreateRefreshToken(user.Id, newRefreshToken, newRefreshExpiresAtUtc, GetRemoteIp());

        return Ok(new AuthLoginResponse(
            accessToken,
            accessExpiresAtUtc,
            newRefreshToken,
            newRefreshExpiresAtUtc,
            ToUserResponse(user, roles)
        ));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] AuthLogoutRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return BadRequest("RefreshToken is required.");
        }

        var storedToken = await _users.GetRefreshToken(request.RefreshToken);
        if (storedToken is null || storedToken.RevokedAtUtc is not null)
        {
            return NoContent();
        }

        await _users.RevokeRefreshToken(storedToken.Id, DateTime.UtcNow, GetRemoteIp(), null);
        return NoContent();
    }

    private string? GetRemoteIp()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private static UserResponse ToUserResponse(User user, IReadOnlyList<string>? roles)
    {
        return new UserResponse(
            user.Id,
            user.UserName,
            user.FullName,
            user.Email,
            user.Phone,
            user.PhotoBase64,
            user.IsActive,
            user.IsLocked,
            roles?.ToArray() ?? Array.Empty<string>());
    }
}
