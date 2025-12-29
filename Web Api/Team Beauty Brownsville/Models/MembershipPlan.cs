namespace Team_Beauty_Brownsville.Models;

public sealed class MembershipPlan
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DurationDays { get; set; }
    public decimal PriceUsd { get; set; }
    public string? Rules { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
