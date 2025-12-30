using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("public/users")]
public sealed class PublicUsersController : ControllerBase
{
    private readonly IUserRepository _users;

    public PublicUsersController(IUserRepository users)
    {
        _users = users;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<UserPublicResponse>>> Get()
    {
        var list = await _users.GetPublicUsers();
        var response = list.Select(user => new UserPublicResponse(
            user.Id,
            user.UserName,
            user.FullName,
            user.PhotoBase64));

        return Ok(response);
    }
}
