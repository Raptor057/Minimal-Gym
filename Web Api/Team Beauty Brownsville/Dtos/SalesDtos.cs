namespace Team_Beauty_Brownsville.Dtos;

public sealed record SaleItemCreateRequest(
    int ProductId,
    decimal Quantity,
    decimal UnitPriceUsd,
    decimal DiscountUsd,
    decimal TaxUsd
);

public sealed record SaleCreateRequest(
    int? MemberId,
    decimal SubtotalUsd,
    decimal DiscountUsd,
    decimal TaxUsd,
    decimal TotalUsd,
    string? ReceiptNumber,
    SaleItemCreateRequest[] Items
);

public sealed record SalePaymentCreateRequest(
    int PaymentMethodId,
    decimal AmountUsd,
    DateTime? PaidAtUtc,
    string? Reference
);

public sealed record SaleResponse(
    int Id,
    int? MemberId,
    int? CashSessionId,
    decimal SubtotalUsd,
    decimal DiscountUsd,
    decimal TaxUsd,
    decimal TotalUsd,
    string CurrencyCode,
    string Status,
    string? ReceiptNumber,
    DateTime CreatedAtUtc
);
