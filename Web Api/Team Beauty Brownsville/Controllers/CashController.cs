using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Authorize]
public sealed class CashController : ControllerBase
{
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "In", "Out"
    };

    private readonly ICashRepository _cash;
    private readonly IAuditService _audit;

    public CashController(ICashRepository cash, IAuditService audit)
    {
        _cash = cash;
        _audit = audit;
    }

    [HttpPost("cash/open")]
    public async Task<ActionResult<CashSessionResponse>> Open([FromBody] CashOpenRequest request)
    {
        if (request.OpeningAmountUsd < 0)
        {
            return BadRequest("OpeningAmountUsd cannot be negative.");
        }

        var existing = await _cash.GetOpenSession();
        if (existing is not null)
        {
            return Conflict("There is already an open cash session.");
        }

        var session = new CashSession
        {
            OpenedByUserId = GetUserId() ?? 0,
            OpenedAtUtc = DateTime.UtcNow,
            OpeningAmountUsd = request.OpeningAmountUsd,
            Status = "Open"
        };

        var id = await _cash.OpenSession(session);
        var created = await _cash.GetOpenSession();
        if (created is null)
        {
            session.Id = id;
        }

        await _audit.LogAsync("Open", "CashSession", (created?.Id ?? id).ToString(), GetUserId(), new { request.OpeningAmountUsd });
        return Created($"/cash/current", ToResponse(created ?? session));
    }

    [HttpGet("cash/current")]
    public async Task<ActionResult<CashSessionResponse>> GetCurrent()
    {
        var session = await _cash.GetOpenSession();
        return session is null ? NotFound() : Ok(ToResponse(session));
    }

    [HttpPost("cash/movements")]
    public async Task<IActionResult> AddMovement([FromBody] CashMovementCreateRequest request)
    {
        if (!AllowedTypes.Contains(request.MovementType))
        {
            return BadRequest("Invalid MovementType.");
        }

        if (request.AmountUsd <= 0)
        {
            return BadRequest("AmountUsd must be greater than zero.");
        }

        var movement = new CashMovement
        {
            CashSessionId = request.CashSessionId,
            MovementType = request.MovementType.Trim(),
            AmountUsd = request.AmountUsd,
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = GetUserId() ?? 0
        };

        await _cash.AddMovement(movement);
        await _audit.LogAsync("Create", "CashMovement", request.CashSessionId.ToString(), GetUserId(), new { request.MovementType, request.AmountUsd });
        return NoContent();
    }

    [HttpPost("cash/close")]
    public async Task<IActionResult> Close([FromBody] CashCloseRequest request)
    {
        var openSession = await _cash.GetOpenSession();
        if (openSession is null)
        {
            return NotFound("No open cash session.");
        }

        if (openSession.Id != request.CashSessionId)
        {
            return BadRequest("CashSessionId does not match the open session.");
        }

        var difference = request.CountedCashUsd - request.CashTotalUsd;

        var closure = new CashClosure
        {
            CashSessionId = request.CashSessionId,
            ClosedByUserId = GetUserId() ?? 0,
            ClosedAtUtc = DateTime.UtcNow,
            CashTotalUsd = request.CashTotalUsd,
            CardTotalUsd = request.CardTotalUsd,
            TransferTotalUsd = request.TransferTotalUsd,
            OtherTotalUsd = request.OtherTotalUsd,
            CountedCashUsd = request.CountedCashUsd,
            DifferenceUsd = difference
        };

        await _cash.CloseSession(closure);
        await _audit.LogAsync("Close", "CashSession", request.CashSessionId.ToString(), GetUserId(), new { request.CashTotalUsd, request.CountedCashUsd, Difference = difference });
        return NoContent();
    }

    [HttpGet("cash/closures")]
    public async Task<ActionResult<IEnumerable<CashSessionResponse>>> GetClosures()
    {
        var list = await _cash.GetClosures();
        return Ok(list.Select(ToResponse));
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static CashSessionResponse ToResponse(CashSession session)
    {
        return new CashSessionResponse(
            session.Id,
            session.OpenedByUserId,
            session.OpenedAtUtc,
            session.OpeningAmountUsd,
            session.Status,
            session.ClosedByUserId,
            session.ClosedAtUtc);
    }
}
