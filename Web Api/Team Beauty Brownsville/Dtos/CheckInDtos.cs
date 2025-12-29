namespace Team_Beauty_Brownsville.Dtos;

public sealed record CheckInCreateRequest(int MemberId, DateTime? CheckedInAtUtc);

public sealed record CheckInResponse(
    int Id,
    int MemberId,
    DateTime CheckedInAtUtc,
    int? CreatedByUserId,
    string? MemberPhotoBase64
);
