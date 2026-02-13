<?php

namespace App\Http\Controllers;

use App\Services\Escola;
use App\Services\Qlib;
use Illuminate\Http\Request;
use App\Helpers\StringHelper;
use Database\Seeders\MenuSeeder;

class TesteController extends Controller
{
    public function index(Request $request){
        $d = $request->all();
        $ret = "";
        //someten em produção ou local que deve funcionar
        if(app()->environment('production')){
            return "Não pode ser executado em produção";
        }

        // $ret = $this->teste_email();

        return $ret;
    }
    public function teste_email(){
        $tenant = \App\Models\Tenant::first(); 
        tenancy()->initialize($tenant);

        // 2. Buscar ou Criar o Cliente
        $email = 'quetafernando1@gmail.com';
        $client = \App\Models\Client::where('email', $email)->first();

        if (!$client) {
            $client = new \App\Models\Client();
            $client->name = 'Fernando Queta';
            $client->email = $email;
            $client->password = \Hash::make('12345678');
            $client->save();
        }

        // 3. Buscar um Curso e criar Matrícula Fictícia
        $course = \App\Models\Curso::first();
        if (!$course) {
            $course = \App\Models\Curso::create(['nome' => 'Curso Teste', 'slug' => 'curso-teste', 'valor' => 100]);
        }

        // Criar matrícula se não existir (para ter o ID)
        $matricula = \App\Models\Matricula::firstOrCreate(
            ['id_cliente' => $client->id, 'id_curso' => $course->id],
            ['status' => 'a', 'id_turma' => 0]
        );

        // 4. Enviar a Notificação Realmente
        $client->notify(new \App\Notifications\WelcomeNotification(
            $course->id, 
            $course->slug, 
            $course->nome,
            $matricula->id
        ));

        return "Notificação enviada para {$client->email}!";
    }
}
