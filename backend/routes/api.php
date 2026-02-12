<?php

declare(strict_types=1);

use App\Http\Controllers\api\AuthController;
use App\Http\Controllers\api\ClientController;
use App\Http\Controllers\api\MenuPermissionController;
use App\Http\Controllers\api\OptionController;
use App\Http\Controllers\api\PermissionController;
use App\Http\Controllers\api\PostController;
use App\Http\Controllers\api\AircraftController;
use App\Http\Controllers\api\CategoryController;
use App\Http\Controllers\api\FinancialCategoryController;
use App\Http\Controllers\api\WebhookController;
use App\Http\Controllers\api\MetricasController;
use App\Http\Controllers\api\TrackingEventController;
use App\Http\Controllers\api\DashboardMetricController;
use App\Http\Controllers\api\DashboardChartController;
use App\Http\Controllers\api\StageController;
use App\Http\Controllers\api\ProductUnitController;
use App\Http\Controllers\api\ProductController;
use App\Http\Controllers\api\ServiceController;
use App\Http\Controllers\api\ServiceUnitController;
use App\Http\Controllers\api\SituacaoMatriculaController;
use App\Http\Controllers\api\ServiceOrderController;
use App\Http\Controllers\api\RegisterController;
use App\Http\Controllers\api\ModuleController;
use App\Http\Controllers\api\ActivityController;
use App\Http\Controllers\api\CertificatesController;
use App\Http\Controllers\api\FileStorageController;
use App\Http\Controllers\api\CursoController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\EmailController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\TesteController;
use Illuminate\Support\Facades\Route;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Stancl\Tenancy\Middleware\PreventAccessFromCentralDomains;
use App\Http\Controllers\Api\PermissionMenuController;
use App\Http\Controllers\api\UserController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::name('api.')->prefix('v1')->middleware([
    'api',
    // 'auth:sanctum',
    InitializeTenancyByDomain::class,
    PreventAccessFromCentralDomains::class,
    'tenant.headers',
])->group(function () {
    /**
     * Handle CORS preflight requests for any API path.
     * EN: Catch-all OPTIONS route to return 204 for CORS preflight.
     */
    Route::options('/{any}', function () {
        return response()->noContent(204);
    })->where('any', '.*');

    Route::post('/login',[AuthController::class,'login'])->name('login');
    // Validação de token (pública): retorna "valid" ou "invalid"
    Route::get('user/validate-token/{token}', [UserController::class, 'validateToken'])
        ->name('user.validate-token');

    Route::get('register', [RegisteredUserController::class, 'create'])
        ->name('register');
    Route::post('register', [RegisterController::class, 'store']);
    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])
        ->name('password.request');

    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])
        ->name('password.email');
    // Reset de senha via API (POST)
    // EN: Password reset endpoint for API clients (expects JSON)
    Route::post('reset-password', [\App\Http\Controllers\Auth\NewPasswordController::class, 'store'])
        ->name('password.store');
    Route::fallback(function () {
        return response()->json(['message' => 'Rota não encontrada'], 404);
    });
    
    // Rota de teste para API
    Route::get('/teste', [TesteController::class,'index'])->name('teste.index');

    // Envio de e-mail de boas-vindas (público)
    // EN: Public endpoint to send welcome email via Brevo channel
    Route::post('emails/welcome', [EmailController::class, 'sendWelcome'])->name('emails.welcome');
    

    
    Route::middleware(['auth:sanctum','auth.active'])->group(function () {
        Route::post('users/import', [\App\Http\Controllers\api\UserImportController::class, 'import'])->name('users.import');
        Route::get('user',[UserController::class,'perfil'])->name('perfil.user');
        Route::get('user/can',[UserController::class,'can_access'])->name('perfil.can');
        Route::post('/logout',[AuthController::class,'logout'])->name('logout');
        Route::get('users/trash', [UserController::class, 'trash'])->name('users.trash');
        Route::put('users/{id}/restore', [UserController::class, 'restore'])->name('users.restore');
        Route::delete('users/{id}/force', [UserController::class, 'forceDelete'])->name('users.forceDelete');
        Route::apiResource('users', UserController::class,['parameters' => [
            'users' => 'id'
        ]]);
        Route::apiResource('clients', ClientController::class,['parameters' => [
            'clients' => 'id'
        ]]);
        Route::get('clients/trash', [ClientController::class, 'trash'])->name('clients.trash');
        Route::put('clients/{id}/restore', [ClientController::class, 'restore'])->name('clients.restore');
        Route::delete('clients/{id}/force', [ClientController::class, 'forceDelete'])->name('clients.forceDelete');

        

        // Rotas para posts
        Route::apiResource('posts', PostController::class,['parameters' => [
            'posts' => 'id'
        ]]);
        Route::get('posts/trash', [PostController::class, 'trash'])->name('posts.trash');
        Route::put('posts/{id}/restore', [PostController::class, 'restore'])->name('posts.restore');
        Route::delete('posts/{id}/force', [PostController::class, 'forceDelete'])->name('posts.forceDelete');

        // Rotas para modules
        Route::apiResource('modules', ModuleController::class, ['parameters' => [
            'modules' => 'id'
        ]]);
        Route::get('modules/trash', [ModuleController::class, 'trash'])->name('modules.trash');
        Route::put('modules/{id}/restore', [ModuleController::class, 'restore'])->name('modules.restore');
        Route::delete('modules/{id}/force', [ModuleController::class, 'forceDelete'])->name('modules.forceDelete');
        // Aplicar template de atividades em um módulo específico
        Route::post('modules/{id}/apply-template', [CursoController::class, 'applyModuleTemplate'])->name('modules.apply-template');

        // Rotas para activities
        Route::apiResource('activities', ActivityController::class, ['parameters' => [
            'activities' => 'id'
        ]]);
        Route::get('activities/trash', [ActivityController::class, 'trash'])->name('activities.trash');
        Route::put('activities/{id}/restore', [ActivityController::class, 'restore'])->name('activities.restore');
        Route::delete('activities/{id}/force', [ActivityController::class, 'forceDelete'])->name('activities.forceDelete');

        // Rotas para file-storage (uploads em posts com post_type=file_storage)
        Route::apiResource('file-storage', FileStorageController::class, ['parameters' => [
            'file-storage' => 'id'
        ]]);
        Route::get('file-storage/trash', [FileStorageController::class, 'trash'])->name('file-storage.trash');
        Route::put('file-storage/{id}/restore', [FileStorageController::class, 'restore'])->name('file-storage.restore');
        Route::delete('file-storage/{id}/force', [FileStorageController::class, 'forceDelete'])->name('file-storage.forceDelete');
        Route::get('file-storage/{id}/download', [FileStorageController::class, 'download'])->name('file-storage.download');

        // Rotas para aircraft
        Route::apiResource('aircraft', AircraftController::class,['parameters' => [
            'aircraft' => 'id'
        ]]);
        Route::get('aircraft/trash', [AircraftController::class, 'trash'])->name('aircraft.trash');
        Route::put('aircraft/{id}/restore', [AircraftController::class, 'restore'])->name('aircraft.restore');
        Route::delete('aircraft/{id}/force', [AircraftController::class, 'forceDelete'])->name('aircraft.forceDelete');

        // Rotas para categories
        Route::apiResource('categories', CategoryController::class,['parameters' => [
            'categories' => 'id'
        ]]);
        Route::get('categories/trash', [CategoryController::class, 'trash'])->name('categories.trash');
        Route::put('categories/{id}/restore', [CategoryController::class, 'restore'])->name('categories.restore');
        Route::delete('categories/{id}/force', [CategoryController::class, 'forceDelete'])->name('categories.forceDelete');
        Route::get('categories/tree', [CategoryController::class, 'tree'])->name('categories.tree');
        Route::get('service-categories', [CategoryController::class, 'indexServiceCategories'])->name('service-categories');
        /**Rota para o cadasto de produto */
        Route::get('product-categories', [CategoryController::class, 'index'])->name('product-categories');

        // Rotas para financial/categories
        Route::apiResource('financial/categories', FinancialCategoryController::class,[
            'parameters' => ['categories' => 'id'],
            'names' => [
                'index' => 'financial.categories.index',
                'store' => 'financial.categories.store',
                'show' => 'financial.categories.show',
                'update' => 'financial.categories.update',
                'destroy' => 'financial.categories.destroy'
            ]
        ]);
        Route::get('financial/categories/trash', [FinancialCategoryController::class, 'trash'])->name('financial.categories.trash');
        Route::put('financial/categories/{id}/restore', [FinancialCategoryController::class, 'restore'])->name('financial.categories.restore');
        Route::delete('financial/categories/{id}/force', [FinancialCategoryController::class, 'forceDelete'])->name('financial.categories.forceDelete');

        // Rotas para product-units
        Route::apiResource('product-units', ProductUnitController::class,['parameters' => [
            'product-units' => 'id'
        ]]);
        Route::get('product-units/trash', [ProductUnitController::class, 'trash'])->name('product-units.trash');
        Route::put('product-units/{id}/restore', [ProductUnitController::class, 'restore'])->name('product-units.restore');
        Route::delete('product-units/{id}/force', [ProductUnitController::class, 'forceDelete'])->name('product-units.forceDelete');

        // Rotas para products
        Route::get('products/trash', [ProductController::class, 'trash'])->name('products.trash');
        Route::put('products/{id}/restore', [ProductController::class, 'restore'])->name('products.restore');
        Route::delete('products/{id}/force', [ProductController::class, 'forceDelete'])->name('products.forceDelete');
        Route::apiResource('products', ProductController::class,['parameters' => [
            'products' => 'id'
        ]]);

        // Rotas para services
        Route::apiResource('services', ServiceController::class,['parameters' => [
            'services' => 'id'
        ]]);
        Route::get('services/trash', [ServiceController::class, 'trash'])->name('services.trash');
        Route::put('services/{id}/restore', [ServiceController::class, 'restore'])->name('services.restore');
        Route::delete('services/{id}/force', [ServiceController::class, 'forceDelete'])->name('services.forceDelete');

         // Rotas para service-units
         Route::apiResource('service-units', ServiceUnitController::class,['parameters' => [
             'service-units' => 'id'
         ]]);
         Route::get('service-units/trash', [ServiceUnitController::class, 'trash'])->name('service-units.trash');
         Route::put('service-units/{id}/restore', [ServiceUnitController::class, 'restore'])->name('service-units.restore');
         Route::delete('service-units/{id}/force', [ServiceUnitController::class, 'forceDelete'])->name('service-units.forceDelete');

         // Rotas para service-orders
         Route::apiResource('service-orders', ServiceOrderController::class,['parameters' => [
             'service-orders' => 'id'
         ]]);
         Route::get('service-orders/trash', [ServiceOrderController::class, 'trash'])->name('service-orders.trash');
         Route::put('service-orders/{id}/restore', [ServiceOrderController::class, 'restore'])->name('service-orders.restore');
         Route::put('service-orders/{id}/status ', [ServiceOrderController::class, 'updateStatus'])->name('service-orders.update-status');
         Route::delete('service-orders/{id}/force', [ServiceOrderController::class, 'forceDelete'])->name('service-orders.forceDelete');

         // Rotas para dashboard-metrics
        Route::apiResource('dashboard-metrics', MetricasController::class,['parameters' => [
            'dashboard-metrics' => 'id'
        ]]);
        Route::post('dashboard-metrics/import-aeroclube', [MetricasController::class, 'importFromAeroclube'])->name('dashboard-metrics.import-aeroclube');

        // Route::apiResource('clients', ClientController::class,['parameters' => [
        //     'clients' => 'id'
        // ]]);

        Route::get('metrics/filter', [MetricasController::class, 'filter']);
        Route::apiResource('metrics', MetricasController::class,['parameters' => [
            'metrics' => 'id'
        ]]);

        // Rotas para tracking events
        Route::get('tracking/dashboard', [TrackingEventController::class, 'dashboardStats'])->name('tracking.dashboard');
        Route::apiResource('tracking', TrackingEventController::class,['parameters' => [
            'tracking' => 'id'
        ]])->only(['index', 'store', 'destroy']);
        // Rotas para matriculas
        Route::apiResource('matriculas', \App\Http\Controllers\api\MatriculaController::class, ['parameters' => [
            'matriculas' => 'id'
        ]]);
        // Rotas para situações de matrícula (posts: situacao_matricula)
        Route::apiResource('situacoes-matricula', SituacaoMatriculaController::class, ['parameters' => [
            'situacoes-matricula' => 'id'
        ]]);
        // Certificados - template (protegido)
        // EN: Certificate template endpoints (protected)
        Route::get('certificates/template', [CertificatesController::class, 'getTemplate'])->name('certificates.template.get');
        Route::put('certificates/template', [CertificatesController::class, 'saveTemplate'])->name('certificates.template.put');
        Route::post('certificates/generate/{enrollmentId}', [CertificatesController::class, 'generatePdf'])->name('certificates.generate');
        Route::get('tracking-events', [TrackingEventController::class, 'index'])->name('tracking-events.index');
        // Rota aninhada para cadastro de etapas de um funil específico
        Route::post('funnels/{id}/stages', [StageController::class, 'storeForFunnel'])->name('funnels.stages.store');
        // Listar etapas de um funil específico, ordenadas por order
        Route::get('funnels/{id}/stages', [StageController::class, 'indexForFunnel'])->name('funnels.stages.index');
        
        /**
         * Dashboard charts (mocked data)
         * pt-BR: Endpoints para gráficos do Dashboard com dados mocados.
         * en-US: Endpoints for Dashboard charts with mocked data.
         */
        // Resumo único do dashboard (payload consolidado)
        Route::get('dashboard/summary', [DashboardChartController::class, 'summary'])
            ->name('dashboard.summary');
            
        // Rota para atualização de perfil
        Route::post('user/update-profile', [UserController::class, 'updateProfile'])->name('user.update-profile');

        Route::get('dashboard/charts/interested-monthly', [DashboardChartController::class, 'interestedMonthly'])
            ->name('dashboard.charts.interested-monthly');
        Route::get('dashboard/charts/enrolled-monthly', [DashboardChartController::class, 'enrolledMonthly'])
            ->name('dashboard.charts.enrolled-monthly');
        // rota flexível de filtros
        Route::get('menus', [MenuController::class, 'getMenus']);
        Route::apiResource('permissions', PermissionController::class,['parameters' => [
            'permissions' => 'id'
        ]]);
        Route::prefix('permissions')->group(function () {
            Route::get('{id}/menu-permissions', [MenuPermissionController::class, 'show'])->name('menu-permissions.show');
            Route::put('{id}/menu-permissions', [MenuPermissionController::class, 'updatePermissions'])->name('menu-permissions.update');
            // Route::post('{id}/menus', [PermissionMenuController::class, 'update']);
        });
    });
    // Rotas para tracking events
    Route::post('tracking/whatsapp-contact', [TrackingEventController::class, 'whatsappContact'])->name('tracking.whatsapp-contact');
    // Certificados - validação (pública)
    // EN: Certificate validation public endpoint
    Route::get('certificates/validate/{enrollmentId}', [CertificatesController::class, 'validateCertificate'])->name('certificates.validate');
    // Rotas para webhooks
    Route::any('webhook/{endp1}', [WebhookController::class, 'handleSingleEndpoint'])->name('webhook.single');
    Route::any('webhook/{endp1}/{endp2}', [WebhookController::class, 'handleDoubleEndpoint'])->name('webhook.double');
});

// Rota de teste sem middleware de tenancy
Route::post('/v1/teste-json-simple', function(\Illuminate\Http\Request $request) {
    \Log::info('Teste JSON Simple - request->all():', $request->all());
    \Log::info('Teste JSON Simple - request->json()->all():', $request->json()->all() ?? []);
    \Log::info('Teste JSON Simple - request->getContent():', [$request->getContent()]);
    \Log::info('Teste JSON Simple - Content-Type:', [$request->header('Content-Type')]);
    
    // Tratar codificação UTF-8
    $rawContent = $request->getContent();
    $cleanContent = mb_convert_encoding($rawContent, 'UTF-8', 'UTF-8');
    
    return response()->json([
        'request_all' => $request->all(),
        'request_json' => $request->json()->all() ?? [],
        'raw_content' => $cleanContent,
        'content_type' => $request->header('Content-Type'),
        'encoding_fixed' => true
    ]);
});

// Rota para criar tenant em ambiente de desenvolvimento
Route::post('/v1/dev/create-tenant', function(\Illuminate\Http\Request $request) {
    // Verifica se é ambiente local ou dev
    if (!app()->environment(['local', 'testing', 'dev'])) {
        return response()->json(['message' => 'Not allowed in this environment'], 403);
    }

    $request->validate([
        'id' => 'required|string|unique:tenants,id',
        'domain' => 'required|string|unique:domains,domain',
    ]);

    try {
        $tenant = \App\Models\Tenant::create(['id' => $request->id]);
        $tenant->domains()->create(['domain' => $request->domain]);

        return response()->json([
            'message' => 'Tenant created successfully',
            'tenant' => $tenant,
            'domain' => $request->domain
        ], 201);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Error creating tenant: ' . $e->getMessage()], 500);
    }
});
