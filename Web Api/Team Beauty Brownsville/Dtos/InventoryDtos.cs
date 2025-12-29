namespace Team_Beauty_Brownsville.Dtos;

public sealed record InventoryMovementCreateRequest(
    int ProductId,
    string MovementType,
    decimal Quantity,
    decimal? UnitCostUsd,
    string? Notes
);

public sealed record InventoryMovementResponse(
    int Id,
    int ProductId,
    string MovementType,
    decimal Quantity,
    decimal? UnitCostUsd,
    string? Notes,
    DateTime CreatedAtUtc,
    int? CreatedByUserId
);
