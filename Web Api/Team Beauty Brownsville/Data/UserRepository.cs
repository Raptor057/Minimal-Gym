using System.Data;
using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class UserRepository : IUserRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public UserRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<User?> GetByUserName(string userName)
    {
        const string sql = """
            SELECT Id, UserName, PasswordHash, FullName, Email, Phone, PhotoBase64, IsActive, IsLocked, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.Users
            WHERE UserName = @UserName
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<User>(sql, new { UserName = userName });
    }

    public async Task<User?> GetById(int id)
    {
        const string sql = """
            SELECT Id, UserName, PasswordHash, FullName, Email, Phone, PhotoBase64, IsActive, IsLocked, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.Users
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<User>(sql, new { Id = id });
    }

    public async Task<IReadOnlyList<User>> GetAll()
    {
        const string sql = """
            SELECT Id, UserName, PasswordHash, FullName, Email, Phone, PhotoBase64, IsActive, IsLocked, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.Users
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var users = await connection.QueryAsync<User>(sql);
        return users.ToList();
    }

    public async Task<IReadOnlyList<User>> GetPublicUsers()
    {
        const string sql = """
            SELECT Id, UserName, FullName, PhotoBase64
            FROM dbo.Users
            WHERE IsActive = 1
            ORDER BY FullName ASC
            """;

        using var connection = _connectionFactory.Create();
        var users = await connection.QueryAsync<User>(sql);
        return users.ToList();
    }

    public async Task<int> GetCount()
    {
        const string sql = "SELECT COUNT(1) FROM dbo.Users";
        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql);
    }

    public async Task<int> Create(User user)
    {
        const string sql = """
            INSERT INTO dbo.Users (UserName, PasswordHash, FullName, Email, Phone, PhotoBase64, IsActive, IsLocked, CreatedAtUtc)
            OUTPUT INSERTED.Id
            VALUES (@UserName, @PasswordHash, @FullName, @Email, @Phone, @PhotoBase64, @IsActive, @IsLocked, @CreatedAtUtc)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, user);
    }

    public async Task Update(
        int id,
        string? passwordHash,
        string? fullName,
        string? email,
        string? phone,
        string? photoBase64,
        bool? isActive,
        bool? isLocked,
        DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.Users
            SET FullName = COALESCE(@FullName, FullName),
                Email = COALESCE(@Email, Email),
                Phone = COALESCE(@Phone, Phone),
                PhotoBase64 = COALESCE(@PhotoBase64, PhotoBase64),
                IsActive = COALESCE(@IsActive, IsActive),
                IsLocked = COALESCE(@IsLocked, IsLocked),
                PasswordHash = COALESCE(@PasswordHash, PasswordHash),
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new
        {
            Id = id,
            PasswordHash = passwordHash,
            FullName = fullName,
            Email = email,
            Phone = phone,
            PhotoBase64 = photoBase64,
            IsActive = isActive,
            IsLocked = isLocked,
            UpdatedAtUtc = updatedAtUtc
        });
    }

    public async Task SoftDelete(int id, DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.Users
            SET IsActive = 0,
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new { Id = id, UpdatedAtUtc = updatedAtUtc });
    }

    public async Task<IReadOnlyList<string>> GetRolesForUser(int userId)
    {
        const string sql = """
            SELECT r.Name
            FROM dbo.UserRoles ur
            INNER JOIN dbo.Roles r ON r.Id = ur.RoleId
            WHERE ur.UserId = @UserId
            """;

        using var connection = _connectionFactory.Create();
        var roles = await connection.QueryAsync<string>(sql, new { UserId = userId });
        return roles.ToList();
    }

    public async Task<Dictionary<int, List<string>>> GetRolesByUserIds(IEnumerable<int> userIds)
    {
        var ids = userIds.Distinct().ToArray();
        if (ids.Length == 0)
        {
            return new Dictionary<int, List<string>>();
        }

        const string sql = """
            SELECT ur.UserId, r.Name
            FROM dbo.UserRoles ur
            INNER JOIN dbo.Roles r ON r.Id = ur.RoleId
            WHERE ur.UserId IN @UserIds
            """;

        using var connection = _connectionFactory.Create();
        var rows = await connection.QueryAsync<(int UserId, string Name)>(sql, new { UserIds = ids });

        var result = new Dictionary<int, List<string>>();
        foreach (var row in rows)
        {
            if (!result.TryGetValue(row.UserId, out var list))
            {
                list = new List<string>();
                result[row.UserId] = list;
            }

            list.Add(row.Name);
        }

        return result;
    }

    public async Task SetRolesForUser(int userId, IEnumerable<string> roleNames)
    {
        var roles = NormalizeRoles(roleNames);
        using var connection = _connectionFactory.Create();
        connection.Open();
        using var transaction = connection.BeginTransaction();

        await EnsureRolesExist(connection, transaction, roles);

        const string deleteSql = "DELETE FROM dbo.UserRoles WHERE UserId = @UserId";
        await connection.ExecuteAsync(deleteSql, new { UserId = userId }, transaction);

        if (roles.Count > 0)
        {
            const string roleIdsSql = "SELECT Id, Name FROM dbo.Roles WHERE Name IN @Names";
            var roleRows = await connection.QueryAsync<Role>(roleIdsSql, new { Names = roles }, transaction);
            var userRoles = roleRows.Select(role => new { UserId = userId, RoleId = role.Id });

            const string insertSql = "INSERT INTO dbo.UserRoles (UserId, RoleId) VALUES (@UserId, @RoleId)";
            await connection.ExecuteAsync(insertSql, userRoles, transaction);
        }

        transaction.Commit();
    }

    public async Task<IReadOnlyList<string>> GetAllRoleNames()
    {
        const string sql = """
            SELECT Name
            FROM dbo.Roles
            WHERE IsActive = 1
            ORDER BY Name ASC
            """;

        using var connection = _connectionFactory.Create();
        var roles = await connection.QueryAsync<string>(sql);
        return roles.ToList();
    }

    public async Task CreateRefreshToken(int userId, string token, DateTime expiresAtUtc, string? createdByIp)
    {
        const string sql = """
            INSERT INTO dbo.RefreshTokens (UserId, Token, ExpiresAtUtc, CreatedAtUtc, CreatedByIp)
            VALUES (@UserId, @Token, @ExpiresAtUtc, @CreatedAtUtc, @CreatedByIp)
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new
        {
            UserId = userId,
            Token = token,
            ExpiresAtUtc = expiresAtUtc,
            CreatedAtUtc = DateTime.UtcNow,
            CreatedByIp = createdByIp
        });
    }

    public async Task<RefreshToken?> GetRefreshToken(string token)
    {
        const string sql = """
            SELECT Id, UserId, Token, ExpiresAtUtc, RevokedAtUtc, CreatedAtUtc, CreatedByIp, RevokedByIp, ReplacedByToken
            FROM dbo.RefreshTokens
            WHERE Token = @Token
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<RefreshToken>(sql, new { Token = token });
    }

    public async Task RevokeRefreshToken(int refreshTokenId, DateTime revokedAtUtc, string? revokedByIp, string? replacedByToken)
    {
        const string sql = """
            UPDATE dbo.RefreshTokens
            SET RevokedAtUtc = @RevokedAtUtc,
                RevokedByIp = @RevokedByIp,
                ReplacedByToken = @ReplacedByToken
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new
        {
            Id = refreshTokenId,
            RevokedAtUtc = revokedAtUtc,
            RevokedByIp = revokedByIp,
            ReplacedByToken = replacedByToken
        });
    }

    private static List<string> NormalizeRoles(IEnumerable<string> roleNames)
    {
        return roleNames
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => name.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static async Task EnsureRolesExist(IDbConnection connection, IDbTransaction transaction, IEnumerable<string> roleNames)
    {
        const string sql = """
            INSERT INTO dbo.Roles (Name)
            SELECT @Name
            WHERE NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = @Name)
            """;

        foreach (var roleName in roleNames)
        {
            await connection.ExecuteAsync(sql, new { Name = roleName }, transaction);
        }
    }
}
