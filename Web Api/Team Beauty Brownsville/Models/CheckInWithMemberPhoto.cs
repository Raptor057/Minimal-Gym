namespace Team_Beauty_Brownsville.Models;

public sealed class CheckInWithMemberPhoto
{
    public int Id { get; set; }
    public int MemberId { get; set; }
    public DateTime CheckedInAtUtc { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? MemberPhotoBase64 { get; set; }
}
