namespace Team_Beauty_Brownsville.Dtos;

public sealed record SubscriptionCreateRequest(
    int PlanId,
    DateTime? StartDate
);

public sealed record SubscriptionUpdateRequest(
    DateTime? StartDate,
    DateTime? EndDate,
    string? Status
);

public sealed record SubscriptionRenewRequest(
    DateTime? StartDate
);

public sealed record SubscriptionResponse(
    int Id,
    int MemberId,
    int PlanId,
    DateTime StartDate,
    DateTime EndDate,
    string Status,
    decimal PriceUsd,
    DateTime? PausedAtUtc
);
