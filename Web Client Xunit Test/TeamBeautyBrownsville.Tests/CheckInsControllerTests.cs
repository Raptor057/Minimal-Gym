using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class CheckInsControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenMemberMissing()
    {
        var checkins = new Mock<ICheckInRepository>();
        var members = new Mock<IMemberRepository>();
        members.Setup(x => x.GetById(1)).ReturnsAsync((Member?)null);
        var audit = new Mock<IAuditService>();
        var controller = new CheckInsController(checkins.Object, members.Object, audit.Object);

        var result = await controller.Create(new CheckInCreateRequest(1, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenNoActiveSubscription()
    {
        var checkins = new Mock<ICheckInRepository>();
        checkins.Setup(x => x.HasActiveSubscription(1, It.IsAny<DateTime>())).ReturnsAsync(false);
        var members = new Mock<IMemberRepository>();
        members.Setup(x => x.GetById(1)).ReturnsAsync(new Member { Id = 1, FullName = "M", IsActive = true });
        var audit = new Mock<IAuditService>();
        var controller = new CheckInsController(checkins.Object, members.Object, audit.Object);

        var result = await controller.Create(new CheckInCreateRequest(1, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
