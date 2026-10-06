<?php

return [
    'url' => env('ODOO_URL'),
    'db' => env('ODOO_DB'),
    'username' => env('ODOO_USERNAME'),
    'password' => env('ODOO_PASSWORD'),
    'endpoint' => env('ODOO_ENDPOINT', 'jsonrpc'),
];
