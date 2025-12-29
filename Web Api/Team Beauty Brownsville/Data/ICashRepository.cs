using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface ICashRepository
{
    Task<CashSession?> GetOpenSession();
    Task<IReadOnlyList<CashSession>> GetClosures();
    Task<int> OpenSession(CashSession session);
    Task AddMovement(CashMovement movement);
    Task CloseSession(CashClosure closure);
}
