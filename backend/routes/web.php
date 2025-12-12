<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Config;

Route::get('/ini', function () {
    return Inertia::render('welcome');
})->name('ini');

// Route::middleware(['auth', 'verified'])->group(function () {
//     Route::get('dashboard', function () {
//         return Inertia::render('dashboard');
//     })->name('dashboard');


// });

// require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

// Preview do template de e-mail de redefinição de senha
Route::get('/preview/password-reset-email', function () {
    $frontendUrl = rtrim((string) config('app.frontend_url'), '/');
    $resetLink = $frontendUrl . '/reset-password/demo-token?email=demo@example.com';

    // Geração de data URI para logo
    $logoDataUri = null;
    $logoSrc = (string) env('PUBLIC_LOGO_URL', '');
    $env = (string) env('MAIL_LOGO_BASE64', '');
    if ($env !== '') {
        $mime = env('MAIL_LOGO_MIME', 'image/svg+xml');
        $logoDataUri = 'data:' . $mime . ';base64,' . $env;
    } else {
        $path = public_path('logo.svg');
        if (File::exists($path)) {
            $content = File::get($path);
            $logoDataUri = 'data:image/svg+xml;base64,' . base64_encode($content);
        }
    }

    return view('emails.password_reset', compact('resetLink', 'logoDataUri', 'logoSrc'));
});
