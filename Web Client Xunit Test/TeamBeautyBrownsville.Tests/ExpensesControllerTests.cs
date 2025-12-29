using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class ExpensesControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenDescriptionMissing()
    {
        var expenses = new Mock<IExpenseRepository>();
        var audit = new Mock<IAuditService>();
        var controller = new ExpensesController(expenses.Object, audit.Object);

        var result = await controller.Create(new ExpenseCreateRequest("", 10, null, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenAmountInvalid()
    {
        var expenses = new Mock<IExpenseRepository>();
        var audit = new Mock<IAuditService>();
        var controller = new ExpensesController(expenses.Object, audit.Object);

        var result = await controller.Create(new ExpenseCreateRequest("Test", 0, null, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
