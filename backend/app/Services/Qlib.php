<?php
/**
 * Ultima atualização 08/04/2025
 */
// namespace App\Qlib;
namespace App\Services;
use App\Http\Controllers\admin\EventController;
use App\Http\Controllers\api\ProductController;
use App\Http\Controllers\Api\ProductUnitController;
// use App\Http\Controllers\admin\PostController;
// use App\Http\Controllers\LeilaoController;
use App\Http\Controllers\MatriculasController;
use App\Http\Controllers\SiteController;
use App\Http\Controllers\UserController;
use App\Models\Option;
// use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Auth;
// use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use App\Models\Permission;
use App\Models\Post;
use App\Models\Tenant;
use DateTime;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Models\Category;
use App\Models\Client;
use App\Models\ProductUnit;
class Qlib
{
    static $RAIZ;
    public function __construct(){
        global $tab11,$tab12,$tab50,$tab55;
        $tab11 = 'turmas';
        $tab12 = 'matriculas';
        $tab50 = 'tabela_nomes';
        $tab55 = 'parcelamento';
        self::$RAIZ = self::qoption('dominio').'/admin';
    }
    static function dominio_site(){
        return self::qoption('dominio');
    }
    static function raiz(){
        return self::qoption('dominio').'/admin';
    }
    static public function lib_print($data){
      if(is_array($data) || is_object($data)){
        echo '<pre>';
        print_r($data);
        echo '</pre>';
      }else{
        echo $data;
      }
    }
    /**
     * Verifica se o usuario logado tem permissao de admin ou alguma expessífica
    */
    static function dataLocal(){
        $dataLocal = date('d/m/Y H:i:s', time());
        return $dataLocal;
    }
    /**
     * Metodo para validar um CPF retorna true|false
     * @param string $cpf
     * @return boolean true | false
     */
    static function validaCpf($cpf){
        if(empty($cpf))
           return true;
        $cpf = preg_replace( '/[^0-9]/is', '', $cpf );
        if (strlen($cpf) != 11) {
            return false;
        }
        if (preg_match('/(\d)\1{10}/', $cpf)) {
            return false;
        }
        for ($t = 9; $t < 11; $t++) {
            for ($d = 0, $c = 0; $c < $t; $c++) {
                $d += $cpf[$c] * (($t + 1) - $c);
            }
            $d = ((10 * $d) % 11) % 10;
            if ($cpf[$c] != $d) {
                return false;
            }
        }
        return true;
    }
    static function dataLocalDb(){
        $dtBanco = date('Y-m-d H:i:s', time());
        return $dtBanco;
    }
    static function dataBanco(){
        global $dtBanco;
        $dtBanco = date('Y-m-d H:i:s', time());
        return $dtBanco;
    }
    static function isAdmin($perm_admin = 2)
    {
        $user = Auth::user();

        if(isset($user->id_permission) && $user->id_permission<=$perm_admin){
            return true;
        }else{
            return false;
        }
    }
    /**
     * Calcula a idade de alguem se for infromado uma data
     */
    static function lib_calcIdade($data){
        // Declara a data! :P
        //  $data = '29/08/2008';
        // Separa em dia, mês e ano
        $idade = false;
        if(!empty($data)){
                    $pos = strpos($data,'/');
                    if($pos)
                        list($dia, $mes, $ano) = explode('/', $data);
                    $pos = strpos($data,'-');
                    if($pos)
                        list($ano, $mes,$dia) = explode('-', $data);

                    if($ano != '0000'){
                        // Descobre que dia é hoje e retorna a unix timestamp
                        $hoje = mktime(0, 0, 0, date('m'), date('d'), date('Y'));
                        // Descobre a unix timestamp da data de nascimento do fulano
                        $nascimento = mktime( 0, 0, 0, $mes, $dia, $ano);
                            // Depois apenas fazemos o cálculo já citado :)
                        $idade = floor((((($hoje - $nascimento) / 60) / 60) / 24) / 365.25);
                    }
        }
        return $idade;
    }
    static public function qoption($valor = false, $type = false){
        //type é o tipo de respsta
		$ret = false;
		if($valor){
			$result = Option::where('url','=',$valor)->
               where('excluido','=','n')
               ->where('deletado','=','n')
               ->where('ativo','=','s')
               ->select('value')
               ->first();
            //    ->toArray();
            //    dd($valor,$result['value']);
               if(isset($result['value'])) {
                   // output data of each row
                   $ret = $result['value'];
					// if($valor=='urlroot'){
					// 	$ret = str_replace('/home/ctloja/public_html/lojas/','/home/ctdelive/lojas/',$ret);
					// }
                    if($type=='array'){
                        $ret = self::lib_json_array($ret);
                    }
                    if($type=='json'){
                        $ret = self::lib_array_json($ret);
                    }
			    }
			//}
		}
		return $ret;
	}
  static function dtBanco($data) {
			$data = trim($data);
			if (strlen($data) != 10)
			{
				$rs = false;
			}
			else
			{
				$arr_data = explode("/",$data);
				$data_banco = $arr_data[2]."-".$arr_data[1]."-".$arr_data[0];
				$rs = $data_banco;
			}
			return $rs;
	}
  static function dataExibe($data=false) {
        $rs=false;
        if($data){
           $val = trim(strlen($data));
			$data = trim($data);$rs = false;
            $agulha   = '/';
            $pos = strpos( $data, $agulha );
            if ($pos != false) {
                return $data;
            }
			if($val == 10){
					$arr_data = explode("-",$data);
					$data_banco = @$arr_data[2]."/".@$arr_data[1]."/".@$arr_data[0];
					$rs = $data_banco;
			}
			if($val == 19){
					$arr_inic = explode(" ",$data);
					$arr_data = explode("-",$arr_inic[0]);
					$data_banco = $arr_data[2]."/".$arr_data[1]."/".$arr_data[0];
					$rs = $data_banco."-".$arr_inic[1] ;
			}
        }

			return $rs;
	}
  static function lib_json_array($json=''){
		$ret = false;
		if(is_array($json)){
			$ret = $json;
		}elseif(!empty($json) && self::isJson($json)&&!is_array($json)){
			$ret = json_decode($json,true);
		}
		return $ret;
	}
	public static function lib_array_json($json=''){
		$ret = false;
		if(is_array($json)){
			$ret = json_encode($json,JSON_UNESCAPED_UNICODE);
		}
		return $ret;
	}
    static function precoBanco($preco){
            $sp = substr($preco,-3,-2);
            if($sp=='.'){
                $preco_venda1 = $preco;
            }else{
                $preco_venda1 = str_replace(".", "", $preco);
                $preco_venda1 = str_replace(",", ".", $preco_venda1);
                $preco_venda1 = str_replace("R$", "", $preco_venda1);
            }
            return (float)trim($preco_venda1);
    }
    static function isJson($string) {
		$ret=false;
		if (is_object(json_decode($string)) || is_array(json_decode($string)))
		{
			$ret=true;
		}
		return $ret;
	}
  static function Meses($val=false){
  		$mese = array('01'=>'JANEIRO','02'=>'FEVEREIRO','03'=>'MARÇO','04'=>'ABRIL','05'=>'MAIO','06'=>'JUNHO','07'=>'JULHO','08'=>'AGOSTO','09'=>'SETEMBRO','10'=>'OUTUBRO','11'=>'NOVEMBRO','12'=>'DEZEMBRO');
  		if($val){
  			return $mese[$val];
  		}else{
  			return $mese;
  		}
	}
  static function totalReg($tabela, $condicao = false,$debug=false){
			//necessario
			$sql = "SELECT COUNT(*) AS totalreg FROM {$tabela} $condicao";
			if($debug)
				 echo $sql.'<br>';
			//return $sql;
			$td_registros = DB::select($sql);
			if(isset($td_registros[0]->totalreg) && $td_registros[0]->totalreg > 0){
				return $td_registros[0]->totalreg;
			}else
				return 0;
	}
  static function zerofill( $number ,$nroDigo=6, $zeros = null ){
		$string = sprintf( '%%0%ds' , is_null( $zeros ) ?  $nroDigo : $zeros );
		return sprintf( $string , $number );
	}
  static function encodeArray($arr){
			$ret = false;
			if(is_array($arr)){
				$ret = base64_encode(json_encode($arr));
			}
			return $ret;
	}
  static function decodeArray($arr){
			$ret = false;
			if($arr){
				//$ret = base64_encode(json_encode($arr));
				$ret = base64_decode($arr);
				$ret = json_decode($ret,true);

			}
			return $ret;
	}
    static function qForm($config=false){
        if(isset($config['type'])){
            $config['campo'] = isset($config['campo'])?$config['campo']:'teste';
            $config['label'] = isset($config['label'])?$config['label']:false;
            $config['placeholder'] = isset($config['placeholder'])?$config['placeholder']:false;
            $config['selected'] = isset($config['selected']) ? $config['selected']:false;
            $config['tam'] = isset($config['tam']) ? $config['tam']:'12';
            $config['col'] = isset($config['col']) ? $config['col']:'md';
            $config['event'] = isset($config['event']) ? $config['event']:false;
            $config['ac'] = isset($config['ac']) ? $config['ac']:'cad';
            $config['option_select'] = isset($config['option_select']) ? $config['option_select']:true;
            $config['label_option_select'] = isset($config['label_option_select']) ? $config['label_option_select']:'Selecione';
            $config['option_gerente'] = isset($config['option_gerente']) ? $config['option_gerente']:false;
            $config['class'] = isset($config['class']) ? $config['class'] : false;
            $config['style'] = isset($config['style']) ? $config['style'] : false;
            $config['class_div'] = isset($config['class_div']) ? $config['class_div'] : false;
            if(@$config['type']=='chave_checkbox' && @$config['ac']=='cad'){
                if(@$config['checked'] == null && isset($config['valor_padrao']))
                $config['checked'] = $config['valor_padrao'];
            }
            //if($config['type']=='select_multiple'){
                //dd($config);
            //}
            if(@$config['type']=='html_vinculo' && @$config['ac']=='alt'){
                $tab = $config['data_selector']['tab'];
                $config['data_selector']['placeholder'] = isset($config['data_selector']['placeholder'])?$config['data_selector']['placeholder']:'Digite para iniciar a consulta...';
                $dsel = $config['data_selector'];
                $id = $config['value'];
                if(@$dsel['tipo']=='array'){
                    if(is_array($id)){
                        foreach ($id as $ki => $vi) {
                            $config['data_selector']['list'][$ki] = self::dados_tab($tab,['id'=>$vi]);
                            if($config['data_selector']['list'][$ki] && isset($config['data_selector']['table']) && is_array($config['data_selector']['table'])){
                                foreach ($config['data_selector']['table'] as $key => $v) {
                                    if(isset($v['type']) && $v['type']=='arr_tab' && isset($config['data_selector']['list'][$ki][$key]) && isset($v['conf_sql'])){
                                        $config['data_selector']['list'][$ki][$key.'_valor'] = self::buscaValorDb0([
                                            'tab'=>$v['conf_sql']['tab'],
                                            'campo_bus'=>$v['conf_sql']['campo_bus'],
                                            'select'=>$v['conf_sql']['select'],
                                            'valor'=>$config['data_selector']['list'][$ki][$key],
                                        ]);
                                    }
                                }
                            }
                        }
                        //dd($config['data_selector']);
                    }
                }else{
                    $config['data_selector']['list'] = self::dados_tab($tab,['id'=>$id]);
                    if($config['data_selector']['list'] && isset($config['data_selector']['table']) && is_array($config['data_selector']['table'])){
                        foreach ($config['data_selector']['table'] as $key => $v) {
                            if(isset($v['type']) && $v['type']=='arr_tab' && isset($config['data_selector']['list'][$key]) && isset($v['conf_sql'])){
                                $config['data_selector']['list'][$key.'_valor'] = self::buscaValorDb0([
                                    'tab'=>$v['conf_sql']['tab'],
                                    'campo_bus'=>$v['conf_sql']['campo_bus'],
                                    'select'=>$v['conf_sql']['select'],
                                    'valor'=>$config['data_selector']['list'][$key],
                                ]);
                            }
                        }
                        //dd($config);
                    }
                }
            }
            return view('qlib.campos_form',['config'=>$config]);
        }else{
            return false;
        }
    }
    static function qShow($config=false){
        if(isset($config['type'])){
            $config['campo'] = isset($config['campo'])?$config['campo']:'teste';
            $config['label'] = isset($config['label'])?$config['label']:false;
            $config['placeholder'] = isset($config['placeholder'])?$config['placeholder']:false;
            $config['selected'] = isset($config['selected']) ? $config['selected']:false;
            $config['tam'] = isset($config['tam']) ? $config['tam']:'12';
            $config['col'] = isset($config['col']) ? $config['col']:'md';
            $config['event'] = isset($config['event']) ? $config['event']:false;
            $config['ac'] = isset($config['ac']) ? $config['ac']:'cad';
            $config['option_select'] = isset($config['option_select']) ? $config['option_select']:true;
            $config['label_option_select'] = isset($config['label_option_select']) ? $config['label_option_select']:'Selecione';
            $config['option_gerente'] = isset($config['option_gerente']) ? $config['option_gerente']:false;
            $config['class'] = isset($config['class']) ? $config['class'] : false;
            $config['style'] = isset($config['style']) ? $config['style'] : false;
            $config['class_div'] = isset($config['class_div']) ? $config['class_div'] : false;
            if(@$config['type']=='chave_checkbox' && @$config['ac']=='cad'){
                if(@$config['checked'] == null && isset($config['valor_padrao']))
                $config['checked'] = $config['valor_padrao'];
            }
            if(@$config['type']=='html_vinculo' && @$config['ac']=='alt'){
                $tab = $config['data_selector']['tab'];
                $config['data_selector']['placeholder'] = isset($config['data_selector']['placeholder'])?$config['data_selector']['placeholder']:'Digite para iniciar a consulta...';
                $dsel = $config['data_selector'];
                $id = $config['value'];
                if(@$dsel['tipo']=='array'){
                    if(is_array($id)){
                        foreach ($id as $ki => $vi) {
                            $config['data_selector']['list'][$ki] = self::dados_tab($tab,['id'=>$vi]);
                            if($config['data_selector']['list'][$ki] && isset($config['data_selector']['table']) && is_array($config['data_selector']['table'])){
                                foreach ($config['data_selector']['table'] as $key => $v) {
                                    if(isset($v['type']) && $v['type']=='arr_tab' && isset($config['data_selector']['list'][$ki][$key]) && isset($v['conf_sql'])){
                                        $value = $config['data_selector']['list'][$ki][$key];
                                        $config['data_selector']['list'][$ki][$key.'_valor'] = self::buscaValorDb0([
                                            'tab'=>$v['conf_sql']['tab'],
                                            'campo_bus'=>$v['conf_sql']['campo_bus'],
                                            'select'=>$v['conf_sql']['select'],
                                            'valor'=>$value,
                                        ]);
                                    }
                                }
                            }
                        }
                    }
                }else{
                    $config['data_selector']['list'] = self::dados_tab($tab,['id'=>$id]);
                    if($config['data_selector']['list'] && isset($config['data_selector']['table']) && is_array($config['data_selector']['table'])){
                        foreach ($config['data_selector']['table'] as $key => $v) {
                            if(isset($v['type']) && $v['type']=='arr_tab' && isset($config['data_selector']['list'][$key]) && isset($v['conf_sql'])){
                                $config['data_selector']['list'][$key.'_valor'] = self::buscaValorDb0([
                                    'tab'=>$v['conf_sql']['tab'],
                                    'campo_bus'=>$v['conf_sql']['campo_bus'],
                                    'select'=>$v['conf_sql']['select'],
                                    'valor'=>$config['data_selector']['list'][$key],
                                ]);
                            }
                        }
                        //dd($config);
                    }
                }
            }
            return view('qlib.campos_show',['config'=>$config]);
        }else{
            return false;
        }
    }
    static function sql_array($sql, $ind, $ind_2, $ind_3 = '', $leg = '',$type=false,$debug=false){
        if($debug){
            dump($sql);
        }
        $table = DB::select($sql);
        $userinfo = array();
        if($table){
            //dd($table);
            for($i = 0;$i < count($table);$i++){
                $table[$i] = (array)$table[$i];
                if($ind_3 == ''){
                    $userinfo[$table[$i][$ind_2]] =  $table[$i][$ind];
                }elseif(is_array($ind_3) && isset($ind_3['tab'])){
                    /*É sinal que o valor vira de banco de dados*/
                    $sql = "SELECT ".$ind_3['campo_enc']." FROM `".$ind_3['tab']."` WHERE ".$ind_3['campo_bus']." = '".$table[$i][$ind_2]."'";
                    $userinfo[$table[$i][$ind_2]] = $sql;
                }else{
                    if($type){
                        if($type == 'data'){
                            /*Tipo de campo exibe*/
                            $userinfo[$table[$i][$ind_2]] = $table[$i][$ind] . '' . $leg . '' . self::dataExibe($table[$i][$ind_3]);
                        }
                    }else{
                        $userinfo[$table[$i][$ind_2]] = $table[$i][$ind] . '' . $leg . '' . $table[$i][$ind_3];
                    }
                }
            }
        }

        return $userinfo;
    }
    static function sql_distinct($tab='familias',$campo='YEAR(`data_exec`)',$order='ORDER BY data_exec ASC'){
        $ret = DB::select("SELECT DISTINCT $campo As vl  FROM $tab $order");
        return $ret;
    }
    static function formatMensagem0($mess='',$cssMes='',$event=false,$time=4000){
        if(self::is_frontend()){
            $mensagem = "<div class=\"alert alert-$cssMes alert-dismissable fade show\" role=\"alert\">
                <button class=\"btn-close\" style=\"float:right\" type=\"button\" data-bs-dismiss=\"alert\" $event aria-hidden=\"true\"></button>
                <i class=\"fa fa-info-circle\"></i>&nbsp;".__($mess)."
            </div>";
		}else{
            $mensagem = "<div class=\"alert alert-$cssMes alert-dismissable\" role=\"alert\">
            <button style=\"float:right\" class=\"close\" type=\"button\" data-dismiss=\"alert\" $event aria-hidden=\"true\">×</button>
            <i class=\"fa fa-info-circle\"></i>&nbsp;".__($mess)."
            </div>";
        }
        $mensagem .= "<script>
                        setTimeout(function(){
                            $('.alert').hide('slow');
                        }, \"".$time."\");
                    </script>";
        return $mensagem;
	}
    static function formatMensagem($config=false){
        if($config){
            $config['mens'] = isset($config['mens']) ? $config['mens'] : false;
            $config['color'] = isset($config['color']) ? $config['color'] : false;
            $config['time'] = isset($config['time']) ? $config['time'] : 4000;
            return view('qlib.format_mensagem', ['config'=>$config]);
        }else{
            return false;
        }
	}
    static function formatMensagemInfo($mess='',$cssMes='',$event=false){
		if(self::is_frontend()){
            $mensagem = "<div class=\"alert alert-$cssMes alert-dismissable fade show\" role=\"alert\">
                <button class=\"btn-close\" style=\"float:right\" type=\"button\" data-bs-dismiss=\"alert\" $event aria-hidden=\"true\"></button>
                <i class=\"fa fa-info-circle\"></i>&nbsp;".__($mess)."
            </div>";
		}else{
            $mensagem = "<div class=\"alert alert-$cssMes alert-dismissable\" role=\"alert\">
            <button style=\"float:right\" class=\"close\" type=\"button\" data-dismiss=\"alert\" $event aria-hidden=\"true\">×</button>
            <i class=\"fa fa-info-circle\"></i>&nbsp;".__($mess)."
            </div>";
        }
        return $mensagem;
	}
    // static function formatMensagemInfo2($mess='',$cssMes='',$event=false){
	// 	return $mensagem;
	// }
    static function gerUploadAquivos($config=false){
        if($config){
            $config['parte'] = isset($config['parte']) ? $config['parte'] : 'painel';
            $config['token_produto'] = isset($config['token_produto']) ? $config['token_produto'] : false;
            $config['listFiles'] = isset($config['listFiles']) ? $config['listFiles'] : false; // array com a lista
            $config['time'] = isset($config['time']) ? $config['time'] : 4000;
            $config['arquivos'] = isset($config['arquivos']) ? $config['arquivos'] : false;
            if($config['listFiles']){
                $tipo = false;
                foreach ($config['listFiles'] as $key => $value) {
                    if(isset($value['config'])){
                        $arr_conf = self::lib_json_array($value['config']);
                        if(isset($arr_conf['extenssao']) && !empty($arr_conf['extenssao']))
                        {
                            if($arr_conf['extenssao'] == 'jpg' || $arr_conf['extenssao']=='png' || $arr_conf['extenssao'] == 'jpeg'){
                                $tipo = 'image';
                            }elseif($arr_conf['extenssao'] == 'doc' || $arr_conf['extenssao'] == 'docx') {
                                $tipo = 'word';
                            }elseif($arr_conf['extenssao'] == 'xls' || $arr_conf['extenssao'] == 'xlsx') {
                                $tipo = 'excel';
                            }else{
                                $tipo = 'download';
                            }
                        }
                        $config['listFiles'][$key]['tipo_icon'] = $tipo;
                    }
                }
            }
            if(isset($config['parte'])){
                $view = 'qlib.uploads.painel';
                return view($view, ['config'=>$config]);
            }else{
                return false;
            }
        }else{
            return false;
        }
    }
    static function formulario($config=false){
        if($config['campos']){
            $view = 'qlib.formulario';
            return view($view, ['conf'=>$config]);
        }else{
            return false;
        }
    }
    static function show($config=false){
        if($config['campos']){
            $view = 'qlib.show';
            return view($view, ['conf'=>$config]);
        }else{
            return false;
        }
    }
    static function listaTabela($config=false){
        if($config['campos_tabela']){
            $fileLista = isset($config['fileLista'])?$config['fileLista']:'listaTabela';
            $view = 'qlib.'.$fileLista;
            return view($view, ['conf'=>$config]);
        }else{
            return false;
        }
    }
    static function UrlAtual(){
        return URL::full();
    }
    static function get_subdominio(){
        $ret = false;
        // $url = explode('?',self::UrlAtual());
        $url = request()->getHost();
        // $partesUrl = explode('.',$url[0]);
        $partesUrl = explode('.',$url);
        // $total = count($partesUrl);
        if(isset($partesUrl[0])){
            //$partHost = explode('.',$_SERVER["HTTP_HOST"]);
            $ret = $partesUrl[0];
        }
        return $ret;
    }
    static function ver_PermAdmin($perm=false,$url=false){
        $ret = false;
        if(!$url){
            $url = URL::current();
            $arr_url = explode('/',$url);
        }
        if($url && $perm){
            $arr_permissions = [];
            $logado = Auth::user();
            if($logado){
                $id_permission = $logado->id_permission;
                $dPermission = Permission::findOrFail($id_permission);
                if($dPermission && $dPermission->active=='s'){
                    $arr_permissions = self::lib_json_array($dPermission->id_menu);
                    if(isset($arr_permissions[$perm][$url])){
                        $ret = true;
                    }
                }
            }
        }
        return $ret;
    }
    static public function html_vinculo($config = null)
    {
        /**
        self::html_vinculo([
            'campos'=>'',
            'type'=>'html_vinculo',
            'dados'=>'',
        ]);
         */

        $ret = false;
        $campos = isset($config['campos'])?$config['campos']:false;
        $type = isset($config['type'])?$config['type']:false;
        $dados = isset($config['dados'])?$config['dados']:false;
        if(!$campos)
            return $ret;
        if(is_array($campos) && $dados){
            foreach ($campos as $key => $value) {
                if($value['type']==$type){
                    $id = $dados[$key];
                    $tab = $value['data_selector']['tab'];
                    $d_tab = DB::table($tab)->find($id);
                    if($d_tab){
                        $ret[$key] = (array)$d_tab;
                    }
                }
            }
        }
        return $ret;
    }
    /**
     * Metodo para retornar uma consulta SQL em array
     */
    static function buscaValoresDb($sql,$debug=false){
        if($debug){
            dump($sql);
        }
        if($sql){
            $dados = DB::select($sql);
            $arrayResults = array_map(function ($item) {
                return (array) $item;
            }, $dados);
            return $arrayResults;
        }else{
            return false;
        }
    }
    static function buscaValorDb_SERVER($tab,$campo_bus,$valor,$select,$compleSql=false,$debug=false,$conx='mysql2'){
        //instrução extremamente necessária   buscaValorDb('valor_frete', 'sessao', session_id(), 'valor_frete')
        // global $conn_server;
        if($tab && $campo_bus && $valor && $select){
            $sql = "SELECT $select FROM $tab WHERE $campo_bus='$valor' $compleSql";
            if(isset($debug)&&$debug){
                dump($sql);
            }
            $d = DB::connection($conx)->select($sql);
            if($d)
                $ret = $d[0]->$select;
        }
        return $ret;
    }
    /**
     * Consultar registro em outro banco de dados
     */
    static function buscaValoresDb_SERVER($sql='',$debug=false,$conx='mysql2'){
        if($debug){
            dump($sql);
        }
        if($sql){
            $dados = DB::connection($conx)->select($sql);
            $arrayResults = array_map(function ($item) {
                return (array) $item;
            }, $dados);
            return $arrayResults;
        }else{
            return false;
        }
    }
    /**
     * consulta em bando de dados
     */
    static function dados_tab($tab=false,$campos='nome,id',$comple=false,$debug=false){
        $sql = "SELECT $campos FROM $tab $comple";
        if($debug)
            echo $sql;
        return Qlib::buscaValoresDb($sql);
    }
    static public function dados_tab2($tab = null,$config=[],$debug=false)
    {
        $ret = false;
        $sql = isset($config['sql']) ? $config['sql']:false;
        $comple_sql = isset($config['comple_sql']) ? $config['comple_sql']:false;
        $campos = isset($config['campos']) ? $config['campos']:'*';
        if(!$comple_sql){
            $comple_sql = isset($config['where']) ? $config['where']:false;
        }
        if($tab){
            $id = isset($config['id']) ? $config['id']:false;
        }
        if(!$sql && $comple_sql && $tab){
            $sql = "SELECT $campos FROM " . $tab.' '.$comple_sql;
        }
        if($sql){
            if($debug){
                if($debug=='dd'){
                    return $sql;
                }else{
                    dump($sql);
                }
            }
            $d = DB::select($sql);
            $arr_list = $d;
            $list = false;
            foreach ($arr_list as $k => $v) {
                if(is_object($v)){
                    $list[$k] = (array)$v;
                    foreach ($list[$k] as $k1 => $v1) {
                        if(self::isJson($v1)){
                            $list[$k][$k1] = self::lib_json_array($v1);
                        }
                    }
                }
            }
            $ret = $list;
            return $ret;
        }elseif($tab && $id){
            $obj_list = DB::table($tab)->find($id);
        }
        if($list=(array)$obj_list){
            //dd($obj_list);
                if(is_array($list)){
                    foreach ($list as $k => $v) {
                        if(self::isJson($v)){
                            $list[$k] = self::lib_json_array($v);
                        }
                    }
                }
                $ret = $list;
        }
        return $ret;
    }
    static function dados_tab_SERVER($tab=false,$campos='nome,id',$comple=false){
        $sql = "SELECT $campos FROM $tab $comple";
        return self::buscaValoresDb_SERVER($sql);
    }
    static function buscaValorDb($tab,$campo_bus,$valor,$select,$compleSql=false,$debug=false)
    {
        $ret = false;
        if($tab && $campo_bus && $valor && $select){
            $sql = "SELECT $select FROM $tab WHERE $campo_bus='$valor' $compleSql";
            if(isset($debug)&&$debug){
                dump($sql);
            }
            $d = DB::select($sql);
            if($d)
                $ret = $d[0]->$select;
        }
        return $ret;
    }
    static function buscaValorDb0($config = false)
    {
        /*self::buscaValorDd([
            'tab'=>'',
            'campo_bus'=>'',
            'valor'=>'',
            'select'=>'',
            'compleSql'=>'',
        ]);
        */
        $ret=false;
        $tab = isset($config['tab'])?$config['tab']:false;
        $campo_bus = isset($config['campo_bus'])?$config['campo_bus']:'id';//campo select
        $valor = isset($config['valor'])?$config['valor']:false;
        $select = isset($config['select'])?$config['select']:false; //
        $compleSql = isset($config['compleSql'])?$config['compleSql']:false; //
        if($tab && $campo_bus && $valor && $select){
            $sql = "SELECT $select FROM $tab WHERE $campo_bus='$valor' $compleSql";
            if(isset($config['debug'])&&$config['debug']){
                echo $sql;
            }
            $d = DB::select($sql);
            if($d)
                $ret = $d[0]->$select;
        }
        return $ret;
    }
    static public function valorTabDb($tab = false,$campo_bus,$valor,$select,$compleSql=false)
    {

        $ret=false;
        /*
        $tab = isset($config['tab'])?$config['tab']:false;
        $campo_bus = isset($config['campo_bus'])?$config['campo_bus']:'id';//campo select
        $valor = isset($config['valor'])?$config['valor']:false;
        $select = isset($config['select'])?$config['select']:false; //
        $compleSql = isset($config['compleSql'])?$config['compleSql']:false; //
        */
        if($tab && $campo_bus && $valor && $select){
            $sql = "SELECT $select FROM $tab WHERE $campo_bus='$valor' $compleSql";
            if(isset($config['debug'])&&$config['debug']){
                echo $sql;
            }
            $d = DB::select($sql);
            if($d)
                $ret = $d[0]->$select;
        }
        return $ret;
    }
    static function lib_valorPorExtenso($valor=0) {
		$singular = array("centavo", "real", "mil", "milhão", "bilhão", "trilhão", "quatrilhão");
		$plural = array("centavos", "reais", "mil", "milhões", "bilhões", "trilhões","quatrilhões");

		$c = array("", "cem", "duzentos", "trezentos", "quatrocentos","quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos");
		$d = array("", "dez", "vinte", "trinta", "quarenta", "cinquenta","sessenta", "setenta", "oitenta", "noventa");
		$d10 = array("dez", "onze", "doze", "treze", "quatorze", "quinze","dezesseis", "dezesete", "dezoito", "dezenove");
		$u = array("", "um", "dois", "três", "quatro", "cinco", "seis","sete", "oito", "nove");

		$z=0;

		$valor = @number_format($valor, 2, ".", ".");
		$inteiro = explode(".", $valor);
		for($i=0;$i<count($inteiro);$i++)
			for($ii=strlen($inteiro[$i]);$ii<3;$ii++)
				$inteiro[$i] = "0".$inteiro[$i];

		// $fim identifica onde que deve se dar junção de centenas por "e" ou por "," 😉
		$fim = count($inteiro) - ($inteiro[count($inteiro)-1] > 0 ? 1 : 2);
		$rt=false;
		for ($i=0;$i<count($inteiro);$i++) {
			$valor = $inteiro[$i];
			$rc = (($valor > 100) && ($valor < 200)) ? "cento" : $c[$valor[0]];
			$rd = ($valor[1] < 2) ? "" : $d[$valor[1]];
			$ru = ($valor > 0) ? (($valor[1] == 1) ? $d10[$valor[2]] : $u[$valor[2]]) : "";
			$r = $rc.(($rc && ($rd || $ru)) ? " e " : "").$rd.(($rd && $ru) ? " e " : "").$ru;
			$t = count($inteiro)-1-$i;
			$r .= $r ? " ".($valor > 1 ? $plural[$t] : $singular[$t]) : "";
			if ($valor == "000")$z++; elseif ($z > 0) $z--;
			if (($t==1) && ($z>0) && ($inteiro[0] > 0)) $r .= (($z>1) ? " de " : "").$plural[$t];
			if ($r) $rt = $rt . ((($i > 0) && ($i <= $fim) && ($inteiro[0] > 0) && ($z < 1)) ? ( ($i < $fim) ? ", " : " e ") : " ") . $r;
		}
		return($rt ? $rt : "zero");
	}
	static function convert_number_to_words($number) {

		$hyphen      = '-';
		$conjunction = ' e ';
		$separator   = ', ';
		$negative    = 'menos ';
		$decimal     = ' ponto ';
		$dictionary  = array(
			0                   => 'zero',
			1                   => 'um',
			2                   => 'dois',
			3                   => 'três',
			4                   => 'quatro',
			5                   => 'cinco',
			6                   => 'seis',
			7                   => 'sete',
			8                   => 'oito',
			9                   => 'nove',
			10                  => 'dez',
			11                  => 'onze',
			12                  => 'doze',
			13                  => 'treze',
			14                  => 'quatorze',
			15                  => 'quinze',
			16                  => 'dezesseis',
			17                  => 'dezessete',
			18                  => 'dezoito',
			19                  => 'dezenove',
			20                  => 'vinte',
			30                  => 'trinta',
			40                  => 'quarenta',
			50                  => 'cinquenta',
			60                  => 'sessenta',
			70                  => 'setenta',
			80                  => 'oitenta',
			90                  => 'noventa',
			100                 => 'cento',
			200                 => 'duzentos',
			300                 => 'trezentos',
			400                 => 'quatrocentos',
			500                 => 'quinhentos',
			600                 => 'seiscentos',
			700                 => 'setecentos',
			800                 => 'oitocentos',
			900                 => 'novecentos',
			1000                => 'mil',
			1000000             => array('milhão', 'milhões'),
			1000000000          => array('bilhão', 'bilhões'),
			1000000000000       => array('trilhão', 'trilhões'),
			1000000000000000    => array('quatrilhão', 'quatrilhões'),
			1000000000000000000 => array('quinquilhão', 'quinquilhões')
		);

		if (!is_numeric($number)) {
			return false;
		}

		if (($number >= 0 && (int) $number < 0) || (int) $number < 0 - PHP_INT_MAX) {
			// overflow
			trigger_error(
				'convert_number_to_words só aceita números entre ' . PHP_INT_MAX . ' à ' . PHP_INT_MAX,
				E_USER_WARNING
			);
			return false;
		}

		if ($number < 0) {
			return $negative . self::convert_number_to_words(abs($number));
		}

		$string = $fraction = null;

		if (strpos($number, '.') !== false) {
			list($number, $fraction) = explode('.', $number);
		}
        $number = (int)$number;
		switch (true) {
			case $number < 21:
				$string = $dictionary[$number];
				break;
			case $number < 100:
				$tens   = ((int) ($number / 10)) * 10;
				$units  = $number % 10;
				$string = $dictionary[$tens];
				if ($units) {
					$string .= $conjunction . $dictionary[$units];
				}
				break;
			case $number < 1000:
				$hundreds  = floor($number / 100)*100;
				$remainder = $number % 100;
				$string = $dictionary[$hundreds];
				if ($remainder) {
					$string .= $conjunction . self::convert_number_to_words($remainder);
				}
				break;
			default:
				$baseUnit = pow(1000, floor(log($number, 1000)));
				$numBaseUnits = (int) ($number / $baseUnit);
				$remainder = $number % $baseUnit;
				if ($baseUnit == 1000) {
					$string = self::convert_number_to_words($numBaseUnits) . ' ' . $dictionary[1000];
				} elseif ($numBaseUnits == 1) {
					$string = self::convert_number_to_words($numBaseUnits) . ' ' . $dictionary[$baseUnit][0];
				} else {
					$string = self::convert_number_to_words($numBaseUnits) . ' ' . $dictionary[$baseUnit][1];
				}
				if ($remainder) {
					$string .= $remainder < 100 ? $conjunction : $separator;
					$string .= self::convert_number_to_words($remainder);
				}
				break;
		}

		if (null !== $fraction && is_numeric($fraction)) {
			$string .= $decimal;
			$words = array();
			foreach (str_split((string) $fraction) as $number) {
				$words[] = $dictionary[$number];
			}
			$string .= implode(' ', $words);
		}

		return $string;
	}
    static function limpar_texto($str){
        return preg_replace("/[^0-9]/", "", $str);
    }
    static function compleDelete($var = null)
    {
        if($var){
            return "$var.excluido='n' AND $var.deletado='n'";
        }else{
            return "excluido='n' AND deletado='n'";
        }
    }
    static public function show_files(Array $config = null)
    {
        $ret = self::formatMensagemInfo('Nenhum Arquivo','info');

        if($config['token']){
            $files = DB::table('_uploads')->where('token_produto',$config['token'])->get();
            if($files){
                if(isset($files[0]))
                    return view('qlib.show_file',['files'=>$files,'config'=>$config]);
            }
        }
        return $ret;
    }
    /***
     * Busca um tipo de routa padrão do sistema
     * Ex.: routa que será aberta ao logar
     *
     */
    static function redirectLogin($ambiente='back')
    {
        $ret = '/';
        if(!Auth::check()){
            return $ret;
        }
        $id_permission = auth()->user()->id_permission;
        $dPermission = Permission::FindOrFail($id_permission);
        $ret = Auth::user()->getRedirectRoute() ? Auth::user()->getRedirectRoute() : @$dPermission['redirect_login'];
        // $ret = isset($dPermission['redirect_login']) ? $dPermission['redirect_login']: Auth::user()->getRedirectRoute();;
        return $ret;
    }
    static function redirect($url,$time=10){
        echo '<meta http-equiv="refresh" content="'.$time.'; url='.$url.'">';
    }
    static function verificaCobranca(){
        //$f = new CobrancaController;
        return false; //desativar por enquanto
        $user = Auth::user();
        $f = new UserController($user);
        $ret = $f->exec();
        return $ret;
    }
    static public function is_base64($str){
        try
        {
            $decoded = base64_decode($str, true);

            if ( base64_encode($decoded) === $str ) {
                return true;
            }
            else {
                return false;
            }
        }
        catch(Exception $e)
        {
            // If exception is caught, then it is not a base64 encoded string
            return false;
        }
    }
    static function get_client_ip() {
        $ipaddress = '';
        if (isset($_SERVER['HTTP_CLIENT_IP']))
            $ipaddress = $_SERVER['HTTP_CLIENT_IP'];
        else if(isset($_SERVER['HTTP_X_FORWARDED_FOR']))
            $ipaddress = $_SERVER['HTTP_X_FORWARDED_FOR'];
        else if(isset($_SERVER['HTTP_X_FORWARDED']))
            $ipaddress = $_SERVER['HTTP_X_FORWARDED'];
        else if(isset($_SERVER['HTTP_FORWARDED_FOR']))
            $ipaddress = $_SERVER['HTTP_FORWARDED_FOR'];
        else if(isset($_SERVER['HTTP_FORWARDED']))
            $ipaddress = $_SERVER['HTTP_FORWARDED'];
        else if(isset($_SERVER['REMOTE_ADDR']))
            $ipaddress = $_SERVER['REMOTE_ADDR'];
        else
            $ipaddress = 'UNKNOWN';
        return $ipaddress;
    }
    /**
     * Registra eventos no sistema
     * @return bool;
     */
    static function regEvent($config=false)
    {
        //return true;
        $ret = (new EventController)->regEvent($config);
        return $ret;
    }
    static function get_thumbnail_link($post_id=false){
        $ret = false;
        if($post_id){
            $dados = Post::Find($post_id);
            $imgd = Post::where('ID', '=', $dados['post_parent'])->where('post_status','=','publish')->get();
                if( $imgd->count() > 0 ){
                    // dd($imgd[0]['guid']);
                    $ret = self::qoption('storage_path'). '/'.$imgd[0]['guid'];
                }
        }
        return $ret;
    }
    static function get_the_permalink($post_id=false,$dados=false){
        $ret = url('/');
        if(!$dados && $post_id){
            $dados = Post::Find($post_id);
            if($dados->count() > 0){
                $dados = $dados->toArray();
            }
        }
        if($dados){
            $seg1 = request()->segment(1);
            if($seg1){
                if($dados['post_type'] == 'leiloes_adm' && $seg1==self::get_slug_post_by_id(37)){
                    $ret .= '/'.$seg1.'/'.$dados['ID'];
                }
            }
            // dd($dados);
            // $ret = 'link'
            // $imgd = Post::where('ID', '=', $dados['post_parent'])->where('post_status','=','publish')->get();
            //     if( $imgd->count() > 0 ){
            //         // dd($imgd[0]['guid']);
            //         $ret = self::qoption('storage_path'). '/'.$imgd[0]['guid'];
            //     }
        }
        return $ret;
    }
    // static function add_shortcode( $tag, $callback ) {
    //     global $shortcode_tags;

    //     if ( '' === trim( $tag ) ) {
    //         _doing_it_wrong(
    //             __FUNCTION__,
    //             __( 'Invalid shortcode name: Empty name given.' ),
    //             '4.4.0'
    //         );
    //         return;
    //     }

    //     if ( 0 !== preg_match( '@[<>&/\[\]\x00-\x20=]@', $tag ) ) {
    //         _doing_it_wrong(
    //             __FUNCTION__,
    //             sprintf(
    //                 /* translators: 1: Shortcode name, 2: Space-separated list of reserved characters. */
    //                 __( 'Invalid shortcode name: %1$s. Do not use spaces or reserved characters: %2$s' ),
    //                 $tag,
    //                 '& / < > [ ] ='
    //             ),
    //             '4.4.0'
    //         );
    //         return;
    //     }

    //     $shortcode_tags[ $tag ] = $callback;
    // }
    static function short_code_global($content,$tag,$config=false){
        $ret = $content;
        if(is_array($config)){
            foreach ($config as $key => $value) {
                $ret = str_replace('['.$tag.' ac="'.$key.'"]',$value,$ret);
            }
        }
        return $ret;
    }
    static function is_backend(){
        $ret = false;
        $urlAt = self::UrlAtual();
        if(strpos($urlAt,'/admin') !== false){
            $ret = true;
        }
        return $ret;
    }
    static function is_frontend(){
        $ret = true;
        $urlAt = self::UrlAtual();
        if(strpos($urlAt,'/admin') == true){
            $ret = false;
        }
        return $ret;
    }
    static function get_slug_post_by_id($post_id){
        return self::buscaValorDb0('posts','ID', $post_id,'post_name');
    }
    public static function createSlug($str, $delimiter = '-'){

        $unwanted_array = ['ś'=>'s', 'ą' => 'a', 'ã' => 'a', 'ć' => 'c', 'ç' => 'c', 'ę' => 'e', 'ł' => 'l', 'ń' => 'n', 'õ' => 'o', 'ó' => 'o', 'ź' => 'z', 'ż' => 'z',
            'Ś'=>'s', 'Ą' => 'a', 'Ć' => 'c', 'Ç' => 'c', 'Ę' => 'e', 'Ł' => 'l', 'Ń' => 'n', 'Ó' => 'o', 'Ź' => 'z', 'Ż' => 'z']; // Polish letters for example
        $str = strtr( $str, $unwanted_array );

        $slug = strtolower(trim(preg_replace('/[\s-]+/', $delimiter, preg_replace('/[^A-Za-z0-9-]+/', $delimiter, preg_replace('/[&]/', 'and', preg_replace('/[\']/', '', iconv('UTF-8', 'ASCII//TRANSLIT', $str))))), $delimiter));
        return $slug;
    }
    static function diffDate($d1, $d2, $type='H', $sep='-')
    {
        // $d1 = explode($sep, $d1);
        // $d2 = explode($sep, $d2);
        $d1 = new DateTime($d1);
        $d2 = new DateTime($d2);
        if($sep=='-'){
            $data1  = $d1->format('Y-m-d H:i:s');
            $data2  = $d2->format('Y-m-d H:i:s');
        }
        $intervalo = $d1->diff( $d2 );
        $ret = false;
        // dd($intervalo);
        switch ($type)
        {
            case 'A':
            // $X = 31536000;
            $ret = $intervalo->y;
            break;
            case 'M':
            $X = 2592000;
            break;
            case 'D':
            $X = 86400;
            break;
            case 'H':
            // $X = 3600;
            $ret = $intervalo->h + ($intervalo->days * 24);
            break;
            case 'MI':
            $X = 60;
            break;
            default:
            $X = 1;
        }
        return $ret;
        // return floor( ( ( mktime(0, 0, 0, $d2[1], $d2[2], $d2[0]) - mktime(0, 0, 0, $d1[1], $d1[2], $d1[0] ) ) / $X ) );
    }
    /**
     * Metodo para monstrar a diferença entre datas
     * @param  $d1 datetime, $d2 datetime
     * @return string
     */
    static function diffDate2($d1, $d2,$label=false,$ab=false) {
        $ret = false;
        $d1 = new DateTime($d1);
        $d2 = new DateTime($d2);
        $data1  = $d1->format('Y-m-d H:i:s');
        $data2  = $d2->format('Y-m-d H:i:s');
        $intervalo = $d1->diff( $d2 );
        if($ab){
            $ret .= "$label" . $intervalo->d . " d";
            if($intervalo->m){
                $ret .= " e " . $intervalo->m . " meses";
            }
            if($intervalo->y){
                $ret .= " e " . $intervalo->y . " anos.";
            }
            if($intervalo->h){
                $ret .= ", " . $intervalo->h . " h";
                $ret .= ' '.self::dataExibe($data1);
            }
            // if($intervalo->i){
            //     $ret .= " e " . $intervalo->i . " minutos.";
            // }

        }else{
            $ret .= "$label" . $intervalo->d . " dias";
            if($intervalo->m){
                $ret .= " e " . $intervalo->m . " meses";
            }
            if($intervalo->y){
                $ret .= " e " . $intervalo->y . " anos.";
            }
            if($intervalo->h){
                $ret .= ", " . $intervalo->h . " horas.";
            }
            if($intervalo->i){
                $ret .= " e " . $intervalo->i . " minutos.";
            }
        }
        // $datatime1 = new DateTime('2015/04/15 00:00:00');
        // $datatime2 = new DateTime('2015/05/16 00:00:00');
        return $ret;

        // $diff = $datatime1->diff($datatime2);
        // $horas = $diff->h + ($diff->days * 24);
        // return $horas;
    }
    static function valor_moeda($val,$sig=false){

        return $sig.number_format($val,2,',','.');
    }
    static function criptToken($token){
        $ret = false;
        if($token){
            $pri = substr($token,0,3);
            $seg = substr($token,-3);
            $ret = $pri.'**************'.$seg;
        }
        return $ret;
    }
    static function criptString($token){
        $ret = false;
        if($token){
            $pri = mb_substr($token,0,2);
            $seg = mb_substr($token,-2);
            $ret = $pri.'*****'.$seg;
        }
        return $ret;
    }
    /**
     * Metodo para publicar de forma rápida o Nick name do usuario.
     * @param int $user_id
     * @return string $ret,
     */
    static function getNickName($user_id){
        $d = (new UserController)->get_user_data($user_id);
        $ret = false;
        if(isset($d['name'])){
            $n = explode(' ', $d['name']);
            if(isset($n[0])){
                $ret = $n[0];
            }
        }
        return $ret;
    }
    /**
     * Metodo para salvar ou atualizar os meta posts
     */
    static function update_postmeta($post_id,$meta_key=null,$meta_value=null)
    {
        // $post_id = isset($config['post_id'])?$config['post_id']:false;
        // $meta_key = isset($config['meta_key'])?$config['meta_key']:false;
        // $meta_value = isset($config['meta_value'])?$config['meta_value']:false;
        $ret = false;
        $tab = 'postmeta';
        if($post_id&&$meta_key&&$meta_value){
            $verf = self::totalReg($tab,"WHERE post_id='$post_id' AND meta_key='$meta_key'");
            if($verf){
                $ret=DB::table($tab)->where('post_id',$post_id)->where('meta_key',$meta_key)->update([
                    'meta_value'=>$meta_value,
                    'updated_at'=>self::dataBanco(),
                ]);
            }else{
                $ret=DB::table($tab)->insert([
                    'post_id'=>$post_id,
                    'meta_value'=>$meta_value,
                    'meta_key'=>$meta_key,
                    'created_at'=>self::dataBanco(),
                ]);
            }
            //$ret = DB::table($tab)->storeOrUpdate();
        }
        return $ret;
    }
    /**
     * Metodo para pegar os meta posts
     */
    static function get_postmeta($post_id,$meta_key=null,$string=null)
    {
        $ret = false;
        $tab = 'postmeta';
        if($post_id){
            if($meta_key){
                $d = DB::table($tab)->where('post_id',$post_id)->where('meta_key',$meta_key)->get();
                if($d->count()){
                    if($string){
                        $ret = $d[0]->meta_value;
                    }else{
                        $ret = [$d[0]->meta_value];
                    }
                }else{
                    $post_id = self::get_id_by_token($post_id);
                    if($post_id){
                        $ret = self::get_postmeta($post_id,$meta_key,$string);
                    }
                }
            }
        }
        return $ret;
    }
    /**
     * Metodo buscar o post_id com o token
     * @param string $token
     * @return string $ret;
     */
    static function get_id_by_token($token)
    {
        if($token){
            return self::buscaValorDb0('posts','token',$token,'ID');
        }
    }
    /**
     * Metodo buscar o matricula_id com o token
     * @param string $token
     * @return string $ret;
     */
    static function get_matricula_id_by_token($token)
    {
        if($token){
            return self::buscaValorDb0('matriculas','token',$token,'ID');
        }
    }
    /**
     * Metodo para salvar ou atualizar os meta users
     */
    static function update_usermeta($user_id,$meta_key=null,$meta_value=null)
    {
        $ret = false;
        $tab = 'usermeta';
        if($user_id&&$meta_key&&$meta_value){
            $verf = self::totalReg($tab,"WHERE user_id='$user_id' AND meta_key='$meta_key'");
            if($verf){
                $ret=DB::table($tab)->where('user_id',$user_id)->where('meta_key',$meta_key)->update([
                    'meta_value'=>$meta_value,
                    'updated_at'=>self::dataBanco(),
                ]);
            }else{
                $ret=DB::table($tab)->insert([
                    'user_id'=>$user_id,
                    'meta_value'=>$meta_value,
                    'meta_key'=>$meta_key,
                    'created_at'=>self::dataBanco(),
                ]);
            }
            //$ret = DB::table($tab)->storeOrUpdate();
        }
        return $ret;
    }
    static function delete_usermeta($user_id,$meta_key=null)
    {
        $ret = false;
        $tab = 'usermeta';
        if($user_id&&$meta_key){
            $verf = self::totalReg($tab,"WHERE user_id='$user_id' AND meta_key='$meta_key'");
            if($verf){
                $ret=DB::table($tab)->where('user_id',$user_id)->where('meta_key',$meta_key)->delete();
            }
        }
        return $ret;
    }
    /**
     * Metodo para pegar os meta users
     */
    static function get_usermeta($user_id,$meta_key=null,$string=true)
    {
        $ret = false;
        $tab = 'usermeta';
        if($user_id){
            if($meta_key){
                $d = DB::table($tab)->where('user_id',$user_id)->where('meta_key',$meta_key)->get();
                if($d->count()){
                    if($string){
                        $ret = $d[0]->meta_value;
                    }else{
                        $ret = [$d[0]->meta_value];
                    }
                }
            }
        }
        return $ret;
    }
    /**
     * Metodo para atualizar ou inserir meta dados de métricas
     * @param string $metric_id ID da métrica
     * @param string $meta_key Chave do meta campo
     * @param string $meta_value Valor do meta campo
     * @return boolean
     */
    static function update_metricmeta($metric_id,$meta_key=null,$meta_value=null)
    {
        $ret = false;
        $tab = 'metricmeta';
        if($metric_id&&$meta_key&&$meta_value){
            $verf = self::totalReg($tab,"WHERE metric_id='$metric_id' AND meta_key='$meta_key'");
            if($verf){
                $ret=DB::table($tab)->where('metric_id',$metric_id)->where('meta_key',$meta_key)->update([
                    'meta_value'=>$meta_value,
                    'updated_at'=>self::dataBanco(),
                ]);
            }else{
                $ret=DB::table($tab)->insert([
                    'metric_id'=>$metric_id,
                    'meta_value'=>$meta_value,
                    'meta_key'=>$meta_key,
                    'created_at'=>self::dataBanco(),
                ]);
            }
        }
        return $ret;
    }

    /**
     * Metodo para deletar meta dados de métricas
     * @param string $metric_id ID da métrica
     * @param string $meta_key Chave do meta campo
     * @return boolean
     */
    static function delete_metricmeta($metric_id,$meta_key=null)
    {
        $ret = false;
        $tab = 'metricmeta';
        if($metric_id&&$meta_key){
            $verf = self::totalReg($tab,"WHERE metric_id='$metric_id' AND meta_key='$meta_key'");
            if($verf){
                $ret=DB::table($tab)->where('metric_id',$metric_id)->where('meta_key',$meta_key)->delete();
            }
        }
        return $ret;
    }

    /**
     * Metodo para pegar os meta dados de métricas
     * @param string $metric_id ID da métrica
     * @param string $meta_key Chave do meta campo (opcional)
     * @param boolean $string Se deve retornar como string ou array
     * @return mixed
     */
    static function get_metricmeta($metric_id,$meta_key=null,$string=true)
    {
        $ret = false;
        $tab = 'metricmeta';
        if($metric_id){
            if($meta_key){
                $d = DB::table($tab)->where('metric_id',$metric_id)->where('meta_key',$meta_key)->get();
                if($d->count()){
                    if($string){
                        $ret = $d[0]->meta_value;
                    }else{
                        $ret = [$d[0]->meta_value];
                    }
                }
            }
        }
        return $ret;
    }

    /**
     * Metodo para formatar os dados das bando de dados Post
     */
    static function dataPost($dados=false){
        if($dados){
            foreach ($dados->getOriginal() as $kda => $vda) {
                if($kda=='config'){
                    $dados['config'] = self::lib_json_array($vda);
                }elseif($kda=='post_date'){
                    if($vda=='1970-01-01 00:00:00'){
                        $dados[$kda] = '0000-00-00 00:00:00';
                    }
                }elseif($kda=='post_date_gmt'){
                    $dExec = explode(' ',$dados['post_date_gmt']);
                    if(isset($dExec)){
                        $dados['post_date_gmt'] = $dExec;
                    }
                }else{
                    $dados[$kda] = $vda;
                }
            }
        }
        return $dados;
    }
    /**
     * Metodo para calcular data de vencimento contando x dias a frente sem levar em conta o próxima dia útil
     * @param string $data=data no formato d/m/Y, integer $dias=numero de dias a frente
     * @return string $data1
     */
    static function CalcularVencimento($data,$dias,$formato = 'd/m/Y')
    {
        $novadata = explode("/",$data);
        $dia = isset($novadata[0]) ? $novadata[0] : null;
        $mes = isset($novadata[1]) ? $novadata[1] : null;
        $ano = isset($novadata[2]) ? $novadata[2] : null;

        if(!$dia || !$mes || !$ano){
            return '';
        }
// dump($dia,$mes);
        if ($dias==0)
        {
            $data1 = date('d/m/Y',mktime(0,0,0,$mes,$dia,$ano));
            return self::dtBanco($data1);
        }
        else
        {
            $data1 = date('d/m/Y',mktime(0,0,0,$mes,$dia+$dias,$ano));
            return self::dtBanco($data1);
        }
    }
    /**
     * Metodo para calcular data de vencimento contando x dias a frente levando em conta o próxima dia útil
     * @param string $data=data no formato d/m/Y, integer $dias=numero de dias a frente
     * @return string $data1
     */
    static function CalcularVencimento2($data,$dias,$formato = 'd/m/Y')
    {
        $novadata = explode("/",$data);
        $dia = $novadata[0];
        $mes = $novadata[1];
        $ano = $novadata[2];
        if ($dias==0)
        {
            $data1 = date('d/m/Y',mktime(0,0,0,$mes,$dia,$ano));
            return self::proximoDiaUtil(dtBanco($data1), $formato);
        }
        else
        {
            $data1 = date('d/m/Y',mktime(0,0,0,$mes,$dia+$dias,$ano));
            return self::proximoDiaUtil(dtBanco($data1), $formato);
        }
    }
    /**
     * Metodo para calcular data de vencimento contando x $meses a frente quando $retDiaUtl=true leva em conta o próxima dia útil
     * @param string $data=data no formato d/m/Y, integer $meses=numero de meses a frente,string $formato=formato, boolean $retDiaUtil=para levar em conta o próxima dia util ou não
     * @return string $data1
     */
    static function CalcularVencimentoMes($data,$meses,$formato = 'd/m/Y',$retDiaUtl=true)
        {
            $novadata = explode("/",$data);
            $dia = $novadata[0];
            $mes = $novadata[1];
            $ano = $novadata[2];
            if ($meses==0)
            {
                $data1 = date('d/m/Y',mktime(0,0,0,$mes,$dia,$ano));
                return self::proximoDiaUtil(self::dtBanco($data1), $formato);
            }
            else
            {
                $data1 = date('d/m/Y',mktime(0,0,0,$mes+$meses,$dia,$ano));
                if($retDiaUtl)
                    return self::proximoDiaUtil(self::dtBanco($data1), $formato);
                else
                    return $data1;
            }
    }
    /**
     * Metodo para calcular data anterior contando da $data x dias para trás sem levar em conta o próxima dia útil
     * @param string $data=data no formato d/m/Y, integer $dias=numero de dias a frente
     * @return string $data1
     */

    static function CalcularDiasAnteriores($data,$dias=0,$formato = 'd/m/Y')
    {
        $novadata = explode("/",$data);
        $dia = $novadata[0];
        $mes = $novadata[1];
        $ano = $novadata[2];
        if ($dias==0)
        {
            $data1 = date('d/m/Y',mktime(0,0,0,$mes,$dia,$ano));
            return self::dtBanco($data1);
        }
        else
        {
            $data1 = date('d/m/Y',mktime(0,0,0,$mes,$dia-$dias,$ano));
            return $data1;
        }
    }
    static function proximoDiaUtil($data, $saida = 'd/m/Y') {
        // Converte $data em um UNIX TIMESTAMP
        $timestamp = strtotime($data);
        // Calcula qual o dia da semana de $data
        // O resultado será um valor numérico:
        // 1 -> Segunda ... 7 -> Domingo
        $dia = date('N', $timestamp);
        // Se for sábado (6) ou domingo (7), calcula a próxima segunda-feira
        if ($dia >= 6) {
            $timestamp_final = $timestamp + ((8 - $dia) * 3600 * 24);
        } else {
        // Não é sábado nem domingo, mantém a data de entrada
            $timestamp_final = $timestamp;
        }
        return date($saida, $timestamp_final);
    }
    static function get_company_data(){
        $ret = self::lib_json_array(self::qoption('dados_empresa'));
        return $ret;
    }
    /**
     * Metodo para formatar um valor moeda para ser salvo no banco de dados
     * @param string || double $preco
     * @return string $data1
     */
    static function precoDbdase($preco){
        $preco = str_replace('R$', '', $preco);
        $preco = trim($preco);
        $sp = substr($preco,-3,-2);
        $sp2 = substr($preco,-2,-1);
        if($sp=='.'){
            $preco_venda1 = $preco;
        }elseif($sp2 && $sp2=='.'){
            $preco_venda1 = $preco;
        }else{
            $preco_venda1 = str_replace(".", "", $preco);
            $preco_venda1 = str_replace(",", ".", $preco_venda1);
        }
        return $preco_venda1;
    }
    /**
     * MONTA UM ARRAY COM OPÇÕES DE SEXO
     * @retun array ou string se $var não for nulo
     */
    static function lib_sexo($var = null)
    {
        $arr_tipo_genero = [
            'm'=>__('Masculino'),'f'=>__('Feminino'),'ni'=>__('Não informar')
        ];
        if(!$var){
            return $arr_tipo_genero;
        }else{
            return $arr_tipo_genero[$var];
        }
    }
    /**
     * MONTA UM ARRAY COM OPÇÕES DE ESCOLARIDADE ORIGEM TABELA ESCOLARIDADES
     * @retun array ou string se $var não for nulo
     */
    static function lib_escolaridades($var = null)
    {
        $arr_tipo_escolaridade = self::sql_array("SELECT id,nome FROM escolaridades WHERE ativo='s' ORDER BY nome ASC",'nome','id');
        if(!$var){
            return $arr_tipo_escolaridade;
        }else{
            return $arr_tipo_escolaridade[$var];
        }
    }
    /**
     * MONTA UM ARRAY COM OPÇÕES DE PROFISSÃO ORIGEM TABELA profissaos
     * @retun array ou string se $var não for nulo
     */
    static function lib_profissao($var = null)
    {
        $arr_tipo_profissao = self::sql_array("SELECT id,nome FROM profissaos WHERE ativo='s' ORDER BY nome ASC",'nome','id');
        if(!$var){
            return $arr_tipo_profissao;
        }else{
            return $arr_tipo_profissao[$var];
        }
    }
    static function dominio(){
        $url_atual = "http" . (isset($_SERVER['HTTPS']) ? (($_SERVER['HTTPS']=="on") ? "s" : "") : "") . "://" . "$_SERVER[HTTP_HOST]";
        return $url_atual;
    }
    /**
     * Metodo para salvar ou atualizar os meta posts
     */
    static function update_matriculameta($matricula_id,$meta_key=null,$meta_value=null)
    {
        $ret = false;
        $tab = 'matriculameta';
        if($matricula_id&&$meta_key&&$meta_value){
            $verf = self::totalReg($tab,"WHERE matricula_id='$matricula_id' AND meta_key='$meta_key'");
            if($verf){
                $ret=DB::table($tab)->where('matricula_id',$matricula_id)->where('meta_key',$meta_key)->update([
                    'meta_value'=>$meta_value,
                    'updated_at'=>self::dataBanco(),
                ]);
            }else{

                $ret=DB::table($tab)->insert([
                    'matricula_id'=>$matricula_id,
                    'meta_value'=>$meta_value,
                    'meta_key'=>$meta_key,
                    'created_at'=>self::dataBanco(),
                ]);
            }
        }
        return $ret;
    }
    /**
     * Metodo para pegar os meta matriculas
     * @param string $matricula_id,$meta_key=matricula key,$strig;
     */
    static function get_matriculameta($matricula_id,$meta_key=null,$string=true)
    {
        $ret = false;
        $tab = 'matriculameta';
        if($matricula_id){
            if($meta_key){
                $d = DB::table($tab)->where('matricula_id',$matricula_id)->where('meta_key',$meta_key)->get();
                // dump($matricula_id,$meta_key,$d);
                if($d->count()){
                    if($string){
                        $ret = $d[0]->meta_value;
                    }else{
                        $ret = [$d[0]->meta_value];
                    }
                }else{
                    $matricula_id = self::get_matricula_id_by_token($matricula_id);
                    if($matricula_id){
                        $ret = self::get_matriculameta($matricula_id,$meta_key,$string);
                    }
                }
            }
        }
        return $ret;
    }
    /**
     * Metodo para remover um matricula meta
     */
    static function delete_matriculameta($matricula_id,$meta_key=false){
        $tab = 'matriculameta';
        $ret = false;
        if($matricula_id && $meta_key){
            $ret = DB::table($tab)
            ->where('matricula_id','=',$matricula_id)
            ->where('meta_key','=',$meta_key)
            ->delete();
        }elseif($matricula_id){
            $ret = DB::table($tab)
            ->where('matricula_id','=',$matricula_id)
            ->delete();
        }
        return $ret;
    }

    /**
     * Salva ou atualiza uma configuração na tabela de configuração qoption_remoto
     */
    static function update_config($name,$value=null,$obs=false)
    {
        $ret = false;
        $tab = 'qoptions_remoto';
        if($name&&$value){
            $verf = self::totalReg($tab,"WHERE name='$name'");
            if($verf){
                $ret=DB::table($tab)->where('name',$name)->update([
                    'value'=>$value,
                    'obs'=>$obs,
                    // 'updated_at'=>self::dataBanco(),
                ]);
            }else{
                $ret=DB::table($tab)->insert([
                    'name'=>$name,
                    'value'=>$value,
                    'obs'=>$obs,
                    // 'meta_key'=>$meta_key,
                    // 'created_at'=>self::dataBanco(),
                ]);
            }
        }
        return $ret;
    }
    /**
     * Verifica que esta sendo executado de uma uma area de adminstração
     */
    static function is_admin_area(){
        $urlA = self::UrlAtual();
        $p = explode('/',$urlA);

        if(isset($p[3])&&$p[3]=='admin'){
            $ret = true;
        }else{
            $ret = false;
        }
        return $ret;
    }
    /**
     * Metodo para verificar o plano de pagamento
     */
    static function verificaPlano($config=false){

		$ret['exec'] = false;

		if(isset($config['token_matricula'])){

			$compleSql = isset($config['compleSql']) ? $config['compleSql'] : false;

			// $dadosPlano = dados_tab('lcf_planos As p','p.*,m.id_curso',"
			// JOIN ".$GLOBALS['tab12']." As m ON m.token=p.token_matricula
			// WHERE token_matricula='".$config['token_matricula']."' $compleSql");
			$dadosPlano = self::dados_tab('lcf_planos',['comple_sql'=>"WHERE token_matricula='".$config['token_matricula']."' $compleSql"]);

            if(isset($dadosPlano[0])){
				$ret['exec'] = true;
                // dd($dadosPlano);
                $dadosPlano = $dadosPlano[0];
				if(isset($dadosPlano['config'])){
					$dadosPlano['config'] = self::lib_json_array($dadosPlano['config']);
					if(isset($dadosPlano['config']['id'])){
						$dt = self::dados_tab('parcelamento',['comple_sql'=>"WHERE id='".$dadosPlano['config']['id']."'"]);
						if($dt){
							$ret['dadosTabela'] = $dt[0];
						}
					}
				}
				$ret['dadosPlano'] = $dadosPlano;
			}
			$ret['dadosMatricula'] = false;
			$dadosMatricula = (new MatriculasController)->dm($config['token_matricula']);
			if($dadosMatricula){
				$ret['dadosMatricula'] = $dadosMatricula;
			}
		}
		return $ret;
	}
    /**
     * Metodo para verificar a compraça do aluno
     */
    static function verificaCobAluno($tokenOs,$id_cliente,$opc='matricula',$catego_cob=15){

        $categoria = !empty($catego_cob) ? $catego_cob :15;
        $dplano = self::verificaPlano(['token_matricula'=>$tokenOs]);
        // dd($dplano);
        $id_plano = isset($dplano['dadosPlano'][0]['id'])?$dplano['dadosPlano'][0]['id']:false;
        if($id_plano){
            $comple = " WHERE `ref_compra` ='".$tokenOs."' AND `id_cliente`='".$id_cliente."' AND `categoria` = '".$categoria."' AND local='$id_plano'";
        }else{
            $comple = " WHERE `ref_compra` ='".$tokenOs."' AND `id_cliente`='".$id_cliente."' AND `categoria` = '".$categoria."' ";
        }

        $sql = "SELECT * FROM ".'lcf_entradas'. " $comple";

        $ret['enc'] = false;
        $ret['algum_pogo'] = false;

        $dados = DB::select($sql);
        if($dados){

            $ret['enc'] = true;

            $ret['dados'] = $dados;

            if(self::totalReg('lcf_entradas', $comple." AND pago = 's'")){

                $ret['algum_pogo'] = true;

            }else{
                $ret['algum_pogo'] = false;

            }


        }else{
            $comple = " WHERE `ref_compra` ='".$tokenOs."' AND `id_cliente`='".$id_cliente."' AND `categoria` = '".$categoria."' ";
            $sql = "SELECT * FROM lcf_entradas  $comple";
            $dados = self::buscaValoresDb($sql);
            if($dados){
                $ret['enc'] = true;
            }
        }

        return $ret;

    }
    /**
     * Monta botes de ação relacionada a matricula
     */
    static public function btsAcaoMatricula($config=false){

		$ret = false;

		//forma pagamento boleto = 3; cartao = 2

		if(isset($config['forma_pagamento'])){

			$config['campo'] = isset($config['campo'])?$config['campo']:'valor';

			$config['token_matricula'] = isset($config['token_matricula'])?$config['token_matricula']:false;

			$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente']:false;
			$tipo_curso = Null;
			if(isset($config['token_matricula'])){
				$dm = (new MatriculasController)->dm($config['token_matricula']);
				if(isset($dm['tipo_curso'])){
					$tipo_curso = $dm['tipo_curso'];
				}
			}
			if(is_array($config)){

					$ret .= '<div class=" text-right" id="campo_'.$config['campo'].'">';

					if($config['campo'] == 'inscricao'){

						$verificaCobAluno = verificaCobAluno($config['token_matricula'],$config['id_cliente'],$opc='matricula',$GLOBALS['categoriaMatricula']);

						if($verificaCobAluno['enc']){

							if(is_adminstrator(3))

							$ret .= '<a href="javascript:void(0)" class="btn btn-danger" que-ini="'.$config['campo'].'-remove" title="Remover matrícula"> Revomer matrícula</a>';

						}else{

							$ret .= '<a href="javascript:void(0)" class="btn btn-success" que-ini="'.$config['campo'].'" title="Use esta opção somente quando o aluno já tiver pago a matrícula"> Matricular</a>';

							if(is_adminstrator(5)){

								$ret .= '<a href="javascript:void(0)" class="btn btn-primary" que-ini="'.$config['campo'].'-boleto" title="Use esta opção para gerar o boleto da matrícula"> <i class="fa fa-barcode"></i></a>';

							}

						}

					}

					if($config['campo'] == 'valor'){

						$display = 'block';

						$verificaCobAluno = verificaCobAluno($config['token_matricula'],$config['id_cliente'],$opc='matricula',$GLOBALS['categoriaMensalidade']);
						// lib_print($verificaCobAluno);
						if($verificaCobAluno['enc']){

							$display = 'none';

							if($verificaCobAluno['algum_pogo']){

								$disabledRemove = 'disabled';

								$seletor = 'onClick="alerta(\'Não é possível remover cobranças por aqui por que tem faturas pagas, ou boletos gerados. Entre em contato com o suporte.'.suporteTec().'\')"';

								if(is_adminstrator(3))

									$display = 'block';

							}else{

								$disabledRemove = false;

								$seletor = 'que-cob="'.$config['campo'].'-remove"';

								if(is_adminstrator(3))

									$display = 'block';

							}

							$ret .= '<a href="javascript:void(0)" onclick="removeCorbracaAluno();" '.$disabledRemove.' style="display:'.$display.'" class="btn btn-danger" '.$seletor.' title="Remover cobranças"> Revomer cobranças</a>';

						}else{

							if($config['forma_pagamento']==2 || $config['forma_pagamento']==7){  //cartao

								//$ret .= '<a href="javascript:void(0)" class="btn btn-default" onclick="cursos_LinkPagamentoCartao();" que-cob="'.$config['campo'].'" title="Use esta opção somente para gerar um link de pagamento no cartão"><i class="fa fa-link"></i> pagamento</a>';

								$tema_bt = '<input id="link-pagamento" type="hidden" disabled class="form-control" value="{tk_login}" name="tk_login"><!--<span style="position:absolute;top:20px;right:13px"><button data-copy-link-pag="true" type="button" onClick="copyTextToClipboard($(\'#link-pagamento\').val());" class="btn btn-default"><i class="fa fa-copy"></i></button></span>--><a href="javascript:void(0)" class="btn btn-default" onclick="copyTextToClipboard($(\'#link-pagamento\').val());cursos_clearPayment(\''.$config['token_matricula'].'\');" que-cob="'.$config['campo'].'" title="Gerar e copiar o link para área de transferência"><i class="fa fa-link"></i> pagamento</a>';

								$ret .= user_site_gerarToken($config['token_matricula'],$tema_bt); //app/user_site


							}

							if($config['forma_pagamento']==3 && isAdmin(3)){ //boleto
								if($tipo_curso==4){
									$tema_bt = '<input id="link-pagamento" type="hidden" disabled class="form-control" value="{tk_login}" name="tk_login"><!--<span style="position:absolute;top:20px;right:13px"><button data-copy-link-pag="true" type="button" onClick="copyTextToClipboard($(\'#link-pagamento\').val());" class="btn btn-default"><i class="fa fa-copy"></i></button></span>--><a href="javascript:void(0)" class="btn btn-default" onclick="copyTextToClipboard($(\'#link-pagamento\').val());cursos_clearPayment(\''.$config['token_matricula'].'\');" que-cob="'.$config['campo'].'" title="Gerar e copiar o link para área de transferência"><i class="fa fa-link"></i> pagamento</a>';

									$ret .= user_site_gerarToken($config['token_matricula'],$tema_bt); //app/user_site
								}

								$ret .= '<a href="javascript:void(0)" class="btn btn-primary" onclick="criarCobrancaAluno();" que-cob="'.$config['campo'].'" title="Use esta opção somente para gerar as cobranças"> Gerar cobranças.</a>';

							}

						}

					}

					$ret .= '</div>';

			}

		}
		return $ret;
	}
    /**
     * Metodo para retornar uma pagina com as informações de pagamento do curso
     */
    static public function infoPagCurso($config=false){
		global $categoriaMensalidade;
        $ret['exec'] = false;
        $categoriaMensalidade = self::qoption('categoriaMensalidade') ? self::qoption('categoriaMensalidade') : '';
		$ret['html'] = false;

		$ret['resumo_front'] = false;

		$ret['dadosPlano'] = false;
		if(isset($config['token'])){

			$dadosMatricula = (new MatriculasController )->dm($config['token']);
			//1 - varificar se ja foi gerado um plano uma matricula pode ter 2 plano um do tipo matricula e outro do tipo mensalidades

			//2 - se tem montar um painel com as informações

			if(!$dadosMatricula){
				return $ret;
			}
			$tipo_curso = isset($dadosMatricula['tipo_curso']) ? $dadosMatricula['tipo_curso'] : 0;
			$ret['html'] .= '<div class="col-sm-12 padding-none desc-pagcurso">';



			$tr = false;
			$dp = self::qoption('dias_pagamento');
			if($dp){
				$dp = base64_encode($dp);
			}

			$tema1 =

			'
			<dias_pagamento style="display:none">'.$dp.'</dias_pagamento>
			<table id="plano-parcelamento" class="table">

				<thead>

					<tr>

						<th colspan="7" class="text-center"><h5>Plano de pagamento escolhido: {nome_tabela} </h5></th>

					</tr>

					<tr>

						<th colspan="7" class="text-center"><label>Forma de pagamento</label> <b class="forma_pagamento text-danger">{forma_pagamento}</b></th>

					</tr>

					<tr>


						<th class="">1° Vencimento</th>
						<th class="">dia pagamento.</th>

						<th class="text-center">Parcelas</th>';
						if($tipo_curso!=4){
							$tema1 .= '<th class="text-right">Valor</th>';
							$tema1 .= '<th class="text-right">Total</th>';
						}

						if(self::isAdmin(3)){
							$tema1 .='

							<th class="text-center" style="width:30%">Açao</th><th class="text-center" style="width:10%">...</th>';
						}
				$tema1 .='

					</tr>

				</thead>

				<tbody>

				{tr}

				</tbody>

			</table>';
			$tema2 = '

			<tr id="trp-{id}">

				<!--<td>{categoria}<input type="hidden" name="reg_pagamento[categoria]" /></td>-->

				<td>{data_pri_cob}</td>
				<td id="dia-vencimento">{dia_vencimento}</td>

				<td class="text-center">{parcelas}<input type="hidden" name="reg_pagamento[parcelas]" value="{val_parcelas}"/></td>';
			if($tipo_curso!=4){
				$tema2 .= '<td class="text-right"><input type="hidden" name="reg_pagamento[valor]" value=""{val_valor}"/>{valor_label}</td>';
				$tema2 .= '<td class="text-right">{total_plano}</td>';
			}
			if(self::isAdmin(3)){
				$tema2 .= '

				<td class="acao text-right">{acao}</td>
				<td class="acao text-right">{del}</td>
				';
			}

			$tema2 .= '
			</tr>';

			$temavalor =

			'<div class="row mt-3 mb-3">

				<div class="col-md-3">

					<img src="{img_url}" width="100%" alt="{nome_curso}" />

				</div>

				<div class="col-md-9">

					<h4>{nome_curso}</h4>

					<h2>R$ {valor} / mês</h2>

					<p>A cobrança se encerrará ao final de <b>{parcelas} cobranças.</b>

					Plano de Recorrência Mensal no <b class="text-danger">{forma_pagamento}</b></p>

				</div>



			</div>';
			$compleTem2= '<h2>{parcelas} X R$ {valor}</h2>';
			$compleTem3= '';
			if(isset($tipo_curso)&&$tipo_curso==4){
				$compleTem2= '';
				// $compleTem3= '<div class="col-md-12">{tabela_parcelamento}</div>';
				$compleTem3= '<div class="col-md-12">{obs}</div>';
			}
			$temavalor2 =

			'<div class="row mt-3 mb-3">

				<div class="col-md-3">

					<img src="{img_url}" width="100%" alt="{nome_curso}" />

				</div>

				<div class="col-md-9">

					<h4>{nome_curso}</h4>

					'.$compleTem2.'

					<p><b class="text-danger">{forma_pagamento}</b></p>

				</div>
				'.$compleTem3.'


			</div>';

			$arr_categoria = self::sql_array("SELECT * FROM lcf_categorias ORDER BY nome ASC ",'nome','id');

			$dadosPlano =  self::dados_tab('lcf_planos',['comple_sql'=>"WHERE token_matricula='".$config['token']."'"]);
			$total = 0;

			$parcelas = 0;

			$forma_pagamento = false;

			$fp = false;

			$btn_finalizar_compra = false;

			// loop for para adicionar um plano baseado no cadastro do curso no caso de não encontrar nada
			for ($i=1; $i <= 2; $i++) {

				if($dadosPlano){

						$ret['dadosPlano'] = $dadosPlano;

						foreach ($dadosPlano as $key => $value) {

							$fp=isset($value['forma_pagamento'])?$value['forma_pagamento']:Null;

							$dadosPlano[$key]['config'] = self::lib_json_array($value['config']);

							$forma_pagamento = self::buscaValorDb0('lcf_formas_pagamentos','id', $value['forma_pagamento'],'nome');

							$totalPl = ($value['parcelas']*$value['valor']);

							$tr .= str_replace('{parcelas}','<parcelas>'.$value['parcelas'].'</parcelas>X',$tema2);

							$tr = str_replace('{valor}','<valor>'.$value['valor'].'</valor>',$tr);

							$tr = str_replace('{valor_label}','R$ <valor>'.number_format($value['valor'],2,',','.').'</valor>',$tr);

							$tr = str_replace('{total_plano}','R$ <vl_total>'.number_format($totalPl,2,',','.').'</vl_total>',$tr);
							$tr = str_replace('{dia_vencimento}',$value['dia_pagamento'],$tr);
							$tr = str_replace('{categoria}',$arr_categoria[$value['categoria']],$tr);

							$tr = str_replace('{id}',$value['id'],$tr);

							$tr = str_replace('{data_pri_cob}','<data_pri_cob>'.self::dataExibe($value['data_pri_cob']).'</data_pri_cob><input type="hidden" value="'.$value['data_pri_cob'].'" name="data_pri_cob" />',$tr);

							$tr = str_replace('{val_valor}',$value['valor'],$tr);

							if($value['categoria']==$GLOBALS['categoriaMensalidade']){

							$acao = self::btsAcaoMatricula($value);

						}else{

							$acao = false;

						}
						if(self::isAdmin(3)){

							$del = '<button type="button" class="btn btn-default" onclick="cursos_editPlano(\''.$value['id'].'\')" title="Editar"><i class="fa fa-pencil"></i></button>';

						}else{

							$del = false;

						}
						$verificaCobAluno = self::verificaCobAluno($config['token'],@$config['id_cliente'],$opc='matricula',$GLOBALS['categoriaMensalidade']);
						if($verificaCobAluno['enc']){
							$dispBtnRemove = 'none';
						}else{
							$dispBtnRemove = '';
						}
						$del .= '<button type="button" class="btn btn-danger" style="display:'.$dispBtnRemove.'" onclick="cursos_removePlano(\''.$value['id'].'\')" title="Excluir"><i class="fa fa-trash"></i></button>';

						$parcelas = $value['parcelas'];

						$tr = str_replace('{acao}',$acao,$tr);

						$tr = str_replace('{del}',$del,$tr);

						$total += $value['valor'];

					}

					if($total>0){
						if($forma_pagamento=='Boleto'){

							$btn_finalizar_compra = '<button type="button" {event} class="btn btn-primary btn-block btn-lg">Solicitar Boletos <i class="fa fa-chevron-right pull-right" aria-hidden="true"></i></button>';
						}else{
							$btn_finalizar_compra = '<button type="button" {event} class="btn btn-primary btn-block btn-lg">Pagar agora <i class="fa fa-chevron-right pull-right" aria-hidden="true"></i></button>';
						}

					}



					break;

				}else{

					$dm = $dadosMatricula;
                    // dd($dm);
					if($dm['parcelas_curso']>0 && $dm['valor_parcela_curso']>0 && $dm['valor']>0){
						$id_fp = 2;  //Id forma pagamento cartao 2 = recorrencia 7 = limite total
						if(isset($dm['tipo_curso'])&&$dm['tipo_curso']==1){
							//Se o tipo de curso for EAD
							$id_fp = 7;  //Id forma pagamento cartao 2 = recorrencia 7 = limite total
						}
						$sl = cursos::gerarPlanos([

							"entrada"=> false,

							"parcelas"=> $dm['parcelas_curso'],

							"valor"=> $dm['valor_parcela_curso'],

							"total_plano"=> $dm['valor'],

							"categoria"=> $categoriaMensalidade,

							"dados_tabela"=>[

								'id'=>'',

								'forma_pagamento'=>$id_fp,

								'token_matricula'=>$dm['token_matricula']

							],

							"token_matricula"=> $config['token']

						]);

						$salvar = self::lib_json_array($sl);

						if(isset($salvar['exec'])&& $salvar['exec']){

							$arr_reg_inscricao = [

								'valor'=>$dm['inscricao'],

								'valor_parcela'=>$dm['inscricao'],

								'parcelas'=>1,

								'desconto'=>0,

								'tipo_desconto'=>'',

							];

							$ret['reg_inscricao'] = self::update_tab($GLOBALS['tab12'],['reg_inscricao'=>self::lib_array_json($arr_reg_inscricao)],"' WHERE token='".$config['token']."'");
                            //  salvarAlterar("UPDATE IGNORE ".$GLOBALS['tab12']." SET reg_inscricao = '".self::lib_array_json($arr_reg_inscricao)."' WHERE token='".$config['token']."'");

							$dadosPlano = self::dados_tab('lcf_planos',['campos'=>'*','where'=>"WHERE token_matricula='".$config['token']."'"]);

						}else{

							$ret['html'] .= @$salvar['exec'];

						}

					}

				}

			} //fim do for

			$ret['tabela_parcelamento'] = false;
			$ret['tabela_parcelamento_cliente'] = false;
			$obs = false;
			if(isset($dadosMatricula['tipo_curso']) && $dadosMatricula['tipo_curso']==4 && isset($dadosPlano['config']) && !empty($dadosPlano['config']) && ($cfp=$dadosPlano['config'])){
				$ar_c = self::lib_json_array($cfp);
				$tr_matricula = false;
				$ttp1 = '<table class="table"><thead><!--<th colspan="2" class="text-center">'.__translate('Resumo do pagamento',true).'</th>-->{tr_matricula}<tr><th>Parcelas</th><th class="text-right">Valores</th></tr></thead><tbody>{trp}</tbody></table>';
				$ttp2 = '<tr><td>[parcelas]</td><td class="text-right">[valores]</td></tr>';
				$trp = false;
				$dadosTabela = self::dados_tab($GLOBALS['tab55'],['campos'=>'*','where'=>"WHERE id='".$ar_c['id']."'"]);
				if($dadosTabela){
					$ret['dadosTabela'] = $dadosTabela;
					$obs = $dadosTabela[0]['obs'];
					$ret['tabela_parcelamento_cliente'] = self::tabela_parcelamento_cliente($ar_c['id']);
				}

				if(isset($ar_c['id']) && $ar_c['id']>0){
					$matricula = self::buscaValorDb($GLOBALS['tab55'],'id',$ar_c['id'],'valor');
					if($matricula){
						$tr_matricula='<tr><th>Matrícula</th><th class="text-right">'.number_format($matricula,2,',','.').'</th></tr>';
					}
				}
				if(isset($ar_c['parcelas']) && is_array($ar_c['parcelas'])){
					foreach ($ar_c['parcelas'] as $k => $v) {
						$trp .= str_replace('[parcelas]',$v['parcela'].'X',$ttp2);
						$trp = str_replace('[valores]',$v['valor'],$trp);
					}
				}
				$tpa = str_replace('{trp}',$trp,$ttp1);
				$tpa = str_replace('{tr_matricula}',$tr_matricula,$tpa);
				$ret['tabela_parcelamento'] = $tpa;
				$ret['obs'] = $obs;
			}

			$ret['dadosMatricula'] = $dadosMatricula;


			$ret['html'] .= str_replace('{tr}',$tr,$tema1);

			$ret['html'] .= '<input type="hidden" value="'.base64_encode($tema2).' id="tema2" /><input type="hidden" id="token_matricula" value="'.$config['token'].'" /></div>';

			$ret['html'] = str_replace('{forma_pagamento}',$forma_pagamento,$ret['html']);

			$nome_tabela = self::buscaValorDb0('parcelamento','id',@$dadosPlano['config']['id'],'nome');

			$ret['html'] = str_replace('{nome_tabela}',$nome_tabela,$ret['html']);

			$ret['btn_finalizar_compra'] = str_replace('{event}','onclick="finalizarCompraEcomerce()" que-acao="finalizar_compra"',$btn_finalizar_compra);

			//para exibiçção no front area do cliente


			$image_link = (new SiteController)->dadosImagemModGal('arquivo',"id_produto='".$dadosMatricula['token_curso']."' AND ordem = '1'");

			if(isset($image_link[0]['url']))

				$img_url = str_replace('https://aeroclubejf','https://crm.aeroclubejf',$image_link[0]['url']);

			else

				$img_url = url('/').'img/indisponivel.gif';


			$total_parcelado = round(((int)$parcelas*(double)$total),2);
			$ret['valores'] = ['total'=>$total,'parcelas'=>$parcelas,'total_parcelado'=>$total_parcelado,'forma_pagamento'=>$forma_pagamento ];

			if($fp==2){

				$ret['resumo_front'] = str_replace('{nome_curso}',$dadosMatricula['nome_curso'],$temavalor);

			}else{

				$ret['resumo_front'] = str_replace('{nome_curso}',$dadosMatricula['nome_curso'],$temavalor2);

			}
			$ret['resumo_front'] = str_replace('{valor}',number_format($total,2,',','.'),$ret['resumo_front']);

			$ret['resumo_front'] = str_replace('{parcelas}',$ret['valores']['parcelas'],$ret['resumo_front']);

			$ret['resumo_front'] = str_replace('{forma_pagamento}',$forma_pagamento,$ret['resumo_front']);

			$ret['resumo_front'] = str_replace('{img_url}',$img_url,$ret['resumo_front']);
			$ret['resumo_front'] = str_replace('{tabela_parcelamento}',$ret['tabela_parcelamento'],$ret['resumo_front']);
			if(isset($dadosMatricula['tipo_curso']) && $dadosMatricula['tipo_curso']==4){
				$ret['resumo_front'] = str_replace('{obs}','',$ret['resumo_front']);
			}else{
				$ret['resumo_front'] = str_replace('{obs}',$obs,$ret['resumo_front']);
			}


		}
		return $ret;
	}
    /**
     * Metodo para criar e editacar um carquivo json
     */
    static function saveEditJson($data,$arquivo='arquivo.json',$pasta='json_testes'){
        // $data = [
        //     'nome' => 'João',
        //     'email' => 'joao@example.com',
        //     'idade' => 30,
        // ];

        try {
            $caminho = $pasta.'/'.$arquivo;
            if (Storage::exists($caminho)) {
                // Lê o conteúdo do arquivo
                $jsonData = Storage::get($caminho);
                // Decodifica o JSON em um array
                if(is_string($data)){
                    if(json_validate($data)){
                        $data = self::lib_json_array($data);
                    }else{
                        $ret['mens'] = 'Tipo de dados invalidos'.$data;
                    }
                }else{
                    $data_a = json_decode($jsonData, true);
                }
                if (is_array($data)) {
                    // Modifica os dados
                    // $data['idade'] = 31;
                    array_push($data_a,$data);
                    // dd($data_a);

                    // Codifica novamente para JSON
                    $novoJsonData = json_encode($data_a, JSON_PRETTY_PRINT);
                    // Salva as alterações no arquivo
                    Storage::put($caminho, $novoJsonData);
                    $ret['exec'] = true;
                    $ret['mens'] = 'Executado com sucesso';
                } else {
                    $ret['exec'] = false;
                    $ret['mens'] = "O arquivo JSON está corrompido ou não é válido.";
                }
            } else {
                $datasalv[] = $data;
                $jsonData = json_encode($datasalv, JSON_PRETTY_PRINT);
                // Salva no diretório especificado
                Storage::put($caminho, $jsonData);
                $ret['exec'] = true;
                $ret['mens'] = 'Executado com sucesso';
            }
        } catch (\Throwable $th) {
            //throw $th;
            $ret['exec'] = false;
            $ret['error'] = $th->getMessage();
            // $ret['mens'] = 'Erro';
        }
        return $ret;
    }
    /**
     * Metodo padrão para gravar e atualizar qualquer tabela
     * @param string $tab nome da tabela para ser cadastrado os dados
     * @param array $dados array contendo os nomes de campos com seus respectivos valores..
     * @param bool $edit opções false| true controla a Edição ou não edição de um registro encontrado, caso     encontre um registro similar a opão false somente informa que o registro foi encontrado true pode alterar
     * @param bool $edit opções false| true controla a Edição ou não edição de um registro encontrado, caso     encontre um registro similar a opão false somente informa que o registro foi encontrado true pode alterar
     * @param array $customDefaults ativa uma funcionalidade para encontrar colunas do banco que não tem valor padrão e troca pelos valores padrão desta variavel
     */
    static function update_tab($tab='',$dados=[],$where='',$edit=true,$customDefaults=[]){
        // $dados = [
        //     'Nome' => 'Maria',
        //     'Email' => 'maria@example.com',
        //     'token' => uniqid(),
        //     'senha' => bcrypt('senha_secreta')
        // ];
        //veriricar se ja existe
        $ret['exec'] = false;
        $ret['mens'] = 'Erro ao salvar';
        $ret['color'] = 'danger';
        try {
            if(count($customDefaults)==0){
                $customDefaults = ['data'=>now()];
            }
            // dd($dados);
            if(is_array($dados)){
                // 1. Filtrar o $data para remover chaves que não existem nas colunas
                $filteredData = self::filterDataByTableColumns($tab, $dados,$customDefaults);
                // dd($dados,$filteredData);
                if(!empty($where)){
                    $d = DB::select("SELECT id FROM $tab $where");
                    $id = isset($d[0]->id) ? $d[0]->id : null;
                    if($id){
                        if($edit==='edit_all'){
                            foreach ($d as $k => $v) {
                                $id = $d[$k]->id;
                                $salva = DB::table($tab)->where('id', $id)->update($filteredData);
                                if($salva){
                                    $ret['exec'] = true;
                                    $ret['data'][$id]['idCad'] = $id;
                                    $ret['data'][$id]['dados'] = $filteredData;
                                    $ret['data'][$id]['color'] = 'success';
                                    $ret['data'][$id]['mens'] = 'Registro atualizado com sucesso!';
                                    $ret['mens'] = $ret['data'][$id]['mens'];
                                    $ret['color'] = $ret['data'][$id]['color'];
                                }else{
                                    $ret['mens'] = $ret['data'][$id]['mens'];
                                    $ret['color'] = $ret['data'][$id]['color'];
                                    $ret['data'][$id]['exec'] = true;
                                    $ret['data'][$id]['idCad'] = $id;
                                    $ret['data'][$id]['dados'] = $filteredData;
                                    $ret['data'][$id]['color'] = 'success';
                                    $ret['data'][$id]['mens'] = 'Registro sem necessidade de atualização!';
                                }
                            }
                        }elseif($edit===true){
                            $salva = DB::table($tab)->where('id', $id)->update($filteredData);
                            if($salva){
                                $ret['exec'] = true;
                                $ret['idCad'] = $id;
                                $ret['dados'] = $filteredData;
                                $ret['color'] = 'success';
                                $ret['mens'] = 'Registro atualizado com sucesso!';
                            }else{
                                $ret['exec'] = true;
                                $ret['idCad'] = $id;
                                $ret['dados'] = $filteredData;
                                $ret['color'] = 'success';
                                $ret['mens'] = 'Registro sem necessidade de atualização!';
                            }
                        }else{
                            $ret['exec'] = false;
                            $ret['idCad'] = $id;
                            $ret['dados'] = $filteredData;
                            $ret['color'] = 'warning';
                            $ret['mens'] = 'Registro encotrado!';
                        }
                    }else{
                        $id = DB::table($tab)->insertGetId($filteredData);
                        if($id){
                            $ret['exec'] = true;
                            $ret['idCad'] = $id;
                            $ret['dados'] = $filteredData;
                            $ret['color'] = 'success';
                            $ret['mens'] = 'Registro criado com sucesso!';
                        }
                    }
                }else{
                    $id = DB::table($tab)->insertGetId($filteredData);
                    if($id){
                        $ret['exec'] = true;
                        $ret['idCad'] = $id;
                        $ret['dados'] = $dados;
                        $ret['color'] = 'success';
                        $ret['mens'] = 'Registro criado com sucesso!';
                    }
                }
            }else{
                $ret['exec'] = false;
                // $ret['idCad'] = $id;
                $ret['dados'] = $dados;
                $ret['color'] = 'danger';
                $ret['mens'] = 'A variavel de dados não é array válido!';
            }
        } catch (\Throwable $th) {
            $ret['exec'] = false;
            // $ret['idCad'] = $id;
            $ret['error'] = $th->getMessage();
            $ret['mens'] = 'Erro ao cadastrar registro!';
            $ret['color'] = 'danger';
            //throw $th;
        }
        return $ret;
    }
    /**
     * Funcção filtrar dados de colunas das tabelas
     * Schema::getColumnListing('users'): pega todas as colunas da tabela users.
     * array_filter(..., ARRAY_FILTER_USE_KEY): filtra $data pelas chaves (nomes dos campos), comparando com as colunas reais.
     */
    static function filterDataByTableColumns(string $table, array $data, array $customDefaults=[]): array {
        $columns = Schema::getColumnListing($table);
        // dd(count($customDefaults));
        if(count($customDefaults)>0){
            $columnsInfo = DB::select("
                SELECT COLUMN_NAME, COLUMN_DEFAULT, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = ? AND TABLE_SCHEMA = DATABASE()
            ", [$table]);
            $filteredData = array_filter(
                $data,
                fn($key) => in_array($key, $columns),
                ARRAY_FILTER_USE_KEY
            );
            foreach ($columnsInfo as $column) {
                $colName = $column->COLUMN_NAME;
                $hasDefaultInDB = $column->COLUMN_DEFAULT !== null;
                $isNullable = $column->IS_NULLABLE === 'YES';

                if (!array_key_exists($colName, $filteredData) && !$hasDefaultInDB && !$isNullable) {
                    // Aqui você define os seus valores padrão customizados
                    // $customDefaults = [
                    //     'role' => 'user',
                    //     'status' => 'active',
                    //     'created_at' => now(),
                    //     'updated_at' => now(),
                    // ];

                    // Se tiver um valor padrão definido no código, usa ele
                    if (array_key_exists($colName, $customDefaults)) {
                        $filteredData[$colName] = $customDefaults[$colName];
                    }
                }
            }
            return $filteredData;
        }else{
            return array_filter($data, fn($key) => in_array($key, $columns), ARRAY_FILTER_USE_KEY);
        }
    }
    /**
     * Metodo para excluir um registro
     * @param array $config [
    						*	'tab'=>$tab_l,
    						*	'campo_id'=>'id',
    						*	'id'=>$id,
    						*	'nomePost'=>'Lead promovido a cliente',
    						*	'campo_bus'=>'id',
    						*];
     */
    static function excluirUm($config=[]){
        $tab = isset($config['tab']) ? $config['tab'] : '';
        $campo_id = isset($config['campo_id']) ? $config['campo_id'] : '';
        $id = isset($config['id']) ? $config['id'] : '';
        $nomePost = isset($config['nomePost']) ? $config['nomePost'] : '';
        $campo_bus = isset($config['campo_bus']) ? $config['campo_bus'] : '';
        if($config){
            global $suf_in;
            $suf_in = '_cs_aero';

            $config['campo_bus'] = isset($config['campo_bus'])?$config['campo_bus']:'nome';
            $reg_excluido = array(
                'excluidopor'=>	@$_SESSION[$suf_in]['id'.$suf_in],
                'excluido_data'=>date('d/m/Y H:m:i'),
                'tab'=>$config['tab'],
                'nome'=>urldecode($config['nomePost']).'|'.self::buscaValorDb0($config['tab'],$config['campo_id'],$config['id'],$config['campo_bus']),
            );

            /*

            $config = array(

                'tab'=>'',

                'campo_id'=>'id',

                'id'=>12,

                'nomePost'=>'Cliente',

                'campo_bus'=>'Placa',

            );

            */
            // lib_print($config);
            $sql3 = false;
            if(self::qoption ('lixeira') && self::qoption('lixeira') == 's'){

                if(isset($config['sec']) && $config['sec'] =='ganhos'){
                    //Presisamos excluir os envtos tbm
                    $sql3 = "UPDATE IGNORE `".$GLOBALS['tab40']."` SET excluido = 's',reg_excluido = '".json_encode($reg_excluido)."' WHERE `id_matricula` = '".$config['id'] ."'";
                    $config['tab'] = $GLOBALS['tab12'];
                    $sql3 = self::update_tab($GLOBALS['tab12'],[
                        'excluido' => 's',
                        'reg_excluido' => json_encode($reg_excluido),
                    ]," WHERE `id_matricula` = '".$config['id'] ."'");

                }else{
                    $sql3 = self::update_tab($config['tab'],[
                        'excluido' => 's',
                        'reg_excluido' => json_encode($reg_excluido),
                    ]," WHERE `".$config['campo_id']."` = '".$config['id'] ."'");

                }
                // $sql = "UPDATE `".$config['tab']."` SET excluido = 's',reg_excluido = '".json_encode($reg_excluido)."' WHERE `".$config['campo_id']."` = '".$config['id'] ."'";

            }else{
                $sql3 = DB::table($config['tab'])->where($config['campo_id'],'=',$config['id'])->delete();
                // $sql = "DELETE FROM ".$config['tab']." WHERE `".$config['campo_id']."` = '".$config['id']."'";

            }

            // $deletar = salvarAlterar($sql);

            $mess = false;

            if($sql3){
                $mess .= self::formatMensagem0('<strong>Sucesso: </strong>'.$config['nomePost'].' deletado com sucesso!!','success',10000);

                $ret['exec'] = true;
                // if(isset($config['sec']) && $config['sec'] == 'ganhos'){
                // 	$urldeleteEv = "UPDATE `".$GLOBALS['tab40']."` SET excluido = 's',reg_excluido = '".json_encode($reg_excluido)."' WHERE `id_matricula` ='".$config['id']."' AND situacao='g' ";
                // 	$deletar = salvarAlterar($urldeleteEv);
                // }
                // if(isset($config['local'])){

                //     if($config['local']=='cupom_produtos' && isset($config['id_produto'])){

                //         $prod = new produtos;

                //         $ret['list'] = $prod->listaPromocao($config['id_produto']);



                //     }

                // }

            }else{

                $mess = self::formatMensagem0('<strong>Erro: </strong>Ao deletar '.$config['nomePost'].'!!','danger',10000);	$ret['exec'] = false;

            }

            $ret['mess'] = $mess;

            // if(self::isAdmin(1)){

            //     $ret['sql'] = $sql;
            //     $ret['sql3'] = @$sql3;
            // }


        }
    }
    static function deletar_registro($tab,$id){
        return  DB::table($tab)->where('id','=',$id)->delete();
    }
    /**
     * Metodo para baixar um arquivo remoto e salvar em disco do servidor
     */
    static function download_file($url=false,$caminhoSalvar=false){
        $ret = ['exec'=>false,'mens'=>false,'color'=>'danger','status'=>false];
        if($url && $caminhoSalvar){
            $response = Http::get($url);
            $delete = false;
            if (Storage::exists($caminhoSalvar)) {
                $delete = Storage::delete($caminhoSalvar);
            }
            if ($response->successful()) {
                // Salvar no disco local
                Storage::put($caminhoSalvar, $response->body());
                $ret = ['exec'=>true,'mens'=>'Arquivo baixado e salvo com sucesso!','delete'=>$delete,'color'=>'success','status'=>$response->status()];
            }else{
                $ret = ['exec'=>false,'mens'=>'Erro ao baixar o arquivo remoto!','color'=>'danger','status'=>$response->status()];
            }
        }
        return $ret;
    }
    /**
     * Metodo para retornar os dados de usuario apartir de uma condição
     */
    static function get_user_data($condicao=false){
        $ret = false;
        if($condicao){
            $du = self::buscaValoresDb_SERVER("SELECT * FROM usuarios_sistemas $condicao ORDER BY id DESC LIMIT 1");
            if(isset($du[0])){
                $ret = $du[0];
            }
        }
        return $ret;
    }

    /**
     * Metodo para renderizar campos para um formulario apartir de um array
     */
    static function formCampos($config=[]){
        if(count($config)>0){
            return view('qlib.formulario',$config);
        }
    }
    static function add_user_tenant($id,$dominio){
        $tenant1 = Tenant::create(['id' => $id]);
        $tenant1->domains()->create(['domain' => $dominio]);
        return $tenant1;
    }
    static function token($tp=1){
        if($tp==1){
            // UUID v4
            return (string) Str::uuid();
        }elseif($tp==2){
            // UUID v7
            return (string) Str::random(60);
        }
    }
    static function get_user_name($id){
        $ret = false;
        if($id){
            return self::buscaValorDb('users','id',$id,'name');
        }
        return $ret;
    }
    /**
     * Metodo para retornado todos os dado de uma categoria atravez do id
     *
     * @param int $id
     * @return json
     */
    static function get_category_by_id($id){
        $category = Category::find($id);
        return $category;
    }
    /**
     * retorna os dados de uma unidade de medida
     */
    static function get_unit_by_id($id){
        $unit = ProductUnit::find($id);
        $unitMap = (new ProductUnitController())->map_product_unit($unit);
        // dd($unitMap);
        return $unitMap;
    }
    static function get_client_by_id($id){
        $client = Client::findOrFail($id);
        // Converter config para array
        if (is_string($client->config)) {
            $client->config = json_decode($client->config, true) ?? [];
        }
        return $client;
    }
    // verifica se o tenant é do crm do aeroclubejf ou seja se o id do tenant atual é = api-crm
    static function is_crm_aero(){
        $tenant_id = tenant('id');
        if($tenant_id == 'api-crm'){
            return true;
        }else{
            return false;
        }
    }
    /**
     * externa o link do frontend que está na tabela opcoes
     */
    static function get_frontend_url(){
        $frontendUrl = self::qoption('default_frontend_url');
        return $frontendUrl;
    }
    /**
     * externa link da logo cadastrado na tabela opcoes
     */
    static function get_logo_url(){
        $logoUrl = self::qoption('app_logo_url');
        return $logoUrl;
    }
    /**
     * externa o nome da empresa cadastrado na tabela opcoes
     */
    static function get_company_name(){
        $companyName = self::qoption('app_institution_name');
        return $companyName;
    }

}
