namespace Team_Beauty_Brownsville.Dtos;

public sealed record MemberCreateRequest(
    string FullName,
    string? Phone,
    string? Email,
    DateTime? BirthDate,
    string? EmergencyContact,
    string? Notes,
    string? PhotoBase64,
    bool IsActive = true
);

public sealed record MemberUpdateRequest(
    string? FullName,
    string? Phone,
    string? Email,
    DateTime? BirthDate,
    string? EmergencyContact,
    string? Notes,
    string? PhotoBase64,
    bool? IsActive
);

public sealed record MemberResponse(
    int Id,
    string FullName,
    string? Phone,
    string? Email,
    DateTime? BirthDate,
    string? EmergencyContact,
    string? Notes,
    string? PhotoBase64,
    bool IsActive
);
