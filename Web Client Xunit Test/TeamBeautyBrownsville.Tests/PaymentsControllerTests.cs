using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class PaymentsControllerTests
{
    [Fact]
    public async Task Create_ReturnsNotFound_WhenSubscriptionMissing()
    {
        var payments = new Mock<IPaymentRepository>();
        var subs = new Mock<ISubscriptionRepository>();
        subs.Setup(x => x.GetById(1)).ReturnsAsync((Subscription?)null);
        var methods = new Mock<IPaymentMethodRepository>();
        var audit = new Mock<IAuditService>();
        var cash = new Mock<ICashRepository>();
        var controller = new PaymentsController(payments.Object, subs.Object, methods.Object, audit.Object, cash.Object);

        var result = await controller.Create(1, new PaymentCreateRequest(1, 10, null, null));

        Assert.IsType<NotFoundObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenNoOpenCash()
    {
        var payments = new Mock<IPaymentRepository>();
        var subs = new Mock<ISubscriptionRepository>();
        subs.Setup(x => x.GetById(1)).ReturnsAsync(new Subscription { Id = 1 });
        var methods = new Mock<IPaymentMethodRepository>();
        var audit = new Mock<IAuditService>();
        var cash = new Mock<ICashRepository>();
        cash.Setup(x => x.GetOpenSession()).ReturnsAsync((CashSession?)null);
        var controller = new PaymentsController(payments.Object, subs.Object, methods.Object, audit.Object, cash.Object);

        var result = await controller.Create(1, new PaymentCreateRequest(1, 10, null, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
