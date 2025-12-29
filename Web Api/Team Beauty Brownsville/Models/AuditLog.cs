namespace Team_Beauty_Brownsville.Models;

public sealed class AuditLog
{
    public int Id { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string? DataJson { get; set; }
}
