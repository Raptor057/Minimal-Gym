using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface IExpenseRepository
{
    Task<IReadOnlyList<Expense>> GetAll();
    Task<int> Create(Expense expense);
}
