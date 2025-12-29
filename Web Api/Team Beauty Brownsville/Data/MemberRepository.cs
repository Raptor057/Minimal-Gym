using Dapper;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public sealed class MemberRepository : IMemberRepository
{
    private readonly SqlConnectionFactory _connectionFactory;

    public MemberRepository(SqlConnectionFactory connectionFactory)
    {
        _connectionFactory = connectionFactory;
    }

    public async Task<IReadOnlyList<Member>> GetAll()
    {
        const string sql = """
            SELECT Id, FullName, Phone, Email, BirthDate, EmergencyContact, Notes,
                   PhotoBase64, IsActive, IsDeleted, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.Members
            WHERE IsDeleted = 0
            ORDER BY Id DESC
            """;

        using var connection = _connectionFactory.Create();
        var members = await connection.QueryAsync<Member>(sql);
        return members.ToList();
    }

    public async Task<Member?> GetById(int id)
    {
        const string sql = """
            SELECT Id, FullName, Phone, Email, BirthDate, EmergencyContact, Notes,
                   PhotoBase64, IsActive, IsDeleted, CreatedAtUtc, UpdatedAtUtc
            FROM dbo.Members
            WHERE Id = @Id AND IsDeleted = 0
            """;

        using var connection = _connectionFactory.Create();
        return await connection.QuerySingleOrDefaultAsync<Member>(sql, new { Id = id });
    }

    public async Task<int> Create(Member member)
    {
        const string sql = """
            INSERT INTO dbo.Members (FullName, Phone, Email, BirthDate, EmergencyContact, Notes, PhotoBase64, IsActive, IsDeleted, CreatedAtUtc)
            OUTPUT INSERTED.Id
            VALUES (@FullName, @Phone, @Email, @BirthDate, @EmergencyContact, @Notes, @PhotoBase64, @IsActive, 0, @CreatedAtUtc)
            """;

        using var connection = _connectionFactory.Create();
        return await connection.ExecuteScalarAsync<int>(sql, member);
    }

    public async Task Update(
        int id,
        string? fullName,
        string? phone,
        string? email,
        DateTime? birthDate,
        string? emergencyContact,
        string? notes,
        string? photoBase64,
        bool? isActive,
        DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.Members
            SET FullName = COALESCE(@FullName, FullName),
                Phone = COALESCE(@Phone, Phone),
                Email = COALESCE(@Email, Email),
                BirthDate = COALESCE(@BirthDate, BirthDate),
                EmergencyContact = COALESCE(@EmergencyContact, EmergencyContact),
                Notes = COALESCE(@Notes, Notes),
                PhotoBase64 = COALESCE(@PhotoBase64, PhotoBase64),
                IsActive = COALESCE(@IsActive, IsActive),
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id AND IsDeleted = 0
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new
        {
            Id = id,
            FullName = fullName,
            Phone = phone,
            Email = email,
            BirthDate = birthDate?.Date,
            EmergencyContact = emergencyContact,
            Notes = notes,
            PhotoBase64 = photoBase64,
            IsActive = isActive,
            UpdatedAtUtc = updatedAtUtc
        });
    }

    public async Task SoftDelete(int id, DateTime updatedAtUtc)
    {
        const string sql = """
            UPDATE dbo.Members
            SET IsDeleted = 1,
                UpdatedAtUtc = @UpdatedAtUtc
            WHERE Id = @Id
            """;

        using var connection = _connectionFactory.Create();
        await connection.ExecuteAsync(sql, new { Id = id, UpdatedAtUtc = updatedAtUtc });
    }
}
