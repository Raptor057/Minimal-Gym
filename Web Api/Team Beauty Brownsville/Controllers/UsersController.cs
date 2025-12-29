using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("users")]
[Authorize(Policy = "AdminOnly")]
public sealed class UsersController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IAuditService _audit;

    public UsersController(IUserRepository users, IAuditService audit)
    {
        _users = users;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetAll()
    {
        var list = await _users.GetAll();
        var roleLookup = await _users.GetRolesByUserIds(list.Select(user => user.Id));
        var response = list.Select(user =>
        {
            roleLookup.TryGetValue(user.Id, out var roles);
            return ToUserResponse(user, roles);
        });

        return Ok(response);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UserResponse>> GetById(int id)
    {
        var user = await _users.GetById(id);
        if (user is null)
        {
            return NotFound();
        }

        var roles = await _users.GetRolesForUser(id);
        return Ok(ToUserResponse(user, roles));
    }

    [HttpPost]
    public async Task<ActionResult<UserResponse>> Create([FromBody] UserCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.UserName) ||
            string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.FullName))
        {
            return BadRequest("UserName, Password, and FullName are required.");
        }

        var now = DateTime.UtcNow;
        var user = new User
        {
            UserName = request.UserName.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FullName = request.FullName.Trim(),
            Email = request.Email?.Trim(),
            Phone = request.Phone?.Trim(),
            PhotoBase64 = request.PhotoBase64,
            IsActive = request.IsActive,
            IsLocked = request.IsLocked,
            CreatedAtUtc = now
        };

        var id = await _users.Create(user);

        if (request.Roles is { Length: > 0 })
        {
            await _users.SetRolesForUser(id, request.Roles);
        }

        var created = await _users.GetById(id);
        var roles = await _users.GetRolesForUser(id);
        await _audit.LogAsync("Create", "User", id.ToString(), GetUserId(), new { request.UserName, request.FullName, HasPhoto = request.PhotoBase64 is not null });
        return CreatedAtAction(nameof(GetById), new { id }, ToUserResponse(created!, roles));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<UserResponse>> Update(int id, [FromBody] UserUpdateRequest request)
    {
        var existing = await _users.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        string? passwordHash = null;
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
        }

        await _users.Update(
            id,
            passwordHash,
            request.FullName?.Trim(),
            request.Email?.Trim(),
            request.Phone?.Trim(),
            request.PhotoBase64,
            request.IsActive,
            request.IsLocked,
            DateTime.UtcNow);

        if (request.Roles is not null)
        {
            await _users.SetRolesForUser(id, request.Roles);
        }

        var updated = await _users.GetById(id);
        var roles = await _users.GetRolesForUser(id);
        await _audit.LogAsync("Update", "User", id.ToString(), GetUserId(), new { request.FullName, request.Email, request.Phone, request.IsActive, request.IsLocked, HasPhoto = request.PhotoBase64 is not null });
        return Ok(ToUserResponse(updated!, roles));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _users.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _users.SoftDelete(id, DateTime.UtcNow);
        await _audit.LogAsync("Delete", "User", id.ToString(), GetUserId(), null);
        return NoContent();
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
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
