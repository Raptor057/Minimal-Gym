namespace Team_Beauty_Brownsville.Dtos;

public sealed record PaymentCreateRequest(
    int PaymentMethodId,
    decimal AmountUsd,
    DateTime? PaidAtUtc,
    string? Reference
);

public sealed record PaymentResponse(
    int Id,
    int SubscriptionId,
    int PaymentMethodId,
    decimal AmountUsd,
    string CurrencyCode,
    DateTime PaidAtUtc,
    string? Reference,
    string Status
);
