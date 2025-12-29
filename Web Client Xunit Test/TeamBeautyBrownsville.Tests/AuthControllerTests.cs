using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class AuthControllerTests
{
    [Fact]
    public async Task Login_ReturnsBadRequest_WhenMissingCredentials()
    {
        var users = new Mock<IUserRepository>();
        var tokens = new Mock<ITokenService>();
        var controller = new AuthController(users.Object, tokens.Object);

        var result = await controller.Login(new AuthLoginRequest("", ""));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Login_ReturnsUnauthorized_WhenUserNotFound()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(x => x.GetByUserName("nope")).ReturnsAsync((User?)null);
        var tokens = new Mock<ITokenService>();
        var controller = new AuthController(users.Object, tokens.Object);

        var result = await controller.Login(new AuthLoginRequest("nope", "pass"));

        Assert.IsType<UnauthorizedResult>(result.Result);
    }

    [Fact]
    public async Task Refresh_ReturnsBadRequest_WhenMissingToken()
    {
        var users = new Mock<IUserRepository>();
        var tokens = new Mock<ITokenService>();
        var controller = new AuthController(users.Object, tokens.Object);

        var result = await controller.Refresh(new AuthRefreshRequest(""));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
