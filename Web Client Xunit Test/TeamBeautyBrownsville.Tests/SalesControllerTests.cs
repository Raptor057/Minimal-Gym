using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class SalesControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenNoOpenCash()
    {
        var sales = new Mock<ISaleRepository>();
        var products = new Mock<IProductRepository>();
        var members = new Mock<IMemberRepository>();
        var methods = new Mock<IPaymentMethodRepository>();
        var audit = new Mock<IAuditService>();
        var movements = new Mock<IInventoryMovementRepository>();
        var cash = new Mock<ICashRepository>();
        cash.Setup(x => x.GetOpenSession()).ReturnsAsync((CashSession?)null);

        var controller = new SalesController(sales.Object, products.Object, members.Object, methods.Object, audit.Object, movements.Object, cash.Object);

        var result = await controller.Create(new SaleCreateRequest(null, 10, 0, 0, 10, null, new[]
        {
            new SaleItemCreateRequest(1, 1, 10, 0, 0)
        }));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Create_ReturnsBadRequest_WhenStockNegative()
    {
        var sales = new Mock<ISaleRepository>();
        var products = new Mock<IProductRepository>();
        products.Setup(x => x.GetById(1)).ReturnsAsync(new Product { Id = 1, Name = "P", Sku = "S", IsActive = true });
        var members = new Mock<IMemberRepository>();
        var methods = new Mock<IPaymentMethodRepository>();
        var audit = new Mock<IAuditService>();
        var movements = new Mock<IInventoryMovementRepository>();
        movements.Setup(x => x.GetStockForProduct(1)).ReturnsAsync(0m);
        var cash = new Mock<ICashRepository>();
        cash.Setup(x => x.GetOpenSession()).ReturnsAsync(new CashSession { Id = 1, Status = "Open" });

        var controller = new SalesController(sales.Object, products.Object, members.Object, methods.Object, audit.Object, movements.Object, cash.Object);

        var result = await controller.Create(new SaleCreateRequest(null, 10, 0, 0, 10, null, new[]
        {
            new SaleItemCreateRequest(1, 1, 10, 0, 0)
        }));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Refund_ReturnsBadRequest_WhenAlreadyRefunded()
    {
        var sales = new Mock<ISaleRepository>();
        sales.Setup(x => x.GetById(2)).ReturnsAsync(new Sale { Id = 2, Status = "Refunded" });
        var products = new Mock<IProductRepository>();
        var members = new Mock<IMemberRepository>();
        var methods = new Mock<IPaymentMethodRepository>();
        var audit = new Mock<IAuditService>();
        var movements = new Mock<IInventoryMovementRepository>();
        var cash = new Mock<ICashRepository>();

        var controller = new SalesController(sales.Object, products.Object, members.Object, methods.Object, audit.Object, movements.Object, cash.Object);

        var result = await controller.Refund(2);

        Assert.IsType<BadRequestObjectResult>(result);
    }
}
