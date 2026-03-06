<?php

namespace Database\Seeders;

use App\Models\ApiCredential;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;

class AsaasCredentialSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $credential = ApiCredential::firstOrCreate(
            ['slug' => 'asaas'],
            [
                'name' => 'Asaas Payments',
                'active' => true,
                'config' => [
                    'environment' => 'sandbox',
                    'api_key' => 'colar_sua_api_key_sandbox_aqui', 
                ]
            ]
        );

        // Se a credencial não tem a senha/API Key definida criptografada em 'pass', definir um padrão criptografado
        $config = $credential->config;
        if (!isset($config['pass']) || empty($config['pass'])) {
            $config['pass'] = Crypt::encryptString('$aact_YTU5YTE0M2M2N2I4MTliNDQ4NTEyYjU0... (exemplo fake)');
            $credential->config = $config;
            $credential->save();
        }

        // Adicionar o webhook_secret nas metas
        if (!$credential->getMeta('webhook_secret')) {
            $credential->updateMeta('webhook_secret', 'seu_asaas_webhook_access_token_aqui');
        }
    }
}
