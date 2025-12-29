namespace Team_Beauty_Brownsville.Models;

public sealed class InventoryMovement
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public string MovementType { get; set; } = "In";
    public decimal Quantity { get; set; }
    public decimal? UnitCostUsd { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int? CreatedByUserId { get; set; }
}
