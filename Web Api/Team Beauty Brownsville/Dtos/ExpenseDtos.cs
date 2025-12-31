namespace Team_Beauty_Brownsville.Dtos;

public sealed record ExpenseCreateRequest(
    string Description,
    decimal AmountUsd,
    int PaymentMethodId,
    DateTime? ExpenseDateUtc,
    string? Notes,
    string? ProofBase64
);

public sealed record ExpenseResponse(
    int Id,
    string Description,
    decimal AmountUsd,
    int? PaymentMethodId,
    DateTime ExpenseDateUtc,
    string? Notes,
    int? CashSessionId,
    DateTime CreatedAtUtc,
    int? CreatedByUserId
);
