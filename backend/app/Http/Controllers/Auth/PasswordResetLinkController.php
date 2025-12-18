<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;
use Inertia\Response;

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
     * verifyCaptcha
     * pt-BR: Verifica o token reCAPTCHA v3 para a ação "forgot_password".
     * en-US: Verifies reCAPTCHA v3 token for the "forgot_password" action.
     */
    private function verifyCaptcha(Request $request, string $expectedAction = 'forgot_password'): bool
    {
        $token = (string) $request->input('captcha_token', '');
        $action = (string) $request->input('captcha_action', $expectedAction);
        $secret = config('services.recaptcha.secret');
        $verifyUrl = config('services.recaptcha.verify_url');
        $minScore = (float) config('services.recaptcha.min_score', 0.5);

        if (!$secret || !$token) {
            return false;
        }

        $resp = Http::asForm()->post($verifyUrl, [
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $request->ip(),
        ]);
        if (!$resp->ok()) {
            return false;
        }
        $data = $resp->json();
        $success = (bool) ($data['success'] ?? false);
        $score = (float) ($data['score'] ?? 0.0);
        $actionResp = (string) ($data['action'] ?? '');
        if (!$success) return false;
        if ($actionResp && $actionResp !== $expectedAction) return false;
        return $score >= $minScore;
    }

    /**
     * Handle an incoming password reset link request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    // public function store(Request $request,$api=false): RedirectResponse
    public function store(Request $request,$api=false)
    {
        // CAPTCHA verification must pass before proceeding
        if (!$this->verifyCaptcha($request, 'forgot_password')) {
            $isApi = $api || $request->is('api/*') || $request->expectsJson();
            if($isApi) {
                return response()->json([
                    'status' => 422,
                    'message' => 'Falha na verificação de segurança (CAPTCHA).',
                    'errors' => ['captcha_token' => ['Invalid or low-score CAPTCHA token']],
                ], 422);
            }
            return back()->withErrors(['captcha' => __('Falha na verificação de segurança (CAPTCHA).')]);
        }
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
