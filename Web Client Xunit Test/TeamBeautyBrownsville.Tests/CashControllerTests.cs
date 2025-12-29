using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class CashControllerTests
{
    [Fact]
    public async Task Open_ReturnsConflict_WhenAlreadyOpen()
    {
        var cash = new Mock<ICashRepository>();
        cash.Setup(x => x.GetOpenSession()).ReturnsAsync(new CashSession { Id = 1, Status = "Open" });
        var audit = new Mock<IAuditService>();
        var controller = new CashController(cash.Object, audit.Object);

        var result = await controller.Open(new CashOpenRequest(10));

        Assert.IsType<ConflictObjectResult>(result.Result);
    }

    [Fact]
    public async Task Close_ReturnsNotFound_WhenNoOpenSession()
    {
        var cash = new Mock<ICashRepository>();
        cash.Setup(x => x.GetOpenSession()).ReturnsAsync((CashSession?)null);
        var audit = new Mock<IAuditService>();
        var controller = new CashController(cash.Object, audit.Object);

        var result = await controller.Close(new CashCloseRequest(1, 0, 0, 0, 0, 0));

        Assert.IsType<NotFoundObjectResult>(result);
    }
}
