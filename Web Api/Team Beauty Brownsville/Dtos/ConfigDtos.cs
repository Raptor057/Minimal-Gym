namespace Team_Beauty_Brownsville.Dtos;

public sealed record ConfigResponse(
    string CurrencyCode,
    decimal TaxRate,
    string? ReceiptPrefix,
    int NextReceiptNo
);

public sealed record ConfigUpdateRequest(
    decimal? TaxRate,
    string? ReceiptPrefix,
    int? NextReceiptNo
);
