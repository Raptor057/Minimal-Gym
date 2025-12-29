namespace Team_Beauty_Brownsville.Models;

public sealed class PaymentMethod
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
