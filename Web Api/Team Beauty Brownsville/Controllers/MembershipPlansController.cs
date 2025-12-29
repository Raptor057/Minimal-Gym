using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("membership-plans")]
[Authorize]
public sealed class MembershipPlansController : ControllerBase
{
    private readonly IMembershipPlanRepository _plans;
    private readonly IAuditService _audit;

    public MembershipPlansController(IMembershipPlanRepository plans, IAuditService audit)
    {
        _plans = plans;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MembershipPlanResponse>>> GetAll()
    {
        var list = await _plans.GetAll();
        return Ok(list.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<MembershipPlanResponse>> GetById(int id)
    {
        var plan = await _plans.GetById(id);
        return plan is null ? NotFound() : Ok(ToResponse(plan));
    }

    [HttpPost]
    public async Task<ActionResult<MembershipPlanResponse>> Create([FromBody] MembershipPlanCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || request.DurationDays <= 0 || request.PriceUsd <= 0)
        {
            return BadRequest("Name, DurationDays, and PriceUsd are required.");
        }

        var plan = new MembershipPlan
        {
            Name = request.Name.Trim(),
            DurationDays = request.DurationDays,
            PriceUsd = request.PriceUsd,
            Rules = request.Rules?.Trim(),
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow
        };

        var id = await _plans.Create(plan);
        var created = await _plans.GetById(id);
        await _audit.LogAsync("Create", "MembershipPlan", id.ToString(), GetUserId(), new { request.Name, request.DurationDays, request.PriceUsd });
        return CreatedAtAction(nameof(GetById), new { id }, ToResponse(created!));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<MembershipPlanResponse>> Update(int id, [FromBody] MembershipPlanUpdateRequest request)
    {
        var existing = await _plans.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (request.DurationDays is not null && request.DurationDays <= 0)
        {
            return BadRequest("DurationDays must be greater than zero.");
        }

        if (request.PriceUsd is not null && request.PriceUsd <= 0)
        {
            return BadRequest("PriceUsd must be greater than zero.");
        }

        await _plans.Update(
            id,
            request.Name?.Trim(),
            request.DurationDays,
            request.PriceUsd,
            request.Rules?.Trim(),
            request.IsActive,
            DateTime.UtcNow);

        var updated = await _plans.GetById(id);
        await _audit.LogAsync("Update", "MembershipPlan", id.ToString(), GetUserId(), new { request.Name, request.DurationDays, request.PriceUsd, request.IsActive });
        return Ok(ToResponse(updated!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _plans.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _plans.SoftDelete(id, DateTime.UtcNow);
        await _audit.LogAsync("Delete", "MembershipPlan", id.ToString(), GetUserId(), null);
        return NoContent();
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static MembershipPlanResponse ToResponse(MembershipPlan plan)
    {
        return new MembershipPlanResponse(
            plan.Id,
            plan.Name,
            plan.DurationDays,
            plan.PriceUsd,
            plan.Rules,
            plan.IsActive);
    }
}
