namespace Team_Beauty_Brownsville.Dtos;

public sealed record PaymentMethodCreateRequest(string Name, bool IsActive = true);

public sealed record PaymentMethodUpdateRequest(string? Name, bool? IsActive);

public sealed record PaymentMethodResponse(int Id, string Name, bool IsActive);
