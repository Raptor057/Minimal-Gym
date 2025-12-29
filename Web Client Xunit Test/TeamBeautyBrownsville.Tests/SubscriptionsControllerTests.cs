using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class SubscriptionsControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenPlanMissing()
    {
        var subs = new Mock<ISubscriptionRepository>();
        var plans = new Mock<IMembershipPlanRepository>();
        var members = new Mock<IMemberRepository>();
        members.Setup(x => x.GetById(1)).ReturnsAsync(new Member { Id = 1, FullName = "Member", IsActive = true });
        var audit = new Mock<IAuditService>();
        var controller = new SubscriptionsController(subs.Object, plans.Object, members.Object, audit.Object);

        var result = await controller.Create(1, new SubscriptionCreateRequest(99, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Pause_ReturnsBadRequest_WhenNotActive()
    {
        var subs = new Mock<ISubscriptionRepository>();
        subs.Setup(x => x.GetById(1)).ReturnsAsync(new Subscription { Id = 1, Status = "Paused" });
        var plans = new Mock<IMembershipPlanRepository>();
        var members = new Mock<IMemberRepository>();
        var audit = new Mock<IAuditService>();
        var controller = new SubscriptionsController(subs.Object, plans.Object, members.Object, audit.Object);

        var result = await controller.Pause(1);

        Assert.IsType<BadRequestObjectResult>(result);
    }

    [Fact]
    public async Task Resume_ReturnsBadRequest_WhenNotPaused()
    {
        var subs = new Mock<ISubscriptionRepository>();
        subs.Setup(x => x.GetById(2)).ReturnsAsync(new Subscription { Id = 2, Status = "Active" });
        var plans = new Mock<IMembershipPlanRepository>();
        var members = new Mock<IMemberRepository>();
        var audit = new Mock<IAuditService>();
        var controller = new SubscriptionsController(subs.Object, plans.Object, members.Object, audit.Object);

        var result = await controller.Resume(2);

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
