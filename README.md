# Sindbad Field Service Management Platform

Sindbad is a field-service management platform built around Laravel and a React administration dashboard. It connects service operations with Odoo ERP data, helping teams manage customer service requests while referencing customer, order, invoice, product, and task information from Odoo.

> **Odoo integration:** The application includes an Odoo JSON-RPC integration layer. Live Odoo features require valid Odoo access, network connectivity, and the appropriate permissions. Configure the credentials for your environment before relying on ERP-backed workflows.

## Platform at a glance

- **Laravel 12 API** for authentication, customer profiles, service requests, installation requests, technician assignments, notifications, and administration.
- **React and TypeScript dashboard** for administrative and operational workflows.
- **Odoo ERP integration** for customer lookup and linked customer records, sales orders, invoices, financial information, task readiness, and product data.
- **Live technician tracking** with Firebase and map-based dashboard views.
- **Automated CI** with GitHub Actions for Laravel tests and frontend production builds.

## Odoo integration

The backend includes an Odoo integration service using JSON-RPC. Its current capabilities include:

- Finding Odoo customers by phone number or name and associating application users with their Odoo customer ID.
- Retrieving customer sales orders, invoices, debt information, and tasks.
- Checking task readiness and financial eligibility through dedicated middleware components.
- Returning Odoo products through the authenticated admin API route `GET /api/admin/odoo/products`.

Financial-eligibility and task-readiness middleware are available in the backend; verify that the relevant middleware is enabled on the specific routes in your deployment before treating those checks as active request policies.

Configure the connection in the Laravel environment:

```dotenv
ODOO_URL=https://your-company.odoo.com
ODOO_DB=your_odoo_database
ODOO_USERNAME=your-integration-user
ODOO_PASSWORD=your-integration-password
```

Use an Odoo integration account with only the permissions needed by the enabled features. Keep credentials in the deployment platform's secret manager or an untracked local `.env` file; never commit real credentials. Odoo availability, database name, access rights, and model fields depend on the target Odoo instance and its configuration.

## Repository structure

| Path | Purpose |
| --- | --- |
| `app/` and `routes/` | Laravel application, API controllers, services, middleware, and routes |
| `app/Services/Odoo/` | Odoo integration interface and JSON-RPC service |
| `config/` | Application configuration, including Odoo settings |
| `database/` | Database migrations, factories, and seeders |
| `resources/` | Laravel frontend assets built with Vite |
| `dashboard/` | React and TypeScript administration dashboard |
| `tests/` | Laravel tests using Pest |
| `.github/workflows/ci.yml` | GitHub Actions continuous integration workflow |

## Requirements

- PHP 8.2 or newer and Composer 2
- Node.js 22 and npm
- MySQL for a typical local or production backend deployment
- SQLite support for the in-memory test database
- Access to an Odoo instance for Odoo-backed features

## Local development

### Laravel API

Create a MySQL database, then run these commands from the repository root:

```bash
cp .env.example .env
composer install
php artisan key:generate
```

Update the database settings in `.env` (`DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`). Add the Odoo settings above if you want to use the Odoo-backed features. Then run:

```bash
php artisan migrate
php artisan storage:link
npm ci
npm run build
php artisan serve
```

Run a queue worker in a separate terminal when processing background jobs:

```bash
php artisan queue:work
```

For the combined Laravel server, queue worker, and Vite development server, use:

```bash
composer run dev
```

### React dashboard

In another terminal:

```bash
cd dashboard
npm ci
```

Create `dashboard/.env` and configure the API URL. Add a Google Maps key if the map features in your environment require one:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_GOOGLE_MAPS_API_KEY=
```

Start the dashboard development server:

```bash
npm run dev
```

Vite prints the local URL in the terminal. Run `npm run build` in `dashboard/` to create production assets. Run `npm run lint` to check the dashboard source; existing lint findings may need to be resolved before using lint as a CI gate.

## Testing and CI

Run the Laravel test suite from the repository root:

```bash
php artisan test
```

Build the Laravel frontend assets:

```bash
npm ci
npm run build
```

Build the dashboard:

```bash
cd dashboard
npm ci
npm run build
```

GitHub Actions runs Laravel tests and builds both frontend applications for each push and pull request. The workflow can also be started manually from the repository's **Actions** tab. Laravel tests use an in-memory SQLite database and do not require live Odoo or Firebase credentials.

## Configuration and secrets

- Keep `.env`, `dashboard/.env`, Odoo passwords, Firebase service-account files, and other credentials out of source control.
- Use `.env.example` as the Laravel environment template, and configure Odoo credentials separately for each environment.
- Set `VITE_API_BASE_URL` in `dashboard/.env` to the API for the target environment.
- Set `VITE_GOOGLE_MAPS_API_KEY` when Google Maps features require it.
- Server-side Firebase notifications require valid credentials at `storage/app/firebase_credentials.json`.
- The CI workflow validates and builds the project; it does not publish or deploy it. Configure deployment separately for your hosting platform.

## Docker

The root `.dockerignore` excludes local dependencies, generated files, environment files, and private credentials from a Docker build context. It helps keep the context lean and reduces the risk of including local secrets. This repository does not currently include a `Dockerfile` or a container deployment configuration.
