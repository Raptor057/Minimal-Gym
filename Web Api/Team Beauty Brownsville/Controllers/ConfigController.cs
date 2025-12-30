using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("config")]
[Authorize]
public sealed class ConfigController : ControllerBase
{
    private readonly IConfigRepository _config;
    private readonly IAuditService _audit;

    public ConfigController(IConfigRepository config, IAuditService audit)
    {
        _config = config;
        _audit = audit;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<ConfigResponse>> Get()
    {
        var config = await _config.Get();
        if (config is null)
        {
            return NotFound();
        }

        return Ok(new ConfigResponse(
            config.CurrencyCode,
            config.TaxRate,
            config.ReceiptPrefix,
            config.NextReceiptNo,
            config.LogoBase64));
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] ConfigUpdateRequest request)
    {
        await _config.Update(
            request.TaxRate,
            request.ReceiptPrefix?.Trim(),
            request.NextReceiptNo,
            request.LogoBase64);

        await _audit.LogAsync("Update", "Config", "1", GetUserId(), new { request.TaxRate, request.ReceiptPrefix, request.NextReceiptNo, HasLogo = request.LogoBase64 is not null });
        return NoContent();
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }
}
