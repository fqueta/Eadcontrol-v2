<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Support\Facades\Http;

class RegisterController extends Controller
{
    /**
     * verifyCaptcha
     * pt-BR: Verifica token reCAPTCHA v3 para ação "register".
     * en-US: Verifies reCAPTCHA v3 token for the "register" action.
     */
    private function verifyCaptcha(Request $request, string $expectedAction = 'register'): bool
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
    public function store(Request $request)
    {
        if (!$this->verifyCaptcha($request, 'register')) {
            return response()->json([
                'message' => 'Falha na verificação de segurança (CAPTCHA).',
                'errors' => ['captcha_token' => ['Invalid or low-score CAPTCHA token']],
            ], 422);
        }
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            // 'empresa' => 'required|string|max:255',
            // 'dominio' => 'required|string|max:255',
        ]);
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            // 'empresa' => $request->empresa,
            'password' => Hash::make($request->password),
            'permission_id'=>5, // Default permission for new users
            'token'=>uniqid(), // Default permission for new users
        ]);
        event(new Registered($user));
        $ret['exec'] = false;
        if(isset($user['id'])){
            $ret['exec'] = true;
            //efetuar login na api
            // $ret['login'] =  (new AuthController)->login($request);
            $ret['user'] = $user;
            // $ret['token'] = $user->createToken('developer')->plainTextToken;
            $ret['message'] = __('Usuário cadastrado com sucesso');
            $ret['status'] = 201;
        }
        // Auth::login($user);
        return response()->json($ret);
        // return redirect()->intended(route('dashboard', absolute: false));
    }
}
