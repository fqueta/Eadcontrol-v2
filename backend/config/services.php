<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Public Form Token defaults
    'public_form' => [
        // Default identifier when `form` is not provided in the request
        'default' => env('PUBLIC_FORM_DEFAULT', 'generic'),
    ],

    // Brevo (Sendinblue) Email API
    'brevo' => [
        'api_key' => env('BREVO_API_KEY'),
        'api_url' => env('BREVO_API_URL', 'https://api.brevo.com/v3'),
        'from_email' => env('MAIL_FROM_ADDRESS'),
        'from_name' => env('MAIL_FROM_NAME'),
    ],

    // Google reCAPTCHA v3 settings
    // pt-BR: Configurações do reCAPTCHA (site_key para frontend, secret para backend)
    // en-US: reCAPTCHA settings (site_key for frontend, secret for backend)
    'recaptcha' => [
        'site_key' => env('RECAPTCHA_SITE_KEY', ''),
        'secret' => env('RECAPTCHA_SECRET', ''),
        'verify_url' => env('RECAPTCHA_VERIFY_URL', 'https://www.google.com/recaptcha/api/siteverify'),
        // Minimum acceptable score for v3; lower allows more passes but more spam
        'min_score' => (float) env('RECAPTCHA_MIN_SCORE', 0.5),
    ],

    // Cloudflare Turnstile settings
    'turnstile' => [
        'secret' => env('TURNSTILE_SECRET', ''),
        'verify_url' => env('TURNSTILE_VERIFY_URL', 'https://challenges.cloudflare.com/turnstile/v0/siteverify'),
    ],



    // EvolutionAPI
    'evolution' => [
        'base_url' => env('EVOLUTION_API_URL'),
        'api_key' => env('EVOLUTION_API_KEY'),
        'instance' => env('EVOLUTION_INSTANCE', 'Evolution'),
    ],

];
