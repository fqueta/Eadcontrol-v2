<?php

namespace App\Jobs;

use App\Services\Escola;
use App\Services\Qlib;
use Illuminate\Support\Facades\Log;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Foundation\Bus\Dispatchable;

class PresencaEmMassaJob implements ShouldQueue
{
     use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    public array $config;
    public function __construct(array $config)
    {
        $this->config = $config;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $jobLogger = Log::channel('jobs');
        $jobLogger->info('Config: '. Qlib::lib_array_json($this->config) .'.');

        try {
            // Lógica do Job
            $id_turma = isset($this->config['id_turma']) ? $this->config['id_turma'] : false;
            $id_atividade = isset($this->config['id_atividade']) ? $this->config['id_atividade'] : false;
            $id_curso = isset($this->config['id_curso']) ? $this->config['id_curso'] : false;
            $local = isset($this->config['local']) ? $this->config['local'] : false;
            $arr_alunos = isset($this->config['arr_alunos']) ? $this->config['id_atividade'] : [];
            $pres = Escola::presenca_massa($id_turma,$id_atividade,$id_curso,$arr_alunos,$local);
            $ret['pres'] = $pres;
            $jobLogger->info('Executando PresencaEmMassa para o tenant: ' . tenant('id').'. está processando...',$ret);
        } catch (\Exception $e) {
            $jobLogger->error('Erro no PresencaEmMassa '.tenant('id').': ' . $e->getMessage());
        }
    }
}
