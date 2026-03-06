<?php

namespace Database\Seeders;

use App\Models\ApiCredential;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class StripeCredentialSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $credential = ApiCredential::firstOrCreate(
            ['slug' => 'stripe'],
            [
                'name' => 'Stripe Checkout',
                'active' => true,
                'config' => [
                    'secret_key' => 'sk_test_exemplo_substitua', // Senha criptografada será pass, mas vamos criar assim por padrão
                ]
            ]
        );

        // Se a credencial não tem a senha definida em 'pass', definir um padrão criptografado
        $config = $credential->config;
        if (!isset($config['pass']) || empty($config['pass'])) {
            $config['pass'] = Crypt::encryptString('sk_test_substitua_este_valor_no_painel');
            $credential->config = $config;
            $credential->save();
        }

        // Adicionar o webhook_secret nas metas
        if (!$credential->getMeta('webhook_secret')) {
            $credential->updateMeta('webhook_secret', 'whsec_substitua_este_valor_no_painel');
        }
    }
}
