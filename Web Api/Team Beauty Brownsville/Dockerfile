FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Team Beauty Brownsville.csproj", "./"]
RUN dotnet restore "./Team Beauty Brownsville.csproj"
COPY . .
RUN dotnet publish "./Team Beauty Brownsville.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:5057
EXPOSE 5057
ENTRYPOINT ["dotnet", "Team Beauty Brownsville.dll"]
