namespace Team_Beauty_Brownsville.Dtos;

public sealed record ProductCreateRequest(
    string Sku,
    string Name,
    decimal SalePriceUsd,
    decimal CostUsd,
    string? Barcode,
    string? Category,
    string? PhotoBase64,
    bool IsActive = true
);

public sealed record ProductUpdateRequest(
    string? Sku,
    string? Name,
    decimal? SalePriceUsd,
    decimal? CostUsd,
    string? Barcode,
    string? Category,
    string? PhotoBase64,
    bool? IsActive
);

public sealed record ProductResponse(
    int Id,
    string Sku,
    string? Barcode,
    string Name,
    decimal SalePriceUsd,
    decimal CostUsd,
    string? Category,
    string? PhotoBase64,
    bool IsActive
);
