using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;

namespace Team_Beauty_Brownsville.Controllers;

[ApiController]
[Route("reports")]
[Authorize]
public sealed class ReportsController : ControllerBase
{
    private readonly IReportRepository _reports;

    public ReportsController(IReportRepository reports)
    {
        _reports = reports;
    }

    [HttpGet("revenue")]
    public async Task<ActionResult<RevenueReportResponse>> Revenue([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        if (from is null || to is null)
        {
            return BadRequest("from and to are required (UTC).");
        }

        var fromUtc = DateTime.SpecifyKind(from.Value, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(to.Value, DateTimeKind.Utc);
        if (fromUtc > toUtc)
        {
            return BadRequest("from must be <= to.");
        }

        var (subs, sales) = await _reports.GetRevenue(fromUtc, toUtc);
        return Ok(new RevenueReportResponse(fromUtc, toUtc, subs, sales, subs + sales));
    }

    [HttpGet("subscriptions/status")]
    public async Task<ActionResult<IEnumerable<StatusCountResponse>>> SubscriptionsStatus()
    {
        var rows = await _reports.GetSubscriptionStatusCounts();
        return Ok(rows);
    }

    [HttpGet("sales")]
    public async Task<ActionResult<SalesReportResponse>> Sales([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        if (from is null || to is null)
        {
            return BadRequest("from and to are required (UTC).");
        }

        var fromUtc = DateTime.SpecifyKind(from.Value, DateTimeKind.Utc);
        var toUtc = DateTime.SpecifyKind(to.Value, DateTimeKind.Utc);
        if (fromUtc > toUtc)
        {
            return BadRequest("from must be <= to.");
        }

        var result = await _reports.GetSalesReport(fromUtc, toUtc);
        return Ok(result);
    }

    [HttpGet("inventory/low-stock")]
    public async Task<ActionResult<IEnumerable<LowStockItemResponse>>> LowStock([FromQuery] decimal threshold = 5)
    {
        var rows = await _reports.GetLowStock(threshold);
        return Ok(rows);
    }
}
