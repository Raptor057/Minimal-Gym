namespace Team_Beauty_Brownsville.Models;

public sealed class CashSessionSummary
{
    public CashSession Session { get; set; } = new();
    public List<CashMethodTotal> PaymentTotals { get; set; } = new();
    public List<CashMethodTotal> ExpenseTotals { get; set; } = new();
    public decimal CashMovementsInUsd { get; set; }
    public decimal CashMovementsOutUsd { get; set; }
}

public sealed class CashMethodTotal
{
    public int PaymentMethodId { get; set; }
    public decimal AmountUsd { get; set; }
}
