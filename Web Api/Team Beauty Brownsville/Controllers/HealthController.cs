using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("health")]
public sealed class HealthController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public HealthController(IWebHostEnvironment env)
    {
        _env = env;
    }

    [HttpGet]
    public IActionResult Get()
    {
        return Ok(new { status = "ok", utc = DateTime.UtcNow });
    }

    [HttpGet("version")]
    [AllowAnonymous]
    public IActionResult GetVersion()
    {
        var candidates = new[]
        {
            Path.Combine(_env.ContentRootPath, "VERSION"),
            Path.Combine(Directory.GetParent(_env.ContentRootPath)?.FullName ?? string.Empty, "VERSION")
        };

        var versionPath = candidates.FirstOrDefault(System.IO.File.Exists);
        if (string.IsNullOrWhiteSpace(versionPath))
        {
            return Ok(new { version = "unknown" });
        }

        var version = System.IO.File.ReadAllText(versionPath).Trim();
        return Ok(new { version = string.IsNullOrWhiteSpace(version) ? "unknown" : version });
    }
}
