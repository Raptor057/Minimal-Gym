namespace Team_Beauty_Brownsville.Dtos;

public sealed record RevenueReportResponse(
    DateTime FromUtc,
    DateTime ToUtc,
    decimal SubscriptionPaymentsUsd,
    decimal SalesPaymentsUsd,
    decimal TotalUsd
);

public sealed record StatusCountResponse(string Status, int Count);

public sealed record SalesReportResponse(DateTime FromUtc, DateTime ToUtc, int Count, decimal TotalUsd);

public sealed record LowStockItemResponse(
    int ProductId,
    string Sku,
    string Name,
    decimal Stock
);
