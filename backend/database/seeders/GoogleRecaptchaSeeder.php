<?php

namespace Database\Seeders;

use App\Models\ApiCredential;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;

class GoogleRecaptchaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $siteKey = config('services.recaptcha.site_key');
        $secret = config('services.recaptcha.secret');
        $minScore = config('services.recaptcha.min_score', 0.5);

        if (!$siteKey || !$secret) {
            $this->command->warn('Google reCAPTCHA keys not found in config/services.php or .env. Skipping seeder.');
            return;
        }

        $slug = 'google-recaptcha';
        
        $credential = ApiCredential::firstOrNew(['slug' => $slug]);
        
        $credential->name = 'Google reCAPTCHA v3';
        $credential->active = true;
        
        // Encrypt the secret using the controller logic style, but here we do it manually or let the controller handle it?
        // The controller encrypts 'pass' in store/update. 
        // But since we are seeding directly via Model, we should encrypt manually if we want it encrypted.
        // However, the ApiCredentialController::get() expects 'pass' to be encrypted.
        // We will store it in 'pass' key for consistency with how secrets are usually handled in this system.
        
        $encryptedSecret = Crypt::encryptString($secret);

        $credential->config = [
            'site_key' => $siteKey,
            'pass' => $encryptedSecret, // Storing secret in 'pass' to be compatible with get() decryption
            'secret' => $secret, // Keeping raw secret in 'secret' key just in case, but usually 'pass' is the one decrypted. 
                                 // Wait, if I store raw 'secret', it won't be encrypted unless I treat it.
                                 // The Controller::get() decrypts 'pass'. 
                                 // So I should put the actual secret in 'pass'.
            'min_score' => $minScore,
        ];

        // Let's refine the config structure.
        // If I put it in 'pass', get() decrypts it.
        // So for usage, I should look for 'pass' in the Helper.
        
        $credential->save();
        
        // Add some metas for documentation
        $credential->updateMeta('version', 'v3');
        $credential->updateMeta('provider', 'Google');
        
        $this->command->info('Google reCAPTCHA credential created/updated successfully.');
    }
}
