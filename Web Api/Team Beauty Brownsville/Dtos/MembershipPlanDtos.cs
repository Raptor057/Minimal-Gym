namespace Team_Beauty_Brownsville.Dtos;

public sealed record MembershipPlanCreateRequest(
    string Name,
    int DurationDays,
    decimal PriceUsd,
    string? Rules,
    bool IsActive = true
);

public sealed record MembershipPlanUpdateRequest(
    string? Name,
    int? DurationDays,
    decimal? PriceUsd,
    string? Rules,
    bool? IsActive
);

public sealed record MembershipPlanResponse(
    int Id,
    string Name,
    int DurationDays,
    decimal PriceUsd,
    string? Rules,
    bool IsActive
);
