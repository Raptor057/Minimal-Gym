using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class ReportsControllerTests
{
    [Fact]
    public async Task Revenue_ReturnsBadRequest_WhenMissingDates()
    {
        var reports = new Mock<IReportRepository>();
        var controller = new ReportsController(reports.Object);

        var result = await controller.Revenue(null, null);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Sales_ReturnsBadRequest_WhenFromAfterTo()
    {
        var reports = new Mock<IReportRepository>();
        var controller = new ReportsController(reports.Object);

        var result = await controller.Sales(DateTime.UtcNow, DateTime.UtcNow.AddDays(-1));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
