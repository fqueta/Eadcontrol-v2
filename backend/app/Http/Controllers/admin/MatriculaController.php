<?php

namespace App\Http\Controllers\admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class MatriculaController extends Controller
{
    public $table;
    public $campo_contrato_financeiro;
    public function __construct()
    {
        $this->table = 'matriculas';
        global $tab10,$tab11,$tab12,$tab15,$tab54;
        $tab10 = 'cursos';
        $tab11 = 'turmas';
        $tab12 = 'matriculas';
        $tab15 = 'clientes';
        $tab54 = 'aeronaves';
        $this->campo_contrato_financeiro = 'contrato_financiamento_horas';
    }
}
