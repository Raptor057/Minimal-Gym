using Team_Beauty_Brownsville.Models;

namespace Team_Beauty_Brownsville.Data;

public interface ICheckInRepository
{
    Task<bool> HasActiveSubscription(int memberId, DateTime dateUtc);
    Task<IReadOnlyList<CheckIn>> GetAll();
    Task<IReadOnlyList<CheckInWithMemberPhoto>> GetAllWithMemberPhoto();
    Task<IReadOnlyList<CheckInWithMemberSummary>> GetTodayWithMemberSummary(DateTime dateUtc);
    Task<int> Create(CheckIn checkIn);
}
