namespace Team_Beauty_Brownsville.Models;

public sealed class Payment
{
    public int Id { get; set; }
    public int SubscriptionId { get; set; }
    public int PaymentMethodId { get; set; }
    public decimal AmountUsd { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public DateTime PaidAtUtc { get; set; }
    public string? Reference { get; set; }
    public string? ProofBase64 { get; set; }
    public string Status { get; set; } = "Completed";
    public DateTime CreatedAtUtc { get; set; }
}
