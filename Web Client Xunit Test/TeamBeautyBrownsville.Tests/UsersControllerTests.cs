using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class UsersControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenMissingFields()
    {
        var users = new Mock<IUserRepository>();
        var audit = new Mock<IAuditService>();
        var controller = new UsersController(users.Object, audit.Object);

        var result = await controller.Create(new UserCreateRequest("", "", "", null, null, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task GetById_ReturnsNotFound_WhenMissing()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetById(10)).ReturnsAsync((User?)null);
        var audit = new Mock<IAuditService>();
        var controller = new UsersController(users.Object, audit.Object);

        var result = await controller.GetById(10);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsCreated_WhenValid()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.Create(It.IsAny<User>())).ReturnsAsync(1);
        users.Setup(x => x.GetById(1)).ReturnsAsync(new User { Id = 1, UserName = "u", FullName = "User", IsActive = true });
        users.Setup(x => x.GetRolesForUser(1)).ReturnsAsync(new List<string>());
        var audit = new Mock<IAuditService>();
        audit.Setup(x => x.LogAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(), It.IsAny<object?>()))
            .Returns(Task.CompletedTask);

        var controller = new UsersController(users.Object, audit.Object)
        {
            ControllerContext = TestHelpers.CreateControllerContextWithUser(99)
        };

        var result = await controller.Create(new UserCreateRequest("u", "p", "User", null, null, null));

        Assert.IsType<CreatedAtActionResult>(result.Result);
    }
}
