using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("audit")]
[Authorize]
public sealed class AuditController : ControllerBase
{
    private readonly IAuditRepository _audit;

    public AuditController(IAuditRepository audit)
    {
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AuditLogResponse>>> Get(
        [FromQuery] string? entity,
        [FromQuery] string? action,
        [FromQuery] int? userId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int limit = 100)
    {
        if (limit <= 0 || limit > 500)
        {
            return BadRequest("limit must be between 1 and 500.");
        }

        var rows = await _audit.Get(
            string.IsNullOrWhiteSpace(entity) ? null : entity.Trim(),
            string.IsNullOrWhiteSpace(action) ? null : action.Trim(),
            userId,
            from,
            to,
            limit);

        return Ok(rows.Select(log => new AuditLogResponse(
            log.Id,
            log.EntityName,
            log.EntityId,
            log.Action,
            log.UserId,
            log.CreatedAtUtc,
            log.DataJson)));
    }
}
