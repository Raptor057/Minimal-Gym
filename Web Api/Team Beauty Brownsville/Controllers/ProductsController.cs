using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("products")]
[Authorize]
public sealed class ProductsController : ControllerBase
{
    private readonly IProductRepository _products;
    private readonly IAuditService _audit;

    public ProductsController(IProductRepository products, IAuditService audit)
    {
        _products = products;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductResponse>>> GetAll()
    {
        var list = await _products.GetAll();
        return Ok(list.Select(ToResponse));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ProductResponse>> GetById(int id)
    {
        var product = await _products.GetById(id);
        return product is null ? NotFound() : Ok(ToResponse(product));
    }

    [HttpPost]
    public async Task<ActionResult<ProductResponse>> Create([FromBody] ProductCreateRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Sku) || string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequest("Sku and Name are required.");
        }

        var normalizedSku = request.Sku.Trim();
        var existingSku = await _products.GetBySku(normalizedSku);
        if (existingSku is not null)
        {
            return BadRequest("Sku already exists.");
        }

        if (request.SalePriceUsd <= 0 || request.CostUsd < 0)
        {
            return BadRequest("SalePriceUsd must be greater than zero and CostUsd cannot be negative.");
        }

        var product = new Product
        {
            Sku = normalizedSku,
            Barcode = request.Barcode?.Trim(),
            Name = request.Name.Trim(),
            SalePriceUsd = request.SalePriceUsd,
            CostUsd = request.CostUsd,
            Category = request.Category?.Trim(),
            PhotoBase64 = string.IsNullOrWhiteSpace(request.PhotoBase64) ? null : request.PhotoBase64.Trim(),
            IsActive = request.IsActive,
            CreatedAtUtc = DateTime.UtcNow
        };

        var id = await _products.Create(product);
        var created = await _products.GetById(id);
        await _audit.LogAsync("Create", "Product", id.ToString(), GetUserId(), new { request.Sku, request.Name });
        return CreatedAtAction(nameof(GetById), new { id }, ToResponse(created!));
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<ProductResponse>> Update(int id, [FromBody] ProductUpdateRequest request)
    {
        var existing = await _products.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Sku))
        {
            var normalizedSku = request.Sku.Trim();
            var skuMatch = await _products.GetBySku(normalizedSku);
            if (skuMatch is not null && skuMatch.Id != id)
            {
                return BadRequest("Sku already exists.");
            }
        }

        if (request.SalePriceUsd is not null && request.SalePriceUsd <= 0)
        {
            return BadRequest("SalePriceUsd must be greater than zero.");
        }

        if (request.CostUsd is not null && request.CostUsd < 0)
        {
            return BadRequest("CostUsd cannot be negative.");
        }

        await _products.Update(
            id,
            request.Sku?.Trim(),
            request.Barcode?.Trim(),
            request.Name?.Trim(),
            request.SalePriceUsd,
            request.CostUsd,
            request.Category?.Trim(),
            string.IsNullOrWhiteSpace(request.PhotoBase64) ? null : request.PhotoBase64.Trim(),
            request.IsActive,
            DateTime.UtcNow);

        var updated = await _products.GetById(id);
        await _audit.LogAsync("Update", "Product", id.ToString(), GetUserId(), new { request.Sku, request.Name, request.SalePriceUsd, request.CostUsd, request.IsActive });
        return Ok(ToResponse(updated!));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var existing = await _products.GetById(id);
        if (existing is null)
        {
            return NotFound();
        }

        await _products.SoftDelete(id, DateTime.UtcNow);
        await _audit.LogAsync("Delete", "Product", id.ToString(), GetUserId(), null);
        return NoContent();
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static ProductResponse ToResponse(Product product)
    {
        return new ProductResponse(
            product.Id,
            product.Sku,
            product.Barcode,
            product.Name,
            product.SalePriceUsd,
            product.CostUsd,
            product.Category,
            product.PhotoBase64,
            product.IsActive);
    }
}
