using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("inventory")]
[Authorize]
public sealed class InventoryController : ControllerBase
{
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "In", "Out", "Adjust", "Waste"
    };

    private readonly IInventoryMovementRepository _movements;
    private readonly IProductRepository _products;
    private readonly IAuditService _audit;

    public InventoryController(IInventoryMovementRepository movements, IProductRepository products, IAuditService audit)
    {
        _movements = movements;
        _products = products;
        _audit = audit;
    }

    [HttpGet("movements")]
    public async Task<ActionResult<IEnumerable<InventoryMovementResponse>>> GetAllMovements()
    {
        var list = await _movements.GetAll();
        return Ok(list.Select(ToResponse));
    }

    [HttpPost("movements")]
    public async Task<ActionResult<InventoryMovementResponse>> CreateMovement([FromBody] InventoryMovementCreateRequest request)
    {
        if (!AllowedTypes.Contains(request.MovementType))
        {
            return BadRequest("Invalid MovementType.");
        }

        if (request.Quantity <= 0)
        {
            return BadRequest("Quantity must be greater than zero.");
        }

        var product = await _products.GetById(request.ProductId);
        if (product is null)
        {
            return BadRequest("Product not found.");
        }

        if (request.MovementType is "Out" or "Waste")
        {
            var currentStock = await _movements.GetStockForProduct(request.ProductId);
            if (currentStock - request.Quantity < 0)
            {
                return BadRequest("Stock cannot be negative.");
            }
        }

        var movement = new InventoryMovement
        {
            ProductId = request.ProductId,
            MovementType = request.MovementType.Trim(),
            Quantity = request.Quantity,
            UnitCostUsd = request.UnitCostUsd,
            Notes = request.Notes?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = GetUserId()
        };

        var id = await _movements.Create(movement);
        var created = await _movements.GetById(id);
        if (created is null)
        {
            movement.Id = id;
        }

        await _audit.LogAsync("Create", "InventoryMovement", id.ToString(), GetUserId(), new { request.ProductId, request.MovementType, request.Quantity });
        return Created($"/inventory/movements/{id}", ToResponse(created ?? movement));
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static InventoryMovementResponse ToResponse(InventoryMovement movement)
    {
        return new InventoryMovementResponse(
            movement.Id,
            movement.ProductId,
            movement.MovementType,
            movement.Quantity,
            movement.UnitCostUsd,
            movement.Notes,
            movement.CreatedAtUtc,
            movement.CreatedByUserId);
    }
}
