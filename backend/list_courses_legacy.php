<?php
use App\Models\Tenant;
use App\Models\Curso;

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$tenant = Tenant::find('api-hair');
tenancy()->initialize($tenant);

$courses = Curso::all();
echo "Total Courses: " . $courses->count() . "\n";

foreach ($courses as $c) {
    $config = $c->config;
    if (is_string($config)) $config = json_decode($config, true);
    echo "ID: {$c->id}, Title: {$c->nome}, Legacy ID: " . ($config['ID_antigo'] ?? 'NONE') . "\n";
}
