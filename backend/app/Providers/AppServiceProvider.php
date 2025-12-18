<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use App\Helpers\StringHelper;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton('escola', function () {
            return new \App\Services\Escola();
        });
        $this->app->singleton('qlib', function () {
            return new \App\Services\Qlib();
        });
        // $this->app->singleton(StringHelper::class, function () {
        //     return new StringHelper();
        // });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Inertia::share('nav', [
            ['label' => 'Dashboard', 'href' => '/dashboard'],
            ['label' => 'Usuários', 'href' => '/users'],
            ['label' => 'Configurações', 'href' => '/settings'],
        ]);

        // Define custom rate limiters for public endpoints
        // pt-BR: Limitadores por IP para endpoints públicos de matrícula e interesse
        // en-US: IP-based rate limiters for public enrollment and interest endpoints
        RateLimiter::for('public-enroll-ip', function (Request $request) {
            return Limit::perMinute(20)->by($request->ip());
        });

        RateLimiter::for('public-interest-ip', function (Request $request) {
            return Limit::perMinute(40)->by($request->ip());
        });

        RateLimiter::for('public-form-token-ip', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });
    }
}
