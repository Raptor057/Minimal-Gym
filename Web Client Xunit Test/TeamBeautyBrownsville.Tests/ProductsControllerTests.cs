using Microsoft.AspNetCore.Mvc;
using Moq;
using Team_Beauty_Brownsville.Controllers;
using Team_Beauty_Brownsville.Data;
using Team_Beauty_Brownsville.Dtos;
using Team_Beauty_Brownsville.Models;
using Team_Beauty_Brownsville.Services;
using Xunit;

namespace TeamBeautyBrownsville.Tests;

public sealed class ProductsControllerTests
{
    [Fact]
    public async Task Create_ReturnsBadRequest_WhenMissingSku()
    {
        var products = new Mock<IProductRepository>();
        var audit = new Mock<IAuditService>();
        var controller = new ProductsController(products.Object, audit.Object);

        var result = await controller.Create(new ProductCreateRequest("", "Name", 10, 1, null, null, true));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }

    [Fact]
    public async Task Update_ReturnsBadRequest_WhenCostNegative()
    {
        var products = new Mock<IProductRepository>();
        products.Setup(x => x.GetById(1)).ReturnsAsync(new Product { Id = 1, Name = "P", Sku = "SKU", IsActive = true });
        var audit = new Mock<IAuditService>();
        var controller = new ProductsController(products.Object, audit.Object);

        var result = await controller.Update(1, new ProductUpdateRequest(null, null, null, -1, null, null, null));

        Assert.IsType<BadRequestObjectResult>(result.Result);
    }
}
