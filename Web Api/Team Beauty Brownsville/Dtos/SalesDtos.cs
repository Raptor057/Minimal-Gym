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
    string? Reference,
    string? ProofBase64
);

public sealed record SalePaymentBatchCreateRequest(
    IReadOnlyList<SalePaymentCreateRequest> Payments
);

public sealed record SaleItemResponse(
    int Id,
    int ProductId,
    decimal Quantity,
    decimal UnitPriceUsd,
    decimal DiscountUsd,
    decimal TaxUsd,
    decimal LineTotalUsd
);

public sealed record SalePaymentResponse(
    int Id,
    int PaymentMethodId,
    string PaymentMethodName,
    decimal AmountUsd,
    DateTime PaidAtUtc,
    string? Reference,
    string? ProofBase64,
    int? CreatedByUserId,
    string? CreatedByUserName
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

public sealed record SaleDetailsResponse(
    SaleResponse Sale,
    IReadOnlyList<SaleItemResponse> Items,
    IReadOnlyList<SalePaymentResponse> Payments
);
