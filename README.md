# Team Beauty Brownsville - Technical Documentation

Monolith gym management system (single .NET 8 Web API + React client). Backend stores UTC; frontend renders local time.

## Stack
- Backend: .NET 8 Web API, Dapper, SQL Server 2022, JWT auth
- Frontend: React (Vite), Tailwind CSS v4.1, Axios, React Router
- Tests: xUnit (API controllers/services)
- Container: Docker + docker-compose

## Documentation
- User manual: MANUAL_USUARIO.md
- Local summary (not committed): RESUMEN.md

## Repository layout
- `Web Api/Team Beauty Brownsville`: .NET Web API
- `Web Client`: React client
- `Web Client Xunit Test`: xUnit tests
- `SQL DB/001_init.sql`: database schema + seed helpers
- `docker-compose.yml`: SQL Server + API + Web client

## Environment and ports
- API: `http://localhost:5057`
- Web Client: `http://localhost:5173`
- SQL Server: `localhost,1433`

## Database
SQL Server database name: `MinimalGym`

Connection string (local default):
```
Server=localhost,1433;Database=MinimalGym;User Id=sa;Password=Cbmwjmkq27$*;TrustServerCertificate=True;
```

Schema script:
- `SQL DB/001_init.sql`

Notes:
- UTC helpers/views are included in the SQL script.
- All server-side dates are UTC.

## Authentication
- JWT access token + refresh token
- Access token is required for all protected endpoints.
- Refresh flow: `/auth/refresh`
- Logout revokes refresh token: `/auth/logout`

First admin bootstrap:
- `POST /bootstrap/first-admin` (allowed only when no users exist)
- `GET /bootstrap/status` returns `hasUsers`

JWT settings (appsettings.json):
- `Jwt:Key` must be 32+ chars for HS256

## Public check-in flow (no login)
Public UI:
- `GET http://localhost:5173/checkin`

Public API:
- `GET /checkins/scan/{memberId}` (member info + subscription status)
- `POST /checkins` (registers check-in)

Admin-only:
- `GET /checkins` (full list)

## Date handling
Backend:
- All dates stored/returned in UTC.

Frontend:
- Responses with UTC timestamps are converted to local time.
- Requests accept local `YYYY-MM-DDTHH:mm`, `YYYY-MM-DD HH:mm`, or `DD/MM/YYYY HH:mm` and send UTC ISO.
- Display format: `MM/DD/YYYY h:mm AM/PM`.

## API Modules (controllers)
- Auth: `/auth`
- Bootstrap: `/bootstrap`
- Users: `/users`
- Members: `/members`
- Membership plans: `/membership-plans`
- Subscriptions: `/members/{id}/subscriptions`, `/subscriptions/...`
- Payments: `/payments`, `/subscriptions/{id}/payments`
- Payment methods: `/payment-methods`
- Products: `/products`
- Inventory: `/inventory/movements`
- Sales + refunds: `/sales`, `/sales/{id}/payments`, `/sales/{id}/refund`
- Cash sessions: `/cash/open`, `/cash/current`, `/cash/movements`, `/cash/close`, `/cash/closures`
- Expenses: `/expenses`
- Reports: `/reports/revenue`, `/reports/sales`, `/reports/subscriptions/status`, `/reports/subscriptions/due`, `/reports/inventory/low-stock`
- Audit log: `/audit`
- Health: `/health`
- Version: `GET /health/version` (public)

Swagger:
- Available at `http://localhost:5057/swagger` (after API is running)
- Includes Auth button for JWT

## Frontend modules
Protected admin UI:
- Dashboard, Users, Members, Plans, Subscriptions, Payments
- Products, Inventory, Sales, Cash, Expenses
- Reports, Audit, Config, Health

Public:
- Check-in kiosk page at `/checkin`

## Local development (no Docker)
Backend:
```
cd "Web Api/Team Beauty Brownsville"
dotnet restore
dotnet run
```

Frontend:
```
cd "Web Client"
npm install
npm run dev
```

Database:
- Run `SQL DB/001_init.sql` against SQL Server.

## Docker
Build and run:
```
docker compose up --build
```

Services:
- `sqlserver`: SQL Server 2022 Developer
- `webapi`: .NET 8 API (port 5057)
- `webclient`: Nginx static (port 5173)

Compose file:
- `docker-compose.yml`

## Tests
```
cd "Web Client Xunit Test/TeamBeautyBrownsville.Tests"
dotnet test
```

## Notes and constraints
- Monolith API project (no clean architecture).
- Stock cannot go negative (enforced in Sales + Inventory).
- Refunds add stock back.
- Cash session must be open to record sales and payments.
- Versions are stored in `Web Api/VERSION` and `Web Client/VERSION` and shown in sidebar/login.
