<?
namespace App\Helpers;

use App\Services\Qlib;

class Ead {
	public function start($config=false){
		if(Url::getURL(nivel_url_site()) == 'preview'){
			//if(logadoSite() || is_clientLogado()){
			if(logadoSite()){
				//include  dirname(dirname(dirname(dirname(dirname(__FILE__))))).DIRETORIO_SITE.SEPARADOR.'tema/ead/func.php';
				//include  dirname(dirname(dirname(dirname(dirname(__FILE__))))).DIRETORIO_SITE.SEPARADOR.'tema/ead/index.php';
				include  DIRETORIO_SITE.SEPARADOR.SEPARADOR.'ead/func.php';
				include  DIRETORIO_SITE.SEPARADOR.'ead/index.php';
			}else{
				include Qlib::qoption('urlroot') . 'admin/app/' .'form_login.php';
			}
		}else{
			//include  dirname(dirname(dirname(dirname(dirname(__FILE__))))).DIRETORIO_SITE.SEPARADOR.'tema/ead/func.php';
			//include  dirname(dirname(dirname(dirname(dirname(__FILE__))))).DIRETORIO_SITE.SEPARADOR.'tema/ead/index.php';
			include  DIRETORIO_SITE.SEPARADOR.'ead/func.php';
			include  DIRETORIO_SITE.SEPARADOR.'ead/index.php';
		}
	}
	public function temaAdminEAD($id=false){
		$temaHTML = explode('<!--separa--->',carregaArquivo(dirname(__FILE__).'/ead.html'));
		if($id){
			$ret = $temaHTML[$id];
		}else{
			$ret = $temaHTML;
		}
		return $ret;
	}
	public function urlPreviewEad($config=false){
		//$config = array('nivel2','nivel3');
		$campo = isset($config['campo']) ? $config['campo'] : 'url';
		$nivel0 = isset($config['nivel0']) ? $config['nivel0'] : false;
		$ret = false;
		if(isset($config['nivel2']) && isset($config['nivel3'])){
			$compUrl = $config['nivel2'].'/'.base64_encode($config['nivel3']);
			$input = '<input type="hidden" id="input-url" name="'.$campo.'" value="'.$compUrl.'">';
			$url = Qlib::qoption('dominio_site').$nivel0.'/preview/'.$compUrl;
			$ret = 'Preview <a href="'.$url.'" target="_BLANK">'.$url.'</a>'.$input;
		}
		return $ret;
	}

	public function selectCategoria($config=false){
		$ret = false;
		/*
		$config = array(
			'tipo'=>'e',
			'size'=>'6',
		);
		*/
		if($config){
			$comple = "WHERE `ativo`='s' AND `pai`='0' AND ".compleDelete();
			$sql_arr = "SELECT nome,id FROM ".$GLOBALS['tab9']." ".$comple." ORDER BY ordenar ASC";
			$class = isset($config['class']) ? $config['class'] : 'col-sm-12 m-bp padding-none';
			$event = isset($config['event']) ? $config['event'] : false;
			$label = isset($config['label']) ? $config['label'] : 'Categoria';
			$nome = isset($config['nome']) ? $config['nome'] : 'categoria';
			//$acao = 'gerenciar';
			$acao = isset($config['acao']) ? $config['acao'] : false;
			$title = isset($config['title']) ? $config['title'] : false;
			$selected = isset($config['selected']) ? $config['selected'] : false;
			$labelTooltip = isset($config['labelTooltip']) ? $config['labelTooltip'] : 'col-sm-12';
			$sele_obs='--selecione--';
			$tam = explode('-',$class);
			$optios = sql_array($sql_arr,'nome','id');
			$eventCa = false;
			//$ret .= queta_formfieldSelect2_2("categoria-Categoria*", $tam[2], $arr_categoria,array(@$config['select'],''),'',$eventCa,'Categoria mãe','','gerenciar sl','Nenhuma');
			if(isset($optios)){
				$input = '<div class="'.$class.'" div-id="'.$nome.'">';
					if(!empty($label))
						$input .= '<label class="control-label '.$labelTooltip.'"  title="'.__translate($title,true).'" >'.__translate($label,true).'</label><br>';
				$input .= 		"<select name=\"".$nome."\" id=\"".$nome."\" class=\"col-sm-12 selectpicker\" ".$event." data-live-search=\"true\"  style=\"width:100%\">";

					if($acao == ''){
						$input .= "<option value=\"\" selected=\"selected\">".$sele_obs."</option>";

					}elseif($acao == 'gerenciar' || $acao == 'gerenciar sl'){
						$input .= "<option value=\"\" selected=\"selected\">".$sele_obs."</option>";
						$input .= "<option value=\"cad\" >Cadastrar ".__translate($label,true)."</option>";
						//$input .= "<option value=\"ger\" >Gerenciar ".__translate($label,true)."</option>";
						$input .= "<option value=\"\" disabled >---------------------------</option>";

					}
					 if(isset($optios) && count($optios) >= 1){
							$i = 0;
							foreach($optios as $keys => $value){
									if(!empty($keys)){
										$sqlsub = "SELECT nome,id,token FROM ".$GLOBALS['tab9']." WHERE `pai`='".$keys."' ORDER BY ordenar ASC";
										$optiosub = sql_array($sqlsub,'nome','id');
										if($optiosub){
											foreach($optiosub as $key => $val){
												$optvalue = buscaValorDb($GLOBALS['tab9'],'id',$keys,'token').'/'.buscaValorDb($GLOBALS['tab9'],'id',$key,'token');
												$urlCategoria = $this->urlCategoria($optvalue);
												if(isset($selected[0])){
													if($optvalue==$selected[0]){
														$input .= "<option  q-url='".$urlCategoria['link']."' value=\"".@$optvalue."\" data-select=\"".__translate(ucwords($value),true)." >".__translate(ucwords($val),true)."\" data-content=\"<i class='fa fa-level-down'></i> ".__translate(ucwords($value),true)." <i class='fa fa-chevron-right'></i> ".__translate(ucwords($val),true)."\" selected=\"selected\">".__translate(ucwords($val),true)."</option>";
													}else{
														$input .= "<option q-url='".$urlCategoria['link']."' value=\"".$optvalue."\" data-select=\"".__translate(ucwords($value),true)." >".__translate(ucwords($val),true)."\" data-content=\"<i class='fa fa-level-down'></i> ".__translate(ucwords($value),true)." <i class='fa fa-chevron-right'></i> ".__translate(ucwords($val),true)."\" >".__translate(ucwords($value),true)." >".__translate(ucwords($val),true)."</option>";
													}
												}else{
														if($acao == 'gerenciar sl' && $i==0){
															$input .= "<option q-url='".$urlCategoria['link']."' value=\"".@$optvalue."\" data-select=\"".__translate(ucwords($value),true)." >".__translate(ucwords($val),true)."\" selected=\"selected\" data-content=\"<i class='fa fa-level-down'></i> ".__translate(ucwords($value),true)." <i class='fa fa-chevron-right'></i> ".__translate(ucwords($val),true)."\" >".__translate(ucwords($value),true)." >".__translate(ucwords($val),true)."</option>";
														}else{
															$input .= "<option q-url='".$urlCategoria['link']."' value=\"".$optvalue."\" data-select=\"".__translate(ucwords($value),true)." >".__translate(ucwords($val),true)."\" data-content=\"<i class='fa fa-level-down'></i> ".__translate(ucwords($value),true)." <i class='fa fa-chevron-right'></i> ".__translate(ucwords($val),true)."\" >".__translate(ucwords($value),true)." >".__translate(ucwords($val),true)."</option>";
														}
												}
											}
										}else{
											$optvalue = buscaValorDb($GLOBALS['tab9'],'id',$keys,'token');
											$urlCategoria = $this->urlCategoria($optvalue);

											if(isset($selected[0])){
													if($optvalue==$selected[0]){
														$input .= "<option q-url='".$urlCategoria['link']."' data-select=\"".__translate(ucwords($value),true)."\" value=\"".@$optvalue."\" selected=\"selected\">".__translate(ucwords($value),true)."</option>";
													}else{
														$input .= "<option q-url='".$urlCategoria['link']."' data-select=\"".__translate(ucwords($value),true)."\" value=\"".$optvalue."\">".__translate(ucwords($value),true)."</option>";
													}
												}else{

													if($acao == 'gerenciar sl' && $i==0){
														$input .= "<option q-url='".$urlCategoria['link']."' data-select=\"".__translate(ucwords($value),true)."\" value=\"".@$optvalue."\" selected=\"selected\">".__translate(ucwords($value),true)."</option>";
													}else{
														$input .= "<option q-url='".$urlCategoria['link']."' data-select=\"".__translate(ucwords($value),true)."\" value=\"".$optvalue."\">".__translate(ucwords($value),true)."</option>";
													}
											}
										}
									}
									$i++;
							}
					}
					$input .= 	"</select>";
					$urlCategoria = $this->urlCategoria($selected[0]);

					$input .= $urlCategoria['html'].'
							</div>
							';

			}
			$ret = $input;
		}
		return $ret;
	}
	public function urlCategoria($sele){
		$url_categoria = false;
		$url_categoria = false;
		$selected[0] = $sele;
					if(isset($selected[0])){
						$arr_sele = explode('/',$selected[0]);
						if(isset($arr_sele[1])&&!empty($arr_sele[1])){
							$url_categoria = '/'.buscaValorDb($GLOBALS['tab9'],'token',$arr_sele[0],'url').'/'.buscaValorDb($GLOBALS['tab9'],'token',$arr_sele[1],'url');
						}else{
							$url_categoria = '/'.buscaValorDb($GLOBALS['tab9'],'token',$arr_sele[0],'url');
						}
					}
		$ret['link'] = $url_categoria;
		$ret['html'] = '<url_categoria style="display:none">'.$url_categoria.'</url_categoria>';
		return $ret;
	}
	public function resumoConteudoCurso($id_curso=false){
		//$ret['exec']=false;
		$ret['duracaoSeg']=0;
		$ret['duracaoHora']='00:00:00';
		$urlVid 		= 'Video';
		$urlProv 		= 'Prova';
		$urlExercicio 	= 'Exercicio';
		$urlApos 		= 'Apostila';
		$urlArt 		= 'Artigo';
		$ret['total'.$urlVid]=0;
		$ret['total'.$urlVid.'Html']='';

		$ret['total'.$urlProv]=0;
		$ret['total'.$urlProv.'Html']='';

		$ret['total'.$urlExercicio]=0;
		$ret['total'.$urlExercicio.'Html']='';

		$ret['total'.$urlApos]=0;
		$ret['total'.$urlApos.'Html']='';

		$ret['total'.$urlArt]=0;
		$ret['total'.$urlArt.'Html']='';
		$ret['totalAtividades'] = 0;
		$ret['duracaoTitleHtml'] = false;
		if($id_curso){
			$dados = dados_tab($GLOBALS['tab10'],'token,conteudo',"WHERE id='".$id_curso."'");
			//$tipo_conteudo_ead = dados_tab($GLOBALS['tab7'],'*',"WHERE id='".$id_curso."'");
			if($dados && !empty($dados[0]['conteudo'])){
				$arr_conteudo = json_decode($dados[0]['conteudo'],true);
				if(is_array($arr_conteudo)){
					//$ret['arr_conteudo'] = $arr_conteudo;
					foreach($arr_conteudo As $ke=>$val){
						$dadosConteMod = dados_tab($GLOBALS['tab38'],'token,conteudo',"WHERE id='".$val['idItem']."'");
						//$ret['arr_conteudo']['det'][$val['idItem']] = $dadosConteMod;
						if($dadosConteMod && !empty($dadosConteMod[0]['conteudo'])){
							$arr_conteudo_mod = json_decode($dadosConteMod[0]['conteudo'],true);
							if(is_array($arr_conteudo_mod)){
								foreach($arr_conteudo_mod As $k=>$v){
									$dadosConteAtv = dados_tab($GLOBALS['tab39'],'id,nome,token,duracao,tipo,unidade_duracao',"WHERE id='".$v['idItem']."' AND ".compleDelete());
									if($dadosConteAtv){
										if(isset($dadosConteAtv[0]['unidade_duracao']) && $dadosConteAtv[0]['unidade_duracao']=='min' && $dadosConteAtv[0]['duracao']){
											$dadosConteAtv[0]['duracao'] = ($dadosConteAtv[0]['duracao'] * 60);
											// if(isAdmin(1)){
											// 	lib_print($dadosConteAtv[0]['duracao']);
											// }
										}
										$ret['duracaoSeg']+= $dadosConteAtv[0]['duracao'];
										if($dadosConteAtv[0]['tipo']==$urlVid){
											$ret['total'.$urlVid] ++;
										}
										if($dadosConteAtv[0]['tipo']==$urlProv){
											// if (isset($_GET['fq'])) {
											// 	lib_print($dadosConteAtv[0]);
											// }
											$ret['total'.$urlProv] ++;
										}
										if($dadosConteAtv[0]['tipo']==$urlExercicio){
											$ret['total'.$urlExercicio] ++;
										}
										if($dadosConteAtv[0]['tipo']==$urlApos){
											$ret['total'.$urlApos] ++;
										}
										if($dadosConteAtv[0]['tipo']==$urlArt){
											$ret['total'.$urlArt] ++;
										}
									}
								}
								$ret['totalAtividades'] = ($ret['total'.$urlVid]) + ($ret['total'.$urlProv]) + ($ret['total'.$urlApos]) + ($ret['total'.$urlArt]) + ($ret['total'.$urlExercicio]);
							}
						}
					}
				}
			}
			$ret['duracaoHora'] = segundosEmHoras($ret['duracaoSeg']);
			$plVid=false;
			$plProv=false;
			$plExer=false;
			$plApos=false;
			$plArt=false;
			// if (isset($_GET['fq'])) {
			// 	lib_print($ret);
			// }
			if($ret['total'.$urlVid]>1){
				$plVid='s';
			}
			if($ret['total'.$urlProv]>1){
				$plProv='s';
			}
			if($ret['total'.$urlExercicio]>1){
				$plExer='s';
			}
			if($ret['total'.$urlApos]>1){
				$plApos='s';
			}
			if($ret['total'.$urlProv]>1){
				$plArt='s';
			}

			$ret['total'.$urlVid.'Html']='<label class="'.$urlVid.'"><i class="'.buscaValorDb($GLOBALS['tab7'],'nome',$urlVid,'icon').'"></i> '.$ret['total'.$urlVid].' Videoaula'.$plVid.'</label>';
			$ret['total'.$urlProv.'Html']='<label class="'.$urlProv.'"><i class="'.buscaValorDb($GLOBALS['tab7'],'nome',$urlProv,'icon').'"></i> '.$ret['total'.$urlProv].' '.$urlProv.$plProv.'</label>';
			$ret['total'.$urlExercicio.'Html']='<label class="'.$urlExercicio.'"><i class="'.buscaValorDb($GLOBALS['tab7'],'nome',$urlExercicio,'icon').'"></i> '.$ret['total'.$urlExercicio].' '.str_replace('Exercicio','Exercício',$urlExercicio).$plApos.'</label>';
			$ret['total'.$urlApos.'Html']='<label class="'.$urlApos.'"><i class="'.buscaValorDb($GLOBALS['tab7'],'nome',$urlApos,'icon').'"></i> '.$ret['total'.$urlApos].' '.$urlApos.$plApos.'</label>';
			$ret['total'.$urlArt.'Html']='<label class="'.$urlArt.'"><i class="'.buscaValorDb($GLOBALS['tab7'],'nome',$urlArt,'icon').'"></i> '.$ret['total'.$urlArt].' '.$urlArt.$plArt.'</label>';
			if($ret['total'.$urlVid]>0)
				$ret['duracaoTitleHtml'] .= $ret['total'.$urlVid.'Html'].' ';
			if($ret['total'.$urlProv]>0)
				$ret['duracaoTitleHtml'] .= $ret['total'.$urlProv.'Html'].' ';
			if($ret['total'.$urlExercicio]>0)
				$ret['duracaoTitleHtml'] .= $ret['total'.$urlExercicio.'Html'].' ';
			if($ret['total'.$urlArt]>0)
				$ret['duracaoTitleHtml'] .= $ret['total'.$urlArt.'Html'].' ';
			if($ret['total'.$urlApos]>0)
				$ret['duracaoTitleHtml'] .= $ret['total'.$urlApos.'Html'].' ';
		}
		return $ret;
	}
	public function frmCursoEad($config=false){
		$ret = false;
		if($config['tab']){
			//echo 'aqui';
			$campo_bus = isset ($config['campo_bus']) ? $config['campo_bus'] : 'nome';
			if(isset($_GET['origem'])&&!empty($_GET['origem'])){
				$_GET['origem'] = base64_decode($_GET['origem']);
			}
			if($config['get']['acao'] == 'cad'){
				$salv_cotinuar = "Salvar e Continuar";
				$type_cont = 'submit';
				$_GET['token'] = uniqid();
				$_GET['ativo'] = 's';
				//$_GET['ordenar'] = ultimoValarDb($tab18,'ordenar')+1;
				$data_bt = 'continuar';
				$_GET['categoria'] = isset ($_GET['categoria']) ? $_GET['categoria'] : false;
			}
			if($config['get']['acao'] == 'alt'){
						$type_cont = 'button';
						$salv_cotinuar = "Novo cadastro";
						$data_bt = 'novo';
						$sql = "SELECT * FROM ".$config['tab']." WHERE `".$config['campo_id']."` = '".base64_decode($config['get']['id'])."'";//echo $sql;
						$dados = buscaValoresDb($sql);
						if($dados){
										foreach($dados[0] As $key=>$value){
											if($key == 'informacoes' || $key == 'contrato' || $key == 'config'){
												$_GET[$key] = json_decode($value,true);
											}elseif($key == 'categoria'){
												$_GET[$key] = isset ($_GET[$key]) ? $_GET[$key] : $value;
											}else{
												$_GET[$key] = $value;
											}
										}
						}
						$_GET['salv_label'] = "Alterar";

						if(isset($_GET['valor'])){
							$_GET['valor'] = number_format($_GET['valor'],"2",",",".");
						}
						if(isset($_GET['valor_parcela'])){
							$_GET['valor_parcela'] = number_format($_GET['valor_parcela'],"2",",",".");
						}
						if(isset($_GET['inscricao'])){
							$_GET['inscricao'] = number_format($_GET['inscricao'],"2",",",".");
						}
						if(isset($_GET['token']) && empty($_GET['token'])){
							$_GET['token'] = uniqid();
						}
						if(isset($_GET['DtNasc'])){
							$_GET['DtNasc'] = dataExibe($_GET['DtNasc'],"2",",",".");
						}
			}
			$config['get'] = $_GET;
			$selectGestor=new selectGestor;
			$config['get']['listPos'] = isset($config['get']['listPos']) ? $config['get']['listPos'] : true;
			$config['get']['etp'] = !empty($config['get']['etp']) ? $config['get']['etp'] : base64_encode('etp1');
			if(Url::getURL(1) != NULL){
					$urlAmigo = '/'.Url::getURL(1);
			}else{
				$urlAmigo = false;
			}
			$link_bt_voltar = RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&regi_pg='.$config['get']['regi_pg'].'&pag='.$config['get']['pag'].'&acao=list&idCad='.@$_GET['token'];
			$link_bt_voltar1 = RAIZ.'/'.Url::getURL(0).'?sec='.base64_encode($config['sec']).'&regi_pg='.$config['get']['regi_pg'].'&pag='.$config['get']['pag'].'&acao=list&idCad='.@$_GET['token'];
			$config['link_bt_voltar'] = $link_bt_voltar;
			if($config['get']['origem'] == 'site'){
				$link_bt_voltar1 = 'reload';
			}
			if($config['get']['listPos']==='false'){
					$popupCaBus = false;
			}else{
					$popupCaBus = 'window.opener.popupCaBus(\''.$link_bt_voltar1.'\')';
			}
			$config['get']['etp'] = base64_decode($config['get']['etp']);
			if($config['get']['etp']=='etp1'){
				$active1 = 'active';
				$active2 = false;
				$active3 = false;
				$active4 = false;
				$active5 = false;
			}
			if($config['get']['etp']=='etp2'){
				$active1 = false;
				$active2 = 'active';
				$active3 = false;
				$active4 = false;
				$active5 = false;
			}
			if($config['get']['etp']=='etp3'){
				$active1 = false;
				$active2 = false;
				$active3 = 'active';
				$active4 = false;
				$active5 = false;
			}
			if($config['get']['etp']=='etp4'){
				$active1 = false;
				$active2 = false;
				$active3 = false;
				$active4 = 'active';
				$active5 = false;
			}
			if($config['get']['etp']=='etp5'){
				$active1 = false;
				$active2 = false;
				$active3 = false;
				$active4 = false;
				$active5 = 'active';
			}
			$config['link_bt_voltar'] = 'javascript:void(0);';
			$ret .= '<div class="row well" style="padding-top:10px">';
			$ret .= '<div class="col-md-12 mens"></div>';
						$ret .= '<div class="col-sm-12 padding-none" style="padding-top:10px">';
									$ret .= '<form role="form" id="form_cad_curso" method="post">';
										$ret .= '<div id="verNoSite" class="col-sm-12" >';
										if($_GET['acao'] == 'alt'){
											$tk = "";
											if(is_adminstrator(1)){
												$tk = ' Token: <b>'.$_GET['token'].'</b>';
											}
											$ret .= '<div class="col-sm-12 text-right">ID: <b>'.$_GET['id'].'</b> '.$tk.'</div>';

											$novel1 = $this->urlCategoria($_GET['categoria']);
											$compleLink = false;
											if($config['get']['etp']=='etp3' || $config['get']['etp']=='etp5'){
												$compleLink = '/preview';

											}
											if($config['get']['etp']=='etp3'){
												$resumoConteudoCurso = $this->resumoConteudoCurso($_GET['id']);
												if($resumoConteudoCurso['duracaoSeg'] != $_GET['duracao']){
													$_GET['duracao'] = $resumoConteudoCurso['duracaoSeg'];
												}
											}
											$configUrl = array('nivel0'=>'','nivel1'=>'cursos'.$novel1['link'],'nivel2'=>$_GET['url'],'nivel3'=>'/'.$compleLink,'campo'=>'dados[cab][url]');
											$ret .= lib_gerUrlPagina($configUrl);
										}
										$ret .= '</div>';
										if($_GET['acao']=='cad'){
											if(isset($_REQUEST['dadosCopiados'])){
												$copiar = new copiar;
												$ret .= $copiar->camposImputs($_REQUEST['dadosCopiados'],'dados[cab]',array('descricao','obs','data'));
											}
										}
										$ret .= '<div class="col-sm-12 padding-none">';
												$configct = array(
															'tipo'=>'e',
															'label'=>$lab_categoria,
															'nome'=>'dados[cab][categoria]',
															'class'=>'col-sm-12 m-bp padding-none',
															'selected'=>array(@$_GET['categoria'],''),
															'event'=>'required'
												);
												if(isAero()){
													$configct['class'] = 'col-sm-12 m-bp padding-none';
												}
												$ret .= '<categoria>'.$this->selectCategoria($configct).'</categoria>';
												if(isAero() && ($_GET['categoria']=='cursos_presencias_pratico' || $_GET['categoria']=='cursos_presencias_teorico')){

													$arr_tipo_curso = sql_array("SELECT * FROM ".$GLOBALS['tab36']." WHERE ativo='s' ORDER BY id ASC",'nome','id');
													$config['campos_form0'][0] = array('type'=>'select','size'=>'4','campos'=>'dados[cab][tipo]-Tipo de curso','opcoes'=>$arr_tipo_curso,'selected'=>@array(@$_GET['tipo'],''),'css'=>'','event'=>'required','obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'','sele_obs'=>'-- Selecione--','title'=>'');
												}

												$event = 'onchange="carregalib_gerUrlPaginaEad3(jQuery(this),\'cursos\'+jQuery(\'url_categoria\').html()+\'\');" required';
												$config['campos_form0'][1] = array('type'=>'text','size'=>'4','campos'=>'dados[cab][nome]-Nome interno (que aparece na área de administração)*-Nome interno','value'=>@$_GET['nome'],'css'=>false,'event'=>$event,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
												$config['campos_form0'][3] = array('type'=>'text','size'=>'4','campos'=>'dados[cab][titulo]-Nome (Que aparece na área do aluno)*-Nome','value'=>@$_GET['titulo'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
												$arr_status = sql_array("SELECT * FROM status ORDER BY id DESC",'abv','id');
												$dadosAtivo = array(
																			'id'=>'ativo',
																			'titulo'=>'Ativar',
																			'tam'=>'2',
																			'campo'=>'dados[cab][ativo]',
																			'acao'=>@$config['get']['acao'],
																			'corActive'=>'success',
																			'corNotActive'=>'danger',
																			'value'=>@$_GET['ativo'],
																			'padrao'=>'n',
																			'title'=>'Selecione SIM para ser liberdo',
																			'opcoes'=>$arr_status
																);
												$dadosdestaque = array(
																			'id'=>'destaque',
																			'titulo'=>'Destacar no site',
																			'tam'=>'2',
																			'campo'=>'dados[cab][destaque]',
																			'acao'=>@$config['get']['acao'],
																			'corActive'=>'success',
																			'corNotActive'=>'danger',
																			'value'=>@$_GET['destaque'],
																			'padrao'=>'s',
																			'title'=>'Selecione SIM para aparecer na primeira página do site',
																			'opcoes'=>$arr_status
																);

												$config['campos_form0'][5] = array('type'=>'number','size'=>'2','campos'=>'dados[cab][duracao]-Carga horária-','value'=>@$_GET['duracao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
												if($_GET['categoria']=='cursos_online' || $_GET['categoria']=='cursos_semi_presencias'){
													$arr_dura = sql_array("SELECT * FROM unidade_duracao WHERE `ativo`='s' AND id='1' ORDER BY id ASC",'nome','abv');
												}else{
													$arr_dura = sql_array("SELECT * FROM unidade_duracao WHERE `ativo`='s' ORDER BY id ASC",'nome','abv');
												}
												$config['campos_form0'][6] = array('type'=>'select','size'=>'2','campos'=>'dados[cab][unidade_duracao]-Unidade de duração','opcoes'=>$arr_dura,'selected'=>@array(@$_GET['unidade_duracao'],''),'css'=>'','event'=>false ,'obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
												$config['campos_form0'][2] = array('type'=>'chaveSimNao','dados'=>$dadosAtivo);

												$config['campos_form0'][4] = array('type'=>'chaveSimNao','dados'=>$dadosdestaque);
												$ret .= formCampos($config['campos_form0']);
												$compleSqlProf = "";
												$compleSqlProf = "WHERE `contas_usuarios`='".$_SESSION[SUF_SYS]['dadosConta'.SUF_SYS]['token']."' AND `permissao` ='6'  AND ".compleDelete();
												$conteudoPainelInst = array(
													'tam'=>8,
													'select'=>array('db'=>'remoto','tab_arr'=>'usuarios_sistemas','campo_bus'=>'email','campo'=>'dados[cab][professor]',
													'value'=>@$_GET['professor'],'label'=>'Instrutor','compleSql'=>base64_encode($compleSqlProf)),
													'list_campos'=>array('ID'=>'id','Nome'=>'nome','Email'=>'email','Celular'=>'celular'),
												);
												$titleTextarea = 'Cadastre aqui os seus instrutores';
												$conteudoPainelInst['frm_selectGestor'][0] = array('type'=>'text','size'=>'6','campos'=>'nome-Primeiro nome*','value'=>false,'css'=>'text-align:lef;','event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
												$conteudoPainelInst['frm_selectGestor'][1] = array('type'=>'text','size'=>'6','campos'=>'sobrenome-Sobrenome*','value'=>false,'css'=>'text-align:lef;','event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
												$conteudoPainelInst['frm_selectGestor'][2] = array('type'=>'text','size'=>'10','campos'=>'email-Email','value'=>false,'css'=>'text-align:lef;','event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
												$conteudoPainelInst['frm_selectGestor'][3] = array('type'=>'text','size'=>'2','campos'=>'celular-Celular','value'=>false,'css'=>'text-align:lef;','event'=>'inp="celular"','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
												$conteudoPainelInst['frm_selectGestor'][4] = array('type'=>'textarea','size'=>'12','campos'=>'obs-Descrição','value'=>false,'css'=>'text-align:lef;','event'=>'editor="false"','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
												$conteudoPainelInst['frm_selectGestor'][5] = array('type'=>'hidden','size'=>'1','campos'=>'permissao-permissao','value'=>6,'css'=>'text-align:lef;','event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
												//$conteudoPainelInst['frm_selectGestor'][6] = array('type'=>'hidden','size'=>'1','campos'=>'sec-','value'=>'usuarios_conta','css'=>'text-align:lef;','event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
												$conteudoPainelInst['frm_selectGestor'][7] = array('type'=>'hidden','size'=>'1','campos'=>'contas_usuarios-','value'=>$_SESSION[SUF_SYS]['dadosConta'.SUF_SYS]['token'],'css'=>'text-align:lef;','event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
												$titleTextarea = '<div class="col-sm-12 padding-none">Para editar todos os dados o instrutor <a href="'.RAIZ.'/config2?sec=dXN1YXJpb3NfY29udGE=&acao=alt&id={id_base}">Clique aqui</a></div>';
												$conteudoPainelInst['compleConteudo'] = $titleTextarea;
												$ret .= $selectGestor->select($conteudoPainelInst);
												$ret 		.= queta_formfield4("hidden",'1',"dados[cab][id]-", @$_GET['id'],"","");
												$ret 		.= queta_formfield4("hidden",'1',"dados[cab][campo_id]-", "id","","");
												$ret 		.= queta_formfield4("hidden",'1',"dados[cab][campo_bus]-", $campo_bus,"","");
												//$ret 		.= queta_formfield4("hidden",'1',"tab-", base64_encode($config['tab']),"","");
												if($config['get']['acao'] == 'alt')
													$ret 		.= queta_formfield4("hidden",'1',"dados[cab][atualizado]-", date('Y-m-d H:m:i'),"","");
												$ret 		.= queta_formfield4("hidden",'1',"dados[cab][conf]-", "s","","");
												$ret 		.= queta_formfield4("hidden",'1',"dados[cab][token]-", $_GET['token'],"","");
												$ret 		.= queta_formfield4("hidden",'1',"dados[cab][autor]-",  $_SESSION[SUF_SYS]['id'.SUF_SYS],"","");
												$ret 		.= queta_formfield4("hidden",'1',"ac-", $config['get']['acao'],"","");
												$ret 		.= queta_formfield4("hidden",'1',"sec-", $config['sec'],"","");
										$ret .= '</div>';
									$ret .= '</form>';

										$ret .= '<div class="col-sm-12" style="padding-top:10px">';
										if($config['get']['acao'] == 'cad'){
												$ret .= '<ul class="nav nav-tabs">
																  <li class="'.$active1.'"><a  href="'.lib_trataAddUrl('etp',base64_encode('etp1')).'"> <b>1</b> - <i class="fa fa-info"></i> Informações</a></li>
																  <li class="'.$active2.'"><a  href="javascript:void(0);" que-tab> <b>2</b> - <i class="fa fa-photo"></i>  Imagem</a></li>
																  <li  class="'.$active3.'"><a  href="javascript:void(0);" que-tab> <b>3</b> - <i class="glyphicon glyphicon-th"></i> Conteúdo</a></li>
																  <li  class="'.$active4.'"><a  href="javascript:void(0);" que-tab> <b>4</b> - <i class="glyphicon glyphicon-cog"></i>  Configurações</a></li>
																  <li  class="'.$active5.'"><a  href="javascript:void(0);" que-tab> <b>5</b> - <i class="fa fa-comments"></i> Perguntas</a></li>
															</ul>';
										}
										if($config['get']['acao'] == 'alt'){
												$ret .= '<ul class="nav nav-tabs">
																  <li class="'.$active1.'"><a  href="'.lib_trataAddUrl('etp',base64_encode('etp1')).'"> <b>1</b> - <i class="fa fa-info"></i> Informações</a></li>
																  <li class="'.$active2.'"><a  href="'.lib_trataAddUrl('etp',base64_encode('etp2')).'"> <b>2</b> - <i class="fa fa-photo"></i>  Imagem</a></li>
																  <li  class="'.$active3.'"><a  href="'.lib_trataAddUrl('etp',base64_encode('etp3')).'"> <b>3</b> - <i class="glyphicon glyphicon-th"></i> Conteúdo</a></li>
																  <li  class="'.$active4.'"><a  href="'.lib_trataAddUrl('etp',base64_encode('etp4')).'"> <b>4</b> - <i class="glyphicon glyphicon-cog"></i>  Configurações</a></li>
																  <li  class="'.$active5.'"><a  href="'.lib_trataAddUrl('etp',base64_encode('etp5')).'"> <b>5</b> - <i class="fa fa-comments"></i> Perguntas</a></li>
															</ul>';
										}
										$ret .= '</div>';
										$ret .= '
									<div class="tab-content">';
									///*****inicio Etp 1
									$dataSerialize = false;
									$disableEdiUrl = false;
									if($config['get']['etp']=='etp1'){
											$ret .= carregaEditorSumuer2('250','[name="dados[cab][descricao]"],[name="dados[cab][obs]"]',$placeholder=false);
											$dataSerialize = '+\'&\'+jQuery(\'#form_cad_etp1\').serialize()';
											$ret .= '<form role="form" id="form_cad_etp1" method="post">';
													$ret .= '<div id="'.$config['get']['etp'].'" class="tab-pane fade in '.$active1.'">';
														$ret .= '<div class="col-sm-12">';

																				$ret .='<div class="col-sm-12 padding-none" style="" id="desc">';
																				$config['campos_form'][0] = array('type'=>'textarea','size'=>'12','campos'=>'dados[cab][descricao]-Descrição','value'=>@$_GET['descricao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
																				$config['campos_form'][2] = array('type'=>'textarea','size'=>'12','campos'=>'dados[cab][obs]-Observações','value'=>@$_GET['obs'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);

																				$ret .='</div>';
																				//$arr_instrutor = sql_array_SERVER("SELECT * FROM `usuarios_sistemas` WHERE `permissao`='6' ORDER BY id ASC",'nome','id');
																				//$config['campos_form'][0] = array('type'=>'select','size'=>'6','campos'=>'dados[cab][professor]-Instrutor','opcoes'=>$arr_instrutor,'selected'=>@array(@$_GET['professor'],''),'css'=>'','event'=>false,'obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'','sele_obs'=>'-- Selecione--','title'=>'');
																				//$config['campos_form'][1] = array('type'=>'text','size'=>'12','campos'=>'dados[cab][professor]-Professor-Nome do professor','value'=>@$_GET['professor'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);

																				$config['campos_form'][5] = array('type'=>'textarea','size'=>'12','campos'=>'dados[cab][meta_descricao]-Meta descrição (SEO)','value'=>@$_GET['meta_descricao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
																				$eventUrl = 'onchange="carregalib_gerUrlPaginaEad3(jQuery(this),\'cursos\'+jQuery(\'url_categoria\').html()+\'\',2);" required';
																				if($_GET['acao']=='alt' && !empty($_GET['url'])){
																					$disableEdiUrl = 'disabled';
																				}
																				$config['campos_form'][6] = array('type'=>'url','size'=>'12','campos'=>'dados[cab][url]-Url do curso no site (SEO)','value'=>@$_GET['url'],'css'=>false,'event'=>$eventUrl.' '.$disableEdiUrl,'clrw'=>false,'obs'=>false,'outros'=>Qlib::qoption('dominio_site').'/','class'=>false,'title'=>false);
																				//$ret .= '<h2><i class="fa fa-info"></i> Conteúdo do módulo</h2>';
																				$ret .= formCampos($config['campos_form']);

															$ret .= '</div>';
													$ret .= '</div>';
											$ret .= '</form>';
									}

									///*****inicio Etp 2

									if($config['get']['etp']=='etp2'){
										$dataSerialize = '+\'&\'+jQuery(\'#form_cad_etp2\').serialize()';
										//$ret .= '<form role="form" id="form_cad_etp2" method="post">';
										$ret .= '
										  <div id="'.$config['get']['etp'].'" class="col-sm-12 '.$active2.'" style="margin-top:10px">';
										$conteudoArq = false;
										$conteudoArq .= '<div class="col-sm-12 padding-none" style="">';
											$infoDica = 'A primeira foto será à de <b>capa</b> e a segunda é a do <b>banner</b> que aparece no topo da página de detalhes <br>Tipos de arquivos suportados: <b> .jpg, .png, .jpeg</b> Tamanho máx: <b>900kb</b>';
											$arr_config1 = array(
													'ta'=>'imagem_arquivo',
													'token'=>$_GET['token'],
													'pasta'=>'ead',
													'label'=>'Imagem-'.$infoDica,
													'tam'=>'3',
													'type'=>1,
													'tipos'=>'jpg@png@jpeg',
													'seletor'=>'ger1',
													'botao_fenchar_modal'=>true,
													'titulo_janela_modal'=>'Adicionar Arquivos',
													'consulta'=>"WHERE id_produto='".$_GET['token']."'"
												);

											$conteudoArq .= gerAddArquivos($arr_config1);
										$conteudoArq .= '</div>';
										$conteudoArq .= '
											</div>';
										$configPainelArq = array('titulo'=>'Imagem de capa','conteudo'=>$conteudoArq,'id'=>'dadosArq','in'=>'in','condiRight'=>false,'tam'=>'12 painel-pn-arq');
										$ret .= lib_painelCollapse($configPainelArq);

									}
									///*****inicio Etp 3

									if($config['get']['etp']=='etp3'){
												$ret .='<div class="col-sm-12 padding-none" style="margin-top:10px;">';
										if($_GET['categoria']=='cursos_presencias_pratico' && isAero()){
												$dataSerialize = '+\'&\'+jQuery(\'#form_cad_etp3\').serialize()';
												$temaetp3 = '<div class="col-sm-12">{conteudo}</div>';
												$conteudo = $this->gerModulosCursos($config);
												$conteudoArq = str_replace('{conteudo}',$conteudo,$temaetp3);;
												$ret .= '<form role="form" id="form_cad_etp3" method="post">';
												$btnEtp3 = '<button type="button" class="btn btn-default" title="Gerenciar Aeronaves" btn-ger="aeronave"><i class="fa fa-pencil"></i> </button>';
												$btnEtp3 .= '<button type="button" class="btn btn-primary" title="Cadastrar Aeronaves" btn-add="aeronave"><i class="fa fa-plus"></i> Aeronaves</button>';
												$configPainelArq = array('titulo'=>'<i class="fa fa-plane"></i> Módulos','conteudo'=>$conteudoArq,'id'=>'dadosArq','in'=>'in','condiRight'=>$btnEtp3,'tam'=>'12 painel-pn-arq');
												$ret .= lib_painelCollapse($configPainelArq);
												$ret .= '</form>';
										}else{
													if(($_GET['acao'] == 'alt' || $_GET['acao1'] == 'alt') && is_adminstrator(7)){
															$relacionado['local']				= 'Módulos';
															$relacionado['tab']			 		= $GLOBALS['tab10'];
															$relacionado['tab_item'] 			= $GLOBALS['tab38'];
															$relacionado['campo_bus_item']		= 'id';
															$relacionado['campo_enc_item']		= 'nome';
															$relacionado['grava_relacionado'] 	= 'conteudo';
															$relacionado['label_legend']		= 'Gerenciar Conteúdo do curso';
															$relacionado['label_bt1']			= 'Adicionar um módulo existente';
															$relacionado['label_bt2']			= 'Cadastrar '.$relacionado['local'];
															$relacionado['url_alt_item'] 		= 'ead/iframe?sec=bW9kdWxvcy1lYWQ=&acao=alt&listPos=conteCurso&token_curso='.$_GET['token'];
															$relacionado['cad_item'] 			= 'iframe?sec=bW9kdWxvcy1lYWQ=&acao=cad&listPos=conteCurso&local=curso&token_curso='.$_GET['token'];
															$relacionado['pasta'] 				= 'ead';
															$relacionado['token'] 				= $_GET['token'];
															$relacionado['conteudo'] 		= $_GET['conteudo'];
															$item = array(
																								'tab'=>$GLOBALS['tab38'],
																								'titulo'=>'Encontrar '.$relacionado['local'],
 																								'id'=>'id',
																								'label_campo'=>'nome',
																								'campo'=>'nome',
																								'value'=>'',
																								'type'=>'1',
																								'sec'=>'bW9kdWxvcy1lYWQ=',
																								'placeholder'=>'Digite o nome de um modulo...',
																								'campoOrdem'=>'ordenar',
																								'comple'=>"",
																								'ordenar'=>"ORDER BY ordenar ASC"
															);
															$gerConteudo = $this->gerAddRelacionar($relacionado,$item);
															$ret .= '<div class="col-sm-12">'.$gerConteudo.'</div>';
															if(isset($resumoConteudoCurso['duracaoSeg'])){

															}
													}
										}
									$ret .='</div>';
									$ret .='<script>jQuery(function(){atualizaCategoriaCurso();});</script>'; //atualiza as categorias

									}
									///*****inicio Etp 4

									if($config['get']['etp']=='etp4'){
										$dataSerialize = '+\'&\'+jQuery(\'#form_cad_etp4\').serialize()';
										$ret .= '<style>[div-id="dados[cab][config][turma]"]{padding:0px}</style>';
										$ret .= '<form role="form" id="form_cad_etp4" method="post">';
										$ret .= '
										  <div id="'.$config['get']['etp'].'" class="col-sm-12 '.$active2.'" style="margin-top:10px">';
										//if($_GET['categoria']==2){
											$conteudoPainelConf = array(
												'tam'=>12,
												'select'=>array('tab_arr'=>$GLOBALS['tab11'],'campo'=>'dados[cab][config][turma]','event'=>'required',
												'value'=>@$_GET['config']['turma'],
												'title'=>'Se o curso for online a turma poderá determinar o tempo em que o aluno terá acesso, ao curso.',
												'label'=>'Turmas deste curso','compleSql'=>base64_encode("WHERE id_curso='".$_GET['id']."' AND ".compleDelete()),
												),
												'list_campos'=>array('ID'=>'id','Nome'=>'nome','inicio'=>'inicio','Fim'=>'fim','Máx Alunos'=>'max_alunos','Curso'=>'id_curso#'.$GLOBALS['tab10'].'#nome#id'),
											);
											$titleTextarea = "Cadastre aqui somente as turmas <b>".$_GET['nome'].'</b>, para gerenciar outras turmas <a href="'.RAIZ.'/cursos?sec=dG9kYXMtdHVybWFz" target="_BLANK">Clique aqui</a>';
											$conteudoPainelConf['frm_selectGestor'][0] = array('type'=>'text','size'=>'12','campos'=>'nome-Nome','value'=>false,'css'=>'text-align:lef;','event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
											$conteudoPainelConf['frm_selectGestor'][1] = array('type'=>'text','size'=>'4','campos'=>'inicio-Início','value'=>false,'css'=>'text-align:lef;','event'=>'data-lng="pt"','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
											$conteudoPainelConf['frm_selectGestor'][2] = array('type'=>'text','size'=>'4','campos'=>'fim-Fim','value'=>false,'css'=>'text-align:lef;','event'=>'data-lng="pt"','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
											$conteudoPainelConf['frm_selectGestor'][3] = array('type'=>'number','size'=>'4','campos'=>'max_alunos-Max Alunos','value'=>false,'css'=>'text-align:lef;','event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
											//$conteudoPainelConf['frm_selectGestor'][3] = array('type'=>'textarea','size'=>'12','campos'=>'descricao-Descrição','value'=>false,'css'=>'text-align:lef;','event'=>'editor="false"','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
											$conteudoPainelConf['frm_selectGestor'][4] = array('type'=>'hidden','size'=>'12','campos'=>'id_curso-id_curso','value'=>$_GET['id'],'css'=>'text-align:lef;','event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
											$conteudoPainelConf['compleConteudo'] = $titleTextarea;
											$checkboxExge_turma = false;
											if(isset($_GET['config']['exigir_turma']) && $_GET['config']['exigir_turma']=='s'){
												$checkboxExge_turma = 'checked';
											}
											$conteudoConf = $selectGestor->select($conteudoPainelConf);
											if($config['get']['acao']=='alt'){
												$dadosTurmaSele = dados_tab($GLOBALS['tab11'],'id,nome,inicio,fim',"WHERE id='".$_GET['config']['turma']."'");
												$inicioTurma = CalcularDiasAnteriores(date('d/m/Y'),$dias=10,$formato = 'd/m/Y');
												$totalTurmas = totalReg($GLOBALS['tab11'],"WHERE id_curso='".$_GET['id']."' AND inicio >= '".dtBanco($inicioTurma)."'");
												if($dadosTurmaSele){
													$conteudoConf .= '
													<div class="col-sm-12 text-right" id="dadosTurmaSele">
															<b>Turma:</b> <label>'.$dadosTurmaSele[0]['nome'].'</label>
															<b>Inicio:</b> <label>'.dataExibe($dadosTurmaSele[0]['inicio']).'</label>
															<b>Fim:</b> <label>'.dataExibe($dadosTurmaSele[0]['fim']).'</label>
															<b>Em andamento <i class="fa fa-question-circle" style="cursor:pointer" data-toggle="tooltip" title="Em andamento desde '.$inicioTurma.' e futuras" aria-hidden="true"></i>:</b> <label>'.$totalTurmas.'</label>
													</div>';
												}
											}
											$conteudoConf .= '<div class="col-sm-12"><label><input '.$checkboxExge_turma.' type="checkbox" name="dados[cab][config][exigir_turma]" value="s"> Permitir a venda somente quando tiver alguma turma disponível <i class="fa fa-question-circle" style="cursor:pointer" data-toggle="tooltip" title="O curso estará disponível para venda, somente se, tiver alguma turma cadastrada em andamento que iniciou a menos de 10 dias ou se tiver alguma turma que ainda vai começar." aria-hidden="true"></i></label></div>';
											//$configPainelConf = array('titulo'=>'Turma atual <b>'.$_GET['nome'].'</b>','conteudo'=>$conteudoConf,'id'=>'dadosConf','in'=>'in','condiRight'=>'<button type="button" class="btn btn-primary"><i class="fa fa-plus"></i></button>','tam'=>'6 painel-pn-conf');
											$configPainelConf = array('titulo'=>'Turmas do <b>'.$_GET['nome'].'</b>','conteudo'=>$conteudoConf,'id'=>'dadosConf','in'=>'in','condiRight'=>'','tam'=>'6 painel-pn-conf');
											$ret .= lib_painelCollapse($configPainelConf);

										//}
										$arr_status = sql_array("SELECT * FROM status ORDER BY id DESC",'nome','abv');
										$mark_prec = 'mark_prec';
										$markDiv = 'campos_prec';
										if($config['get']['acao']=='alt' && isset($_GET['config']['gratis']) && $_GET['config']['gratis']=='s'){
											$markDiv .= ' style="display:none"';
										}
										$event_parce = " onChange=\"dividir3(jQuery('[valor-curso]').val(),jQuery('[parcelas-curso]').val(),'[valor-parcelas]',jQuery('#promo_prec').val(),'#parcela_promo')\"";
										$config['campos_form2'][0] = array('type'=>'select','size'=>'12','campos'=>'dados[cab][config][gratis]-Curso grátis','opcoes'=>$arr_status,'selected'=>@array(@$_GET['config']['gratis'],''),'css'=>'','event'=>'que-bt="gratis"','obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
										$config['campos_form2'][1] = array('type'=>'moeda','size'=>'3','campos'=>'dados[cab][inscricao]-Inscrição-','value'=>@$_GET['inscricao'],'css'=>$markDiv,'event'=>$mark_prec,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
										$config['campos_form2'][2] = array('type'=>'moeda','size'=>'3','campos'=>'dados[cab][valor]-Valor do curso-','value'=>@$_GET['valor'],'css'=>$markDiv,'event'=>'required valor-curso '.$event_parce.' '.$mark_prec,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
										$config['campos_form2'][3] = array('type'=>'number','size'=>'3','campos'=>'dados[cab][parcelas]-parcelas-0','value'=>@$_GET['parcelas'],'css'=>$markDiv,'event'=>'parcelas-curso '.$event_parce.' '.$mark_prec,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
										$config['campos_form2'][4] = array('type'=>'moeda','size'=>'3','campos'=>'dados[cab][valor_parcela]-Valor da parcela-','value'=>@$_GET['valor_parcela'],'css'=>$markDiv,'event'=>'valor-parcelas '.$mark_prec,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
										$conteudoCustosCurso = formCampos($config['campos_form2']);
										$checkboxCustoCurso = false;
										if(isset($_GET['config']['preco']['oculta']) && $_GET['config']['preco']['oculta']=='s'){
											$checkboxCustoCurso = 'checked';
										}
										$checkboxInsCurso = false;
										if(isset($_GET['config']['ocultar_inscricao']) && $_GET['config']['ocultar_inscricao']=='s'){
											$checkboxInsCurso = 'checked';
										}
										$conteudoCustosCurso .= '<div class="col-sm-3"><label><input '.$checkboxInsCurso.' type="checkbox" name="dados[cab][config][ocultar_inscricao]" value="s"> Não exibir matrícula <i class="fa fa-question-circle" style="cursor:pointer" data-toggle="tooltip" title="Ao marcar esta opção a visualização do preço do matrícula não será exibido" aria-hidden="true"></i></label></div>';
										$conteudoCustosCurso .= '<div class="col-sm-5"><label><input '.$checkboxCustoCurso.' type="checkbox" name="dados[cab][config][preco][oculta]" value="s"> Ocultar preço para quem não está logado (Exceto matrícula) <i class="fa fa-question-circle" style="cursor:pointer" data-toggle="tooltip" title="Ao marcar esta opção a visualização do preço do curso ficará restrito, mais a matrícula continuará pública" aria-hidden="true"></i></label></div>';
										$configCustosCurso = array('titulo'=>'Custos do curso','conteudo'=>$conteudoCustosCurso,'id'=>'dadosCustCurs','in'=>'in','condiRight'=>'','tam'=>'6 painel-cust-curso');
										$ret .= lib_painelCollapse($configCustosCurso);
										$arr_tipoInicio=array('imediata'=>'Imediatamente após o pagamento','inicio_turma'=>'Somente com inicio da turma');
										$arr_liberaConteudo=array('uma_vez'=>'Todo conteudo de uma vêz','periodica'=>'periodicamente');
										$mark_lib_cont = 'mark_lib_cont';
										$event_lib_cont = false;
										if($config['get']['acao']=='alt' && isset($_GET['config']['libera_conteudo']['tipo']) && $_GET['config']['libera_conteudo']['tipo']=='uma_vez'){
											$markDiv .= ' style="display:none"';
											$event_lib_cont = 'disabled';
										}
										$_GET['config']['libera_conteudo']['qtd'] = !empty(@$_GET['config']['libera_conteudo']['qtd'])?$_GET['config']['libera_conteudo']['qtd']:'00:00:00';
										$titleHorPd = 'Quantidade de horas de video por dia Ex: 02:00, Será liberado 2 horas de videos por dia, apartir da liberação do primeiro conteúdo';
										$config['campos_form3'][0] = array('type'=>'select','size'=>'12','campos'=>'dados[cab][config][libera_conteudo][tipo_inicio]-'.__translate('Quando começará a liberação do conteúdo?',true),'opcoes'=>$arr_tipoInicio,'selected'=>@array(@$_GET['config']['libera_conteudo']['tipo_inicio'],''),'css'=>'','event'=>'','obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
										$config['campos_form3'][1] = array('type'=>'select','size'=>'12','campos'=>'dados[cab][config][libera_conteudo][tipo]-Como será a liberação do conteúdo?','opcoes'=>$arr_liberaConteudo,'selected'=>@array(@$_GET['config']['libera_conteudo']['tipo'],''),'css'=>'','event'=>'que-bt="libera_conteudo"','obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
										$config['campos_form3'][2] = array('type'=>'time','size'=>'4','campos'=>'dados[cab][config][libera_conteudo][qtd]-horas/dia-0','value'=>@$_GET['config']['libera_conteudo']['qtd'],'css'=>$markDiv,'event'=>'libera_conteudo '.$event_lib_cont.' '.$mark_lib_cont,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>$titleHorPd);
										$config['campos_form3'][4] = array('type'=>'number','size'=>'2','campos'=>'dados[cab][config][validade]-Validade-Ex.: 30','value'=>@$_GET['config']['validade'],'css'=>false,'event'=>false,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'O tempo em dias. que o aluno terá para ver o curso após ele começar.');
										$conteudoLibConteudo = formCampos($config['campos_form3']);
										$configCustosCurso = array('titulo'=>'Liberação conteudo','conteudo'=>$conteudoLibConteudo,'id'=>'dadosLibCon','in'=>'in','condiRight'=>false,'tam'=>'6 painel-lib-Cont');
										$ret .= lib_painelCollapse($configCustosCurso);
										/**certificado*/
										$conteudoConfCert = false;
										$arr_geraCer = array('auto'=>'Automática','admin'=>'Administrador do sistema');
										$config['campos_form_conf_cert'][0] = array('type'=>'select','size'=>'4','campos'=>'dados[cab][config][certificado][gera]-Geração do certificado','opcoes'=>$arr_geraCer,'selected'=>@array(@$_GET['config']['certificado']['gera'],''),'css'=>'','event'=>'','obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
										$config['campos_form_conf_cert'][1] = array('type'=>'input-group-text','size'=>'4','campos'=>'dados[cab][config][certificado][requisito]-Mínimo de frequência-Ex: 100','value'=>@$_GET['config']['certificado']['requisito'],'css'=>'','event'=>'','maxlength'=>'3','clrw'=>false,'obs'=>false,'outros'=>'%','class'=>false,'title'=>'Mínimo de frequência do curso para receber o certificado. Ex. se escolher 80 será necessário o aluno assistir 80% do curso para que tenha o certificado.');
										$config['campos_form_conf_cert'][2] = array('type'=>'input-group-text','size'=>'4','campos'=>'dados[cab][config][certificado][aproveitamento]-Mínimo de aproveitamento-Ex: 80','value'=>@$_GET['config']['certificado']['aproveitamento'],'css'=>'','event'=>'','maxlength'=>'3','clrw'=>false,'obs'=>false,'outros'=>'%','class'=>false,'title'=>'Mínimo de aproveitamento do curso para receber o certificado. Ex. se escolher 60 será necessário o aluno alcance 80% dos postos de todas as provas, para que tenha o certificado.');
										$config['campos_form_conf_cert']['ap'] = array('type'=>'number','size'=>'12','campos'=>'dados[cab][config][aproveitamento]-Aproveitamento Total %-Ex:70','value'=>@$_GET['config']['aproveitamento'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'O aproveitamento é calculado da seguinte forma: soma de aproveitamento de todas as provas e exercícios que são obrigatórios, se o aluno alcançar a quantidade de aproveitamento exigida no curso está aprovado.');


										$conteudoConfCert .= formCampos($config['campos_form_conf_cert']);
										$configPainelCert = array('titulo'=>'Certificado','conteudo'=>$conteudoConfCert,'id'=>'dadosConf','in'=>'in','condiRight'=>false,'tam'=>'6 painel-pn-cert');
										$ret .= lib_painelCollapse($configPainelCert);
										/**Requisitos*/
										$infoReShor = '<a href="javaScript:void(0)" title="Serve de atalho para incluir o nome do curso de requisito nas descrições do deste curso" data-toggle="tooltip"><i class="fa fa-question-circle"></i></a>';
										$arr_curso_req = sql_array("SELECT * FROM ".$GLOBALS['tab10']." WHERE id !='".@$_GET['id']."' AND ".compleDelete()." ORDER BY nome ASC",'nome','id','ativo',' Publicado: ');
										$config['campos_form_conf_req'][0] = array('type'=>'select','size'=>'12','campos'=>'dados[cab][config][requisito]-Requisito para fazer este curso','opcoes'=>$arr_curso_req,'selected'=>@array(@$_GET['config']['requisito'],''),'css'=>'','event'=>'data-live-search="true"','obser'=>'short_code: {curso_requisito} '.$infoReShor,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'','sele_obs'=>'-- Selecione--','title'=>'Selecione um curso que será vinculado como requisito para cursar este curso');

										$conteudoConfReq = formCampos($config['campos_form_conf_req']);
										$configPainelCert = array('titulo'=>'Requisitos','conteudo'=>$conteudoConfReq,'id'=>'dadosConf','in'=>'in','condiRight'=>false,'tam'=>'6 painel-pn-req');
										$ret .= lib_painelCollapse($configPainelCert);
										/**video de divulgação*/
										$config['campos_form_conf_'][0] = array('type'=>'input-group-text','size'=>'12','campos'=>'dados[cab][config][video]-link do youtube (divulgação do curso)-Ex: https://www.youtube.com/watch?v=PFNQ6cJ7EFI','value'=>@$_GET['config']['video'],'css'=>$outrosWebnar,'event'=>'input-video="youtube"'.$disabledWeb.' inpt-vide="web"','clrw'=>$outrosWebnar,'obs'=>false,'outros'=>'link','class'=>false,'title'=>false);
										$conteudoVideYou .= formCampos($config['campos_form_conf_']);
										$configPainelVideo = array('titulo'=>'Video de divulgação ','conteudo'=>$conteudoVideYou,'id'=>'dadosConf','in'=>'in','condiRight'=>false,'tam'=>'6 painel-pn-video');
										$ret .= lib_painelCollapse($configPainelVideo);
										/**configuração de cores no curso*/
										$conteudoConfAdc = '<div class="col-sm-12">';
										$conteudoConfAdc .= lib_paletaCores('dados[cab][config][adc][cor]','Cor',@$_GET['config']['adc']['cor']).'</div>';
										$conteudoConfAdc .= '</div>';
										$configAdc = array('titulo'=>'Configurações Adicionais','conteudo'=>$conteudoConfAdc,'id'=>'dadosLibCon','in'=>'in','condiRight'=>false,'tam'=>'6 painel-config-Adc');
										$ret .= lib_painelCollapse($configAdc);
										$ret .= '</form>';

									}

									 	///*****inicio Etp 5

									if($config['get']['etp']=='etp5'){
										$dataSerialize .= '+\'&\'+jQuery(\'#listComentarios\').serialize()';
									//$ret .= '<form role="form" id="form_cad_etp3" method="post">';
												$ret .='<div class="col-sm-12 padding-none" style="margin-top:10px;">';
									if(($_GET['acao'] == 'alt' || $_GET['acao1'] == 'alt') && is_adminstrator(3)){
											$mensagem = new mensagem;

											$ret .= '<div class="col-sm-12">'.@$mensagem->iniciarCursoEad_pergRespostas($config).'</div>';

									}
									$ret .='</div>';

									}
									  $ret .= '
									</div>';
						$ret		.= lib_btJanelaSalvar($config);
					$ret .= '</div>'; //col-sm-12
			$ret .= '</div>';   // row well
			$validaForm3=false;
			if($config['get']['etp']=='etp3'){
				$validaForm3 = '
				if(!validateTurmaCurso(\'[name="dados[cab][config][turma]"]\')) return false;
				';
			}
			$ret .= '
			<script>
				jQuery(document).ready(function () {
					jQuery(\'[name="dados[cab][url]"]\').on(\'click\',function(){
						if(jQuery(this).val()==\'\'){
							var valor = jQuery(\'[name="dados[cab][nome]"]\').val();
							if(valor!=\'\'){
								jQuery(this).val(urlAmigavel(valor));
							}
						}
					});
					//jQuery(\'[quet-prod="titulo"]\').html(\''.@$config['nomePost'].'\');
					var icon = "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i>";
					jQuery(\'[data-lng="pt"]\').mask(\'99/99/9999\');
					jQuery(\'[data-lng="pt"]\').datepicker({
						format: \'dd/mm/yyyy\',
						language: \'pt-BR\'
					});
					jQuery(\'body\').addClass(\'fixed-page-footer\');
					jQuery(\'[que-bt="voltar"]\').on(\'click\',function(){
						window.history.back();
					});
					jQuery(\'[name="nome"]\').on(\'change\',function(){
						jQuery(\'[name="url"]\').val(this.value);
					});
					jQuery(\'[type="submit"]\').on(\'click\',function(){
						var btn = jQuery(this).data(\'btn\');
						jQuery(\'#btn-ac\').html(btn);
						jQuery(\'#form_cad_curso\').submit();
					});
					';
			if(isset($select2Sele)){
			$ret .='
					jQuery(\''.$select2Sele.'\').select2({
							allowClear: true
					});';
			}
			if($config['get']['acao'] == 'alt'){
				$ret .= '
				jQuery(\'[data-btn="novo"]\').on(\'click\',function(){
					window.location = \''.RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&acao=cad\';
				});
			';
			}
			$ret .= 'jQuery(\'#form_cad_curso\').validate({
							submitHandler: function(form) {
								'.$validaForm3.'
								$.ajax({
									url: \''.RAIZ.'/app/'.$config['dire'].'/acao.php?ajax=s&opc=salvarCurso&acao='.$config['get']['acao'].'&campo_bus='.$campo_bus.'\',
									type: form.method,
									data: jQuery(form).serialize()'.$dataSerialize.',
									beforeSend: function(){
										jQuery(\'#preload\').fadeIn();
									},
									async: true,
									dataType: "json",
									success: function(response) {
										jQuery(\'#preload\').fadeOut();
										jQuery(\'.mens\').html(response.mensa);
										var bt_press = jQuery("#btn-ac").html();
										';

										if(isset($_GET['local'])){
												/*if($_GET['local'] == 'lcf'){
													if($config['sec'] == 'cad_fornecedores'){
														$popupCaBus = 'window.opener.popupBuscFornecedor(response.dataSalv)';
													}
													if($config['sec'] == 'cad_clientes'){
														$popupCaBus = 'window.opener.popupBuscCliente(response.dataSalv)';
													}
												}*/
										}

										if($config['get']['acao']=='alt'){
													$ret .=	'
													if(bt_press != \'continuar\'){
														'.$popupCaBus.';
													}
													';
										}
										if($config['get']['acao']=='cad'){
														$ret .=	'
														if(bt_press == \'salvar_permanecer\' && response.exec){
															var urlAb = \''.RAIZ.'/ead/iframe?sec='.base64_encode($config['sec']).'&list=false&regi_pg=40&pag=0&acao=alt&id=\'+btoa(response.idCad);
															window.location = urlAb;
															'.$popupCaBus.';
														}else{
															'.$popupCaBus.';
														}
														';
										}
										$ret .=	'

										if(bt_press == \'finalizar\'){
											window.close();
										}
										if(bt_press == \'salvar_abrir_novo\'){
											window.location = \''.RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&acao=cad\';
										}
										if(response.exec){
											if(response.list){
												jQuery(\'#exibe_list\').html(response.list);
												//jQuery("#myModal2").modal("hide");
											}

										}
									},
									error: function(error){
										jQuery(\'#preload\').fadeOut();
										alert(\'ERRO AO SALVAR ENTRE EM CONTATO COM O SUPORTE '.suporteTec().'\');
										console.log(error);
									}
								});

							},
							ignore: ".ignore",
							rules: {
								nome: {
									required: true
								}
							},
							messages: {
								nome: {
									required: icon+" '.__translate('Por favor preencher este campo',true).'"
								}
							}
					});
				});
			</script>';
		}else{
			$ret = formatMensagem('Tabela não definida','danger',4444);
		}
		return $ret;
	}
	/*public function duracaoCurso($config=false){
		$ret = false;
		if($config){

		}
		return $ret;
	}*/
	function gerModulosCursos($config=false){
		$ret = false;
		if($config){
			$ret .= '<div class="col-md-12" style="border-top:1px solid #ccc">';
			$ret .= '<form id="form-gr-modulos" method="post">';
			//$ret .= '<h2><i class="fa fa-plane"></i> Módulos</h2>';
			if(isset($_GET['modulos']) && !empty($_GET['modulos'])){
				$ret .= $this->listModCursos($_GET['modulos']);
			}else{
			$arrLst = array(1);
					$ret .= '<div class="col-sm-12 padding-none" id="pcot">';
				$i = 1;
				$configSAviao=array('tab'=>$GLOBALS['tab54'],'selected'=>false,'tam'=>'12','label'=>'');
				$configSAviao['name'] = 'dados[cab][modulos][*|id|*][aviao]';
				$configSele = $configSAviao;
				$configSele['selectpicker'] = '*|selectpi|*';
				$ret .= '<sele style="display:none;">'.$this->selectMultipleAeronave($configSele).'</sele>';
				foreach($arrLst As $key=>$val){
					$id = $val;
					$configSAviao['name'] = 'dados[cab][modulos]['.$id.'][aviao]';

			$ret .= '<div class="col-sm-12 list-pacote padding-none" id="modulo_'.$id.'">
							<div class="col-sm-4 padding-none"><div class="col-sm-4 padding-none text-right">Módulo: </div><div class="col-sm-8"><input class="form-control" placeholder="Título do módulo" type="text" name="dados[cab][modulos]['.$id.'][titulo]" value="" /></div></div>
							<div class="col-sm-3 padding-none"><div class="col-sm-4 padding-none text-right">Limite: </div><div class="col-sm-4"><input class="form-control" type="text" name="dados[cab][modulos]['.$id.'][limite]" value="" /></div><div class="col-sm-2 padding-none">horas</div></div>
							<div class="col-sm-5 padding-none"><div class="col-sm-11 padding-none">'.$this->selectMultipleAeronave($configSAviao).'</div>
								<div class="col-sm-1 padding-none">
										<button type="button" title="Remover" class="btn btn-danger" id-modulo="'.$id.'" onclick="delModulo('.$id.');"><i class="fa fa-trash"></i></button>
								</div>
							</div>
						</div>';
						$i++;
				}

				$ret .= '</div>';
				if($i>1){
						$ret .= '<div class="col-sm-12 padding-none" style="padding-top:25px"><button prox-reg="'.$i.'" class="btn btn-default" add-mod="true" type="button"><i class="fa fa-plus"></i> '.__translate('Adicionar pacote de horas',true).'</button></div>';
				}

			//$tema .= '<div class="col-sm-12 padding-none" style="padding-top:25px"><button type="button"><i class="fa fa-plus"></i> '.__translate('Adicionar pacote de horas',true).'</button></div>';
			}
			$ret .= '</form>';
			$ret .= '</div>';
		}

		return $ret;
	}
	function listModCursos($config){
		$ret = false;
		$opc = 1;
		if($config){
			if(!is_array($config)){
				$arr_conf = json_decode($config,true);
				if(is_array($arr_conf)){
					$i = 1;
					$ret .= '<div class="col-sm-12 padding-none" id="pcot">';
					$configSAviao=array('tab'=>$GLOBALS['tab54'],'selected'=>false,'tam'=>'12','label'=>'');
					$configSAviao['name'] = 'dados[cab][modulos][*|id|*][aviao]';
				$configSele = $configSAviao;
				$configSele['selectpicker'] = '*|selectpi|*';
				$ret .= '<sele style="display:none;">'.$this->selectMultipleAeronave($configSele).'</sele>';
				foreach($arr_conf As $id=>$val){
						$configSAviao['selected'] = json_encode($val['aviao']);
						$configSAviao['name'] = 'dados[cab][modulos]['.$id.'][aviao]';

				$ret .= '<div class="col-sm-12 list-pacote padding-none" id="modulo_'.$id.'">
								<div class="col-sm-4 padding-none"><div class="col-sm-4 padding-none text-right">Módulo: </div><div class="col-sm-8"><input class="form-control" placeholder="Título do módulo" type="text" name="dados[cab][modulos]['.$id.'][titulo]" value="'.$val['titulo'].'" /></div></div>
								<div class="col-sm-3 padding-none"><div class="col-sm-4 padding-none text-right">Limite: </div><div class="col-sm-4"><input class="form-control" type="text" name="dados[cab][modulos]['.$id.'][limite]" value="'.$val['limite'].'" /></div><div class="col-sm-2 padding-none">horas</div></div>
								<div class="col-sm-5 padding-none"><div class="col-sm-11 padding-none">'.$this->selectMultipleAeronave($configSAviao).'</div>
									<div class="col-sm-1 padding-none">
											<button type="button" title="Remover" class="btn btn-danger" id-modulo="'.$id.'"  onclick="delModulo('.$id.');"><i class="fa fa-trash"></i></button>
									</div>
								</div>
							</div>';
							$i++;
					}
					$ret .= '</div>';
					if($i>1 && $opc == 1){
						$ret .= '<div class="col-sm-12 padding-none" style="padding-top:25px"><button prox-reg="'.$i.'" class="btn btn-default" add-mod="true" type="button"><i class="fa fa-plus"></i> '.__translate('Adicionar pacote de horas',true).'</button></div>';
					}
				}
			}
		}
		return $ret;
	}
	function selectMultipleAeronave($config=false){
		if(!$config){
			$config=array('tab'=>$GLOBALS['tab54'],'selected'=>false,'tam'=>'12','label'=>'Avião');
		}
		$keySele = isset($config['key']) ? $config['key'] : 'id';
		$title = isset($config['title']) ? $config['title'] : 'Selecione uma aeronave';
		$name = isset($config['name']) ? $config['name'] : 'Categoria';
		$label = isset($config['label']) ? $config['label'] : '';
		$acao = isset($config['acao']) ? $config['acao'] : false;
		$tab = isset($config['tab']) ? $config['tab'] : $GLOBALS['tab54'];
		$id = isset($config['id']) ? $config['id'] : 'categoria';
		$selectpicker = isset($config['selectpicker']) ? $config['selectpicker'] : 'selectpicker';
		$sql = "SELECT * FROM ".$tab." WHERE `ativo`='s' ORDER BY Nome ASC";
		$dados = buscaValoresDb($sql);
		ob_start();
		$ret = false;
		if($dados){
			if(!empty($config['selected']) && is_string($config['selected']))
					$selec = json_decode($config['selected'],true);
					//print_r($selec);
				?>
				<div class="col-md-12">
				<?
				if(!empty($label)){
				?>
				 <label class="control-label" for="select"><?=__translate($label,true)?>:</label><br>
					<?
				}
					?>
					<select multiple name="<?=$name?>[]" data-live-search="true" class="<?=$selectpicker?>" data-width="100%" title="<?=$title?>">
						<?
						if($acao == 'gerenciar'){
							$input = "<option value=\"\" selected=\"selected\">".$sele_obs."</option>";
							$input .= "<option value=\"cad\" >Cadastrar ".__translate($label,true)."</option>";
							$input .= "<option value=\"ger\" >Gerenciar ".__translate($label,true)."</option>";
							$input .= "<option value=\"\" disabled >---------------------------</option>";
							echo $input;
						}
						foreach($dados As $key=>$value){
							$selected = false;

									if(is_array($selec)){
											if(@in_array($value[$keySele],$selec)){
												$selected = "selected=\"selected\"";
											}
									}
								?>
									<option value="<?=$value[$keySele]?>" <?=$selected?>><?=$value['nome']?></option>
								<?

						}
						  ?>
					</select>
				</div>
				<?

		}
		$ret .= ob_get_clean();
		return $ret;
	}
	public function labelTituloForm($config=false){
		$ret = false;
		$tema=false;
		$nome_curso=false;
		$nome_modulo=false;$nome_modulo_site=false;
		if(isset($config['acao'])&&isset($config['sec'])){
			if($config['sec']=='modulos-ead'){
				if($config['acao']=='cad'){
					$tema = '<h5>Cadastrar modulo do curso: <b>{nome_curso}</b></h5>';
					$nome_curso= buscaValorDb($GLOBALS['tab10'],'token',$_GET['token_curso'],'Nome');
				}
				if($config['acao']=='alt'){
					$tema = '<h5>Cadastrar modulo do curso: <b>{nome_curso}</b><br>Nome: <b>{nome_modulo}</b> Nome no site: <b> {nome_modulo_site}</b></h5>';
					$nome_curso= buscaValorDb($GLOBALS['tab10'],'token',$_GET['token_curso'],'Nome');
					$nome_modulo= $_GET['nome'];$nome_modulo_site= $_GET['nome_exibicao'];
				}
			}
			if($config['sec']=='conteudo-ead'){
				if($config['acao']=='cad'){
					$tema = '<h5>Cadastrar atividade do curso: <b>{nome_curso}</b> Módulo: <b>{nome_modulo}</b></h5>';
					$nome_curso= buscaValorDb($GLOBALS['tab10'],'token',@$_GET['token_curso'],'Nome');
					$nome_modulo= buscaValorDb($GLOBALS['tab38'],'token',@$_GET['token_modulo'],'Nome');
				}
				if($config['acao']=='alt'){
					$tema = '<h5>Cadastrar atividade do curso: <b>{nome_curso}</b> Módulo: <b>{nome_modulo}</b></h5>';
					$nome_curso= buscaValorDb($GLOBALS['tab10'],'token',@$_GET['token_curso'],'Nome');
					$nome_modulo= buscaValorDb($GLOBALS['tab38'],'token',@$_GET['token_modulo'],'Nome');
				}
			}
			$ret = str_replace('{nome_curso}',$nome_curso,$tema);
			$ret = str_replace('{nome_modulo}',$nome_modulo,$ret);
			$ret = str_replace('{nome_modulo_site}',$nome_modulo_site,$ret);
		}
		return $ret;
	}
	public function frmModulos($config=false){
		$ret = false;
		if($config['tab']){
			$campo_bus = isset ($config['campo_bus']) ? $config['campo_bus'] : 'nome';
			if($config['get']['acao'] == 'cad'){
				$salv_cotinuar = "Salvar e Continuar";
				$type_cont = 'submit';
				$_GET['token'] = uniqid();
				$_GET['ativo'] = 's';
				//$_GET['ordenar'] = ultimoValarDb($tab18,'ordenar')+1;
				$data_bt = 'continuar';
			}
			if($config['get']['acao'] == 'alt'){
						$type_cont = 'button';
						$salv_cotinuar = "Novo cadastro";
						$data_bt = 'novo';
						$sql = "SELECT * FROM ".$config['tab']." WHERE `".$config['campo_id']."` = '".base64_decode($config['get']['id'])."'";//echo $sql;
						if($config['sec'] == 'usuarios_conta'){
							$dados = buscaValoresDb_SERVER($sql);
						}else{
							$dados = buscaValoresDb($sql);
						}
						if($dados){
										foreach($dados[0] As $key=>$value){
											if($key == 'informacoes' || $key == 'contrato' || $key == 'config'){
												$_GET[$key] = json_decode($value,true);
											}else{
												$_GET[$key] = $value;
											}
										}
						}
						$_GET['salv_label'] = "Alterar";
					if(isset($_GET['token']) && empty($_GET['token'])){
							$_GET['token'] = uniqid();
						}
						if(isset($_GET['DtNasc'])){
							$_GET['DtNasc'] = dataExibe($_GET['DtNasc'],"2",",",".");
						}
						if(isset($_GET['token_curso'])){
						}
			}
			$labelTituloForm = false;
			if(isset($_GET['token_curso'])){
					$labelTituloForm = $this->labelTituloForm($config['get']);
			}
			if(Url::getURL(1) != NULL){
					$urlAmigo = '/'.Url::getURL(1);
			}else{
				$urlAmigo = false;
			}
			$link_bt_voltar = RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&regi_pg='.$config['get']['regi_pg'].'&pag='.$config['get']['pag'].'&acao=list&idCad='.@$_GET['token'];
			$link_bt_voltar1 = RAIZ.'/'.Url::getURL(0).'?sec='.base64_encode($config['sec']).'&regi_pg='.$config['get']['regi_pg'].'&pag='.$config['get']['pag'].'&acao=list&idCad='.@$_GET['token'];
			$config['link_bt_voltar'] = $link_bt_voltar;
			if($config['get']['listPos']==='false'){
					$popupCaBus = false;
			}else{
					$popupCaBus = 'window.opener.popupCaBus(\''.$link_bt_voltar1.'\')';
			}
			$config['link_bt_voltar'] = 'javascript:void(0);';
			$ret .= '<style>[div-id="dados[cab][professor]"]{padding:0}</style>';
			$ret .= '<div class="row well" style="padding-top:10px">';
			$ret .= $labelTituloForm;
			$ret .= '<ul class="nav nav-tabs">
							  <li class="active"><a data-toggle="tab" href="#home">Geral</a></li>
							  <li><a data-toggle="tab" href="#menu1">Imagens</a></li>
							  <!--<li><a data-toggle="tab" href="#menu2">Menu 2</a></li>-->
						</ul>
						<div class="tab-content">
						  <div id="home" class="tab-pane fade in active">';
							$ret .= carregaEditorSumuer2('250','[name="dados[cab][descricao]"]',$placeholder=false);
							$ret .= '<div class="col-sm-12 padding-none">';
								$ret .= '<div class="col-sm-12 mens"></div>';
										if($_GET['acao'] == 'alt'){
											$ret .= '<div class="col-sm-12 text-right">ID: <b>'.$_GET['id'].'</b> Token: <b>'.$_GET['token'].'</b></div>';
										}
								$ret .= '<div id="verNoSite" class="col-sm-12" >';
										if($_GET['acao'] == 'alt'){
											$configUrl = array('nivel2'=>'modulo','nivel3'=>$_GET['id'],'campo'=>'dados[cab][url]');
											$ret .= $this->urlPreviewEad($configUrl);
										}
								$ret .= '</div>';
								$selectGestor=new selectGestor;
								$ret .= '<form role="form" id="form_cad_modulos" method="post">';
									$config['campos_form'][1] = array('type'=>'text','size'=>'6','campos'=>'dados[cab][nome]-Nome*-EX.: Nome do módulo + Nome do curso','value'=>@$_GET['nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									$config['campos_form'][2] = array('type'=>'text','size'=>'6','campos'=>'dados[cab][nome_exibicao]-Nome de exibição para o cliente- Ex.: Nome do Modulo-','value'=>@$_GET['nome_exibicao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									$arr_status = sql_array("SELECT * FROM status ORDER BY id DESC",'abv','id');
									$dadosAtivo = array(
												'id'=>'ativo',
												'titulo'=>'Ativar',
												'tam'=>'2',
												'campo'=>'dados[cab][ativo]',
												'acao'=>@$config['get']['acao'],
												'corActive'=>'success',
												'corNotActive'=>'danger',
												'value'=>@$_GET['ativo'],
												'padrao'=>'s',
												'title'=>'Selecione SIM para ser liberdo',
												'opcoes'=>$arr_status
									);
									$ret .= formCampos($config['campos_form']);
									$compleSqlProf = "";
									$compleSqlProf = "WHERE `contas_usuarios`='".$_SESSION[SUF_SYS]['dadosConta'.SUF_SYS]['token']."' AND `permissao` ='6'  AND ".compleDelete();
									$conteudoPainelInst = array(
													'tam'=>4,
													'select'=>array('db'=>'remoto','tab_arr'=>'usuarios_sistemas','campo_bus'=>'email','campo'=>'dados[cab][professor]',
													'value'=>@$_GET['professor'],'label'=>'Instrutor','compleSql'=>base64_encode($compleSqlProf)),
													'list_campos'=>array('ID'=>'id','Nome'=>'nome','Email'=>'email','Celular'=>'celular'),
									);
									$titleTextarea = 'Cadastre aqui os seus instrutores';
									$conteudoPainelInst['frm_selectGestor'][0] = array('type'=>'text','size'=>'6','campos'=>'nome-Primeiro nome*','value'=>false,'css'=>'text-align:lef;','event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
									$conteudoPainelInst['frm_selectGestor'][1] = array('type'=>'text','size'=>'6','campos'=>'sobrenome-Sobrenome*','value'=>false,'css'=>'text-align:lef;','event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
									$conteudoPainelInst['frm_selectGestor'][2] = array('type'=>'text','size'=>'10','campos'=>'email-Email','value'=>false,'css'=>'text-align:lef;','event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
									$conteudoPainelInst['frm_selectGestor'][3] = array('type'=>'text','size'=>'2','campos'=>'celular-Celular (Whatsapp)-','value'=>false,'css'=>'text-align:lef;','event'=>'inp="celular"','clrw'=>false,'obs'=>'','outros'=>false,'class'=>false,'title'=>'');
									$conteudoPainelInst['frm_selectGestor'][4] = array('type'=>'textarea','size'=>'12','campos'=>'obs-Descrição','value'=>false,'css'=>'text-align:lef;','event'=>'editor="false"','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
									$conteudoPainelInst['frm_selectGestor'][5] = array('type'=>'hidden','size'=>'1','campos'=>'permissao-permissao','value'=>6,'css'=>'text-align:lef;','event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
									$conteudoPainelInst['frm_selectGestor'][6] = array('type'=>'hidden','size'=>'1','campos'=>'sec-','value'=>'usuarios_conta','css'=>'text-align:lef;','event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
									$conteudoPainelInst['frm_selectGestor'][7] = array('type'=>'hidden','size'=>'1','campos'=>'contas_usuarios-','value'=>$_SESSION[SUF_SYS]['dadosConta'.SUF_SYS]['token'],'css'=>'text-align:lef;','event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
									$titleTextarea = '<div class="col-sm-12 padding-none">Para editar todos os dados o instrutor <a href="'.RAIZ.'/config2?sec=dXN1YXJpb3NfY29udGE=&acao=alt&id={id_base}">Clique aqui</a></div>';
									$conteudoPainelInst['compleConteudo'] = $titleTextarea;
									$ret .= $selectGestor->select($conteudoPainelInst);
									$config['campos_form1'][3] = array('type'=>'chaveSimNao','dados'=>$dadosAtivo);
									$config['campos_form1'][5] = array('type'=>'textarea','size'=>'12','campos'=>'dados[cab][descricao]-Descrição ','value'=>@$_GET['descricao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									$ret .= formCampos($config['campos_form1']);

								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][id]-", @$_GET['id'],"","");
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][campo_id]-", "id","","");
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][campo_bus]-", $campo_bus,"","");
								//$ret 		.= queta_formfield4("hidden",'1',"tab-", base64_encode($config['tab']),"","");
								if($config['get']['acao'] == 'alt')
									$ret 		.= queta_formfield4("hidden",'1',"dados[cab][atualizacao]-", date('Y-m-d H:m:i'),"","");
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][conf]-", "s","","");
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][token]-", $_GET['token'],"","");
								if(isset($_GET['token_curso'])){
									$ret 		.= queta_formfield4("hidden",'1',"dados[cab][local]-", $_GET['local'],"","");
									$ret 		.= queta_formfield4("hidden",'1',"dados[cab][token_curso]-", $_GET['token_curso'],"","");
								}
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][autor]-",  $_SESSION[SUF_SYS]['id'.SUF_SYS],"","");
								$ret 		.= queta_formfield4("hidden",'1',"ac-", $config['get']['acao'],"","");
								$ret 		.= queta_formfield4("hidden",'1',"sec-", $config['sec'],"","");

								$ret .= '</form>';
								$ret .='<div class="col-sm-12 padding-none" style="margin-top:10px;border-top:solid #ccc 1px">';
									if(($_GET['acao'] == 'alt' || $_GET['acao1'] == 'alt') && is_adminstrator(3)){
											$relacionado['local']				= 'Atividade';
											$relacionado['tab']			 		= $GLOBALS['tab38'];
											$relacionado['tab_item'] 			= $GLOBALS['tab39'];
											$relacionado['campo_bus_item']		= 'id';
											$relacionado['campo_enc_item']		= 'nome';
											$relacionado['grava_relacionado'] 	= 'conteudo';
											$relacionado['label_legend']		= 'Gerenciar atividades do módulo.';
											$relacionado['label_bt1']			= 'Adicionar uma atividade existente';
											$relacionado['label_bt2']			= 'Cadastrar '.$relacionado['local'];
											$relacionado['url_alt_item'] 		= 'ead/iframe?sec=Y29udGV1ZG8tZWFk&acao=alt&listPos=conteAula&token_modulo='.$_GET['token'];
											$relacionado['cad_item'] 			= 'iframe?sec=Y29udGV1ZG8tZWFk&acao=cad&listPos=false';
											$relacionado['pasta'] 				= 'ead';
											$relacionado['token'] 				= $_GET['token'];
											$relacionado['conteudo'] 		= $_GET['conteudo'];
											$item = array(
																				'tab'=>$GLOBALS['tab39'],
																				'titulo'=>'Encontrar '.$relacionado['local'],
																				'id'=>'id',
																				'label_campo'=>'nome',
																				'campo'=>'nome',
																				'value'=>'',
																				'type'=>'1',
																				'sec'=>'Y29udGV1ZG8tZWFk',
																				'placeholder'=>'Digite o nome de uma aula, prova ou artigo...',
																				'campoOrdem'=>'ordenar',
																				'comple'=>"",
																				'ordenar'=>"ORDER BY ordenar ASC"
											);
											$gerConteudo = $this->gerAddRelacionar($relacionado,$item);
											$ret .= '<div class="col-sm-12">'.$gerConteudo.'</div>';

									}
									$ret .='</div>';
								$ret .= '</div>';

						$ret .= '
						  </div>
						  <div id="menu1" class="tab-pane fade">';

						$ret .= '<div class="col-md-12 padding-none" style="border-top:1px solid #ccc">';
						$ret .= '<h2><i class="fa fa-photo"></i> Imagens</h2>';
						$infoDica = 'Para a correta exibição da página web deste curso, a primeira imagem deve estar no tamanho de minimo 950px X 336px.';
						$arr_config1 = array(
								'ta'=>'imagem_arquivo',
								'token'=>$_GET['token'],
								'pasta'=>'ead',
								'label'=>'Imagens-'.$infoDica,
								'tam'=>'3',
								'type'=>1,
								'tipos'=>'jpg@png@jpeg',
								'seletor'=>'ger1',
								'botao_fenchar_modal'=>true,
								'titulo_janela_modal'=>'Adicionar Imagens',
								'consulta'=>"WHERE id_produto='".$_GET['token']."'"
							);
						$ret .= gerAddArquivos($arr_config1);
						$ret .= '</div>';
						$ret .= '
							</div>
						  <!--<div id="menu2" class="tab-pane fade">
							<h3>Menu 2</h3>
							<p>Some content in menu 2.</p>
						  </div>-->
						</div>';
			$ret		.= lib_btJanelaSalvar($config);
			$ret .= '</div>';
			$ret .= '
			<script>
				jQuery(document).ready(function () {
					jQuery(\'[name="dados[cab][url]"]\').on(\'click\',function(){
						if(jQuery(this).val()==\'\'){
							var valor = jQuery(\'[name="dados[cab][nome]"]\').val();
							if(valor!=\'\'){
								jQuery(this).val(urlAmigavel(valor));
							}
						}
					});
					//jQuery(\'[quet-prod="titulo"]\').html(\''.@$config['nomePost'].'\');
					var icon = "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i>";
					jQuery(\'[data-lng="pt"]\').mask(\'99/99/9999\');
					jQuery(\'[data-lng="pt"]\').datepicker({
						format: \'dd/mm/yyyy\',
						language: \'pt-BR\'
					});
					jQuery(\'body\').addClass(\'fixed-page-footer\');
					jQuery(\'[que-bt="voltar"]\').on(\'click\',function(){
						window.history.back();
					});
					jQuery(\'[name="nome"]\').on(\'change\',function(){
						jQuery(\'[name="url"]\').val(this.value);
					});
					jQuery(\'[type="submit"]\').on(\'click\',function(){
						var btn = jQuery(this).data(\'btn\');
						jQuery(\'#btn-ac\').html(btn);
						jQuery(\'#form_cad_modulos\').submit();
					});
					';
			if(isset($select2Sele)){
			$ret .='
					jQuery(\''.$select2Sele.'\').select2({
							allowClear: true
					});';
			}
			if($config['get']['acao'] == 'alt'){
				$ret .= '
				jQuery(\'[data-btn="novo"]\').on(\'click\',function(){
					window.location = \''.RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&acao=cad\';
				});
			';
			}
			$ret .= 'jQuery(\'#form_cad_modulos\').validate({
							submitHandler: function(form) {
								$.ajax({
									url: \''.RAIZ.'/app/'.$config['dire'].'/acao.php?ajax=s&opc=salvarModulos&acao='.$config['get']['acao'].'&campo_bus='.$campo_bus.'\',
									type: form.method,
									data: jQuery(form).serialize(),
									beforeSend: function(){
										jQuery(\'#preload\').fadeIn();
									},
									async: true,
									dataType: "json",
									success: function(response) {
										jQuery(\'#preload\').fadeOut();
										jQuery(\'.mens\').html(response.mensa);
										var bt_press = jQuery("#btn-ac").html();';
										if(isset($config['get']['listPos'])){
												if($config['get']['listPos']=='conteCurso'){
													$popupCaBus = 'window.opener.conteCurso(response.conteudo.lista.html,response.conteudo.lista.duracaoTotal)';
												}
										}
										if($config['get']['acao']=='alt'){
													$ret .=	'
													if(bt_press != \'continuar\'){
														'.$popupCaBus.';
													}';
										}
										if($config['get']['acao']=='cad'){
													$ret .=	'
														'.$popupCaBus.';
													';
										}
										$ret .=	'
										if(bt_press == \'finalizar\'){
											window.close();
										}
										if(bt_press == \'salvar_abrir_novo\'){
											window.location = \''.RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&acao=cad\';
										}
										if(response.exec){
											if(response.list){
												jQuery(\'#exibe_list\').html(response.list);
												jQuery("#myModal2").modal("hide");
											}

										}
									},
									error: function(error){
										jQuery(\'#preload\').fadeOut();
										alert(\'ERRO AO SALVAR ENTRE EM CONTATO COM O SUPORTE '.suporteTec().'\');
										console.log(error);
									}
								});

							},
							ignore: ".ignore",
							rules: {
								nome: {
									required: true
								}
							},
							messages: {
								nome: {
									required: icon+" '.__translate('Por favor preencher este campo',true).'"
								}
							}
					});
				});
			</script>';
		}else{
			$ret = formatMensagem('Tabela não definida','danger',4444);
		}
		return $ret;
	}
	public function tipo_link_video($val=false){
					$arr = array('v'=>'Vimeo','y'=>'Youtube');
					$ret = $arr;
					if($val){
						$ret = isset($arr[$val]) ? $arr[$val] : false;
					}
					return $ret;
	}
	public function frmAtividades($config=false){
		$ret = false;
		$ret .= carregaEditorSumuer2(107,'[name="dados[cab][descricao]"],[name="dados[questao][descricao]"]');
		if($config['tab']){
			$campo_bus = isset ($config['campo_bus']) ? $config['campo_bus'] : 'nome';
			if($config['get']['acao'] == 'cad'){
				$salv_cotinuar = "Salvar e Continuar";
				$type_cont = 'submit';
				$_GET['token'] = uniqid();
				$_GET['ativo'] = 's';
				//$_GET['ordenar'] = ultimoValarDb($tab18,'ordenar')+1;
				$data_bt = 'continuar';
				$_GET['tipo_link_video'] = isset($_GET['tipo_link_video'])?$_GET['tipo_link_video']:'vimeo';
			}
			if($config['get']['acao'] == 'alt'){
						$type_cont = 'button';
						$salv_cotinuar = "Novo cadastro";
						$data_bt = 'novo';
						$sql = "SELECT * FROM ".$config['tab']." WHERE `".$config['campo_id']."` = '".base64_decode($config['get']['id'])."'";//echo $sql;
						$dados = buscaValoresDb($sql);
						if($dados){
										foreach($dados[0] As $key=>$value){
											if($key == 'informacoes' || $key == 'contrato' || $key == 'config'){
												$_GET[$key] = json_decode($value,true);
											}elseif($key == 'tipo_link_video'){
												$_GET[$key] = isset($_GET[$key])?$_GET[$key]:$value;
											}else{
												$_GET[$key] = $value;
											}
										}
						}
						$_GET['salv_label'] = "Alterar";
						if(isset($_GET['token']) && empty($_GET['token'])){
							$_GET['token'] = uniqid();
						}
						if(isset($_GET['config']) && empty($_GET['config'])){
							$_GET['config'] = json_decode($_GET['config'],true);
						}
						if(isset($_GET['DtNasc'])){
							$_GET['DtNasc'] = dataExibe($_GET['DtNasc'],"2",",",".");
						}
			}
			$labelTituloForm = false;
			if(isset($_GET['token_modulo'])){
					$labelTituloForm = $this->labelTituloForm($config['get']);
			}
			$config['get'] = $_GET;
			$config['get']['listPos'] = isset($config['get']['listPos']) ? $config['get']['listPos'] : true;
			if(Url::getURL(1) != NULL){
					$urlAmigo = '/'.Url::getURL(1);
			}else{
				$urlAmigo = false;
			}
			$link_bt_voltar = RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&regi_pg='.$config['get']['regi_pg'].'&pag='.$config['get']['pag'].'&acao=list&idCad='.@$_GET['token'];
			$link_bt_voltar1 = RAIZ.'/'.Url::getURL(0).'?sec='.base64_encode($config['sec']).'&regi_pg='.$config['get']['regi_pg'].'&pag='.$config['get']['pag'].'&acao=list&idCad='.@$_GET['token'];
			$config['link_bt_voltar'] = $link_bt_voltar;
			if($config['get']['listPos']==='false'){
					$popupCaBus = false;
			}else{
					$popupCaBus = 'window.opener.popupCaBus(\''.$link_bt_voltar1.'\')';
			}
			$config['link_bt_voltar'] = 'javascript:void(0);';
			$ret .= '<div class="row well" style="padding-top:10px">';
			$ret .= $labelTituloForm;
			$ret .= '<ul class="nav nav-tabs">
							  <li class="active"><a data-toggle="tab" href="#home">Geral</a></li>
							  <li><a data-toggle="tab" href="#menu1">Material de Apoio</a></li>
							  <li><a data-toggle="tab" href="#menu2">Imagem de capa</a></li>
						</ul>
						<div class="tab-content">
						  <div id="home" class="tab-pane fade in active">';
							$ret .= '<div class="col-sm-12 padding-none">';
								$ret .= '<div class="col-md-12 mens"></div>';
								$tempo = false;
								if($config['get']['acao'] == 'alt'){
									$ret .= '<div class="col-sm-12 topo-title">&nbsp;<b>Id: </b><label>'.$_GET['id'].'</label></div>';
								}
								$ret .= '<form role="form" id="form_cad_conteudo" method="post">';
								$arr_conteudo = sql_array("SELECT * FROM ".$GLOBALS['tab7']." ORDER BY id ASC",'nome','nome');
								$config['campos_form'][0] = array('type'=>'select','size'=>'12','campos'=>'dados[cab][tipo]-Tipo de conteúdo.','opcoes'=>$arr_conteudo,'selected'=>@array(@$_GET['tipo'],''),'css'=>'','event'=>'que-bt="tipo-conteudo"','obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
									//$config['campos_form'][2] = array('type'=>'text','size'=>'3','campos'=>'dados[cab][codigo]-Código-(opcional)','value'=>@$_GET['codigo'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$arr_status = sql_array("SELECT * FROM status ORDER BY id DESC",'abv','id');
									$dadosAtivo = array(
										'id'=>'ativo',
										'titulo'=>'Ativar',
										'tam'=>'2',
										'campo'=>'dados[cab][ativo]',
										'acao'=>@$config['get']['acao'],
										'corActive'=>'success',
										'corNotActive'=>'danger',
										'value'=>@$_GET['ativo'],
										'padrao'=>'s',
										'title'=>'Selecione SIM para ser liberdo',
										'opcoes'=>$arr_status
								);
								$dadosGratis = array(
									'id'=>'gratis',
									'titulo'=>'Conteúdo Gratuito?',
									'tam'=>'2',
									'campo'=>'dados[cab][gratis]',
									'acao'=>@$config['get']['acao'],
									'corActive'=>'success',
									'corNotActive'=>'danger',
									'value'=>@$_GET['gratis'],
									'padrao'=>'n',
									'title'=>'Selecione SIM para tornar este conteúdo disponível publicamente no site',
									'opcoes'=>$arr_status
								);
								$dadosObrig = array(
									'id'=>'obrigatorio',
									'titulo'=>'Conteúdo Obrigatório?',
									'tam'=>'2',
									'campo'=>'dados[cab][config][obrigatorio]',
									'acao'=>@$config['get']['acao'],
									'corActive'=>'success',
									'corNotActive'=>'danger',
									'value'=>@$_GET['config']['obrigatorio'],
									'padrao'=>'n',
									'title'=>'Se for importante para a entrega do certificado marque SIM',
									'opcoes'=>$arr_status
								);
								$config['campos_form'][1] = array('type'=>'text','size'=>'6','campos'=>'dados[cab][nome]-Nome*-Nome da atividade','value'=>@$_GET['nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form'][3] = array('type'=>'chaveSimNao','dados'=>$dadosAtivo);
								$config['campos_form'][4] = array('type'=>'chaveSimNao','dados'=>$dadosGratis);
								$config['campos_form']['ob'] = array('type'=>'chaveSimNao','dados'=>$dadosObrig);
								$config['campos_form'][5] = array('type'=>'text','size'=>'12','campos'=>'dados[cab][nome_exibicao]-Nome de exibição para o cliente-','value'=>@$_GET['nome_exibicao'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$ret .= formCampos($config['campos_form']);
								//$ret .='<div class="col-sm-12" style="padding:0px" id="exibe_conteudo">';
								//$ret .='</div>';
								$gerConteudo = $this->gerConteudo($config['get']);
								$ret 		.= $gerConteudo['html_conf'];
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][id]-", @$_GET['id'],"","");
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][campo_id]-", "id","","");
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][campo_bus]-", $campo_bus,"","");
								//$ret 		.= queta_formfield4("hidden",'1',"tab-", base64_encode($config['tab']),"","");
								if($config['get']['acao'] == 'alt')
									$ret 		.= queta_formfield4("hidden",'1',"dados[cab][atualizacao]-", date('Y-m-d H:m:i'),"","");
								if(isset($_GET['token_curso']))
									$ret 		.= queta_formfield4("hidden",'1',"dados[cab][token_curso]-", $_GET['token_curso'],"","");
								if(isset($_GET['token_modulo']))
									$ret 		.= queta_formfield4("hidden",'1',"dados[cab][token_modulo]-", $_GET['token_modulo'],"","");
								if(isset($_GET['listPos']))
									$ret 		.= queta_formfield4("hidden",'1',"dados[cab][listPos]-", $_GET['listPos'],"","");

								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][conf]-", "s","","");
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][token]-", $_GET['token'],"","");
								$ret 		.= queta_formfield4("hidden",'1',"dados[cab][autor]-",  $_SESSION[SUF_SYS]['id'.SUF_SYS],"","");
								$ret 		.= queta_formfield4("hidden",'1',"ac-", $config['get']['acao'],"","");
								$ret 		.= queta_formfield4("hidden",'1',"sec-", $config['sec'],"","");

								$ret .= '</form>';
								$ret .= $gerConteudo['html'];

								$ret .= '</div>';

						$ret .= '
						  </div>
						  <div id="menu1" class="tab-pane fade">';
						$ret .= '<div class="col-md-12 padding-none" style="border-top:1px solid #ccc">';
							$ret .= '<h2><i class="fa fa-file"></i> Arquivos</h2>';
							$infoDica = 'Tipos de arquivos suportados: <b> .jpg, .png, .jpeg, .pdf</b> Tamanho máx: <b>10MB</b>';
							$arr_config1 = array(
									'ta'=>'imagem_arquivo',
									'token'=>$_GET['token'],
									'pasta'=>'ead',
									'label'=>'Arquivos-'.$infoDica,
									'tam'=>'3',
									'type'=>1,
									'tipos'=>'jpg@png@jpeg@pdf',
									'seletor'=>'ger1',
									'botao_fenchar_modal'=>true,
									'titulo_janela_modal'=>'Adicionar Arquivos',
									'consulta'=>"WHERE id_produto='".$_GET['token']."'"
								);
							$ret .= gerAddArquivos($arr_config1);
						$ret .= '</div>';
						$ret .= '
							</div>
						  <div id="menu2" class="tab-pane fade">';
						  $ret .= '<div class="col-md-12 padding-none" style="border-top:1px solid #ccc">';
						  $ret .= '<h2><i class="fa fa-file"></i> Imagems</h2>';
						  $infoDica = 'Tipos de Imagems suportados: <b> .jpg, .png, .jpeg</b> Tamanho máx: <b>900kB</b><br>
						  A primeira imagem será usada como padrão
						  ';
						  $token_capa = $_GET['token'].'_capa';
						  $arr_config1 = array(
								  'ta'=>'imagem_arquivo',
								  'token'=>$token_capa,
								  'pasta'=>'ead',
								  'label'=>'Imagems-'.$infoDica,
								  'tam'=>'3',
								  'type'=>1,
								  'tipos'=>'jpg@png@jpeg',
								  'seletor'=>'ger2',
								  'botao_fenchar_modal'=>true,
								  'titulo_janela_modal'=>'Adicionar Imagems',
								  'consulta'=>"WHERE id_produto='".$token_capa."'"
							  );
						  $ret .= gerAddArquivos($arr_config1);
					  $ret .= '</div>';
					  $ret .= '
						</div>';
			$ret		.= lib_btJanelaSalvar($config);
			$ret .= '</div>';
			$ret .= '
			<script>
				jQuery(document).ready(function () {
					jQuery(\'[name="dados[cab][url]"]\').on(\'click\',function(){
						if(jQuery(this).val()==\'\'){
							var valor = jQuery(\'[name="dados[cab][nome]"]\').val();
							if(valor!=\'\'){
								jQuery(this).val(urlAmigavel(valor));
							}
						}
					});
					//jQuery(\'[quet-prod="titulo"]\').html(\''.@$config['nomePost'].'\');
					var icon = "<i class=\"fa fa-exclamation-triangle\" aria-hidden=\"true\"></i>";
					jQuery(\'[data-lng="pt"]\').mask(\'99/99/9999\');
					jQuery(\'[data-lng="pt"]\').datepicker({
						format: \'dd/mm/yyyy\',
						language: \'pt-BR\'
					});
					jQuery(\'body\').addClass(\'fixed-page-footer\');
					jQuery(\'[que-bt="voltar"]\').on(\'click\',function(){
						window.history.back();
					});
					jQuery(\'[name="nome"]\').on(\'change\',function(){
						jQuery(\'[name="url"]\').val(this.value);
					});
					jQuery(\'[type="submit"]\').on(\'click\',function(){
						var btn = jQuery(this).data(\'btn\');
						jQuery(\'#btn-ac\').html(btn);
						jQuery(\'#form_cad_conteudo\').submit();
					});
					';
			if(isset($select2Sele)){
			$ret .='
					jQuery(\''.$select2Sele.'\').select2({
							allowClear: true
					});';
			}
			if($config['get']['acao'] == 'alt'){
				$ret .= '
				jQuery(\'[data-btn="novo"]\').on(\'click\',function(){
					window.location = \''.RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&acao=cad\';
				});
			';
			}
			$ret .= 'jQuery(\'#form_cad_conteudo\').validate({
							submitHandler: function(form) {
								$.ajax({
									url: \''.RAIZ.'/app/'.$config['dire'].'/acao.php?ajax=s&opc=salvarConteudo&acao='.$config['get']['acao'].'&campo_bus='.$campo_bus.'\',
									type: form.method,
									data: jQuery(form).serialize(),
									beforeSend: function(){
										jQuery(\'#preload\').fadeIn();
									},
									async: true,
									dataType: "json",
									success: function(response) {
										jQuery(\'#preload\').fadeOut();
										jQuery(\'.mens\').html(response.mensa);
										var bt_press = jQuery("#btn-ac").html();
										';

										if(isset($config['get']['listPos'])){
												if($config['get']['listPos']=='conteAula'){
													$popupCaBus = 'window.opener.conteAula(response.conteudo.lista.html)';
												}
												if($config['get']['listPos']=='conteCurso'){
													$popupCaBus = 'window.opener.conteCurso(response.conteudo.lista.html,response.conteudo.lista.duracaoTotal)';
												}
										}
										if($config['get']['acao']=='alt'){
													$ret .=	'
													if(bt_press != \'continuar\'){
														'.$popupCaBus.';
													}';
										}
										/*
										if($config['get']['acao']=='cad'){
													$ret .=	'
													window.location = \''.RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&acao=cad\';
														'.$popupCaBus.';
													';
										}
										*/
										if($config['get']['acao']=='cad'){
														$ret .=	'
														if(bt_press == \'salvar_permanecer\' && response.exec){
															var urlAb = \''.RAIZ.'/ead/iframe?sec='.base64_encode($config['sec']).'&list=false&regi_pg=40&pag=0&acao=alt&id=\'+btoa(response.idCad);
															window.location = urlAb;
															'.$popupCaBus.';
														}else{
															'.$popupCaBus.';
														}
														';
										}
										$ret .=	'
										if(bt_press == \'finalizar\'){
											window.close();
										}
										if(bt_press == \'salvar_abrir_novo\'){
											window.location = \''.RAIZ.'/'.Url::getURL(0).$urlAmigo.'?sec='.base64_encode($config['sec']).'&acao=cad\';
										}
										if(response.exec){
											if(response.list){
												jQuery(\'#exibe_list\').html(response.list);
												//jQuery("#myModal2").modal("hide");
											}

										}
									},
									error: function(error){
										jQuery(\'#preload\').fadeOut();
										alert(\'ERRO AO SALVAR ENTRE EM CONTATO COM O SUPORTE '.suporteTec().'\');
										console.log(error);
									}
								});

							},
							ignore: ".ignore",
							rules: {
								nome: {
									required: true
								}
							},
							messages: {
								nome: {
									required: icon+" '.__translate('Por favor preencher este campo',true).'"
								}
							}
					});
				});
			</script>';
		}else{
			$ret = formatMensagem('Tabela não definida','danger',4444);
		}
		return $ret;
	}

	public function gerConteudo($config=false){
		$ret['exec'] = false;
		$ret['html'] = false;
		$ret['html_conf'] = false;
		if($config['acao'] == 'cad'){
			$displaVideo = 'block';
			$displaApostila = 'none';
			$displaArtgo = 'none';
			$displaProva = 'none';
			$displaExercicio = 'none';
			$displaWebnar = 'none';
			$disabledWeb = 'disabled';
			$disabledVid = '';
			$displaDuracao = 'none';
		}
		if($config['acao'] == 'alt'){
			if($config['tipo'] == 'Video'){
				$displaVideo = 'block';
				$displaApostila = 'none';
				$displaProva = 'none';
				$displaExercicio = 'none';
				$displaArtgo = 'none';
				$displaWebnar = 'none';
				$disabledWeb = 'disabled';
				$disabledVid = '';
				$displaDuracao = 'none';
			}
			if($config['tipo'] == 'Apostila'){
				$displaVideo = 'none';
				$displaApostila = 'block';
				$displaProva = 'none';
				$displaExercicio = 'none';
				$displaArtgo = 'none';
				$displaWebnar = 'none';
				$disabledVid = 'disabled';
				$displaDuracao = 'block';
			}
			if($config['tipo'] == 'Prova'){
				$displaVideo = 'none';
				$displaApostila = 'none';
				$displaProva = 'block';
				$displaExercicio = 'none';
				$displaArtgo = 'none';
				$displaWebnar = 'none';
				$disabledVid = 'disabled';
				$displaDuracao = 'block';
			}
			if($config['tipo'] == 'Exercicio'){
				$displaVideo = 'none';
				$displaApostila = 'none';
				$displaProva = 'block';
				$displaExercicio = 'block';
				$displaArtgo = 'none';
				$displaWebnar = 'none';
				$disabledVid = 'disabled';
				$displaDuracao = 'block';
			}
			if($config['tipo'] == 'Artigo'){
				$displaVideo = 'none';
				$displaApostila = 'none';
				$displaProva = 'none';
				$displaExercicio = 'none';
				$displaArtgo = 'block';
				$displaWebnar = 'none';
				$disabledVid = 'disabled';
				$displaDuracao = 'block';
			}
			if($config['tipo'] == 'Webnar'){
				$displaVideo = 'none';
				$displaApostila = 'none';
				$displaProva = 'none';
				$displaExercicio = 'none';
				$displaArtgo = 'none';
				$displaWebnar = 'block';
				$disabledWeb = '';
				$disabledVid = 'disabled';
				$displaDuracao = 'none';
			}

		}
		$outrosDuracao = 'que-duracao="true" style="display:'.$displaDuracao.'" ';
		$outrosVideo = 'que-atividade="Video" style="display:'.$displaVideo.'" ';
		$outrosProva = 'que-atividade="Prova" style="display:'.$displaProva.'" ';
		$outrosExercicio = 'que-atividade="Exercicio" style="display:'.$displaExercicio.'" ';
		$outrosArtgo = 'que-atividade="Artigo" style="display:'.$displaArtgo.'" ';
		$outrosWebnar = 'que-atividade="Webnar" style="display:'.$displaWebnar.'" ';
		$titleDuracao = false;
		$config['campos_form_conf'][0] = array('type'=>'number','size'=>'2','campos'=>'dados[cab][duracao]-Duração-','value'=>@$_GET['duracao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>$outrosDuracao,'class'=>false,'title'=>$titleDuracao);
		$arr_dura = sql_array("SELECT * FROM unidade_duracao WHERE `ativo`='s' ORDER BY id ASC",'nome','abv');
		$config['campos_form_conf'][1] = array('type'=>'select','size'=>'2','campos'=>'dados[cab][unidade_duracao]-Uni. de tempo','opcoes'=>$arr_dura,'selected'=>@array(@$_GET['unidade_duracao'],''),'css'=>$outrosDuracao,'event'=>false ,'obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
		$titleAp = 'Porcentagem de aproveitamento requerida para esta atividade, Ex: se for 50%, o aluno tem que conseguir 50% dos pontos para receber uma boa classificação';
		//echo $config['tipo_link_video'];
		$linkPgVideo='https://vimeo.com/';
		$btn_video = false;
		$targetModal = 'modalVid';
		if(isset($config['tipo_link_video'])){
			if($config['tipo_link_video']=='v'){
				$btn_video = '<a style="width:50% " target="_BLANK" href="https://vimeo.com/" btn-carrega-vimeo title="Subir videos no vimeo" data-toggle="tooltip" class="btn btn-primary"><i class="fa fa-cloud-upload"></i> Vimeo</a>';
				$linkPgVideo='https://vimeo.com/';
				$labelInpu = 'Vimeo';
				$placeholder = '312302991';
				$targetModal = 'modalVid';
			}if($config['tipo_link_video']=='y'){
				if(isset($config['video'])&&!empty($config['video'])){
					//$ret['html_conf'] .= '<script src="https://www.youtube.com/iframe_api" id="ytscript"></script>';
					//$ret['html_conf'] .= '<script src="'.RAIZ.'/app/ead/api_youtube.js"></script>';
				}
				$btn_video = '<a style="width:50% " target="_BLANK" btn-carrega-youtube href="https://youtube.com" title="Link do youtube" data-toggle="tooltip" class="btn btn-danger"><i class="fa fa-cloud-upload"></i> Youtube</a>';
				$linkPgVideo='https://youtube.com/';
				$labelInpu = 'youtube';
				$placeholder = 'BK7LluA3obg';
				$targetModal = 'modalVidYou2';

			}
		}
		$tipo_link_video = $this->tipo_link_video();
		$config['campos_form_conf'][10] = array('type'=>'select','size'=>'3','campos'=>'dados[cab][tipo_link_video]-Link do vídeo','opcoes'=>$tipo_link_video,'selected'=>@array(@$_GET['tipo_link_video'],''),'css'=>$outrosVideo,'event'=>'tipo-link-video' ,'obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
		$titleAp = 'Porcentagem de aproveitamento requerida para esta atividade, Ex: se for 50%, o aluno tem que conseguir 50% dos pontos para receber uma boa classificação';
		$config['campos_form_conf'][2] = array('type'=>'text','size'=>'2','campos'=>'dados[cab][config][aproveitamento]-Aproveitamento %-Ex: 50','value'=>@$config['config']['aproveitamento'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>$outrosProva,'class'=>false,'title'=>$titleAp);
		$config['campos_form_conf'][3] = array('type'=>'text','size'=>'2','campos'=>'dados[cab][config][data]-Data da transmissão','value'=>@$config['config']['data'],'css'=>false,'event'=>' data-mask="99/99/9999" data-lng="pt" required '.$disabledWeb.' '.$disabledVid,'clrw'=>false,'obs'=>false,'outros'=>$outrosWebnar,'class'=>false,'title'=>'Data para exibição da transmissão ao vivo');
		$config['campos_form_conf'][4] = array('type'=>'time','size'=>'2','campos'=>'dados[cab][config][hora]-Hora da transmissão','value'=>@$config['config']['hora'],'css'=>false,'event'=>' required '.$disabledWeb.' '.$disabledVid,'clrw'=>false,'obs'=>false,'outros'=>$outrosWebnar,'class'=>false,'title'=>'Hora para exibição da transmissão ao vivo');
		$config['campos_form_conf'][9] = array('type'=>'text','size'=>'2','campos'=>'dados[cab][config][whatsapp]-Whatsapp do tutor-','value'=>@$config['config']['whatsapp'],'css'=>false,'event'=>' data-mask="(99)99999-9999"','clrw'=>false,'obs'=>false,'outros'=>$outrosWebnar,'class'=>false,'title'=>'Whatsapp do apresentador do webnar');
		$complestatus = "WHERE abv='s'";
		$complestatus = "";
		$arr_status = sql_array("SELECT * FROM status $complestatus ORDER BY id ASC",'nome','abv');
		$config['campos_form_conf'][5] = array('type'=>'select','size'=>'2','campos'=>'dados[cab][config][gabarito]-Exibir Gabarito','opcoes'=>$arr_status,'selected'=>@array(@$_GET['config']['gabarito'],''),'css'=>$outrosProva,'event'=>'' ,'obser'=>false,'outros'=>$outrosProva,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'Exibir resposta certa caso seja escolhido a resposta errada');
		$config['campos_form_conf']['r'] = array('type'=>'select','size'=>'2','campos'=>'dados[cab][config][repetir]-Permitir repetição','opcoes'=>$arr_status,'selected'=>@array(@$_GET['config']['repetir'],''),'css'=>$outrosProva,'event'=>'' ,'obser'=>false,'outros'=>$outrosProva,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'');
		$config['campos_form_conf']['pd'] = array('type'=>'select','size'=>'2','campos'=>'dados[cab][config][pt_dinamico]-Pts Dinãmicos','opcoes'=>$arr_status,'selected'=>@array(@$_GET['config']['pt_dinamico'],''),'css'=>$outrosProva,'event'=>'' ,'obser'=>false,'outros'=>$outrosProva,'class'=>'form-control selectpicker','acao'=>'sl','sele_obs'=>'-- Selecione--','title'=>'Se *sim*, Os resultados finais das provas serão gerados com base nos pontos registrados nas questões, no momento em que são exibidos, e não com base nos pontos gravados no momento da realização da provas');
		$config['campos_form_conf'][7] = array('type'=>'input-group-text','size'=>'9','campos'=>'dados[cab][video]-Id Vídeo '.$labelInpu.' (adicionar o link do '.$labelInpu.')-Ex: '.$placeholder,'value'=>@$_GET['video'],'css'=>$outrosVideo,'event'=>$disabledVid.' inpt-vide="vid"','clrw'=>$outrosVideo,'obs'=>false,'outros'=>$linkPgVideo,'class'=>false,'title'=>false);
		$ret['html_conf'] .= formCampos($config['campos_form_conf']);
		$tempo  = false;
		$config['campos_form_conf_'][8] = array('type'=>'input-group-text','size'=>'9','campos'=>'dados[cab][video]-Id Vídeo Youtube (adicionar o link do youtube)-Ex: BK7LluA3obg','value'=>@$_GET['video'],'css'=>$outrosWebnar,'event'=>'input-video="youtube"'.$disabledWeb.' inpt-vide="web"','clrw'=>$outrosWebnar,'obs'=>false,'outros'=>'https://youtube.com/ ','class'=>false,'title'=>false);
		$ret['html_conf'] .= formCampos($config['campos_form_conf_']);
		$tempo  = false;
		$btn_youtube = '<a style="width:50% " target="_BLANK" href="https://studio.youtube.com/channel/UCly_GMgmt-WTZf2sumFtx3Q/livestreaming" title="Link da transmissão" data-toggle="tooltip" class="btn btn-danger"><i class="fa fa-cloud-upload"></i> Youtube</a>';

		$ret['html_conf'] .= '<div class="col-sm-3 text-right btn-vimeo" '.$outrosVideo.'>
										<div class="btn-group" style="width:100%;padding:18px 0 0 0">
											<button data-toggle="modal" data-target="#'.$targetModal.'" type="button" class="btn btn-outline-secondary"><i class="fa fa-eye"></i> carregar Video</button>'.$btn_video.'
										</div>
									</div>';

		$ret['html_conf'] .= '<div class="col-sm-3 text-right btn-youtube" '.$outrosWebnar.' >
										<div class="btn-group" style="width:100%;padding:18px 0 0 0">
											<button data-toggle="modal" data-target="#modalVidYou" type="button" class="btn btn-outline-secondary"><i class="fa fa-eye"></i> carregar Video</button>'.$btn_youtube.'
										</div>
									</div>';
		if(isset($config['acao'])&& $config['acao']=='alt' && isset($config['duracao'])&& !empty($config['duracao'])){
			$temp = segundosEmHoras($config['duracao']);
			$tempo .= '<div class="col-sm-12 d-video"><b>Duração do video: </b><label>'.$temp.'</label></div>';
			$ret['html_conf'] .= $tempo;
		}

		$config['campos_form_conf2'][8] = array('type'=>'textarea','size'=>'12','campos'=>'dados[cab][descricao]-Qualquer descrição sobre o conteúdo','value'=>@$config['descricao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>$outrosVideo,'class'=>false,'title'=>false);
		$ret['html_conf'] .= formCampos($config['campos_form_conf2']);

		$conteudoVidelo = '<div class="row"><div class="col-sm-12" id="video_vi"></div></div>';
		$conteudoVideYou = '<div class="row"><div class="col-sm-12" id="video_yu">you tube videos</div></div>';
		$ret['html_conf'] .= modalBootstrap('Video ',true,$conteudoVidelo,'modalVid','modal-lg');
		$ret['html_conf'] .= modalBootstrap('Video Youtube ',true,$conteudoVideYou,'modalVidYou','modal-lg');
		$ret['html_conf'] .='
		<script src="https://player.vimeo.com/api/player.js"></script>
		<script>
			jQuery(function(){
				jQuery(\'[data-target="#modalVid"]\').on(\'click\',function(){
					var id_vimeo = jQuery(\'[name="dados[cab][video]"]\').val();
					carregaVideoVimeo(id_vimeo,\'video01\');
				});
				/*jQuery(\'[data-target="#modalVidYou"]\').on(\'click\',function(){
					var id_youtube = jQuery(\'[input-video="youtube"]\').val();
					carregaVideoYoutbe(id_youtube,\'#video_yu\');
				});*/
			});
		</script>';
		$ret['html'] .= formCampos($config['campos_form']);
		//$ret['html'] .= '<div class="col-sm-12 padding-none">';
		//$ret['html'] .= editorSummernota('dados[cab][descricao]-Qualquer descrição sobre o conteúdo',@$config['descricao'],$tam='12',$altura='187',$clas = '',$title='');
		//$ret['html'] .= '</div>';
		$configForQuest = array(
			'ac'=>'cad',
			'acao'=>'cad',
			'sec'=>$config['sec'],
			'token_prova'=>$config['token'],
		);
		$_GET['opclist'] = isset($_GET['opclist']) ? $_GET['opclist'] : 'lista';
		if($_GET['opclist'] == 'lista'){
			$activeLista = 'active';
			$activeGab = false;
		}
		if($_GET['opclist'] == 'gabarito'){
			$activeLista = false;
			$activeGab = 'active';
		}
		$gabarito = false;
		if($config['acao']=='alt')
			$gabarito = '<li class="'.$activeGab.'"><a href="'.lib_trataAddUrl('opclist','gabarito').'">Gabarito</a></li>';
		$temaList = '
		<div class="col-sm-12">
			<ul class="nav nav-tabs">
			  <li class="'.$activeLista.'"><a href="'.lib_trataAddUrl('opclist','lista').'">Lista de questões</a></li>
			  '.$gabarito.'
			</ul>
		</div>
		<div class="col-sm-12">
			{lista}
		</div>
		';
		$conteudoPainelProvas = false;
		if($_GET['opclist'] == 'lista'){
			$conteudoPainelProvas = '<div class="col-sm-12" id="exibe_questoes">';
			$conteudoPainelProvas .= $this->listQuetoesAdmin($configForQuest);
			$conteudoPainelProvas .= '</div>';
		}
		if($_GET['opclist'] == 'gabarito'){
			$configForQuest['exibea']='exibe_gabarito';
			$configForQuest['pagga']= isset($_GET['pagga']) ? $_GET['pagga'] : 0;
			$conteudoPainelProvas = '<div class="col-sm-12" id="exibe_questoes">';
			$conteudoPainelProvas .= $this->listGabarito($configForQuest);
			$conteudoPainelProvas .= '</div>';
		}
		$conteudoModal = $this->frmQuestao($configForQuest);
		$conteudoPainelProvas .= modalBootstrap('Gerenciar questão',$fechar=false,$conteudoModal['html'],$id='myModalQuestao',$tam='modal-lg');
		if($config['acao']=='cad'){
			$btnAddQues = '<button type="button" class="btn btn-default" q-add-quest-cad title="Adicionar questão"><i class="fa fa-plus"></i></button>';
		}
		if($config['acao']=='alt'){
			$btnAddQues = '<button type="button" data-toggle="modal" data-target="#myModalQuestao" class="btn btn-primary" que-add-questao="true" title="Adicionar questão"><i class="fa fa-plus"></i></button>';
		}
		$conteudoQ = str_replace('{lista}',$conteudoPainelProvas,$temaList);
		$configPainelQuest = array('div_select'=>$outrosProva,'titulo'=>'Questões da prova','conteudo'=>$conteudoQ,'id'=>'dadosPainelProva','in'=>'in','condiRight'=>$btnAddQues,'tam'=>'12 painel-quest-prova');
		$ret['html'] .= '
		<style>
			.modal-lg {
				width: 95% !important;
			}
		</style>
		';
		$ret['html'] .= lib_painelCollapse($configPainelQuest);
		return $ret;
	}
	public function frmQuestao($config=false){
		$ret = false;
		$campo_bus = 'nome';
		$config['campo_bus'] = isset($_GET['campo_bus']) ? $_GET['campo_bus'] :$campo_bus;
		$config['opclist'] = isset($_GET['opclist']) ? $_GET['opclist'] : 'lista';
		if($config['acao'] == 'cad'){
			$salv_cotinuar = "Salvar e Continuar";
			$type_cont = 'submit';
			$config['token'] = uniqid();
			$config['ativo'] = 's';
			$config['ordenar'] = ultimoValarDb2($GLOBALS['tab27'],'ordenar',"WHERE token_prova = '".$config['token_prova']."' AND ".compleDelete());
			if(!$config['ordenar']){
				$config['ordenar'] = 1;
			}else{
				$config['ordenar'] = $config['ordenar'] +1;
			}
			$data_bt = 'continuar';
			$config['tipo'] = 1;
		}
		if($config['acao'] == 'alt'){
						$type_cont = 'button';
						$salv_cotinuar = "Novo cadastro";
						$data_bt = 'novo';
						$sql = "SELECT * FROM ".$GLOBALS['tab27']." WHERE `token` = '".$config['token']."' AND ".compleDelete();//echo $sql;
						$dados = buscaValoresDb($sql);
						if($dados){
										foreach($dados[0] As $key=>$value){
											if($key == 'informacoes' || $key == 'contrato' || $key == 'config'){
												$config[$key] = json_decode($value,true);
											}else{
												$config[$key] = $value;
											}
										}
						}
						$config['salv_label'] = "Alterar";
						if(isset($config['token']) && empty($config['token'])){
							$config['token'] = uniqid();
						}
						if(isset($config['config']) && empty($config['config'])){
							$config['config'] = json_decode($config['config'],true);
						}
		}
		$ret['exec'] = false;
		$ret['html'] = false;
		$ret['html'] .= '<div class="row">';
		$ret['html'] .= '<form id="frm_questao" method="post" class="row">';
			$ret['html'] .= '<div class="col-sm-12" style="margin-bottom:20px">';
			$config['campos_form'][1] = array('type'=>'text','size'=>'12','campos'=>'dados[questao][nome]-Titulo da questão ','value'=>@$config['nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>'','class'=>false,'title'=>'');
			$config['campos_form'][2] = array('type'=>'text','size'=>'2','campos'=>'dados[questao][config][pontos]-Pontos','value'=>@$config['config']['pontos'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
			$config['campos_form'][3] = array('type'=>'number','size'=>'2','campos'=>'dados[questao][ordenar]-Ordenar','value'=>@$config['ordenar'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
			$config['campos_form'][4] = array('type'=>'textarea','size'=>'12','campos'=>'dados[questao][descricao]-Questão','value'=>@$config['descricao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
			$ret['html'] .= formCampos($config['campos_form']);
			$ret['html']	.= queta_formfield4("hidden",'1',"dados[questao][id]-", @$config['id'],"","");
			$ret['html']	.= queta_formfield4("hidden",'1',"dados[questao][campo_id]-", "id","","");
			$ret['html'].= queta_formfield4("hidden",'1',"dados[questao][campo_bus]-", $campo_bus,"","");
			$ret['html']	.= queta_formfield4("hidden",'1',"dados[questao][tab]-", base64_encode($GLOBALS['tab27']),"","");
			if($config['acao'] == 'alt')
				$ret['html'] .= queta_formfield4("hidden",'1',"dados[questao][atualizado]-", date('Y-m-d H:m:i'),"","");
			$ret['html'].= queta_formfield4("hidden",'1',"dados[questao][conf]-", "s","","");
			$ret['html']	.= queta_formfield4("hidden",'1',"dados[questao][token_prova]-", $config['token_prova'],"","");
			$ret['html']	.= queta_formfield4("hidden",'1',"dados[questao][token]-", $config['token'],"","");
			$ret['html']	.= queta_formfield4("hidden",'1',"dados[questao][autor]-",  $_SESSION[SUF_SYS]['id'.SUF_SYS],"","");
			$ret['html']	.= queta_formfield4("hidden",'1',"dados[questao][ac]-", $config['acao'],"","");
			$ret['html']	.= queta_formfield4("hidden",'1',"dados[questao][tipo]-", $config['tipo'],"","");
			$ret['html']	.= queta_formfield4("hidden",'1',"dados[questao][sec]-", $config['sec'],"","");
			$ret['html'] .= '</div>';
			$ret['html'] .= '<span id="painel_opcoes">';
			$ret['html'] .= $this->opcQuestos($config);
			$ret['html'] .= '</span>';
			$ret['html'] .= '<div class="col-sm-12 text-right">';
			$ret['html'] .= '<button style="margin:0 10px 10px 0" type="button" id="removeOpcoes" class="btn btn-danger"><i class="fa fa-times"></i> '.__translate('Remover Opção',true).'</button>';
			$ret['html'] .= '<button style="margin:0 10px 10px 0" type="button" id="addOpcoes" class="btn btn-outline-secondary"><i class="fa fa-plus-circle"></i> '.__translate('Adicionar Opção',true).'</button>';
			$ret['html'] .= '</div>';
			//if($acao['acao']=='alt'){
				//echo queta_formfield3("hidden",100,"id_questao-", $_GET['id_questao'],"","");
			//}
			$ret['html'] .= '<div class="col-sm-12 mensa">';
			$ret['html'] .= '</div>';
			$ret['html'] .= '<div class="col-sm-12" style="margin-top:10px">';
			$ret['html'] .= '<button type="button" class="btn btn-danger" que-close ><i class="fa fa-chevron-left"></i> Fechar</button>';
			$ret['html'] .= '<button type="button" class="btn btn-outline-secondary" que-salv=""><i class="fa fa-floppy-o"></i> Salvar <i class="fa fa-chevron-right"></i></button>';
			$ret['html'] .= '</div>';
		$ret['html'] .= '</form>';
		$ret['html'] .= '</div>';
		$urlAmigo = '/iframe';
		$ret['html'] .= '
		<script>
			jQuery(function(){
				comandosAddRemoveOpc();
				jQuery(\'[que-salv=""]\').on(\'click\',function(){
					jQuery(\'#frm_questao\').submit();
				});
				submitFrm_questao(JSON.parse(\''.json_encode($config).'\'));

			});
		</script>

		';
			if($ret['html'])
				$ret['exec'] = true;
			//$ret['html'] .= editorSummernota('dados[cab][descricao]-Questão',@$config['descricao'],$tam='12',$altura='187',$clas = '',$title='');
		return $ret;
	}
	/*
	public function frmQuestao($config=false){
		$ret = false;
		$campo_bus = 'nome';
		if($config['acao'] == 'cad'){
			$salv_cotinuar = "Salvar e Continuar";
			$type_cont = 'submit';
			$config['token'] = uniqid();
			$config['ativo'] = 's';
			$config['ordenar'] = ultimoValarDb2($GLOBALS['tab27'],'ordenar',"WHERE token_prova = '".$config['token_prova']."' ");
			if(!$config['ordenar']){
				$config['ordenar'] = 1;
			}else{
				$config['ordenar'] = $config['ordenar'] +1;
			}
			$data_bt = 'continuar';
			$config['tipo'] = 1;
		}
		if($config['acao'] == 'alt'){
						$type_cont = 'button';
						$salv_cotinuar = "Novo cadastro";
						$data_bt = 'novo';
						$sql = "SELECT * FROM ".$GLOBALS['tab27']." WHERE `token` = '".$config['token']."'";//echo $sql;
						$dados = buscaValoresDb($sql);
						if($dados){
										foreach($dados[0] As $key=>$value){
											if($key == 'informacoes' || $key == 'contrato' || $key == 'config'){
												$config[$key] = json_decode($value,true);
											}else{
												$config[$key] = $value;
											}
										}
						}
						$config['salv_label'] = "Alterar";
						if(isset($config['token']) && empty($config['token'])){
							$config['token'] = uniqid();
						}
						if(isset($config['config']) && empty($config['config'])){
							$config['config'] = json_decode($config['config'],true);
						}
		}
		$ret['exec'] = false;
		$ret['html'] = false;
		$ret['html1'] = false;
		$ret['html2'] = false;
		$ret['html2'] .= '<div class="row">';
		$ret['html2'] .= '<form id="frm_questao" method="post" class="row">{dados}';
			$ret['html1'] .= '<div class="col-sm-12" style="margin-bottom:20px">';
			$config['campos_form'][1] = array('type'=>'text','size'=>'12','campos'=>'dados[questao][nome]-Titulo da questão ','value'=>@$config['nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>'','class'=>false,'title'=>'');
			$config['campos_form'][2] = array('type'=>'text','size'=>'2','campos'=>'dados[questao][config][pontos]-Pontos','value'=>@$config['config']['pontos'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
			$config['campos_form'][3] = array('type'=>'number','size'=>'2','campos'=>'dados[questao][ordenar]-Ordenar','value'=>@$config['ordenar'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
			$config['campos_form'][4] = array('type'=>'textarea','size'=>'12','campos'=>'dados[questao][descricao]-Questão','value'=>@$config['descricao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
			$ret['html1'] .= formCampos($config['campos_form']);
			$ret['html1']	.= queta_formfield4("hidden",'1',"dados[questao][id]-", @$config['id'],"","");
			$ret['html1']	.= queta_formfield4("hidden",'1',"dados[questao][campo_id]-", "id","","");
			$ret['html1'].= queta_formfield4("hidden",'1',"dados[questao][campo_bus]-", $campo_bus,"","");
			$ret['html1']	.= queta_formfield4("hidden",'1',"dados[questao][tab]-", base64_encode($GLOBALS['tab27']),"","");
			if($config['acao'] == 'alt')
				$ret['html1'] .= queta_formfield4("hidden",'1',"dados[questao][atualizado]-", date('Y-m-d H:m:i'),"","");
			$ret['html1'].= queta_formfield4("hidden",'1',"dados[questao][conf]-", "s","","");
			$ret['html1']	.= queta_formfield4("hidden",'1',"dados[questao][token_prova]-", $config['token_prova'],"","");
			$ret['html1']	.= queta_formfield4("hidden",'1',"dados[questao][token]-", $config['token'],"","");
			$ret['html1']	.= queta_formfield4("hidden",'1',"dados[questao][autor]-",  $_SESSION[SUF_SYS]['id'.SUF_SYS],"","");
			$ret['html1']	.= queta_formfield4("hidden",'1',"dados[questao][ac]-", $config['acao'],"","");
			$ret['html1']	.= queta_formfield4("hidden",'1',"dados[questao][tipo]-", $config['tipo'],"","");
			$ret['html1']	.= queta_formfield4("hidden",'1',"dados[questao][sec]-", $config['sec'],"","");
			$ret['html1'] .= '</div>';
			$ret['html1'] .= '<span id="painel_opcoes">';
			$ret['html1'] .= $this->opcQuestos($config);
			$ret['html1'] .= '</span>';
			$ret['html1'] .= '<div class="col-sm-12 text-right">';
			$ret['html1'] .= '<button style="margin:0 10px 10px 0" type="button" id="removeOpcoes" class="btn btn-danger"><i class="fa fa-times"></i> '.__translate('Remover Opção',true).'</button>';
			$ret['html1'] .= '<button style="margin:0 10px 10px 0" type="button" id="addOpcoes" class="btn btn-outline-secondary"><i class="fa fa-plus-circle"></i> '.__translate('Adicionar Opção',true).'</button>';
			$ret['html1'] .= '</div>';
			//if($acao['acao']=='alt'){
				//echo queta_formfield3("hidden",100,"id_questao-", $_GET['id_questao'],"","");
			//}
			$ret['html1'] .= '<div class="col-sm-12 mensa">';
			$ret['html1'] .= '</div>';
			$ret['html1'] .= '<div class="col-sm-12" style="margin-top:10px">';
			$ret['html1'] .= '<button type="button" class="btn btn-danger" que-close ><i class="fa fa-chevron-left"></i> Fechar</button>';
			$ret['html1'] .= '<button type="button" class="btn btn-outline-secondary" que-salv=""><i class="fa fa-floppy-o"></i> Salvar <i class="fa fa-chevron-right"></i></button>';
			$ret['html2'] .= '</div>';
		$ret['html2'] .= '</form>';
		$ret['html'] .= '</div>';
		$urlAmigo = '/iframe';
		$ret['html2'] .= '
		<script>
			jQuery(function(){
				comandosAddRemoveOpc();
				jQuery(\'[que-salv=""]\').on(\'click\',function(){
					jQuery(\'#frm_questao\').submit();
				});
				var opclist = \''.$_GET['opclist'].'\';
				jQuery(\'#frm_questao\').validate({
							submitHandler: function(form) {
								$.ajax({
									url: \''.RAIZ.'/app/ead/acao.php?ajax=s&opc=salvarQuestao&acao='.$config['acao'].'&campo_bus='.$campo_bus.'&opclist='.$_GET['opclist'].'\',
									type: form.method,
									data: jQuery(form).serialize(),
									beforeSend: function(){
										jQuery(\'#preload\').fadeIn();
									},
									async: true,
									dataType: "json",
									success: function(response) {
										jQuery(\'#preload\').fadeOut();
										jQuery(\'.mensa\').html(response.mensa);
										jQuery(\'[name="dados[questao][id]"]\').val(response.salvar.id);
										jQuery(\'[name="dados[questao][ac]"]\').val(\'alt\');
										//var bt_press = jQuery("#btn-ac").html();
										';


										$ret['html2'] .=	'
										if(response.exec){
											if(response.list){
												if(opclist == \'lista\')
													jQuery(\'#exibe_questoes\').html(response.list);
												if(opclist == \'gabarito\')
													jQuery(\'#painel_questao_1\').html(response.exibeQuestao);
												//jQuery("#myModal2").modal("hide");
											}

										}
									},
									error: function(error){
										jQuery(\'#preload\').fadeOut();
										alert(\'ERRO AO SALVAR ENTRE EM CONTATO COM O SUPORTE '.suporteTec().'\');
										console.log(error);
									}
								});

							},
							ignore: ".ignore",
							rules: {
								nome: {
									required: true
								}
							},
							messages: {
								nome: {
									required: " '.__translate('Por favor preencher este campo',true).'"
								}
							}
					});
			});
		</script>

		';
		$ret['html'] = str_replace('{dados}',$ret['html1'],$ret['html2']);
			if($ret['html'])
				$ret['exec'] = true;
			//$ret['html'] .= editorSummernota('dados[cab][descricao]-Questão',@$config['descricao'],$tam='12',$altura='187',$clas = '',$title='');
		return $ret;
	}
	*/

	public function listQuetoesAdmin($config=false){
		$ret = false;
		if($config){
			$sql = "SELECT * FROM ".$GLOBALS['tab27']." WHERE `token_prova`='".$config['token_prova']."' AND ".compleDelete()." ORDER BY `ordenar` ASC";
			$dados = buscaValoresDb($sql);
			if($dados){
				$arr_status = sql_array("SELECT * FROM status ORDER BY id DESC",'nome','abv');
				$tema = '
					<table class="table table-hover" id="listQuestao">
						<thead class="jss507">
							<tr class="jss508 jss511">';
							$tema .= '
								<th class="jss513" scope="col"><div>Id</div></th>
								<th class="jss513" scope="col"><div>Data Cad</div></th>
								<th class="jss513" scope="col"><div>Nome</div></th>';
					$tema .='<th class="jss513 hidden-print" scope="col"><div align="center">Ação</div></th>
							</tr>
						</thead>
						<tbody class="jss526">{{table}}
						</tbody>
					</table>
					<script>

						jQuery(document).ready(function() {

					';
						$regi_por_pg = 4;
					if(count($dados) > 6){
					$tema .= '
							jQuery("#listQuestao").DataTable( {
								"order": [[ 0, "desc" ]],
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
								}
							});';
					}
					$tema .= '

						});
					</script>
					';
				$tr = false;
				if(is_array($dados)>0){
					foreach($dados As $kei=>$valo){
						$btAcao = '<button type="button" data-toggle="modal" data-target="#myModalQuestao"  onclick="frmQuestao(\'alt\',\''.$valo['token'].'\',\''.$valo['token_prova'].'\');" class="btn btn-default" title="'.__translate('Detalhes deste veículo',true).'"><i class="fa fa-pencil"></i></button>';
						$btAcao .= '<button type="button" onclick="deleteQuestao(\''.$valo['id'].'\',\''.$valo['token_prova'].'\');" class="btn btn-danger" title="'.__translate('Excuir este veículo',true).'"><i class="fa fa-trash"></i></button>';
						$tr .= '<tr>';

						$tr .= '	<td class="jss513 jss515 jss520">'.$valo['ordenar'].'</td>
									<td class="jss513 jss515 jss520 color-valor"> '.dataExibe($valo['data']).'</td>
									<td class="jss513 jss515 jss520 color-valor"> '.$valo['nome'].'</td>
									';
						$tr .= '	<td class="jss513 jss515 jss520 color-valor hidden-print"><div align="right">'.$btAcao.'</div></td>
								</tr>
						';
					}
				}
				$ret = str_replace('{{table}}',$tr,$tema);
			}
		}
		return $ret;
	}
	public function gerAddRelacionar($relacionado=false,$item=false){
			/*Funcção para gerenciar e relacionar dados
			é necessario dois array um
			$relacionaod (contendo dados do que receberar) e outro $item (contendo dados do item que virá)
			esta funcao vai gerenciar tudo
			$relacionado = array(
				'tab'=>'',
				'local'=>'',
				'grava_relacionado'=>'',
				'grava_formato'=>'json',   //json ou string
				'label_legend'=>'Adicionar conteúdo',
				'label_bt1'=>'Adicionar uma aula existente',
				'info'=>'',
				'label_bt2'=>'',

				...
			);
			$item = array(
				'tab'=>$tab12,
				'titulo'=>'Encontrar '.$relacionado['local'],
				'id'=>'id',
				'label_campo'=>'nome',
				'campo'=>'titulo',
				'sec'=>'', //Sessão para o cadastro do item em bese64
				'value'=>'',
				'type'=>'1',
				'placeholder'=>'Digite um nome aqui...',
				'label_legend'=>'Adicionar conteudo',
				'campoOrdem'=>'ordenar',
				'comple'=>"WHERE pai = '0'",
				'ordenar'=>"ORDER BY ordenar ASC"
			);
			*/
			//global $tab12;
			$ret =  false;
			if($relacionado && $item){
				if(!isset($relacionado['grava_formato']) || empty($relacionado['grava_formato']))
					$relacionado['grava_formato'] = 'json';
			$ret .= '
			<fieldset class="ui-widget ui-widget-content" style="padding:15px;margin-bottom:15px">
				<legend class="legendStyle">
					<a data-toggle="collapse" data-target="#relac" href="javascript:void(0);">'.__translate($relacionado['label_legend'],true).'</a>
				</legend>
				<div class="row collapse in" id="relac">
					<div class="col-sm-12 padding-none linha1" style="padding:0 25px 10px 20px;">';

						if(isset($relacionado['info'])&&!empty($relacionado['info'])){
							$ret .= '
						<div class="col-md-12">
							'.formatMensagemInfo($relacionado['info'],'info').'
						</div>';

						}
						$ret .= '
						<div class="col-md-12">
							<button type="button" quet-acao="add" class="btn btn-primary">'.__translate($relacionado['label_bt1'],true).'</button>
							<a data-fancybox-que data-local="'.$relacionado['local'].'" data-type="iframe" data-src="'.$relacionado['cad_item'].'" href="javascript:void(0);" quet-acao="cad" class="btn btn-default"><i class="fa fa-plus"></i> '.__translate($relacionado['label_bt2'],true).'</a>
						</div>
					</div>
					<div class="col-sm-12 linha2" style="padding-bottom:10px;display:none">
						<div class="col-sm-11 padding-none"><div class="row">';

							$ret .= painelAutoComplete($item);
						$ret .= '
						</div></div>
						<div class="col-sm-1" style="padding:20px 0">
							<button type="button" quet-prod="rel" class="btn btn-primary" style="width:100%" title="'.__translate('Incluir na lista de '.$relacionado['local'].' relacionandos',true).'">
								<i class="fa fa-plus"></i> '.__translate('Adicionar',true).'
							</button>
						</div>
					</div>
					<div class="col-sm-12">
						<div class="col-md-12 mens padding-none">
						</div>
						<div class="col-md-12 padding-none" id="sortable_listGradeCurso">
							'.sortable_listGradeCurso($relacionado).'
						</div>
					</div>

				</div>';
				unset($relacionado[$relacionado['grava_relacionado']]);
				$ret .='
				<script>
					var item = \''.json_encode($item).'\';
					var relacionado = \''.json_encode($relacionado).'\';
					function salvarcursosRela(item,ac,auto){
						var config={ac:ac,relacionado:relacionado,item:item,auto:auto,listPos:1}
						salvarcursosRela0(config);
					}
					function nestable3List(valor){
						var event = \'\';
						var htmli = \'\';
						htmli += \'<ol class="dd-list">\';
						//$each(valor.arr_relaci,function(){
						$.each(valor.arr_relaci, function() {
								event = \'input-change="true" quet-id="\'+this.idItem+\'"\';
								htmli += \'<li class="dd-item dd3-item" data-id="\'+this.idItem+\'">\';
								htmli += \'		<div class="dd-handle dd3-handle">\';
								htmli += \'			Drag\';
								htmli += \'		</div>\';
								htmli += \'		<div class="dd3-content">\';
								htmli += \'			<div class="row">\';
								htmli += \'				<span class="titulo">\';
								htmli += \'				<div class="col-md-9">\';
								htmli += \'					\'+this.nome;
								htmli += \'				</div>\';
								htmli += \'				<div class="pull-right" style="padding:7px 10px">\';
								htmli += \'					<div class="btn-group">\';
								htmli += \'						<a data-fancybox-que data-type="iframe" data-src="'.RAIZ.'/'.$relacionado['url_alt_item'].'&id=\'+btoa(this.idItem)+\'" href="javascript:void(0)" class="btn btn-outline-secondary btn-xs" queta-rela="alt" alt-id="\'+this.idItem+\'" title="\'+__translate(\'Editar\',true)+\'"><i class="fa fa-pencil"></i></a>\';
								htmli += \'						<a href="javascript:void(0)" class="btn btn-danger btn-xs" queta-rela="del" del-id="\'+this.idItem+\'" data-toggle="tooltip" title="\'+__translate(\'Excluir\',true)+\'"><i class="fa fa-times"></i></a>\';
								htmli += \'					</div>\';
								htmli += \'				</div>\';
								htmli += \'			</div>\';
								htmli += \'		</div>\';
								htmli += \'</li>\';
						});
						htmli +=  \'</ol>\';
						jQuery(\'#nestable3\').html(htmli);
						jQuery(\'[queta-rela="del"]\').on(\'click\',function(){
							var id = jQuery(this).attr(\'del-id\');
							auto = id;
							salvarcursosRela(item,\'del\',auto);
						});
						jQuery(\'[data-fancybox-que]\').on(\'click\',function(){
							//alert(\'aqui\');
							editConteudoFormEad(\''.$relacionado['local'].'\');
						});
					}
					jQuery(function(){

						jQuery(\'[quet-prod="rel"]\').on(\'click\',function(){
							var auto = jQuery(\'[quet-acao="auto"]\').val();
							jQuery(\'[quet-acao="auto"]\').val(\'\');
							salvarcursosRela(item,\'cad\',auto);
						});
						jQuery(\'[quet-acao="auto"]\' ).keypress(function( event ) {
							  if ( event.which == 13 ) {
								var auto = jQuery(\'[quet-acao="auto"]\').val();
								 jQuery(\'[quet-acao="auto"]\').val(\'\');
								 salvarcursosRela(item,\'cad\',\'\',auto);

							  }
						});
						jQuery(\'[quet-acao="add"]\').on(\'click\',function(){
							jQuery(\'.linha2\').show();
						});
						jQuery(\'[queta-rela="del"]\').on(\'click\',function(){
							var id = jQuery(this).attr(\'del-id\');
							auto = id;
							salvarcursosRela(item,\'del\',auto);
						})
					});

				</script>
			</fieldset>';

			}else{
				$ret .= formatMensagem('dados insuficientes','danger',8000);
			}
			return $ret;
	}

	public function exibeQuestProvas($config=false){
			global $tab27;
			// $config = array('token','totalQue');
			$exibe = false;
			$Urlopcoes = "SELECT * FROM  `$tab27` WHERE `token` = '".$config['token']."' AND ".compleDelete()." ORDER BY id ASC";
			$dados = buscaValoresDb($Urlopcoes);

			if($dados){
				$config['totalQue'] = isset($config['totalQue']) ? $config['totalQue'] : totalReg($tab27,"WHERE `token_prova`='".$dados[0]['token_prova']."' AND ".compleDelete());
				if(isset($config['pagga'])){
					$ques = ($config['pagga']+1);
					$ques = __translate('Questão',true).' '.$ques.' de '.$config['totalQue'];
				}else{
					$ques = false;
				}//echo $ques;
			$exibe .= '
			<div class="col-sm-12">
						<id_prova style="display:none">'.buscaValorDb($GLOBALS['tab39'],'token',$dados[0]['token_prova'],'id').'</id_prova>
						<token_questao style="display:none">'.$config['token'].'</token_questao>
					  <div class="text-subhead-2">'.$ques.'</div>
					  <div class="panel panel-default paper-shadow" data-z="0.5">
						<div class="panel-heading">
						  <h4 class="text-headline">'.$dados[0]['nome'].'</h4>
						</div>
						<div class="panel-body">
						  '.$dados[0]['descricao'].'
						</div>
					  </div>

					  <div class="text-subhead-2">'.__translate('Opções',true).'</div>
					  <div class="panel panel-default paper-shadow" data-z="0.5">
						<div class="panel-body">';
						$repCerta = false;
						if(!empty($dados[0]['config'])){
							$opcoes = json_decode($dados[0]['config'],true);
							if(is_array($opcoes['opcao'])){
								$totalOp = count($opcoes['opcao']);
								$alternativas = lib_alternatives($totalOp,'ma');
								$k_certa = ($opcoes['certa']-1);
								$repCerta = $alternativas[$k_certa];
								$num = 1;
								for($i=0;$i<$totalOp;$i++){
									if($i==$k_certa){
										$color = 'text-danger';
									}else{
										$color = false;
									}
								   $exibe .= '<div class="checkbox checkbox-primary '.$color.'">
													<strong style="font-size:14px;">('.$alternativas[$i].')</strong> '.$opcoes['opcao'][$i].'
												 </div>';
									$num++;
								}
							}
						}
						$exibe .= '
						</div>
						<div class="panel-footer">
							<h3>'.__translate('Resposta Certa',true).' :</h3>'.$repCerta.'
						</div>
					  </div>
					  <div class="panel panel-default paper-shadow" data-z="0.5">
						<div class="panel-body">
							<div class="text-right">
								<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#myModalQuestao" onClick="frmQuestao(\'alt\',\''.$dados[0]['token'].'\',\''.$dados[0]['token_prova'].'\',\''.$_GET['opclist'].'\');"><i class="fa fa-pencil-square-o" aria-hidden="true"></i> '.__translate('Editar',true).'</button>
								<button type="button" class="btn btn-danger" onClick="deleteQuestao(\''.$dados[0]['id'].'\',\''.$dados[0]['token_prova'].'\',\''.$_GET['opclist'].'\');"><i class="fa fa-trash-o" aria-hidden="true"></i> '.__translate('Excluir',true).'</button>
							</div>
						</div>
					  </div>
					</div>';
			}

			return $exibe;
	}
	public function exibeQuestProvas_bk($config=false){
		global $tab27;
		// $config = array('token','totalQue');
		$exibe = false;
		$Urlopcoes = "SELECT * FROM  `$tab27` WHERE `token` = '".$config['token']."' AND ".compleDelete()." ORDER BY id ASC";
		$dados = buscaValoresDb($Urlopcoes);

		if($dados){
			$config['totalQue'] = isset($config['totalQue']) ? $config['totalQue'] : totalReg($tab27,"WHERE `token_prova`='".$dados[0]['token_prova']."' AND ".compleDelete());
			if(isset($config['pagga'])){
				$ques = ($config['pagga']+1);
				$ques = __translate('Questão',true).' '.$ques.' de '.$config['totalQue'];
			}else{
				$ques = false;
			}//echo $ques;
		$exibe .= '
		<div class="col-sm-12">
					<id_prova style="display:none">'.buscaValorDb($GLOBALS['tab39'],'token',$dados[0]['token_prova'],'id').'</id_prova>
					<token_questao style="display:none">'.$config['token'].'</token_questao>
				  <div class="text-subhead-2">'.$ques.'</div>
				  <div class="panel panel-default paper-shadow" data-z="0.5">
					<div class="panel-heading">
					  <h4 class="text-headline">'.$dados[0]['nome'].'</h4>
					</div>
					<div class="panel-body">
					  '.$dados[0]['descricao'].'
					</div>
				  </div>

				  <div class="text-subhead-2">'.__translate('Opções',true).'</div>
				  <div class="panel panel-default paper-shadow" data-z="0.5">
					<div class="panel-body">';
					$repCerta = false;
					if(!empty($dados[0]['config'])){
						$opcoes = json_decode($dados[0]['config'],true);
						if(is_array($opcoes['opcao'])){
							$repCerta = $opcoes['certa'];
							$num = 1;
							for($i=0;$i<count($opcoes['opcao']);$i++){
							   $exibe .= '<div class="checkbox checkbox-primary">
												<strong style="font-size:14px;">('.$num.')</strong> '.$opcoes['opcao'][$i].'
											 </div>';
								$num++;
							}
						}
					}
					$exibe .= '
					</div>
					<div class="panel-footer">
						<h3>'.__translate('Resposta Certa',true).' :</h3>'.$repCerta.'
					</div>
				  </div>
				  <div class="panel panel-default paper-shadow" data-z="0.5">
					<div class="panel-body">
						<div class="text-right">
							<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#myModalQuestao" onClick="frmQuestao(\'alt\',\''.$dados[0]['token'].'\',\''.$dados[0]['token_prova'].'\',\''.$_GET['opclist'].'\');"><i class="fa fa-pencil-square-o" aria-hidden="true"></i> '.__translate('Editar',true).'</button>
							<button type="button" class="btn btn-danger" onClick="deleteQuestao(\''.$dados[0]['id'].'\',\''.$dados[0]['token_prova'].'\',\''.$_GET['opclist'].'\');"><i class="fa fa-trash-o" aria-hidden="true"></i> '.__translate('Excluir',true).'</button>
						</div>
					</div>
				  </div>
				</div>';
		}

		return $exibe;
	}
	public function listGabarito($config=false){
			$campo = 'ordenar';
			$ordenar = 'ASC';
			$exibe = false;
			if(isset($config['token_prova'])){
				$reg_pag	 = isset($config['reg_pag']) ? $config['reg_pag'] : 1;
				$exibea	 = isset($config['exibea']) ? $config['exibea'] : 'painel_questao_1';
				$pag			 = isset($config['pagga']) ? $config['pagga'] : 0;
				$lin			 = isset($config['lin']) ? $config['lin'] : 'ajax=s&opc=exibeQuestProvas&';
				$arquivo	 = isset($config['arquivo']) ? $config['arquivo'] : RAIZ.'/app/ead/acao.php';
				$url = "SELECT * FROM  `".$GLOBALS['tab27']."` WHERE `token_prova` = '".$config['token_prova']."' AND ".compleDelete() ;
				$url .= " ORDER BY `".$campo."` ".$ordenar;
				$inicial = $pag*$reg_pag;
				$dados_lista = buscaValoresDb($url);
				$urlDpag = $url." LIMIT $inicial,$reg_pag";
				$dados_pagina = buscaValoresDb($urlDpag);
				$exibe = false;
				if($dados_lista){
					//$exibe = '<div class="col-sm-12 padding-none">'.paginaCao(count($dados_lista),$reg_pag,$pag,$lin,$arquivo,$exibea).'</div>';
					$exibe = '<div class="col-sm-12 padding-none">'.$this->lib_paginaCao2(count($dados_lista),$reg_pag,$pag,1,'pagga').'</div>';
					$exibe .= '<div class="col-sm-12 padding-none page-section equal" id="painel_questao_1">';
					foreach($dados_pagina As $key=>$val){
						$lin .= 'token='.$val['token'];
						$val['pagga'] = $pag;
						$exibe .= $this->exibeQuestProvas($val);
					}
					$exibe .= '</div>';
				}else{
					return formatMensagem("NENHUM QUESTÃO ENCONTRADA!!","warning");

				}
			}
		return $exibe;
	}
	public function salvarCurso($config=false){
		$ret['exec'] = false;
		if($config){
			$mensagem = new mensagem;
			if(isset($config['dados']['cab']['url'])){
				$cond_valid = "WHERE `nome` = '".$config['dados']['cab']['nome']."' OR `url` = '".$config['dados']['cab']['url']."'";
			}else{
				$cond_valid = "WHERE `nome` = '".$config['dados']['cab']['nome']."' ";
			}
			$type_alt = 2;
			$tabUser = $GLOBALS['tab10'];
			$config2 = array(
						'tab'=>$tabUser,
						'valida'=>true,
						'condicao_validar'=>$cond_valid,
						'sqlAux'=>false,
						'ac'=>$config['ac'],
						'type_alt'=>$type_alt,
						'config' => false,
						'dadosForm' => $config['dados']['cab']
			);
			$result_salvarClientes =  lib_salvarFormulario($config2);//Declado em Lib/Qlibrary.php
			$ret = json_decode($result_salvarClientes,true);
			/*if(isset($config['ativar_topico'])){
				$ret['ativar_topico']=$mensagem->ativaDesativaMensagem($config['ativar_topico']);
			}*/
		}
		return $ret;
	}
	public function salvarModulos($config=false){
		$ret['exec'] = false;
		if($config){
			$cond_valid = "WHERE `nome` = '".$config['dados']['cab']['nome']."'";
			$type_alt = 2;
			$tabUser = $GLOBALS['tab38'];
			$config2 = array(
						'tab'=>$tabUser,
						'valida'=>true,
						'condicao_validar'=>$cond_valid,
						'sqlAux'=>false,
						'ac'=>$config['ac'],
						'type_alt'=>$type_alt,
						'config' => false,
						'dadosForm' => $config['dados']['cab']
			);
			$result_salvarClientes =  lib_salvarFormulario($config2);//Declado em Lib/Qlibrary.php
			$ret = json_decode($result_salvarClientes,true);
			if(isset($config['dados']['cab']['token_curso'])){
					if($config['ac'] == 'cad' && isset($ret['idCad'])){
						$relacionado['local']				= 'Módulos';
						$relacionado['tab']			 		= $GLOBALS['tab10'];
						$relacionado['tab_item'] 			= $GLOBALS['tab38'];
						$relacionado['campo_bus_item']		= 'id';
						$relacionado['campo_enc_item']		= 'nome';
						$relacionado['grava_relacionado'] 	= 'conteudo';
						$relacionado['url_alt_item'] 		= 'ead/iframe?sec=bW9kdWxvcy1lYWQ=&acao=alt&listPos=conteCurso&token_curso='.$config['dados']['cab']['token_curso'];
						$relacionado['pasta'] 				= 'ead';
						$relacionado['token'] 				= $config['dados']['cab']['token_curso'];
						//$relacionado['conteudo'] 		= buscaValorDb($GLOBALS['tab10'],'token',$relacionado['token'],'conteudo');
						$item = array(
																				'tab'=>$GLOBALS['tab38'],
																				'titulo'=>'Encontrar '.$relacionado['local'],
																				'id'=>'id',
																				'label_campo'=>'nome',
																				'campo'=>'nome',
																				'value'=>'',
																				'type'=>'1',
																				'sec'=>'bW9kdWxvcy1lYWQ=',
																				'placeholder'=>'Digite o nome de um modulo...',
																				'campoOrdem'=>'ordenar',
																				'comple'=>"",
																				'idItem'=>$ret['idCad'],
																				'ordenar'=>"ORDER BY ordenar ASC"
						);
						$configRela = array('ac'=>$config['ac'],'auto'=>$config['dados']['cab']['nome'],'relacionado'=>json_encode($relacionado),'item'=>json_encode($item));
						$ret['salvarGerRelacionadosP'] = salvarGerRelacionadosP($configRela);
					}
					$config['conteudo'] = array(
						'relacionado'=>'conteudo',
						'tab'=>$GLOBALS['tab10'],
						'token'=>$config['dados']['cab']['token_curso'],
					);
					$ret['conteudo'] = listaSortableListAjax($config['conteudo']);
			}
		}
		return $ret;
	}

	public function salvarConteudo($config=false){
		$ret['exec'] = false;
		if($config){
			$cond_valid = "WHERE `nome` = '".$config['dados']['cab']['nome']."' AND `tipo` = '".$config['dados']['cab']['tipo']."'";
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
						'dadosForm' => $config['dados']['cab']
			);
			$ret =  json_decode(lib_salvarFormulario($config2),true);//Declado em Lib/Qlibrary.php
			if(isset($config['dados']['cab']['token_modulo'])){
				if($config['ac'] == 'cad' && isset($ret['idCad'])){
						$relacionado['local']				= 'Atividade';
						$relacionado['tab']			 		= $GLOBALS['tab38'];
						$relacionado['tab_item'] 			= $GLOBALS['tab39'];
						$relacionado['campo_bus_item']		= 'id';
						$relacionado['campo_enc_item']		= 'nome';
						$relacionado['grava_relacionado'] 	= 'conteudo';
						$relacionado['url_alt_item'] 		= 'ead/iframe?sec=Y29udGV1ZG8tZWFk&acao=alt&listPos=conteAula&token_modulo='.$config['dados']['cab']['token_modulo'].'&token_curso='.@$config['dados']['cab']['token_curso'];
						$relacionado['pasta'] 				= 'ead';
						$relacionado['token'] 				= $config['dados']['cab']['token_modulo'];
						//$relacionado['conteudo'] 		= buscaValorDb($GLOBALS['tab10'],'token',$relacionado['token'],'conteudo');
						$item = array(
																				'tab'=>$GLOBALS['tab39'],
																				'titulo'=>'Encontrar '.$relacionado['local'],
																				'id'=>'id',
																				'label_campo'=>'nome',
																				'campo'=>'nome',
																				'value'=>'',
																				'type'=>'1',
																				'sec'=>'Y29udGV1ZG8tZWFk',
																				'placeholder'=>'Digite o nome de uma aula, prova ou artigo...',
																				'campoOrdem'=>'ordenar',
																				'comple'=>"",
																				'idItem'=>$ret['idCad'],
																				'ordenar'=>"ORDER BY ordenar ASC"
						);
						$configRela = array('ac'=>$config['ac'],'auto'=>$config['dados']['cab']['nome'],'relacionado'=>json_encode($relacionado),'item'=>json_encode($item));
						$ret['salvarGerRelacionadosP'] = salvarGerRelacionadosP($configRela);
					}
					$compleurl_atividade = false;
					if(isset($config['dados']['cab']['listPos']) && isset($config['dados']['cab']['token_curso']) && $config['dados']['cab']['listPos']=='conteCurso'){
						$config['conteudo'] = array(
							'relacionado'=>'conteudo',
							'tab'=>$GLOBALS['tab10'],
							'token'=>$config['dados']['cab']['token_curso'],
						);
						$compleurl_atividade = '&listPos=conteCurso&token_curso='.$config['dados']['cab']['token_curso'];
					}else{
						$config['conteudo'] = array(
							'relacionado'=>'conteudo',
							'tab'=>$GLOBALS['tab38'],
							'token'=>$config['dados']['cab']['token_modulo'],
						);
					}
					$ret['conteudo'] = listaSortableListAjax($config['conteudo'],$compleurl_atividade);
			}
		}
		return $ret;
	}
	public function delQuestao($config=false){
		$config['tab']					= isset($config['tab']) 			 ? $config['tab'] : $GLOBALS['tab27'];
		$config['campo_id'] 		= isset($config['campo_id']) 	 ? $config['campo_id'] : 'id';
		$config['nomePost'] 		= isset($config['nomePost'])	 ? $config['nomePost'] : 'Questão';
		$config['acao']			 	= isset($config['acao'])			 ? $config['acao'] : 'Questão';
		//$config['id'] = isset($config['id']) ? $config['id'] : 'id';
		$ret['del'] = lib_delete($config);
		if($ret['del']['result_del']['exec']){
			$ret['list'] = $this->listQuetoesAdmin($config);
		}
		return $ret;
	}
	public function salvarQuestao($config=false){
		$ret['exec'] = false;
		if($config){
			$config['opclist'] = isset($config['opclist']) ? $config['opclist'] : 'lista';
			$cond_valid = "WHERE `nome` = '".$config['dados']['questao']['nome']."'";
			$type_alt = 2;
			$tabUser = $GLOBALS['tab27'];
			$config2 = array(
						'tab'=>$tabUser,
						'valida'=>true,
						'condicao_validar'=>$cond_valid,
						'sqlAux'=>false,
						'ac'=>$config['dados']['questao']['ac'],
						'type_alt'=>$type_alt,
						'config' => false,
						'dadosForm' => $config['dados']['questao']
			);
			$result_salvarClientes =  lib_salvarFormulario($config2); //Declado em Lib/Qlibrary.php
			$ret = json_decode($result_salvarClientes,true);
			$ret['list'] = $this->listQuetoesAdmin($config['dados']['questao']);
			$ret['exibeQuestao'] = $this->exibeQuestProvas($config['dados']['questao']);
		}
		return $ret;
	}
	public	function opcQuestos($config=false){
			global $tab27;
			$exibe = false;
			$val  = isset($config['qtd']) ? $config['qtd'] : 4;
			if($config){
					$certa = false;
					$optios = array();$optiosSele = array();
					if($config['acao']=='cad'){
						$q = 1;
						for($i=0;$i<$val;$i++){
							$optios[$i] = '';$optiosSele[$q] = 'Opção '.$q;
							$q ++;
						}
						$exibe = '<input type="hidden" name="qtd_inputs" value="'.$val.'" id="qtd_inputs">';
					}
					if($config['acao']=='alt'){
						$Urlopcoes = "SELECT `id`,`config` FROM  `$tab27` WHERE `token` = '".$config['token']."' AND ".compleDelete()." ORDER BY id ASC";
						$dados = buscaValoresDb($Urlopcoes);
						if($dados){
							if(!empty($dados[0]['config'])){
								$conf = json_decode($dados[0]['config'],true);
								$optios = array();$q = 1;
								if(isset($conf['opcao']) && is_array($conf['opcao'])){
									$certa = $conf['certa'];
									for($i=0;$i<count($conf['opcao']);$i++){
										$optios[$i] = $conf['opcao'][$i];$optiosSele[$q] = 'Opção '.$q;
										$q ++;
									}
								}else{
									$q = 1;
									for($i=0;$i<$val;$i++){
										$optios[$i] = '';$optiosSele[$q] = 'Opção '.$q;
										$q ++;
									}
									$exibe = '<input type="hidden" name="qtd_inputs" value="'.$val.'" id="qtd_inputs">';
								}
							}
						}
					}
					$exibe .= $this->frmOpcoes('12', $optios,$optiosSele, $certa, $css = '', $event = '', $clas = '');
			}
			return $exibe;
	}
	public function todasQuestores($size='12', $optios = array(), $optiossele = array(), $selected='', $css = '', $event = '', $clas = ''){
	}
	public function frmOpcoes($size='12', $optios = array(), $optiossele = array(), $selected='', $css = '', $event = '', $clas = ''){
			if(!empty($clas))
				  $class = $clas;
			 else
				  $class = 'form-control';

			$input = "";
			if(isset($optios)){
				$input = '
				<div class="col-sm-'.$size.'">
					<div class="panel panel-primary">
						<div class="panel-heading">
							<span class="glyphicon glyphicon-list"></span> '.__translate('OPÇÕES DA QUESTÃO',true).'
						</div>
						<div class="panel-body" id="inputs_opcao">';
						  if(isset($optios) && count($optios) >= 1){
						 $i=0;
						 $input .= '<ul class="list-group" id="lista_inp">';

							foreach($optios as $keys => $value){
								$i++;

											$input .= '
								<li class="list-group-item col-md-12">

									<div class="col-md-12">
										<div class="form-group form-control-material">
											<label for="opcao">Opção '.$i.'</label>
											<input type="text" class="form-control used" value="'.$value.'" name="dados[questao][config][opcao][]" id="opcao[]" placeholder="Degite aqui a o conteúdo desta opção..."><span class="ma-form-highlight"></span><span class="ma-form-bar"></span>

										</div>
									</div>
								</li>';
							}

							 $input .= '</ul>';
						  }
						$input .= '</div>
						<div class="panel-footer">
							<div class="row">
								<div class="col-md-12" id="resp_certa">
									'.queta_formfieldSelect2_2("dados[questao][config][certa]-Resposta Correta", '2-10', $optiossele,array(@$selected,''),'','','','form-control','d','Selecione a reposta certa').'
								</div>

							</div>
						</div>
					</div>
				</div>
			';
			}
			return $input;
	}
	public function lib_paginaCao2($reg_total,$regi_pg,$pag=0,$opc=1,$labPagina='pag'){
				$paginas = ceil($reg_total/$regi_pg);	//echo $paginas;
				$paginas++;
				$valor = false;
				if($opc == 1){
					$valor = "<ul class=\"pagination\">";
					if($pag > 0){

						$valor .= "<li><a href=\"".lib_trataAddUrl($labPagina,($pag-1))."\"><i class=\"fa fa-step-backward\"></i>&nbsp;</a></li>";

					}else{
						//$valor .= "<font color=#CCCCCC>&laquo; anterior</font>";
					}
					for ($i_pag=1;$i_pag<$paginas;$i_pag++){
							if ($pag == ($i_pag-1)) {
								$valor .= "<li class=\"active\"><span>$i_pag</span></li>";
							} else {
								$i_pag2 = $i_pag-1;
								$valor .= "<li><a href=\"".lib_trataAddUrl($labPagina,$i_pag-1)."\" ><b> $i_pag</b> </a></li>";
							}
					}
					if (($pag+2) < $paginas) {
						//$valor .= "<li><a href=\"".$lin."&pag=".($pag+1)."\" >&nbsp;<i class=\"fa fa-step-forward\"></i></a></li>";
						$valor .= "<li><a href=\"".lib_trataAddUrl($labPagina,($pag+1))."\" >&nbsp;<i class=\"fa fa-step-forward\"></i></a></li>";
					} else {
						//$valor .= "<font color=#CCCCCC>próximo &raquo;</font>";
					}
					$valor .= "</ul>";
				}elseif($opc == 2){
					$valor .= '<div class="btn-group">';
					if($pag > 0){
						//$valor .= "<a href=\"".$lin."&pag=".($pag-1)."\" class='btn btn-default btn-sm hidden-print'><i class=\"fa fa-step-backward\"></i>&nbsp;</a>";
						$valor .= "<a href=\"".lib_trataAddUrl($labPagina,($pag-1))."\" class='btn btn-default btn-sm hidden-print'><i class=\"fa fa-step-backward\"></i>&nbsp;</a>";

					}else{
						//$valor .= "<font color=#CCCCCC>&laquo; anterior</font>";
					}
					$valor .= "<select class=\"sele-pagination  btn btn-default btn-sm\">";
					for ($i_pag=1;$i_pag<$paginas;$i_pag++){
							if ($pag == ($i_pag-1)) {
								$valor .= "<option value=\"".$i_pag."\" selected=\"selected\"><span>$i_pag</span></option>";
							} else {
								$i_pag2 = $i_pag-1;
								$valor .= "<option data-url=\"".lib_trataAddUrl($labPagina,$i_pag2)."\"  value=\"".$i_pag2."\">$i_pag</option>";
							}
					}
					$valor .= "</select>";
					if (($pag+2) < $paginas) {
						$valor .= "<a href=\"".lib_trataAddUrl($labPagina,($pag+1))."\" class='btn btn-default btn-sm hidden-print'>&nbsp;<i class=\"fa fa-step-forward\"></i></a>";
					} else {
						//$valor .= "<font color=#CCCCCC>próximo &raquo;</font>";
					}
					$valor .= '
					<script>
						jQuery(function(){
							jQuery(\'.sele-pagination\').on(\'change\',function(){
								var url = jQuery(this).find(\'option:selected\').attr(\'data-url\');
								window.location = url;
							});
						});
					</script>';
					$valor .= '</div>';
				}
				return $valor;
	}

	public function painelFilterOrcTrue($config=false){
		$ret = false;
		if($config){
			if(isset($config['get']['filter'])){
					$config['filter'] = $config['get']['filter'];
					$ret .= '<div class="col-md-12 hidden-print" style="background:#F2F2F2;border:1px solid #eeeeee;  padding:8px">';
					if($config['filter']['dataI'] && $config['filter']['dataF']){
						$ret .= '<h3>De '.$config['filter']['dataI'].' Até '.$config['filter']['dataF'].'</h3>';
					}
					$ret .= '<span class="paineis-status-2">';
					if($config['filter']['Categoria_servico'] && is_array($config['filter']['Categoria_servico'])){
						$ret .= '<strong>'.__translate('Categorias',true).':</strong> ';
						foreach($config['filter']['Categoria_servico'] As $kei=>$val){
							$ret .= '<span class="badge badge-primary" style="padding:4px;background:#0076be">'.buscaValorDb($GLOBALS['tab10'],'id',$val,'nome').'</span>';
						}
					}
					if($config['filter']['Status'] && is_array($config['filter']['Status'])){
						$ret .= ' <strong>'.__translate('Status',true).':</strong> ';
						foreach($config['filter']['Status'] As $kei=>$val){
							$ret .= '<span class="badge badge-primary" style="padding:4px;background:#3b9ff3">'.buscaValorDb($GLOBALS['tab27'],'id',$val,'Nome').'</span>';
						}
					}
					$ret .= '</span>';
					$ret .= '<div class="pull-right">';
					$urlc = false;
					if($config['ter']){
						$urlc = '&ter='.base64_encode($config['ter']);
					}
					$ret .= '<a href="'.RAIZ.'/'.Url::getURL(0).'?sec='.base64_encode($config['sec']).$urlc.'" class="btn btn-default">'.__translate('Limpar filtros',true).'</a>';
					$ret .= '</div>';
					$ret .= '<script>
									jQuery(function(){
										jQuery(\'#paineis-status-2\').html(jQuery(\'.paineis-status-2\').html());
									});
								</script>
					';
					$ret .= '</div>';
			}
		}
		return $ret;
	}
	function salvarOrdemAtivdade($config=false){

		$ret = false;
		if(isset($config['conteudo']) && is_array($config['conteudo'])){
			$idMod = explode('_',$config['conteudo'][0]);
			$relacionado['dadosBase']['local']						= 'Conteúdo';
			$relacionado['dadosBase']['tab']			 				= $GLOBALS['tab38'];
			$modulo['token'] 												= buscaValorDb($GLOBALS['tab38'],'id',$idMod[0],'token');
			$modulo['conteudo'] 											= buscaValorDb($GLOBALS['tab38'],'id',$idMod[0],'conteudo');
			$relacionado['dadosBase']['tab_item'] 				= $GLOBALS['tab39'];
			$relacionado['dadosBase']['campo_bus_item']		= 'id';
			$relacionado['dadosBase']['campo_enc_item']		= 'nome';
			$relacionado['dadosBase']['grava_relacionado'] 	= 'conteudo';
			$relacionado['dadosBase']['label_legend']			= 'Gerenciar Conteúdo do módulo';
			$relacionado['dadosBase']['label_bt1']					= 'Adicionar um conteúdo existente';
			$relacionado['dadosBase']['label_bt2']					= 'Cadastrar '.$relacionado['dadosBase']['local'];
			$relacionado['dadosBase']['url_alt_item'] 			= 'ead/iframe?sec=Y29udGV1ZG8tZWFk&acao=alt&listPos=conteAula&token_modulo='.$modulo['token'];
			$relacionado['dadosBase']['cad_item'] 				= 'iframe?sec=Y29udGV1ZG8tZWFk&acao=cad&listPos=false';
			$relacionado['dadosBase']['pasta'] 						= 'ead';
			$relacionado['dadosBase']['token'] 						= $modulo['token'];
			$relacionado['dadosBase']['grava_formato']		= 'json';
			$relacionado['dadosBase']['conteudo'] 				= $modulo['conteudo'];
			foreach($config['conteudo'] As $k=>$v){
				$cont = explode('_',$v);
				$relacionado['dados'][$k]['id']					 				= $cont[1];
			}
			$ret = salvar_sortableListRela($relacionado['dadosBase'],$relacionado['dados'],0);
			//$ret = json_encode($salvar);


		}

		return $ret;
	}
	public function recuperaMaterialApoio($confi=false){
		$ret = false;
		//if($confi['tabrec']){
			$dadosRec = dados_tab($GLOBALS['tab39'],'*',"WHERE (tipo = 'Video' OR tipo = 'Prova') AND ".compleDelete());
			if($dadosRec){
				foreach($dadosRec As $ke=>$vl){
					$path = dirname(dirname(dirname(dirname(__FILE__)))).'/enviaImg/uploads/ead/'.$vl['token'].'';
					$url = Qlib::qoption('dominio_site').'/enviaImg/uploads/ead/'.$vl['token'].'/';
					$diretorio = @dir($path);
					if($diretorio){
						//print_r($diretorio);
							$ret[$vl['token']]['titel'] = "Lista de Arquivos do diretório '<strong>".$url."</strong>':<br />";
							$i = 1;
							while($arquivo = $diretorio -> read()){
								if($arquivo && $arquivo!='..' && $arquivo!='.'){
									$salv['endereco'] = $url.$arquivo;
										$salv['id_produto'] = $vl['token'];
										$salv['data'] = $vl['data'];
										$salv['nome']= $arquivo;
										$salv['ordem']= $i;
										$salv['title']= $vl['nome_exibicao'].' '.$i;
									$ret[$vl['token']][$arquivo]['link'] = "<a href='".$salv['endereco']."'>".$arquivo."</a><br />";
									$where = "WHERE nome='".$salv['nome']."'";
									$checar = totalReg('imagem_arquivo',$where);
									if(!$checar){
										$inicSql = "INSERT INTO imagem_arquivo SET ";
										$pos = false;
									}else{
										$inicSql = "UPDATE IGNORE imagem_arquivo SET ";
										$pos = $where;
									}
										$url1 = false;
										foreach($salv As$k=>$v){
											$url1 .= "$k='$v',";

										}
										$url1 .= "hora=''";
										$inicSql .= $url1;
										$ret[$vl['token']][$arquivo]['sql'] = $inicSql.'<br>';
										$ret[$vl['token']][$arquivo]['exec'] = salvarAlterar($inicSql);
								}
								$i++;
							}
							$diretorio -> close();
					}
					//if (file_exists($filename)) {
						//$dadosSalv = "INSERT INTO imagem_arquivo SET id_produto='".$vl['token']."'";
					//}
				}
			}
		//}
		return $ret;
	}
	/*public function regitroVideoVimeo($confi=false){
		$ret['exec'] = false;
		if($confi['config']){
			$config = $confi['config'];
			$compleSql = " WHERE id_cliente = '".$config['id_cliente']."'  AND  id_matricula = '".$config['id_matricula']."'  AND id_atividade = '".$config['id_atividade']."' ";
			$sql = "SELECt * FROM ".$GLOBALS['tab47']." $compleSql";
			$dados = buscaValoresDb($sql);
			if($dados && isset($confi['data'])){
				$compleUpd = false;
				if($confi['data']['percent']==1){
					$compleUpd = ",concluido='s',progresso='100'";
				}
				$sqlsalv = "UPDATE ".$GLOBALS['tab47']." SET `config`='".json_encode($confi['data'])."',`ultimo_acesso`='".$GLOBALS['dtBanco']."' $compleUpd $compleSql";
				$ret['exec'] = salvarAlterar($sqlsalv);
			}
			$ret['dados'] = $dados;
			$ret['sql'] = $sql;
			$ret['config'] = $confi;

		}
		return $ret;
	}	*/
	/**
	 * Metodo para retornar o total de atividade do cronograma de aulas ao vivo
	 * @param $id_curso = id do curso
	 * @param $id_turma = id da turma
	 */
	public function total_atividade_cronograma($id_curso,$id_turma=null){
		$total_atv_cronograma = 0;
		if($id_turma){
			$sqlTurma = " AND config LIKE '%\"turma\":\"$id_turma\"%'";
		}else{
			$sqlTurma = "";
		}
		// $atv_cronograma = dados_tab($GLOBALS['tab39'],'duracao,unidade_duracao,id,tipo',"WHERE id_curso='$id_curso' $sqlTurma AND ".compleDelete());
		$condicao = "WHERE id_curso='$id_curso' $sqlTurma AND ".compleDelete();
		$atv_cronograma = totalReg($GLOBALS['tab39'],$condicao); //
		if($atv_cronograma != 0){
			$total_atv_cronograma = (int)$atv_cronograma;
		}
		return $total_atv_cronograma;
	}
}
