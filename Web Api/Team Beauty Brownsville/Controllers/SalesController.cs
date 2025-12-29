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
public sealed class SalesController : ControllerBase
{
    private readonly ISaleRepository _sales;
    private readonly IProductRepository _products;
    private readonly IMemberRepository _members;
    private readonly IPaymentMethodRepository _paymentMethods;
    private readonly IAuditService _audit;
    private readonly IInventoryMovementRepository _movements;
    private readonly ICashRepository _cash;

    public SalesController(
        ISaleRepository sales,
        IProductRepository products,
        IMemberRepository members,
        IPaymentMethodRepository paymentMethods,
        IAuditService audit,
        IInventoryMovementRepository movements,
        ICashRepository cash)
    {
        _sales = sales;
        _products = products;
        _members = members;
        _paymentMethods = paymentMethods;
        _audit = audit;
        _movements = movements;
        _cash = cash;
    }

    [HttpGet("sales")]
    public async Task<ActionResult<IEnumerable<SaleResponse>>> GetAll()
    {
        var list = await _sales.GetAll();
        return Ok(list.Select(ToResponse));
    }

    [HttpGet("sales/{id:int}")]
    public async Task<ActionResult<SaleResponse>> GetById(int id)
    {
        var sale = await _sales.GetById(id);
        return sale is null ? NotFound() : Ok(ToResponse(sale));
    }

    [HttpPost("sales")]
    public async Task<ActionResult<SaleResponse>> Create([FromBody] SaleCreateRequest request)
    {
        if (request.Items is null || request.Items.Length == 0)
        {
            return BadRequest("At least one item is required.");
        }

        if (request.TotalUsd <= 0 || request.SubtotalUsd < 0 || request.DiscountUsd < 0 || request.TaxUsd < 0)
        {
            return BadRequest("Totals are invalid.");
        }

        if (request.MemberId is not null)
        {
            var member = await _members.GetById(request.MemberId.Value);
            if (member is null)
            {
                return BadRequest("Member not found.");
            }
        }

        var openSession = await _cash.GetOpenSession();
        if (openSession is null)
        {
            return BadRequest("No open cash session. Open cash before creating sales.");
        }

        foreach (var item in request.Items)
        {
            if (item.Quantity <= 0 || item.UnitPriceUsd <= 0 || item.DiscountUsd < 0 || item.TaxUsd < 0)
            {
                return BadRequest("Invalid sale item values.");
            }

            var product = await _products.GetById(item.ProductId);
            if (product is null || !product.IsActive)
            {
                return BadRequest($"Product {item.ProductId} not found or inactive.");
            }

            var stock = await _movements.GetStockForProduct(item.ProductId);
            if (stock - item.Quantity < 0)
            {
                return BadRequest($"Stock cannot be negative for product {item.ProductId}.");
            }
        }

        var sale = new Sale
        {
            MemberId = request.MemberId,
            CashSessionId = openSession.Id,
            SubtotalUsd = request.SubtotalUsd,
            DiscountUsd = request.DiscountUsd,
            TaxUsd = request.TaxUsd,
            TotalUsd = request.TotalUsd,
            CurrencyCode = "USD",
            Status = "Completed",
            ReceiptNumber = request.ReceiptNumber?.Trim(),
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = GetUserId() ?? 0
        };

        var items = request.Items.Select(item => new SaleItem
        {
            ProductId = item.ProductId,
            Quantity = item.Quantity,
            UnitPriceUsd = item.UnitPriceUsd,
            DiscountUsd = item.DiscountUsd,
            TaxUsd = item.TaxUsd,
            LineTotalUsd = (item.UnitPriceUsd * item.Quantity) - item.DiscountUsd + item.TaxUsd
        }).ToList();

        var id = await _sales.CreateSaleWithItems(sale, items);
        var created = await _sales.GetById(id);
        await _audit.LogAsync("Create", "Sale", id.ToString(), GetUserId(), new { request.MemberId, request.TotalUsd, Items = request.Items.Length });
        return Created($"/sales/{id}", ToResponse(created!));
    }

    [HttpPost("sales/{id:int}/payments")]
    public async Task<IActionResult> AddPayment(int id, [FromBody] SalePaymentCreateRequest request)
    {
        var sale = await _sales.GetById(id);
        if (sale is null)
        {
            return NotFound();
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

        if (!await _paymentMethods.Exists(request.PaymentMethodId))
        {
            return BadRequest("Payment method not found or inactive.");
        }

        var payment = new SalePayment
        {
            SaleId = id,
            PaymentMethodId = request.PaymentMethodId,
            AmountUsd = request.AmountUsd,
            PaidAtUtc = request.PaidAtUtc ?? DateTime.UtcNow,
            Reference = request.Reference?.Trim()
        };

        await _sales.CreateSalePayment(payment);
        await _audit.LogAsync("Create", "SalePayment", id.ToString(), GetUserId(), new { request.AmountUsd, request.PaymentMethodId });
        return NoContent();
    }

    [HttpPost("sales/{id:int}/refund")]
    public async Task<IActionResult> Refund(int id)
    {
        var sale = await _sales.GetById(id);
        if (sale is null)
        {
            return NotFound();
        }

        if (string.Equals(sale.Status, "Refunded", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Sale already refunded.");
        }

        var items = await _sales.GetItemsBySaleId(id);
        await _sales.UpdateStatus(id, "Refunded");
        await _sales.AddRefundInventory(id, items, GetUserId());
        await _audit.LogAsync("Refund", "Sale", id.ToString(), GetUserId(), new { Items = items.Count });
        return NoContent();
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier) ?? User.FindFirst("sub");
        return claim is not null && int.TryParse(claim.Value, out var id) ? id : null;
    }

    private static SaleResponse ToResponse(Sale sale)
    {
        return new SaleResponse(
            sale.Id,
            sale.MemberId,
            sale.CashSessionId,
            sale.SubtotalUsd,
            sale.DiscountUsd,
            sale.TaxUsd,
            sale.TotalUsd,
            sale.CurrencyCode,
            sale.Status,
            sale.ReceiptNumber,
            sale.CreatedAtUtc);
    }
}
