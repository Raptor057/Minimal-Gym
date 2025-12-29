using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class AuditControllerTests
{
    [Fact]
    public async Task Get_ReturnsBadRequest_WhenLimitOutOfRange()
    {
        var audit = new Mock<IAuditRepository>();
        var controller = new AuditController(audit.Object);

        var result = await controller.Get(null, null, null, null, null, 0);

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
