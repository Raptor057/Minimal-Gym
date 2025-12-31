namespace Team_Beauty_Brownsville.Models;

public sealed class Member
{
    public int Id { get; set; }
    public string MemberNumber { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Email { get; set; }
    public DateTime? BirthDate { get; set; }
    public string? EmergencyContact { get; set; }
    public string? Notes { get; set; }
    public string? PhotoBase64 { get; set; }
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }
}
