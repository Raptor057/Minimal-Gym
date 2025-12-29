namespace Team_Beauty_Brownsville.Models;

public sealed class CashClosure
{
    public int Id { get; set; }
    public int CashSessionId { get; set; }
    public int ClosedByUserId { get; set; }
    public DateTime ClosedAtUtc { get; set; }
    public decimal CashTotalUsd { get; set; }
    public decimal CardTotalUsd { get; set; }
    public decimal TransferTotalUsd { get; set; }
    public decimal OtherTotalUsd { get; set; }
    public decimal CountedCashUsd { get; set; }
    public decimal DifferenceUsd { get; set; }
}
