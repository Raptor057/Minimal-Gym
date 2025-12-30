using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("public/roles")]
public sealed class PublicRolesController : ControllerBase
{
    private static readonly HashSet<string> AllowedRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Admin",
        "User"
    };

    private readonly IUserRepository _users;

    public PublicRolesController(IUserRepository users)
    {
        _users = users;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<string>>> Get()
    {
        var roles = await _users.GetAllRoleNames();
        var filtered = roles
            .Where(role => AllowedRoles.Contains(role))
            .OrderBy(role => role)
            .ToList();

        return Ok(filtered);
    }
}
