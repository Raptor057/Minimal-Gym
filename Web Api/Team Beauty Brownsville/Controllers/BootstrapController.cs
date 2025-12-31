using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("bootstrap")]
public sealed class BootstrapController : ControllerBase
{
    private readonly IUserRepository _users;

    public BootstrapController(IUserRepository users)
    {
        _users = users;
    }

    [HttpGet("status")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> Status()
    {
        var count = await _users.GetCount();
        return Ok(new { hasUsers = count > 0 });
    }

    [HttpPost("first-admin")]
    [AllowAnonymous]
    public async Task<ActionResult<UserResponse>> CreateFirstAdmin([FromBody] UserCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest("UserName, Password, and FullName are required.");
        }

        if (await _users.GetCount() > 0)
        {
            return Conflict("First admin already created.");
        }

        var now = DateTime.UtcNow;
        var user = new User
        {
            UserName = request.UserName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            PhotoBase64 = string.IsNullOrWhiteSpace(request.PhotoBase64) ? null : request.PhotoBase64.Trim(),
            IsActive = request.IsActive,
            IsLocked = request.IsLocked,
            CreatedAtUtc = now
        };

        var id = await _users.Create(user);
        await _users.SetRolesForUser(id, new[] { "Admin" });

        var created = await _users.GetById(id);
        return Created($"/users/{id}", new UserResponse(
            created!.Id,
            created.UserName,
            created.FullName,
            created.Email,
            created.Phone,
            created.PhotoBase64,
            created.IsActive,
            created.IsLocked,
            new[] { "Admin" }));
    }
}
