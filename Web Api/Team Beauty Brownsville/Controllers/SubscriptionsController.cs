using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Authorize]
public sealed class SubscriptionsController : ControllerBase
{
    private readonly ISubscriptionRepository _subscriptions;
    private readonly IMembershipPlanRepository _plans;
    private readonly IMemberRepository _members;
    private readonly IAuditService _audit;
    private readonly ICashRepository _cash;

    public SubscriptionsController(
        ISubscriptionRepository subscriptions,
        IMembershipPlanRepository plans,
        IMemberRepository members,
        IAuditService audit,
        ICashRepository cash)
    {
        _subscriptions = subscriptions;
        _plans = plans;
        _members = members;
        _audit = audit;
        _cash = cash;
    }

    [HttpGet("subscriptions")]
    public async Task<ActionResult<IEnumerable<SubscriptionResponse>>> GetAll()
    {
        var list = await _subscriptions.GetAll();
        return Ok(list.Select(ToResponse));
    }

    [HttpGet("members/{memberId:int}/subscriptions")]
    public async Task<ActionResult<IEnumerable<SubscriptionResponse>>> GetByMember(int memberId)
    {
        var member = await _members.GetById(memberId);
        if (member is null)
        {
            return NotFound();
        }

        var list = await _subscriptions.GetByMemberId(memberId);
        return Ok(list.Select(ToResponse));
    }

    [HttpPost("members/{memberId:int}/subscriptions")]
    public async Task<ActionResult<SubscriptionResponse>> Create(int memberId, [FromBody] SubscriptionCreateRequest request)
    {
        var openSession = await _cash.GetOpenSession();
        if (openSession is null)
        {
            return BadRequest("No open cash session. Open cash before creating subscriptions.");
        }

        var member = await _members.GetById(memberId);
        if (member is null)
        {
            return NotFound("Member not found.");
        }

        var existingSubs = await _subscriptions.GetByMemberId(memberId);
        if (HasActiveSubscription(existingSubs))
        {
            return BadRequest("Member already has an active subscription.");
        }

        var plan = await _plans.GetById(request.PlanId);
        if (plan is null || !plan.IsActive)
        {
            return BadRequest("Plan not found or inactive.");
        }

        var startDate = (request.StartDate ?? DateTime.UtcNow).Date;
        var endDate = startDate.AddDays(plan.DurationDays);

        var subscription = new Subscription
        {
            MemberId = memberId,
            PlanId = plan.Id,
            StartDate = startDate,
            EndDate = endDate,
            Status = "Active",
            PriceUsd = plan.PriceUsd,
            CreatedAtUtc = DateTime.UtcNow
        };

        var id = await _subscriptions.Create(subscription);
        var created = await _subscriptions.GetById(id);
        await _audit.LogAsync("Create", "Subscription", id.ToString(), GetUserId(), new { memberId, request.PlanId, StartDate = startDate, EndDate = endDate });
        return Created($"/subscriptions/{id}", ToResponse(created!));
    }

    [HttpPut("subscriptions/{id:int}")]
    public async Task<ActionResult<SubscriptionResponse>> Update(int id, [FromBody] SubscriptionUpdateRequest request)
    {
        var existing = await _subscriptions.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (request.Status is not null &&
            request.Status is not ("Active" or "Expired" or "Paused" or "Cancelled"))
        {
            return BadRequest("Invalid status.");
        }

        if (string.Equals(request.Status, "Active", StringComparison.OrdinalIgnoreCase))
        {
            var subs = await _subscriptions.GetByMemberId(existing.MemberId);
            if (HasActiveSubscription(subs, existing.Id))
            {
                return BadRequest("Member already has another active subscription.");
            }
        }

        await _subscriptions.Update(
            id,
            request.StartDate?.Date,
            request.EndDate?.Date,
            request.Status,
            null,
            DateTime.UtcNow);

        var updated = await _subscriptions.GetById(id);
        await _audit.LogAsync("Update", "Subscription", id.ToString(), GetUserId(), new { request.StartDate, request.EndDate, request.Status });
        return Ok(ToResponse(updated!));
    }

    [HttpPost("subscriptions/{id:int}/renew")]
    public async Task<ActionResult<SubscriptionResponse>> Renew(int id, [FromBody] SubscriptionRenewRequest request)
    {
        var openSession = await _cash.GetOpenSession();
        if (openSession is null)
        {
            return BadRequest("No open cash session. Open cash before renewing subscriptions.");
        }

        var existing = await _subscriptions.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        var plan = await _plans.GetById(existing.PlanId);
        if (plan is null)
        {
            return BadRequest("Plan not found.");
        }

        var subs = await _subscriptions.GetByMemberId(existing.MemberId);
        if (HasActiveSubscription(subs, existing.Id))
        {
            return BadRequest("Member already has another active subscription.");
        }

        var startDate = (request.StartDate ?? DateTime.UtcNow).Date;
        var endDate = startDate.AddDays(plan.DurationDays);

        await _subscriptions.Update(
            id,
            startDate,
            endDate,
            "Active",
            null,
            DateTime.UtcNow);

        var updated = await _subscriptions.GetById(id);
        await _audit.LogAsync("Renew", "Subscription", id.ToString(), GetUserId(), new { StartDate = startDate, EndDate = endDate });
        return Ok(ToResponse(updated!));
    }

    [HttpPost("subscriptions/{id:int}/change-plan")]
    public async Task<ActionResult<SubscriptionResponse>> ChangePlan(int id, [FromBody] SubscriptionChangePlanRequest request)
    {
        var openSession = await _cash.GetOpenSession();
        if (openSession is null)
        {
            return BadRequest("No open cash session. Open cash before changing plans.");
        }

        var existing = await _subscriptions.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        var plan = await _plans.GetById(request.PlanId);
        if (plan is null || !plan.IsActive)
        {
            return BadRequest("Plan not found or inactive.");
        }

        var subs = await _subscriptions.GetByMemberId(existing.MemberId);
        if (HasActiveSubscription(subs, existing.Id))
        {
            return BadRequest("Member already has another active subscription.");
        }

        var startDate = (request.StartDate ?? DateTime.UtcNow).Date;
        var endDate = startDate.AddDays(plan.DurationDays);

        var subscription = new Subscription
        {
            MemberId = existing.MemberId,
            PlanId = plan.Id,
            StartDate = startDate,
            EndDate = endDate,
            Status = "Pending",
            PriceUsd = plan.PriceUsd,
            CreatedAtUtc = DateTime.UtcNow
        };

        var newId = await _subscriptions.Create(subscription);
        var created = await _subscriptions.GetById(newId);
        await _audit.LogAsync(
            "ChangePlan",
            "Subscription",
            newId.ToString(),
            GetUserId(),
            new { PreviousSubscriptionId = id, request.PlanId, StartDate = startDate, EndDate = endDate });
        return Created($"/subscriptions/{newId}", ToResponse(created!));
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static SubscriptionResponse ToResponse(Subscription subscription)
    {
        return new SubscriptionResponse(
            subscription.Id,
            subscription.MemberId,
            subscription.PlanId,
            subscription.StartDate,
            subscription.EndDate,
            subscription.Status,
            subscription.PriceUsd,
            subscription.PausedAtUtc);
    }

    [HttpPost("subscriptions/{id:int}/pause")]
    public async Task<IActionResult> Pause(int id)
    {
        var existing = await _subscriptions.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (!string.Equals(existing.Status, "Active", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Subscription must be Active to pause.");
        }

        var pausedAtUtc = DateTime.UtcNow;
        await _subscriptions.Pause(id, pausedAtUtc, pausedAtUtc);
        await _audit.LogAsync("Pause", "Subscription", id.ToString(), GetUserId(), new { PausedAtUtc = pausedAtUtc });
        return NoContent();
    }

    [HttpPost("subscriptions/{id:int}/resume")]
    public async Task<IActionResult> Resume(int id)
    {
        var existing = await _subscriptions.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (!string.Equals(existing.Status, "Paused", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Subscription must be Paused to resume.");
        }

        var subs = await _subscriptions.GetByMemberId(existing.MemberId);
        if (HasActiveSubscription(subs, existing.Id))
        {
            return BadRequest("Member already has another active subscription.");
        }

        if (existing.PausedAtUtc is null)
        {
            return BadRequest("PausedAtUtc is missing.");
        }

        var now = DateTime.UtcNow;
        var pausedDays = (now.Date - existing.PausedAtUtc.Value.Date).Days;
        if (pausedDays < 0)
        {
            pausedDays = 0;
        }

        var newEndDate = existing.EndDate.AddDays(pausedDays);
        await _subscriptions.Resume(id, newEndDate, now);
        await _audit.LogAsync("Resume", "Subscription", id.ToString(), GetUserId(), new { NewEndDate = newEndDate });
        return NoContent();
    }

    private static bool HasActiveSubscription(IEnumerable<Subscription> subscriptions, int? excludeId = null)
    {
        return subscriptions.Any(sub =>
            string.Equals(sub.Status, "Active", StringComparison.OrdinalIgnoreCase) &&
            (!excludeId.HasValue || sub.Id != excludeId.Value));
    }
}
