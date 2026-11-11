<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Configure tenant connection
config(['database.connections.tenant' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST', 'mysql'),
    'port' => env('DB_PORT', '3306'),
    'database' => 'eadconto_api-hairacademyrj',
    'username' => env('DB_USERNAME', 'eadcontrol'),
    'password' => env('DB_PASSWORD', 'A3d5C8e2M8'),
    'charset' => 'utf8mb4',
    'prefix' => '',
]]);

$db = \Illuminate\Support\Facades\DB::connection('tenant');

// Switch User model to use tenant connection
// We need to tell the model to use the tenant DB
// Let's override the connection for User model
$origConnection = \App\Models\User::getConnectionResolver()->connection();
config(['database.connections.tenant' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST', 'mysql'),
    'port' => env('DB_PORT', '3306'),
    'database' => 'eadconto_api-hairacademyrj',
    'username' => env('DB_USERNAME', 'eadcontrol'),
    'password' => env('DB_PASSWORD', 'A3d5C8e2M8'),
    'charset' => 'utf8mb4',
    'prefix' => '',
]]);

// Set default connection to tenant for models
\App\Models\User::setConnectionResolver(null);
\Illuminate\Support\Facades\DB::purge('mysql');
\Illuminate\Support\Facades\DB::purge('tenant');

// Create a new app instance with tenant as default
$app2 = require __DIR__ . '/bootstrap/app.php';
$app2->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Override DB config
config(['database.default' => 'mysql']);
config(['database.connections.mysql.database' => 'eadconto_api-hairacademyrj']);

echo "DB: " . config('database.connections.mysql.database') . PHP_EOL;

// Now instantiate the controller and run import
$controller = new \App\Http\Controllers\api\UserImportController();
$request = new \Illuminate\Http\Request();
$request->merge([
    'url' => 'https://api-legado-hair.eadcontrol.com.br/api/v1/matriculas/export',
    'type' => 'enrollments',
]);

// Need to auth - we can't easily do this in CLI, so let's set up the request differently
// Actually, the controller doesn't use auth() directly - let's check
// The import method doesn't use auth()->user() - it just processes data

echo "Starting import...\n";
$response = $controller->import($request);
$data = $response->getData(true);
echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
