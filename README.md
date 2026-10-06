# Sindbad — Field Service Management Platform

Sindbad is a comprehensive field-service management platform built with Laravel and React. It allows operations teams to manage service requests, assign technicians, track locations, and monitor work progress from a single dashboard.

## Features

- **Request management**: Create service and installation requests, track their status, update them, and manage changes from the administration dashboard.
- **Technician management**: Assign technicians to requests, review schedules, and coordinate work through a location map.
- **Field technician tracking**: Display live technician locations using Firebase and React Leaflet.
- **ERP integration**: Connect with Odoo to retrieve customers, orders, invoices, products, and tasks.
- **Ratings and documentation**: Collect customer ratings, signatures, request images, and technician images.
- **Notifications**: Send Firebase and push notifications to customers and technicians.
- **Modern administration dashboard**: Built with React and TypeScript, with Arabic and English language support.
- **Laravel API**: Manage authentication, requests, users, activities, and reports through a unified API.
- **Continuous verification**: CI validates builds and tests with every change.

## Technology Stack

- Laravel 12
- PHP 8.4
- MySQL 8.4
- React 19 and TypeScript
- Vite
- Docker and Docker Compose
- Odoo JSON-RPC
- Firebase Cloud Messaging
- Pest PHP

## Project Structure

| Path | Description |
| --- | --- |
| `app/` | Laravel application, controllers, models, services, jobs, and middleware |
| `routes/` | API and application routes |
| `database/` | Migrations, seeders, and factories |
| `config/` | Laravel, Odoo, Firebase, and queue configuration |
| `dashboard/` | React and TypeScript administration dashboard |
| `tests/` | Laravel tests using Pest |
| `Docker/` | Docker and Nginx configuration |
| `.github/workflows/` | GitHub Actions workflows |

## Requirements

- Docker Desktop 4+ or Docker Engine
- Docker Compose
- Git
- PHP 8.4 for local development without Docker
- Composer 2
- Node.js 24 and npm

## Running with Docker Compose

### 1. Create the Environment File

From the project root, copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and provide the database credentials:

```dotenv
DB_DATABASE=backend
DB_USERNAME=backend
DB_PASSWORD=change_this_password
DB_ROOT_PASSWORD=change_this_root_password
```

You can also configure the application name and URL:

```dotenv
APP_NAME=Sindbad
APP_URL=http://localhost
```

> Do not commit real credentials or API keys. Use environment-specific secrets in your deployment platform.

### 2. Build and Start the Services

For production mode, use the production Compose file:

```bash
docker compose -f compose.prod.yml up --build -d
```

For development mode, use the default Compose file:

```bash
docker compose up --build -d
```

After the build completes, check the service status:

```bash
docker compose -f compose.prod.yml ps
```

View Laravel logs:

```bash
docker compose logs -f laravel
```

View logs for all services:

```bash
docker compose logs -f
```

### 3. Complete the Initial Laravel Setup

Run the following commands after MySQL starts:

```bash
docker compose exec laravel php artisan key:generate
docker compose exec laravel php artisan migrate --force
docker compose exec laravel php artisan storage:link
```

To load the sample data:

```bash
docker compose exec laravel php artisan db:seed
```

### 4. Access the Application

- Administration dashboard: http://localhost
- phpMyAdmin: http://localhost:8080
- Laravel API: http://localhost/api
- Vite dashboard in development mode: http://localhost:5173

### 5. Stop the Services

```bash
docker compose down
```

To delete local database data:

```bash
docker compose down -v
```

> Use `-v` with caution because it permanently removes the local database data.

## Running Locally Without Docker

### Configure Laravel

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --force
php artisan storage:link
```

Start the backend:

```bash
php artisan serve
```

Run a queue worker in a separate terminal:

```bash
php artisan queue:work
```

Run Laravel, Vite, and the queue worker together:

```bash
composer run dev
```

### Configure the Dashboard

```bash
cd dashboard
npm ci
```

Create `dashboard/.env` if you need to override the default API URL:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_GOOGLE_MAPS_API_KEY=
```

Start the dashboard:

```bash
npm run dev
```

Build the production version:

```bash
npm run build
npm run lint
```

## Running Tests

### Laravel

```bash
php artisan test
```

### Dashboard

```bash
cd dashboard
npm ci
npm run lint
npm run build
```

## Odoo and Firebase Configuration

### Odoo

```dotenv
ODOO_URL=https://your-company.odoo.com
ODOO_DB=your_odoo_database
ODOO_USERNAME=your-integration-user
ODOO_PASSWORD=your-integration-password
```

A valid Odoo connection and suitable permissions are required for Odoo-backed features. Do not commit credentials to Git.

### Firebase

Add the Firebase service-account file or required configuration to the storage path used by the application, then configure the path in the application settings.

## CI

GitHub Actions runs for each push and pull request. The main workflow includes:

- Composer validation
- Laravel dependency installation
- PHP test execution
- Frontend asset builds

The dashboard workflow includes:

- npm dependency installation
- ESLint checks
- TypeScript build
- Production build

## Security Notes

- Do not commit `.env` files or API keys to Git.
- Do not store Odoo or Firebase credentials in project configuration files.
- Use accounts and keys with the minimum required permissions in production.
- Do not run `docker compose down -v` unless you are certain you want to delete all local data.
