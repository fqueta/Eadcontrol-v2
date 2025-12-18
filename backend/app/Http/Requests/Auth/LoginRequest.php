<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
            // reCAPTCHA v3 fields
            'captcha_token' => ['required', 'string'],
            'captcha_action' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function authenticate(): void
    {
        // Verify reCAPTCHA token before attempting authentication
        if (!$this->verifyCaptcha('login')) {
            throw ValidationException::withMessages([
                'captcha_token' => ['Falha na verificação de segurança (CAPTCHA).'],
            ]);
        }
        $this->ensureIsNotRateLimited();

        if (! Auth::attempt($this->only('email', 'password'), $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => __('auth.failed'),
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * verifyCaptcha
     * pt-BR: Valida o token do reCAPTCHA v3 chamando a API do Google e checa ação/score.
     * en-US: Validates reCAPTCHA v3 token by calling Google API, checking action/score.
     */
    private function verifyCaptcha(string $expectedAction = 'login'): bool
    {
        $token = (string) $this->input('captcha_token', '');
        $action = (string) $this->input('captcha_action', $expectedAction);
        $secret = config('services.recaptcha.secret');
        $verifyUrl = config('services.recaptcha.verify_url');
        $minScore = (float) config('services.recaptcha.min_score', 0.5);

        if (!$secret || !$token) {
            return false;
        }

        $resp = Http::asForm()->post($verifyUrl, [
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $this->ip(),
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
     * Ensure the login request is not rate limited.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => __('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('email')).'|'.$this->ip());
    }
}
