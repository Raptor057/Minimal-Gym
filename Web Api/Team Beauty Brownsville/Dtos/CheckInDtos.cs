namespace Team_Beauty_Brownsville.Dtos;

public sealed record CheckInCreateRequest(int MemberId, DateTime? CheckedInAtUtc);

public sealed record CheckInResponse(
    int Id,
    int MemberId,
    DateTime CheckedInAtUtc,
    int? CreatedByUserId,
    string? MemberPhotoBase64
);

public sealed record CheckInScanResponse(
    int MemberId,
    string FullName,
    string? Email,
    string? Phone,
    string? PhotoBase64,
    bool IsActive,
    bool HasActiveSubscription,
    string? SubscriptionStatus,
    DateTime? SubscriptionEndDate,
    int? DaysToExpire
);
