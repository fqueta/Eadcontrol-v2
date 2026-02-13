<?php

namespace App\Http\Controllers;

use App\Services\Escola;
use App\Services\Qlib;
use Illuminate\Http\Request;
use App\Helpers\StringHelper;
use Database\Seeders\MenuSeeder;
use Illuminate\Support\Facades\DB;

class TesteController extends Controller
{
    public function index(Request $request){
        $d = $request->all();
        $type = $d['type'] ?? null;
        $ret = "";
        //someten em produção ou local que deve funcionar
        if(app()->environment('production')){
            return "Não pode ser executado em produção";
        }

        // $ret = $this->teste_email();
        if($type == 'email'){
            $ret = $this->teste_email();
        }elseif($type == 'whatsapp'){
            $ret = $this->notificationWhtasappEvolution($request);
        }
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
    public function notificationWhtasappEvolution($request){
        // Avaliar envio de notificação via EvolutionAPI para o administrador
        $cliente_id = $request->input('cliente_id', 1);
        $client = \App\Models\Client::find($cliente_id);
        $courseId = $request->input('course_id', 1);
        
        try {
            $courseName = 'N/A';
            if ($courseId > 0) {
                $cObj = DB::table('cursos')->where('id', $courseId)->first();
                if ($cObj) $courseName = $cObj->titulo ?? $cObj->nome ?? 'Curso #' . $courseId;
            }

            $msgObj = "📢 *Novo Interessado*\n\n";
            $msgObj .= "👤 *Nome:* {$client->name}\n";
            $msgObj .= "📧 *Email:* {$client->email}\n";
            $msgObj .= "📱 *Telefone:* " . ($client->getAttribute('celular') ?: 'N/D') . "\n";
            $msgObj .= "🎓 *Curso:* {$courseName}\n";
            $msgObj .= "📅 *Data:* " . date('d/m/Y H:i');
            \App\Services\EvolutionApiService::sendAdminNotification($msgObj, $courseId);
            
        } catch (\Throwable $evt) {
            // Falha silenciosa na notificação admin para não travar o retorno ao user
            \Illuminate\Support\Facades\Log::error('EvolutionAPI Notification Error: ' . $evt->getMessage());
        }
    }
}
