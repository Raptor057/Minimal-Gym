namespace Team_Beauty_Brownsville.Models;

public sealed class SalePayment
{
    public int Id { get; set; }
    public int SaleId { get; set; }
    public int PaymentMethodId { get; set; }
    public string? PaymentMethodName { get; set; }
    public decimal AmountUsd { get; set; }
    public DateTime PaidAtUtc { get; set; }
    public string? Reference { get; set; }
    public string? ProofBase64 { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? CreatedByUserName { get; set; }
}
