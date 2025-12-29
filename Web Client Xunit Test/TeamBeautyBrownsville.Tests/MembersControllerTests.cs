using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class MembersControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenMissingName()
    {
        var members = new Mock<IMemberRepository>();
        var audit = new Mock<IAuditService>();
        var controller = new MembersController(members.Object, audit.Object);

        var result = await controller.Create(new MemberCreateRequest("", null, null, null, null, null, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenMissing()
    {
        var members = new Mock<IMemberRepository>();
        members.Setup(x => x.GetById(1)).ReturnsAsync((Member?)null);
        var audit = new Mock<IAuditService>();
        var controller = new MembersController(members.Object, audit.Object);

        var result = await controller.GetById(1);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsCreated_WhenValid()
    {
        var members = new Mock<IMemberRepository>();
        members.Setup(x => x.Create(It.IsAny<Member>())).ReturnsAsync(5);
        members.Setup(x => x.GetById(5)).ReturnsAsync(new Member { Id = 5, FullName = "Member", IsActive = true });
        var audit = new Mock<IAuditService>();
        audit.Setup(x => x.LogAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<object?>()))
            .Returns(Task.CompletedTask);

        var controller = new MembersController(members.Object, audit.Object)
        {
            ControllerContext = TestHelpers.CreateControllerContextWithUser(10)
        };

        var result = await controller.Create(new MemberCreateRequest("Member", null, null, null, null, null, null));

        Assert.IsType<CreatedAtActionResult>(result.Result);
    }
}
