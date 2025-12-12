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

        $helper = new StringHelper();
        // $ret = $helper->formatarCpf('12345678900');
        // $ret = $helper->formatarCpf('12345678900');
        // $ret = Escola::campo_emissiao_certificado();
        // $ret = Escola::dadosMatricula('6875579b0c808');
        // $ret = Qlib::dataLocal();
        // $ret = Qlib::add_user_tenant('demo2','cliente1.localhost');
        // $id_turma = $request->get('id_turma');
        // $ret = [];
        // if($id_turma){
        //     // $ret = Escola::adiciona_presenca_atividades_cronograma($id_turma);
        //     // dd($ret);
        // }
        $ret = Qlib::qoption('url_api_aeroclube');
        // dd($ret);
        // $pid = $request->get('id');
        // if($pid){
        //     $ret = (new MenuController)->getMenus($pid);
        //     // dd($ret);
        //     return response()->json($ret);
        // }
        // $ret = (new MenuController)->getMenus(1);
        // $ret = Qlib::token();
        return $ret;
    }
}
