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
    private readonly IConfigRepository _config;
    private readonly ICashBalanceService _balances;

    public SalesController(
        ISaleRepository sales,
        IProductRepository products,
        IMemberRepository members,
        IPaymentMethodRepository paymentMethods,
        IAuditService audit,
        IInventoryMovementRepository movements,
        ICashRepository cash,
        IConfigRepository config,
        ICashBalanceService balances)
    {
        _sales = sales;
        _products = products;
        _members = members;
        _paymentMethods = paymentMethods;
        _audit = audit;
        _movements = movements;
        _cash = cash;
        _config = config;
        _balances = balances;
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

    [HttpGet("sales/{id:int}/details")]
    public async Task<ActionResult<SaleDetailsResponse>> GetDetails(int id)
    {
        var sale = await _sales.GetById(id);
        if (sale is null)
        {
            return NotFound();
        }

        var items = await _sales.GetItemsBySaleId(id);
        var payments = await _sales.GetPaymentsBySaleId(id);

        return Ok(new SaleDetailsResponse(
            ToResponse(sale),
            items.Select(ToItemResponse).ToList(),
            payments.Select(ToPaymentResponse).ToList()));
    }

    [HttpPost("sales")]
    public async Task<ActionResult<SaleResponse>> Create([FromBody] SaleCreateRequest request)
    {
        if (request.Items is null || request.Items.Length == 0)
        {
            return BadRequest("At least one item is required.");
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

        var config = await _config.Get();
        var taxRate = config?.TaxRate ?? 0m;
        var currencyCode = string.IsNullOrWhiteSpace(config?.CurrencyCode) ? "USD" : config!.CurrencyCode;
        var receiptNumber = string.IsNullOrWhiteSpace(request.ReceiptNumber)
            ? await _config.ClaimNextReceiptNumber()
            : request.ReceiptNumber.Trim();

        var computedItems = new List<SaleItem>();
        decimal subtotal = 0;
        decimal discount = 0;
        decimal tax = 0;
        decimal total = 0;

        foreach (var item in request.Items)
        {
            var qty = item.Quantity;
            var price = item.UnitPriceUsd;
            var lineSubtotal = qty * price;
            var lineDiscount = item.DiscountUsd;
            var lineTax = item.TaxUsd;

            if (lineTax <= 0 && taxRate > 0)
            {
                var baseAmount = lineSubtotal - lineDiscount;
                if (baseAmount < 0)
                {
                    baseAmount = 0;
                }

                lineTax = Math.Round(baseAmount * taxRate, 2, MidpointRounding.AwayFromZero);
            }

            var lineTotal = lineSubtotal - lineDiscount + lineTax;
            subtotal += lineSubtotal;
            discount += lineDiscount;
            tax += lineTax;
            total += lineTotal;

            computedItems.Add(new SaleItem
            {
                ProductId = item.ProductId,
                Quantity = qty,
                UnitPriceUsd = price,
                DiscountUsd = lineDiscount,
                TaxUsd = lineTax,
                LineTotalUsd = lineTotal
            });
        }

        if (total <= 0 || subtotal < 0 || discount < 0 || tax < 0)
        {
            return BadRequest("Totals are invalid.");
        }

        var sale = new Sale
        {
            MemberId = request.MemberId,
            CashSessionId = openSession.Id,
            SubtotalUsd = subtotal,
            DiscountUsd = discount,
            TaxUsd = tax,
            TotalUsd = total,
            CurrencyCode = currencyCode,
            Status = "Completed",
            ReceiptNumber = receiptNumber,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByUserId = GetUserId() ?? 0
        };

        var id = await _sales.CreateSaleWithItems(sale, computedItems);
        var created = await _sales.GetById(id);
        await _audit.LogAsync("Create", "Sale", id.ToString(), GetUserId(), new { request.MemberId, TotalUsd = total, Items = request.Items.Length });
        return Created($"/sales/{id}", ToResponse(created!));
    }

    [HttpPost("sales/{id:int}/payments")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> AddPayment(int id, [FromBody] SalePaymentCreateRequest request)
    {
        if (!User.IsInRole("Admin"))
        {
            return StatusCode(
                StatusCodes.Status403Forbidden,
                new ProblemDetails
                {
                    Title = "Forbidden",
                    Detail = "Only admins can add individual payments."
                });
        }

        var sale = await _sales.GetById(id);
        if (sale is null)
        {
            return NotFound();
        }

        if (string.Equals(sale.Status, "Refunded", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Refunded sales cannot accept payments.");
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

        var existingPayments = await _sales.GetPaymentsBySaleId(id);
        var totalPaid = existingPayments.Sum(payment => payment.AmountUsd);
        if (totalPaid >= sale.TotalUsd)
        {
            return BadRequest("Sale is already fully paid.");
        }

        if (totalPaid + request.AmountUsd < sale.TotalUsd)
        {
            return BadRequest("Payment total must cover the sale total.");
        }

        var payment = new SalePayment
        {
            SaleId = id,
            PaymentMethodId = request.PaymentMethodId,
            AmountUsd = request.AmountUsd,
            PaidAtUtc = request.PaidAtUtc ?? DateTime.UtcNow,
            Reference = request.Reference?.Trim(),
            ProofBase64 = string.IsNullOrWhiteSpace(request.ProofBase64) ? null : request.ProofBase64.Trim(),
            CreatedByUserId = GetUserId()
        };

        await _sales.CreateSalePayment(payment);
        await _audit.LogAsync("Create", "SalePayment", id.ToString(), GetUserId(), new { request.AmountUsd, request.PaymentMethodId });
        return NoContent();
    }

    [HttpPost("sales/{id:int}/payments/batch")]
    public async Task<IActionResult> AddPaymentsBatch(int id, [FromBody] SalePaymentBatchCreateRequest request)
    {
        var sale = await _sales.GetById(id);
        if (sale is null)
        {
            return NotFound();
        }

        if (string.Equals(sale.Status, "Refunded", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest("Refunded sales cannot accept payments.");
        }

        var openSession = await _cash.GetOpenSession();
        if (openSession is null)
        {
            return BadRequest("No open cash session. Open cash before adding payments.");
        }

        if (request.Payments is null || request.Payments.Count == 0)
        {
            return BadRequest("At least one payment is required.");
        }

        var existingPayments = await _sales.GetPaymentsBySaleId(id);
        var totalPaid = existingPayments.Sum(payment => payment.AmountUsd);
        if (totalPaid >= sale.TotalUsd)
        {
            return BadRequest("Sale is already fully paid.");
        }

        var batchTotal = 0m;
        var payments = new List<SalePayment>();

        foreach (var entry in request.Payments)
        {
            if (entry.AmountUsd <= 0)
            {
                return BadRequest("AmountUsd must be greater than zero.");
            }

            var method = await _paymentMethods.GetById(entry.PaymentMethodId);
            if (method is null || !method.IsActive)
            {
                return BadRequest("Payment method not found or inactive.");
            }

            var isCash = string.Equals(method.Name, "Cash", StringComparison.OrdinalIgnoreCase);
            if (!isCash && string.IsNullOrWhiteSpace(entry.ProofBase64))
            {
                return BadRequest("Proof is required for non-cash payments.");
            }

            batchTotal += entry.AmountUsd;
            payments.Add(new SalePayment
            {
                SaleId = id,
                PaymentMethodId = entry.PaymentMethodId,
                AmountUsd = entry.AmountUsd,
                PaidAtUtc = entry.PaidAtUtc ?? DateTime.UtcNow,
                Reference = entry.Reference?.Trim(),
                ProofBase64 = string.IsNullOrWhiteSpace(entry.ProofBase64) ? null : entry.ProofBase64.Trim(),
                CreatedByUserId = GetUserId()
            });
        }

        if (totalPaid + batchTotal < sale.TotalUsd)
        {
            return BadRequest("Payment total must cover the sale total.");
        }

        await _sales.CreateSalePayments(payments);
        await _audit.LogAsync("Create", "SalePayment", id.ToString(), GetUserId(), new { TotalUsd = batchTotal, Count = payments.Count });
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

        var openSession = await _cash.GetOpenSession();
        if (openSession is null)
        {
            return BadRequest("No open cash session. Open cash before processing refunds.");
        }

        var items = await _sales.GetItemsBySaleId(id);
        var payments = await _sales.GetPaymentsBySaleId(id);
        var refundByMethod = payments
            .Where(payment => payment.AmountUsd > 0)
            .GroupBy(payment => payment.PaymentMethodId)
            .ToDictionary(group => group.Key, group => group.Sum(payment => payment.AmountUsd));

        if (refundByMethod.Count > 0)
        {
            var snapshot = await _balances.GetOpenSnapshot();
            if (snapshot is null)
            {
                return BadRequest("No open cash session. Open cash before processing refunds.");
            }

            foreach (var entry in refundByMethod)
            {
                var currentBalance = snapshot.MethodBalances.TryGetValue(entry.Key, out var amount) ? amount : 0m;
                if (currentBalance - entry.Value < 0)
                {
                    return BadRequest("Refund would make the cash balance negative.");
                }
            }

            foreach (var entry in refundByMethod)
            {
                var refundPayment = new SalePayment
                {
                    SaleId = id,
                    PaymentMethodId = entry.Key,
                    AmountUsd = -entry.Value,
                    PaidAtUtc = DateTime.UtcNow,
                    Reference = "Refund",
                    CreatedByUserId = GetUserId()
                };
                await _sales.CreateSalePayment(refundPayment);
            }
        }

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

    private static SaleItemResponse ToItemResponse(SaleItem item)
    {
        return new SaleItemResponse(
            item.Id,
            item.ProductId,
            item.Quantity,
            item.UnitPriceUsd,
            item.DiscountUsd,
            item.TaxUsd,
            item.LineTotalUsd);
    }

    private static SalePaymentResponse ToPaymentResponse(SalePayment payment)
    {
        return new SalePaymentResponse(
            payment.Id,
            payment.PaymentMethodId,
            payment.PaymentMethodName ?? string.Empty,
            payment.AmountUsd,
            payment.PaidAtUtc,
            payment.Reference,
            payment.ProofBase64,
            payment.CreatedByUserId,
            payment.CreatedByUserName);
    }
}
