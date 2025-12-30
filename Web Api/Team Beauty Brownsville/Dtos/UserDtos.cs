namespace Team_Beauty_Brownsville.Dtos;

public sealed record UserCreateRequest(
    string UserName,
    string Password,
    string FullName,
    string? Email,
    string? Phone,
    string? PhotoBase64,
    bool IsActive = true,
    bool IsLocked = false,
    string[]? Roles = null
);

public sealed record UserUpdateRequest(
    string? Password,
    string? FullName,
    string? Email,
    string? Phone,
    string? PhotoBase64,
    bool? IsActive,
    bool? IsLocked,
    string[]? Roles
);

public sealed record UserResponse(
    int Id,
    string UserName,
    string FullName,
    string? Email,
    string? Phone,
    string? PhotoBase64,
    bool IsActive,
    bool IsLocked,
    string[] Roles
);

public sealed record UserPublicResponse(
    int Id,
    string UserName,
    string FullName,
    string? PhotoBase64
);
