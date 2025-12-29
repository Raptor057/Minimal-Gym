using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("payment-methods")]
[Authorize]
public sealed class PaymentMethodsController : ControllerBase
{
    private readonly IPaymentMethodRepository _methods;
    private readonly IAuditService _audit;

    public PaymentMethodsController(IPaymentMethodRepository methods, IAuditService audit)
    {
        _methods = methods;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PaymentMethodResponse>>> GetAll()
    {
        var list = await _methods.GetAll();
        return Ok(list.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PaymentMethodResponse>> GetById(int id)
    {
        var method = await _methods.GetById(id);
        return method is null ? NotFound() : Ok(ToResponse(method));
    }

    [HttpPost]
    public async Task<ActionResult<PaymentMethodResponse>> Create([FromBody] PaymentMethodCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Name is required.");
        }

        var method = new PaymentMethod
        {
            Name = request.Name.Trim(),
            IsActive = request.IsActive
        };

        var id = await _methods.Create(method);
        var created = await _methods.GetById(id);
        await _audit.LogAsync("Create", "PaymentMethod", id.ToString(), GetUserId(), new { request.Name, request.IsActive });
        return CreatedAtAction(nameof(GetById), new { id }, ToResponse(created!));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PaymentMethodResponse>> Update(int id, [FromBody] PaymentMethodUpdateRequest request)
    {
        var existing = await _methods.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _methods.Update(id, request.Name?.Trim(), request.IsActive);
        var updated = await _methods.GetById(id);
        await _audit.LogAsync("Update", "PaymentMethod", id.ToString(), GetUserId(), new { request.Name, request.IsActive });
        return Ok(ToResponse(updated!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _methods.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _methods.SoftDelete(id);
        await _audit.LogAsync("Delete", "PaymentMethod", id.ToString(), GetUserId(), null);
        return NoContent();
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static PaymentMethodResponse ToResponse(PaymentMethod method)
    {
        return new PaymentMethodResponse(method.Id, method.Name, method.IsActive);
    }
}
