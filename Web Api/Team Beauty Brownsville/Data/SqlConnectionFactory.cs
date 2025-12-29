using System.Data;
using Microsoft.Data.SqlClient;

namespace Team_Beauty_Brownsville.Data;

public sealed class SqlConnectionFactory
{
    private readonly string _connectionString;

    public SqlConnectionFactory(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required.");
    }

    public IDbConnection Create()
    {
        return new SqlConnection(_connectionString);
    }
}
