namespace Team_Beauty_Brownsville.Models;

public sealed class SaleItem
{
    public int Id { get; set; }
    public int SaleId { get; set; }
    public int ProductId { get; set; }
    public decimal Quantity { get; set; }
    public decimal UnitPriceUsd { get; set; }
    public decimal DiscountUsd { get; set; }
    public decimal TaxUsd { get; set; }
    public decimal LineTotalUsd { get; set; }
}
