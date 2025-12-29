namespace Team_Beauty_Brownsville.Models;

public sealed class Sale
{
    public int Id { get; set; }
    public int? MemberId { get; set; }
    public int? CashSessionId { get; set; }
    public decimal SubtotalUsd { get; set; }
    public decimal DiscountUsd { get; set; }
    public decimal TaxUsd { get; set; }
    public decimal TotalUsd { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public string Status { get; set; } = "Completed";
    public string? ReceiptNumber { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int CreatedByUserId { get; set; }
}
