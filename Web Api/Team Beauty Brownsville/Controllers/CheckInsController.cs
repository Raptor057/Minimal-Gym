using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("checkins")]
public sealed class CheckInsController : ControllerBase
{
    private readonly ICheckInRepository _checkins;
    private readonly IMemberRepository _members;
    private readonly ISubscriptionRepository _subscriptions;
    private readonly IAuditService _audit;
    private readonly CheckInStream _stream;

    public CheckInsController(
        ICheckInRepository checkins,
        IMemberRepository members,
        ISubscriptionRepository subscriptions,
        IAuditService audit,
        CheckInStream stream)
    {
        _checkins = checkins;
        _members = members;
        _subscriptions = subscriptions;
        _audit = audit;
        _stream = stream;
    }

    [HttpGet]
    [Authorize]
    public async Task<ActionResult<IEnumerable<CheckInResponse>>> GetAll()
    {
        var list = await _checkins.GetAllWithMemberPhoto();
        return Ok(list.Select(ToResponse));
    }

    [HttpGet("scan/{memberId:int}")]
    [AllowAnonymous]
    public async Task<ActionResult<CheckInScanResponse>> Scan(int memberId)
    {
        var member = await _members.GetById(memberId);
        if (member is null)
        {
            return NotFound("Member not found.");
        }

        var now = DateTime.UtcNow;
        var subscriptions = await _subscriptions.GetByMemberId(memberId);
        var latest = subscriptions.OrderByDescending(sub => sub.EndDate).FirstOrDefault();
        var hasActive = await _checkins.HasActiveSubscription(memberId, now);
        int? daysToExpire = null;
        if (latest is not null)
        {
            var diff = (latest.EndDate.Date - now.Date).Days;
            daysToExpire = Math.Max(0, diff);
        }

        return Ok(new CheckInScanResponse(
            member.Id,
            member.FullName,
            member.Email,
            member.Phone,
            member.PhotoBase64,
            member.IsActive,
            hasActive,
            latest?.Status,
            latest?.EndDate,
            daysToExpire));
    }

    [HttpGet("today")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<CheckInPublicResponse>>> GetToday()
    {
        var now = DateTime.UtcNow;
        var list = await _checkins.GetTodayWithMemberSummary(now);
        var response = list.Select(item =>
        {
            int? daysToExpire = null;
            if (item.SubscriptionEndDate is not null)
            {
                var diff = (item.SubscriptionEndDate.Value.Date - now.Date).Days;
                daysToExpire = Math.Max(0, diff);
            }

            var hasActiveSubscription = string.Equals(item.SubscriptionStatus, "Active", StringComparison.OrdinalIgnoreCase);

            return new CheckInPublicResponse(
                item.Id,
                item.FullName,
                item.PhotoBase64,
                item.IsActive,
                item.SubscriptionStatus,
                item.SubscriptionEndDate,
                daysToExpire,
                hasActiveSubscription,
                item.CheckedInAtUtc);
        });

        return Ok(response);
    }

    [HttpGet("stream")]
    [AllowAnonymous]
    public async Task Stream()
    {
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Connection = "keep-alive";
        Response.Headers["X-Accel-Buffering"] = "no";
        Response.ContentType = "text/event-stream";

        var id = _stream.Subscribe(out var reader);
        try
        {
            await foreach (var message in reader.ReadAllAsync(HttpContext.RequestAborted))
            {
                await Response.WriteAsync($"data: {message}\n\n");
                await Response.Body.FlushAsync();
            }
        }
        finally
        {
            _stream.Unsubscribe(id);
        }
    }

    [HttpPost]
    [AllowAnonymous]
    public async Task<ActionResult<CheckInResponse>> Create([FromBody] CheckInCreateRequest request)
    {
        if (request.MemberId <= 0)
        {
            return BadRequest("MemberId is required.");
        }

        var member = await _members.GetById(request.MemberId);
        if (member is null)
        {
            return BadRequest("Member not found.");
        }

        var checkedInAtUtc = request.CheckedInAtUtc ?? DateTime.UtcNow;
        var hasActiveSubscription = await _checkins.HasActiveSubscription(request.MemberId, checkedInAtUtc);
        if (!hasActiveSubscription)
        {
            return BadRequest("Member does not have an active subscription.");
        }

        var checkIn = new CheckIn
        {
            MemberId = request.MemberId,
            CheckedInAtUtc = checkedInAtUtc,
            CreatedByUserId = GetUserId()
        };

        var id = await _checkins.Create(checkIn);
        checkIn.Id = id;
        var response = new CheckInResponse(checkIn.Id, checkIn.MemberId, checkIn.CheckedInAtUtc, checkIn.CreatedByUserId, member.PhotoBase64);
        await _audit.LogAsync("Create", "CheckIn", id.ToString(), GetUserId(), new { request.MemberId, CheckedInAtUtc = checkedInAtUtc });
        _stream.Publish(new
        {
            id,
            memberId = member.Id,
            fullName = member.FullName,
            photoBase64 = member.PhotoBase64,
            checkedInAtUtc = checkIn.CheckedInAtUtc
        });

        return CreatedAtAction(nameof(GetAll), new { id }, response);
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static CheckInResponse ToResponse(CheckInWithMemberPhoto checkIn)
    {
        return new CheckInResponse(
            checkIn.Id,
            checkIn.MemberId,
            checkIn.CheckedInAtUtc,
            checkIn.CreatedByUserId,
            checkIn.MemberPhotoBase64);
    }
}
