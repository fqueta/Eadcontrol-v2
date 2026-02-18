<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

use App\Helpers\RecaptchaHelper;

class PasswordResetLinkController extends Controller
{
    /**
     * Show the password reset link request page.
     */
    public function create(Request $request,$api=false): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    // public function store(Request $request,$api=false): RedirectResponse
    public function store(Request $request,$api=false)
    {
        // CAPTCHA verification removed as per request
        // if (!RecaptchaHelper::verify($request->input('captcha_token', ''), 'forgot_password', $request->ip())) {
        //     // ...
        // }
        $request->validate([
            'email' => 'required|email',
        ]);
        try {
            $response = Password::sendResetLink(
                $request->only('email')
            );
            // Detecta chamadas da API para responder JSON
            $isApi = $api || $request->is('api/*') || $request->expectsJson();
            if($isApi) {
                return response()->json([
                    'status' => 200,
                    'message' => __('Um link de redefinição será enviado se a conta existir.'),
                    'response' => $response,
                ], 200);
            }else{
                return back()->with('status', __('Um link de redefinição será enviado se a conta existir.'));
            }
        } catch (\Exception $e) {
            $isApi = $api || $request->is('api/*') || $request->expectsJson();
            if($isApi) {
                return response()->json([
                    'status' => 500,
                    'message' => __('Erro ao enviar o link de redefinição de senha.'),
                ], 500);
            }
            return back()->withErrors(['email' => __('Erro ao enviar o link de redefinição de senha.')]);
        }
        // Password::sendResetLink(
        //     $request->only('email')
        // );
    }
}
