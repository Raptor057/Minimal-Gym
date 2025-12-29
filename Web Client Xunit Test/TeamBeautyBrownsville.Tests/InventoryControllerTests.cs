using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class InventoryControllerTests
{
    [Fact]
    public async Task CreateMovement_ReturnsBadRequest_WhenTypeInvalid()
    {
        var movements = new Mock<IInventoryMovementRepository>();
        var products = new Mock<IProductRepository>();
        var audit = new Mock<IAuditService>();
        var controller = new InventoryController(movements.Object, products.Object, audit.Object);

        var result = await controller.CreateMovement(new InventoryMovementCreateRequest(1, "Bad", 1, null, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task CreateMovement_ReturnsBadRequest_WhenStockNegative()
    {
        var movements = new Mock<IInventoryMovementRepository>();
        movements.Setup(x => x.GetStockForProduct(1)).ReturnsAsync(0m);
        var products = new Mock<IProductRepository>();
        products.Setup(x => x.GetById(1)).ReturnsAsync(new Product { Id = 1, Name = "P", Sku = "S", IsActive = true });
        var audit = new Mock<IAuditService>();
        var controller = new InventoryController(movements.Object, products.Object, audit.Object);

        var result = await controller.CreateMovement(new InventoryMovementCreateRequest(1, "Out", 1, null, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
