using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class MembershipPlansControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenInvalid()
    {
        var plans = new Mock<IMembershipPlanRepository>();
        var audit = new Mock<IAuditService>();
        var controller = new MembershipPlansController(plans.Object, audit.Object);

        var result = await controller.Create(new MembershipPlanCreateRequest("", 0, 0, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_ReturnsBadRequest_WhenDurationInvalid()
    {
        var plans = new Mock<IMembershipPlanRepository>();
        plans.Setup(x => x.GetById(1)).ReturnsAsync(new MembershipPlan { Id = 1, Name = "Plan", DurationDays = 30, PriceUsd = 10, IsActive = true });
        var audit = new Mock<IAuditService>();
        var controller = new MembershipPlansController(plans.Object, audit.Object);

        var result = await controller.Update(1, new MembershipPlanUpdateRequest(null, 0, null, null, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
