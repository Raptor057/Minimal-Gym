using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface ICashRepository
{
    Task<CashSession?> GetById(int id);
    Task<CashSession?> GetOpenSession();
    Task<IReadOnlyList<CashSession>> GetClosures();
    Task<CashSessionSummary?> GetSessionSummary(int cashSessionId);
    Task<int> OpenSession(CashSession session);
    Task AddMovement(CashMovement movement);
    Task<IReadOnlyList<CashMovement>> GetMovements(int? cashSessionId);
    Task CloseSession(CashClosure closure);
}
