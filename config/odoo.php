<?php

return [
    'url' => env('ODOO_URL', 'https://sindbad-home.odoo.com'),
    'db' => env('ODOO_DB', 'sindbad-home-production-17666865'),
    'username' => env('ODOO_USERNAME'),
    'password' => env('ODOO_PASSWORD'),
    'endpoint' => env('ODOO_ENDPOINT', 'jsonrpc'),
];
