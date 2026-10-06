# Sindbad — منصة خدمات الحقل

Sindbad هي منصة متكاملة لإدارة خدمات الحقل، مبنية على Laravel وReact، وتتيح للفرق التشغيلية متابعة الطلبات، تعيين الفنيين، تتبع الموقع، ومتابعة حالة التنفيذ من لوحة واحدة.

## المميزات

- **إدارة الطلبات**: إنشاء طلبات الخدمة والتركيب، متابعة حالتها، تغييرها، وإجراء التحديثات من لوحة الإدارة.
- **إدارة الفنيين**: تعيين الفنيين على الطلبات، عرض المواعيد، والمعرفة من خلال خريطة الموقع.
- **تتبع فنيي الحقل**: عرض مواقع الفنيين المباشرة باستخدام Firebase وReact Leaflet.
- **تكامل ERP**: ربط البيانات مع Odoo لاسترداد العملاء، الطلبات، الفواتير، المنتجات، والمهام.
- **التقييم والوثائق**: جمع تقييم العميل، التوقيع، صور الطلب، وصور الفنيين.
- **التنبيهات**: إرسال إشعارات عبر Firebase وPush notifications للعميل والفني.
- **لوحة تحكم حديثة**: واجهة React وTypeScript قابلة للتخصيص، مع دعم اللغة العربية والإنجليزية.
- **واجهة API Laravel**: إدارة المصادقة، الطلبات، المستخدمين، الأنشطة، والتقارير من خلال API موحد.
- **التحقق المستمر**: CI يحاكي البناء والاختبارات وتحقق الجودة لكل تغيير.

## التقنيات المستخدمة

- Laravel 12
- PHP 8.4
- MySQL 8.4
- React 19 وTypeScript
- Vite
- Docker وDocker Compose
- Odoo JSON-RPC
- Firebase Cloud Messaging
- Pest PHP

## هيكل المشروع

| المسار | الوصف |
| --- | --- |
| `app/` | تطبيق Laravel، Controllers، Models، Services، Jobs، Middleware |
| `routes/` | مسارات API، الواجهة، وإدارة النظام |
| `database/` | Migrations، Seeders، Factories |
| `config/` | إعدادات Laravel وOdoo وFirebase والـ Queue |
| `dashboard/` | تطبيق React وTypeScript للوحة الإدارة |
| `tests/` | اختبارات Laravel باستخدام Pest |
| `Docker/` | ملفات Docker وNginx |
| `.github/workflows/` | GitHub Actions |

## المتطلبات

- Docker Desktop 4+ أو Docker Engine
- Docker Compose
- Git
- PHP 8.4 محليًا عند تشغيل المشروع بدون Docker
- Composer 2
- Node.js 24 وnpm

## التشغيل باستخدام Docker Compose

### 1. إنشاء ملف البيئة

من مجلد المشروع، انسخ ملف البيئة مثالًا:

```bash
cp .env.example .env
```

حرر ملف `.env` وأدخل بيانات قاعدة البيانات المناسبة:

```dotenv
DB_DATABASE=backend
DB_USERNAME=backend
DB_PASSWORD=change_this_password
DB_ROOT_PASSWORD=change_this_root_password
```

يمكنك أيضًا تغيير اسم التطبيق وعنوان URL:

```dotenv
APP_NAME=Sindbad
APP_URL=http://localhost
```

> لا تضع بيانات حقيقية أو مفاتيح حساسة في Git. استخدم متغيرات بيئة التشغيل الخاصة بالخادم في البيئات الإنتاجية.

### 2. بناء وتشغيل الخدمات

للتشغيل في وضع الإنتاج، استخدم ملف Compose الإنتاجي:

```bash
docker compose -f compose.prod.yml up --build -d
```

للتشغيل في وضع التطوير، استخدم:

```bash
docker compose up --build -d
```

بعد اكتمال البناء، تحقق من حالة الخدمات:

```bash
docker compose -f compose.prod.yml ps
```

عرض سجلات Laravel:

```bash
docker compose logs -f laravel
```

عرض سجلات كل الخدمات:

```bash
docker compose logs -f
```

### 3. إعداد Laravel الأولي

شغل الأوامر التالية بعد أن يبدأ MySQL:

```bash
docker compose exec laravel php artisan key:generate
docker compose exec laravel php artisan migrate --force
docker compose exec laravel php artisan storage:link
```

إذا أردت تعبئة البيانات التجريبية:

```bash
docker compose exec laravel php artisan db:seed
```

### 4. الوصول إلى التطبيق

- لوحة الإدارة: http://localhost
- لوحة phpMyAdmin: http://localhost:8080
- واجهة Laravel API: http://localhost/api
- Vite Dashboard في وضع التطوير: http://localhost:5173

### 5. إيقاف الخدمات

```bash
docker compose down
```

لحذف بيانات قاعدة البيانات المحلية:

```bash
docker compose down -v
```

> استخدم خيار `-v` بحذر، لأنه يحذف قاعدة البيانات بالكامل.

## التشغيل المحلي بدون Docker

### إعداد Laravel

```bash
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate --force
php artisan storage:link
```

قم بتشغيل الواجهة الخلفية:

```bash
php artisan serve
```

تشغيل Queue Worker في Terminal منفصل:

```bash
php artisan queue:work
```

تشغيل Laravel وVite وQueue Worker معًا:

```bash
composer run dev
```

### إعداد Dashboard

```bash
cd dashboard
npm ci
```

أنشئ ملف `dashboard/.env` إذا أردت تجاوز عنوان API الافتراضي:

```dotenv
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_GOOGLE_MAPS_API_KEY=
```

شغّل لوحة التطوير:

```bash
npm run dev
```

لبناء نسخة الإنتاج:

```bash
npm run build
npm run lint
```

## اختبارات المشروع

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

## إعدادات Odoo وFirebase

### Odoo

```dotenv
ODOO_URL=https://your-company.odoo.com
ODOO_DB=your_odoo_database
ODOO_USERNAME=your-integration-user
ODOO_PASSWORD=your-integration-password
```

مطلوب اتصال فعلي وتفويضات مناسبة لاستخدام ميزات Odoo. لا تضع بيانات الاعتماد داخل Git.

### Firebase

أضف ملف Firebase service-account أو البيانات اللازمة إلى مسار التخزين الذي تستخدمه الخدمة، ثم جهّز مسار الملف داخل إعدادات التطبيق.

## CI

يتم تشغيل GitHub Actions لكل push وpull request. يتضمن workflow الأساسي:

- التحقق من Composer
- تثبيت اعتماديات Laravel
- تشغيل اختبارات PHP
- بناء ملفات frontend

ويتضمن أيضًا workflow الخاص بـ dashboard:

- تثبيت npm
- فحص ESLint
- TypeScript build
- Production build

## الملاحظات الأمنية

- لا تضع ملفات `.env` أو مفاتيح API داخل Git.
- لا تضع بيانات تسجيل الدخول إلى Odoo أو Firebase في إعدادات المشروع.
- استخدم حسابات ومفاتيح ذات صلاحيات محدودة في الإنتاج.
- لا تشغّل `docker compose down -v` إلا إذا كنت متأكدًا أنك تريد حذف البيانات المحلية.
