<?php

namespace App\Helpers;

use App\Http\Controllers\api\ApiCredentialController;
use Illuminate\Support\Facades\Http;

class RecaptchaHelper
{
    /**
     * Verify reCAPTCHA token.
     *
     * @param string $token
     * @param string $action
     * @param string|null $ip
     * @return bool
     */
    public static function verify(string $token, string $action, ?string $ip = null): bool
    {
        // 1. Try to get credentials from Database (ApiCredential)
        $credential = ApiCredentialController::get('google-recaptcha');
        
        $secret = null;
        $minScore = 0.5;
        
        if ($credential) {
            if (!$credential->active) {
                // Return true to bypass verification if explicitly disabled in DB
                return true; 
            }
            $config = $credential->config;
            $secret = $config['secret'] ?? $config['pass'] ?? null;
            if (isset($config['min_score'])) {
                $minScore = (float) $config['min_score'];
            }
        }
        
        // 2. Fallback to config/services.php ONLY if not found in DB
        // If it was found in DB, we already handled it (active or inactive).
        if (!$credential && !$secret) {
            $secret = config('services.recaptcha.secret');
            $minScore = (float) config('services.recaptcha.min_score', 0.5);
        }

        if (!$secret || !$token) {
            return false;
        }

        $verifyUrl = config('services.recaptcha.verify_url', 'https://www.google.com/recaptcha/api/siteverify');

        $response = Http::asForm()->post($verifyUrl, [
            'secret' => $secret,
            'response' => $token,
            'remoteip' => $ip,
        ]);

        if (!$response->ok()) {
            return false;
        }

        $data = $response->json();
        $success = (bool) ($data['success'] ?? false);
        $score = (float) ($data['score'] ?? 0.0);
        $actionResp = (string) ($data['action'] ?? '');

        if (!$success) {
            return false;
        }

        if ($actionResp && $actionResp !== $action) {
            return false;
        }

        return $score >= $minScore;
    }
}
