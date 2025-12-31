namespace Team_Beauty_Brownsville.Models;

public sealed class CheckInWithMemberPhoto
{
    public int Id { get; set; }
    public int MemberId { get; set; }
    public string MemberNumber { get; set; } = string.Empty;
    public DateTime CheckedInAtUtc { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? MemberPhotoBase64 { get; set; }
}
