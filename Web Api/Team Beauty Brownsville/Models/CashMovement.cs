namespace Team_Beauty_Brownsville.Models;

public sealed class CashMovement
{
    public int Id { get; set; }
    public int CashSessionId { get; set; }
    public string MovementType { get; set; } = "In";
    public decimal AmountUsd { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int CreatedByUserId { get; set; }
}
