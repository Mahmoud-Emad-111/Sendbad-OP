<?php
require __DIR__ . '/vendor/autoload.php';
try {
    $s = new Database\Seeders\DatabaseSeeder();
    echo get_class($s) . PHP_EOL;
} catch (Throwable $e) {
    echo 'ERROR: ' . $e->getMessage() . PHP_EOL;
}
