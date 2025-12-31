using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("expenses")]
[Authorize]
public sealed class ExpensesController : ControllerBase
{
    private readonly IExpenseRepository _expenses;
    private readonly IPaymentMethodRepository _paymentMethods;
    private readonly IAuditService _audit;
    private readonly ICashBalanceService _balances;

    public ExpensesController(
        IExpenseRepository expenses,
        IPaymentMethodRepository paymentMethods,
        IAuditService audit,
        ICashBalanceService balances)
    {
        _expenses = expenses;
        _paymentMethods = paymentMethods;
        _audit = audit;
        _balances = balances;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExpenseResponse>>> GetAll()
    {
        var list = await _expenses.GetAll();
        return Ok(list.Select(ToResponse));
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseResponse>> Create([FromBody] ExpenseCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest("Description is required.");
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
            return BadRequest("Proof is required for non-cash expenses.");
        }

        int? cashSessionId = null;
        if (isCash)
        {
            var snapshot = await _balances.GetOpenSnapshot();
            if (snapshot is null)
            {
                return BadRequest("No open cash session. Open cash before recording cash expenses.");
            }

            if (snapshot.CashMethodId is null)
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

            cashSessionId = snapshot.Session.Id;
        }

        var expenseDateUtc = request.ExpenseDateUtc ?? DateTime.UtcNow;
        var expense = new Expense
        {
            Description = request.Description.Trim(),
            AmountUsd = request.AmountUsd,
            PaymentMethodId = request.PaymentMethodId,
            ExpenseDateUtc = expenseDateUtc,
            Notes = request.Notes?.Trim(),
            ProofBase64 = string.IsNullOrWhiteSpace(request.ProofBase64) ? null : request.ProofBase64.Trim(),
            CashSessionId = cashSessionId,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = GetUserId()
        };

        var id = await _expenses.Create(expense);
        expense.Id = id;
        await _audit.LogAsync("Create", "Expense", id.ToString(), GetUserId(), new { request.Description, request.AmountUsd });

        return CreatedAtAction(nameof(GetAll), new { id }, ToResponse(expense));
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static ExpenseResponse ToResponse(Expense expense)
    {
        return new ExpenseResponse(
            expense.Id,
            expense.Description,
            expense.AmountUsd,
            expense.PaymentMethodId,
            expense.ExpenseDateUtc,
            expense.Notes,
            expense.CashSessionId,
            expense.CreatedAtUtc,
            expense.CreatedByUserId);
    }
}
