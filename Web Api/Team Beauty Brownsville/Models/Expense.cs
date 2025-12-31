namespace Team_Beauty_Brownsville.Models;

public sealed class Expense
{
    public int Id { get; set; }
    public string Description { get; set; } = string.Empty;
    public decimal AmountUsd { get; set; }
    public int? PaymentMethodId { get; set; }
    public DateTime ExpenseDateUtc { get; set; }
    public string? Notes { get; set; }
    public string? ProofBase64 { get; set; }
    public int? CashSessionId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int? CreatedByUserId { get; set; }
}
