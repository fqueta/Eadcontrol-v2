<?php

namespace App\Traits;

use App\Helpers\RecaptchaHelper;
use App\Http\Controllers\api\PublicFormTokenController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

trait HandlesSecurityTokens
{
    /**
     * Verify security tokens (Honeypot, PublicFormToken, or reCAPTCHA).
     *
     * @param Request $request
     * @param string $formName
     * @param bool $allowRecaptcha
     * @return bool
     */
    protected function verifySecurityToken(Request $request, string $formName, bool $allowRecaptcha = true): bool
    {
        try {
            $captchaToken = $request->input('captcha_token');
            $publicFormToken = $request->input('public_form_token');

            // 1. Try PublicFormToken + Honeypot first if provided
            if ($publicFormToken) {
                $tokenController = new PublicFormTokenController();
                // Merge token and form into the request to reuse PublicFormTokenController logic
                $validationResponse = $tokenController->validate($request->merge([
                    'token' => $publicFormToken, 
                    'form' => $formName
                ]));
                
                return $validationResponse->status() === 200 && ($validationResponse->getData()->valid ?? false);
            } 
            
            // 2. Fallback to reCAPTCHA if provided and allowed
            if ($allowRecaptcha && $captchaToken) {
                return RecaptchaHelper::verify($captchaToken, $formName, $request->ip());
            }

            // 3. If neither provided, check if honeypot was at least sent empty (simple bot check)
            $honeypotField = PublicFormTokenController::HONEYPOT_FIELD;
            if ($request->has($honeypotField)) {
                return empty($request->input($honeypotField));
            }

            return false;
        } catch (\Exception $e) {
            Log::error("Security Check Error in {$formName}: " . $e->getMessage());
            return false;
        }
    }
}
