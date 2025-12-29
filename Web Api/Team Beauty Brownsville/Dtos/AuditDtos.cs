namespace Team_Beauty_Brownsville.Dtos;

public sealed record AuditLogResponse(
    int Id,
    string EntityName,
    string EntityId,
    string Action,
    int? UserId,
    DateTime CreatedAtUtc,
    string? DataJson
);
