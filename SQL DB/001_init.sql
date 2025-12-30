/*
  Minimal Gym - SQL Server bootstrap
  Update database name if needed.
*/

IF DB_ID(N'MinimalGym') IS NULL
BEGIN
  CREATE DATABASE [MinimalGym];
END
GO

USE [MinimalGym];
GO
IF OBJECT_ID(N'dbo.GlobalSettings', N'V') IS NULL
BEGIN
  EXEC('CREATE VIEW dbo.GlobalSettings AS SELECT ''Central Standard Time'' AS TimeZone, CAST(''2099-12-31 23:59:59.997'' AS DATETIME) AS DefaultExpirationTime');
END
GO

IF OBJECT_ID(N'dbo.UfnToUniversalTime', N'FN') IS NULL
EXEC('CREATE FUNCTION dbo.UfnToUniversalTime(@utcTime DATETIME) RETURNS DATETIME AS BEGIN DECLARE @localTime AS DATETIME; SELECT @localTime = CAST(@utcTime AT TIME ZONE TimeZone AT TIME ZONE ''UTC'' AS DATETIME) FROM dbo.GlobalSettings; RETURN @localTime; END');
GO

IF OBJECT_ID(N'dbo.UfnToLocalTime', N'FN') IS NULL
EXEC('CREATE FUNCTION dbo.UfnToLocalTime(@utcTime DATETIME) RETURNS DATETIME AS BEGIN DECLARE @localTime AS DATETIME; SELECT @localTime = CAST(@utcTime AT TIME ZONE ''UTC'' AT TIME ZONE TimeZone AS DATETIME) FROM dbo.GlobalSettings; RETURN @localTime; END');
GO


IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Roles (
    Id            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Name          NVARCHAR(50) NOT NULL UNIQUE,
    IsActive      BIT NOT NULL CONSTRAINT DF_Roles_IsActive DEFAULT (1),
    CreatedAtUtc  DATETIME2(0) NOT NULL CONSTRAINT DF_Roles_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
  );
END
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    Id            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserName      NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash  NVARCHAR(255) NOT NULL,
    FullName      NVARCHAR(150) NOT NULL,
    Email         NVARCHAR(150) NULL,
    Phone         NVARCHAR(30) NULL,
    PhotoBase64   NVARCHAR(MAX) NULL,
    IsActive      BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT (1),
    IsLocked      BIT NOT NULL CONSTRAINT DF_Users_IsLocked DEFAULT (0),
    CreatedAtUtc  DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc  DATETIME2(0) NULL
  );
END
GO

IF COL_LENGTH('dbo.Users', 'PhotoBase64') IS NULL
BEGIN
  ALTER TABLE dbo.Users ADD PhotoBase64 NVARCHAR(MAX) NULL;
END
GO

IF OBJECT_ID(N'dbo.UserRoles', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserRoles (
    UserId   INT NOT NULL,
    RoleId   INT NOT NULL,
    CONSTRAINT PK_UserRoles PRIMARY KEY (UserId, RoleId),
    CONSTRAINT FK_UserRoles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_UserRoles_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.RefreshTokens', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.RefreshTokens (
    Id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    UserId          INT NOT NULL,
    Token           NVARCHAR(255) NOT NULL UNIQUE,
    ExpiresAtUtc    DATETIME2(0) NOT NULL,
    RevokedAtUtc    DATETIME2(0) NULL,
    CreatedAtUtc    DATETIME2(0) NOT NULL CONSTRAINT DF_RefreshTokens_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    CreatedByIp     NVARCHAR(45) NULL,
    RevokedByIp     NVARCHAR(45) NULL,
    ReplacedByToken NVARCHAR(255) NULL,
    CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.PaymentMethods', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.PaymentMethods (
    Id            INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Name          NVARCHAR(50) NOT NULL UNIQUE,
    IsActive      BIT NOT NULL CONSTRAINT DF_PaymentMethods_IsActive DEFAULT (1),
    CreatedAtUtc  DATETIME2(0) NOT NULL CONSTRAINT DF_PaymentMethods_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
  );
END
GO

IF OBJECT_ID(N'dbo.Config', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Config (
    Id               INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CurrencyCode     CHAR(3) NOT NULL CONSTRAINT DF_Config_CurrencyCode DEFAULT ('USD'),
    TaxRate          DECIMAL(9,4) NOT NULL CONSTRAINT DF_Config_TaxRate DEFAULT (0),
    ReceiptPrefix    NVARCHAR(10) NULL,
    NextReceiptNo    INT NOT NULL CONSTRAINT DF_Config_NextReceiptNo DEFAULT (1),
    CreatedAtUtc     DATETIME2(0) NOT NULL CONSTRAINT DF_Config_CreatedAtUtc DEFAULT (SYSUTCDATETIME())
  );
END
GO

IF OBJECT_ID(N'dbo.Members', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Members (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    FullName           NVARCHAR(150) NOT NULL,
    Phone              NVARCHAR(30) NULL,
    Email              NVARCHAR(150) NULL,
    BirthDate          DATE NULL,
    EmergencyContact   NVARCHAR(150) NULL,
    Notes              NVARCHAR(500) NULL,
    PhotoBase64        NVARCHAR(MAX) NULL,
    IsActive           BIT NOT NULL CONSTRAINT DF_Members_IsActive DEFAULT (1),
    IsDeleted          BIT NOT NULL CONSTRAINT DF_Members_IsDeleted DEFAULT (0),
    CreatedAtUtc       DATETIME2(0) NOT NULL CONSTRAINT DF_Members_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc       DATETIME2(0) NULL
  );
END
GO

IF COL_LENGTH('dbo.Members', 'PhotoBase64') IS NULL
BEGIN
  ALTER TABLE dbo.Members ADD PhotoBase64 NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('dbo.Config', 'LogoBase64') IS NULL
BEGIN
  ALTER TABLE dbo.Config ADD LogoBase64 NVARCHAR(MAX) NULL;
END
GO

IF OBJECT_ID(N'dbo.CheckIns', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CheckIns (
    Id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MemberId        INT NOT NULL,
    CheckedInAtUtc  DATETIME2(0) NOT NULL,
    CreatedByUserId INT NULL,
    CONSTRAINT FK_CheckIns_Members FOREIGN KEY (MemberId) REFERENCES dbo.Members(Id),
    CONSTRAINT FK_CheckIns_Users FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.Expenses', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Expenses (
    Id              INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Description     NVARCHAR(200) NOT NULL,
    AmountUsd       DECIMAL(19,4) NOT NULL,
    ExpenseDateUtc  DATETIME2(0) NOT NULL,
    Notes           NVARCHAR(300) NULL,
    CreatedAtUtc    DATETIME2(0) NOT NULL CONSTRAINT DF_Expenses_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    CreatedByUserId INT NULL,
    CONSTRAINT FK_Expenses_Users FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.MembershipPlans', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.MembershipPlans (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Name               NVARCHAR(80) NOT NULL UNIQUE,
    DurationDays       INT NOT NULL,
    PriceUsd           DECIMAL(19,4) NOT NULL,
    Rules              NVARCHAR(500) NULL,
    IsActive           BIT NOT NULL CONSTRAINT DF_MembershipPlans_IsActive DEFAULT (1),
    CreatedAtUtc       DATETIME2(0) NOT NULL CONSTRAINT DF_MembershipPlans_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc       DATETIME2(0) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.Subscriptions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Subscriptions (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MemberId           INT NOT NULL,
    PlanId             INT NOT NULL,
    StartDate          DATE NOT NULL,
    EndDate            DATE NOT NULL,
    Status             NVARCHAR(20) NOT NULL,
    PriceUsd           DECIMAL(19,4) NOT NULL,
    PausedAtUtc        DATETIME2(0) NULL,
    CreatedAtUtc       DATETIME2(0) NOT NULL CONSTRAINT DF_Subscriptions_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc       DATETIME2(0) NULL,
    CONSTRAINT CK_Subscriptions_Status CHECK (Status IN ('Active','Expired','Paused','Cancelled')),
    CONSTRAINT FK_Subscriptions_Members FOREIGN KEY (MemberId) REFERENCES dbo.Members(Id),
    CONSTRAINT FK_Subscriptions_Plans FOREIGN KEY (PlanId) REFERENCES dbo.MembershipPlans(Id)
  );
END
GO

IF COL_LENGTH('dbo.Subscriptions', 'PausedAtUtc') IS NULL
BEGIN
  ALTER TABLE dbo.Subscriptions ADD PausedAtUtc DATETIME2(0) NULL;
END
GO

IF OBJECT_ID(N'dbo.Payments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Payments (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    SubscriptionId     INT NOT NULL,
    PaymentMethodId    INT NOT NULL,
    AmountUsd          DECIMAL(19,4) NOT NULL,
    CurrencyCode       CHAR(3) NOT NULL CONSTRAINT DF_Payments_CurrencyCode DEFAULT ('USD'),
    PaidAtUtc          DATETIME2(0) NOT NULL,
    Reference          NVARCHAR(100) NULL,
    Status             NVARCHAR(20) NOT NULL CONSTRAINT DF_Payments_Status DEFAULT ('Completed'),
    CreatedAtUtc       DATETIME2(0) NOT NULL CONSTRAINT DF_Payments_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT CK_Payments_Status CHECK (Status IN ('Completed','Voided')),
    CONSTRAINT FK_Payments_Subscriptions FOREIGN KEY (SubscriptionId) REFERENCES dbo.Subscriptions(Id),
    CONSTRAINT FK_Payments_PaymentMethods FOREIGN KEY (PaymentMethodId) REFERENCES dbo.PaymentMethods(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.Products', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Products (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    Sku                NVARCHAR(60) NOT NULL UNIQUE,
    Barcode            NVARCHAR(60) NULL,
    Name               NVARCHAR(150) NOT NULL,
    SalePriceUsd       DECIMAL(19,4) NOT NULL,
    CostUsd            DECIMAL(19,4) NOT NULL,
    Category           NVARCHAR(80) NULL,
    IsActive           BIT NOT NULL CONSTRAINT DF_Products_IsActive DEFAULT (1),
    CreatedAtUtc       DATETIME2(0) NOT NULL CONSTRAINT DF_Products_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    UpdatedAtUtc       DATETIME2(0) NULL
  );
END
GO

IF OBJECT_ID(N'dbo.InventoryMovements', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.InventoryMovements (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    ProductId          INT NOT NULL,
    MovementType       NVARCHAR(20) NOT NULL,
    Quantity           DECIMAL(19,4) NOT NULL,
    UnitCostUsd        DECIMAL(19,4) NULL,
    Notes              NVARCHAR(300) NULL,
    CreatedAtUtc       DATETIME2(0) NOT NULL CONSTRAINT DF_InventoryMovements_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    CreatedByUserId    INT NULL,
    CONSTRAINT CK_InventoryMovements_Type CHECK (MovementType IN ('In','Out','Adjust','Waste')),
    CONSTRAINT FK_InventoryMovements_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id),
    CONSTRAINT FK_InventoryMovements_Users FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.CashSessions', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CashSessions (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    OpenedByUserId     INT NOT NULL,
    OpenedAtUtc        DATETIME2(0) NOT NULL,
    OpeningAmountUsd   DECIMAL(19,4) NOT NULL,
    Status             NVARCHAR(20) NOT NULL CONSTRAINT DF_CashSessions_Status DEFAULT ('Open'),
    ClosedByUserId     INT NULL,
    ClosedAtUtc        DATETIME2(0) NULL,
    CONSTRAINT CK_CashSessions_Status CHECK (Status IN ('Open','Closed')),
    CONSTRAINT FK_CashSessions_OpenedBy FOREIGN KEY (OpenedByUserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_CashSessions_ClosedBy FOREIGN KEY (ClosedByUserId) REFERENCES dbo.Users(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.Sales', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.Sales (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    MemberId           INT NULL,
    CashSessionId      INT NULL,
    SubtotalUsd        DECIMAL(19,4) NOT NULL,
    DiscountUsd        DECIMAL(19,4) NOT NULL CONSTRAINT DF_Sales_DiscountUsd DEFAULT (0),
    TaxUsd             DECIMAL(19,4) NOT NULL CONSTRAINT DF_Sales_TaxUsd DEFAULT (0),
    TotalUsd           DECIMAL(19,4) NOT NULL,
    CurrencyCode       CHAR(3) NOT NULL CONSTRAINT DF_Sales_CurrencyCode DEFAULT ('USD'),
    Status             NVARCHAR(20) NOT NULL CONSTRAINT DF_Sales_Status DEFAULT ('Completed'),
    ReceiptNumber      NVARCHAR(30) NULL,
    CreatedAtUtc       DATETIME2(0) NOT NULL CONSTRAINT DF_Sales_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    CreatedByUserId    INT NOT NULL,
    CONSTRAINT CK_Sales_Status CHECK (Status IN ('Completed','Voided','Refunded')),
    CONSTRAINT FK_Sales_Members FOREIGN KEY (MemberId) REFERENCES dbo.Members(Id),
    CONSTRAINT FK_Sales_CashSessions FOREIGN KEY (CashSessionId) REFERENCES dbo.CashSessions(Id),
    CONSTRAINT FK_Sales_Users FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.SaleItems', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SaleItems (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    SaleId             INT NOT NULL,
    ProductId          INT NOT NULL,
    Quantity           DECIMAL(19,4) NOT NULL,
    UnitPriceUsd       DECIMAL(19,4) NOT NULL,
    DiscountUsd        DECIMAL(19,4) NOT NULL CONSTRAINT DF_SaleItems_DiscountUsd DEFAULT (0),
    TaxUsd             DECIMAL(19,4) NOT NULL CONSTRAINT DF_SaleItems_TaxUsd DEFAULT (0),
    LineTotalUsd       DECIMAL(19,4) NOT NULL,
    CONSTRAINT FK_SaleItems_Sales FOREIGN KEY (SaleId) REFERENCES dbo.Sales(Id),
    CONSTRAINT FK_SaleItems_Products FOREIGN KEY (ProductId) REFERENCES dbo.Products(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.SalePayments', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.SalePayments (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    SaleId             INT NOT NULL,
    PaymentMethodId    INT NOT NULL,
    AmountUsd          DECIMAL(19,4) NOT NULL,
    PaidAtUtc          DATETIME2(0) NOT NULL,
    Reference          NVARCHAR(100) NULL,
    CONSTRAINT FK_SalePayments_Sales FOREIGN KEY (SaleId) REFERENCES dbo.Sales(Id),
    CONSTRAINT FK_SalePayments_PaymentMethods FOREIGN KEY (PaymentMethodId) REFERENCES dbo.PaymentMethods(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.CashMovements', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CashMovements (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CashSessionId      INT NOT NULL,
    MovementType       NVARCHAR(20) NOT NULL,
    AmountUsd          DECIMAL(19,4) NOT NULL,
    Notes              NVARCHAR(300) NULL,
    CreatedAtUtc       DATETIME2(0) NOT NULL CONSTRAINT DF_CashMovements_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    CreatedByUserId    INT NOT NULL,
    CONSTRAINT CK_CashMovements_Type CHECK (MovementType IN ('In','Out')),
    CONSTRAINT FK_CashMovements_Sessions FOREIGN KEY (CashSessionId) REFERENCES dbo.CashSessions(Id),
    CONSTRAINT FK_CashMovements_Users FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.CashClosures', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.CashClosures (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    CashSessionId      INT NOT NULL UNIQUE,
    ClosedByUserId     INT NOT NULL,
    ClosedAtUtc        DATETIME2(0) NOT NULL,
    CashTotalUsd       DECIMAL(19,4) NOT NULL CONSTRAINT DF_CashClosures_CashTotalUsd DEFAULT (0),
    CardTotalUsd       DECIMAL(19,4) NOT NULL CONSTRAINT DF_CashClosures_CardTotalUsd DEFAULT (0),
    TransferTotalUsd   DECIMAL(19,4) NOT NULL CONSTRAINT DF_CashClosures_TransferTotalUsd DEFAULT (0),
    OtherTotalUsd      DECIMAL(19,4) NOT NULL CONSTRAINT DF_CashClosures_OtherTotalUsd DEFAULT (0),
    CountedCashUsd     DECIMAL(19,4) NOT NULL CONSTRAINT DF_CashClosures_CountedCashUsd DEFAULT (0),
    DifferenceUsd      DECIMAL(19,4) NOT NULL CONSTRAINT DF_CashClosures_DifferenceUsd DEFAULT (0),
    CONSTRAINT FK_CashClosures_Sessions FOREIGN KEY (CashSessionId) REFERENCES dbo.CashSessions(Id),
    CONSTRAINT FK_CashClosures_Users FOREIGN KEY (ClosedByUserId) REFERENCES dbo.Users(Id)
  );
END
GO

IF OBJECT_ID(N'dbo.AuditLog', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.AuditLog (
    Id                 INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    EntityName         NVARCHAR(80) NOT NULL,
    EntityId           NVARCHAR(60) NOT NULL,
    Action             NVARCHAR(40) NOT NULL,
    UserId             INT NULL,
    CreatedAtUtc       DATETIME2(0) NOT NULL CONSTRAINT DF_AuditLog_CreatedAtUtc DEFAULT (SYSUTCDATETIME()),
    DataJson           NVARCHAR(MAX) NULL,
    CONSTRAINT FK_AuditLog_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
  );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.PaymentMethods)
BEGIN
  INSERT INTO dbo.PaymentMethods (Name)
  VALUES (N'Cash'), (N'Card'), (N'Transfer'), (N'Other');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = N'Admin')
BEGIN
  INSERT INTO dbo.Roles (Name)
  VALUES (N'Admin');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Name = N'User')
BEGIN
  INSERT INTO dbo.Roles (Name)
  VALUES (N'User');
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Config)
BEGIN
  INSERT INTO dbo.Config (CurrencyCode, TaxRate, ReceiptPrefix, NextReceiptNo)
  VALUES ('USD', 0, NULL, 1);
END
GO
