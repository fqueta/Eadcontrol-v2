<?php
namespace App\Services;

use App\Helpers\TemaEAD;
use App\Jobs\PresencaEmMassaJob;
use App\Models\Matricula;
use App\Models\Tenant;
use App\Services\Qlib;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request;

class Escola
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

    static function campo_emissiao_certificado(){
		return 'emissao_certificado';
	}
	static function get_token_matricula($id=false){
		$token_matricula = false;
		if(isset($id)){
			$token_matricula = Qlib::buscaValorDb($GLOBALS['tab12'],'id',$id,'token');
		}
		return $token_matricula;
	}
    /**
     * Dados de um orçamento ou dados da matricula
     * @param string $token
     * @param array $ret
     */
    // static function dm($token){
    //     $dm = Matricula::select('matriculas.*',
    //     'clientes.Nome','clientes.sobrenome','clientes.telefonezap','clientes.Tel','clientes.Email','clientes.Cpf as cpf_aluno',
    //     'clientes.nacionalidade',
    //     'clientes.Endereco',
    //     'clientes.Numero',
    //     'clientes.Bairro',
    //     'clientes.Cidade',
    //     'clientes.Uf',
    //     'clientes.Cep As cep',
    //     'clientes.Compl',
    //     'clientes.Ident As identidade',
    //     'clientes.DtNasc2 As data_nascimento',
    //     'clientes.estado_civil',
    //     'clientes.profissao',
    //     'cursos.tipo as tipo_curso','cursos.config','cursos.modulos as modulos_curso','cursos.parcelas as parcelas_curso','cursos.valor_parcela as valor_parcela_curso','cursos.nome as nome_curso','cursos.titulo as titulo_curso','cursos.inscricao as inscricao_curso','cursos.valor as valor_curso','cursos.token as token_curso')
    //     ->join('clientes','matriculas.id_cliente','=','clientes.id')
    //     ->join('cursos','matriculas.id_curso','=','cursos.id')
    //     ->where('matriculas.token',$token)
    //     ->get();
    //     if($dm->count() > 0){
    //         $dm = $dm->toArray();
    //         $dm = $dm[0];
    //         $link_orcamento = $this->link_orcamento($dm['token']);
    //         $link_assinatura = $this->link_assinatura($dm['token']);
    //         if(isset($dm['contrato']) && is_string($dm['contrato'])){
    //             if(json_validate($dm['contrato'])){
    //                 $dm['contrato'] = Qlib::lib_json_array($dm['contrato']);
    //             }
    //         }
	// 		$dm['link_orcamento'] = $link_orcamento;
	// 		$dm['link_assinatura'] = $link_assinatura;
	// 		$dm['numero_contrato'] = $this->numero_contrato($dm['id']);
    //         $dm['nome_completo'] = str_replace($dm['sobrenome'],'',$dm['Nome']) .' '.trim($dm['sobrenome']);
	// 		// $dm['consultor'] = $dm['seguido_por'];
	// 		$link_guru = isset($dm['zapguru']) ? $dm['zapguru'] : false;
	// 		if(is_string($link_guru)){
	// 			$arr_link = Qlib::lib_json_array($link_guru);
	// 			$link_guru = isset($arr_link['link_chat']) ? $arr_link['link_chat'] : '';
	// 		}
	// 		$dm['link_guru'] = $link_guru;
    //         $dm['valor_orcamento'] = $dm['total'];
    //         if(isset($dm['desconto']) && $dm['desconto'] > 0){
    //             $dm['valor_orcamento'] = $dm['subtotal']-$dm['desconto'];
    //         }
    //         $campo_processo_zapsing = (new ZapsingController )->campo_processo;
    //         $dm['webhook_zapsing'] = null;
    //         if(isset($dm['id']) && ($id_orcamento=$dm['id'])){
    //             $web = Qlib::get_matriculameta($id_orcamento,$campo_processo_zapsing,true);
    //             if($web){
    //                 $dm['webhook_zapsing'] = Qlib::lib_json_array($web);
    //             }
    //         }
    //     }else{
    //         return false;
    //     }
    //     $ret = $dm;
    //     return $ret;
    // }
	static function dadosMatricula($token_matricula=false,$compleSql=false){
        $dadosMatricula = false;
        global $tab10,$tab11,$tab12,$tab15,$tab54;
        $tab10 = 'cursos';
        $tab11 = 'turmas';
        $tab12 = 'matriculas';
        $tab15 = 'clientes';
        $tab54 = 'aeronaves';
        if($token_matricula){

			$dadosMatricula = Qlib::dados_tab('matriculas as m',

					'm.*,m.token token_matricula,c.inscricao,c.titulo nome_curso,c.conteudo,c.token token_curso,c.parcelas,c.valor_parcela,c.valor,c.duracao,c.unidade_duracao,cli.nome,cli.sobrenome,cli.Cpf cpf_aluno,cli.id_asaas,cli.Email,cli.config config_aluno,c.config config_curso',
					"
					JOIN ".$GLOBALS['tab10']." as c ON m.id_curso=c.id

					JOIN ".$GLOBALS['tab15']." as cli ON m.id_cliente=cli.id

					WHERE m.token='".$token_matricula."' $compleSql AND ".Qlib::compleDelete('m')
			);
		}elseif($compleSql){
			$dadosMatricula = Qlib::dados_tab('matriculas as m',

					'm.*,m.token token_matricula,c.tipo tipo_curso,c.inscricao,c.titulo nome_curso,c.token token_curso,c.parcelas,c.valor_parcela,c.valor,cli.nome,cli.sobrenome,cli.Cpf cpf_aluno,cli.config config_aluno,c.config config_curso',
					"
					JOIN ".$GLOBALS['tab10']." as c ON m.id_curso=c.id

					JOIN ".$GLOBALS['tab15']." as cli ON m.id_cliente=cli.id

					$compleSql AND ".Qlib::compleDelete('m')

			);
		}
		//Adiconar nome da turma
		if(isset($dadosMatricula[0]['id_turma']) && $dadosMatricula[0]['id_turma'] != ''){
			$dadosMatricula[0]['nome_turma'] = Qlib::buscaValorDb($GLOBALS['tab11'],'id',$dadosMatricula[0]['id_turma'],'nome');
			$dadosMatricula[0]['inicio_turma'] = Qlib::buscaValorDb($GLOBALS['tab11'],'id',$dadosMatricula[0]['id_turma'],'inicio');
			$dadosMatricula[0]['fim_turma'] = Qlib::buscaValorDb($GLOBALS['tab11'],'id',$dadosMatricula[0]['id_turma'],'fim');
		}
		return $dadosMatricula;

	}
	/**
	 * Metodo para verifica que o contrato está assinado
	 * @param int $id_matricula
	 * @return boolean true|false
	 */
	static function contrato_assinado($id_matricula,$exibe_dados=false){
		//uso Escola::contrato_assinado($id_matricula);
		$ret = false;
		$json_c = Qlib::buscaValorDb($GLOBALS['tab12'],'id',$id_matricula,'contrato');
		if($json_c){
			$c = lib_json_array($json_c);
		}
		if(isset($c['aceito_contrato']) && $c['aceito_contrato']=='on'){
			if($exibe_dados){
				$ret = $c;
			}else{
				$ret = true;
			}
		}
		return $ret;
	}
	/**
	 * Gera uma página de historico em html para ser exibido no admin ou no site
	 * @param string $token_matricula token da matricula
	 * uso $ret = Escola::pagina_historico($token_matricula);
	 */
	static function pagina_historico($token_matricula=false,$dm=false){
		if($token_matricula && !$dm){
			$dm = self::dadosMatricula($token_matricula);
		}
		$historico = self::historico($token_matricula);
		ob_start();
		?>
		<div class="row">
			<div class="col-sm-12">
				{historico}
			</div>
		</div>
		<?
		$ret = ob_get_clean();
		$ret = str_replace('{historico}', $historico, $ret);
		return $ret;
	}
	static function historico($token_matricula=false){
		$dm = self::dadosMatricula($token_matricula);
		if($dm){
			$dm = $dm[0];
			// lib_print($dm);
		}
		$aluno = isset($dm['nome']) ? $dm['nome'] : '';
		$aluno .= ' ';
		$aluno .= isset($dm['sobrenome']) ? $dm['sobrenome'] : '';
		if(!isset($dm['id_curso'])){
			return false;
		}
		$conteudo = Qlib::buscaValorDb($GLOBALS['tab10'],'id',$dm['id_curso'],'conteudo');
		$periodo = isset($dm['nome_turma']) ? $dm['nome_turma'] : false;
		$arr_cont = lib_json_array($conteudo);
		$rendimento = '';
		ob_start();
		?>
		<div class="row ml-0 mr-0">
			<div class="col-xs-12 text-right">
				<small>
					<b for="">
						ID matricula:
					</b>
					<span style="font-weight: 500;">
						{id}
					</span>
					<b for="">
						ID aluno:
					</b>
					<span style="font-weight: 500;">
						{dados_cliente}
					</span>
				</small>
			</div>
			<div class="col-sm-6">
				<h5>
					<b for="">
						Curso:
					</b>
					<span style="font-weight: 500;">
						{nome_curso}
					</span>
				</h5>
			</div>
			<div class="col-sm-6">
				<div class="row">
					<div class="col-xs-12" style="border-bottom: 1px;">
						<b>ALUNO:</b>
						<span>{aluno}</span>
					</div>
					<div class="col-xs-12" style="border-bottom: 1px;">
						<b>PERÍODO:</b>
						<span>{periodo}</span>
					</div>
				</div>
			</div>
			<div class="col-sm-12">
				<table class="table table-striped table-frequencia">
					<thead>
						<tr>
							<th>MATÉRIA</th>
							<th class="text-center">CARGA HORÁRIA</th>
							<th class="text-center">FREQUÊNCIA</th>
							<th class="text-right">RENDIMENTO</th>
						</tr>
					</thead>
					<tbody>
						{conteudo_modulos}
					</tbody>
				</table>
			</div>
			<div class="col-sm-12" style="margin: 20px 0 0;">
				<table class="table table-striped tale-provas">
					<thead>
						<tr>
							<th>PROVAS</th>
							<th class="text-right">RENDIMENTO</th>
						</tr>
					</thead>
					<tbody>
						{conteudo_provas}
					</tbody>
				</table>
			</div>
		</div>
		<div class="row pt-4 hidden-print text-right" style="margin-top: 28px;margin-bottom: 28px;">
			<div class="col-xs-12">
				<button type="button" onclick="window.print();" class="btn btn-default">
					<i class="fa fa-print"></i> Imprimir
				</button>
			</div>
		</div>

		<?
		$conteudo_modulos = false;
		$conteudo_provas = false;
		$tema2 = '
			<tr>
				<td>{nome_modulo}</td>
				<td class="text-center">{carga_modulo} H/A</td>
				<td class="text-center">{frequencia}%</td>
				<td class="text-right">{rendimento}</td>
			</tr>
		';
		$tema3 = '
			<tr>
				<td>{prova}</td>
				<td class="text-right">{rendimento}</td>
			</tr>';
		$criterio_aprovacao = 70;
		if(is_array($arr_cont)){
			foreach ($arr_cont as $kc => $vc) {
				$frequ = self::frequencia_modulo($dm['id'],$vc['idItem']);
				$frequencia = isset($frequ['porcentagem']) ? $frequ['porcentagem'] : 0;
				if($frequencia >= $criterio_aprovacao){
					$rendimento = 'APROVADO';
				}else{
					$rendimento = 'REPROVADO';
				}
				$carga_horaria = isset($frequ['carga_horaria']) ? $frequ['carga_horaria'] : 0;
				$conteudo_modulos .= str_replace('{nome_modulo}', $vc['nome'],$tema2);
				$conteudo_modulos = str_replace('{frequencia}', $frequencia,$conteudo_modulos);
				$conteudo_modulos = str_replace('{carga_modulo}', $carga_horaria,$conteudo_modulos);
				$conteudo_modulos = str_replace('{rendimento}', $rendimento,$conteudo_modulos);
				if(isset($_GET['fr'])){
					lib_print($frequ);
				}
			}
		}
		$dp = self::get_provas($dm['id_curso']);
		// lib_print($dp);
		if(is_array($dp)){
			foreach ($dp as $kp => $vp) {
				$nome = $vp['nome'];
				$link_prova = RAIZ.'/cursos?acao=view&opc=resumo_prova&id_atividade='.$vp['id'].'&id_cliente='.$dm['id_cliente'].'&id_matricula='.$dm['id'];
				// $link_prova = "javascript:abrirjanelapadrao('$link_prova','imprime_prova')";
				$nome = '<span class="hidden-print"><a target="_BLANK" href="'.$link_prova.'" style="text-decoration:underline">'.$nome.'</a></span><span class="hidden-screen">'.$nome.'</span>';
				$rendimento = self::aproveitamento_prova($vp['id'],$dm['id_cliente'],$dm['id']);
				$conteudo_provas .= str_replace('{prova}', $nome,$tema3);
				$conteudo_provas = str_replace('{rendimento}', @$rendimento,$conteudo_provas);

			}
		}
		$ret = ob_get_clean();
		$ret = str_replace('{nome_curso}', @$dm['nome_curso'], $ret);
		$ret = str_replace('{id}', @$dm['id'], $ret);
		$ret = str_replace('{dados_cliente}', @$dm['id_cliente'], $ret);
		$ret = str_replace('{aluno}', $aluno, $ret);
		$ret = str_replace('{conteudo_modulos}', $conteudo_modulos, $ret);
		$ret = str_replace('{conteudo_provas}', $conteudo_provas, $ret);
		$ret = str_replace('{periodo}', $periodo, $ret);
		return $ret;
	}
	/**
	 * retorna um array de todas as provas de um determinado curso
	 * @param int $id_curso
	 * @return array $ret
	 */
	static function get_provas($id_curso){
		// $dp = Qlib::dados_tab('conteudo_ead','*',"WHERE id_curso='$id_curso'",true);
		//encontar os modulos do curso
		$conteudo = Qlib::buscaValorDb($GLOBALS['tab10'],'id',$id_curso,'conteudo');
		$arr_cont = lib_json_array($conteudo);
		$prova = false;
		if(is_array($arr_cont)){
			$prova = [];
			foreach ($arr_cont as $k => $value) {
				$cont_modulo = Qlib::buscaValorDb($GLOBALS['tab38'],'id',@$value['idItem'],'conteudo');
				$arr_cont_mod = lib_json_array($cont_modulo);
				if(is_array($arr_cont_mod)){
					foreach ($arr_cont_mod as $km => $vm) {
						$idAtv = $vm['idItem'];
						$dados = Qlib::dados_tab('conteudo_ead','*',"WHERE id=$idAtv AND tipo='Prova' AND ".Qlib::compleDelete());
						if($dados){
							// $prova[$value['idItem'].'_'.$vm['idItem']] = $dados;
							array_push($prova,$dados[0]);
						}
					}
				}

			}

		}
		if($prova){
			return $prova;
		}else{
			return false;
		}
	}
	static function resumo_prova($config){
		// $config = array('id_atividade'=>,'id_matricula'=>,'id_cliente'=>,);
		$conteudo = '';
		$btn_acao = '';
		$header = '';
		if(isset($config['id_atividade']) && isset($config['id_cliente']) && isset($config['id_matricula'])){
			$cont = self::provaToda($config);
			$nome = isset($cont['nome_prova']) ? $cont['nome_prova'] : '';
			$header = '<h4>'.$nome.'</h4>';
			if(isset($cont['html']) && $conteudo=$cont['html']){
				$btn_acao = '<button type="button" class="btn btn-default hidden-print" onclick="window.print();"><i class="fa fa-print"></i>  Imprimir</button>';
			}
		}
		ob_start();
		?>
		<div class="container">
			<div class="row">
				<div class="col-md-12 mb-5 pb-5 text-right">
					{btn_acao}
				</div>
				<div class="col-md-12 mt-4 mb-4 text-center">
					{header}
				</div>
				<div class="col-md-12">
					{conteudo}
				</div>
				<div class="col-md-12 mb-5 pb-5 text-right">
					{btn_acao}
				</div>
			</div>
		</div>
		<?
		$ret = ob_get_clean();
		$ret = str_replace('{conteudo}',$conteudo,$ret);
		$ret = str_replace('{header}',$header,$ret);
		$ret = str_replace('{btn_acao}',$btn_acao,$ret);
		return $ret;
	}
	/**
	 * Retorna um resumo da prova
	 * @param $config = array('id_atividade'=>,'id_matricula'=>,'id_cliente'=>,);
	 */
	static function provaToda($config=false){
		$ret['html'] = '';
		$ret['resumo'] = [];
		$ret['turma'] = '';
		$ret['aluno'] = '';
		$ret['aprovado'] = 'n';
		$ret['total_questoes'] = 0;
		$ret['nome_turma'] = '';
		$ret['nome_curso'] = '';
		$ret['aluno'] = '';
		$ret['nome_prova'] = '';
		$col = 'xs';
		if(isset($config['id_atividade'])&&isset($config['id_matricula'])&&isset($config['id_cliente'])){
			$ead = new TemaEAD;
			$pt_dinamico = $ead->pt_dinamico($config['id_atividade']);
			$sql = "SELECT * FROM ".'frequencia_alunos'." WHERE id_atividade= '".$config['id_atividade']."' AND id_matricula= '".$config['id_matricula']."' AND id_cliente= '".$config['id_cliente']."' ";
			$dados = Qlib::buscaValoresDb($sql);
			$configAtividade = false;
			$dp = Qlib::dados_tab('conteudo_ead','*',"WHERE id='".$config['id_atividade']."'");
			// $configAtividade = Qlib::buscaValorDb('conteudo_ead','id',$config['id_atividade'],'config');
			// $nome_exibicao = Qlib::buscaValorDb('conteudo_ead','id',$config['id_atividade'],'nome_exibicao');
			// lib_print($dados);
			if($dp){
				$tm = self::get_token_by_id($config['id_matricula']); //Tokem matricula
				$dm = self::dadosMatricula($tm);//dados da matricula;
				$nome = isset($dp[0]['nome_exibicao']) ? $dp[0]['nome_exibicao'] : '';
				$configAtividade = isset($dp[0]['config']) ? $dp[0]['config'] : '';
				$ret['nome_turma'] = isset($dm[0]['nome_turma']) ? $dm[0]['nome_turma'] : '';
				$ret['nome_curso'] = isset($dm[0]['nome_curso']) ? $dm[0]['nome_curso'] : '';
				$ret['aluno'] = isset($dm[0]['aluno']) ? $dm[0]['aluno'] : '';
				$ret['nome_prova'] = $nome;
				$ret['head']=[
					'Aluno:' => $ret['aluno'],
					'Nome do curso:' => $ret['nome_curso'],
					'Nome do turma:' => $ret['nome_turma'],
				];
				$temada1 = '
				<div class="row">
					<div class="col-md-12" style="margin:10px 0px">
						<table class="table">
							<tbody>
								{tr}
							</tbody>
						</table>
					</div>
				</div>
				';//dados do aluno
				$temada2 = '
						<tr>
							<td>
								{label}
							</td>
							<td>
								{value}
							</td>
						</tr>
				';
				$temada3 = '
						<tr>
							<td colspan="2">
								<div align="center">
									{value}
								</div>
							</td>
						</tr>
				';
				$cda = '';
				foreach ($ret['head'] as $kh => $vh) {
					$cda .= str_replace('{label}','<b>'.$kh.'</b>',$temada2);
					$cda = str_replace('{value}',$vh,$cda);
				}
				$inicio_prova = dataExibe($dados[0]['data']);
				$fim_prova = dataExibe($dados[0]['ultimo_acesso']);
				$vh = '<b>Inicio:</b> '.$inicio_prova.' <b>Fim:</b> '.$fim_prova.'';
				$cda .= str_replace('{value}',$vh,$temada3);
				$ret['html'] .= str_replace('{tr}',$cda,$temada1);

			}
			$total_pontos = $ead->get_total_pontos($config['id_atividade']);
			$total_questoes = $ead->get_total_questions($config['id_atividade']);
			$ret['total_questoes'] = $total_questoes;
			$ret['total_pontos'] = $total_pontos;
			// $tema1 = '
			// 		<ul class="list-group">
			// 		{li}
			// 		</ul>

			// 		';
			// $tema2 = '
			// 		<li class="list-group-item {active}">
			// 		{conteudo}
			// 		</li>
			// 		';

			if(empty($dados[0]['config'])){
				$li = false;
				// $conteudo = '<div class="row">
				// 						<div class="col-'.$col.'-4">Questões</div>
				// 						<div class="col-'.$col.'-4">Resposta</div>
				// 						<div class="col-'.$col.'-2">Pts Questão</div>
				// 						<div class="col-'.$col.'-2" title="pontos alcançados">Pts Alc</div>
				// 					</div>';
				// $li = str_replace('{conteudo}',$conteudo,$tema2);
				// $li = str_replace('{active}','active',$li);

				// $ret['html'] = str_replace('{li}',$li,$tema1);
				$ret['totalPontosDistribuidos'] = 0;
				$ret['totalAlcancado'] = 0;
			}else{
				// $ret['sql'] = $sql;
				// $ret['config'] = $config;
				// $ret['dados'] = $dados;
				// $ret['tk_prova'] = $tk_prova;
				// $tk_prova = Qlib::buscaValorDb('conteudo_ead','id',$config['id_atividade'],'token');

				$arr_config = json_decode($dados[0]['config'],true);
				if(is_array($arr_config)){
					// dd($arr_config);
					// $li = false;
					// $conteudo = '<div class="row">
					// 						<div class="col-'.$col.'-4">Questões</div>
					// 						<div class="col-'.$col.'-4">Resposta</div>
					// 						<div class="col-'.$col.'-2">Pts Questão</div>
					// 						<div class="col-'.$col.'-2" title="pontos alcançados">Pts Alc</div>
					// 					</div>';
					// $li = str_replace('{conteudo}',$conteudo,$tema2);
					// $li = str_replace('{active}','active',$li);
					$pontos = 0;
					$totalAlcancado = 0;
					$totalErrados = 0;
					$totalPontosDistribuidos = 0;
					$totalRespondido = 0;
					$ret['total_respondido'] = 0;
					foreach($arr_config As $ky=>$vy){
						if($pt_dinamico=='s'){
							$token = isset($vy['tokenQuestao']) ? $vy['tokenQuestao'] : '';
							$pontos = $ead->pontos_questao($token);
						}else{
							$pontos = str_replace(',','.',$vy['pontosQuestao']);
						}

						$pontos = (double)$pontos;
						$totalPontosDistribuidos += $pontos;
						$totalRespondido ++;
						if($vy['respostaCorrecao']=='c'){
							$respostaCorrecao = '<i class="fa fa-check-circle"></i> Certa';
							$class = 'certa verde_lcf';
							@$totalAlcancado += $pontos;
						}elseif($vy['respostaCorrecao']=='e'){
							$totalErrados += $pontos;
							$respostaCorrecao = '<i class="fa fa-exclamation-circle"></i> Errada';
							$class = 'errada vermelho_lcf';
						}else{
							$respostaCorrecao = '';
							$class = '';
						}
						// $conteudo = '<div class="row '.$class.'">
						// 						<div class="col-'.$col.'-4">'.($vy['numQuestao']+1).'</div>
						// 						<div class="col-'.$col.'-4"> '.$respostaCorrecao.'</div>
						// 						<div class="col-'.$col.'-2">'.$pontos.'</div>
						// 						<div class="col-'.$col.'-2">'.$totalAlcancado.'</div>
						// 					</div>';
						// $cont = str_replace('{conteudo}',$conteudo,$tema2);
						// $cont = str_replace('{active}','',$cont);
						// $li .= $cont;
						$ret['total_respondido']++;
						$ret['html'] .= self::imprime_questao_prova($vy);
					}
					// $aprov = ($totalAlcancado * 100)/($totalPontosDistribuidos);
					$aprov = ($totalAlcancado * 100)/($total_pontos);
					$aprov = round($aprov);
					$arr_configAtiv['aproveitamento'] = '';
					if(!empty($configAtividade)){
						$arr_configAtiv = json_decode($configAtividade,true);
					}
					$aproveitamento = !empty($arr_configAtiv['aproveitamento'])? $arr_configAtiv['aproveitamento']:50;
					if($aprov < $aproveitamento){
						$classificaProva = 'Nota baixa';
						$clasClassific = 'badge-danger badge-error';
					}elseif($aprov >= $aproveitamento && $aprov < 100){
						$classificaProva = 'Nota boa';
						$clasClassific = 'badge-warning';
						if($ret['total_questoes'])
						// if($ret['total_questoes']==$ret['total_respondido']){
							$ret['aprovado'] = 's';
						// }
					}elseif($aprov >= $aproveitamento == 100){
						$classificaProva = 'Nota Excelente, Parabéns';
						$clasClassific = 'badge-success';
						// if($ret['total_questoes']==$ret['total_respondido']){
						$ret['aprovado'] = 's';
						// }
					}else{
						$classificaProva = false;
						$clasClassific = false;
					}
					$ret['resumo'] = [
						'Total de pontos <b>distribuidos</b>'=> $totalPontosDistribuidos,
						'Total de pontos <b>alcançados</b>'=> $totalAlcancado,
						'Total de pontos <b>perdidos</b>'=> $totalErrados,
						'<span class="tot">Total de questões:</span>'=> '<span class="classifica-prova badge badge-warning">'.$total_questoes.'</span>',
						'<span class="tot">Questões respondidas:</span>'=> '<span class="classifica-prova badge badge-warning">'.$totalRespondido.'</span>',
						'<span class="apv">Aproveitamento <b>'.$aprov.' %</b></span>'=> '<span class="classifica-prova badge '.$clasClassific.'">'.$classificaProva.'</span>',
						'Resultado final'=> '<span class="classifica-prova badge '.$clasClassific.'">'.$classificaProva.'</span>',
					];
					$ret['totalPontosDistribuidos'] = $totalPontosDistribuidos;
					$ret['totalAlcancado'] = $totalAlcancado;
					$ret['aproveitamento'] = $aprov;
					$ret['clasClassific'] = $clasClassific;
					$ret['classificaProva'] = $classificaProva;

					$ret['badge_aprov'] = '<span class="badge '.$clasClassific.'">'.$classificaProva.' <b>'.$aprov.' %</b></span>';
					$tmresumo1 = '
					<div class="row">
						<div class="col-md-12">
							<table class="table">
								<thead>
									<tr>
										<th colspan="2">
											<h4>
												Resumo
											</h4>
										</th>
									</tr>
								</thead>
								<tbody>
									{tr}
								</tbody>
							</table>
						</div>
					</div>
					';
					$tmresumo2 = '<tr>
										<td>
											{label}
										</td>
										<td>
											{valor}
										</td>
									</tr>';
					$tr = '';
					foreach ($ret['resumo'] as $k => $v) {
						$tr .= str_replace('{label}',$k,$tmresumo2);
						$tr = str_replace('{valor}',$v,$tr);
					}
					$ret['html'] .= str_replace('{tr}',$tr,$tmresumo1);
					$ret['totalPontosDistribuidos'] = $totalPontosDistribuidos;
					$ret['totalAlcancado'] = $totalAlcancado;
					// $ret['nome'] = $nome_exibicao;
				}
			}
		}else{
			$ret = formatMensagem('ACESSO negado falta dados. entre em contato com o suporte','danger');
		}
		// if(isset($_GET['fq']))
		// dd($ret);
		return $ret;
	}
	/**
	 * Retorna uma string com a questão toda da prova para que possa ser impresso caso necessario
	 * @param array $config=['tokenQuestao' => toquem da questão,'respostaCorrecao' => 'c se certa ou e se errada','respostaDada' => 'Resposta dada pelo aluno' ,'totalQuestoes' => 'total de questos' ,'respostaGabarito' => ''];
	 * @uso $ret = Escola::imprime_questao_prova(['tokenQuestao'=>'']);
	 */
	static function imprime_questao_prova($config){
		$tokenQuestao = isset($config['tokenQuestao']) ? $config['tokenQuestao'] : '';
		$respostaCorrecao = isset($config['respostaCorrecao']) ? $config['respostaCorrecao'] : '';
		$respostaDada = isset($config['respostaDada']) ? $config['respostaDada'] : '';
		$tmop1 = '<ul style="list-style: none;">{li}</ul>';
		$tmop2 = '<li>{checkbox} - {titulo} {gabarito} </li>';
		$opcoes = '';
		$opli = '';
		if($respostaCorrecao=='c'){
			$respostaCorrecao = '<b style="color:green">Certa</b>';
		}
		if($respostaCorrecao=='e'){
			$respostaCorrecao = '<b style="color:red">Errada</b>';
		}
		$dp = [];
		if($tokenQuestao){
			$dp = Qlib::dados_tab($GLOBALS['tab27'],'*',"WHERE token='$tokenQuestao'");
			if($dp){
				$dp = $dp[0];
				if(!empty($dp['config'])){
					$arr_conf = lib_json_array($dp['config']);
					$certa = isset($arr_conf['certa']) ? $arr_conf['certa'] : null;
					$pontos = isset($arr_conf['pontos']) ? $arr_conf['pontos'] : null;
					if(isset($arr_conf['opcao']) && is_array($arr_conf['opcao']) && ($arr_op=$arr_conf['opcao'])){
						foreach ($arr_op as $kop => $vop) {
							$num = $kop+1;
							if($num==$certa){
								$gabarito = '<b><small><i>(Resposta certa)</i></small></b>';
							}else{
								$gabarito = '';
							}
							if($num==$respostaDada){
								$checked = 'checked';
								$respostaluno = '<small><i>(Resposta do aluno)</i></small>';
							}else{
								$checked = '';
								$respostaluno = '';
							}
							$checkbox = '<input disabled type="checkbox" '.$checked.' />';
							$opli .= str_replace('{titulo}',$vop,$tmop2);
							$opli = str_replace('{num}',$num,$opli);
							$opli = str_replace('{gabarito}',$gabarito,$opli);
							$opli = str_replace('{checkbox}',$checkbox,$opli);
							$opli = str_replace('{respostaluno}',$respostaluno,$opli);
						}
						$opcoes = str_replace('{li}',$opli,$tmop1);
					}
				}

			}
		}
		$dp['opcoes'] = $opcoes;
		$dp['pontos'] = $pontos;
		$dp['respostaCorrecao'] = $respostaCorrecao;
		ob_start();
		?>
		<div class="row" style="border-bottom: #ccc 1px solid;">
			<div class="col-md-12 num-{id} mb-2">
				<h3 class="">{nome} <span class="badge">Pontos: {pontos}</span></h3>
				<p class="status qustao">
					{respostaCorrecao}
				</p>
				<p>
					{descricao}
				</p>
				{opcoes}
			</div>
		</div>
		<?
		$ret = ob_get_clean();
		foreach ($dp as $kp => $vp) {
			$ret = str_replace('{'.$kp.'}',$vp,$ret);
		}
		return $ret;
	}
	/**
	 * Metodo para retornar a carga horarária de um modulo em alguma curso
	 * @param int $id_modulo, string $unidade
	 * @return int $ret
	 */
	static function carga_horaria_curso($id_curso=null,$unidade='h'){
		$ret = 0;
		$segundo = 0;
		if($id_curso){
			$dcurso = Qlib::dados_tab($GLOBALS['tab10'],'*',"WHERE id='$id_curso'");
			if(!$dcurso){
				return false;
			}
			$dc = $dcurso[0];
			// $is_admin = is_admin();
			$cont = isset($dc['conteudo']) ? $dc['conteudo'] : [];
			$arr_mod = lib_json_array($cont);
			if(is_array($arr_mod)){
				foreach ($arr_mod as $km => $vm) {
					$id_modulo = isset($vm['idItem']) ? $vm['idItem'] : null;
					if($id_modulo){
						$carga = self::carga_horaria_modulo($id_modulo,'h',$id_curso);
						// lib_print($carga);
						$ret += (int)$carga;

					}
				}
			}
		}
		// dd($ret);
		return $ret;
	}
	/**
	 * Metodo para retornar a carga horarária de um modulo em alguma curso
	 * @param int $id_modulo, string $unidade
	 * @return int $ret
	 */
	static function carga_horaria_modulo($id_modulo=false,$unidade='h',$id_curso=false){
		$ret = 0;
		$segundo = 0;
		if($id_modulo){
			$dmod = Qlib::dados_tab($GLOBALS['tab38'],'*',"WHERE id=$id_modulo");
			if(isset($dmod[0]['conteudo']) && !empty($dmod[0]['conteudo'])){
				$arr_cont = lib_json_array($dmod[0]['conteudo']);
				if(is_array($arr_cont)){
					foreach ($arr_cont as $key => $value) {
						if($idAtv = @$value['idItem']){
							$c_hora = Qlib::dados_tab('conteudo_ead','duracao,unidade_duracao,id,tipo',"WHERE id=$idAtv AND ".Qlib::compleDelete());
							if($c_hora){
								$duracao = (int)$c_hora[0]['duracao'];
								if($c_hora[0]['unidade_duracao']=='min' && $duracao > 0){
									$duracao = $duracao*60;
								}
								$segundo += $duracao;
							}
						}
					}
					if($id_curso){
						//se a variavel id curso estiver ativa incluir tbm a carga horaria dos alividade do cronograma
						$atv_cronograma = Qlib::dados_tab('conteudo_ead','duracao,unidade_duracao,id,tipo',"WHERE id_curso='$id_curso' AND config LIKE '%\"modulo\":\"$id_modulo\"%' AND ".Qlib::compleDelete());
						if($atv_cronograma){
							foreach ($atv_cronograma as $k => $vcr) {
								$duracao = (int)$vcr['duracao'];
								if($vcr['unidade_duracao']=='min' && $duracao > 0){
									$duracao = $duracao*60;
								}
								$segundo += $duracao;

							}
						}
					}
					$ret = $segundo;
				}
			}
			if($segundo>0){
				if($unidade == 's'){
					//retorna o valor em segundos
					$ret = $segundo;
				}
				if($unidade == 'm'){
					//retorna o valor em minutos
					$ret = round(($segundo/60),2);
				}
				if($unidade == 'h'){
					//retorna o valor em horas
					$ret = round($segundo/3600);
				}
			}
		}
		return $ret;
	}
	/**
	 * Retorna do valor da frequencia do aluno para aquele modulo expessifico na respectiva matricula
	 * @param string $id_matricula, string $id_modulo se não tiver o modulo
	 * @uso $ret = Escola::frequencia_modulo($id_matricula, $id_modulo);
	 */
	static function frequencia_modulo($id_matricula,$id_modulo=null){
		//numero de horas totalizada no modulo.
		// echo $id_modulo;
		$complesql = '';
		if($id_modulo){
			$complesql = " AND fre.id_modulo='$id_modulo'";
		}
		$dhoras = Qlib::dados_tab('frequencia_alunos' .' as fre','fre.progresso,fre.concluido,fre.id_atividade,fre.id_modulo,atv.nome,atv.duracao,atv.unidade_duracao,atv.tipo,atv.excluido,fre.id_curso',"
		JOIN " . $GLOBALS['tab39'] ." as atv ON atv.id = fre.id_atividade
		WHERE fre.id_matricula='$id_matricula' $complesql AND fre.concluido='s'
		");
		$segundos_alcancados = 0; //segundos alcançados
		if($dhoras){
			foreach ($dhoras as $kh => $vh) {
				$duracao = (int)$vh['duracao'];
				if($vh['unidade_duracao']=='min'){
					$duracao = (int)$vh['duracao']*60;
				}
				$segundos_alcancados += $duracao;
			}
		}
		//carga horaria do modulo.
		$dm = Qlib::dados_tab($GLOBALS['tab12'],'id_curso',"WHERE id=$id_matricula");
		if(!$dm){
			return ['exec'=>false];
		}else{
			$dm = $dm[0];
		}
		$segundos_total = self::carga_horaria_modulo($id_modulo,'s',$dm['id_curso']);
		$ret['id_modulo'] = $id_modulo;
		$ret['id_matricula'] = $id_matricula;
		$ret['dhoras'] = $dhoras;
		$ret['segundos_alcancados'] = $segundos_alcancados;
		$ret['segundos_total'] = $segundos_total;

		$ret['segundos_total'] = $segundos_total;
		//carga horaria
		if($segundos_total>0){
			$carga_horaria = round($segundos_total/3600);
		}else{
			$carga_horaria = 0;
		}

		//calculo da porcentagem de frequencia no modulo.
		if($segundos_total>0 && $segundos_total>0){
			$porc = round($segundos_alcancados*100/$segundos_total);
		}else{
			$porc = 0;
		}
		$ret['carga_horaria'] = $carga_horaria;
		$ret['porcentagem'] = $porc;

		return $ret;
	}
	/**
	 * Metodo para retornar o aprovetamento em porcentagem do aluno em uma determinada prova...
	 * @param string $id_prova,$id_cliente,$id_matricula
	 * @return string;
	 * @uso $ret = Escola::aproveitamento_prova($id_prova,$id_cliente,$id_matricula);
	 */
	static function aproveitamento_prova($id_prova,$id_cliente,$id_matricula){
		//
		$ret = 0;
		$pontos = 0;
		$alcancados = 0;
		if($id_prova && $id_cliente && $id_matricula){
			$dp = Qlib::dados_tab('frequencia_alunos','*',"WHERE id_atividade='$id_prova' AND id_cliente='$id_cliente' AND id_matricula='$id_matricula'");
			if(isset($dp[0]['tipo']) && $dp[0]['tipo'] == 'Prova'){
				$arr_conf = lib_json_array($dp[0]['config']);
				//saber o total de pontos
				$pontos = self::total_pontos_prova($id_prova);
				$classEad = new temaEAD;
				$pt_dinamico = $classEad->pt_dinamico($id_prova);
				//saber quantos pontos ele alcaçou
				if(is_array($arr_conf)){
					foreach ($arr_conf as $k => $v) {
						if(isset($v['respostaCorrecao']) && $v['respostaCorrecao'] == 'c' && isset($v['pontosQuestao'])){
							if($pt_dinamico=='s'){
								$token = isset($v['tokenQuestao']) ? $v['tokenQuestao'] : 0;
								$ptq = $classEad->pontos_questao($token);
								$alcancados += (int)$ptq;
							}else{
								$alcancados += (int)$v['pontosQuestao'];
							}
						}
					}
				}
				if($alcancados>0 && $pontos>0){
					//Calular porcentagem de aproveitamento
					$ret = round(($alcancados*100/$pontos));
				}
			}
		}
		return $ret.'%';
	}
	/**
	 * Retorna do token da prova atraves do id
	 * @param string $id_prova = id da prova
	 */
	static function get_token_prova_by_id($id){
		return Qlib::buscaValorDb('conteudo_ead','id',$id,'token');
	}
	/**
	 * Returna o total de pontos de uma prova
	 */
	static function total_pontos_prova($id_prova){
		$ret = 0;
		if($id_prova){
			$token_prova = self::get_token_prova_by_id($id_prova);
			$dq = Qlib::dados_tab($GLOBALS['tab27'],'*',"WHERE token_prova='".$token_prova."' AND ".Qlib::compleDelete()) ;//questoes
			//verificar se os pontas da provasão pontos dinamicos ou não
			$classEad = new temaEAD;
			$pt_dinamico = $classEad->pt_dinamico($id_prova);
			if(is_array($dq)){
				foreach ($dq as $ky => $v) {
					if($pt_dinamico=='s'){
						$token = isset($v['token']) ? $v['token'] : '';
						$pontos = $classEad->pontos_questao($token);
						if($pontos){
							$ret += (int)$pontos;
						}
					}else{
						$arr = lib_json_array($v['config']);
						if(isset($arr['pontos']) && ($pts=$arr['pontos'])){
							$ret += (int)$pts;
						}
					}
				}
			}
		}
		// if(isAdmin(1)){
		// 	lib_print($ret);
		// }
		return $ret;
	}
	/**
	 * Metodo para cadastro rápido de uma atividade, ideal para ser usando ao cria um novo evento
	 */
	static function cadastrar_atividade($config=false){
		// $ret['config'] = $config;
		$ret['exec'] = false;
		$ret['mens'] = false;
		if($config){
			// $csrf = isset($config['_token']) ? $config['_token'] : false;
			// if((string)$csrf != (string)session_id()){
			// 	$ret['mens'] = 'CSRF inválido ou não informado';
			// 	$ret['_sess'] = session_id();
			// 	$ret['_token'] = $csrf;
			// 	return $ret;
			// }
			$config['token'] = isset($config['token']) ? $config['token'] : uniqid();
			$config['tipo'] = isset($config['tipo']) ? $config['tipo'] : 'Aula';
			$config['ac'] = isset($config['ac']) ? $config['ac'] : 'cad';
			$config['autor'] = isset($config['autor']) ? $config['autor'] : $_SESSION[SUF_SYS]['id'.SUF_SYS];
			$config['ativo'] = isset($config['ativo']) ? $config['ativo'] : 's';
			$config['nome_exibicao'] = isset($config['nome']) ? $config['nome'] : false;
			$config['unidade_duracao'] = isset($config['unidade_duracao']) ? $config['unidade_duracao'] : '';
			if(!$config['unidade_duracao']){
				$config['unidade_duracao'] = 'min';
			}
			$config['conf'] = isset($config['conf']) ? $config['conf'] : 's';
			$cond_valid = "WHERE `token` = '".$config['token']."'";
			$type_alt = 2;
			$tabUser = $GLOBALS['tab39'];
			$config2 = array(
				'tab'=>$tabUser,
				'valida'=>true,
				'condicao_validar'=>$cond_valid,
				'sqlAux'=>false,
				'ac'=>$config['ac'],
				'type_alt'=>$type_alt,
				'config' => false,
				'dadosForm' => $config
			);
			$ret['config2'] = $config2;
			$result_salvarClientes =  QLib::lib_salvarFormulario($config2);//Declado em Lib/Qlibrary.php
			$ret = json_decode($result_salvarClientes,true);
			// lib_print($ret);
			// if(isset($config['dados_cliente']) && is_array($config['dados_cliente'])){
			// 	$dcli['dados_cliente'] = $config['dados_cliente'];
			// 	$dcli['id_atividade'] = isset($config['id']) ? $config['id'] : 0;
			// 	$ret['atualizar_frequencia'] = self::atualizar_frequencia($dcli);
			// }
			return $ret;
		}
	}
	/**
	 * Metodo para marcar as presença em massa de acordo com uma lista de alunos de uma turma
	 * @param string $id_turma o id da turma para coletar a lista de alunos daquela turma
	 * @param string $id_atividade a atividar respectiva
	 */
	static function presenca_massa($id_turma,$id_atividade,$id_curso=false,$arr_alunos=false,$local=''){
		//listar todos integrantes de uma turma
		$ret['exec'] = false;
		$ret['mens'] = 'Erro: Presença não selecionada';
		$ret['color'] = 'danger';
		$id_curso = $id_curso ? $id_curso :  Qlib::buscaValorDb('turmas','id',$id_turma,'id_curso');

		$ret['atv'] = [];
		// dump($arr_alunos,$id_atividade);

		$arr_alunos = is_array($arr_alunos) ? $arr_alunos : self::get_alunos_curso($id_curso,$id_turma);
		if(is_array($arr_alunos)){
			$ret['atv'] = $arr_alunos;
			foreach ($arr_alunos as $k => $v) {
				$v['acao'] = true;
				$v['id_atividade'] = $id_atividade;
				$ret['v'][$k] = $v;
				$ret['atv'][$k] = self::atualizar_presenca([
					'dados_cliente'=>$v,
				],$local);
				if($ret['atv'][$k]['exec']){
					$ret['exec'] = true;
				}
                // dump($ret['atv'][$k]);
                // sleep(3);
                // dd($ret);
			}
			if($ret['exec']){
				$ret['mens'] = 'Realizada com sucesso!';
				$ret['color'] = 'success';
			}
		}
		return $ret;
	}
	/**
	 * Metodo para atualizar as frequencias dos alunos de acordo com os eventos de aulas ao vivo
	 * @param array $config variavel de configuração
	 */
	/**
	 *  [dados_cliente] => Array
	* (
	*     [id_matricula] => 242
	*     [id_cliente] => 212
	*     [id_curso] => 43
	*     [id_turma] => 61
	*     [Nome] => Jackson
	*     [sobrenome] => Rigelo
	*     [id_atividade] => 1339
	*     [acao] => true
	* )

	 */
	static function atualizar_presenca($config=false,$local=''){
		$ret['exec'] = false;
		if(isset($config['dados_cliente']) && is_array($config['dados_cliente']) && isset($config['dados_cliente']['acao'])){
			$id_atividade = isset($config['dados_cliente']['id_atividade']) ? $config['dados_cliente']['id_atividade'] : null;
			$acao_add = isset($config['dados_cliente']['acao']) ? $config['dados_cliente']['acao'] : false;
			$tab = 'frequencia_alunos';
			// $acao_add = $acao_add;
			$da = Qlib::dados_tab('conteudo_ead','*',"WHERE id='".$id_atividade."'");
			if(!$da){
				$ret['mens'] = 'Atividade não encontrado!';
				return $ret;
			}else{
				$da = $da[0];
			}
			$arr_salv = isset($config['dados_cliente']) ? $config['dados_cliente'] : [];
			$arr_salv['id_atividade'] = isset($arr_salv['id_atividade']) ? $arr_salv['id_atividade'] : $id_atividade;
			$cond_valid = "WHERE `id_matricula` = '".$arr_salv['id_matricula']."' AND `id_atividade` = '".$arr_salv['id_atividade']."'";
			if($acao_add=='true'){
				//adiciona ou atualiza o registro de frequencia
				$arr_salv['token'] = isset($arr_salv['token']) ? $arr_salv['token'] : uniqid();
				$arr_salv['tipo'] = $da['tipo'];
				$confatv = isset($da['config']) ? $da['config'] : '';
				$arr_atv = Qlib::lib_json_array($confatv);
				$arr_salv['id_modulo'] = isset($arr_atv['modulo']) ? $arr_atv['modulo'] : null;
				$arr_salv['ac'] = isset($arr_salv['ac']) ? $arr_salv['ac'] : 'cad';
				$arr_salv['ativo'] = isset($arr_salv['ativo']) ? $arr_salv['ativo'] : 's';
				$arr_salv['conf'] = isset($arr_salv['conf']) ? $arr_salv['conf'] : 's';
				$arr_salv['concluido'] = 's';
				$arr_salv['progresso'] = 100;
				$type_alt = 1;
				$config2 = array(
					'tab'=>$tab,
					'valida'=>true,
					'condicao_validar'=>$cond_valid,
					'sqlAux'=>false,
					'ac'=>$arr_salv['ac'],
					'type_alt'=>$type_alt,
					'config' => false,
					'dadosForm' => $arr_salv
				);
				if(Qlib::isAdmin(1))
				$ret['da'] = $da;
				$ret['config2'] = $config2;
				$result_salvarClientes = Qlib::update_tab($tab,$arr_salv,$cond_valid);
				// dd($result_salvarClientes);
                // if( isJson($result_salvarClientes)){
				// 	$result_salvarClientes = lib_json_array($result_salvarClientes);
				// }
				if($result_salvarClientes['exec']){
					$ret['exec'] = true;
				}
				$ret['save'] = $result_salvarClientes;
			}else{
                if($local=='api'){
                    $ret['exec'] = false;
                    $ret['save'] = false;
                }else{
                    //verificar e remover a inclusão da frequencia
                    $sql_remove = "DELETE FROM $tab $cond_valid";
                    $salva = DB::statement($sql_remove);
                    // $salva = salvarAlterar($sql_remove);
                    $ret['exec'] = $salva;
                    $ret['save'] = $salva;
                }
			}
		}
		// dd($ret);


		return $ret;
	}
	/**
	 * retorna um array para montar o calendario do crongrama das atividade
	 */
	static function cronograma_curso($config=false){
		$ret = [];
		$start = isset($config['start']) ? $config['start'] : null;
		$end = isset($config['end']) ? $config['end'] : null;
		$id_curso = isset($config['id_curso']) ? $config['id_curso'] : null;
		$id_turma = isset($config['id_turma']) ? $config['id_turma'] : null;
		if($id_curso && $start && $end){
			$start = explode('T',$start)[0];
			$end = explode('T',$end)[0];
			$sqlComple = false;
			if($id_turma){
				//Atualização pendente detectada em 24/06/2025
				$sqlComple = " AND config LIKE '%\"turma\":\"$id_turma\"%'";
			}
			$d = Qlib::dados_tab('conteudo_ead','id,nome title,start,end',"WHERE start >= '$start' AND end <= '$end' AND id_curso='$id_curso' AND ".Qlib::compleDelete());
			if($d){
				$ret = $d;
			}
		}
		return $ret;
	}
	/**
	 * Metodo para retornar o registro de frequncia dos alunos em uma determinada aula
	 * @param $id_a id da aula ou da atividade
	 * @return array $ret
	 */
	static function get_lista_alunos_presentes($id_a){
		return Qlib::dados_tab('frequencia_alunos','id_cliente cliente,id_curso,id_matricula,concluido',"WHERE id_atividade='$id_a' AND ".Qlib::compleDelete());
	}
	/**
	 * Metodo para gearar um array com as informações da atividade informando o id
	 * @param string $id o id da atividade
	 * @uso $ret = Escola::get_atividade($id);
	 */
	static function get_atividade($id){
		$d = Qlib::dados_tab('conteudo_ead','*',"WHERE id='$id'");
		$ret['exec'] = false;
		$ret['data'] = [];
		if($d){
			$ret['exec'] = true;
			$d[0]['config'] = Qlib::lib_json_array($d[0]['config']);
			$ret['data'] = $d[0];
			//necessito pegar os dados dos alunos presentes nessa aula tbm
			$ret['lista_alunos_presentes'] = self::get_lista_alunos_presentes($id);
		}
		return $ret;
	}
	/**
	 * Metodo para listar todos alunos de um determinado curso para isso o status deles tem que ser maior que 1 que é interessado
	 * @param integer $id_curso,
	 * @return array
	 * @uso $ret = Escola::get_alunos_curso($id_curso=43);
	 */
	static function get_alunos_curso($id_curso=null,$id_turma=null){
		$id_turma = $id_turma ? $id_turma : null;
		if(!$id_turma){
			$id_turma = isset($_GET['id_turma']) ? $_GET['id_turma'] : false;
		}
		if(!empty($id_turma)){
			$compleSql = " AND m.id_turma='$id_turma' AND m.status >'1' AND m.status < '5'";
		}else{
			$compleSql = "";
		}
		$d = Qlib::dados_tab('matriculas as m','m.id id_matricula,m.status,m.id_cliente,m.id_curso,m.id_turma,cl.Nome,cl.sobrenome,tu.nome nome_turma,tu.inicio,tu.fim',"
		JOIN clientes as cl ON cl.id=m.id_cliente
		JOIN turmas as tu ON tu.id=m.id_turma
		WHERE m.id_curso='$id_curso' $compleSql AND ".Qlib::compleDelete('m')."ORDER by m.id ASC");
		$ret=$d;
		return $ret;
	}
	/**
	 * Metodo que retora uma lista em formato html dos alunos que paricipam de um curso
	 * @param integer $id_curso,
	 * @param string $ret;
	 */
	static function get_lista_alunos_curso($id_curso){
		$arr_alunos_curso = self::get_alunos_curso($id_curso);
		ob_start();
		?>
		<table class="table table-hover table-striped datatable" style="width: 100%;">
			<thead>
				<tr>
					<th style="width:10%">
						Presente
					</th>
					<th style="width:70%">
						Nome
					</th>
					<th style="width:70%">
						Turma
					</th>
				</tr>
			</thead>
			<tbody>
				{tbody}
			</tbody>
		</table>
		<?
		$tema = '<tr class=" tr-turma turma-{id_turma}">
					<td>
						<input type="checkbox" class="check_presenca" name="dados_cliente[]" id="cliente_{id_cliente}" onclick="cursos_atualizar_presenca(this);" {checked} value="{dados_cliente}" />
					</td>
					<td><span>{nome}</span></td>
					<td><span>{nome_turma}</span></td>
				</tr>';
		$tbody = false;
		// $frequencia = Qlib::dados_tab('frequencia_alunos','*',"WHERE id_curso=$id_curso");
		if(is_array($arr_alunos_curso)){
			foreach ($arr_alunos_curso as $k => $v) {
				$nome = $v['Nome'].' '.$v['sobrenome'];
				$checked = false;
				// $sql = Qlib::dados_tab('frequencia_alunos','*',"WHERE id = ''");
				$tbody .= str_replace('{nome}',$nome,$tema);
				$tbody = str_replace('{nome}',$v['Nome'],$tbody);
				$tbody = str_replace('{dados_cliente}',encodeArray($v),$tbody);
				$tbody = str_replace('{checked}',$checked,$tbody);
				$tbody = str_replace('{id_cliente}',$v['id_cliente'],$tbody);
				$tbody = str_replace('{id_turma}',$v['id_turma'],$tbody);
				$tbody = str_replace('{nome_turma}',$v['nome_turma'],$tbody);
			}
		}
		$ret = ob_get_clean();
		$ret = str_replace('{tbody}',$tbody,$ret);
		return $ret;
	}
	/**
	 * Metodo para eviar para lixeira uma atividade criada anteriormente!
	 * @param integer $id
	 * @return array
	 * @uso $ret = Escola::excluir_atividade($id);
	 */
	static function excluir_atividade($id){
		$ret['exec'] = false;
		if($id){
			$ret = excluirUm(array(
				'tab'=>$GLOBALS['tab39'],
				'campo_id'=>'id',
				'id'=>$id,
				'nomePost'=>'Atividade',
				'campo_bus'=>'nome',
			));
		}
		return $ret;
	}
	/**
	 * Metodo para gerar um painel com um select para selecionar os curso que serão gerados cronograma..
	 * @param array $config['id_curso]
	 * @return string
	 * @uso
	 * $ret = Escola::painel_select_cursos_cronograma(['id_curso'=>'','id_turma'=>'','pagina'=>'cursos','sec'=>'cronograma']);
	 */
	static function painel_select_cursos_cronograma($config){
		$id_curso = isset($config['id_curso']) ? $config['id_curso'] : false;
		$id_turma = isset($config['id_turma']) ? $config['id_turma'] : false;
		$pagina = isset($config['pagina']) ? $config['pagina'] : 'cursos';
		$sec = isset($config['sec']) ? $config['sec'] : 'cronograma';
		$arr_curso = sql_array("SELECT * FROM ".$GLOBALS['tab10']." WHERE `ativo`='s' AND ".Qlib::compleDelete()." ORDER BY id ASC",'nome','id');
		$arr_turma = sql_array("SELECT * FROM ".$GLOBALS['tab11']." WHERE `ativo`='s' AND `id_curso`='".$id_curso."' AND ".Qlib::compleDelete()." ORDER BY id ASC",'nome','id');
		$config['campos_consulta']['cursos'] = array('type'=>'select','size'=>'12','campos'=>'id_curso-Selecione um curso.','opcoes'=>$arr_curso,'selected'=>@array($id_curso,''),'css'=>'','event'=>'data-live-search="true" onchange="select_curso(this)";' ,'obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'','sele_obs'=>'-- Selecione--','title'=>'');
		$config['campos_consulta']['turmas'] = array('type'=>'select','size'=>'12','campos'=>'id_turma-Selecione uma turma','opcoes'=>$arr_turma,'selected'=>@array($id_turma,''),'css'=>'','event'=>'data-live-search="true" onchange="select_turma(this)";' ,'obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'','sele_obs'=>'-- Selecione--','title'=>'');
		ob_start();
		?>
		<div class="row mb-3 mt-3 ml-0 mr-0">
			<div class="col-md-12 mb-4">
				<?=formCampos($config['campos_consulta'])?>
			</div>
		</div>
		<script>
			function select_curso(obj){
				link = RAIZ+'/<?=$pagina?>?sec='+btoa('<?=$sec?>')+'&id_curso='+obj.value;
				if(link){
					window.location = link;
				}
			}
			function select_turma(obj){
				var turma = obj.value;
				link = lib_trataAddUrl('id_turma',turma);
				if(link){
					window.location = link;
				}
			}
		</script>
		<?
		$ret = ob_get_clean();
		return $ret;
	}
	/**
	 * Metodo para gerar uma pagina e calendario de gerenciamento do pronograma
	 * @param string $id_curso o ID do curso
	 * @return string um strim da ágina que será exibido
	 * @uso Escola::list_edit_cronograma($id_curso);
	 */
	static function list_edit_cronograma($id_curso=false){
		$dcurso = Qlib::dados_tab($GLOBALS['tab10'],'*',"WHERE id='$id_curso'");
		if(!$dcurso){
			return false;
		}
		$dc = $dcurso[0];
		$is_admin = is_admin();
		$cont = isset($dc['conteudo']) ? $dc['conteudo'] : [];
		$arr_mod = lib_json_array($cont);
		$arr_dura = [];
		if($is_admin){
			$lista_presenca = Escola::get_lista_alunos_curso($id_curso);
		}else{
			$lista_presenca = '';
		}
		array('type'=>'select','size'=>'3','campos'=>'unidade_duracao-Unidade de duração','opcoes'=>@$arr_dura,'selected'=>@array(@$_GET['unidade_duracao'],''),'css'=>'','event'=>false ,'obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
		$select_modulos = '';
		$select_turma = '';
		if(is_array($arr_mod)){
			$opc_mod = [];
			foreach ($arr_mod as $km => $vm) {
				$opc_mod[$vm['idItem']] = $vm['nome'];
			}
			$class = 'form-control';
			// $class = false;
			$config['turma'] = isset($_GET['id_turma']) ? $_GET['id_turma'] : '';
			$select_modulos = queta_formfieldSelect2_2('config[modulo]-Selecione a Materia','12',$opc_mod,[@$config['modulo']],@$val['css'],'data-live-search="true" required',@$val['obser'],$class,@$val['acao'],'Selecione',@$val['title']);
			$arr_turma = sql_array("SELECT * FROM ".$GLOBALS['tab11']." WHERE `ativo`='s' AND `id_curso`='".$id_curso."' AND ".Qlib::compleDelete()." ORDER BY id ASC",'nome','id');
			$select_turma = queta_formfieldSelect2_2('config[turma]-Selecione a Turma','12',$arr_turma,[$config['turma']],@$val['css'],'data-live-search="true" required',@$val['obser'],$class,@$val['acao'],'Selecione',@$val['title']);
		}

		// $arr_todos_alunos = Escola::get_alunos_curso($id_curso);
		// lib_print($opc_mod);
		if($is_admin){
			$btn_add_novo = '<button class="btn btn-primary btn-block" title="Adicionar nova aula" onclick=" incluirNovo();" style="position: relative;">Adicionar</button>';
			$style='';
		}else{
			$btn_add_novo = '';
			$style='
				.painel-aluno h1{
					font-size: 1.3rem;
					font-weight: 700 !important;
				}
				.fc .fc-toolbar-title {
					font-size: 17px;
					margin: 0px;
				}
			';
		}
		ob_start();
		?>
		<style>
			<?=$style?>
		</style>
		<div class="row mb-3 mt-3 ml-0 mr-0">
			<div class="col-md-12 mb-4 text-center">
				<h1>Cronograma do curso: <?=$dc['nome'] ?> </h1>
			</div>
			<div class="col-md-12">
			<?=$btn_add_novo?>
			<hr>
			</div>
			<input type="hidden" value="<?=$is_admin?>" id="is_admin">
			<div class="col-md-12" style="margin-bottom: 20px;" id='calendar'></div>
		</div>
		<script src='https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js'></script>
		<script>
			const is_admin = document.getElementById('is_admin').value;
			document.addEventListener('DOMContentLoaded', function() {
				var calendarEl = document.getElementById('calendar');
				// Definir a tradução personalizada para o calendário

				var calendar = new FullCalendar.Calendar(calendarEl, {
					initialView: 'dayGridMonth',
					editable:true,
					droppable: true,
					headerToolbar: {
						left: 'prev,next today',
						center: 'title',
						end: 'prevYear,nextYear'
					},
					events: '/admin/app/cursos/acao.php?ajax=s&opc=cronograma_curso&id_curso=<?=$id_curso?>', // URL do arquivo PHP que retorna os eventos
					eventColor: '#378006', // Cor dos eventos
					locale: 'pt-custom',
					buttonText: {
						prev:     '< Mês Anterior', // <
						next:     'Próximo Mês >', // >
						prevYear: ' << Ano Anterior ',  // <<
						nextYear: ' Próximo Ano >> ',  // >>
						today:    " Hoje ",
						month:    " Mês ",
						week:     " Semana ",
						day:      " Dia "
					},
					dateClick: function(info){
						// alert('Clicked on: ' + info.dateStr);
						// alert('Coordinates: ' + info.jsEvent.pageX + ',' + info.jsEvent.pageY);
						// alert('Current view: ' + info.view.type);
						if(is_admin=='1'){
							limparForm();
							telaAddAtividade(info,calendar);
						}
					},
					eventDrop: function(info) {
						alert(info.event.title + " was dropped on " + info.event.start.toISOString());

						if (!confirm("Você tem certeza que deseja mudar?")) {
							info.revert();
						}
					},
					eventClick: function(info) {
						// Abrir modal para editar
						var id = info.event._def.publicId;
						selectEvent(id,info);
					}

				});
				FullCalendar.globalLocales.push({
					code: 'pt-custom', // Nome personalizado para o idioma
					monthNames: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
								'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
					weekText: 'Sem', // Exemplo de tradução de outra string
					allDayText: 'Dia todo',
					// moreLinkText: n => '+ mais ${n}',
					noEventsText: 'Nenhum evento para mostrar'
				});
				calendar.render();
				// calendar.gotoDate('2024-11-15');

			});
			function insertHTML(d){
				if(link=d.config.link_aula){
					link = '<a href="'+link+'" class="link-js">'+link+'</a>';
					$('[data="config[link_aula]"]').html(link);
				}
				if(d.nome){
					$('[data="nome"]').html(d.nome);
				}
				if(d.duracao){
					$('[data="duracao"]').html(d.duracao);
				}
				if(s=d.start){
					s = dataExibe(s);
					$('[data="start"]').html(s);
				}
				if(e=d.end){
					e = dataExibe(e);
					$('[data="end"]').html(e);
				}
				if(des=d.descricao){
					$('[data="descricao"]').html(des);
				}
				// console.log(d);

			}

			function competeCampos(d,info){
				// exibir a lista de presença;
				$('.lista-p').show();
				try {
					var id=d.id;
					//limpar o formulario
					limparForm();
					if(is_admin=='1'){
						//remover botão de salvar se não estiver no adim e botao link da ficha de presença
						var link_ficha = '/admin/relatorios?sec=cmVsYXRvcmlvLXByZXNlbmNh&atividade='+id;
						btn_dele='<a href="'+link_ficha+'" target="_BLANK" id="btn-ficha" class="btn btn-default"><i class="fa fa-list"></i> Ficha de presença</a>';
						btn_dele+='<button type="button" id="btn-delete" class="btn btn-danger"><i class="fa fa-trash"></i> Excluir</button>';
					}else{
						btn_dele='';
						removeBtnSalvar();
					}
					//completa os campos
					for (const [key, value] of Object.entries(d)) {
						if(key=='config'){
							for (const [key1, value1] of Object.entries(value)) {
								// console.log(`${key1}: ${value1}`);
								if(key1 == 'modulo'){
									document.querySelector('[name="'+key+'['+key1+']"').value = value1;
								}else{
									document.querySelector('[name="'+key+'['+key1+']"').value = value1;
								}
							}
						}else{
							$('[name="'+key+'"]').val(value);
						}
					}
					inp_hidden='<input type="hidden" name="ac" value="alt" /><input type="hidden" name="id" value="'+d.id+'" />',$('[name="ac"]').remove();
					$(inp_hidden).insertBefore('[name="id_curso"]');
					$('#btn-delete,#btn-ficha').remove();
					$(btn_dele).insertBefore('#modal-cronograma .modal-footer [data-dismiss="modal"]');
					$('#btn-delete').on('click', function(){
						excluir_atividade(d.id,info);
					});
				} catch (error) {
					console.log(error);
				}
			}
			function selectEvent(id,info){
				if(id){
					getAjax({
						url:RAIZ+'/app/cursos/acao.php?ajax=s&opc=get_atividade',
						type:'GET',
						// data:$('#form-cronograma').serialize(),
						data: {
							id:id,
						}
					},function(res){
						$('#preload').fadeOut("fast");
						try {
							if(res.mens){
								$('.mens').html(res.mens);
							}
							if(res.exec && res.data){
								if(d=res.data){
									if(is_admin=='1'){
										competeCampos(d,info);
										$('#modal-cronograma').modal('show');
										document.getElementById('saveEventButton').onclick = function() {
											cursos_cadastrar_atividade(info);
										};
									}else{
										insertHTML(d);
										$('#modal-cronograma-front').modal('show');

									}
								}
								if(l=res.lista_alunos_presentes){
									list_presentes(l);
								}else{
									limparChecksListaPresenca();
								}
							}else{
								if(is_admin=='1'){
									$('#modal-cronograma').modal('hide');
								}else{
									$('#modal-cronograma-front').modal('hide');
								}
							}
						} catch (error) {
							console.log(error);
						}
						$('.mens').html(res.mensa);
					});
				}

			}
			function incluirNovo(){
				$('#modal-cronograma').modal('show');
				document.getElementById('saveEventButton').onclick = function() {
					cursos_cadastrar_atividade('','reload');
				};

			}
			function carregarDataTable(sele){
				if(is_admin=='1'){


					if(typeof sele == 'undefined') {
						sele = '.datatable';
					}
					$(sele).DataTable( {
						"aaSorting": [],
						"oLanguage": {
							"sProcessing": "Aguarde enquanto os dados são carregados ...",
							"sLengthMenu": "Mostrar _MENU_ registros por pagina",
							"sZeroRecords": "Nenhum registro correspondente ao criterio encontrado",
							"sInfoEmtpy": "Exibindo 0 a 0 de 0 registros",
							"sInfo": "Exibindo de _START_ a _END_ de _TOTAL_ registros",
							"sInfoFiltered": "",
							"sSearch": "Procurar",
							"oPaginate": {
							"sFirst":    "Primeiro",
							"sPrevious": "Anterior",
							"sNext":     "Próximo",
							"sLast":     "Último"
							}
						},
						"order": [[1, 'asc']]
					});
				}
			}
			function limparChecksListaPresenca(){
				document.getElementById('form-cronograma').querySelectorAll('[type="checkbox"]').forEach((el)=>{
					el.checked = false;
				});
			}
			function list_presentes(list){
				//limpar checkboxes
				limparChecksListaPresenca();
				var sele = '.datatable';
				$(sele).DataTable().destroy();
				try {
					for (let i = 0; i < list.length; i++) {
						const el = list[i];
						if(cl=el.cliente){
							document.getElementById('cliente_'+cl).checked = true;
							console.log(cl);
						}
					}
					carregarDataTable(sele);
				} catch (error) {
					console.log(error);

				}
			}
			function excluir_atividade(id,info){
				// console.log(info);
				if(!window.confirm('Deseja mesmo excluir esse agendamento?')){
					return;
				}
				if(id){
					getAjax({
						url:RAIZ+'/app/cursos/acao.php?ajax=s&opc=excluir_atividade',
						type:'POST',
						// data:$('#form-cronograma').serialize(),
						data: {
							id:id,
							_token:$('[name="_token"]').val(),
						}
					},function(res){
						$('#preload').fadeOut("fast");
						try {
							if(res.mens){
								$('.mens').html(res.mens);
							}
							if(res.exec){
								info.event.remove();
								$('#modal-cronograma').modal('hide');
							}else{
							}
						} catch (error) {
							console.log(error);
						}
						$('.mens').html(res.mensa);
					});
				}

			}
			function cursos_cadastrar_atividade(info,calendar){
				// if(!window.confirm('Prosseguir com o cadastro')){
				//     return false;
				// }
				var formu = $('#form-cronograma');
				formu.validate({
					submitHandler: function(form) {
						getAjax({

							url:RAIZ+'/app/cursos/acao.php?ajax=s&opc=cadastrar_atividade',
							type:'POST',
							data:$('#form-cronograma').serialize(),

						},function(res){
							$('#preload').fadeOut("fast");
							try {

								if(res.mens){
									$('.mens').html(res.mens);
								}
								if(res.exec){
									var a_pagina = document.getElementById('s_atualiza').checked;
									$('#modal-cronograma').modal('hide');
									if(typeof info != 'undefined' && typeof info == 'object'){
										var novoTitulo = $('#form-cronograma [name="nome"]').val();
										info.event.setProp('title', novoTitulo);
										info.el.style.borderColor = 'green';
										// console.log(novoTitulo);
									}
									if(typeof calendar != 'undefined' && calendar == 'reload'){
										// console.log(a_pagina);
										if(a_pagina==true){
											location.reload();
										}
									}
									if(typeof calendar != 'undefined' && typeof calendar == 'object'){
										var form = $('#form-cronograma');
										const novoEvento = {
											title: form.find('[name="nome"]').val(),
											start: form.find('[name="start"]').val(), // Defina a data de início desejada
											end: form.find('[name="end"]').val(), // Defina a data de término desejada, se aplicável
											allDay: true
										};
										calendar.addEvent(novoEvento);
										// console.log(a_pagina);
										if(a_pagina==true){
											location.reload();
										}
										// console.log(novoEvento);
									}
								}

							} catch (error) {

								console.log(error);

							}

							$('.mens').html(res.mensa);

						});
					}
				});
				formu.submit();
			}
			function limparForm(){
				var form = $('#form-cronograma');
				form.find('[name="nome"]').val('');
				form.find('[name="config[link_aula]"]').val('');
				form.find('[name="config[modulo]"]').val('').change();
				form.find('[name="config[turma]"]').val('').change();
				form.find('[name="unidade_duracao"]').val('');
				form.find('[name="descricao"]').val('');
				form.find('[name="ac"]').val('cad');
				form.find('[name="id"]').remove();
				$('#btn-delete').remove();
				$('#btn-ficha').remove();
			}
			function telaAddAtividade(info,calendar){
				// console.log(Date.now());
				if(info.dateStr){
					try {
						var id_turma = $('#id_turma').val();
						const dat  = new Date();
						var horas=dat.getHours(),min=dat.getMinutes(),sec=dat.getSeconds,hora1=horas+':'+min+':'+sec,hora2=(new Number(horas+1))+':'+min+':'+sec, datetime_start = info.dateStr+' 09:00:00',datetime_end = info.dateStr+' 10:00:00',inp_hidden='<input type="hidden" name="ac" value="cad" />',title = 'Adicionar atividade ao vivo';
						$('[name="start"]').val(datetime_start);
						$('[name="end"]').val(datetime_end);
						$('[name="ac"]').remove();
						$(inp_hidden).insertBefore('[name="id_curso"]');
						$('#modal-cronograma .modal-title').html(title);
						$('#modal-cronograma').modal('show');
						$('.lista-p').hide();
						$('[id="config[turma]"]').val(id_turma).select();
						// Salvar alterações no evento
						var eventTitleInput = document.querySelector('[name="nome"]');
						if(is_admin=='1'){
							document.getElementById('saveEventButton').onclick = function() {
								// info.event.setProp('title', eventTitleInput.value);
								// Atualiza o título do evento
								cursos_cadastrar_atividade('',calendar);
								// Aqui, você pode adicionar uma chamada AJAX para salvar no banco de dados
							};
						}else{
							removeBtnSalvar();
						}
					} catch (error) {
						console.log(error);

					}
				}else{
					alert('Data invalida');
				}
			}
			function removeBtnSalvar(){
				$('#saveEventButton').remove();
			}
			$(()=>{
				carregarDataTable();
			});
		</script>
		<style>
			#modal-cronograma .modal-body {
				position: relative;
				padding: 20px;
				height: 450px;
				overflow: auto;
			}
		</style>
		<div id="modal-cronograma" class="modal fade" role="dialog">
			<div class="modal-dialog modal-lg">
				<div class="modal-content">
					<div class="modal-header">
						<button type="button" class="close" data-dismiss="modal">&times;</button>
						<h4 class="modal-title">{modal_header}</h4>
					</div>
					<div class="modal-body">
						<div class="container-fluid">
							<div class="row">
								<div class="col-md-12 form-edit">
									<form id="form-cronograma" method="post">
										<div class="row">
											<div class="col-md-12  mb-2">
												<h5>
													<b for="">
														Nome do curso:
													</b>
													<span>
														{nome_curso}
													</span>
												</h5>
											</div>
											<?=$select_turma?>
											<?=$select_modulos?>
											<div class="col-md-12 mb-2">
												<label for="">Nome da Aula</label>
												<input type="text" required class="form-control" name="nome" value="" />
											</div>
											<div class="col-md-6 mb-2">
												<label for="">Link</label>
												<input type="link" class="form-control" name="config[link_aula]" value="" />
											</div>
											<div class="col-md-6 mb-2">
												<label for="">Duração (minutos)</label>
												<input type="number" class="form-control" required name="duracao" value="" />
												<input type="hidden" class="form-control" name="unidade_duracao" value="min" />
											</div>
											<div class="col-md-6 mb-2 div-start">
												<label for="">Início</label>
												<input type="datetime-local" required class="form-control" name="start" value="" />
											</div>
											<div class="col-md-6 mb-2 div-end">
												<label for="">Fim</label>
												<input type="datetime-local" required class="form-control" name="end" value="" />
											</div>
											<div class="col-md-12 mb-4">
												@csrf
												<input type="hidden" name="id_curso" value="<?=$id_curso?>" />
												<label for="">Descrição</label>
												<textarea class="form-control" required style="height: 100px;" name="descricao" id="descricao"></textarea>
											</div>
											<div class="col-md-12 lista-p">
												<h6>
													<span>Lista de presença</span>
													<span class="pull-right" id="presenca-todos">
														<button type="button" onclick="seleciona_todos_presentes();" class="btn btn-primary btn-xs" title="Para dar presença para todos">Selecionar todos</button>
														<!-- <button type="button" onclick="selectAll('.check_presenca')" class="btn btn-primary btn-xs" title="Para dar presença para todos">Selecionar todos</button> -->
													</span>
												</h6><hr class="mt-0">
											</div>
											<div class="col-md-12 mens">
											</div>
											<div class="col-md-12 lista-p">
												{lista_presenca}
											</div>
										</div>
									</form>
								</div>
							</div>
						</div>
					</div>
					<div class="modal-footer">
						<div class="row">
							<div class="col-md-12 mb-3">
								<label for="s_atualiza">
									<input type="checkbox" vlue="s" id="s_atualiza"> Atualizar a página depos que salvar
								</label>
							</div>
							<div class="col-md-12">
								<button type="button" class="btn btn-default" data-dismiss="modal">Fechar</button>
								<button type="button" id="saveEventButton" class="btn btn-primary">Salvar</button>
							</div>
						</div>
					</div>
				</div>

			</div>
		</div>
		<!-- Modal front -->
		<div class="modal fade" id="modal-cronograma-front" tabindex="-1" role="dialog" aria-labelledby="modelTitleId" aria-hidden="true">
			<div class="modal-dialog modal-lg" role="document">
				<div class="modal-content">
						<div class="modal-header">
								<h5 class="modal-title">{modal_header}</h5>
									<button type="button" class="close" data-dismiss="modal" aria-label="Close">
										<span aria-hidden="true">&times;</span>
									</button>
							</div>
					<div class="modal-body">
						<div class="container-fluid">
							<div class="row">
								<div class="col-md-12  mb-2">
									<h5>
										<b for="">
											Nome do curso:
										</b>
										<span>
											{nome_curso}
										</span>
									</h5>
								</div>
								<div class="col-md-12 mb-2">
									<b for="">Nome da Aula:</b>
									<span data="nome"></span>
								</div>
								<div class="col-md-6 mb-2">
									<b for="">Link:</b>
									<span data="config[link_aula]"></span>
								</div>
								<div class="col-md-6 mb-2">
									<b for="">Duração (minutos):</b>
									<span data="duracao"></span>
									<span>min</span>
								</div>
								<div class="col-md-6 mb-2 div-start">
									<b for="">Início:</b>
									<span data="start"></span>
								</div>
								<div class="col-md-6 mb-2 div-end">
									<b for="">Fim:</b>
									<span data="end"></span>
								</div>
								<div class="col-md-12 mb-4">
									<b for="">Descrição:</b><p data="descricao"></p>
								</div>
							</div>
						</div>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>
					</div>
				</div>
			</div>
		</div>
		<script>
			function seleciona_todos_presentes(){
				var id_turma = $('[id="config[turma]"]').val();
				var id_atv = $('[name="id"]').val();
				if(typeof id_turma == 'undefined' || id_turma == ''){
					$('[id="config[turma]"]').addClass('error');
					lib_formatMensagem('.mens','Secione uma turma','danger');
					return ;
				}
				if(id_turma && id_atv){
					selectAll('.check_presenca');		//return;
					// alert(RAIZ);
					$.ajax({
						url : RAIZ+'/app/cursos/acao.php?ajax=s&opc=presenca_massa',
						async: true,
						dataType: "json",
						type : 'POST',
						data:{
							id_turma:id_turma,
							id_atividade:id_atv
						},
						beforeSend: function(){
							$('#preload').fadeTo("fast",0.8);
						},
						success: function(ret){
							$('#preload').fadeOut();
							try {

								lib_formatMensagem('.mens',ret.mens,ret.color);
								// if(ret.exec){
								// }
								// $('#fim').val(retorno.fim);
							} catch (error) {
								console.log(error);
							}
						},
						error: function(erro){
							$('#preload').fadeOut();
							console.log('Erro entre em contato com o suporte'+erro);
						}
					});
				}else{

				}
			}
		</script>
		<?
		$ret = ob_get_clean();
		$csrf = '<input type="hidden" name="_token" value="'.session_id().'" />';
		$ret = str_replace('{modal_header}','Atividade ao vivo',$ret);
		$ret = str_replace('{nome_curso}',$dc['nome'],$ret);
		$ret = str_replace('{lista_presenca}',$lista_presenca,$ret);
		$ret = str_replace('@csrf',$csrf,$ret);
		return $ret;
	}
	/**
	 * Server para verificar a existencia de um cronograma de aulas valido para um determinado curso se for informado o id do curso
	 * Se não for informado uma data de inicio para a verificaçao será levando em conta a data de hoje como o incio da verificação
	 * @param string $id_curso = o id do curso
	 * @return string|array $ret
	 * @uso $ret = Escola::tem_cronograma($id_curso,$GLOBALS['dtBanco']);
	 */
	static function tem_cronograma($id_curso,$start=false,$return_type='boolean'){
		$ret = false;
		if($return_type=='array'){
			$ret['exec'] = false;
		}
		if($id_curso){
			if(!$start){
				$start = $GLOBALS['dtBanco'];
			}
			$d = Qlib::dados_tab('conteudo_ead','id,nome title,start,end',"WHERE start >= '$start' AND id_curso='$id_curso' AND ".Qlib::compleDelete(),true);
			if($d){
				if($return_type=='array'){
					$ret['exec'] = true;
					$ret['dados'] = $d;
				}else{
					$ret = true;
				}
			}
		}
		return $ret;
	}
	/**
	 * Mota a página de validação de um certificado emitido pela escola
	 */
	static function certPage($tm){
		$favicon = "<link rel=\"shortcut icon\" href=\"" .short_code('favicon',false,false) ."\" type=\"image/png\" />";
		$favicon .= '<link href="'.short_code('favicon',false,false).'" rel="icon">';
		if($emissao=self::tem_cerificado($tm)){
			$dm = Escola::dadosMatricula($tm);
			if($dm){
				$certificado = short_code('pagina_validacao_certificado');
				$dm = $dm[0];
				$nome = isset($dm['nome']) ? $dm['nome'] : '';
				$numero_certificado = zerofill($dm['id'],3).'/';
				$dta_inicio = explode('-',$dm['data_contrato']);
				if(isset($dta_inicio[0])){
					$numero_certificado .= $dta_inicio[0];
				}
				$config_aluno = isset($dm['config_aluno']) ? $dm['config_aluno'] : '';
				$canac = '';
				if($config_aluno){
					$arr_conf_aluno = lib_json_array($config_aluno);
					$canac = isset($config_aluno['canac']) ? $config_aluno['canac'] : '';
				}
				$sobrenome = isset($dm['sobrenome']) ? $dm['sobrenome'] : '';
				$status_certificado = 'VÁLIDO';
				$nome_completo = $nome.' '.$sobrenome;
				$carga_horaria = Escola::carga_horaria_curso($dm['id_curso']);
				$dados_empresa = dados_empresa($_SESSION[SUF_SYS]['token_conta'.SUF_SYS]);
				$local = isset($dados_empresa['cidade']) ? $dados_empresa['cidade'] : '';
				$nome_empresa = isset($dados_empresa['nome']) ? $dados_empresa['nome'] : '';
				$telefone_instituicao = isset($dados_empresa['telefone']) ? $dados_empresa['telefone'] : '';
				$conteudo = str_replace('{numero_certificado}',$numero_certificado,$certificado);
				foreach ($dm as $km => $vm) {
					if($km=='inicio_turma' || $km=='fim_turma'){
						$vm = dataExibe($vm);
					}
					$conteudo = str_replace('{'.$km.'}',$vm,$conteudo);
				}
				$conteudo = str_replace('{nome_completo}',$nome_completo,$conteudo);
				$conteudo = str_replace('{emissao}',dataExtensso($emissao),$conteudo);
				$conteudo = str_replace('{canac}',$canac,$conteudo);
				$conteudo = str_replace('{carga_horaria}',$carga_horaria,$conteudo);
				$conteudo = str_replace('{local}',$local,$conteudo);
				$conteudo = str_replace('{nome_empresa}',$nome_empresa,$conteudo);
				$conteudo = str_replace('{status_certificado}',$status_certificado,$conteudo);
				$conteudo = str_replace('{telefone_instituicao}',$telefone_instituicao,$conteudo);
			}
		}else{
			$conteudo =  '<div class="col-md-12">'.formatMensagemInfo('Certificado não encontrato!','danger').'</div>';
		}

		ob_start();
		?>
		<!DOCTYPE html>
		<html lang="pt">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title><?=__translate('Verificação de Certificado',true)?></title>
			<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
			{favicon}
		</head>
		<body>
			<div class="container">
				<div class="row">
					<div class="col-md-12 text-center mb-4 mt-4">
					<?=verImagemSlim_SERVER("WHERE token='".$GLOBALS['tk_conta']."'",'imagem_logo','',3)?>
					</div>
				</div>
				<div class="row">
					{conteudo}
				</div>
			</div>

		</body>
		</html>
		<?
		$ret = ob_get_clean();
		$ret = str_replace('{conteudo}',$conteudo,$ret);
		$ret = str_replace('{favicon}',$favicon,$ret);
		return $ret;
	}
	/**
	 * Gera um QRcode
	 */
	static function qrCode($d='',$s=10,$e='H',$t='J'){
		$aux = false;
		if($d){
			$aux = RAIZ.'/lib/qrcode/php/qr_img.php?';
			$aux .= 'd='.$d.'&';
			$aux .= 'e='.$e.'&';
			$aux .= 's='.$s.'&';
			$aux .= 't='.$t.'';
		}
		return $aux;
	}
	/**
	 * verifica se um aluno esta apto para receber um certificado
	 */
	static function tem_cerificado($tm){
		$dm = self::dadosMatricula($tm);
		$id_matricula = self::get_id_by_token($tm);
		$ret = false;
		$ret = self::get_matriculameta($id_matricula,self::campo_emissiao_certificado());
		return $ret;
	}
	static function get_id_by_token($token){
		return Qlib::buscaValorDb($GLOBALS['tab12'],'token',$token,'id'," AND ".Qlib::compleDelete());
	}
	static function get_token_by_id($id){
		return Qlib::buscaValorDb($GLOBALS['tab12'],'id',$id,'token'," AND ".Qlib::compleDelete());
	}
	/**
     * Metodo para salvar ou atualizar os meta matriculas
     */
    static function update_matriculameta($post_id,$meta_key=null,$meta_value=null)
    {
        $ret = false;
        $tab = 'matriculameta';
		global $dtBanco;
        if($post_id&&$meta_key&&$meta_value){
            $verf = totalReg($tab,"WHERE matricula_id='$post_id' AND meta_key='$meta_key'");
			if($verf){
				$ret = salvarAlterar("UPDATE IGNORE $tab SET meta_value='$meta_value',updated_at='".$dtBanco."' WHERE matricula_id='$post_id' AND meta_key='$meta_key'");
            }else{
				$ret = salvarAlterar("INSERT IGNORE INTO $tab SET meta_key='$meta_key',matricula_id='$post_id',meta_value='$meta_value',created_at='".$dtBanco."'");
            }
            //$ret = DB::table($tab)->storeOrUpdate();
        }
        return $ret;
    }
	/**
     * Metodo para pegar os meta matriculas
     */
    static function get_matriculameta($post_id,$meta_key=null,$string=true)
    {
        $ret = false;
        $tab = 'matriculameta';
        if($post_id){
            if($meta_key){
                // $d = DB::table($tab)->where('post_id',$post_id)->where('meta_key',$meta_key)->get();
                $d = Qlib::dados_tab($tab,'*',"WHERE matricula_id='$post_id' AND meta_key='$meta_key'");
				if($d){
                    if($string){
                        $ret = $d[0]['meta_value'];
                    }else{
                        $ret = [$d[0]['meta_value']];
                    }
                }else{
                    $post_id = self::get_id_by_token($post_id);
                    if($post_id){
                        $ret = self::get_matriculameta($post_id,$meta_key,$string);
                    }
                }
            }
        }
        return $ret;
    }
	/**
     * Metodo para deletar os meta matriculas
	 * @param int $id da matricula, string nome do campo meta
     */
    static function delete_matriculameta($post_id,$meta_key=null)
    {
        $ret = false;
        $tab = 'matriculameta';
        if($post_id){
            if($meta_key){
                // $d = DB::table($tab)->where('post_id',$post_id)->where('meta_key',$meta_key)->get();
                $ret = salvarAlterar("DELETE FROM $tab WHERE matricula_id='$post_id' AND meta_key='$meta_key'");
			}
        }
        return $ret;
    }
    /**
	 * Metodo para marcar presença para todos alunos do cronograma
	 * @param int $id_turma; //id da turma
	 * @return array $ret
	 * @ $ret = Escola::adiciona_presenca_atividades_cronograma($id_turma);
	 */
	static function adiciona_presenca_atividades_cronograma($id_turma=null,$id_curso=false){
        // set_time_limit(0);
		$ret = ['exec' => false,'mens'=>'Erro ao adicionar','color'=>'danger'];
		// $dm = Qlib::dados_tab('matriculas','*',"WHERE id_turma='$id_turma' AND status>'1' AND status <'5' AND ".compleDelete()." ORDER BY id ASC");
		$id_curso = $id_curso ? $id_curso :  Qlib::buscaValorDb('turmas','id',$id_turma,'id_curso');
		//listar os alunos da turma
		$arr_alunos = self::get_alunos_curso($id_curso,$id_turma);
		//listar todas atividade
		$atv = Qlib::dados_tab('conteudo_ead','id,nome,config',"WHERE id_curso='$id_curso' AND config LIKE '%\"turma\":\"$id_turma\"%' AND ".Qlib::compleDelete());
		// dump($atv);
        // dd($id_curso,$id_turma,$arr_alunos);
        $get_ativ = request()->get('id_atividade');
        if(is_array($atv) && is_array($arr_alunos)){
			$ret['atv'] = $atv;
			if(is_array($atv)){
				foreach ($atv as $katv => $vatv) {
					if($id_atividade=$vatv['id']){
						//marcar presença para todos da turma.
						// $ret['pres'][$katv] = $pres;
                        // if($get_ativ==$id_atividade){
                            $arr_config = [
                                'id_turma' =>$id_turma,
                                'id_atividade' =>$id_atividade,
                                'id_curso' =>$id_curso,
                                'arr_alunos' =>$arr_alunos,
                                'local' =>'api',
                                'tenant_id' =>tenant('id'),
                            ];
                            // $pres = self::presenca_massa($id_turma,$id_atividade,$id_curso,$arr_alunos);
                            // echo tenant();
                            // Tenant::find(tenant('id'))->run(function () use ($arr_config) {
                            // });
                            // PresencaEmMassaJob::dispatch($arr_config);

                            $pres = PresencaEmMassaJob::dispatch($arr_config);
                            $ret['pres'][$katv]['atividade'] = $vatv;
                            $ret['pres'][$katv] = $pres;
                            // tenant()->run(function () use ($dados) {
                            //     // EnviarRelatorioJob::dispatch($dados);
                            // });
                            $ret['arr_config'][$katv] = $arr_config;
                            // dd($ret);
                            // dd($ret);
                            // sleep(3);
                        // }
					}
				}
			}

		}
		return $ret;
	}
    /**
     * Metodo para adicionar presença em massa via api
     */
    static function add_presenca($id_turma=null){
        $ret = ['exec'=>false,'mens'=>'Erro ao adicionar presença','color'=>'danger'];
        if($id_turma){
            $ret = self::adiciona_presenca_atividades_cronograma($id_turma);
        }
        return $ret;
    }

}
