namespace Team_Beauty_Brownsville.Models;

public sealed class Product
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal SalePriceUsd { get; set; }
    public decimal CostUsd { get; set; }
    public string? Category { get; set; }
    public string? PhotoBase64 { get; set; }
    public bool IsActive { get; set; }
    public decimal Stock { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
