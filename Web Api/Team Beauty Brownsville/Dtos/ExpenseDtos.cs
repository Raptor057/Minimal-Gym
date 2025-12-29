namespace Team_Beauty_Brownsville.Dtos;

public sealed record ExpenseCreateRequest(
    string Description,
    decimal AmountUsd,
    DateTime? ExpenseDateUtc,
    string? Notes
);

public sealed record ExpenseResponse(
    int Id,
    string Description,
    decimal AmountUsd,
    DateTime ExpenseDateUtc,
    string? Notes,
    DateTime CreatedAtUtc,
    int? CreatedByUserId
);
