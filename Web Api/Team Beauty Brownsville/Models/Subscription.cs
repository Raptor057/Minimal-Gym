namespace Team_Beauty_Brownsville.Models;

public sealed class Subscription
{
    public int Id { get; set; }
    public int MemberId { get; set; }
    public int PlanId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Status { get; set; } = "Active";
    public decimal PriceUsd { get; set; }
    public DateTime? PausedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
