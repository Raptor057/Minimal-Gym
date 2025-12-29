namespace Team_Beauty_Brownsville.Models;

public sealed class CashSession
{
    public int Id { get; set; }
    public int OpenedByUserId { get; set; }
    public DateTime OpenedAtUtc { get; set; }
    public decimal OpeningAmountUsd { get; set; }
    public string Status { get; set; } = "Open";
    public int? ClosedByUserId { get; set; }
    public DateTime? ClosedAtUtc { get; set; }
}
