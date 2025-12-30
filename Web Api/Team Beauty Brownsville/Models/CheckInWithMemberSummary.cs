namespace Team_Beauty_Brownsville.Models;

public sealed class CheckInWithMemberSummary
{
    public int Id { get; set; }
    public int MemberId { get; set; }
    public DateTime CheckedInAtUtc { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? PhotoBase64 { get; set; }
    public bool IsActive { get; set; }
    public string? SubscriptionStatus { get; set; }
    public DateTime? SubscriptionEndDate { get; set; }
}
