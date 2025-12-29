namespace Team_Beauty_Brownsville.Dtos;

public sealed record AuthLoginRequest(string UserName, string Password);

public sealed record AuthLoginResponse(
    string AccessToken,
    DateTime AccessTokenExpiresAtUtc,
    string RefreshToken,
    DateTime RefreshTokenExpiresAtUtc,
    UserResponse User
);

public sealed record AuthRefreshRequest(string RefreshToken);

public sealed record AuthLogoutRequest(string RefreshToken);
