using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Authorize]
public sealed class PaymentsController : ControllerBase
{
    private readonly IPaymentRepository _payments;
    private readonly ISubscriptionRepository _subscriptions;
    private readonly IPaymentMethodRepository _paymentMethods;
    private readonly IAuditService _audit;
    private readonly ICashRepository _cash;

    public PaymentsController(
        IPaymentRepository payments,
        ISubscriptionRepository subscriptions,
        IPaymentMethodRepository paymentMethods,
        IAuditService audit,
        ICashRepository cash)
    {
        _payments = payments;
        _subscriptions = subscriptions;
        _paymentMethods = paymentMethods;
        _audit = audit;
        _cash = cash;
    }

    [HttpGet("payments")]
    public async Task<ActionResult<IEnumerable<PaymentResponse>>> GetAll()
    {
        var list = await _payments.GetAll();
        return Ok(list.Select(ToResponse));
    }

    [HttpGet("payments/{id:int}")]
    public async Task<ActionResult<PaymentResponse>> GetById(int id)
    {
        var payment = await _payments.GetById(id);
        return payment is null ? NotFound() : Ok(ToResponse(payment));
    }

    [HttpGet("members/{memberId:int}/payments")]
    public async Task<ActionResult<IEnumerable<PaymentResponse>>> GetByMember(int memberId)
    {
        var list = await _payments.GetByMemberId(memberId);
        return Ok(list.Select(ToResponse));
    }

    [HttpPost("subscriptions/{subscriptionId:int}/payments")]
    public async Task<ActionResult<PaymentResponse>> Create(int subscriptionId, [FromBody] PaymentCreateRequest request)
    {
        var subscription = await _subscriptions.GetById(subscriptionId);
        if (subscription is null)
        {
            return NotFound("Subscription not found.");
        }

        var openSession = await _cash.GetOpenSession();
        if (openSession is null)
        {
            return BadRequest("No open cash session. Open cash before adding payments.");
        }

        if (request.AmountUsd <= 0)
        {
            return BadRequest("AmountUsd must be greater than zero.");
        }

        var method = await _paymentMethods.GetById(request.PaymentMethodId);
        if (method is null || !method.IsActive)
        {
            return BadRequest("Payment method not found or inactive.");
        }

        var isCash = string.Equals(method.Name, "Cash", StringComparison.OrdinalIgnoreCase);
        if (!isCash && string.IsNullOrWhiteSpace(request.ProofBase64))
        {
            return BadRequest("Proof is required for non-cash payments.");
        }

        var paidAtUtc = request.PaidAtUtc ?? DateTime.UtcNow;
        var payment = new Payment
        {
            SubscriptionId = subscriptionId,
            PaymentMethodId = request.PaymentMethodId,
            AmountUsd = request.AmountUsd,
            CurrencyCode = "USD",
            PaidAtUtc = paidAtUtc,
            Reference = request.Reference?.Trim(),
            ProofBase64 = string.IsNullOrWhiteSpace(request.ProofBase64) ? null : request.ProofBase64.Trim(),
            Status = "Completed",
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = GetUserId()
        };

        var id = await _payments.Create(payment);
        var created = await _payments.GetById(id);
        await _audit.LogAsync("Create", "Payment", id.ToString(), GetUserId(), new { subscriptionId, request.AmountUsd, request.PaymentMethodId });
        return Created($"/payments/{id}", ToResponse(created!));
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static PaymentResponse ToResponse(Payment payment)
    {
        return new PaymentResponse(
            payment.Id,
            payment.SubscriptionId,
            payment.MemberId,
            payment.MemberName ?? string.Empty,
            payment.PaymentMethodId,
            payment.PaymentMethodName ?? string.Empty,
            payment.AmountUsd,
            payment.CurrencyCode,
            payment.PaidAtUtc,
            payment.Reference,
            payment.ProofBase64,
            payment.Status,
            payment.CreatedByUserId,
            payment.CreatedByUserName);
    }
}
