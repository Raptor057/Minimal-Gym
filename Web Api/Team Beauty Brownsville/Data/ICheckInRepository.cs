using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface ICheckInRepository
{
    Task<bool> HasActiveSubscription(int memberId, DateTime dateUtc);
    Task<IReadOnlyList<CheckIn>> GetAll();
    Task<IReadOnlyList<CheckInWithMemberPhoto>> GetAllWithMemberPhoto();
    Task<int> Create(CheckIn checkIn);
}
