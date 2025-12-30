namespace Team_Beauty_Brownsville.Models;

public sealed class Config
{
    public int Id { get; set; }
    public string CurrencyCode { get; set; } = "USD";
    public decimal TaxRate { get; set; }
    public string? ReceiptPrefix { get; set; }
    public int NextReceiptNo { get; set; }
    public string? LogoBase64 { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
