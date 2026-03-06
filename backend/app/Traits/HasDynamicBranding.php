<?php

namespace App\Traits;

use App\Services\Qlib;
use Illuminate\Support\Facades\File;

trait HasDynamicBranding
{
    public $primaryColor = '';
    public $primaryTextColor = '';
    public $institutionName = '';
    public $logoUrl = '';
    public $logoDataUri = '';

    /**
     * Initializes the dynamic branding properties correctly fetching from the database.
     * Must be called in the constructor of the class that uses this Trait.
     */
    protected function loadDynamicBranding()
    {
        $this->primaryColor = Qlib::qoption('app_primary_color') ?? '#0a0a0a';
        $this->primaryTextColor = Qlib::qoption('app_primary_text_color') ?? '#ffffff';
        $this->institutionName = Qlib::qoption('app_institution_name') ?? config('app.name');
        
        $logo = Qlib::get_logo_url();
        if (!empty($logo) && !str_starts_with($logo, 'http')) {
            $this->logoUrl = url($logo);
        } else {
            $this->logoUrl = $logo ?? '';
        }

        $this->logoDataUri = $this->getLogoDataUri();
    }

    /**
     * Obtém o logo como data URI (base64) para uso em e-mails.
     * Utilizado como fallback se a logoUrl pública não estiver acessível.
     *
     * @return string|null
     */
    protected function getLogoDataUri(): ?string
    {
        $env = (string) env('MAIL_LOGO_BASE64', '');
        if ($env !== '') {
            $mime = env('MAIL_LOGO_MIME', 'image/svg+xml');
            return 'data:' . $mime . ';base64,' . $env;
        }

        $path = public_path('logo.svg');
        if (File::exists($path)) {
            $content = File::get($path);
            $base64 = base64_encode($content);
            return 'data:image/svg+xml;base64,' . $base64;
        }

        return null;
    }

    /**
     * Gets the current base frontend URL.
     * 
     * @return string
     */
    protected function getFrontendUrl(): string
    {
        return Qlib::get_frontend_url();
    }
}
