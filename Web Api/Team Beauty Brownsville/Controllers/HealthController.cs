using Microsoft.AspNetCore.Mvc;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { status = "ok", utc = DateTime.UtcNow });
    }
}
