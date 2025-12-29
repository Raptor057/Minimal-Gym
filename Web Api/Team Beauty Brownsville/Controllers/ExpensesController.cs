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
    private readonly IAuditService _audit;

    public ExpensesController(IExpenseRepository expenses, IAuditService audit)
    {
        _expenses = expenses;
        _audit = audit;
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

        var expenseDateUtc = request.ExpenseDateUtc ?? DateTime.UtcNow;
        var expense = new Expense
        {
            Description = request.Description.Trim(),
            AmountUsd = request.AmountUsd,
            ExpenseDateUtc = expenseDateUtc,
            Notes = request.Notes?.Trim(),
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
            expense.ExpenseDateUtc,
            expense.Notes,
            expense.CreatedAtUtc,
            expense.CreatedByUserId);
    }
}
