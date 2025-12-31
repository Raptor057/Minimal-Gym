namespace Team_Beauty_Brownsville.Dtos;

public sealed record CashOpenRequest(decimal OpeningAmountUsd);

public sealed record CashMovementCreateRequest(
    int CashSessionId,
    string MovementType,
    decimal AmountUsd,
    string? Notes
);

public sealed record CashCloseRequest(
    int CashSessionId,
    decimal CashTotalUsd,
    decimal CardTotalUsd,
    decimal TransferTotalUsd,
    decimal OtherTotalUsd,
    decimal CountedCashUsd
);

public sealed record CashSessionResponse(
    int Id,
    int OpenedByUserId,
    DateTime OpenedAtUtc,
    decimal OpeningAmountUsd,
    string Status,
    int? ClosedByUserId,
    DateTime? ClosedAtUtc
);

public sealed record CashMovementResponse(
    int Id,
    int CashSessionId,
    string MovementType,
    decimal AmountUsd,
    string? Notes,
    DateTime CreatedAtUtc,
    int CreatedByUserId
);

public sealed record CashMethodTotalResponse(
    int PaymentMethodId,
    string Name,
    decimal AmountUsd
);

public sealed record CashSessionSummaryResponse(
    int CashSessionId,
    DateTime OpenedAtUtc,
    DateTime? ClosedAtUtc,
    decimal OpeningAmountUsd,
    decimal CashMovementsInUsd,
    decimal CashMovementsOutUsd,
    decimal CashExpensesUsd,
    decimal ExpectedCashUsd,
    IReadOnlyList<CashMethodTotalResponse> MethodTotals
);
