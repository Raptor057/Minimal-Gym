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
