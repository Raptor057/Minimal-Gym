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
    private readonly IUserRepository _users;
    private readonly IAuditService _audit;
    private readonly ICashBalanceService _balances;

    public CashController(ICashRepository cash, IUserRepository users, IAuditService audit, ICashBalanceService balances)
    {
        _cash = cash;
        _users = users;
        _audit = audit;
        _balances = balances;
    }

    [HttpPost("cash/open")]
    public async Task<ActionResult<CashSessionResponse>> Open([FromBody] CashOpenRequest request)
    {
        if (request.OpeningAmountUsd < 0)
        {
            return BadRequest("OpeningAmountUsd cannot be negative.");
        }

        if (request.UserId <= 0 || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest("UserId and Password are required.");
        }

        var user = await _users.GetById(request.UserId);
        if (user is null || !user.IsActive || user.IsLocked)
        {
            return BadRequest("Invalid user for opening cash.");
        }

        if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return BadRequest("Invalid password for cash opening.");
        }

        var existing = await _cash.GetOpenSession();
        if (existing is not null)
        {
            return Conflict("There is already an open cash session.");
        }

        var session = new CashSession
        {
            OpenedByUserId = user.Id,
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

        await _audit.LogAsync("Open", "CashSession", (created?.Id ?? id).ToString(), user.Id, new { request.OpeningAmountUsd });
        return Created($"/cash/current", ToResponse(created ?? session));
    }

    [HttpGet("cash/current")]
    public async Task<ActionResult<CashSessionResponse>> GetCurrent()
    {
        var session = await _cash.GetOpenSession();
        return session is null ? NotFound() : Ok(ToResponse(session));
    }

    [HttpGet("cash/movements")]
    public async Task<ActionResult<IEnumerable<CashMovementResponse>>> GetMovements([FromQuery] int? cashSessionId)
    {
        var rows = await _cash.GetMovements(cashSessionId);
        return Ok(rows.Select(ToMovementResponse));
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

        var openSession = await _cash.GetOpenSession();
        if (openSession is null)
        {
            return BadRequest("No open cash session. Open cash before adding movements.");
        }

        if (openSession.Id != request.CashSessionId)
        {
            return BadRequest("CashSessionId does not match the open session.");
        }

        if (string.Equals(request.MovementType, "Out", StringComparison.OrdinalIgnoreCase))
        {
            var snapshot = await _balances.GetOpenSnapshot();
            if (snapshot is null || snapshot.CashMethodId is null)
            {
                return BadRequest("Cash method is not configured.");
            }

            if (!snapshot.MethodBalances.TryGetValue(snapshot.CashMethodId.Value, out var cashBalance))
            {
                cashBalance = 0m;
            }

            if (cashBalance - request.AmountUsd < 0)
            {
                return BadRequest("Cash balance cannot be negative.");
            }
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

    [HttpGet("cash/summary")]
    public async Task<ActionResult<CashSessionSummaryResponse>> GetSummary([FromQuery] int? cashSessionId)
    {
        CashBalanceSnapshot? snapshot = cashSessionId is null
            ? await _balances.GetOpenSnapshot()
            : await _balances.GetSnapshot(cashSessionId.Value);

        if (snapshot is null)
        {
            return NotFound("Cash session not found.");
        }

        return Ok(ToSummaryResponse(snapshot));
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

    private static CashMovementResponse ToMovementResponse(CashMovement movement)
    {
        return new CashMovementResponse(
            movement.Id,
            movement.CashSessionId,
            movement.MovementType,
            movement.AmountUsd,
            movement.Notes,
            movement.CreatedAtUtc,
            movement.CreatedByUserId);
    }

    private static CashSessionSummaryResponse ToSummaryResponse(CashBalanceSnapshot snapshot)
    {
        var methodTotals = snapshot.Methods
            .Select(method => new CashMethodTotalResponse(
                method.Id,
                method.Name,
                snapshot.PaymentTotals.TryGetValue(method.Id, out var amount) ? amount : 0m))
            .ToList();

        return new CashSessionSummaryResponse(
            snapshot.Session.Id,
            snapshot.Session.OpenedAtUtc,
            snapshot.Session.ClosedAtUtc,
            snapshot.Session.OpeningAmountUsd,
            snapshot.CashMovementsInUsd,
            snapshot.CashMovementsOutUsd,
            snapshot.CashExpensesUsd,
            snapshot.ExpectedCashUsd,
            methodTotals);
    }
}
