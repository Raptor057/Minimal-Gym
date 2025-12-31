using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Services;

public interface ICashBalanceService
{
    Task<CashBalanceSnapshot?> GetOpenSnapshot();
    Task<CashBalanceSnapshot?> GetSnapshot(int cashSessionId);
}

public sealed class CashBalanceSnapshot
{
    public CashSession Session { get; init; } = new();
    public IReadOnlyList<PaymentMethod> Methods { get; init; } = Array.Empty<PaymentMethod>();
    public IReadOnlyDictionary<int, decimal> PaymentTotals { get; init; } = new Dictionary<int, decimal>();
    public decimal CashMovementsInUsd { get; init; }
    public decimal CashMovementsOutUsd { get; init; }
    public decimal CashExpensesUsd { get; init; }
    public decimal ExpectedCashUsd { get; init; }
    public IReadOnlyDictionary<int, decimal> MethodBalances { get; init; } = new Dictionary<int, decimal>();
    public int? CashMethodId { get; init; }
}

public sealed class CashBalanceService : ICashBalanceService
{
    private readonly ICashRepository _cash;
    private readonly IPaymentMethodRepository _methods;

    public CashBalanceService(ICashRepository cash, IPaymentMethodRepository methods)
    {
        _cash = cash;
        _methods = methods;
    }

    public async Task<CashBalanceSnapshot?> GetOpenSnapshot()
    {
        var session = await _cash.GetOpenSession();
        return session is null ? null : await GetSnapshot(session.Id);
    }

    public async Task<CashBalanceSnapshot?> GetSnapshot(int cashSessionId)
    {
        var summary = await _cash.GetSessionSummary(cashSessionId);
        if (summary is null)
        {
            return null;
        }

        var methods = await _methods.GetAll();
        var paymentTotals = summary.PaymentTotals.ToDictionary(entry => entry.PaymentMethodId, entry => entry.AmountUsd);

        var cashMethodId = methods.FirstOrDefault(method =>
            string.Equals(method.Name, "Cash", StringComparison.OrdinalIgnoreCase))?.Id;

        decimal cashExpenses = 0m;
        if (cashMethodId is not null)
        {
            var cashExpense = summary.ExpenseTotals.FirstOrDefault(entry => entry.PaymentMethodId == cashMethodId.Value);
            cashExpenses = cashExpense?.AmountUsd ?? 0m;
        }

        var cashPayments = cashMethodId is not null && paymentTotals.TryGetValue(cashMethodId.Value, out var total)
            ? total
            : 0m;

        var expectedCash = summary.Session.OpeningAmountUsd + cashPayments + summary.CashMovementsInUsd - summary.CashMovementsOutUsd - cashExpenses;

        var balances = new Dictionary<int, decimal>();
        foreach (var method in methods)
        {
            if (cashMethodId is not null && method.Id == cashMethodId.Value)
            {
                balances[method.Id] = expectedCash;
                continue;
            }

            balances[method.Id] = paymentTotals.TryGetValue(method.Id, out var amount) ? amount : 0m;
        }

        return new CashBalanceSnapshot
        {
            Session = summary.Session,
            Methods = methods,
            PaymentTotals = paymentTotals,
            CashMovementsInUsd = summary.CashMovementsInUsd,
            CashMovementsOutUsd = summary.CashMovementsOutUsd,
            CashExpensesUsd = cashExpenses,
            ExpectedCashUsd = expectedCash,
            MethodBalances = balances,
            CashMethodId = cashMethodId
        };
    }
}
