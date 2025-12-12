<?
namespace App\Helpers;
class TemaEAD {
	public $urPrincipal;
	public $pastaTema;
	public $eadAdmin;
	public function __construct(){
		$this->carga();
	}
	public function carga(){
		$this->pastaTema		= queta_option('tema_front')?queta_option('tema_front'):'ead';
		$url_atual = "http" . (isset($_SERVER['HTTPS']) ? (($_SERVER['HTTPS']=="on") ? "s" : "") : "") . "://" . "$_SERVER[HTTP_HOST]";
		$dom = explode('.', $_SERVER['HTTP_HOST']);
		if(is_subdominio()){
			$this->urPrincipal 		= queta_option('dominio_site').SEPARADOR.is_subdominio().SEPARADOR.$this->pastaTema.'/';
		}else{
			$_SESSION['pasta_dom'] = isset($_SESSION['pasta_dom'])?$_SESSION['pasta_dom']:false;
			$this->urPrincipal 		= $url_atual.SEPARADOR.$_SESSION['pasta_dom'].SEPARADOR.$this->pastaTema.'/';
		}
		$this->eadAdmin		= new EAD;
	}
	public function metaPageEAD(){
			global $tab18,$tab60,$tab76,$tab77,$tab89,$tab91,$suf_in;
			$urlSite1 = false;$urlimg = false;
			$_SESSION['permissao_cliente'.$suf_in] = isset($_SESSION['permissao_cliente'.$suf_in]) ? $_SESSION['permissao_cliente'.$suf_in] : 1;
			$_SESSION['permissao_cliente'.$suf_in] = !empty($_SESSION['permissao_cliente'.$suf_in]) ? $_SESSION['permissao_cliente'.$suf_in] : 1;
			$complePg = "AND ativo = 's' AND grupos LIKE '%\"".$_SESSION['permissao_cliente'.$suf_in]."\"%'";
			$urlamigo = Url::getURL(nivel_url_site()) ? Url::getURL(nivel_url_site()) : 'home';
			$sqlDadosPg = "SELECT * FROM $tab76 WHERE url='".$urlamigo."' $complePg ";
			$_REQUEST['url_banner'] = false;
			//$_REQUEST['tipo'] = 1;
			$tip = buscaValorDb($GLOBALS['tab76'],'url',$urlamigo,'tipo');
			$tipo_pagina = $tip ? $tip : 8;
			$_REQUEST['tipo'] = $tipo_pagina;
			$_REQUEST['url_imagem_capa']=false;
			$_REQUEST['url_imagem_back']=false;
			$afiliados = new Afiliados;
			if(Url::getURL(nivel_url_site()) == NULL){
				if(is_clientLogado()){
					//$urlamigo = buscaValorDb($tab76,'tipo',8,'url');
					$urlamigo = NULL;
				}else{
					$urlamigo = NULL;
				}
				//$_REQUEST['tipo'] = getTipoPaina_inicial();
				//$_REQUEST['tipo'] = 8;
			}else{
					if($tipo_pagina == 8){
						if(Url::getURL(nivel_url_site()) == 'account'){
							$sqlDadosPg = "SELECT * FROM $tab76 WHERE url='".Url::getURL(nivel_url_site()+1)."' $complePg ";
						}elseif(Url::getURL(nivel_url_site()) == 'obrigado-pela-compra'){
							$sqlDadosPg = "SELECT * FROM $tab76 WHERE url='".Url::getURL(nivel_url_site())."' $complePg ";
						}elseif(Url::getURL(nivel_url_site()) == 'area-do-aluno'){
							$sqlDadosPg = "SELECT * FROM $tab76 WHERE url='".Url::getURL(nivel_url_site())."' $complePg ";
						}elseif(Url::getURL(nivel_url_site()) == 'comprar'){
							$sqlDadosPg = "SELECT * FROM $tab76 WHERE url='".Url::getURL(nivel_url_site())."' $complePg ";
						}elseif(Url::getURL(nivel_url_site()) == 'consulta'){
							$sqlDadosPg = "SELECT * FROM $tab76 WHERE url='".Url::getURL(nivel_url_site())."' $complePg ";
						}elseif(Url::getURL(nivel_url_site()) == 'atendimento'){
							$sqlDadosPg = "SELECT * FROM $tab76 WHERE url='".Url::getURL(nivel_url_site())."' $complePg ";
						}elseif(Url::getURL(nivel_url_site()) == 'cursos'){
							$complePg = " AND `ativo`='s' AND ".compleDelete();
							$tab = $GLOBALS['tab10'];
							$tokenPg = buscaValorDb($GLOBALS['tab76'],'url',Url::getURL(nivel_url_site()),'token');
							if($tokenPg){
								$urlBkgArr = urlImagem2('ead',"id_produto = '".$tokenPg."' ",'endereco');
								$_REQUEST['url_imagem_capa'] = isset($urlBkgArr[0])?$urlBkgArr[0]:false;
								$_REQUEST['url_imagem_back'] = isset($urlBkgArr[1])?$urlBkgArr[1]:false;
							}
							if(Url::getURL(nivel_url_site()+2) != NULL){
								$sqlDadosPg = "SELECT * FROM $tab WHERE url='".Url::getURL(nivel_url_site()+2)."' $complePg ";
								// if(isAdmin(1)){
								// 	dd($sqlDadosPg);
								// }

							}
							//if(Url::getURL(nivel_url_site()+1) != NULL)
								//$sqlDadosPg = "SELECT * FROM $tab WHERE url='".Url::getURL(nivel_url_site()+1)."' $complePg ";
						}elseif(Url::getURL(nivel_url_site()) == 'preview' && Url::getURL(nivel_url_site()+1) !=NULL && Url::getURL(nivel_url_site()+2) !=NULL){
							if(Url::getURL(nivel_url_site()+1) == 'modulo'){
								$tab = $GLOBALS['tab38'];
								$complePg = false;
							}
							if(Url::getURL(nivel_url_site()+1) == 'ativiidade'){
								$tab = $GLOBALS['tab39'];
								$complePg = false;
							}
							$sqlDadosPg = "SELECT * FROM $tab WHERE id ='".base64_decode(Url::getURL(nivel_url_site()+2))."' $complePg ";
						}elseif(Url::getURL(nivel_url_site()+1) == 'orcamentos'){
							$tab = $GLOBALS['tab11'];
							$token = base64_decode(Url::getURL(nivel_url_site()+2));
							$sqlDadosPg = "SELECT * FROM $tab WHERE token='".$token."'";
						}elseif(Url::getURL(nivel_url_site()+1) == 'teste' || Url::getURL(nivel_url_site()+1) == 'webhook' || Url::getURL(nivel_url_site()) == 'iframe'){
							//$tab = $GLOBALS['tab11'];
							//$token = base64_decode(Url::getURL(nivel_url_site()+2));
							//$sqlDadosPg = "SELECT * FROM $tab WHERE token='".$token."'";
						}else{
							//return formatMensagem('Erro 404 página não encontrada','danger',11111); reidect404
							echo 'redirect404';
						}
					}elseif($tipo_pagina == 2 || $tipo_pagina == 17){
						if(Url::getURL(nivel_url_site()+1)==NULL){
							$sqlDadosPg = "SELECT * FROM $tab76 WHERE url='".Url::getURL(nivel_url_site())."' $complePg ";
						}else{
							$sqlDadosPg = "SELECT * FROM $tab76 WHERE url='".Url::getURL(nivel_url_site()+1)."' $complePg ";
						}
					}else{
						//conteudo publico
						$complePg = "AND ativo = 's'";
						$sqlDadosPg = "SELECT * FROM $tab91 WHERE url='".Url::getURL(2)."' $complePg ";
					}
				//$_REQUEST['tipo'] = $tipo_pagina;
			}
			$dadosMeta = buscaValoresDb($sqlDadosPg);
			if($dadosMeta){
				$urlBanner = false;
				$description=false;
				if(isset($dadosMeta[0]['meta_descricao'])){

				}
				if(Url::getURL(nivel_url_site()+1) == 'orcamentos'){
					$dadosMeta[0]['nome'] = buscaValorDb($GLOBALS['tab10'],'id',$dadosMeta[0]['curso'],'nome');
					$dadosMeta[0]['description'] = '';
					$dadosMeta[0]['descricao_site'] = buscaValorDb($GLOBALS['tab10'],'id',$dadosMeta[0]['curso'],'descricao_site');
				}
				if(isset($dadosMeta[0]['meta_titulo']))
					$title = !empty($dadosMeta[0]['meta_titulo']) ? $dadosMeta[0]['meta_titulo'] : $dadosMeta[0]['nome'];
				else
					$title = !empty($dadosMeta[0]['title']) ? $dadosMeta[0]['title'] : $dadosMeta[0]['nome'];
				if(isset($dadosMeta[0]['meta_titulo']) && !empty($dadosMeta[0]['meta_titulo']))
					$description = $dadosMeta[0]['meta_descricao'];
				elseif(isset($dadosMeta[0]['description']))
					$description = $dadosMeta[0]['description'];

				foreach($dadosMeta[0] As $key=>$valor){
					if($key=='tipo'){
						$_REQUEST[$key] = isset($_REQUEST[$key])?$_REQUEST[$key]:$valor;
					}else{
						$_REQUEST[$key] = $valor;
					}
				}
				if($_REQUEST['tipo'] == 1){
					//É tipo de pagina principal
					$urlBanner = dadosImagemModGal('arquivo',"id_produto = '".$_REQUEST['token']."'");
					$_REQUEST['url_banner'] = $urlBanner;
				}elseif($_REQUEST['tipo'] == 8){
					//É loja

					if(isset($_GET['p'])){

					}else{
							$title = !empty($_REQUEST['meta_titulo']) ? $_REQUEST['meta_titulo'] : $_REQUEST['nome'];
							$description = $_REQUEST['meta_descricao'];
							//$_REQUEST['produto'] = $dadosProduto;
							$urlBanner = dadosImagemModGal('arquivo',"id_produto = '".$_REQUEST['token']."'");
							$_REQUEST['url_banner'] = $urlBanner;
							$urlSite1 = urlAtual();
							//$urlIma = urlImagem2('curso_site',"id_produto = '".$_REQUEST['token']."' ",'endereco');
							//$urlimg = @$urlIma[0];
							$_REQUEST['url_banner_pg'] = @$urlBanner[0];
							$_REQUEST['url_imagem_capa'] = @$urlBanner[0];
							$_REQUEST['url_imagem_back'] = @$urlBanner[1];
					}
				}else{
					$urlBanner = dadosImagemModGal('arquivo',"id_produto = '".$_REQUEST['token']."'");
					$_REQUEST['url_banner'] = $urlBanner;
				}
			}else{
				$dadoEmpesa = buscaValoresDb_SERVER("SELECT * FROM contas_usuarios WHERE token='".$_SESSION[SUF_SYS]['token_conta'.SUF_SYS]."'");
				if($dadoEmpesa){
					$title = $dadoEmpesa[0]['nome']. ' | '.queta_option('slogan');
					$description = queta_option('description');
				}else{
					$title = false;$description=false;
				}
			}
			$_REQUEST['title'] = $title;
			$_REQUEST['editar_pagina'] = false;
			if(isset($_REQUEST['id']) && !empty($_REQUEST['id']) && isset($dadosMeta)){
				$_REQUEST['editar_pagina'] = $this->painel_edit_paginasSite($_REQUEST['id']);
			}
			$favi = "<link rel=\"shortcut icon\" href=\"" .short_code('favicon',false,false) ."\" type=\"image/png\" />";
			$favi .= '<link href="'.short_code('favicon',false,false).'" rel="icon">';
			$exibe = '<meta charset="'.queta_option('charset').'"/>';
			$exibe .= '<meta name="title" content ="'.$title.'"><title>'.$title.'</title>';
			$exibe .= '<meta name="viewport" content="width=device-width, initial-scale=1" />';
			//$exibe .= '<meta name="robots" content=\'noindex,follow\' />';
			//$exibe .= '<meta http-equiv="X-UA-Compatible" content="IE=edge"/>';
			$exibe .= '<meta name="description" content="'.$description.'"/>';
			$exibe .= '<meta property="og:locale" content="'.queta_option('lang').'" />';
			$exibe .= '<meta property="og:url"           content="'.$urlSite1.'" />';
			$exibe .= '<meta property="og:type"          content="website" />';
			$exibe .= '<meta property="og:title"         content="'.$title.'" />';
			$exibe .= '<meta property="og:description"   content="'.$description.'" />';
			$exibe .= '<meta property="og:image"         content="'.$urlimg.'" />';
			$exibe .= '<meta property="og:site_name" content="EAD" />';
			$exibe .= '<meta name="twitter:card" content="summary_large_image" />';
			$exibe .= '<meta name="twitter:description" content="'.$description.'" />';
			$exibe .= '<meta name="twitter:title" content="'.$title.'" />';
			$exibe .= '<meta name="twitter:image" content="'.$urlimg.'" />';
			$telefoneZap = buscaValorDb_SERVER('contas_usuarios','token',$_SESSION[SUF_SYS]['token_conta'.SUF_SYS],'celular');
			if(!$telefoneZap){
				$telefoneZap = buscaValorDb_SERVER('contas_usuarios','token',$_SESSION[SUF_SYS]['token_conta'.SUF_SYS],'telefone');
			}
			$_REQUEST['telefoneZap'] = $telefoneZap;
			$exibe .= $favi;
			if(isset($_GET['pg']) && $_GET['pg'] == 'orc'){
			$exibe .= '
					<style>
						body{
							background-color: transparent !important;
						}
					</style>
				';

			}else{
			/*$exibe .= '
					<style>
						body{
							background-image: url("'.$_REQUEST['urlBkg'].'");
							background-color: transparent !important;
						}
					</style>
				';*/
				//$exibe .= '<link rel="stylesheet" type="text/css" href="'.queta_option('dominio_site').'/site/tema/'.queta_option('tema_front').'/css/style.css">';
			}
			$exibe .= $this->carregaCssListaMod();
			$exibe .= '<link rel="stylesheet" type="text/css" href="'.RAIZ.'/css/datepicker.css">';
			//$exibe .= '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.1.0/css/v4-shims.min.css" integrity="sha512-p++g4gkFY8DBqLItjIfuKJPFvTPqcg2FzOns2BNaltwoCOrXMqRIOqgWqWEvuqsj/3aVdgoEo2Y7X6SomTfUPA==" crossorigin="anonymous" referrerpolicy="no-referrer" />';
			$exibe .= '<link rel="stylesheet" type="text/css" href="'.RAIZ.'/app/ead/css/style.css">';
			/*if(is_active_modulo('cursos')&& queta_option('tema_front') != 'napa'){
				$exibe .= '<link rel="stylesheet" type="text/css" href="'.RAIZ.'/app/cursos/css/style.css">';
			}*/
			if(is_active_modulo('translate')){
				$exibe .= '<link rel="stylesheet" type="text/css" href="'.RAIZ.'/app/translate/css/boostrap-select-min.css">';
				$exibe .= '<link rel="stylesheet" type="text/css" href="'.RAIZ.'/app/translate/css/flag-icon.min.css">';
			}
			ob_start();
			if(Url::getURL(0)=='account' || Url::getURL(3)=='comprar' || Url::getURL(0)=='atendimento' || Url::getURL(0)=='area-do-aluno'){
				?>
				<script src='https://www.google.com/recaptcha/api.js'></script>
				<?
			}

			$exibe .= ob_get_clean();
			$cft  	= $this->configuraTema($_REQUEST);
			$exibe  .= $cft['style'];
			if(is_adminstrator(3)){
				$conteudo = $cft['html'];
				$exibe  .= $this->modalLeft('Editar cores do tema',$bt_fechar=false,$conteudo,$id='modalEditTema');
				//$exibe  .= $this->modalBootstrap('Editar cores',$bt_fechar=false,$conteudo,$id='modalEditTema');
			}
			//carega link de afiliados;
			$exibe .= $afiliados->captura($_REQUEST);
			if(queta_option('id_analytics')){
				$exibe .= "
					<!-- Global site tag (gtag.js) - Google Analytics -->
					<script async src=\"https://www.googletagmanager.com/gtag/js?id=".queta_option('id_analytics')."\"></script>
					<script>
					  window.dataLayer = window.dataLayer || [];
					  function gtag(){dataLayer.push(arguments);}
					  gtag('js', new Date());

					  gtag('config', '".queta_option('id_analytics')."');
					</script>
					";
			}
			return $exibe;
	}
	public function configuraTema($config=false){
		$ret['style'] = false;
		$ret['html'] = false;
		$area = 'style_header';
		$arr_cop = array(
						array('qop_name'=>'style_header','label'=>'Menus'),
						array('qop_name'=>'style_body','label'=>'Corpo do site'),
						array('qop_name'=>'style_btn_primary','label'=>'Botões primários'),
						array('qop_name'=>'style_btn_secondary','label'=>'Botões Secundários'),
						array('qop_name'=>'style_footer1','label'=>'Rodapé 1'),
						array('qop_name'=>'style_footer2','label'=>'Rodapé 2')
						);
		$ret['style'] .= '<style>';
		$tema0 = '<form id="envia-config">{cont}</form>';
		$tema1 = '<div class="card mb-3"><div class="card-header">{titulo}</div><div class="card-body">{conteudo}</div></div>';
		$tema2 = '<div class="col-md-12" {style}><label>{label}</label><br><input inp-config-site type="{type}" name="{name}" value="{value}" class="form-control {jscolor}" /></div>';
		foreach($arr_cop As $k0=>$v0){
			$jsonArea = queta_option($v0['qop_name']);
			if($jsonArea && !is_array($jsonArea)){
				$arrArea = json_decode($jsonArea,true);
				if(is_array($arrArea)){
					$ret['html0'] = false;
					foreach($arrArea As $k1=>$v1){
						if(is_array($v1)){
							$ret['style'] .= $k1.'{';
							foreach($v1 As $k2=>$v2){
									if($k2=='label'){
										$label = $v2;
										$ret['style'] .= $k2.':#'.$v2.'!important;';
										$name = $v0['qop_name'].'['.$k1.']['.$k2.']';
										$value = $v2;
										$ret['html0'] .= str_replace('{name}',$name,$tema2);
										$ret['html0'] = str_replace('{value}',$value,$ret['html0']);
										$ret['html0'] = str_replace('{type}','hidden',$ret['html0']);
										$ret['html0'] = str_replace('{label}',$label,$ret['html0']);
										$ret['html0'] = str_replace('{style}','style="display:none"',$ret['html0']);
										$ret['html0'] = str_replace('{jscolor}',false,$ret['html0']);
									}else{
										$ret['style'] .= $k2.':#'.$v2.'!important;';
										$name = $v0['qop_name'].'['.$k1.']['.$k2.']';
										$value = $v2;
										$label = str_replace('background-color','Fundo',$k2);
										$label = str_replace('background','Fundo',$label);
										$label = str_replace('border-color','Bordas',$label);
										$label = str_replace('color','Texto',$label);
										$ret['html0'] .= str_replace('{name}',$name,$tema2);
										$ret['html0'] = str_replace('{value}',$value,$ret['html0']);
										$ret['html0'] = str_replace('{type}','text',$ret['html0']);
										$ret['html0'] = str_replace('{label}',$label,$ret['html0']);
										$ret['html0'] = str_replace('{style}',false,$ret['html0']);
										$ret['html0'] = str_replace('{jscolor}','jscolor',$ret['html0']);
									}
							}
							$ret['style'] .= '}';
						}
						/*else{
							$ret['style'] .= $k1.':#'.$v1.'!important;';
						}*/
					}
					$titulo = $v0['label'];
					$ret['html'] .= str_replace('{conteudo}',$ret['html0'],$tema1);
					$ret['html'] = str_replace('{titulo}',$titulo,$ret['html']);
				}
			}
		}
		$ret['style'] .= '</style>';
		$ret['html'] = str_replace('{cont}',$ret['html'],$tema0);

		return $ret;
	}
	public function configTema($config=false){
		$ret['exec'] = false;
		if(is_array($config)){
			foreach($config As $k0=>$v0){
				$option_value = json_encode($v0,JSON_UNESCAPED_UNICODE);
				$sql = "UPDATE ".$GLOBALS['tab0']." SET option_value='".$option_value."' WHERE option_name='".$k0."'";
				$salvar = salvarAlterar($sql);
				if($salvar){
					$ret['exec'] = true;
				}
				//$ret[$k0]['sql'] = $sql;
			}
		}
		return $ret;
	}
	public function intro($config=false){
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/home.html'));
		$tema 	= $temaHTML[0];
		$ret = str_replace('{url_principal}',$this->urPrincipal,$tema);
		return $ret;
	}
	public function intro2($config=false){
		$tema = '

			<!--==========================
				Intro Section
			============================-->
			<section id="intro" class="clearfix">
					<div class="container">

					<div class="intro-img">
						<img src="{url_principal}img/intro-img.svg" alt="" class="img-fluid">
					</div>

					<div class="intro-info">
						<!--<h2></h2>-->
					</div>

					</div>
			</section>

			<!-- #intro -->
		';
		$ret = str_replace('{url_principal}',$this->urPrincipal,$tema);
		return $ret;
	}
	public function accountRegister($config=false){
		$ret = false;
		if(!is_clientLogado()){
			$arquivo = $this->pastaTema().'/register.html';
			$tema 	= carregaArquivo($arquivo);
			$link_login = queta_option('dominio_site').'/account/login';
			$form_login = $this->frm_login($config);
			$form_create_account = $this->frm_create_account($config);
		}else{
			$link_login = queta_option('dominio_site').'/account/login';
			$form_login = false;
			$form_create_account = false;
			redirect(queta_option('dominio_site'),0);
		}
		$ret = str_replace('{form_login}',$form_login,$tema);
		$ret = str_replace('{link_login}',$link_login,$ret);
		$ret = str_replace('{form_create_account}',$form_create_account,$ret);
		$ret = str_replace('{url_imagem_capa}',@$_REQUEST['url_imagem_capa']['url'],$ret);
		$ret = str_replace('{url_imagem_back}',@$_REQUEST['url_imagem_back']['url'],$ret);
		return $ret;
	}
	public function accountLogin($config=false){
		$ret = false;
		if(!is_clientLogado()){
			$arquivo = $this->pastaTema().'/login.html';
			$tema 	= carregaArquivo($arquivo);
			$link_login = queta_option('dominio_site').'/account/login';
			$link_register = queta_option('dominio_site').'/account/register';
			$link_esqueci_senha = '<a href="'.queta_option('dominio_site').'/account/forgot">Esqueci minha senha</a>';
			$ret = str_replace('{form_login}',$this->frm_login($config),$tema);
			$ret = str_replace('{link_login}',$link_login,$ret);
			$ret = str_replace('{link_register}',$link_register,$ret);
			$ret = str_replace('{form_create_account}',$this->frm_create_account($config),$ret);
			$ret = str_replace('{link_esqueci_senha}',$link_esqueci_senha,$ret);
			$ret = str_replace('{url_imagem_capa}',@$_REQUEST['url_imagem_capa']['url'],$ret);
			$ret = str_replace('{url_imagem_back}',@$_REQUEST['url_imagem_back']['url'],$ret);
		}else{
			redirect(queta_option('dominio_site'),0);
		}
		return $ret;
	}
	public function accountForgot($config=false){
		$ret = false;
		$link_esqueci_senha = false;
		if(!is_clientLogado()){
			$arquivo = $this->pastaTema().'/forgot-password.html';
			$tema 	= carregaArquivo($arquivo);
			$link_login = queta_option('dominio_site').'/account/login';
			$link_register = queta_option('dominio_site').'/account/register';
			$ret = str_replace('{form_login}',$this->frm_login($config),$tema);
			$ret = str_replace('{link_login}',$link_login,$ret);
			$ret = str_replace('{link_esqueci_senha}',$link_esqueci_senha,$ret);
			$ret = str_replace('{link_register}',$link_register,$ret);
			$ret = str_replace('{form_recupera_senha}',$this->frm_recupera_senha($config),$ret);
			$ret = str_replace('{url_imagem_capa}',$_REQUEST['url_imagem_capa']['url'],$ret);
			$ret = str_replace('{url_imagem_back}',$_REQUEST['url_imagem_back']['url'],$ret);
		}else{
			redirect(queta_option('dominio_site'),0);
		}
		return $ret;
	}
	public function abrirPagina($config=false){
		$ret = false;
		if(isset($config['arquivo'])){
			if($config['arquivo']=='pgs_restrita'){
				if(!is_clientLogado()){
					$arquivo = $this->pastaTema().'/forgot-password.html';
					$tema 	= carregaArquivo($arquivo);
					$link_login = queta_option('dominio_site').'/account/login';
					$link_register = queta_option('dominio_site').'/account/register';
					$ret = str_replace('{form_login}',$this->frm_login($config),$tema);
					$ret = str_replace('{link_login}',$link_login,$ret);
					$ret = str_replace('{link_register}',$link_register,$ret);
					$ret = str_replace('{form_recupera_senha}',$this->frm_recupera_senha($config),$ret);
				}else{
					redirect(queta_option('dominio_site'),0);
				}
			}else{
					$arquivo = $this->pastaTema().'/'.$config['arquivo'].'.html';
					$tema 	= carregaArquivo($arquivo);
					$link_login = queta_option('dominio_site').'/account/login';
					$link_register = queta_option('dominio_site').'/account/register';

					$ret = str_replace('{form_login}',$this->frm_login($config),$tema);
					$ret = str_replace('{link_login}',$link_login,$ret);
					$ret = str_replace('{link_register}',$link_register,$ret);
					$ret = str_replace('{form_recupera_senha}',$this->frm_recupera_senha($config),$ret);
			}
		}
		return $ret;
	}
	public function accountPass($config=false){
		$ret = false;
		$arquivo = $this->pastaTema().'/login.html';
		$tema 	= carregaArquivo($arquivo);
		$link_login = queta_option('dominio_site').'/account/login';
		$link_register = queta_option('dominio_site').'/account/register';
		$ret = str_replace('{form_login}',$this->frm_senha($config),$tema);
		$ret = str_replace('{link_login}',$link_login,$ret);
		$ret = str_replace('{link_register}',$link_register,$ret);
		$ret = str_replace('{form_create_account}',$this->frm_create_account($config),$ret);
		$ret = str_replace('{url_imagem_capa}',@$_REQUEST['url_imagem_capa']['url'],$ret);
		return $ret;
	}
	public function frm_login($config=false){
		$ret = false;
			$config['acao'] = isset($config['acao'])?$config['acao']:'cad';
			$config['pg'] = isset($config['pg'])?$config['pg']:false;
			$config['display'] = isset($config['display'])?$config['display']:'display:block';
			$ret .= '<div class="card padding-none" style="padding-top:10px;'.$config['display'].'"  id="frm_login">';
			$ret .= '<div class="card-header">';
			$ret .= '<h6>Fazer login</h6>';
			$ret .= '</div>';
			$action = isset($_GET['redirect'])?$_GET['redirect']:UrlAtual();
			$ret .= '<div class="card-body">';
							$ret .= '<form role="form" id="form_logar_user" method="post" action="'.$action.'">';
							$config['campos_form'][0] = array('type'=>'email','col'=>'md','size'=>'12','campos'=>'email-email*-email','value'=>@$_GET['Email'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form'][1] = array('type'=>'password','col'=>'md','size'=>'12','campos'=>'senha-Senha*-Senha','value'=>@$_GET['Senha'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$ret .= formCampos($config['campos_form']);
							$ret .= '<div class="col-sm-12">{link_esqueci_senha}</div>';
							$ret .= csrf();
							//$ret .= queta_formfield4("hidden",'1',"id-", $id_cliente,"","");
							$ret .= queta_formfield4("hidden",'1',"conf-", 's',"","");
							$ret .= queta_formfield4("hidden",'1',"campo_bus-", 'Email',"","");
							$ret .= queta_formfield4("hidden",'1',"ac-", 'alt',"","");
							$ret .= queta_formfield4("hidden",'1',"sec-", 'cad_clientes',"","");
							$ret .= queta_formfield4("hidden",'1',"tab-", base64_encode($GLOBALS['tab15']),"","");
							$ret .= '<div class="col-md-12 mens2"></div>';
							$ret .= '<div class="col-md-12" style="padding:10px 10px ">';
							$data_key_recaptcha = '6Le9x8kUAAAAAMyLNYRB5JrFFjk7U1CukrkGaIdj';
							if(!is_subdominio()){
									$dadosConfigConta = queta_option_conta('config');
									if(!empty($dadosConfigConta)){
										$arr_configCont = json_decode($dadosConfigConta,true);
										if(isset($arr_configCont['chave_recaptcha'])&&!empty($arr_configCont['chave_recaptcha'])){
											$data_key_recaptcha = $arr_configCont['chave_recaptcha'];
										}
									}
							}
							$ret .= '<div class="g-recaptcha mb-1 " data-sitekey="'.$data_key_recaptcha.'" ></div>';
							$a = '<span class="nao_possue_conta"><a {href} class="btn btn-link"><i class="fa fa-user-circle-o"></i> Criar uma conta</a></span>';
							$redirect=false;
							if($config['pg']=='comprar'){
								$a = '<a {href} class="btn btn-link" style="margin-left:4px">Criar uma conta</a>';
								$href = 'href="javaScript:void(0)" que-cadastro="comprar"';
								$ret .= str_replace('{href}',$href,$a);
							}else{
								$redi = isset($_GET['redirect'])?$_GET['redirect']:false;
								//$redirect = '?redirect='.$redi;
								if($redi){
									$href = 'href="'.$_GET['redirect'].'"';
								}else{
									$href = 'href="/account/register"';
								}
								$ret .= str_replace('{href}',$href,$a);
							}
							$ret .= '<button type="submit" class="btn btn-primary" style="margin-left:4px; position:absolute;right:15px"><i class="fa fa-sign-in"></i> Entrar <i class="fa fa-chevron-right"></i></button>';
							//$a = '<span class="nao_possue_conta">Ainda não tenho uma conta <a {href}>Cadastre-se</a></span>';

							$ret .= '</div>';
							$ret .= '</form>';
			$ret .= '</div>';
			$ret .= '</div>';
				ob_start();
			?>
				<script>
					jQuery(document).ready(function () {
						submitFormCliente('#form_logar_user');
						//submitFormCliente2('#form_logar_user');
					});
				</script>
			<?
				$ret .= ob_get_clean();

		return $ret;
	}
	public function frm_recupera_senha($config=false){
		$ret = false;
			$config['acao'] = isset($config['acao'])?$config['acao']:'cad';
			$ret .= '<div class="card padding-none" style="padding-top:10px">';
			$ret .= '<div class="card-header">';
			$ret .= '<h6>Buscar pelo endereço de email</h6>';
			$ret .= '</div>';
			$ret .= '<div class="card-body">';
				$ret .= '<p>Para redefinir sua senha, preencha o seu email abaixo. Se sua conta for encontrada no banco de dados, um email será enviado para seu endereço de email, com as instruções sobre como restabelecer seu acesso.</p>';
							$ret .= '<form role="form" id="form_logar_user" method="post">';
							$config['campos_form'][0] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'email-email*-email','value'=>@$_GET['Email'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$ret .= formCampos($config['campos_form']);
							//$ret .= queta_formfield4("hidden",'1',"id-", $id_cliente,"","");
							$ret .= queta_formfield4("hidden",'1',"conf-", 's',"","");
							$ret .= queta_formfield4("hidden",'1',"campo_bus-", 'Email',"","");
							$ret .= queta_formfield4("hidden",'1',"ac-", 'alt',"","");
							$ret .= queta_formfield4("hidden",'1',"sec-", '',"","");
							$ret .= queta_formfield4("hidden",'1',"tab-", base64_encode($GLOBALS['tab15']),"","");
							$ret .= '<div class="col-md-12 mens2"></div>';
							$ret .= '<div class="col-md-12" style="padding:10px 10px ">';
							$ret .= '<button type="submit" class="btn btn-outline-secondary">Enviar</button>';
							$ret .= '</div>';
							$ret .= '</form>';
			$ret .= '</div>';
			$ret .= '</div>';
				$ret .= '
				<script>
					jQuery(document).ready(function () {
						var icon = \'\';
						';
			$ret .= 'jQuery(\'#form_logar_user\').validate({
								submitHandler: function(form) {
									$.ajax({
										url: \''.RAIZ.'/app/ead/acao.php?ajax=s&opc=recuperaSenha\',
										type: form.method,
										data: jQuery(form).serialize(),
										beforeSend: function(){
											jQuery(\'#preload\').fadeIn();
										},
										async: true,
										dataType: "json",
										success: function(response) {
											jQuery(\'#preload\').fadeOut();
											jQuery(\'.mens2\').html(response.enviaEmail2.txt);
											if(response.enviaEmail2.exec){
												alert(\'Processo de Recuperação de senha iniciado com sucesso \n Agora entre no seu email para dar prosseguimento\');
												window.location = \''.queta_option('dominio_site').'\';
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

		return $ret;
	}
	public function recuperaSenha($config=false){
		$ret = false;
		if($config['email']){
			$sql = "SELECT * FROM ".$GLOBALS['tab15']." WHERE `Email`='".$config['email']."'";
			$dados = buscaValoresDb($sql);
			if($dados){
				// $email = new sendinBlue;//declarado em app/email
					$email = new robo_emils;//declarado em app/email
					$mensagem = queta_option('mensagem_email_nova_conta');
					$link_cria_senha = queta_option('dominio_site').'/account/pass/create/'.base64_encode($dados[0]['Email']);
					$mensagem = str_replace('|nome_cliente|',$dados[0]['Nome'],$mensagem);
					$mensagem = str_replace('|link_cria_senha|',$link_cria_senha,$mensagem);
					$config_em = array(
							'emails'=>array(
											array('email'=>$dados[0]['Email'],'nome'=>$dados[0]['Nome'].' '.$dados[0]['sobrenome']),
										),
							//'Bcc'=>'fernando@maisaqui.com.br',
							'assunto'=>'Recuperação de senha',
							'mensagem'=>$mensagem,
							'empresa'=>'Nome do sistema',
							'post'=>false,
							'resp'=>array(
										'envia'=>true,
										'email'=>queta_option('email_gerente'),
										'nome'=>$dados[0]['Nome'],
										'mensResp'=>'Foi preenchido um pedido de recuperação de senha no sistema EAD '.date('d/m/Y H:m:i'),
										'assunto'=>'Recuperação de senha',
							),
					);
					// $ret['enviaEmail2'] = $email->sendEmail($config_em);
					$ret['enviaEmail2'] = $email->enviaEmail2($config_em);
			}
		}
		return $ret;
	}
	public function frm_senha($config=false){
		$ret = false;
		$config['acao'] = isset($config['acao'])?$config['acao']:'alt';
		if(!empty(Url::getURL(nivel_url_site()+3))){
				$email = base64_decode(Url::getURL(nivel_url_site()+3));
				$config['verificado'] = $config['verificado']? $config['verificado']:'n';
				$id_cliente = buscaValorDb($GLOBALS['tab15'],'email',$email,'id');
				$token		 = buscaValorDb($GLOBALS['tab15'],'email',$email,'token');
				$tema = '<div class="card">
							  <div class="card-header">
								<h5 class="card-title">{title}</h5>
									{small}
							  </div>
							  <div class="card-body">
							  {form_login}
								</div>
						</div>';
				$form_login=false;
				$title = 'Atualize sua senha';
				$small = '<small>Troca de senha do email: <b>'.$email.'</b></small>';
								$form_login .= '<form role="form" id="form_logar_user" method="post">';
								$config['campos_form'][1] = array('type'=>'password','col'=>'md','size'=>'12','campos'=>'senha-Nova Senha*-Digite a nova senha','value'=>@$_GET['Senha'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form'][2] = array('type'=>'password','col'=>'md','size'=>'12','campos'=>'resenha-Repetir a Senha*-Confirme a nova senha','value'=>@$_GET['resenha'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$form_login .= formCampos($config['campos_form']);
								$form_login .= queta_formfield4("hidden",'1',"id-", @$id_cliente,"","");
								$form_login .= queta_formfield4("hidden",'1',"Email-", $email,"","");
								$form_login .= queta_formfield4("hidden",'1',"token-", $token,"","");
								$form_login .= queta_formfield4("hidden",'1',"conf-", 's',"","");
								$form_login .= queta_formfield4("hidden",'1',"campo_bus-", 'Email',"","");
								$form_login .= queta_formfield4("hidden",'1',"ac-", $config['acao'],"","");
								$form_login .= queta_formfield4("hidden",'1',"acao-", $config['acao'],"","");
								$form_login .= queta_formfield4("hidden",'1',"sec-", 'ref_senha',"","");
								$form_login .= csrf();
								if($config['verificado']=='s')
									$form_login .= queta_formfield4("hidden",'1',"verificado-", $config['verificado'],"","");
								$form_login .= queta_formfield4("hidden",'1',"tab-", base64_encode($GLOBALS['tab15']),"","");
								$form_login .= '<div class="col-md-12 mens2"></div>';
								$form_login .= '<div class="col-md-12" style="padding:10px 10px ">';
								$form_login .= '<button type="submit" class="btn btn-outline-secondary">Atualizar</button>';
								$form_login .= '</div>';
								$form_login .= '</form>';
				$ret .= str_replace('{title}',$title,$tema);
				$ret = str_replace('{small}',$small,$ret);
				$ret = str_replace('{form_login}',$form_login,$ret);

					$ret .= '
					<script>
						jQuery(document).ready(function () {
							var icon = \'\';
							';
				$ret .= 'jQuery(\'#form_logar_user\').validate({
									submitHandler: function(form) {
										$.ajax({
											url: \''.RAIZ.'/app/clientes/acao.php?ajax=s&acao='.$config['acao'].'&campo_bus=Email&local=troca_senha_site\',
											type: form.method,
											data: jQuery(form).serialize(),
											beforeSend: function(){
												jQuery(\'#preload\').fadeIn();
											},
											async: true,
											dataType: "json",
											success: function(response) {
												jQuery(\'#preload\').fadeOut();
												jQuery(\'.mens2\').html(response.mensa);
												if(response.exec){
													window.location = \'/account/login\';
													/*
													if(response.list){
														jQuery(\'#exibe_list\').html(response.list);
														jQuery("#myModal2").modal("hide");
													}
													*/
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
										senha: {
											required: true,
											minlength:6,
										},
										resenha: {
											required: true,
											equalTo: \'#senha\'
										}
									},
									messages: {
										senha: {
											required: icon+"'.__translate('Por favor preencher este campo',true).'",
											minlength: icon+"'.__translate('Mínimo de 6 caractéres',true).'"
										},
										resenha: {
											required: icon+"'.__translate('Por favor preencher este campo',true).'",
											equalTo:  icon+"'.__translate('As senhas são diferentes',true).'"
										}
									}
							});
						});
					</script>';
		}
		return $ret;
	}
	public function frm_create_account($config=false){
		global $tk_conta,$suf_in;
		$ret = false;
		$config['acao']			= isset($config['acao'])		?	$config['acao']		:	'cad';
		$config['display'] 		= isset($config['display'])	?	$config['display']	:	'display:block';
		$config['pg'] 				= isset($config['pg'])			?	$config['pg']			:	false;
		$labelHeader = 'Criar nova conta';
		$labBotao = 'Próxima';
		if($config['pg']=='comprar'){
			$labBotao = 'Pagar';
		}
		$btn_block = false;
		$disableEmail = false;
		$inputHidden = false;
		$displayPriEtp = 'none';
		$displaySegEtp = 'none';
		$liberado = true;
		$mensLiberado = false;
		if(is_clientLogado()){
			if(isAero()){
				//$camposObrigatoriosMatricula = camposObrigatoriosMatricula($_SESSION[$tk_conta]['id_customer'.$suf_in],Url::getURL(3));
				$camposObrigatoriosMatricula = camposObrigatoriosMatricula0($_SESSION[$tk_conta]['id_customer'.$suf_in],Url::getURL(3));
				$liberado		= $camposObrigatoriosMatricula['liberado'];
				$mensLiberado 	= $camposObrigatoriosMatricula['mens'];
				if(!$liberado){
					$config['acao']='alt';
				}
			}else{
				$camposObrigatoriosMatricula = camposObrigatoriosMatricula0($_SESSION[$tk_conta]['id_customer'.$suf_in],Url::getURL(3));
				$liberado		= $camposObrigatoriosMatricula['liberado'];
				$mensLiberado 	= $camposObrigatoriosMatricula['mens'];
				if(!$liberado){
					$config['acao']='alt';
				}

			}
			if($config['acao']=='alt'){
				$displayPriEtp = 'block';
				$displaySegEtp = 'block';
			}
				$sql = "SELECT * FROM ".$GLOBALS['tab15']." WHERE id='".$_SESSION[$tk_conta]['id_customer'.$suf_in]."'";
				$dados = buscaValoresDb($sql);
				if($dados){
					foreach($dados[0] As $kei=>$val){
						$config[$kei] = $val;
					}
				}
			$disableEmail = 'disabled';
			$labelHeader = 'Edite suas informações';
			$labBotao = 'Próxima';
			$btn_block = 'btn-block';
			$inputHidden .= queta_formfield4("hidden",'1',"id-", $config['id'],"","");
			$inputHidden .= queta_formfield4("hidden",'1',"Email-", $config['Email'],"","");
			$inputHidden .= queta_formfield4("hidden",'1',"enviaEmail-", 'n',"","");

		}else{
			$inputHidden .= queta_formfield4("hidden",'1',"enviaEmail-", 's',"","");
		}
		$small = '';
		if(is_clientLogado() && $config['pg']=='comprar' && $liberado){
			if(isset($_GET['v2'])){
				$labelHeader = false;
			}else{
				$labelHeader = 'Etapa 2 de 3 - Pagamento';
			}
			$small = '<br><small>Caso tenha alguma dúvida entre em contato com o nosso <a href="/atendimento/contato">suporte</a></small>';
		}elseif(is_clientLogado() && $config['pg']=='comprar' && !$liberado){
			$labelHeader = 'Etapa 1 de 3 - Cadastro';
			$small = '<br><small>Seja bem vindo(a), por favor complete seus dados abaixo para prosseguir</small>';
		}
		$ret .= '<div class="card padding-none" style="padding-top:10px; '.$config['display'].'" id="frm_create_account">';
		$ret .= '<div class="card-header">';
		if($config['pg']!='comprar' || Url::getURL(3)!='comprar'){
			if(is_clientLogado()){
				$small = '<small class="pull-right d-xs-none">Id Cliente: '.zerofill(@$_SESSION[$tk_conta]['id_customer'.$suf_in],5).'</small>';
			}
		}
		if($liberado){
			$ret .= '<div class="col-md-12"><h6>'.$labelHeader.' '.$small.'</h6></div>';
		}else{
			$ret .= '<h6>'.$labelHeader.' '.$small.'</h6>';
		}
		$ret .= '</div>';
		if(is_clientLogado() && $config['pg']=='comprar' && $liberado){
				$ret .= '<form role="form" id="dados_cliente" method="post">';
				$ret .= '<div class="card-body">';
				$ret .= '<div class="col-md-12"><label>Nome Completo: </label>'.$config['Nome'].' '.$config['sobrenome'].'</div>';
				$ret .= '<div class="col-md-12"><label>Email: </label>'.$config['Email'].'</div>';
				$ret .= '<div class="col-md-12"><label>CPF: </label>'.$config['Cpf'].'</div>';
				if(isset($config['Cep'])){
					$ret .= '<div class="col-md-12"><label>CEP: </label>'.$config['Cep'].'</div>';

				}
				$ret .= queta_formfield4("hidden",'1',"dados[cliente][id_cliente]-", $config['id'],"","");
				$ret .= '<div class="col-md-12 text-right">';
				$ret .= '<button type="button" que-ac="editar_cadastro" class="btn btn-secondary"><i class="fa fa-pencil"></i> Editar</button>';
				$ret .= '</div>';
				$ret .= '</div>';
				$ret .= '</form>';
				$ret .= '<script>jQuery(function(){showPagamento()})</script>';
		}else{
			$ret .= '
					<style>
						/*.m-bp{
							display:inline-block;
						}
						[div-id="Nome"],[div-id="sobrenome"]{
							padding-right:0px;
						}
						[div-id="Numero"]{
							padding:0px;
						}*/
					</style>
					<div class="card-body">';
								$ret .= $mensLiberado;
								$ret .= '<form id="form_cad_user" method="post">';
			$ret .= '<div class="row">';
								$config['campos_form'][0] = array('type'=>'email','col'=>'md','size'=>'12','campos'=>'Email-email*-','value'=>@$config['Email'],'css'=>false,'event'=>'que-em '.$disableEmail. ' required info-email','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								//if($config['pg']=='comprar' || Url::getURL(nivel_url_site()+1)=='perfil'){
								if($config['pg']=='comprar' || Url::getURL(nivel_url_site()+1)=='perfil'){
									if($config['pg']=='comprar'){
										$config['campos_form_pr'][5] = array('type'=>'hidden','col'=>'md','size'=>'12','campos'=>'senha-Senha*-','value'=>'mudar123','css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									}else{
										$config['campos_form_pr'][5] = array('type'=>'password','col'=>'md','size'=>'12','campos'=>'senha-Senha*-','value'=>'','css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									}
								}
								if(isAero()){
									$config['campos_form_pr'][1] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Nome-Nome Completo*-Nome completo','value'=>@$config['Nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								}else{
									$config['campos_form_pr'][1] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'Nome-Primeiro nome*-','value'=>@$config['Nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									$config['campos_form_pr'][2] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'sobrenome-Sobrenome*-','value'=>@$config['sobrenome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								}
								if($liberado){
									$config['campos_form_pr'][3] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Celular-celular*-','value'=>@$config['Celular'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								}
								$rules = '
								,Cpf: {
									cpf: true
								}
								';
								$messages = '
								,Cpf: {
										required: icon+" '.__translate('Por favor preencher este campo',true).'"
								}
								';
								if($config['pg']=='comprar'){
									if($liberado){
										$config['campos_form_pr'][4] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Cpf-CPF*-','value'=>@$config['Cpf'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									}
									//$config['campos_form_pr'][5] = array('type'=>'password','col'=>'md','size'=>'12','campos'=>'senha-Senha*-','value'=>'','css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								}elseif(Url::getURL(nivel_url_site()+1)=='perfil'){
									$config['campos_form_pr'][4] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Cpf-CPF*-','value'=>@$config['Cpf'],'css'=>false,'event'=>'required '.$disableEmail,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									//$config['campos_form_pr'][5] = array('type'=>'password','col'=>'md','size'=>'12','campos'=>'senha-Senha*-','value'=>'','css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								}else{
									$rules=false;
									$messages=false;
								}
								if($liberado){
									$config['campos_form_se'][1] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Cep-CEP*-','value'=>@$config['Cep'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									$config['campos_form_se'][2] = array('type'=>'text','col'=>'md','size'=>'9','campos'=>'Endereco-Endereço*-','value'=>@$config['Endereco'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									$config['campos_form_se'][3] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Numero-N.°*-','value'=>@$config['Numero'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									if(is_clientLogado()){
										$config['campos_form_se'][6] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'Compl-Complemento-(Opcional)','value'=>@$config['Compl'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
										$config['campos_form_se'][10] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'Bairro-Bairro*-','value'=>@$config['Bairro'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
										$config['campos_form_se'][7] = array('type'=>'text','col'=>'md','size'=>'5','campos'=>'Cidade-Cidade*-','value'=>@$config['Cidade'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
										$config['campos_form_se'][9] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Uf-Uf*-','value'=>@$config['Uf'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									}else{
										$config['campos_form_se'][6] = array('type'=>'hidden','col'=>'md','size'=>'6','campos'=>'Compl-Complemento-(Opcional)','value'=>@$config['Compl'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
										$config['campos_form_se'][10] = array('type'=>'hidden','col'=>'md','size'=>'6','campos'=>'Bairro-Bairro*-','value'=>@$config['Bairro'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
										$config['campos_form_se'][7] = array('type'=>'hidden','col'=>'md','size'=>'5','campos'=>'Cidade-Cidade*-','value'=>@$config['Cidade'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
										$config['campos_form_se'][9] = array('type'=>'hidden','col'=>'md','size'=>'3','campos'=>'Uf-Uf*-','value'=>@$config['Uf'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
									}
								}
								//$config['campos_form'][1] = array('type'=>'textarea','size'=>'6','campos'=>'dados[cab][descricao]-Descrição ','value'=>@$_GET['descricao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$ret .= formCampos($config['campos_form']);
								//$ret .= '<span class=" padding-none" id="PriEtp" style="display:'.$displayPriEtp.'">';
								$ret .= formCampos($config['campos_form_pr']);
								//$ret .= '</span>';

								//$ret .= '<span class=" padding-none" id="SegEtp" style="display:'.$displaySegEtp.'">';
								if($liberado){
									$ret .= formCampos($config['campos_form_se']);
								}
								if(isAero()){
									if(!$liberado && $camposObrigatoriosMatricula['mens'] && $camposObrigatoriosMatricula['camposForm']){
										$ret .= formCampos($camposObrigatoriosMatricula['camposForm']);
									}
									$arr_estadoCivil = lib_estadoCivil();
									$config['campos_form_est'][8] = array('type'=>'select','size'=>'4','campos'=>'estado_civil-Estado Civil','opcoes'=>$arr_estadoCivil,'selected'=>@array(@$config['estado_civil'],''),'css'=>'','event'=>'required','obser'=>false,'outros'=>false,'class'=>'form-control','acao'=>'','sele_obs'=>'-- Selecione--','title'=>'');
									$ret .= formCampos($config['campos_form_est']);
								}else{
									if(!$liberado && $camposObrigatoriosMatricula['mens'] && $camposObrigatoriosMatricula['camposForm']){
										$ret .= formCampos($camposObrigatoriosMatricula['camposForm']);
									}
								}
								//$ret .= '</span>';
								$ret .= queta_formfield4("hidden",'1',"token-", @uniqid(),"","");
								$ret .= queta_formfield4("hidden",'1',"conf-", 's',"","");
								$ret .= queta_formfield4("hidden",'1',"campo_bus-", 'Email',"","");
								$ret .= queta_formfield4("hidden",'1',"logar-", 's',"","");
								$ret .= queta_formfield4("hidden",'1',"permissao-", '1',"","");
								$ret .= queta_formfield4("hidden",'1',"ac-", $config['acao'],"","");
								$ret .= queta_formfield4("hidden",'1',"EscolhaDoc-", 'CPF',"","");
								$ret .= queta_formfield4("hidden",'1',"sec-", 'cad_clientes_site',"","");
								$ret .= queta_formfield4("hidden",'1',"pg-", $config['pg'],"","");
								$ret .= queta_formfield4("hidden",'1',"local-", 'form_cad_user',"","");
								$ret .= queta_formfield4("hidden",'1',"tab-", base64_encode($GLOBALS['tab15']),"","");
								$ret .= csrf();
								$ret .= $inputHidden;
								$ret .= '<div class="col-md-12 mens"></div>';
								$ret .= '<div class="col-md-12" style="padding:10px 10px ">';
								$prossigaCadastro = false;
								if(!is_clientLogado()){
									$a = '<span class="nao_possue_conta"><a {href} class="btn btn-link"  style="margin-right:5px"><i class="fa fa-chevron-left"></i> Faça login em vez disso</a></span>';
									if($config['pg']=='comprar'){
										//$href = 'href="javaScript:void(0)" que-cadastro="logar"';
										$redirect = UrlAtual();
										$href = 'href="/account/login?redirect='.$redirect.'" que-cadastro2="logar"';
										$ret .= str_replace('{href}',$href,$a);
										$prossigaCadastro = 'prossigaCompra()';
									}else{
										$href = 'href="/account/login"';
										$ret .= str_replace('{href}',$href,$a);
									}
								}
								$ret .= '<button type="submit" style="position:absolute;right:15px" class="btn btn-primary '.$btn_block.'">'.$labBotao.' <i class="fa fa-chevron-right"></i></button>';
								$ret .= '</div>';
			$ret .= '</div>';
								$ret .= '</form>';
			$ret .= '</div>';
				$ret .= '
				<script>
					jQuery(document).ready(function () {
						var icon = \'\';
						jQuery(\'[id="Celular"]\').mask(\'(99)99999-9999\');
						jQuery(\'[id="Cpf"]\').mask(\'999.999.999-99\');
						jQuery(\'[id="Cep"]\').mask(\'99999-999\');
						jQuery(\'[que-acao="finalizar_compra"]\').hide();
						hidePagamento();
						';

			$ret .= 'jQuery(\'#form_cad_user\').validate({
								submitHandler: function(form) {
									$.ajax({
										url: \''.RAIZ.'/app/clientes/acao.php?ajax=s&acao='.$config['acao'].'&campo_bus=Email\',
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
											if(response.exec){
												';
												if($config['acao']=='alt'){
													$ret .='location.reload();';

												}elseif($config['pg'] == 'comprar'){
													$ret .= 'abrirPaginaPagamento(response); // app/ecomerce/js_front.js';
												}else{
													$ret .= '
													window.location = \''.queta_option('dominio_site').'/obrigado-pelo-cadastro\';
													';
												}

			$ret .='
												/*if(response.list){
													jQuery(\'#exibe_list\').html(response.list);
													jQuery("#myModal2").modal("hide");
												}*/

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
									'.$rules.'
								},
								messages: {
									nome: {
										required: icon+" '.__translate('Por favor preencher este campo',true).'"
									}
									'.$messages.'
								}
						});
					});
				</script>';
		}
		$ret .= '</div>';
		return $ret;
	}
	public function frm_editPerfil($config=false){
		global $tk_conta,$suf_in;
		$ret = false;
		$config['acao']			= isset($config['acao'])		?	$config['acao']		:	'cad';
		$config['display'] 		= isset($config['display'])	?	$config['display']	:	'block';
		$config['pg'] 				= isset($config['pg'])			?	$config['pg']			:	false;
		$labelHeader = 'Criar nova conta';
		$labBotao = 'Cadastrar';
		$disableEmail = false;
		$disableDadosPessoais = false;
		$disableCpf = false;
		$inputHidden = false;
		$displayPriEtp = 'none';
		$displaySegEtp = 'none';
		$colorBtn = 'success';
		$sec = 'cad_clientes_site';
		if(is_clientLogado()){
			if($config['acao']=='alt'){
				$displayPriEtp = 'block';
				$displaySegEtp = 'block';
			}
				$sql = "SELECT * FROM ".$GLOBALS['tab15']." WHERE id='".$_SESSION[$tk_conta]['id_customer'.$suf_in]."'";
				$dados = buscaValoresDb($sql);
				if($dados){
					foreach($dados[0] As $kei=>$val){
						$config[$kei] = $val;
					}
				}
			$disableEmail = 'disabled';
			$disableCpf = 'disabled';
			if($this->is_aluno($_SESSION[$tk_conta]['id_customer'.$suf_in])){
				//verifica se o cliente esta no status de aluno ou seja assinou contrato
				if(isAero()){

				}else{
					$disableDadosPessoais = 'disabled';
				}
			}
			$lib_validaCPF = lib_validaCPF($config['Cpf']);
			if(!$lib_validaCPF)
				$disableCpf = false;
			$labelHeader = 'Edite suas informações';
			$labBotao = 'Salvar';
			$inputHidden .= queta_formfield4("hidden",'1',"id-", $config['id'],"","");
			$inputHidden .= queta_formfield4("hidden",'1',"Email-", $config['Email'],"","");
			$inputHidden .= queta_formfield4("hidden",'1',"enviaEmail-", 'n',"","");
		}else{
			$inputHidden .= queta_formfield4("hidden",'1',"enviaEmail-", 's',"","");
		}
		if(is_clientLogado() && $config['pg']=='comprar'){

			$labelHeader = 'Suas informações';
		}
		$ret .= '<div class="card padding-none" style=" display:'.$config['display'].'" id="frm_create_account">';
		$ret .= '<div class="card-header">';
		if(Url::getURL(3)=='contrato'){
			$configCn['token'] = base64_encode(buscaValorDb($GLOBALS['tab12'],'id',$config['id_matricula'],'token'));
			$compltitle = false;
			if(isAero()){
				$conteudo = contratoAero($configCn);
				$nomn = explode(' ',$_SESSION[$tk_conta]['dados_cliente'.$suf_in]['Nome']);

				$ret .= '<h6>Ficha de Matrícula e contrato<small class="pull-right">N°: '.zerofill(@$config['id_matricula'],4).'</small>';
				if(isset($nomn[0]) && ($nm = $nomn[0])){
					$ret .= '<br><small>Atenção <b>'.$nm.'</b>, para prosseguir com o curso é necessário assinar o contrato abaixo!</small>';
				}
				$ret .= '</h6.>';
			}else{
				$ret .= '<h6>Etapa 3 de 3 - Ficha de Matrícula '.$compltitle.'<small class="pull-right">N°: '.zerofill(@$config['id_matricula'],5).'</small><br><small>Parabéns <b>'.$_SESSION[$tk_conta]['dados_cliente'.$suf_in]['Nome'].'</b>, você está a um passo de iniciar o seu curso!</small></h6>';
				$conteudo = contratoMatricula($configCn);
			}
			$labBotao = 'Prosseguir <i class="fa fa-chevron-right"></i>';
			$colorBtn = 'primary';
			$sec = 'cad_contrato_site';
		}else{
			$ret .= '<h6>'.$labelHeader.' <small class="pull-right d-none d-sm-block">Id Cliente: '.zerofill(@$_SESSION[$tk_conta]['id_customer'.$suf_in],5).'</small></h6>';
		}
		$ret .= '</div>';
		if(is_clientLogado()){
			$requiredSenha = false;
		$ret .= '
				<style>

					.legendStyle{
						font-size:1.0rem;
					}
					fieldset{
						border:solid 1px #ccc
					}
				</style>
				<div class="card-body">';
							$ret .= '<form id="form_cad_user" method="post">';
		$ret .= '<div class="row">';
							//echo $config['DtNasc'];
							// if(isset($config['DtNasc2'])){
							// 	$config['DtNasc2'] = dataExibe($config['DtNasc2']);
							// }
							if(Url::getURL(3)=='contrato'){

								//$ret .= '<div class="col-sm-12 title-contrato">';
								$ret .= '<div class="col-sm-6 title-contrato text-left"><label><b>Curso:</b></label> <span>'.@$conteudo['dadosCurso'][0]['titulo'].'</span></div>';
								$ret .= '<div class="col-sm-6 title-contrato text-right"><label><b>Turma:</b></label> <span>'.@$conteudo['dadosTurma'][0]['nome'].'</span></div>';
								//$ret .= '</div>';
								$arr_sexo = lib_sexo();
								$config['campos_form'][0] = array('type'=>'email','col'=>'md','size'=>'12','campos'=>'Email-email*-','value'=>@$config['Email'],'css'=>false,'event'=>'que-em '.$disableEmail. ' required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form'][1] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'Nome-Primeiro nome*-','value'=>@$config['Nome'],'css'=>false,'event'=>'required '.$disableDadosPessoais,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								if(isSchool())
									$config['campos_form'][2] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'sobrenome-Sobrenome*-','value'=>@$config['sobrenome'],'css'=>false,'event'=>'required '.$disableDadosPessoais,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form'][3] = array('type'=>'date','col'=>'md','size'=>'3','campos'=>'DtNasc2-D. Nascimento-','value'=>@$config['DtNasc2'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form'][4] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Cpf-CPF*-','value'=>@$config['Cpf'],'css'=>false,'event'=>'required '.$disableCpf,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form'][7] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Ident-D. Identidade-','value'=>@$config['Ident'],'css'=>false,'event'=>'required '.$disableDadosPessoais,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form'][8] = array('type'=>'select','size'=>'3','campos'=>'genero-Genero','opcoes'=>$arr_sexo,'selected'=>@array(@$config['genero'],''),'css'=>'','event'=>'required ','obser'=>false,'outros'=>false,'class'=>'form-control','acao'=>'','sele_obs'=>'-- Selecione--','title'=>'Selecione o gênero');

								$informacoes = formCampos($config['campos_form']);
								$configPainelnfo = array('titulo'=>'Dados do aluno','conteudo'=>'<div class="row">'.$informacoes.'</div>','id'=>'dadosInf','in'=>'show','div_select'=>'dadosInf','condiRight'=>false,'tam'=>'12 painel-pn-inf');
								$ret .= $this->lib_painelCard($configPainelnfo);

								$config['campos_form_dp'][1] = array('type'=>'text','col'=>'md','size'=>'2','campos'=>'Cep-CEP*-','value'=>@$config['Cep'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_dp'][2] = array('type'=>'text','col'=>'md','size'=>'5','campos'=>'Endereco-Endereço residencial*-','value'=>@$config['Endereco'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_dp'][3] = array('type'=>'text','col'=>'md','size'=>'2','campos'=>'Numero-N.°*-','value'=>@$config['Numero'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_dp'][4] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Compl-Complemento-','value'=>@$config['Compl'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_dp'][6] = array('type'=>'text','col'=>'md','size'=>'4','campos'=>'Bairro-Bairro*-','value'=>@$config['Bairro'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_dp'][7] = array('type'=>'text','col'=>'md','size'=>'4','campos'=>'Cidade-Cidade*-','value'=>@$config['Cidade'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_dp'][8] = array('type'=>'text','col'=>'md','size'=>'1','campos'=>'Uf-UF-','value'=>@$config['Uf'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_dp'][9] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'pais-País-','value'=>@$config['pais'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);

								$dadosPessoais = formCampos($config['campos_form_dp']);
								$configPaineDp = array('titulo'=>'Dados Pessoais','conteudo'=>'<div class="row">'.$dadosPessoais.'</div>','id'=>'dadosPes','in'=>'show','div_select'=>'dadospes','condiRight'=>false,'tam'=>'12 painel-pn-dp');
								$ret .= $this->lib_painelCard($configPaineDp);
								$clientes_info_adicionais = queta_option('clientes_info_adicionais');
								if(!empty($clientes_info_adicionais)){
									$arrCamposForm = json_decode($clientes_info_adicionais,true);
									if(is_array($arrCamposForm)){
										$formularios = new formularios;
										$ret .=  $formularios->printCamposForm($arrCamposForm);
									}
								}
								if(isAero()){
									$camposObrigatoriosMatricula = camposObrigatoriosMatricula($_SESSION[$tk_conta]['id_customer'.$suf_in]);
									if($camposObrigatoriosMatricula['mens'] && $camposObrigatoriosMatricula['camposForm']){
										$ret .= formCampos($camposObrigatoriosMatricula['camposForm']);
									}
								}
								$ret .= $this->inputAceitoContrato($config['id_matricula']);
								$ret .= queta_formfield4("hidden",'1',"id_matricula-", $config['id_matricula'],"","");
							}else{
								//lib_print($config);
								$config['campos_form'][0] = array('type'=>'email','col'=>'md','size'=>'12','campos'=>'Email-email*-','value'=>@$config['Email'],'css'=>false,'event'=>'que-em '.$disableEmail. ' required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_pr'][1] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'Nome-Primeiro nome*-','value'=>@$config['Nome'],'css'=>false,'event'=>'required '.$disableDadosPessoais,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_pr'][2] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'sobrenome-Sobrenome*-','value'=>@$config['sobrenome'],'css'=>false,'event'=>'required '.$disableDadosPessoais,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_pr'][3] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Celular-celular*-','value'=>@$config['Celular'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_pr'][6] = array('type'=>'date','col'=>'md','size'=>'3','campos'=>'DtNasc2-D. Nascimento-','value'=>@$config['DtNasc2'],'css'=>false,'event'=>' ','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_pr'][7] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Ident-D. Identidade-','value'=>@$config['Ident'],'css'=>false,'event'=>''.$disableDadosPessoais,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_pr'][4] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Cpf-Cpf*-','value'=>@$config['Cpf'],'css'=>false,'event'=>'required '.$disableCpf,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								//if(Url::getURL(2)=='edit-senha')
									$config['campos_form_pr'][5] = array('type'=>'password','col'=>'md','size'=>'12','campos'=>'senha-Senha*-','value'=>'','css'=>false,'event'=>$requiredSenha,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_se'][1] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Cep-CEP*-','value'=>@$config['Cep'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_se'][2] = array('type'=>'text','col'=>'md','size'=>'9','campos'=>'Endereco-Endereço*-','value'=>@$config['Endereco'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_se'][3] = array('type'=>'text','col'=>'md','size'=>'2','campos'=>'Numero-N.°*-','value'=>@$config['Numero'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_se'][6] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Bairro-Bairro*-','value'=>@$config['Bairro'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$config['campos_form_se'][7] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Cidade-Cidade*-','value'=>@$config['Cidade'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								//$config['campos_form'][1] = array('type'=>'textarea','size'=>'6','campos'=>'dados[cab][descricao]-Descrição ','value'=>@$_GET['descricao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
								$ret .= formCampos($config['campos_form']);
								$ret .= formCampos($config['campos_form_pr']);
								$ret .= formCampos($config['campos_form_se']);
								if(isAero()){
									$camposObrigatoriosMatricula = camposObrigatoriosMatricula($_SESSION[$tk_conta]['id_customer'.$suf_in]);
									if($camposObrigatoriosMatricula['mens'] && $camposObrigatoriosMatricula['camposForm']){
										$ret .= formCampos($camposObrigatoriosMatricula['camposForm']);
									}
								}
							}
							$ret .= queta_formfield4("hidden",'1',"token-", @uniqid(),"","");
							$ret .= queta_formfield4("hidden",'1',"conf-", 's',"","");
							$ret .= queta_formfield4("hidden",'1',"campo_bus-", 'Email',"","");
							$ret .= queta_formfield4("hidden",'1',"permissao-", '1',"","");
							$ret .= queta_formfield4("hidden",'1',"ac-", $config['acao'],"","");
							$ret .= queta_formfield4("hidden",'1',"EscolhaDoc-", 'CPF',"","");
							$ret .= queta_formfield4("hidden",'1',"sec-", $sec,"","");
							$ret .= queta_formfield4("hidden",'1',"pg-", $config['pg'],"","");
							$ret .= queta_formfield4("hidden",'1',"tab-", base64_encode($GLOBALS['tab15']),"","");
							$ret .= $inputHidden;
							$ret .= csrf();
							//$ret .= '</div>';
							$ret .= '<div class="col-md-12 mens"></div>';
							$ret .= '<div class="col-md-12 text-right" style="padding:10px 10px ">';
							$prossigaCadastro = false;
							$ret .= '<button type="submit" class="btn btn-'.$colorBtn.'">'.$labBotao.'</button>';
							if(!is_clientLogado()){
								$a = '<br><span class="nao_possue_conta">Já tenho uma conta <a {href}>Logar</a></span>';
								if($config['pg']=='comprar'){
									$href = 'href="javaScript:void(0)" que-cadastro="logar"';
									$ret .= str_replace('{href}',$href,$a);
									$prossigaCadastro = 'prossigaCompra()';
								}else{
									$href = 'href="/account/login"';
									$ret .= str_replace('{href}',$href,$a);
								}
							}
							$ret .= '</div>';
		$ret .= '</div>';
							$ret .= '</form>';
		$ret .= '</div>';
			$ret .= '
			<script>
				jQuery(document).ready(function () {
					var icon = \'\';
					jQuery(\'[id="Celular"]\').mask(\'(99)99999-9999\');
					jQuery(\'[id="Cpf"]\').mask(\'999.999.999-99\');
					jQuery(\'[id="Cep"]\').mask(\'99999-999\');
					';
		$ret .= 'jQuery(\'#form_cad_user\').validate({
							submitHandler: function(form) {
								$.ajax({
									url: \''.RAIZ.'/app/clientes/acao.php?ajax=s&acao='.$config['acao'].'&campo_bus=Email\',
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
										if(response.exec){
											//window.location = \''.queta_option('dominio_site').'\';
											if(response.mess==\'sucesso\'){
												window.location = \'/'.Url::getURL(0).'/iniciar-curso\';
												jQuery(\'#preload\').fadeIn();
												return false;
											}
											else if(response.salvarAceitoContrato.salvar){
												window.location = \'/'.Url::getURL(0).'/'.Url::getURL(1).'/'.Url::getURL(2).'/iniciar-curso\';
												jQuery(\'#preload\').fadeIn();
												return false;
											}
											//alert(\'parar\');
											';
											if($config['acao']=='alt'){
												$ret .='location.reload();';
											}
											if($config['pg'] == 'comprar'){
												$ret .= 'abrirPaginaPagamento(response); // app/ecomerce/js_front.js';
											}
		$ret .='
											/*if(response.list){
												jQuery(\'#exibe_list\').html(response.list);
												jQuery("#myModal2").modal("hide");
											}*/

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
								},Cpf: {
									cpf: true
								}
							},
							messages: {
								nome: {
									required: icon+" '.__translate('Por favor preencher este campo',true).'"
								},Cpf: {
									required: icon+" '.__translate('Por favor preencher este campo',true).'"
								}
							}
					});
				});
			</script>';
		}
		$ret .= '</div>';
		return $ret;
	}
	public function is_aluno($id_cliente=false){
		$ret = false;
		$ret = checar_2($GLOBALS['tab12'],"WHERE id_cliente='".$id_cliente."' AND status > '2' ");
		return $ret;
	}
	public function salvarAceitoContrato($config=false,$status=2){
		$ret['exec'] = false;
		if(isset($config['id_matricula'])&&!empty($config['id_matricula'])){
			$dadosMatricula = dados_tab($GLOBALS['tab12'],'id_turma,id_curso',"WHERE id='".$config['id_matricula']."' AND ".compleDelete());
			if($dadosMatricula){
				$numeroDoAluno = ultimoValarDb($GLOBALS['tab12'], 'numero', "WHERE id_curso='".$dadosMatricula[0]['id_curso']."' AND id_turma='".$dadosMatricula[0]['id_turma']."' AND status='".$status."' AND ".compleDelete());
				$config['id']	= $config['id_matricula'];
				$config['ac'] 			= 'alt';
				$config['status'] 	= $status;
				$config['tab'] = $GLOBALS['tab12'];
				$config_historico = array('ac'=>$config['ac'],'post'=>$config,'tab'=>$config['tab'],'evento'=>'Contrato Assinado Digitalmente','status'=>@$config['status']);
				$sqlAux = sqlSalvarHistorico_matricula($config_historico);
				//$sql = "UPDATE ".$GLOBALS['tab12']." SET contrato='".json_encode($config)."',numero='".$numeroDoAluno."',status='".$status."',data_contrato='".$GLOBALS['dtBanco']."'$sqlAux  WHERE id = '".$config['id_matricula']."'";
				$sql = "UPDATE ".$GLOBALS['tab12']." SET contrato='".json_encode($config)."',numero='".$numeroDoAluno."',data_contrato='".$GLOBALS['dtBanco']."'$sqlAux  WHERE id = '".$config['id_matricula']."'";
				$ret['salvar'] = salvarAlterar($sql);
				if($ret['salvar'])
					$ret['exec']=true;
			}else{
				$ret['mens'] = 'Matricula não encontrada!';
			}
		}
		return $ret;
	}
	public function matricularAlunoFront($config=false,$status=3){
		$ret['exec'] = false;
		if(isset($config['id_matricula'])&&!empty($config['id_matricula'])){
			//$status = 3;
			$dadosMatricula = dados_tab($GLOBALS['tab12'],'id_turma,id_curso,id_cliente',"WHERE id='".$config['id_matricula']."' AND ".compleDelete());
			//verifica se existe mensalidades geradas mais não pagas
			if($dadosMatricula){
				$verificaFinanceiroAluno = verificaFinanceiroAluno($dadosMatricula[0]['id_cliente'],3);
				if($verificaFinanceiroAluno['enc']){
					$ret['mens'] = $verificaFinanceiroAluno['mens'];
					return $ret;
				}
				$config['id']	= $config['id_matricula'];
				$config['ac'] 			= 'alt';
				$config['status'] 	= $status;
				$config['tab'] = $GLOBALS['tab12'];
				$config_historico = array('ac'=>$config['ac'],'post'=>$config,'tab'=>$config['tab'],'memo'=>'Cliente Preencher o formulario é acessou a plataforma de conteudos','evento'=>'etapa 3 de 3','status'=>@$config['status']);
				$sqlAux = sqlSalvarHistorico_matricula($config_historico);
				$sql = "UPDATE ".$GLOBALS['tab12']." SET status='".$status."',data_contrato='".$GLOBALS['dtBanco']."'$sqlAux  WHERE id = '".$config['id_matricula']."'";
				$ret['salvar'] = salvarAlterar($sql);
				if($ret['salvar'])
					$ret['exec']=true;
			}else{
				$ret['mens'] = 'Matricula não encontrada!';
			}
		}
		return $ret;
	}
	public function verificaAceitoContrato($config=false){
		$ret['aceito'] = false;
		if(isset($config['id_matricula'])&&!empty($config['id_matricula'])){
			$dadosMatricula = dados_tab($GLOBALS['tab12'],'id_turma,id_curso,contrato,numero',"WHERE id='".$config['id_matricula']."' AND ".compleDelete());
			if(!empty($dadosMatricula[0]['contrato'])){
				$arrContrato = json_decode($dadosMatricula[0]['contrato'],true);
				if(is_array($arrContrato)){
					$ret['arrContrato'] = $arrContrato;
					$ret['dadosMatricula'] = $dadosMatricula;
					if(isset($arrContrato['aceito_contrato']) && $arrContrato['aceito_contrato']=='on'){
						$ret['aceito']=true;
					}
				}
			}else{
				$ret['mens'] = 'Matricula não encontrada!';
			}
		}
		return $ret;
	}
	public function inputAceitoContrato($id_matricula=false){
		$ret = false;
		if($id_matricula){
			$declaracao 	= queta_option('termo_declaracao')?queta_option('termo_declaracao'):false;
			$termo_contrato	 	= queta_option('termo_contrato')?queta_option('termo_contrato'):false;
			$config['id_matricula'] = $id_matricula;
			//if(isAdmin(1)){
				//var_dump($declaracao);exit;
			//}
			//$contrato = buscaValorDb($GLOBALS['tab12'],'id',$id_matricula,'contrato');
			$configCn['token'] = base64_encode(buscaValorDb($GLOBALS['tab12'],'id',$config['id_matricula'],'token'));
			if(isAero()){
				$conteudo = contratoAero($configCn);
			}else{
				$conteudo = contratoEad($configCn);
				//$conteudo = contratoMatricula($configCn);
			}
			$aceitoCotrato['aceito']=false;//Padrão não aceito
			if(isset($conteudo['dadosMatricula'][0])){
				$aceitoCotrato = $this->aceitoCotrato($conteudo['dadosMatricula'][0]);
			}else{
				$ret = formatMensagem('Matricula inválida','danger');
				return $ret;
			}
			if($conteudo && !$aceitoCotrato['aceito']){
					$contrato = $conteudo['dadosMatricula'][0]['contrato'];
					$termo = '<div class="col-md-12">';
					$checkedDecl = false;$checkedAcei = false;
					if($contrato&&!empty($contrato)){
						$contr = json_decode($contrato,true);
						if(isset($contr['declaracao'])&&$contr['declaracao']=='on')
							$checkedDecl = 'checked';
						if(isset($contr['aceito_contrato'])&&$contr['aceito_contrato']=='on')
							$checkedAcei = 'checked';
					}
					if($declaracao=='true'){
						$text = 'Declaro, para fins jurídicos, que os dados por mim fornecidos são a expressão da verdade e que, antes de preencher este formulário, recebi todas as informações pertinentes ao curso, contidas no <a href="/termos-de-uso" target="_BLANK">regulamento da parte teórica do curso</a>, relativas à estrutura curricular e à programação de seu desenvolvimento; às normas disciplinares, operacionais* e administrativas; e, ainda, as referentes ao sistema de avaliação e de aprovação utilizado por esta escola.';
						$text_declaro_termo = queta_option('text_declaro_termo')?queta_option('text_declaro_termo'):$text;
					$termo .= '<label id="declaracao" class="text-justify"><input type="checkbox" '.$checkedDecl.' required name="contrato[declaracao]"> '.$text_declaro_termo.'</label>';
					}
					$termo .= '</div>';
					if($termo_contrato=='true'){
						$termo .= '<div class="col-md-12">';
						$termo .= '<label id="aceito_contrato"><input type="checkbox" '.$checkedAcei.' name="contrato[aceito_contrato]" required> Aceito o <a href="javaScript:void(0)" data-toggle="modal" data-target="#modal_contrato" btn-contrato>contrato de prestação de serviços</a></label> <!--<button type="button" data-toggle="modal" data-target="#modal_contrato" btn-contrato class="btn btn-link">Contrato de serviço</button>-->';
						$termo .= '<input type="hidden" name="contrato[data_aceito_contrato]" value="'.$GLOBALS['dtBanco'].'">';
						$termo .= '<input type="hidden" name="contrato[id_matricula]" value="'.$config['id_matricula'].'">';
						$termo .= '</div>';
					}
					$configPaineDp = array('titulo'=>'Termo de responsabilidade','conteudo'=>$termo,'id'=>'dadosTerm','in'=>'show','div_select'=>'dadosterm','condiRight'=>false,'tam'=>'12 painel-pn-termo');
					if($termo_contrato=='true' || $declaracao=='true'){
						$ret .= $this->lib_painelCard($configPaineDp);
						$ret .= $this->modalBootstrap(false,$bt_fechar=false,$conteudo['contrato'],$id='modal_contrato',$tam='modal-lg');
					}else{
						$ret .= '<input type="checkbox" style="display:none;" checked required name="contrato[declaracao]">';
						$ret .= '<input type="checkbox" style="display:none;" checked required name="contrato[aceito_contrato]">';
						$ret .= '<input type="hidden" name="contrato[data_aceito_contrato]" value="'.$GLOBALS['dtBanco'].'">';
						$ret .= '<input type="hidden" name="contrato[id_matricula]" value="'.$config['id_matricula'].'">';
					}
			}else{
				//$ret = formatMensagem('');
			}
		}
		return $ret;
	}
	public function lib_painelCard($config=false){
				$ret = false;
				if(!$config)
					$config = array('titulo'=>'Titulo do Colapse','conteudo'=>false,'id'=>false,'in'=>'in','condiRight'=>false,'tam'=>'12','div_select'=>false);
				if(isset($config['icon'])&&!empty($config['icon'])){
					$icon = $config['icon'];
				}else{
					$icon = false;
				}
				$tema = '
				<div class="col-md-{tam} {div_select}">
					<div class="card mb-3 card-id-{id} padding-none">
					  <div class="card-header">
						<div class="col-md-12"><h6>{icon} {titulo} <span class="pull-right hidden-print">{condiRight}</span></h6></div>
					  </div>
					  <div class="card-body">
						{conteudo}
					  </div>
					</div>
				</div>
				';
				$ret = str_replace('{tam}',$config['tam'],$tema);
				$ret = str_replace('{div_select}',$config['div_select'],$ret);
				$ret = str_replace('{id}',$config['id'],$ret);
				$ret = str_replace('{icon}',$icon,$ret);
				$ret = str_replace('{titulo}',$config['titulo'],$ret);
				$ret = str_replace('{conteudo}',$config['conteudo'],$ret);
				$ret = str_replace('{condiRight}',$config['condiRight'],$ret);

				return $ret;
	}
	public function frmAceitoContrato($id_matricula=false){
		$ret = false;
		if(isset($id_matricula)){
			//$id_matricula = $config['id_matricula'];
			$ret .= '<form id="frmAceitoContrato" >';
			$ret .= $this->inputAceitoContrato($id_matricula);
			$ret .= '</form>';
		}
		return $ret;
	}
	public function exibeTipoPagina2($config=false){
		$ret 	= false;
		$tema = carregaArquivo($this->pastaTema().'/pagina2.html');
		if($config && $tema){
			if(isset($config['nome'])){
				$tema 			.= $_REQUEST['editar_pagina'];//para editar uma pagina quando logado
				if($config['tipo']==17){
					//var_dump($_SESSION[TK_CONTA]['agradecimento']['nome']);
					//echo 'aqui teste';exit;
					if(isset($_SESSION[TK_CONTA]['agradecimento']['nome'])&&isset($_SESSION[TK_CONTA]['agradecimento']['nome'])){
						$ret = str_replace('{titulo}',$config['nome'],$tema);
						$ret = str_replace('{conteudo}',$config['obs'],$ret);
						$dadoEmpesa = buscaValoresDb_SERVER("SELECT * FROM contas_usuarios WHERE token='".$_SESSION[SUF_SYS]['token_conta'.SUF_SYS]."'");
						$ret = str_replace('{titulo-empresa}',$dadoEmpesa[0]['nome'],$ret);
						$ret = str_replace('{endereco-empresa}',$dadoEmpesa[0]['endereco'] .' '.$dadoEmpesa[0]['numero'].' '.$dadoEmpesa[0]['complemento'],$ret);
						$ret = str_replace('{nome}',$_SESSION[TK_CONTA]['agradecimento']['nome'],$ret);
						$ret = str_replace('{email}',$_SESSION[TK_CONTA]['agradecimento']['email'],$ret);
						$ret = str_replace('{email-empresa}',$dadoEmpesa[0]['email'],$ret);
						$ex_btn_criar_conta = '<a rel="nofollow" target="_blank" href="javaScript:void(0)" class="btn btn-warning">Criar conta de acesso</a>';
						$ret = str_replace('{ex_btn_criar_conta}',$ex_btn_criar_conta,$ret);
					}
					//echo ;
					//exit;
				}else{
					$ret = str_replace('{titulo}',$config['nome'],$tema);
					$ret = str_replace('{conteudo}',$config['obs'],$ret);
					$dadoEmpesa = buscaValoresDb_SERVER("SELECT * FROM contas_usuarios WHERE token='".$_SESSION[SUF_SYS]['token_conta'.SUF_SYS]."'");
					$ret = str_replace('{titulo-empresa}',$dadoEmpesa[0]['nome'],$ret);
					$ret = str_replace('{endereco-empresa}',$dadoEmpesa[0]['endereco'] .' '.$dadoEmpesa[0]['numero'].' '.$dadoEmpesa[0]['complemento'],$ret);
					$ret = str_replace('{email-empresa}',$dadoEmpesa[0]['email'],$ret);
					$ex_btn_criar_conta = '<a rel="nofollow" href="javaScript:void(0)" class="btn btn-warning">Criar conta de acesso</a>';
					$ret = str_replace('{ex_btn_criar_conta}',$ex_btn_criar_conta,$ret);
				}
			}else{
				$tema='<div class="col-md-12" style="margin-top:80px">{conteudo}</div>';
				$ret = str_replace('{conteudo}',formatMensagem('Página não encontrada favor entre em contato com o <a href="/atendimento/contato">suporte</a>','danger',40000),$tema);
			}

		}
		return $ret;
	}
	public function siteContent($config=[]){
		global $tk_conta,$suf_in;
		$ret						= false;
		$config['arquivo'] = 'layout_pagina.html';
		$tema = $this->abrirPagina($config);
		$ecomerce = new ecomerce;
		//$tema 						= $this->conteudo($config);
		$conteudo_pagina 	= false;
		$cursos_destaque 	= false;
		$resumo_pagina	 	= false;
		$paginacao_site	 	= false;
		$conteudo_aula		 	= false;
		$nome_curso 			= false;
		$btn_certificado 		= false;
		$progresso_curso 	    = false;
		$progress_bar_geral		 = false;
		$progress_provas_realizadas = false;
		$progress_aproveitamento    = false;
		$segundo_painel		= false;
		$titleDuracao		= false;
		if($_REQUEST['tipo']==2||$_REQUEST['tipo']==17){
			$ret .= $this->exibeTipoPagina2($_REQUEST);
		}else{
				if(Url::getURL(nivel_url_site()+1)!=NULL){
					if(Url::getURL(nivel_url_site()+1)=='webhook'){
						if(Url::getURL(nivel_url_site())=='asaas'){
							$asaas = new integraAsaas;
							$tema = $asaas->webhook($config);
							echo $tema;exit;
						}
					}
					if(Url::getURL(nivel_url_site())=='teste'){
						if(Url::getURL(nivel_url_site()+1)=='teste'){
							//$asaas = new integraAsaas;
							$conteudo_aula = false;
							$tema = $this->testeFront($config);
						}
					}elseif(Url::getURL(nivel_url_site())=='atendimento'){
						$detalhesPagina = $this->atendimento($_REQUEST);
						$tema = $detalhesPagina;
						//$conteudo_pagina = $detalhesCurso['conteudo_pagina'];
					}
					if(Url::getURL(nivel_url_site())=='iframe'){
						$tema = lib_imprimeCabEmpresa2('d-none');
						if(Url::getURL(nivel_url_site()+1)=='recibo'&&Url::getURL(nivel_url_site()+2)!=NULL){
							//$asaas = new integraAsaas;
							$conteudo_aula = false;
							//$tema = carregaArquivo($this->pastaTema().'/iframe.html');
							if(is_clientLogado() && isset($_GET['matricula'])){
								$configR['id'] = Url::getURL(nivel_url_site()+2);
								$configR['status'] = buscaValorDb($GLOBALS['tab12'],'id',base64_decode($_GET['matricula']),'status');
								//$configR['opc'] = 'recibo_matricula';
								$configR['opc'] = 'recibo_padrao';
								$configR['tab'] = base64_encode($GLOBALS['lcf_entradas']);
								$_SESSION[SUF_SYS]['label_voltar_janela'] = 'Voltar';
								//print_r($configR);
								$tema .= recibo_lcf($configR);
							}else{
								$tema = false;
							}
						}
					}
					if(Url::getURL(nivel_url_site())=='account' || Url::getURL(nivel_url_site())=='area-do-aluno'){

						if(Url::getURL(nivel_url_site())=='account' && Url::getURL(nivel_url_site()+1)=='register' && !is_clientLogado()){
							//$conteudo_pagina = $this->accountRegister($config);
							$tema = $this->accountRegister($config);
						}elseif(Url::getURL(nivel_url_site())=='account' && Url::getURL(nivel_url_site()+1)=='login'){
							if(is_clientLogado()){
								redirect('/area-do-aluno',0);
								$tema = '<div class="col-md-12" style="min-height:450px;padding-top:55px"><h5>Acessando área exclusiva, aguarde....</h5></div>';
							}else{
								$tema = $this->accountLogin($config);
							}
						}elseif(Url::getURL(nivel_url_site())=='account' && Url::getURL(nivel_url_site()+1)=='forgot' && !is_clientLogado()){
							//$conteudo_pagina = $this->accountForgot($config);
							$tema = $this->accountForgot($config);
						}elseif(Url::getURL(nivel_url_site())=='account' && Url::getURL(nivel_url_site()+1)=='sair'){
							//$conteudo_pagina = $this->accountForgot($config);
							$tema = logoutUserSite();
						}elseif(Url::getURL(nivel_url_site())=='account' && Url::getURL(nivel_url_site()+1)=='pass' && Url::getURL(nivel_url_site()+3)!=NULL && !is_clientLogado()){
							$config['verificado'] = 's';
							//$conteudo_pagina = $this->accountPass($config);
							$tema = $this->accountPass($config);
						}else{
							$tema = $this->areaDoAluno($_REQUEST);
						}
					}
					if(Url::getURL(nivel_url_site())=='cursos'){
						if(Url::getURL(nivel_url_site()+2)==NULL){
							$cont = $this->paginaCategoriaCursos($_REQUEST);
							$tema = $cont['html'];
						}elseif(Url::getURL(nivel_url_site()+2)!=NULL){
								if(Url::getURL(nivel_url_site()+3)=='iniciar-curso'){
									if(!is_clientLogado()){
										redirect('/area-do-aluno?redirect='.UrlAtual(),0);
										exit;
									}
									$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
									$tema = $temaHTML[0];
									$tema1 = $temaHTML[1];
									$tema6 = $temaHTML[6];
									$obs = false;
									$nome = false;
									$conteudo = 'Conteúdo da página';
									$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
									$cont = $this->iniciarCursoEad(Url::getURL(nivel_url_site()+2));
									//$conteudo_pagina = 'teste';
									$conteudo_pagina = $cont['html'];
									$conteudo_aula = @$cont['conteudo_aula'];
									$nome_curso = @$cont['nome_curso'];
									$progresso_curso = @$cont['verificaProgressoAluno']['progress_bar'];
									$progress_bar_geral = @$cont['verificaProgressoAluno']['progress_bar_geral'];
									$resumoCurso = isset($cont['resumoCurso'])?$cont['resumoCurso']:false;
									$progress_provas_realizadas = @$resumoCurso['aproveitamento']['progress_bar']['realizado'];
									$progress_aproveitamento = @$resumoCurso['aproveitamento']['progress_bar']['alcancado'];
									$btn_certificado = @$cont['verificaProgressoAluno']['btn_certificado'];
									$titleDuracao = @$cont['duracao'];
									$progresso_curso;
									// if(isset($_GET['fe'])){
									// 	dd($cont);
									// }
									//if(is_adminstrator(1))
									//lib_print($cont['verificaProgressoAluno']);exit;
									$segundo_painel = $this->iniciarCursoEad_segundoPainel($config);
									$banner = false;
									if(empty($conteudo_aula)){
										$btn_inicio = false;
										if(isset($cont['link_inicio_curso'])&&!empty($cont['link_inicio_curso'])){
											$btn_inicio = '<br><br><a href="'.$cont['link_inicio_curso'].'" class="btn btn-secondary"><i class="fa fa-play"></i> Começar agora</a>';
										}
										$completema= '<style>.ini_curso .conteudo_aula{background-color:#ccc;min-height:354px;margin-bottom:5px;padding-top:150px}</style>';
										$tema = $completema.$tema;
										$conteudo_aula = '<div style="width:100%;"><h5 class="text-center">Você ainda não começou este curso'.$btn_inicio.'</h5></div>';
									}else{
										$conteudo_aula .= '<div id="mask-video"></div><div id="mask-video2"></div>';
									}
								}elseif(Url::getURL(nivel_url_site()+3)=='contrato' && is_clientLogado()){
									if(Url::getURL(nivel_url_site()+4)!=NULL){
										$_REQUEST['id_matricula'] = base64_decode(Url::getURL(nivel_url_site()+4));
									}
									$detalhesPagina = $this->contrato($_REQUEST);
									$tema = $detalhesPagina;
								}elseif(Url::getURL(nivel_url_site()+3)=='comprar'){
									$detalhesPagina = $ecomerce->comprar($_REQUEST);
									$tema = $detalhesPagina;
								}elseif(Url::getURL(nivel_url_site()+3)=='preview'){
									if(!is_adminstrator()){
										redirect('/',0);
										exit;
									}
									$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
									$tema = $temaHTML[0];
									$tema1 = $temaHTML[1];
									$tema6 = $temaHTML[6];
									$obs = false;
									$nome = false;
									$conteudo = 'Conteúdo da página';
									//$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
									$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : 0;
									$cont = $this->iniciarCursoEad(Url::getURL(nivel_url_site()+2));
									//$conteudo_pagina = 'teste';
									$conteudo_pagina = $cont['html'];
									$conteudo_aula = @$cont['conteudo_aula'];
									$nome_curso = @$cont['nome_curso'];
									$progresso_curso = @$cont['verificaProgressoAluno']['progress_bar'];
									$progress_bar_geral = @$cont['verificaProgressoAluno']['progress_bar_geral'];
									$btn_certificado = @$cont['verificaProgressoAluno']['btn_certificado'];
									$titleDuracao = @$cont['duracao'];

									//print_r($cont);
									$banner = false;
									$segundo_painel = $this->iniciarCursoEad_segundoPainel($config);
								}else{
									$detalhesCurso = $this->detalhesCurso($_REQUEST);
									$tema = $detalhesCurso['tema'];
									$conteudo_pagina = $detalhesCurso['conteudo_pagina'];
								}
						}
					}elseif(Url::getURL(nivel_url_site())=='preview' && Url::getURL(nivel_url_site()+1) =='modulo' && Url::getURL(nivel_url_site()+2) !=NULL){
						$detalhesCurso = $this->detalhesPreviewMoudulos($_REQUEST);
						$tema = $detalhesCurso['tema'];
						$conteudo_pagina = @$detalhesCurso['conteudo_pagina'];

					}
				}elseif(Url::getURL(nivel_url_site())!=NULL && Url::getURL(1) == NULL){
					if(Url::getURL(nivel_url_site())=='cursos'){
						$detalhesCurso = $this->frontCurso($_REQUEST);
						$tema = $detalhesCurso['html'];
						//$conteudo_pagina = $detalhesCurso['conteudo_pagina'];
					}elseif(Url::getURL(nivel_url_site())=='comprar'){
						$detalhesPagina = $ecomerce->comprar($_REQUEST);
						$tema = $detalhesPagina;
						//$conteudo_pagina = $detalhesCurso['conteudo_pagina'];
					}elseif(Url::getURL(nivel_url_site())=='obrigado-pela-compra'){
						$detalhesPagina = $ecomerce->agradecimento($_REQUEST);
						$tema = $detalhesPagina;
						//$conteudo_pagina = $detalhesCurso['conteudo_pagina'];
					}elseif(Url::getURL(nivel_url_site())=='consulta'){
						$detalhesPagina = $this->consulta($_REQUEST);
						$tema = $detalhesPagina;
						//$conteudo_pagina = $detalhesCurso['conteudo_pagina'];
					}elseif(Url::getURL(nivel_url_site())=='atendimento'){
						$detalhesPagina = $this->atendimento($_REQUEST);
						$tema = $detalhesPagina;
						//$conteudo_pagina = $detalhesCurso['conteudo_pagina'];
					}elseif(Url::getURL(nivel_url_site())=='area-do-aluno'){
						$tema = $this->areaDoAluno($_REQUEST);
						//$conteudo_pagina = $detalhesCurso['conteudo_pagina'];
					}

				}elseif(Url::getURL(nivel_url_site())==NULL){
					$config['arquivo'] = 'home';
					//$tema = $this->abrirPagina($config);
					$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/home.html'));
					$tema 	= $temaHTML[0];
					$config['condicao'] = " WHERE `ativo` = 's' AND `destaque`='s' ";
					$config['ordenar'] = " ORDER BY ordenar ASC";
					$reg_pg_destaque_site = queta_option('reg_pg_destaque_site')?queta_option('reg_pg_destaque_site'):3;
					$_GET['regi_pag'] = isset($_GET['regi_pag']) ? $_GET['regi_pag'] : $reg_pg_destaque_site;
					$cursos = $this->listCursosFront($config);
					$cursos_destaque	 = $cursos['lista_produtos'];
					$resumo_pagina	 = $cursos['resumo_pagina'];
					$paginacao_site	 = $cursos['paginacao_site'];
					$carrosel_home = $this->carrocelHome($_REQUEST);
					$tema = str_replace('{carrosel_home}',$carrosel_home,$tema);
				}
				$tema 			.= $this->alertaBottom($_REQUEST);//Alerta em baixo da página
				$tema 			.= $_REQUEST['editar_pagina'];//para editar uma pagina quando logado
				$tema 			.= $this->modalBootstrap('Jenela modal',true,'','janelaModal','modal-lg');
				if(is_adminstrator(3)){
					$tema 			.= '<script>$(function(){	carregaBtnConfigs();});</script>';
				}
				if(isset($_GET['ft'])){
					lib_print($config);
					dd($_REQUEST);
				}
				$ret 				= str_replace('{conteudo_pagina}',$conteudo_pagina,$tema);
				$ret 				= str_replace('{{conteudo}}',$conteudo_pagina,$ret);
				$ret 				= str_replace('{{grade_cursos}}',$conteudo_pagina,$ret);
				$ret 				= str_replace('{{cursos_destaque}}',$cursos_destaque,$ret);
				$ret 				= str_replace('{{paginacao_site}}',$paginacao_site,$ret);
				$ret 				= str_replace('{{resumo_pagina}}',$resumo_pagina,$ret);
				$ret 				= str_replace('{{conteudo_aula}}',$conteudo_aula,$ret);
				$ret				= str_replace('{nome_curso}',$nome_curso,$ret);
				$ret				= str_replace('{progresso_curso}',$progresso_curso,$ret);
				$ret				= str_replace('{progress_bar_geral}',$progress_bar_geral,$ret);
				$ret				= str_replace('{progress_provas_realizadas}',$progress_provas_realizadas,$ret);
				$ret				= str_replace('{progress_aproveitamento}',$progress_aproveitamento,$ret);
				$ret				= str_replace('{duracao}',$titleDuracao,$ret);
				$ret				= str_replace('{btn_certificado}',$btn_certificado,$ret);
				$ret				= str_replace('{{segundo_painel}}',$segundo_painel,$ret);
				$ret 				= str_replace('{titulo}',@$_REQUEST['nome'],$ret);
				$ret 				= str_replace('{meta_titulo}',@$_REQUEST['meta_titulo'],$ret);
				$ret 				= str_replace('{meta_descricao}',@$_REQUEST['meta_descricao'],$ret);
				$ret 				= str_replace('{obs}',@$_REQUEST['obs'],$ret);
				$ret 				= str_replace('{descricao}',@$_REQUEST['obs'],$ret);
				$ret 				= str_replace('{link_whatsapp}',short_code('link_whatsapp'),$ret);
		}

		return $ret;
	}
	public function alertaTop($config=false){
		$ret = false;
		if($config){
			$tema = '<div class="col-md-12 alertaTop">{conte}</div>';
			$conte = formatMensagemInfo('Alerta este é uma mensagem top exemplo','warning');
			$ret = str_replace('{conte}',$conte,$tema);
		}
		return $ret;
	}
	public function alertaBottom($config=false){
		$ret = false;
		if($config){
			$tema = '
			<style>
				.alertaBottom{
					padding: 0;
					position: fixed;
					bottom: 0;
					z-index: 14;
					margin-bottom: 0px;
					display:none;
				}
				.alertaBottom .alert{
					margin-bottom:0;
				}
			</style><div class="col-md-12 alertaBottom">{conte}</div>';//javascript em ead/js_front.js
			$mens = '<que>'.short_code('alertaBottom').'</que>';
			$conte = formatMensagemInfo($mens,'warning');
			$ret = str_replace('{conte}',$conte,$tema);
		}
		return $ret;
	}
	public function carrocelHome($config=false){
		$ret = false;
		if(isset($config['url_banner']) && is_array($config['url_banner'])){
			$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/home.html'));
			$carrocel_indicators = false;
			$carrocel_itens = false;
			$temaBox = isset($temaHTML[1]) ? $temaHTML[1] : false;
			$temaHTML[2] = isset($temaHTML[2]) ? $temaHTML[2] : false;
			$temaHTML[3] = isset($temaHTML[3]) ? $temaHTML[3] : false;
			$data_target = isset($config['url'])?$config['url']:'queta';
			foreach($config['url_banner'] As $key=>$val){
				if($key==0){
					$active = 'active';
				}else{
					$active = false;
				}
				$carrocel_itens .= str_replace('{url_imagem_item}',$val['url'],$temaHTML[3]);
				$carrocel_itens = str_replace('{active_img}',$active,$carrocel_itens);
				$carrocel_itens = str_replace('{alt_img}',$val['title'],$carrocel_itens);
				$carrocel_itens = str_replace('{info1}',$val['title'],$carrocel_itens);
				$carrocel_itens = str_replace('{info2}',$val['title2'],$carrocel_itens);
				$carrocel_itens = str_replace('{url_principal}',$this->urPrincipal,$carrocel_itens);
				$carrocel_indicators .= str_replace('{data_slide_to}',($key+1),$temaHTML[2]);
			}
			$ret = str_replace('{carrocel_indicators}',$carrocel_indicators,$temaBox);
			$ret = str_replace('{carrocel_itens}',$carrocel_itens,$ret);
			$ret = str_replace('{data_target}',$data_target,$ret);

		}
		return $ret;
	}
	public function paginaCategoriaCursos($config=false){
		$tema = carregaArquivo($this->pastaTema().'/pagina-categoria.html');
		$conteudo_pagina = $this->abrirPagina($config);
		$config['compleSql']=false;
		//if(isset($config['url']) && !empty($config['url'])){
		if(Url::getURL(1)!=NULL){
			$categoria = buscaValorDb($GLOBALS['tab9'],'url',Url::getURL(1),'token');
			$config['condicao'] = " WHERE `ativo` = 's'  AND categoria LIKE '%$categoria%' ";
			//$config['compleSql']=" AND categoria = '$categoria'";
		}
		$config['ordenar']=" ORDER BY `ordenar` ASC";
		$cursos = $this->listCursosFront($config);
		$cursos_grade	 = $cursos['lista_produtos'];
		$resumo_pagina	 = $cursos['resumo_pagina'];
		$paginacao_site	 = $cursos['paginacao_site'];
		//$cursos = $this->listProdutosFront($config);
		//$cursos_grade	 = $cursos['lista_produtos'];
		//$resumo_pagina	 = $cursos['resumo_pagina'];
		//$paginacao_site	 = $cursos['paginacao_site'];
		$categoria = ucfirst(buscaValorDb($GLOBALS['tab9'],'url',$config['url'],'nome'));
		$categoria = 'cursos';
		$subcategoria = false;
		if(Url::getURL(1)!=NULL){
			//$categoria = ucfirst(buscaValorDb($GLOBALS['tab9'],'url',Url::getURL(0),'nome'));
			$subcategoria = ucfirst(buscaValorDb($GLOBALS['tab9'],'url',Url::getURL(1),'nome'));
		}
		$ret['html'] = str_replace('{cards_produtos}',$cursos_grade,$tema);
		$ret['html'] = str_replace('{description}',$config['meta_descricao'],$ret['html']);
		$ret['html'] = str_replace('{descricao}',$config['obs'],$ret['html']);
		$ret['html'] = str_replace('{categoria}',$categoria,$ret['html']);
		$ret['html'] = str_replace('{subcategoria}',$subcategoria,$ret['html']);
		$ret['html'] = str_replace('{{paginacao_site}}',$paginacao_site,$ret['html']);
		$ret['cards_produtos'] = $cursos_grade;
		return $ret;
	}
	public function iniciarCursoEad_segundoPainel($config=false){
		$ret = false;
		if($config){
			$mensagem = new mensagem;
			$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
			$arr_menu = array(
				'visao_geral'=>array('lab'=>'Visão Geral','url'=>'visao_geral','class_display'=>''),
				'perguntas_respostas'=>array('lab'=>'Perguntas e respostas','url'=>'perguntas_respostas','class_display'=>''),
				'material_apoio'=>array('lab'=>'Material de apoio','url'=>'material_apoio','class_display'=>''),
			);
			$visao_geral = false;
			$material_apoio = false;
			if(Url::getURL(4)=='lecture' && Url::getURL(5)!=NULL){
				$id_atividade = base64_decode(Url::getURL(5));
				$dadosAtividade = dados_tab($GLOBALS['tab39'],'token,descricao,tipo',"WHERE id='".$id_atividade."'");
				if($dadosAtividade){
					if($dadosAtividade[0]['tipo']=='Apostila' || $dadosAtividade[0]['tipo']=='Artigo'){
						$visao_geral = false;
					}else{
						$visao_geral = $dadosAtividade[0]['descricao'];
					}
					$material_apoio = $this->apostilas($dadosAtividade[0]);
				}
			}
			$arr_conteudo = array(
				'visao_geral'=>$visao_geral,
				'perguntas_respostas'=>$mensagem->iniciarCursoEad_pergRespostas($config),
				'material_apoio'=>$material_apoio,
			);
			//dd($arr_conteudo);
			$nav = false;
			$con = false;
			$tab = false;
			$con_tab = false;
			$i = 0;
			foreach($arr_conteudo As $k=>$v){
				if(empty($v)){
					unset($arr_menu[$k]);
				}
			}
			foreach($arr_menu As $kei=>$val){
				$class_display = $val['class_display'];
				if($i==0){
					$active_nv = 'show active';
					$active = 'active';
				}else{
					$active_nv = false;
					$active = false;
				}
				$active_nv .= $class_display;
				$active .= $class_display;

				$con  = str_replace('{label}',$val['lab'],$temaHTML[7]);
				$con  = str_replace('{url}','#'.$val['url'],$con);
				$con  = str_replace('{url_sr}',$val['url'],$con);
				$con  = str_replace('{active}',$active,$con);
				$nav .= $con;
				$tab = str_replace('{url_nav}',$val['url'],$temaHTML[8]);
				$tab = str_replace('{active}',$active_nv,$tab);
				$tab = str_replace('{cont_tab}',$arr_conteudo[$val['url']],$tab);
				$con_tab .= $tab;
				$i++;
			}
			$ret = str_replace('{nav_segundo_painel}',$nav,$temaHTML[6]);
			$ret = str_replace('{conteudo_tab}',$con_tab,$ret);
		}
		return $ret;
	}
	public function temaCursosGrade($config=false){
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/grade_cursos.html'));
		$ret = trim($temaHTML[0]);
		return $ret;
	}
	public function temaCursosLista($config=false){
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/grade_cursos.html'));
		$ret = $temaHTML[1];
		return $ret;
	}
	public function minhasNotas($config=false){
		$ret['exec'] = false;
		$ret['html'] = false;
		if($config['id_cliente']){
			$sql = "SELECT m.*,c.titulo nome_curso FROM ".$GLOBALS['tab12']." As m
			JOIN ".$GLOBALS['tab10']." As c ON m.id_curso = c.id
			WHERE m.id_cliente='".$config['id_cliente']."' AND m.status>'1' AND ".compleDelete('m') ;
			$ret['sql'] = $sql;
			$cursos = buscaValoresDb($sql);
			// $ret['cursos'] = $cursos;
			$temaHTML = (new EAD)->temaAdminEAD();
			$tm = isset($temaHTML[1]) ? $temaHTML[1] : '<div class="row">{select}{conteudo}</div>';
			if($cursos){
				$op = false;
				$arr_select = array();
				foreach ($cursos as $ks => $vs) {
					$arr_select[$vs['token']] = $vs['nome_curso'];
				}
				$cf['select_form'] = array('type'=>'select','size'=>'12','campos'=>'curso-Selecione o curso','opcoes'=>$arr_select,'selected'=>@array(@$_GET['curso'],''),'css'=>'','event'=>'required onchange="ead_selecHistorico(this.value);"','obser'=>false,'outros'=>false,'class'=>'form-control','acao'=>'','sele_obs'=>'-- Selecione--','title'=>'');
				$select = formCampos($cf);
				$header_page = __translate('Histórico do aluno',true);
				$ret['html'] = str_replace('{header_page}',$header_page,$tm);
				$ret['html'] = str_replace('{select}',$select,$ret['html']);
			}
		}
		return $ret;
	}
	/**
	 * Metodo para pegar o conteudo do curso somente atividades
	 * @var string contendo o token
	 * @return array
	 */
	public function get_curse_content($curse_id=false,$type=false,$obrigatorio=false){
		$ret = false;
		$ret['dm'] = false; //dados da matricula
		$ret['mod_exibe'] = false; //dados da matricula
		$dm = Escola::dadosMatricula($curse_id);
		if(isset($dm[0]) && ($v=$dm[0]) && $type){
			$ret['dm'] = $v;
			$arr_mod = [];
			if(!empty($v['conteudo'])){
				$arr_mod = lib_json_array($v['conteudo']);
				if(is_array($arr_mod)){
					foreach ($arr_mod as $km => $vm) {
						// Seleciona os Modulos
						$d_mod = dados_tab($vm['tab'],'conteudo,id,nome',"WHERE id='".@$vm['idItem']."' AND ".compleDelete());
						if(isset($d_mod[0]['conteudo']) && !empty($d_mod[0]['conteudo'])){
							$arr_atv = lib_json_array($d_mod[0]['conteudo']);
							if(is_array($arr_atv)){

								foreach ($arr_atv as $ka => $va) {
									// Seleciona as atividades
									$d_atv = dados_tab($va['tab'],'config,tipo,nome,id,token',"WHERE id='".@$va['idItem']."' AND ".compleDelete());
									if($obrigatorio&& $obrigatorio=='s'){
										if(isset($d_atv[0]['config']) && !empty($d_atv[0]['config'])){
											$d_atv[0]['config'] = lib_json_array($d_atv[0]['config']);
										}
										if(isset($d_atv[0]) && $d_atv[0]['tipo']==$type && isset($d_atv[0]['config']['obrigatorio'])&&$d_atv[0]['config']['obrigatorio']=='s'){
											$ret[$vm['idItem']][$ka] = $d_atv[0];
											$ret['mod_exibe'][$km] = $d_mod[0];
										}
									}else{
										if(isset($d_atv[0]) && $d_atv[0]['tipo']==$type){
											if(isset($d_atv[0]['config']) && !empty($d_atv[0]['config'])){
												$d_atv[0]['config'] = lib_json_array($d_atv[0]['config']);
											}
											$ret[$vm['idItem']][$ka] = $d_atv[0];
											$ret['mod_exibe'][$km] = $d_mod[0];
										}
									}
								}
							}
						}
						// $ret['d_mod'] = $d_mod;
						// $ret['da'][$km] = $da;
					}
				}
			}
			// echo ;

		}
		return $ret;
	}
	/**
	 * Metodo para exibir o histórico de notas dos alunos no frontend
	 * @var array
	 * @return array
	 */
	public function selecHistorico($config=false){
		$ret['exec']=false;
		$ret['config'] = $config;
		$ret['html'] = false;
		$ret['resultado'] = [
			'total_atividades'=>0,
			'total_questoes'=>0,
			'total_respondido'=>0,
			'total_pontos'=>0,
			'totalAlcancado'=>0,
		];
		$footer = false;
		if(isset($config['id_matricula'])){
			$token_matricula = $config['id_matricula'];
			// $ret['token_matricula'] = $token_matricula;
			$dm = $this->get_curse_content($token_matricula,'Prova','s');
			$ret['dm'] = $dm;
			// lib_print($dm);
			$freq = new frequencia;
			$tema = $freq->layout('front');
			$tm0 = $tema[0];
			// lib_print($dm);
			$conteudo = false;
			$html = false;
			if(isset($dm['mod_exibe']) && isset($dm['dm']['id']) && is_array($dm['mod_exibe'])){
				foreach ($dm['mod_exibe'] as $k => $v) {
					$v['tipo'] = 'Prova';
					$v['obrigatorio'] = 's';
					$cont = $freq->listaAtividades($v,$id_matricula=$dm['dm']['id'],$opc='front');
					// if (isset($_GET['fq'])) {
					// 	dd($cont);
					// }
					if(isset($cont['html'])){
						$html .= str_replace('{body}',$cont['html'],$tm0);
						// $html = str_replace('{header}',$v['nome'],$html);
						$html = str_replace('{header}','',$html);
						$footer = '';
						$html = str_replace('{footer}',$footer,$html);
					}
					if(isset($cont['resultado']['total_atividades'])!=0){
						$ret['resultado']['total_atividades'] += $cont['resultado']['total_atividades'];
					}
					if(isset($cont['resultado']['total_respondido'])!=0){
						$ret['resultado']['total_respondido'] += $cont['resultado']['total_respondido'];
					}
					if(isset($cont['resultado']['total_pontos'])!=0){
						$ret['resultado']['total_pontos'] += $cont['resultado']['total_pontos'];
					}
					if(isset($cont['resultado']['totalAlcancado'])!=0){
						$ret['resultado']['totalAlcancado'] += $cont['resultado']['totalAlcancado'];
					}
				}
			}

			if(!$html){
				$html = '<div class="col-12">'.formatMensagemInfo('Nenhum histórico encontrado!','warning').'</div>';
			}
			$footer = '<div class="row"><div class="col-12"><h6 style="font-weight:bold">Resumo:</h6></div>{con}</div>';
			$tf2 = '<div class="col-6"><b>{lab}:</b> {val}</div>';
			$con = false;
			if(isset($ret['resultado']['total_atividades'])){
				$con .= str_replace('{lab}','Provas',$tf2);
				$con = str_replace('{val}',$ret['resultado']['total_atividades'],$con);
			}
			$t_pontos = NULL;
			$t_alcancado = NULL;
			if(isset($ret['resultado']['total_pontos'])){
				$con .= str_replace('{lab}','Total de pontos',$tf2);
				$t_pontos = $ret['resultado']['total_pontos'];
				$con = str_replace('{val}',$t_pontos,$con);
			}
			if(isset($ret['resultado']['totalAlcancado'])){
				$t_alcancado = $ret['resultado']['totalAlcancado'];
				$con .= str_replace('{lab}','Pontos Alcançados',$tf2);
				$con = str_replace('{val}',$t_alcancado,$con);
			}
			if($t_pontos && $t_alcancado){
				$prov = 70;
				$apov = ($t_alcancado*100)/$t_pontos;

				$con .= str_replace('{lab}','Aproveitamento',$tf2);
				$con = str_replace('{val}',number_format($apov,2,'.','').'%',$con);

			}
			$footer = str_replace('{con}',$con,$footer);
			$nome_curso = isset($dm['dm']['nome_curso']) ? $dm['dm']['nome_curso'] : '';
			$ret['html'] = str_replace('{body}',$html,$tm0);
			$ret['html'] = str_replace('{header}',$nome_curso,$ret['html']);
			$ret['html'] = str_replace('{footer}',$footer,$ret['html']);
			// if (isset($_GET['fq'])) {
			// 	# code...
			// 	dd($ret);
			// }
		}
		return $ret;
	}
	public function meusCursos($config=false){
		$ret = false;
		if($config['id_cliente']){
			$sql = "SELECT * FROM ".$GLOBALS['tab12']." WHERE id_cliente='".$config['id_cliente']."' AND `status`>'1' AND ".compleDelete() ;
			$ret['sql'] = $sql;
			$cursos = buscaValoresDb($sql);
			$ret['html'] = false;
			if($cursos){
				$ret['html'] .= '<div class="col-md-12 title-meus-cursos"><h4>Seus cursos recentes</h4></div>';
				// dd($cursos);
				foreach($cursos As $kei=>$val){
					$condicao = " WHERE `id` = '".$val['id_curso']."' AND ".compleDelete();
					$ordenar = " ORDER BY `ordenar` ASC";
					$dadosProdutos = $this->dadosFiltroCursos2($condicao,$ordenar,$GLOBALS['tab10']);
					$ret['html'] .= $this->foreash_cursos2($dadosProdutos['produtos_page'],$this->temaCursosGrade());
				}
			}
			//$ret['cursos'] = $cursos;
		}
		return $ret;
	}
	public function meusPedidos($config=false){
		$ret = false;
		if($config['id_cliente']){
			$sql = "SELECT * FROM ".$GLOBALS['tab12']." WHERE id_cliente='".$config['id_cliente']."' AND `status`='1' AND ".compleDelete() ;
			$ret['sql'] = $sql;
			$cursos = buscaValoresDb($sql);
			$ret['html'] = false;
			if($cursos){
				$ret['html'] .= '<div class="col-md-12 title-mani-interesse"><h5>Cursos que você mostrou interesse</h5></div>';
				foreach($cursos As $kei=>$val){
					$condicao = " WHERE `id` = '".$val['id_curso']."' AND ".compleDelete();
					$ordenar = " ORDER BY `ordenar` ASC";
					$dadosProdutos = $this->dadosFiltroCursos2($condicao,$ordenar,$GLOBALS['tab10']);
					$ret['html'] .= $this->foreash_cursos($dadosProdutos['produtos_page'],$this->temaCursosGrade());
				}
			}
			$sql2 = "SELECT * FROM ".$GLOBALS['tab12']." WHERE id_cliente='".$config['id_cliente']."' AND `status`='2' AND ".compleDelete() ;
			$ret['sql2'] = $sql2;
			$cursos = buscaValoresDb($sql2);
			if($cursos){
				$ret['html'] .= '<div class="col-md-12 title-mani-matriculado"><h5>Cursos que você está matriculado</h5></div>';
				foreach($cursos As $kei=>$val){
					$condicao = " WHERE `id` = '".$val['id_curso']."' AND ".compleDelete();
					$ordenar = " ORDER BY `ordenar` ASC";
					$dadosProdutos = $this->dadosFiltroCursos2($condicao,$ordenar,$GLOBALS['tab10']);
					$ret['html'] .= $this->foreash_cursos($dadosProdutos['produtos_page'],$this->temaCursosGrade());
				}
			}
			//$ret['cursos'] = $cursos;
		}
		return $ret;
	}
	public function minhasFaturas($config=false){
		$ret = false;
		if($config['id_cliente']){
			//$sql = "SELECT * FROM ".$GLOBALS['tab12']." WHERE id_cliente='".$config['id_cliente']."' AND `status`>'1' AND ".compleDelete() ;
			$sql = "SELECT * FROM ".$GLOBALS['tab12']." WHERE id_cliente='".$config['id_cliente']."' AND (`pagamento_asaas`!='' OR status>'1') AND ".compleDelete() ;
			$ret['sql'] = $sql;
			$cursos = buscaValoresDb($sql);
			$ret['html'] = false;
			if($cursos){
				$ret['html'] .= '<div class="col-md-12 title-meus-cursos"><h4>Seus cursos recentes</h4></div>';
				foreach($cursos As $kei=>$val){
					$condicao = " WHERE `id` = '".$val['id_curso']."' AND ".compleDelete();
					$ordenar = " ORDER BY `ordenar` ASC";
					$dadosProdutos = $this->dadosFiltroCursos2($condicao,$ordenar,$GLOBALS['tab10']);
					$ret['html'] .= $this->foreash_cursos($dadosProdutos['produtos_page'],$this->temaCursosLista());
				}
			}
			//$ret['cursos'] = $cursos;
		}
		return $ret;
	}
	public function perfil($config=false){
		$ret = false;
		$ret['html'] = false;
		if($config['id_cliente']){
			$sql = "SELECT * FROM ".$GLOBALS['tab12']." WHERE id_cliente='".$config['id_cliente']."' AND `status`>'1' AND ".compleDelete() ;
			$ret['sql'] = $sql;
			$cursos = buscaValoresDb($sql);
			$config['acao']='alt';
			$ret['html'] = $this->frm_editPerfil($config);
			/*if($cursos){
				$ret['html'] .= '<div class="col-md-12 title-meus-cursos"><h4>Seus cursos recentes</h4></div>';
				foreach($cursos As $kei=>$val){
					$condicao = " WHERE `id` = '".$val['id_curso']."' AND ".compleDelete();
					$ordenar = " ORDER BY `ordenar` ASC";
					$dadosProdutos = $this->dadosFiltroCursos2($condicao,$ordenar,$GLOBALS['tab10']);
					$ret['html'] .= $this->foreash_cursos($dadosProdutos['produtos_page'],$this->temaCursosLista());
				}
			}*/
			//$ret['cursos'] = $cursos;
		}
		return $ret;
	}
	public function proposta($config=false,$id_matricula=false){
		$ret = false;
		$ret['html'] = false;
		if($config['id_cliente']&&$id_matricula){
			$ecomerce = new ecomerce;
			$sql = "SELECT * FROM ".$GLOBALS['tab12']." WHERE id_cliente='".$config['id_cliente']."' AND `status`<='2' AND id='".$id_matricula."'  AND ".compleDelete() ;
			$ret['sql'] = $sql;
			$dadosMatricula = buscaValoresDb($sql);
			//$config['acao']='alt';
			//$ret['html'] = $this->frm_editPerfil($config);
			if($dadosMatricula){
				$dadosCliente = dados_tab($GLOBALS['tab15'],'Nome,sobrenome',"WHERE id='".$config['id_cliente']."'");
				$dadosCurso = dados_tab($GLOBALS['tab10'],'nome,titulo,valor,parcelas',"WHERE id='".$dadosMatricula[0]['id_curso']."'");
				//print_r($dadosMatricula);exit;
				//$tema = '<div >';
				if($dadosCliente && $dadosCurso){
					$tema = short_code('poposta_modelo');
					/*$tema = '<div class="col-md-12 title-proposta"><h4>{id_proposta} - {titulo}</h4></div>';
					$tema .= '
							<style>
								p{
									margin-bottom:0px;
								}
							</style>
							<!--
							<div class="col-md-12 cab-proposta">
								<p>Cliente: {nome_cliente}</p>
								<p>Data: {data_proposta} Validade: {validade_proposta} </p>
								<p>Telefone: {telefone_cliente} Email: {email_cliente} </p>
							</div>-->
							<div class="col-md-12 cab-proposta">
								<p>Prezado: <b>{nome_cliente}</b>,<br> Temos o prazer de lhe apresentar nossa proposta comercial</p>
								<p>Curso: <b>{curso}</b> {turma}</p>
								<p>Data: {data_proposta} Validade: {validade_proposta} </p>
							</div>
							<div class="col-md-12 corpo-proposta">
								{tabela_orcamento}
							</div>
							<div class="col-md-12 pe-proposta">
								{contato_atendente}
								{btns_acao}
							</div>
							';
					*/
					/*foreach($cursos As $kei=>$val){
						$condicao = " WHERE `id` = '".$val['id_curso']."' AND ".compleDelete();
						$ordenar = " ORDER BY `ordenar` ASC";
						$dadosProdutos = $this->dadosFiltroCursos2($condicao,$ordenar,$GLOBALS['tab10']);
						$ret['html'] .= $this->foreash_cursos($dadosProdutos['produtos_page'],$this->temaCursosLista());
					}*/
					$cupom = new Cupom; //declarado em app/config2
					//$carregaCupom				= $cupom->carregaCupom($config['id_curso']);
					//$carregaCupomCodigo 		= $cupom->carregaCupom($config['id_curso'],'codigo');
					$carregaCupomCurso 		= $cupom->carregaCupom($dadosMatricula[0]['id_curso'],'todos','valor_curso');
					//$carregaCupomCodigoCurso 	= $cupom->carregaCupom($config['id_curso'],'codigo','valor_curso');
					$titulo = 'Proposta Comercial';
					$clinte = $dadosCliente[0]['Nome'].' '.$dadosCliente[0]['sobrenome'];
					$nome = $dadosCliente[0]['Nome'];
					$curso = $dadosCurso[0]['titulo'];
					$valor = $dadosCurso[0]['valor'];
					$inicio = false;
					$fim = false;
					$dia = date('d');
					$meses = Meses();
					$ano = date('Y');
					$mes_extensso = $meses[date('m')];
					$operador = false;
					if($dadosMatricula[0]['autor']>0){
						$dadosOpe = buscaValoresDb_SERVER("SELECT nome,sobrenome FROM usuarios_sistemas WHERE id ='".$dadosMatricula[0]['autor']."' AND ativo='s' AND ".compleDelete());
						if($dadosOpe){
							$operador = $dadosOpe[0]['nome'].' '.$dadosOpe[0]['sobrenome'];
						}
					}
					if(isset($carregaCupomCurso['valores']['inicio'])){
						$inicioA = explode('-',$carregaCupomCurso['valores']['inicio']);
						$inicio = $inicioA[0];
					}
					if(isset($carregaCupomCurso['valores']['inicio'])){
						$fimA = explode('-',$carregaCupomCurso['valores']['fim']);
						$fim = $fimA[0];
					}
					$moeda = 'R$';
					$turma = buscaValorDb($GLOBALS['tab11'],'id',$dadosMatricula[0]['id_turma'],'nome');
					/*if($turma){
						$turma = ' - '.$turma;
					}*/
					$total = $valor;
					if(isSchool()){
						$temaTabela = '
						<div class="table-responsive">
							<table class="table">
								<tbody>
								{conteudo}
								</tbody>
								<tfoot>
									<tr>
										<td>
											<div align="left">Total</div>
										</td>
										<td>
											<div align="right">{moeda} {total}</div>
										</td>
									</tr>
									{btnAcao}
								</tfoot>
							</table>
						</div>
						';
						$temaTabela2 = '
						<tr>
										<td>
											<div align="left">{item} <small>{subitem}</small></div>
										</td>
										<td>
											<div align="right">{moeda} {valor}</div>
										</td>
						</tr>
						';
						$conteudo = false;
						$conteudo .= str_replace('{item}',$curso,$temaTabela2);
						$conteudo = str_replace('{subitem}',$turma,$conteudo);
						$conteudo = str_replace('{valor}',number_format($valor,2,',','.'),$conteudo);
						$conteudo = str_replace('{moeda}',$moeda,$conteudo);

						if(isset($carregaCupomCurso['valores']['reducao'])&&isset($carregaCupomCurso['valores']['valorAnterior'])&&isset($carregaCupomCurso['valores']['valor'])){
							$valorDesconto = $carregaCupomCurso['valores']['valor'];
							$reducao = $carregaCupomCurso['valores']['reducao'];
							if($carregaCupomCurso['valores']['valorAnterior']<>$valorDesconto){
								$conteudo .= str_replace('{item}','Desconto promocional',$temaTabela2);
								$conteudo = str_replace('{subitem}','',$conteudo);
								$conteudo = str_replace('{valor}',number_format($reducao,2,',','.'),$conteudo);
								$conteudo = str_replace('{moeda}',$moeda,$conteudo);
								$conteudo .= str_replace('{item}','Subtotal',$temaTabela2);
								$conteudo = str_replace('{subitem}','',$conteudo);
								$conteudo = str_replace('{valor}',number_format($valorDesconto,2,',','.'),$conteudo);
								$conteudo = str_replace('{moeda}',$moeda,$conteudo);
							}
							$total = $total - $reducao;
						}
					}
					if(isAero()){
						echo 'ead/func lin 5056';
						//print_r();
						$temaTabela = '
						<div class="table-responsive" id="proposta">
							<table class="table">
								<tbody>
								{conteudo}
								</tbody>
								<tfoot>
									<tr>
										<td>
											<div align="left">Total</div>
										</td>
										<td>
											<div align="right">{moeda} {total}</div>
										</td>
									</tr>
									{btnAcao}
								</tfoot>
							</table>
						</div>
						';
						$temaTabela2 = '
						<tr>
										<td>
											<div align="left">{item} <small>{subitem}</small></div>
										</td>
										<td>
											<div align="right">{moeda} {valor}</div>
										</td>
						</tr>
						';
						$conteudo = false;
						$conteudo .= str_replace('{item}',$curso,$temaTabela2);
						$conteudo = str_replace('{subitem}',$turma,$conteudo);
						$conteudo = str_replace('{valor}',number_format($valor,2,',','.'),$conteudo);
						$conteudo = str_replace('{moeda}',$moeda,$conteudo);

						if(isset($carregaCupomCurso['valores']['reducao'])&&isset($carregaCupomCurso['valores']['valorAnterior'])&&isset($carregaCupomCurso['valores']['valor'])){
							$valorDesconto = $carregaCupomCurso['valores']['valor'];
							$reducao = $carregaCupomCurso['valores']['reducao'];
							if($carregaCupomCurso['valores']['valorAnterior']<>$valorDesconto){
								$conteudo .= str_replace('{item}','Desconto promocional',$temaTabela2);
								$conteudo = str_replace('{subitem}','',$conteudo);
								$conteudo = str_replace('{valor}',number_format($reducao,2,',','.'),$conteudo);
								$conteudo = str_replace('{moeda}',$moeda,$conteudo);
								$conteudo .= str_replace('{item}','Subtotal',$temaTabela2);
								$conteudo = str_replace('{subitem}','',$conteudo);
								$conteudo = str_replace('{valor}',number_format($valorDesconto,2,',','.'),$conteudo);
								$conteudo = str_replace('{moeda}',$moeda,$conteudo);
							}
							$total = $total - $reducao;
						}
					}
					$parcelamento = false;
					if($dadosCurso[0]['parcelas']>0){
						$parcelamento = round($total/$dadosCurso[0]['parcelas'],2) ;
						$parcelamento = '<div align="right" class="bolt"><b>'.zerofill($dadosCurso[0]['parcelas'],2) .' X '.$moeda.' '.$parcelamento.'</b></div>';
						//echo $dadosCurso[0]['parcelas'];exit;
					}
					$btnAcao = false;

					$btn_comprar = $ecomerce->btnComprar(array('id_produto'=>$dadosMatricula[0]['id_curso'],true));
					//$link_comprar =
					$btnAcao = str_replace('{item}',$parcelamento,$temaTabela2);
					$btnAcao = str_replace('{subitem}','',$btnAcao);
					$btnAcao = str_replace('{valor}',$btn_comprar,$btnAcao);
					$btnAcao = str_replace('{moeda}','',$btnAcao);
					$tabela_orcamento = str_replace('{conteudo}',$conteudo,$temaTabela);
					$tabela_orcamento = str_replace('{total}',number_format($total,2,',','.'),$tabela_orcamento);
					$tabela_orcamento = str_replace('{moeda}',$moeda,$tabela_orcamento);

					$ret['html'] = str_replace('{titulo}',$titulo,$tema);
					$ret['html'] = str_replace('{id_proposta}',$dadosMatricula[0]['id'],$ret['html']);
					$ret['html'] = str_replace('{cliente}',$clinte,$ret['html']);
					$ret['html'] = str_replace('{inicio}',$inicio,$ret['html']);
					$ret['html'] = str_replace('{fim}',$fim,$ret['html']);
					$ret['html'] = str_replace('{dia}',$dia,$ret['html']);
					$ret['html'] = str_replace('{ano}',$ano,$ret['html']);
					$ret['html'] = str_replace('{mes_extensso}',strtolower(ucwords($mes_extensso)),$ret['html']);
					$ret['html'] = str_replace('{nome_cliente}',$nome,$ret['html']);
					$dataProposta = dataExibe($dadosMatricula[0]['data_matricula']);
					$ret['html'] = str_replace('{data_proposta}',$dataProposta,$ret['html']);
					$ret['html'] = str_replace('{curso}',$curso,$ret['html']);
					$ret['html'] = str_replace('{operador}',$operador,$ret['html']);
					$ret['html'] = str_replace('{turma}',$turma,$ret['html']);
					$ret['html'] = str_replace('{tabela_orcamento}',$tabela_orcamento,$ret['html']);
					$ret['html'] = str_replace('{btnAcao}',$btnAcao,$ret['html']);
					if(!empty($ret['html'])){
						$_SESSION[SUF_SYS][TK_CONTA]['origem'] = 'proposta';
					}
					//$ret['html'] = str_replace('{nome_cliente}',$nome,$ret['html']);
				}
			}
			//$ret['cursos'] = $cursos;
		}
		return $ret;
	}
	/**
	 * Metodo para exibir uma imagem de capa na atividade
	 * @param string $token_capa, string $tipo = tipo de atividade, array $configAula
	 * @return string $ret
	 */
	public function exibe_capa_atividade($token_capa,$tipo='Video',$configAula=[]){
		$ret = '';
		$ret = '';
		if(!$token_capa){
			return false;
		}
		//Verificar se existe algum registro que a aula ja foi exibida antes
		if(isset($configAula['id_cliente']) && isset($configAula['id_atividade']) && isset($configAula['id_matricula'])){
			$registro = dados_tab($GLOBALS['tab47'],'config',"WHERE id_cliente='".$configAula['id_cliente']."' AND id_atividade='".$configAula['id_atividade']."' AND id_matricula='".$configAula['id_matricula']."' ");
			if($registro){
				$arr_registro = json_decode($registro[0]['config'],true);
				if(isset($arr_registro['seconds'])&&$arr_registro['seconds']>0){
					//video ja foi iniciado
					return false;
				}
			}
		}
		if($tipo == 'Video'){
			$token_capa .= '_capa';

			$capaBanner = dadosImagemModGal('arquivo',"id_produto = '".$token_capa."'");
			if(isset($_GET['fq'])){
				lib_print($capaBanner);
				// dd($token_capa);
			}
			if(isset($capaBanner[0]['url']) && ($url = $capaBanner[0]['url']) ){
				$top = 75;
				if(isAero()){
					$top = 101;
				}
				$style = '
				<style>
				.capa-video{
					z-index: 101;
					background-image:url(\''.$url.'\');
					width:91%;
					position:absolute;
					height:435px;
					padding-top:160px;
					top:119px;
					left:18px;
					background-size: cover;
				}
				.btn-div-capa{
					margin: 0 auto;
					width: 54px;
				}
				@media (min-width: 768px) {
					.capa-video{
						background-image:url(\''.$url.'\');
						width:91%;
						position:absolute;
						height:410px;
						padding-top:160px;
						top:'.$top.'px;
						left:30px;
						background-size: cover;
					}
					.btn-div-capa{
						margin: 0 auto;
    					width: 54px;
					}
				}
				</style>
				';
				$ret = $style. '

				<div class="capa-video" style="">
					<div class="btn-div-capa" style=""><button onclick="inicia_video()"; class="btn btn-light" type="button"><i class="fa fa-play-circle fa-2x"></i></button></div>
				</div>
				<script>
					function inicia_video(){
						$(\'.capa-video\').hide();
					}
				</script>
				';
				// dd($token_capa);
			}

		}
		return $ret;
	}
	public function iniciarCursoEad($url_curso=false){
		global $tk_conta;
		$id_cliente = isset($_SESSION[$tk_conta]['id'.SUF_SYS])? $_SESSION[$tk_conta]['id'.SUF_SYS]:0;
		$ret = false;
		$ret['exec'] = false;
		$ret['html'] = '<style>#js-media-player{min-height:350px}</style>';
		$ret['nome_curso'] = false;
		$ret['conteudo_aula'] = '';
		$ret['duracao'] = false;
		$ret['link_inicio_curso'] = false;
		$col_show = false;
		if(($id_cliente || is_adminstrator()) && $url_curso){
			//$sql="SELECT * FROM ".$GLOBALS['tab10']." WHERE  `id`='".base64_decode($id_curso)."' ";
			$sql="SELECT * FROM ".$GLOBALS['tab10']." WHERE  `url`='".$url_curso."' ";
			$dados 		= buscaValoresDb($sql);
			if($dados){
				$ead = new Ead;
				$ret['nome_curso'] = $dados[0]['titulo'];
				$id_curso = $dados[0]['id'];
				$token_curso = $dados[0]['token'];
				$resumoConteudoCurso = $ead->resumoConteudoCurso($id_curso);
				if(isset($resumoConteudoCurso['duracaoHora'])&& !empty($resumoConteudoCurso['duracaoHora'])){
					$duracaoTitleHtml = $resumoConteudoCurso['duracaoTitleHtml'];
					$tem = '<label>{label}</label> <span>{nome}</span>';
					$ret['duracao'] = str_replace('{label}','Duração: ',$tem);
					$ret['duracao'] = str_replace('{nome}',$resumoConteudoCurso['duracaoHora'].' '.$duracaoTitleHtml,$ret['duracao']);
				}
				//$ret['']
				if(!empty($dados[0]['conteudo']) && !is_array($dados[0]['conteudo'])){
					if($dados[0]['categoria']!='cursos_online' && $dados[0]['categoria']!='cursos_semi_presencias'){
						$ret['html'] = formatMensagem('Atenção Este curso não é on-line','warning');
						// echo $dados[0]['categoria'];
					}
					if(is_clientLogado()){
						$verificarCursoComprado = $this->verificarCursoComprado($dados[0]['id']);

							if($verificarCursoComprado && ($dados[0]['categoria']=='cursos_online' || $dados[0]['categoria']=='cursos_presencias' || $dados[0]['categoria']=='cursos_semi_presencias' || $dados[0]['categoria']=='cursos_presencias_teorico')){
									$ret['verificaAlunoMatricula'] = verificaAlunoMatricula($id_cliente,$local=false); //declarado em app/cursos
									$ret['verifica_validade'] = $this->verificaValidade($verificarCursoComprado['dados']);
									/**inicio Verifica se está ativa*/
									if(isset($verificarCursoComprado['dados']['status']) && $verificarCursoComprado['dados']['status']==6){
										$verificarCursoComprado['dados']['ativo'] = 'n';
									}
									if(isset($verificarCursoComprado['dados']['ativo']) && $verificarCursoComprado['dados']['ativo']=='n'){
										$ret['html'] = false;
										$men = formatMensagemInfo('Esta matrícula está com a validade vencida, por favor entre em contato com o nosso suporte <a href="/atendimento/contato" class="btn btn-primary">Contato</a>','danger',900000);
										$ret['conteudo_aula'] = '<div style="width:100%;min-height:350px">'.$men.'</div>';
										return $ret;
									}
									/**fim Verifica se está ativa*/
									if(isAero()){
										//verificar se assinou o contrato
										// if(isset($_GET['fq'])){
											$cont = (new temaEAD)->verificarAssinatura(@$verificarCursoComprado['dados']['token'],$verificarCursoComprado['dados']);
											if($cont){
												//redireciona para página de contrato para aceitação
												echo $cont;
												$men = formatMensagemInfo('Contrato não assinado','danger',900000);
												$ret['conteudo_aula'] = '<div style="width:100%;min-height:350px">'.$men.'</div>';
												return $ret;
											}
											// if(isset($cont['aceito'])){
											// 	if(!$cont['aceito']){
											// 		//redireciona para página de contrato para aceitação
											// 		$men = formatMensagemInfo('Contrato não assinado','danger',900000);
											// 		$ret['conteudo_aula'] = '<div style="width:100%;min-height:350px">'.$men.'</div>';
											// 		return $ret;
											// 	}
											// }
											// lib_print($verificarCursoComprado);
											// lib_print($cont);
										// }

									}

									if(!$ret['verificaAlunoMatricula']['liberado']){
										$ret['html'] = $ret['verificaAlunoMatricula']['mens'];


										$ret['html'] .= '
										<style>
											.modal-lg, .modal-xl {
												max-width: 90%;
											}
										</style>
										<script>
											jQuery(function(){
												//verificaAlunoMatricula(\''.@$verificarCursoComprado['dados']['id'].'\');
											});
										</script>
										';
										return $ret;
									}
									//o aluno tem o curso
									if(!empty($dados[0]['config'])){
										$arr_config = json_decode($dados[0]['config'],true);
										if(isset($arr_config['libera_conteudo']['tipo_inicio'])){
											/*Verificar se a turma dele esta liberada*/
											if($arr_config['libera_conteudo']['tipo_inicio']=='inicio_turma'){
												$inicioTurmaAluno = buscaValorDb($GLOBALS['tab11'],'id',$verificarCursoComprado['dados']['id_turma'],'inicio');
												$hojest = strtotime(date('Y-m-d'));
												if($inicioTurmaAluno && strtotime($inicioTurmaAluno) > $hojest){
													$ret['html'] = '<div class="col-sm-12">'.formatMensagem('<b>Atenção</b> Prezado(a) <b>'.buscaValorDb($GLOBALS['tab15'],'id',$id_cliente,'Nome').'</b>, sua turma começará em '.dataExibe($inicioTurmaAluno).' qualquer dúvida entre em contato com o <a href="/atendimento" >suporte</a>','warning',700000).'</div>';
													return $ret;
												}
											}
										}
									}
									$ret['verificaProgressoAluno'] = $this->verificaProgressoAluno($verificarCursoComprado['dados']);
									$ret['resumoCurso'] = $this->resumoCurso($verificarCursoComprado['dados']);
									$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
									if(isset($verificarCursoComprado['dados']['id_turma']) && $verificarCursoComprado['dados']['id_turma']>0){
										$dadosTurma = dados_tab($GLOBALS['tab11'],'nome,inicio,fim'," WHERE id='".$verificarCursoComprado['dados']['id_turma']."'");
										if($dadosTurma)
										$ret['nome_curso'] .= ' - '.$dadosTurma[0]['nome'].' <b>Início:</b> <span>'.dataExibe($dadosTurma[0]['inicio']).' </span><b>Fim:</b> <span>'.dataExibe($dadosTurma[0]['fim']).'</span>';
									}
									$tema = $temaHTML[0];
									$tema1 = $temaHTML[1];
									$tema2 = $temaHTML[2];
									$tema6 = $temaHTML[6];
									$arr_conteudo = json_decode($dados[0]['conteudo'],true);
									$arr_est = false;
									if(is_array($arr_conteudo)){
										$i = 0;
										$il=0;
										$liberaModulo = true;
										if(!empty($dados[0]['config'])){
											$arrConfigCurso = json_decode($dados[0]['config'],true);
											if(isset($arrConfigCurso['libera_conteudo']['tipo']) && $arrConfigCurso['libera_conteudo']['tipo']=='periodica'){
												$liberaModulo = false;
											}
										}
										$_SESSION[$tk_conta]['matricula'][$verificarCursoComprado['dados']['id']]['duracaoTotal'] = 0; //duracao das aulas
										$id_matricula = $verificarCursoComprado['dados']['id'];
										foreach($arr_conteudo As $k=>$dval){
											if(isset($_GET['mod'])&&base64_decode($_GET['mod']) == $dval['idItem']){
												$col_show = 'show';
											}else{
												$col_show = false;
											}
											$listAulasModulosEad = $this->listAulasModulosEad($dval['idItem'],$temaHTML,$verificarCursoComprado['dados']['id'],$dados[0],$liberaModulo);
											if(isset($listAulasModulosEad['est']) && is_array($listAulasModulosEad['est'])){
												foreach($listAulasModulosEad['est'] As $kei=>$val){
													$arr_est[$i] = $dval['idItem'].';'.$val['id'];
													$i++;
												}
											}
											$conteudoModulo = $listAulasModulosEad['html'];
											$painelModulos = str_replace('{conteudo_modulo}',$conteudoModulo,$tema2);
											$painelModulos = str_replace('{titulo_modulo}',buscaValorDb($GLOBALS['tab38'],'id',$dval['idItem'],'nome_exibicao'),$painelModulos);
											$painelModulos = str_replace('{id_modulo}',$dval['idItem'],$painelModulos);$painelModulos = str_replace('{col_show}',$col_show,$painelModulos);
											$ret['html'] .= $painelModulos;
											if($il==0){
												$ret['link_inicio_curso'] = $listAulasModulosEad['link_inicio_curso'];
											}
											$il++;
										}
										if(Url::getURL(nivel_url_site()+4) == 'lecture' && Url::getURL(nivel_url_site()+5) != NULL){
											$id_aula = base64_decode(Url::getURL(nivel_url_site()+5));
											//print_r($dados[0]['conteudo']);
											$telefoneInstrutor = false;
											if(isset($_GET['mod']) && !empty($_GET['mod'])){
												$id_modulo = base64_decode($_GET['mod']);
												$config['conteudo_modulo'] = buscaValorDb($GLOBALS['tab38'],'id',$id_modulo,'conteudo');

												$config['id_instrutor'] = buscaValorDb($GLOBALS['tab38'],'id',$id_modulo,'professor');
												if($config['id_instrutor']){
													$telefoneInstrutor = buscaValorDb_SERVER('usuarios_sistemas','id',$config['id_instrutor'],'celular');
													if($telefoneInstrutor){
														$_REQUEST['telefoneZap'] = $telefoneInstrutor;
														$_REQUEST['labelZap'] = 'Tire suas dúvidas com o instrutor';
													}
												}

												$arr_conteudo = json_decode($config['conteudo_modulo'],true);
												$conte = $this->array_enc_key2($arr_est,$id_modulo.';'.$id_aula);
												//print_r($conte);
												$eUrl = '/'.Url::getURL(nivel_url_site()).'/'.Url::getURL(nivel_url_site()+1).'/'.Url::getURL(nivel_url_site()+2).'/'.Url::getURL(nivel_url_site()+3).'/'.Url::getURL(nivel_url_site()+4);
												if($conte['array_prev']){
													$conarr = explode(';',$conte['array_prev']);
													$urlPrev = $eUrl.'/'.base64_encode($conarr[1]).'?mod='.base64_encode($conarr[0]);
													$displayPrev = 'block';
												}else{
													$urlPrev = false;
													$displayPrev = 'none';
												}
												if($conte['array_next']){
													$conarr = explode(';',$conte['array_next']);
													$urlNext = $eUrl.'/'.base64_encode($conarr[1]).'?mod='.base64_encode($conarr[0]);
													$displayNext = 'block';
												}else{
													$urlNext = false;
													$displayNext = 'none';
												}
											}
											$sqlaula = "SELECT * FROM ".$GLOBALS['tab39']." WHERE `id`='".$id_aula."' AND `ativo`='s'";
											$dadosAtividade = buscaValoresDb($sqlaula);
											$ret['dadosAtividade'] = $dadosAtividade;
											$adicionar_anotacao = false;
											if($dadosAtividade){
												if(isset($arr_config['libera_conteudo']['tipo'])){
													if($arr_config['libera_conteudo']['tipo']=='periodica'){
														if(!$_SESSION[$tk_conta]['matricula'][$id_matricula][Url::getURL(nivel_url_site()+5)][$_GET['mod']]['libera_aula'] && ($dadosAtividade[0]['tipo'] != 'Prova' || $dadosAtividade[0]['tipo'] != 'Exercicio')){
															$ret['html'] = '<div class="col-sm-12">'.formatMensagem('<b>Atenção</b> Prezado(a) <b>'.buscaValorDb($GLOBALS['tab15'],'id',$id_cliente,'Nome').'</b>, Esta atividade não está liberada ainda. <a href="'.$urlPrev.'" class="btn btn-secondary"><i class="fa fa-chevron-circle-left"></i> '.__translate('Voltar',true).'</a>','warning',700000).'</div>';
															return $ret;
														}
													}
												}
												$nome_atividade = $dadosAtividade[0]['nome_exibicao'];
												$dadosAtividade[0]['grade'] = $arr_est;
												$ret['registrar_frequen'] = $this->registroFrequencia($dadosAtividade[0],$verificarCursoComprado['dados']);
												$conteudo_ativ = false;
												$dataRegistro = isset($ret['registrar_frequen']['salvar']['dados_enc'][0]['config'])? $ret['registrar_frequen']['salvar']['dados_enc'][0]['config']:'';
												if(!empty($dataRegistro)){
													$dataRegistro = json_decode($dataRegistro,true);
												}
												$id_matricula = isset($verificarCursoComprado['dados']['id'])?$verificarCursoComprado['dados']['id']:0;


												$configAula = array(
														'id_atividade'=>$dadosAtividade[0]['id'],
														'id_matricula'=>$id_matricula,
														'id_cliente'=>$_SESSION[$tk_conta]['id'.SUF_SYS],
														'data'=>$dataRegistro
												);
												$ret['configAula'] = $configAula;
												$progress_bar = false;
												if($dadosAtividade[0]['tipo'] == 'Video' && !empty($dadosAtividade[0]['video'])){
													//carregar barra de progresso...
													$configProgress = $configAula;
													// $configProgress['type'] = 'array';
													$prb = $this->progressoFrequencia1($configProgress);
													$progress_bar = isset($prb['html']) ? $prb['html'] : '';
													$progress_int = isset($prb['int']) ? $prb['int'] : 0;
													// if(isset($_GET['t'])){
													// 	dd($progress_int);
													// }
													if(isset($dadosAtividade[0]['tipo_link_video']) && $dadosAtividade[0]['tipo_link_video']=='y'){
														$webnarExibe = $this->webnarExibe($dadosAtividade[0],$configAula);
														$conteudo_ativ = $webnarExibe['html'];
														if(isset($verificarCursoComprado['dados']['token']) && ($tmt=$verificarCursoComprado['dados']['token'])){
															if($progress_int!=0){
																$adicionar_anotacao = '<button class="btn btn-success mr-1" type="button" onclick="">Aula assistida</button> ';
															}else{
																$adicionar_anotacao = '<button class="btn btn-outline-success mr-1" type="button" onclick="marcarComoAssistida(\''.$dadosAtividade[0]['id'].'\',\''.$tmt.'\');">Marcar como assistida</button> ';
															}
														}
													}else{
															$id_vimeo = explode('/',$dadosAtividade[0]['video']);
															if(count($id_vimeo)>1){
																$src = 'https://player.vimeo.com/video/'.end($id_vimeo);
															}else{
																$src = 'https://player.vimeo.com/video/'.$dadosAtividade[0]['video'];
															}
															$conteudo_ativ = '<div class="video-player js-video-player 1">

																							<div id="vimeo-player-container" data-vimeo-initialized="true">
																								<!--<iframe src="'.$src.'" width="100%" height="651" frameborder="0" title="'.$dadosAtividade[0]['nome_exibicao'].'" allow="autoplay; fullscreen" allowfullscreen="" data-ready="true"></iframe>-->
																								<iframe src="'.$src.'" width="100%" height="400" frameborder="0" title="'.$dadosAtividade[0]['nome_exibicao'].'" allow="autoplay; fullscreen" allowfullscreen="" data-ready="true"></iframe>
																							</div>

																						</div>
																						<script src="https://player.vimeo.com/api/player.js"></script>
																						<script>
																							jQuery(function(){
																								carregaVideoVimeoFront(\''.$dadosAtividade[0]['video'].'\',\'#vimeo-player-container iframe\',\''.json_encode($configAula).'\');
																							});
																						</script>
																						';
													}
												}elseif($dadosAtividade[0]['tipo'] == 'Webnar' && !empty($dadosAtividade[0]['video'])){
													$webnarExibe = $this->webnarExibe($dadosAtividade[0],$configAula);
													$conteudo_ativ = $webnarExibe['html'];
												}elseif($dadosAtividade[0]['tipo'] == 'Artigo'){
													$conteudo_ativ = '<div class="col-md-12 text-left"> '.$dadosAtividade[0]['descricao'].'</div>';
												}elseif($dadosAtividade[0]['tipo'] == 'Apostila'){
													$conteudo_ativ = '<div class="col-md-12 text-left"> '.$dadosAtividade[0]['descricao'].$this->apostilas($dadosAtividade[0]).'</div>';
												}elseif($dadosAtividade[0]['tipo'] == 'Prova' || $dadosAtividade[0]['tipo']=='Exercicio'){
													$dadosAtividade[0]['get'] = $_GET;
													$dadosAtividade[0]['configAula'] = $configAula;
													$conteudo_ativ = '<div class="col-md-12 text-left"> '.$dadosAtividade[0]['descricao'].'<span  id="exibe_questao_fazer">'.$this->provasExibe($dadosAtividade[0]).'</span></div>';
												}
												$adicionar_anotacao .= $this->adicionarAnotacao($dadosAtividade[0],$verificarCursoComprado['dados']['token']);

												$ret['conteudo_aula'] = str_replace('{nome_atividade}',$nome_atividade,$temaHTML[4]);
												$ret['conteudo_aula'] = str_replace('{urlPrev}',$urlPrev,$ret['conteudo_aula']);
												$ret['conteudo_aula'] = str_replace('{urlNext}',$urlNext,$ret['conteudo_aula']);
												$ret['conteudo_aula'] = str_replace('{conteudo_ativ}',$conteudo_ativ,$ret['conteudo_aula']);
												$ret['conteudo_aula'] = str_replace('{progress_bar}',$progress_bar,$ret['conteudo_aula']);
												$ret['conteudo_aula'] = str_replace('{adicionar_anotacao}',$adicionar_anotacao,$ret['conteudo_aula']);
												unset($configAula['data']);
												if(is_array($configAula)){
													$input = false;
													foreach($configAula As $kin => $vin){
														$input .= '<input type="hidden" name="acesso['.$kin.']" value="'.$vin.'" />';
													}
												}
												//$nomeProva = $GLOBALS['tab39'];
												$nomeProva = buscaValorDb($GLOBALS['tab39'],'id',$configAula['id_atividade'],'nome_exibicao');
												$conteudoProvaResp = '<div class="row"><form id="form-resp-prova">'.$input.'</form><div class="col-sm-12" id="resp-prova"></div></div>';
												$ret['conteudo_aula'] .= $this->modalBootstrap('Resultado <b>'.$nomeProva.'</b>',true,$conteudoProvaResp,'modalResultProva','modal-lg');
												//$ret['conteudo_aula'] = str_replace('{progress_bar}',$progress_bar,$ret['conteudo_aula']);

												if($ret['html']){
													$ret['exec'] = true;
												}
											}
										}
									}
									//$ret['dados'] 	= $dados[0];
							}
					}
					if(is_adminstrator(4)){
								//if($dados[0]['categoria']==2){
										//o aluno tem o curso
										//$ret['verificaProgressoAluno'] = $this->verificaProgressoAluno($verificarCursoComprado['dados']);
										$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
										$id_matricula = false;
										$tema = $temaHTML[0];
										$tema1 = $temaHTML[1];
										$tema2 = $temaHTML[2];
										$tema6 = $temaHTML[6];
										$arr_conteudo = json_decode($dados[0]['conteudo'],true);
										$arr_est = false;
										if(is_array($arr_conteudo)){
											$i = 0;
											@$_SESSION[$tk_conta]['matricula'][$verificarCursoComprado['dados']['id']]['duracaoTotal'] = 0; //duracao das aulas
											// if(isAdmin(1)){
											// 	dd($arr_conteudo);
											// }

											foreach($arr_conteudo As $k=>$dval){
												if(isset($_GET['mod'])&&base64_decode($_GET['mod']) == $dval['idItem']){
													$col_show = 'show';
												}else{
													$col_show = false;
												}
												$listAulasModulosEad = $this->listAulasModulosEad($dval['idItem'],$temaHTML,$id_matricula,$dados[0]);
												if(is_array($listAulasModulosEad['est'])){
													foreach($listAulasModulosEad['est'] As $kei=>$val){
														$arr_est[$i] = $dval['idItem'].';'.$val['id'];
														$i++;
													}
												}
												$conteudoModulo = $listAulasModulosEad['html'];
												$painelModulos = str_replace('{conteudo_modulo}',$conteudoModulo,$tema2);
												$painelModulos = str_replace('{titulo_modulo}',buscaValorDb($GLOBALS['tab38'],'id',$dval['idItem'],'nome_exibicao'),$painelModulos);
												$painelModulos = str_replace('{id_modulo}',$dval['idItem'],$painelModulos);
												$painelModulos = str_replace('{col_show}',$col_show,$painelModulos);
												$ret['html'] .= $painelModulos;
											}
											if(Url::getURL(nivel_url_site()+4) == 'lecture' && Url::getURL(nivel_url_site()+5) != NULL){
												$id_aula = base64_decode(Url::getURL(nivel_url_site()+5));
												//print_r($dados[0]['conteudo']);
												$telefoneInstrutor = false;
												if(isset($_GET['mod']) && !empty($_GET['mod'])){
													$id_modulo = base64_decode($_GET['mod']);
													$config['conteudo_modulo'] = buscaValorDb($GLOBALS['tab38'],'id',$id_modulo,'conteudo');
													$config['id_instrutor'] = buscaValorDb($GLOBALS['tab38'],'id',$id_modulo,'professor');
													if($config['id_instrutor']){
														$telefoneInstrutor = buscaValorDb_SERVER('usuarios_sistemas','id',$config['id_instrutor'],'celular');
														if($telefoneInstrutor){
															$_REQUEST['telefoneZap'] = $telefoneInstrutor;
															$_REQUEST['labelZap'] = 'Tire suas dúvidas com o instrutor';
														}
													}
													$arr_conteudo = json_decode($config['conteudo_modulo'],true);
													$conte = $this->array_enc_key2($arr_est,$id_modulo.';'.$id_aula);
													//print_r($conte);
													$eUrl = '/'.Url::getURL(nivel_url_site()).'/'.Url::getURL(nivel_url_site()+1).'/'.Url::getURL(nivel_url_site()+2).'/'.Url::getURL(nivel_url_site()+3).'/'.Url::getURL(nivel_url_site()+4);
													if($conte['array_prev']){
														$conarr = explode(';',$conte['array_prev']);
														$urlPrev = $eUrl.'/'.base64_encode($conarr[1]).'?mod='.base64_encode($conarr[0]);
														$displayPrev = 'block';
													}else{
														$urlPrev = false;
														$displayPrev = 'none';
													}
													if($conte['array_next']){
														$conarr = explode(';',$conte['array_next']);
														$urlNext = $eUrl.'/'.base64_encode($conarr[1]).'?mod='.base64_encode($conarr[0]);
														$displayNext = 'block';
													}else{
														$urlNext = false;
														$displayNext = 'none';
													}
												}
												$sqlaula = "SELECT * FROM ".$GLOBALS['tab39']." WHERE `id`='".$id_aula."' AND `ativo`='s'";
												$dadosAtividade = buscaValoresDb($sqlaula);
												$ret['dadosAtividade'] = $dadosAtividade;
												if($dadosAtividade){
													$nome_atividade = $dadosAtividade[0]['nome_exibicao'];
													$dadosAtividade[0]['grade'] = $arr_est;
													//$ret['registrar_frequen'] = $this->registroFrequencia($dadosAtividade[0],$verificarCursoComprado['dados']);
													$conteudo_ativ = false;
													//$dataRegistro = isset($ret['registrar_frequen']['salvar']['dados_enc'][0]['config'])? $ret['registrar_frequen']['salvar']['dados_enc'][0]['config']:'';
													$dataRegistro = '';
													if(!empty($dataRegistro)){
														$dataRegistro = json_decode($dataRegistro,true);
													}
													$configAula = array(
															'id_atividade'=>$dadosAtividade[0]['id'],
															'id_matricula'=>$id_matricula,
															'id_cliente'=>0,
															'data'=>$dataRegistro
													);
													if($dadosAtividade[0]['tipo'] == 'Video' && !empty($dadosAtividade[0]['video'])){
														if(isset($dadosAtividade[0]['tipo_link_video']) && $dadosAtividade[0]['tipo_link_video']=='y'){
															$webnarExibe = $this->webnarExibe($dadosAtividade[0],$configAula);
															$conteudo_ativ = $webnarExibe['html'];
														}else{
																$id_vimeo = explode('/',$dadosAtividade[0]['video']);
																if(count($id_vimeo)>1){
																	$src = 'https://player.vimeo.com/video/'.end($id_vimeo);
																}else{
																	$src = 'https://player.vimeo.com/video/'.$dadosAtividade[0]['video'];
																}
																// $token_capa = $dadosAtividade[0]['token'].'_capa';
																// $exibe_capa = $this->exibe_capa_atividade($token_capa);
																$conteudo_ativ = '<div class="video-player js-video-player 2">
																								<div id="vimeo-player-container" data-vimeo-initialized="true">
																									<iframe src="'.$src.'" width="100%" height="400" frameborder="0" title="'.$dadosAtividade[0]['nome_exibicao'].'" allow="autoplay; fullscreen" allowfullscreen="" data-ready="true"></iframe>
																								</div>

																							</div>
																							<script src="https://player.vimeo.com/api/player.js"></script>
																							<script>
																								jQuery(function(){
																									carregaVideoVimeoFront(\''.$dadosAtividade[0]['video'].'\',\'#vimeo-player-container iframe\',\''.json_encode($configAula).'\');
																								});
																							</script>
																							';
														}
													}elseif($dadosAtividade[0]['tipo'] == 'Webnar' && !empty($dadosAtividade[0]['video'])){
														$webnarExibe = $this->webnarExibe($dadosAtividade[0],$configAula);
														$conteudo_ativ = $webnarExibe['html'];
													}elseif($dadosAtividade[0]['tipo'] == 'Artigo'){
														$conteudo_ativ = '<div class="col-md-12 text-left"> '.$dadosAtividade[0]['descricao'].'</div>';
													}elseif($dadosAtividade[0]['tipo'] == 'Apostila'){
														$conteudo_ativ = '<div class="col-md-12 text-left"> '.$dadosAtividade[0]['descricao'].$this->apostilas($dadosAtividade[0]).'</div>';
													}elseif($dadosAtividade[0]['tipo'] == 'Prova' || $dadosAtividade[0]['tipo'] == 'Exercicio'){
														$dadosAtividade[0]['get'] = $_GET;
														$dadosAtividade[0]['configAula'] = $configAula;
														$conteudo_ativ = '<div class="col-md-12 text-left"> '.$dadosAtividade[0]['descricao'].'<span  id="exibe_questao_fazer">'.$this->provasExibe($dadosAtividade[0]).'</span></div>';
													}
													$adicionar_anotacao = $this->adicionarAnotacao($dadosAtividade[0],$verificarCursoComprado['dados']['token']);
													$ret['conteudo_aula'] = str_replace('{nome_atividade}',$nome_atividade,$temaHTML[4]);
													$ret['conteudo_aula'] = str_replace('{urlPrev}',$urlPrev,$ret['conteudo_aula']);
													$ret['conteudo_aula'] = str_replace('{urlNext}',$urlNext,$ret['conteudo_aula']);
													$ret['conteudo_aula'] = str_replace('{conteudo_ativ}',$conteudo_ativ,$ret['conteudo_aula']);
													$ret['conteudo_aula'] = str_replace('{adicionar_anotacao}',$adicionar_anotacao,$ret['conteudo_aula']);

													unset($configAula['data']);
													if(is_array($configAula)){
														$input = false;
														foreach($configAula As $kin => $vin){
															$input .= '<input type="hidden" name="acesso['.$kin.']" value="'.$vin.'" />';
														}
													}
													//$nomeProva = $GLOBALS['tab39'];
													$nomeProva = buscaValorDb($GLOBALS['tab39'],'id',$configAula['id_atividade'],'nome_exibicao');
													$conteudoProvaResp = '<div class="row"><form id="form-resp-prova">'.$input.'</form><div class="col-sm-12" id="resp-prova"></div></div>';
													$ret['conteudo_aula'] .= $this->modalBootstrap('Resultado <b>'.$nomeProva.'</b>',true,$conteudoProvaResp,'modalResultProva','modal-lg');
													//$ret['conteudo_aula'] = str_replace('{progress_bar}',$progress_bar,$ret['conteudo_aula']);
												}
											}
										//}
										//$ret['dados'] 	= $dados[0];
								}
						}
					}
			}else{
				$ret['dados'] 	= $dados;
			}
			$ret['sql'] 		= $sql;
			if($vr_ass= $this->verificarAssinatura(@$verificarCursoComprado['dados']['token'],@$verificarCursoComprado['dados'])){
				$ret['html'] = $vr_ass;
			}
			$ret['html'] .= '<script>$(function(){rolTopMenu();});</script>';//ead/js_front.js; PHP ead.func.php

		}
		//
		if(isset($token_curso)){
			$ret['conteudo_aula'] .= '<a href="/area-do-aluno/cronograma/'.$token_curso.'" class="btn btn-outline-secondary btn-block">Cronograma de aulas ao vivo</a>';
		}
		if(isset($ret['conteudo_aula']) && isset($ret['dadosAtividade'][0]['token'])){
			$capa = false;
			$da = $ret['dadosAtividade'][0];
			if(isset($da['tipo']) && $da['tipo']=='Video'){
					if($token_atividade = $da['token']){
						$capa = $this->exibe_capa_atividade($token_atividade,$da['tipo'],@$configAula);
						if($capa){
							$ret['conteudo_aula'] .= $capa;
						}
					}
				// lib_print($cont);
			}
		}
		// if(isset($_GET['fe'])){
		// 	dd($ret);
		// }
		return $ret;
	}
	/**
	 * Exibição do botão de adicionar anotoações juntamente com o modal
	 * @var Array
	 * @return string
	 */
	public function adicionarAnotacao($config = null,$token_matricula=false)
	{
		//(new temaEAD)->adicionarAnotacao($dadosAtividade,$token_matricula);
		$ret = false;
		$temaHTML = (new EAD)->temaAdminEAD();
		$anotacao = false;
		if($token_matricula){
			$dm = dados_tab($GLOBALS['tab12'],'id_cliente,id',"WHERE token='$token_matricula'");
			$id_atividade = isset($config['id'])?$config['id']:0;
			if($dm){
				$cond_valid = "WHERE `id_cliente` = '".$dm[0]['id_cliente']."' AND `id_matricula` = '".$dm[0]['id']."' AND `id_atividade` = '".$id_atividade."'";
				$dAn = dados_tab('anotacao_alunos','*',$cond_valid);
				if($dAn){
					$anotacao = $dAn[0]['anotacao'];
				}
			}
			$input_hidden = '<input type="hidden" name="id_atividade" value="'.$id_atividade.'">';
			$input_hidden .= '<input type="hidden" name="token_matricula" value="'.$token_matricula.'">';
			$ret = str_replace('{modelId}','modal-anotacao',$temaHTML[0]);
			$ret = str_replace('{input_hidden}',$input_hidden,$ret);
			$ret = str_replace('{anotacao}',$anotacao,$ret);
			$ret = str_replace('{class_textarea}','summernote',$ret);
			$ret = str_replace('{acao_salvar}','onclick="ead_salvarAnotacao();"',$ret);
			$ret = str_replace('{id_form}','frm-salvar-anotacao',$ret);
			//dd($config);
		}
		return $ret;
	}
	/**
	 * Para salvar as anotações que chegam via ajax
	 */
	public function salvarAnotacao($config = null)
	{
		//(new temaEAD)->salvarAnotacao(['token_matricula'=>'','id_atividade'=>'']);
		$ret['exec'] = false;
		if(isset($config['token_matricula']) && isset($config['id_atividade']) && isset($config['anotacao']) && ($tm=$config['token_matricula'])){
			$dm = dados_tab($GLOBALS['tab12'],'*',"WHERE token='$tm' AND ".compleDelete());
			if($dm){
				$cond_valid = "WHERE `id_cliente` = '".$dm[0]['id_cliente']."' AND `id_matricula` = '".$dm[0]['id']."' AND `id_atividade` = '".$config['id_atividade']."'";
				$type_alt = 1;
				$ac=isset($config['acao'])?$config['acao']:'cad';
				$ds['id_cliente'] = $dm[0]['id_cliente'];
				$ds['id_matricula'] = $dm[0]['id'];
				$ds['id_atividade'] = $config['id_atividade'];
				$ds['anotacao'] = $config['anotacao'];
				$ds['token'] = isset($config['token'])?$config['token']:uniqid();
				$ds['conf'] = 's';
				$tabUser = 'anotacao_alunos';
				$config2 = array(
							'tab'=>$tabUser,
							'valida'=>true,
							'condicao_validar'=>$cond_valid,
							'sqlAux'=>false,
							'ac'=>$ac,
							'type_alt'=>$type_alt,
							'config' => false,
							'dadosForm' => $ds
				);
				$result_salvar =  lib_salvarFormulario($config2);//Declado em Lib/Qlibrary.php
				$ret = json_decode($result_salvar,true);
			}
		}
		return $ret;
	}
	/**
	 * Metodo para verificar se o contrato está assinado
	 * @param string $tk_m = tokem matricula, Array $dados=dados da matricula
	 */
	public function verificarAssinatura($tk_m=false,$dados=false){
		if(isAdmin(5)){
			//se estiver sendo executado por alguem logado como administrador ignora esse metodo
			return false;
		}
		if($tk_m&&!$dados){
			$d = dados_tab($GLOBALS['tab12'],'*',"WHERE token='$tk_m'");
			if($d){
				$dados=$d[0];
			}
		}
		$assinar = true;
		if(isAero()){
			if(isset($dados['contrato']) && !empty($dados['contrato'])){
				$arr_contrato = lib_json_array($dados['contrato']);
				if(isset($arr_contrato['aceito_contrato'])){
					$assinar = false;
				}
			}
		}else{
			$assinar = false;
		}
		$ret = false;
		if($assinar){
			$ur = explode("iniciar-curso",UrlAtual());
			$url = $ur[0].'contrato/'.base64_encode(@$dados['id']);

			return redirect($url,0);
		}
		return $ret;

	}
	public function verificaValidade($config=false){
		$ret['exec'] = false;
		$sqlReg = "";
		//Vamos aproveitar para verificar se o contrato esta assinado

		if(isset($config['validade']) && isset($config['id_curso']) && isset($config['data_inicio']) && isset($config['token'])){
			$validadeMatricula = $config['validade'];
			$sqlP = false;
			if($config['data_inicio']=='0000-00-00 00:00:00' || $config['data_inicio']=='1000-01-01 00:00:00'){
				$ret['atualiza_data_inicio'] = registrarMatriculaSYS($config['token'],$status=4,$tag='cursando');
				$config['data_inicio'] = buscaValorDb($GLOBALS['tab12'],'token',$config['token'],'data_inicio');
			}
			if($validadeMatricula<=0){
				$configCurso = buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'config');
				if($configCurso){
					$arr_conf = json_decode($configCurso,true);
					if(isset($arr_conf['validade']) && !empty($arr_conf['validade'])){
						$validadeMatricula = $arr_conf['validade'];
					}else{
						$validadeMatricula = 365;
					}
					$sql = "UPDATE ".$GLOBALS['tab12']." SET validade = '".$validadeMatricula."' WHERE token='".$config['token']."'";
					$ret['reg_validade'] = salvarAlterar($sql);
				}
			}
			$dt = explode(' ',$config['data_inicio']);
			$dit = false;
			if(isset($config['id_turma']) && $config['id_turma']!=0  && $config['id_turma']!='a'){
				$dit = buscaValorDb($GLOBALS['tab11'],'id',$config['id_turma'],'inicio'); //data inicio turma
				if($dit){
					$dataInicio = dataExibe($dit);
					//adicionar na matricula a nova data de validade
				}
			}
			// if(isset($_GET['fq'])){
			// 	lib_print($config);
			// 	echo $dataInicio;
			// }

			if(!$dit){
				if(isset($dt[0])){
					$dataInicio = dataExibe($dt[0]);
				}else{
					$dataInicio = '00/00/0000';
				}
			}
			$vencimento = CalcularVencimento2($dataInicio,$validadeMatricula);
			$strHoje			= strtotime(date('Y-m-d'));
			$config['ativo'];
			$strVencimento = strtotime(dtBanco($vencimento));
			if(isset($_GET['fp'])){
				echo '<br><br><br>$dataInicio : '.$dataInicio.' $vencimento '.$vencimento.'  <br> $validadeMatricula: '.$validadeMatricula.' $strHoje='.$strHoje.'\r $strVencimento='.$strVencimento;
				lib_print($config);
				dd(($strHoje > $strVencimento));
			}
			if($strHoje < $strVencimento && $config['ativo']=='n'){
				//se estiver desativado ainda dentro da validade libera
				$sql = "UPDATE ".$GLOBALS['tab12']." SET ativo='s' WHERE token='".$config['token']."'";
				$ret['exec'] = salvarAlterar($sql);
			}elseif($strHoje > $strVencimento && $config['ativo']!='n'){
				/// venceu o prso travar usuario
				//se estiver ativado depois do vencimento desativa
				$sql = "UPDATE ".$GLOBALS['tab12']." SET ativo='n' WHERE token='".$config['token']."'";
				$ret['exec'] = salvarAlterar($sql);
			}
			//print_r($ret);
			//exit;
		}
		return $ret;
	}
	public function solicitarCertifcado($token=false,$tag=false){
		$ret['exec'] = false;
		$ret['mens'] = formatMensagem('Erro ao solicitar certificado se desejar entre em contato com o <a href="/atendimento">Suporte</a>.','danger');
		$compleSalv = "memo='Solicitado Pelo Aluno', ";
		if($token&&$tag){
				$tagBanco = buscaValorDb($GLOBALS['tab12'],'token',$token,'tag');
				$arrTag = jsonToArray($tagBanco);
				if(is_array($arrTag)){
					array_push($arrTag,$tag);
					$tag = json_encode($arrTag);
				}else{
					$tag = json_encode(array($tag));
				}
				$compleSalv .= " `tag`='".$tag."', data_solicit_certificado='".$GLOBALS['dtBanco']."'";
				$sql = "UPDATE IGNORE ".$GLOBALS['tab12'] ." SET $compleSalv WHERE `token`='".$token."'";
				$ret['sql'] = $sql;
				$ret['exec'] = salvarAlterar($sql);
				if($ret['exec']){
					$ret['mens'] = formatMensagem('Sua solicitação de certificado foi enviada com sucesso. Em breve entraremos em contato.','success',70000);
				}
		}
		return $ret;
	}
	public function webnarExibe($config=false,$configAula=false){
		$ret['html'] = false;
		if(isset($config['video'])){
			if(isset($_GET['fp'])){
				dd($config);
			}
			// if(isset($config))
			$findme   = '?v=';
			$id_video = $config['video'];
			$pos = strpos($config['video'], $findme);
			if ($pos === false) {
				$findme   = '.be/';
				$pos = strpos($config['video'], $findme);
				if ($pos === false) {
					$id_video = $config['video'];
				}else{
					$link = explode($findme,$config['video']);
					$id_video = $link[1];
				}

			} else {
				$link = explode('?',$config['video']);
				parse_str($link[1],$v);
				if(isset($v)){
					$arr_id_video = $v;
					$id_video = $arr_id_video['v'];
				}
			}
			//if($config['video']){
			$start = 0;
			$autoplay = 0;
			if(isset($configAula['id_cliente']) && isset($configAula['id_atividade']) && isset($configAula['id_matricula'])){
				$registro = dados_tab($GLOBALS['tab47'],'config',"WHERE id_cliente='".$configAula['id_cliente']."' AND id_atividade='".$configAula['id_atividade']."' AND id_matricula='".$configAula['id_matricula']."' ");
				if($registro){
					$arr_registro = json_decode($registro[0]['config'],true);
					if(isset($arr_registro['seconds'])&&$arr_registro['seconds']>0){
						$start = round($arr_registro['seconds']);
						$autoplay = 1;
						if($start){
							$start = 'start=' . $start;
						}
						// $autoplay = 0;
					}
				}
			}
			//echo $id_video;
			ob_start();
			//echo $start;exit;
			/*
			?>
			<!-- <script src="https://www.youtube.com/iframe_api"></script>
			<script>
					// Adicionando o script do youtube iframe
					//var tag = document.createElement('script');
					//var firstScriptTag = document.getElementsByTagName('script')[0];

					//tag.src = 'https://www.youtube.com/iframe_api';
					//firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

					// inicializando player
					var playerDiv = document.querySelector('#player');
					var player = null;
					var videoDuration = 0;
					var videoTime = 0;
					var interval = null;
					// método chamado automaticamente pela API do Youtube

					function onYouTubeIframeAPIReady() {
						player = new YT.Player('js-media-player', {
							height: 450, // qualquer altura desejada
							width: '100%', // qualquer largura desejada
							videoId: '<?=$id_video?>',
							playerVars: { // adicionando algumas variáveis
								rel: 0, // não exibir videos relacionados ao final
								showinfo: 0, // ocultar informações do video
								//autoplay: <?=$autoplay?>, // play automático
								modestbranding: 1, // Não exibe logotipo youtube
								iv_load_policy: 3, // Não exibe logotipo youtube
								start:'<?=$start?>'
							},
							events: {
								'onReady': onPlayerReady,
								'onStateChange': onPlayerStateChange,
								'onError': onPlayerError,
							}
						});
					}

					function onPlayerReady(event) {
						// obtendo o tempo atual do vídeo
						event.target.setVolume(100);
  						event.target.playVideo();
						videoDuration = parseInt(player.getDuration());
						//console.log('Duração: '+videoDuration);
						// aplicando um loop de 1 em 1s
						// interval = setInterval(discoverTime, 1000);
						// jQuery('.ytp-chrome-top').hide();
						console.log('onPlayerReady');
					}
					var fireAt = 15;

					function discoverTime() {
						// obtendo o tempo atual do video
						if (player && player.getCurrentTime()) {
							videoTime = parseInt(player.getCurrentTime());
						}

						if (videoTime < videoDuration && videoTime === fireAt) {
							console.log('Aos ' + fireAt + 's, coloque aqui a sua mágica!');
						}

						// quando o video terminar, resetamos o interval
						if (videoTime > videoDuration) {
							clearInterval(interval);
						}
					}
					var config = JSON.parse('<?=json_encode($configAula)?>');
					function onPlayerStateChange(event) {
						var data ={seconds:player.getCurrentTime(),duration:player.getDuration()};
						//var duracao = player.getDuration();
						var data2 = {data:data,id:'',config:config};
						switch (event.data) {
							case YT.PlayerState.ENDED:
								console.log('Finalizou execução do video '+data2);
								regitroVideoYt(data2);
								break;
							case YT.PlayerState.PLAYING:
								console.log('Assistindo');
								break;
							case YT.PlayerState.PAUSED:
								console.log('Pause em '+config);
								regitroVideoYt(data2);
								break;
							case YT.PlayerState.BUFFERING:
								console.log('carregando');
								break;
						}
					}
					function onPlayerError(event){
						console.log(event);
					}
			</script> -->
			<?
			*/
			$ret['html'] = '<iframe  class="embed-responsive-item" id="Eadcontrol"  width="100%" height="315" src="https://www.youtube.com/embed/'.$id_video.'" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture '.$start.'" allowfullscreen></iframe>';
			$ret['html'] .= ob_get_clean();
		}
		return $ret;
	}
	public function webnarExibe_bk($config=false,$configAula=false){
		$ret['html'] = false;
		if(isset($config['video'])){
			if(isset($_GET['fp'])){
				dd($config);
			}
			// if(isset($config))
			$findme   = '?v=';
			$id_video = $config['video'];
			$pos = strpos($config['video'], $findme);
			if ($pos === false) {
				$findme   = '.be/';
				$pos = strpos($config['video'], $findme);
				if ($pos === false) {
					$id_video = $config['video'];
				}else{
					$link = explode($findme,$config['video']);
					$id_video = $link[1];
				}

			} else {
				$link = explode('?',$config['video']);
				parse_str($link[1],$v);
				if(isset($v)){
					$arr_id_video = $v;
					$id_video = $arr_id_video['v'];
				}
			}
			//if($config['video']){
			$start = 0;
			$autoplay = 0;
			if(isset($configAula['id_cliente']) && isset($configAula['id_atividade']) && isset($configAula['id_matricula'])){
				$registro = dados_tab($GLOBALS['tab47'],'config',"WHERE id_cliente='".$configAula['id_cliente']."' AND id_atividade='".$configAula['id_atividade']."' AND id_matricula='".$configAula['id_matricula']."' ");
				if($registro){
					$arr_registro = json_decode($registro[0]['config'],true);
					if(isset($arr_registro['seconds'])&&$arr_registro['seconds']>0){
						$start = round($arr_registro['seconds']);
						$autoplay = 1;
						// $autoplay = 0;
					}
				}
			}
			//echo $id_video;
			ob_start();
			//echo $start;exit;
			?>
			<script src="https://www.youtube.com/iframe_api"></script>
			<script>
					// Adicionando o script do youtube iframe
					//var tag = document.createElement('script');
					//var firstScriptTag = document.getElementsByTagName('script')[0];

					//tag.src = 'https://www.youtube.com/iframe_api';
					//firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

					// inicializando player
					var playerDiv = document.querySelector('#player');
					var player = null;
					var videoDuration = 0;
					var videoTime = 0;
					var interval = null;
					// método chamado automaticamente pela API do Youtube

					function onYouTubeIframeAPIReady() {
						player = new YT.Player('js-media-player', {
							height: 450, // qualquer altura desejada
							width: '100%', // qualquer largura desejada
							videoId: '<?=$id_video?>',
							playerVars: { // adicionando algumas variáveis
								rel: 0, // não exibir videos relacionados ao final
								showinfo: 0, // ocultar informações do video
								//autoplay: <?=$autoplay?>, // play automático
								modestbranding: 1, // Não exibe logotipo youtube
								iv_load_policy: 3, // Não exibe logotipo youtube
								start:'<?=$start?>'
							},
							events: {
								'onReady': onPlayerReady,
								'onStateChange': onPlayerStateChange,
								'onError': onPlayerError,
							}
						});
					}

					function onPlayerReady(event) {
						// obtendo o tempo atual do vídeo
						event.target.setVolume(100);
  						event.target.playVideo();
						videoDuration = parseInt(player.getDuration());
						//console.log('Duração: '+videoDuration);
						// aplicando um loop de 1 em 1s
						// interval = setInterval(discoverTime, 1000);
						// jQuery('.ytp-chrome-top').hide();
						console.log('onPlayerReady');
					}
					var fireAt = 15;

					function discoverTime() {
						// obtendo o tempo atual do video
						if (player && player.getCurrentTime()) {
							videoTime = parseInt(player.getCurrentTime());
						}

						if (videoTime < videoDuration && videoTime === fireAt) {
							console.log('Aos ' + fireAt + 's, coloque aqui a sua mágica!');
						}

						// quando o video terminar, resetamos o interval
						if (videoTime > videoDuration) {
							clearInterval(interval);
						}
					}
					var config = JSON.parse('<?=json_encode($configAula)?>');
					function onPlayerStateChange(event) {
						var data ={seconds:player.getCurrentTime(),duration:player.getDuration()};
						//var duracao = player.getDuration();
						var data2 = {data:data,id:'',config:config};
						switch (event.data) {
							case YT.PlayerState.ENDED:
								console.log('Finalizou execução do video '+data2);
								regitroVideoYt(data2);
								break;
							case YT.PlayerState.PLAYING:
								console.log('Assistindo');
								break;
							case YT.PlayerState.PAUSED:
								console.log('Pause em '+config);
								regitroVideoYt(data2);
								break;
							case YT.PlayerState.BUFFERING:
								console.log('carregando');
								break;
						}
					}
					function onPlayerError(event){
						console.log(event);
					}
			</script>
			<?
			$ret['html'] = ob_get_clean();
		}
		return $ret;
	}
	public function progressoFrequencia($id_atividade=false,$id_matricula=false,$id_cliente=false){
		$ret = false;
		if($id_atividade){
			global $tk_conta;
			$id_cliente = isset($_SESSION[$tk_conta]['id'.SUF_SYS])? $_SESSION[$tk_conta]['id'.SUF_SYS]:false;
			$sqlFreq = "SELECT * FROM ".$GLOBALS['tab47']." WHERE `id_cliente`='".$id_cliente."' AND `id_matricula`='".$id_matricula."' AND `id_atividade`='".$id_atividade."' ";
			$dados = isset($_SESSION['progressoFrequencia'][$id_atividade][$id_matricula]) ? $_SESSION['progressoFrequencia'][$id_atividade][$id_matricula] : buscaValoresDb($sqlFreq);
			$progress = 0;
			$color = 'bg-danger';
			if($dados){
				$_SESSION['progressoFrequencia'][$id_atividade][$id_matricula] = $dados;
				if($dados[0]['concluido']=='s'){
					$progress =100;
				}else{
					$progress = $dados[0]['progresso'];
					$config = $dados[0]['config'];
					if(!empty($config)){
						$data = json_decode($config,true);
						if(is_array($data) && isset($data['percent'])){
							$progress = round($data['percent'] * 100);

						}
					}
				}
			}
			if($progress==100){
				$color = 'bg-success';
			}elseif($progress>=50 && $progress <100){
				$color = 'bg-warning';
			}
			$ret = '
			<div class="progress" title="'.$progress.'%">
			  <div class="progress-bar '.$color.'" role="progressbar"  style="width: '.$progress.'%" aria-valuenow="'.$progress.'" aria-valuemin="0" aria-valuemax="100">{progress}{simbolo}</div>
			</div>
			';
		}
		return $ret;
	}
	/**
	 * retorna um array ou strig contendo o resumo da frequencia por atividade
	 * @param array $config
	 * @uso $ret = (new temaEad)->progressoFrequencia1(['id_atividade'=>false,'id_matricula'=>false,'id_matricula'=>false,'id_cliente'=>false,]);
	 */
	public function progressoFrequencia1($config=[]){
		$id_atividade= isset($config['id_atividade']) ? $config['id_atividade'] : false;
		$id_matricula= isset($config['id_matricula']) ? $config['id_matricula'] : false;
		$id_cliente= isset($config['id_cliente']) ? $config['id_cliente'] : false;
		$type= isset($config['type']) ? $config['type'] : 'array';
		$ret = false;
		if($id_atividade){
			global $tk_conta;
			$id_cliente = isset($_SESSION[$tk_conta]['id'.SUF_SYS])? $_SESSION[$tk_conta]['id'.SUF_SYS]:false;
			$sqlFreq = "SELECT * FROM ".$GLOBALS['tab47']." WHERE `id_cliente`='".$id_cliente."' AND `id_matricula`='".$id_matricula."' AND `id_atividade`='".$id_atividade."' ";
			$dados = isset($_SESSION['progressoFrequencia'][$id_atividade][$id_matricula]) ? $_SESSION['progressoFrequencia'][$id_atividade][$id_matricula] : buscaValoresDb($sqlFreq);
			$progress = 0;
			$color = 'bg-danger';
			if($dados){
				$_SESSION['progressoFrequencia'][$id_atividade][$id_matricula] = $dados;
				if($dados[0]['concluido']=='s'){
					$progress =100;
				}else{
					$progress = $dados[0]['progresso'];
					$config = $dados[0]['config'];
					if(!empty($config)){
						$data = json_decode($config,true);
						if(is_array($data) && isset($data['percent'])){
							$progress = round($data['percent'] * 100);

						}
					}
				}
			}
			if($progress==100){
				$color = 'bg-success';
			}elseif($progress>=50 && $progress <100){
				$color = 'bg-warning';
			}
			$ret = '
				<div class="progress" title="'.$progress.'%">
					<div class="progress-bar '.$color.'" role="progressbar"  style="width: '.$progress.'%" aria-valuenow="'.$progress.'" aria-valuemin="0" aria-valuemax="100">'.$progress.'%</div>
				</div>
				';
			if($type=='array'){
				$ret = [
					'html' => $ret,
					'int' => $progress,
				];
			}

		}
		return $ret;
	}
	public function registroFrequencia($config=false,$dadosMatricula=false){
		$ret = false;
		if($config && $dadosMatricula){
			$concluido = 'n';
			$progresso = 0;
			if($config['tipo'] == 'Artigo' || $config['tipo'] == 'Apostila'){
				$concluido = 's';
				$progresso = 100;
			}
			$config['dadoSalvar'] = array(
				'id_cliente'=>$dadosMatricula['id_cliente'],
				'id_curso'=>$dadosMatricula['id_curso'],
				'id_matricula'=>$dadosMatricula['id'],
				'id_atividade'=>$config['id'],
				'tipo'=>$config['tipo'],
				'concluido'=>$concluido,
				'progresso'=>$progresso,
				'grade'=>json_encode($config['grade']),
				'ultimo_acesso'=>$GLOBALS['dtBanco'],
				'token'=>uniqid(),
				'conf'=>'s',
			);
			if(isset($_GET['mod'])){
				$config['dadoSalvar']['id_modulo'] = base64_decode($_GET['mod']);
			}
			$cond_valid = "WHERE `id_atividade` = '".$config['dadoSalvar']['id_atividade']."' AND `id_matricula` = '".$config['dadoSalvar']['id_matricula']."' AND ".compleDelete();
			$type_alt = 2;
			$tabUser = $GLOBALS['tab47'];
			$config2 = array(
						'tab'=>$tabUser,
						'valida'=>true,
						'condicao_validar'=>$cond_valid,
						'sqlAux'=>false,
						'ac'=>'cad',
						'type_alt'=>$type_alt,
						'config' => false,
						'dadosForm' => $config['dadoSalvar']
			);
			$result_salvarClientes =  lib_salvarFormulario($config2);//Declado em Lib/Qlibrary.php
			$ret = json_decode($result_salvarClientes,true);
			if(isset($ret['salvar']['mess']) && $ret['salvar']['mess']=='enc'){
				/*Atualizar status de inicio de curso*/
				$locDataInicio = buscaValorDb($GLOBALS['tab12'],'id',$config['dadoSalvar']['id_matricula'],'data_inicio');
				$statusCur = buscaValorDb($GLOBALS['tab12'],'id',$config['dadoSalvar']['id_matricula'],'status');
				if($locDataInicio =='0000-00-00 00:00:00'&& $statusCur<4){
					$token_reg = buscaValorDb($GLOBALS['tab12'],'id',$config['dadoSalvar']['id_matricula'],'token');
					if($token_reg){
						$ret['reg_inicio_curso'] = registrarMatriculaSYS($token_reg,$status=4,$tag='cursando');
					}
				}
				if($config['tipo'] == 'Artigo' && $ret['salvar']['dados_enc'][0]['concluido'] == 'n'){
					$sqlsalv = "UPDATE ".$GLOBALS['tab47']." SET `progresso`='100',`concluido`='n',`ultimo_acesso`='".$GLOBALS['dtBanco']."'  $cond_valid";
					$ret['exec'] = salvarAlterar($sqlsalv);
				}
			}
		}
		return $ret;
	}
	public function listAulasModulosEad($id_modulo=false,$arrayTema=false,$id_matricula=false,$dadosCurso=false,$liberaModulo=true){
		$ret = false;
		if($id_modulo && $arrayTema){
			$sql = "SELECT * FROM ".$GLOBALS['tab38']." WHERE id='".$id_modulo."' AND ativo='s' AND ".compleDelete();
			$dados = buscaValoresDb($sql);
			if($dados){
				// if(isAdmin(1)){
				// 	dd($dados);
				// }

				$ret = $this->listAtividades($dados[0],$id_matricula,$dadosCurso,$liberaModulo);
			}
		}
		return $ret;
	}
	public function areaDoAluno($config=false){
		global $tk_conta,$suf_in;
		if(is_clientLogado()){
			$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/area_do_aluno.html'));
			$tema = $temaHTML[0];
			$tema1 = $temaHTML[1];
			$painelMenu = $this->menuPainelNav($config,2);
			$banner = $tema1;
			$cursos_destaque_alunos = false;
			$conteudo = false;
			$nome_curso = false;
			if(Url::getURL(nivel_url_site()+1)=='cronograma'){
				$token_curso = Url::getURL(nivel_url_site()+2);
				if(!$token_curso){
					$conteudo = '<div class="col-12">'.formatMensagemInfo('Por favor selecione um curso','danger').'</div>';
				}else{
					// $cont = $this->minhasNotas($config);
					// $conteudo = $cont['html'];
					$conteudo = '';
					$id_curso = get_id_cursoByToken($token_curso);
					if($id_curso){
						$conteudo = Escola::list_edit_cronograma($id_curso);
					}
				}
			}elseif(Url::getURL(nivel_url_site()+1)=='meus-cursos'){
				if(Url::getURL(nivel_url_site()+2)=='iniciar-curso' && Url::getURL(nivel_url_site()+3) != NULL){
				}elseif(Url::getURL(nivel_url_site()+2)==NULL){
					$obs = false;
					$nome = false;
					$conteudo = 'Conteúdo da página';
					$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
					$cont = $this->meusCursos($config);
					$conteudo = $cont['html'];
					$banner = false;
				}else{
					$obs = $config['obs'];
					$nome = $_SESSION[$tk_conta]['nome'.$suf_in];
					$conteudo = '';
				}
			}elseif(Url::getURL(nivel_url_site()+1)=='minhas-notas'){
				// dd('em consturção');
				$obs = false;
				$nome = false;
				$conteudo = 'Conteúdo da página';
				$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
				$cont = $this->minhasNotas($config);
				$conteudo = $cont['html'];
				$banner = false;
			}elseif(Url::getURL(nivel_url_site()+1)=='meus-pedidos'){
				if(Url::getURL(nivel_url_site()+2)==NULL){
					$obs = false;
					$nome = false;
					$conteudo = 'Conteúdo da página';
					$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
					$cont = $this->meusPedidos($config);
					$conteudo = $cont['html'];
					$banner = false;
				}elseif(Url::getURL(nivel_url_site()+2)=='p'){
					if(Url::getURL(nivel_url_site()+3)!=NULL){
						$obs = false;
						$nome = false;
						$conteudo = 'Proposta';
						$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
						$cont = $this->proposta($config,Url::getURL(nivel_url_site()+3));
						$conteudo = $cont['html'];
						$banner = false;
					}else{
						$obs = $config['obs'];
						$nome = $_SESSION[$tk_conta]['nome'.$suf_in];
						$conteudo = '';
					}
				}else{
					$obs = $config['obs'];
					$nome = $_SESSION[$tk_conta]['nome'.$suf_in];
					$conteudo = '';
				}
			}elseif(Url::getURL(nivel_url_site()+1)=='minhas-faturas'){
				if(Url::getURL(nivel_url_site()+2)==NULL){
					$obs = false;
					$nome = false;
					$conteudo = 'Conteúdo da página';
					$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
					$cont = $this->minhasFaturas($config);
					$conteudo = $cont['html'];
					$banner = false;
				}else{
					$obs = $config['obs'];
					$nome = $_SESSION[$tk_conta]['nome'.$suf_in];
					$conteudo = '';
				}
			}elseif(Url::getURL(nivel_url_site()+1)=='perfil'){
				if(Url::getURL(nivel_url_site()+2)==NULL){
					$obs = false;
					$nome = false;
					$conteudo = 'Conteúdo da página';
					$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
					$cont = $this->perfil($config);
					$conteudo = $cont['html'];
					$banner = false;
				}else{
					$obs = $config['obs'];
					$nome = $_SESSION[$tk_conta]['nome'.$suf_in];
					$conteudo = '';
				}
			}else{
				$obs = $config['obs'];
				$nome = $_SESSION[$tk_conta]['nome'.$suf_in];
				$conteudo = '';
				$conteudo = 'Conteúdo da página';
				$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
				$cont = $this->meusCursos($config);
				$conteudo = $cont['html'];
				$banner = false;
			}
			$ret = str_replace('{{painel_menu}}',$painelMenu,$tema);
			$ret = str_replace('{descricao}',$obs,$ret);
			$ret = str_replace('{{conteudo}}',$conteudo,$ret);
			$ret = str_replace('{nome}',$nome,$ret);
			$ret = str_replace('{nome_curso}',$nome_curso,$ret);
			$ret = str_replace('{banner}',$banner,$ret);
			$ret = str_replace('{{cursos_destaque_alunos}}',$cursos_destaque_alunos,$ret);
		}else{
			$ret = $this->accountLogin($config);
		}
		return $ret;
	}

	public function atendimento($config=false){
		global $tk_conta,$suf_in;
		$sm = Url::getURL(nivel_url_site()+3); //sem menu
		$painelMenu = $this->menuPainelNav($config,2);
		$cursos_destaque_alunos = false;
		$conteudo = false;
		$nome_curso = false;
		if(Url::getURL(nivel_url_site()+1)=='perguntas-frequentes'){
				//if(Url::getURL(nivel_url_site()+2)==NULL){
					$obs = false;
					$nome = false;
					$conteudo = 'Conteúdo da página';
					//$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
					$cont = $this->perguntasFrequentes($config);
					$ret = $cont['html'];
					$banner = false;
				/*}else{
					$obs = $config['obs'];
					$nome = $_SESSION[$tk_conta]['nome'.$suf_in];
					$conteudo = '';
				}*/
		}elseif(Url::getURL(nivel_url_site()+1)=='forum'){
				//if(Url::getURL(nivel_url_site()+2)==NULL){
					$obs = false;
					$nome = false;
					$conteudo = 'Conteúdo da página';
					$cont = $this->forum($config);
					$ret = $cont['html'];
					$banner = false;
		}elseif(Url::getURL(nivel_url_site()+1)=='contato'){
				//if(Url::getURL(nivel_url_site()+2)==NULL){
					$obs = false;
					$nome = false;
					$conteudo = 'Conteúdo da página';
					$cont = $this->contato($config);
					$ret = $cont['html'];
					$banner = false;
		}else{
				$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/atendimento.html'));
				$obs = $config['obs'];
				//$nome = $_SESSION[$tk_conta]['nome'.$suf_in];
				$nome = false;
				$conteudo = '';
				//$conteudo = 'Conteúdo da página';
				//$config['id_cliente'] = isset($config['id_cliente'])?$config['id_cliente'] : $_SESSION[$tk_conta]['id'.$suf_in];
				//$cont = $this->meusCursos($config);
				//$conteudo = $cont['html'];
				$banner = false;
				$link_perguntas_frequentes = '/'.Url::getURL(0).'/perguntas-frequentes';
				//$link_forum = '/'.Url::getURL(0).'/forum/'.is_subdominio();
				$link_forum = '/forum/'.is_subdominio();
				$link_forum2 = 'href="'.$link_forum.'" target="_BLANK"';
				$link_contato = '/'.Url::getURL(0).'/contato';
				$ret = str_replace('{link_perguntas_frequentes}',$link_perguntas_frequentes,$temaHTML[0]);
				$ret = str_replace('{link_forum}',$link_forum,$ret);
				$attr_link_forum = ' target="_BLANK"';
				$ret = str_replace('{attr_link_forum}',$attr_link_forum,$ret);
				$ret = str_replace('{select_forum}',$link_forum2,$ret);
				$ret = str_replace('{link_contato}',$link_contato,$ret);
				$ret = str_replace('{descricao}',$obs,$ret);
				$ret = str_replace('{{conteudo}}',$conteudo,$ret);
				$ret = str_replace('{nome}',$nome,$ret);
				$ret = str_replace('{nome_curso}',$nome_curso,$ret);
				$ret = str_replace('{banner}',$banner,$ret);
				$ret = str_replace('{{cursos_destaque_alunos}}',$cursos_destaque_alunos,$ret);

		}
		return $ret;
	}
	public function perguntasFrequentes($config=false){
		$ret['html'] = false;
		return $ret;
	}
	public function contato($config=false){
		global $tk_conta,$suf_in;
		$ret['html'] = false;
		$_GET['regi_pag'] = isset($_GET['regi_pag'])?$_GET['regi_pag'] : 8;
		$_GET['pag'] = isset($_GET['pag'])?$_GET['pag'] : 0;
		$email = new Email;
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/contato.html'));
		$tema = $temaHTML[0];
		$tema1 = $temaHTML[1];
		$configFrmEm['frm_d'][0] = array('type'=>'text','size'=>'12','campos'=>'Nome-Nome Completo-Nome','value'=>@$_POST['Nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
		$configFrmEm['frm_d'][1] = array('type'=>'email','size'=>'12','campos'=>'Email-Email-Ex.: seu@email.com','value'=>@$_POST['Email'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
		$configFrmEm['frm_d'][3] = array('type'=>'text','size'=>'12','campos'=>'Celular-Celular-','value'=>@$_POST['Celular'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
		$configFrmEm['frm_d'][4] = array('type'=>'text','size'=>'12','campos'=>'Estado-Estado','value'=>@$_POST['Estado'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
		$configFrmEm['frm_d'][2] = array('type'=>'textarea','size'=>'12','campos'=>'Mensagem-Mensagem','value'=>@$_POST['Mensagem'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
		$configFrmEm['frm_d'][5] = array('type'=>'hidden','size'=>'12','campos'=>'assunto-assunto','value'=>'Contato '.queta_option_conta('nome'),'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>'');
		$frm = $email->frmEnvia($configFrmEm);
		//$painelMenu = $this->menuPainelNav($config,2);
		$painelMenu = false;
		$banner = $tema1;
		$cursos_destaque_alunos = false;
		//$conteudo = $frm;
		$nome_curso = false;
		$sub_titulo = 'Contato';
		$ret['html'] = str_replace('{formulario}',$frm,$tema);
		$ret['html'] = str_replace('{sub_titulo}',$sub_titulo,$ret['html']);
		//$ret['html'] = str_replace('{{painel_menu}}',$painelMenu,$tema);
		//$ret['html'] = str_replace('{{painel_consulta}}',$painel_consulta,$ret);
		//$ret['html'] = str_replace('{{grade_cursos}}',$conteudo,$ret);
		//$ret = str_replace('{{paginacao_site}}',$result['paginacao_site'],$ret);
		return $ret;
	}
	public function forum($config=false){
		global $tk_conta,$suf_in;
		$ret['html'] = false;
		$_GET['regi_pag'] = isset($_GET['regi_pag'])?$_GET['regi_pag'] : 8;
		$_GET['pag'] = isset($_GET['pag'])?$_GET['pag'] : 0;
		$email = new Email;
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/forum.html'));
		$tema = $temaHTML[0];
		$tema1 = $temaHTML[1];

		$sub_titulo = 'Contato';
		$ret['html'] = str_replace('{formulario}',$frm,$tema);
		$ret['html'] = str_replace('{sub_titulo}',$sub_titulo,$ret['html']);
		//$ret['html'] = str_replace('{{painel_menu}}',$painelMenu,$tema);
		//$ret['html'] = str_replace('{{painel_consulta}}',$painel_consulta,$ret);
		//$ret['html'] = str_replace('{{grade_cursos}}',$conteudo,$ret);
		//$ret = str_replace('{{paginacao_site}}',$result['paginacao_site'],$ret);
		return $ret;
	}
	public function consulta($config=false){
		global $tk_conta,$suf_in;
		$ret = false;
		$_GET['regi_pag'] = isset($_GET['regi_pag'])?$_GET['regi_pag'] : 8;
		$_GET['pag'] = isset($_GET['pag'])?$_GET['pag'] : 0;
		//if(is_clientLogado()){
			$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/consulta.html'));
			$tema = $temaHTML[0];
			$tema1 = $temaHTML[1];
			//$painelMenu = $this->menuPainelNav($config,2);
			$painelMenu = false;
			$banner = $tema1;
			$cursos_destaque_alunos = false;
			$conteudo = false;
			$nome_curso = false;
			//print_r($config);
			$result['paginacao_site'] = false;
			if(isset($_GET['src']) && !empty($_GET['src'])){
				//$sql = "SELECT * FROM ".$GLOBALS['tab10']." WHERE nome LIKE '%".$_GET['src']."%' AND ".compleDelete();
				//$dados = buscaValoresDb($sql);
				$tema0 = false;
				// if(isset($_GET['fq']))
				// 	lib_print($config);
				$src = strip_tags($_GET['src']);
				$condicao = isset($config['condicao'])?$config['condicao']:" WHERE `ativo` = 's' AND (titulo LIKE '%".$src."%' OR descricao LIKE '%".$src."%') ";
				$ordenar = " ORDER BY `ordenar` ASC";
				$dadosProdutos = $this->dadosFiltroCursos2($condicao,$ordenar,$GLOBALS['tab10']);
				if(is_adminstrator(1))
				$result['dadosProdutos'] = $dadosProdutos;
				$result['lista_produtos']	= false;
				$result['resumo_pagina'] = 0;
				$result['paginacao_site'] =  $this->paginaCaoSite(0,$_GET['regi_pag'],$_GET['pag']);
				if($dadosProdutos['found']){
							$ret0 = $this->foreash_cursos($dadosProdutos['produtos_page'],$tema1);
							$result['lista_produtos'] =  $ret0;
							$result['paginacao_site'] =  $this->paginaCaoSite($dadosProdutos['reg_enc'],$_GET['regi_pag'],$_GET['pag']);
							$result['resumo_pagina']  =  $dadosProdutos['reg_enc'];
				}else{
							$result['lista_produtos'] = '<div class="col-md-12">'.formatMensagem('<strong>Erro:</strong> Registro não encontrado','danger',40000).'</div>';
				}
				$conteudo = $result['lista_produtos'];
			}
			$painel_consulta = $_GET['pag'].' de '.$_GET['regi_pag'];
			$ret = str_replace('{{painel_menu}}',$painelMenu,$tema);
			$ret = str_replace('{{painel_consulta}}',$painel_consulta,$ret);
			$ret = str_replace('{{grade_cursos}}',$conteudo,$ret);
			$ret = str_replace('{{paginacao_site}}',$result['paginacao_site'],$ret);
		return $ret;
	}
	public function detalhesCurso($config=false){
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/detalhes_cursos.html'));
		$tema = $temaHTML[0];
		//$tema = carregaArquivo($this->pastaTema().'/detalhes_cursos.html');
		if(isset($config['titulo'])){
				$ead = new Ead;
				$ecomerce = new ecomerce;
				$iframe_video_divulgacao=false;
				$link_video_divulgacao=false;
				$curso_requisito = false;
				if(isset($config['config']) && !empty($config['config'])){
					$config['config'] = json_decode($config['config'],true);
					if(isset($config['config']['video'])&&!empty($config['config']['video'])){
						$idv=explode('?',$config['config']['video']);
						if(isset($idv[1])&&!empty($idv[1])){
							parse_str($idv[1],$v);
							if(isset($v)){
								$vl = $v;
								$link_video_divulgacao = 'https://www.youtube.com/embed/'.$vl['v'].'?modestbranding=1';
							}
						}
						$iframe_video_divulgacao = str_replace('{link_video_divulgacao}',$link_video_divulgacao,$temaHTML[5]);
					}
					if(isset($config['config']['requisito'])&&!empty($config['config']['requisito'])){
						$dadosCurRequi = dados_tab($GLOBALS['tab10'],'nome,titulo,categoria,url',"WHERE id='".$config['config']['requisito']."' ");
						if($dadosCurRequi){
							$urlCursoReq = $this->urlsCursosSite('cursos',$dadosCurRequi[0]['categoria'],$dadosCurRequi[0]['url']);
							$curso_requisito = '<a title="Detalhar '.$dadosCurRequi[0]['titulo'].'" href="'.$urlCursoReq.'">'.$dadosCurRequi[0]['titulo'].'</a>';
						}
					}
				}
				$ret['tema'] = str_replace('{nome_curso}',$config['titulo'],$tema);
				$ret['tema'] = str_replace('{description}',$config['meta_descricao'],$ret['tema']);
				$ret['tema'] = str_replace('{descricao}',$config['descricao'],$ret['tema']);
				$ret['tema'] = str_replace('{{iframe_video_divulgacao}}',$iframe_video_divulgacao,$ret['tema']);
				$ret['tema'] = str_replace('{link_video_divulgacao}',$link_video_divulgacao,$ret['tema']);
				$ret['tema'] = str_replace('{curso_requisito}',$curso_requisito,$ret['tema']);
				$price_box = $this->price_box($config['id'],true);
				$verificarCursoComprado = $this->verificarCursoComprado($config['id']);
				$resumoConteudoCurso = $ead->resumoConteudoCurso($config['id']);
				//lib_print($verificarCursoComprado);
				/*if($config['categoria'] =='cursos_online' || $config['categoria'] =='cursos_semi_presencias'){
					$carga_horaria = $resumoConteudoCurso['duracaoHora'];
				}else{
					$carga_horaria = $config['duracao'].' '.$config['unidade_duracao'];
				}*/
				if($config['categoria'] =='cursos_online' || $config['categoria'] =='cursos_semi_presencias'){
					$price = $price_box['html'];
					$mod_preco = str_replace('{{price_box}}',$price,@$temaHTML[13]);
					$carga_horaria = $resumoConteudoCurso['duracaoHora'];
					$config['temaVideos'] = @$temaHTML[11];
					$sidebar_modulos = str_replace('{modulos_curso_gratis}',$this->modulosCursoGratis($config),@$temaHTML[10]);
				}else{
					$price = false;
					$carga_horaria = $config['duracao'].' '.$config['unidade_duracao'];
					$sidebar_modulos = false;
					$mod_preco = false;
				}

				if(isset($verificarCursoComprado['dados'])){
					$verificarCursoComprado['dados']['categoria'] = $config['categoria'];
					$btn_comprar = $this->btnInicioAula($verificarCursoComprado['dados']);
				}else{
					$btn_comprar = $ecomerce->btnComprar(array('id_produto'=>$config['id']));
				}
				$ret['tema'] = str_replace('{carga_horaria}',$carga_horaria,$ret['tema']);
				$ret['tema'] = str_replace('{label_carga_horaria}','Carga horária:',$ret['tema']);
				//$valor 		 = number_format($config['valor'],2,',','.');
				$valor 		 = @$price_box['codi']['valor'];
				$inscricao	 = @$price_box['codi']['inscricao'];
				$turmas = $this->turmasFrot($config['id']);
				$totalTurmas = $turmas['total'];
				$videoAulas = false;
				$Temalist_carac = '<ul>{li}</ul>';
				//if($config['categoria']=='cursos_online' && $resumoConteudoCurso['totalVideo']>0){
				if($resumoConteudoCurso['totalVideo']>0){
					$videoAulas = '<li>
											'.$resumoConteudoCurso['totalVideoHtml'].'
										</li>';
				}
				$lic =  $videoAulas;
				if($resumoConteudoCurso['totalProva']>0){
					$lic .=  '<li>'.$resumoConteudoCurso['totalExercicioHtml'].'</li>';
				}
				if($resumoConteudoCurso['totalProva']>0){
					$lic .=  '<li>'.$resumoConteudoCurso['totalProvaHtml'].'</li>';
				}
				if($resumoConteudoCurso['totalApostila']>0){
					$lic .=  '<li>'.$resumoConteudoCurso['totalApostilaHtml'].'</li>';
				}
				if($resumoConteudoCurso['totalArtigo']>0){
					$lic .=  '<li>'.$resumoConteudoCurso['totalArtigoHtml'].'</li>';
				}
				$list_carac = str_replace('{li}',$lic,$Temalist_carac);
				$ret['tema'] = str_replace('{{turmas_list}}',$turmas['list'],$ret['tema']);
				$ret['tema'] = str_replace('{{list_carac}}',$list_carac,$ret['tema']);
				$ret['tema'] = str_replace('{{turmas_total}}',$totalTurmas,$ret['tema']);
				$ret['tema'] = str_replace('{label_turmas}','Turmas:',$ret['tema']);
				if(isAero()){
					$ret['tema'] = str_replace('{{formulario_interesse}}',$this->frm_interesseFrontAero($config),$ret['tema']);
				}else{
					$ret['tema'] = str_replace('{{formulario_interesse}}',$this->frm_interesseFront($config),$ret['tema']);
				}
				$ret['tema'] = str_replace('{informacoes}',$config['obs'],$ret['tema']);
				$categoria = buscaValorDb($GLOBALS['tab9'],'token',$config['categoria'],'label_front');

				$ret['tema'] = str_replace('{{categoria}}',$categoria,$ret['tema']);
				$ret['tema'] = str_replace('{{valor_curso}}',$valor,$ret['tema']);
				$ret['tema'] = str_replace('{{inscricao}}',$inscricao,$ret['tema']);
				$ret['tema'] = str_replace('{{price_box}}',$price_box['html'],$ret['tema']);
				$ret['tema'] = str_replace('{{btn_comprar}}',$btn_comprar,$ret['tema']);
				$ret['tema'] = str_replace('{modulos_curso}',$this->modulosCurso($config),$ret['tema']);
				$ret['tema'] = str_replace('{{sidebar_modulos}}',$sidebar_modulos,$ret['tema']);
				$ret['tema'] = str_replace('{{painel_edit}}',$this->painel_edit_cursosSite($config['id'],$GLOBALS['tab10']),$ret['tema']);
				$url_imagem_banner = isset($config['url_banner'][1]['url'])?$config['url_banner'][1]['url']:false;
				$ret['tema'] = str_replace('{url_imagem_capa}',$config['url_imagem_capa']['url'],$ret['tema']);
				$infoProfessor = $this->infoProfessor($config);
				$ret['tema'] = str_replace('{info_professor}',$infoProfessor['html'],$ret['tema']);
				$ret['tema'] = str_replace('{url_imagem_banner}',$url_imagem_banner,$ret['tema']);
				$ret['tema'] = str_replace('{url_imagem_banner}',$url_imagem_banner,$ret['tema']);
				$ret['tema'] = str_replace('{link_img_certificado}',$this->urPrincipal.'img/certificado.png',$ret['tema']);
				if($infoProfessor['professor']){
					$teacher = str_replace('{teacher}','Ministrado por:',$temaHTML[4]);
				}else{
					$teacher = false;
				}

				$ret['tema'] = str_replace('{teacher}',$teacher,$ret['tema']);
				$ret['tema'] = str_replace('{label_instrutor}','Ministrado por:',$ret['tema']);
				$ret['tema'] = str_replace('{professor}','<b>'.$infoProfessor['professor'].'</b>',$ret['tema']);
				$ret['tema'] = str_replace('{link_img_certificado}',$this->urPrincipal.'img/certificado.png',$ret['tema']);
		}else{
				$ret['tema'] = '<div class="header-detalhes">'.formatMensagem('Curso não encontrado ou desativado!!','danger',700000).'</div>';
		}
		$ret['grade_cursos'] = false;
		$ret['conteudo_pagina'] = false;
		return $ret;
	}
	public function infoProfessor($config=false,$temaProf=false){
		$ret['html'] = false;
		$ret['professor'] = false;
		$ret['professor_description'] = false;
		$ret['professor_foto'] = false;
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/detalhes_cursos.html'));
		$temaProf = $temaHTML[1];
		if(isset($config['professor']) && !empty($config['professor'])){
			$dadosProfessor = buscaValoresDb_SERVER("SELECT * FROM ".$GLOBALS['usuarios_sistemas']." WHERE id = '".$config['professor']."'");
			if($dadosProfessor){
					$professor = $dadosProfessor[0]['nome'].' '.$dadosProfessor[0]['sobrenome'];
					$professor_description = $dadosProfessor[0]['obs'];
					$professor_foto = verImagemSlim_SERVER("WHERE token='".$dadosProfessor[0]['token']."'",'imagem_user_remoto','',3);
					$ret['html'] = str_replace('{professor}','<b>'.$professor.'</b>',$temaProf);
					$ret['html'] = str_replace('{professor_description}',$professor_description,$ret['html']);
					$ret['html'] = str_replace('{imagem_professor}',$professor_foto,$ret['html']);
					$ret['professor'] 					= $professor;
					$ret['professor_description'] 	= $professor_description;
					$ret['professor_foto'] 			= $professor_foto;
			}else{
						$professor = false;
						$professor_description = false;
						$professor_foto = false;
			}
		}else{
				$professor = false;
				$professor_description = false;
				$professor_foto = false;
		}
		return $ret;
	}
	public function frm_interesseFront($config=false){
		global $tk_conta;
		$ret = false;
		//print_r($_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]);
		$titleFI = short_code('cabecario_form_interesse')?short_code('cabecario_form_interesse'):'Tenho interesse e quero receber informações';
		$config['acao'] = isset($config['acao'])?$config['acao']:'cad';
		$ret .= '<div class="card padding-none" style="padding-top:10px">';
		$ret .= '<div class="card-header">';
		$ret .= '<h6 class="mb-0">'.$titleFI.'</h6>';
		$ret .= '</div>';
		$ret .= '<div class="card-body">';
						$ret .= '<form role="form" id="form_cad_user" method="post">';
						$conf['origem'] 		= 'site';
						$conf['id_curso'] 	= $config['id'];
						$conf['acao'] 		= 'alt';
						$conf['size'] 		= '12';
						$diasAntes = queta_option('dias_turma_valida') ? queta_option('dias_turma_valida'):10;
						$hoje = dtBanco(CalcularDiasAnteriores(date('d/m/Y'),$diasAntes,$formato = 'd/m/Y'));
						$compleSql = " AND `inicio` >= '".$hoje."'";
						$arr_turma = sql_array("SELECT * FROM ".$GLOBALS['tab11']." WHERE `ativo`='s' AND `id_curso`='".$conf['id_curso']."' $compleSql AND ".compleDelete()." ORDER BY id ASC",'nome','id','inicio',' Inicio: ','data');
						$eventNoCurso = 'data-live-search="true"';
						if(!$arr_turma){
							$acc = 'selectTurma';
							$config['campos_form'][0] = array('type'=>'hidden','col'=>'md','size'=>'12','campos'=>'dados[curso][id_turma]-','value'=>@$id_turma,'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						}else{
							$acc = false;
							$config['campos_form'][0] = array('type'=>'select','col'=>'md','size'=>'12','campos'=>'dados[curso][id_turma]-Turma','opcoes'=>$arr_turma,'selected'=>@array(@$id_turma,''),'css'=>'','event'=>$eventNoCurso .' ' ,'obser'=>false,'outros'=>false,'class'=>'form-control ','acao'=>$acc,'sele_obs'=>'-- Selecione (Opcional) --','title'=>'');
						}
						$id_turma = false;
						if(Url::getURL(4)!=NULL){
							$id_turma = base64_decode(Url::getURL(4));
						}
						//$config['campos_form'][0] = array('type'=>'select','col'=>'md','size'=>'12','campos'=>'dados[curso][id_turma]-Turma','opcoes'=>$arr_turma,'selected'=>@array(@$_GET['id_turma'],''),'css'=>'','event'=>$eventNoCurso .' ' ,'obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>$acc,'sele_obs'=>'-- Selecione--','title'=>'');
						$config['campos_form'][1] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'dados[cli][Email]-email*-email','value'=>@$_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['Email'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						$config['campos_form'][2] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'dados[cli][Nome]-Primeiro Nome*-Primeiro Nome','value'=>@$_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['Nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						$config['campos_form'][3] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'dados[cli][sobrenome]-Sobrenome-Sobrenome','value'=>@$_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['sobrenome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						$config['campos_form'][4] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'dados[cli][Celular]-Telefone/Whatsapp-Celular com DDD','value'=>@$_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['Celular'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						$config['campos_form'][5] = array('type'=>'textarea','size'=>'12','campos'=>'dados[curso][obs]-Mensagem ','value'=>@$_GET['obs'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						$ret .= formCampos($config['campos_form']);
						$ret .= queta_formfield4("hidden",'1',"dados[curso][id_curso]-", @$config['id'],"","");
						$ret .= queta_formfield4("hidden",'1',"dados[curso][origem]-", @$conf['origem'],"","");
						$ret .= queta_formfield4("hidden",'1',"dados[curso][token]-", @uniqid(),"","");
						$ret .= queta_formfield4("hidden",'1',"dados[curso][status]-", 1,"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][token]-", @uniqid(),"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][conf]-", 's',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][campo_bus]-", 'Email',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][origem]-", @$conf['origem'],"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][permissao]-", '1',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][ac]-", $config['acao'],"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][EscolhaDoc]-", 'CPF',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][sec]-", 'cad_interesse_site',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][tab]-", base64_encode($GLOBALS['tab15']),"","");
						$ret .= queta_formfield4("hidden",'1',"local-", 'form_cad_user',"","");
						if(isset($_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['id'])){
							$ret .= queta_formfield4("hidden",'1',"dados[curso][id_cliente]-", $_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['id'],"","");
						}
						$ret .= '<div class="col-md-12 mens"></div>';
						$ret .= '<div class="col-md-12" style="padding:10px 10px ">';
						$ret .= '<button type="submit" class="btn btn-outline-secondary">Enviar</button>';
						$ret .= '</div>';
						$ret .= '</form>';
		$ret .= '</div>';
		$ret .= '</div>';
			$ret .= '
			<script>
				jQuery(document).ready(function () {
					var icon = \'\';
					jQuery(\'[id="dados[cli][Celular]"]\').mask(\'(99)99999-9999\');
					';
		$ret .= 'jQuery(\'#form_cad_user\').validate({
							submitHandler: function(form) {
								$.ajax({
									url: \''.RAIZ.'/app/ead/acao.php?ajax=s&acao='.$config['acao'].'&campo_bus=Email&opc=cadInteressadosSite\',
									type: form.method,
									data: jQuery(form).serialize(),
									beforeSend: function(){
										jQuery(\'#preload\').fadeIn();
									},
									async: true,
									dataType: "json",
									success: function(response) {
										jQuery(\'#preload\').fadeOut();
										jQuery(\'.mens\').html(response.salvarMatricula.mensa);
										if(response.enviaEmail2.exec){
											window.location = \''.queta_option('dominio_site').'/obrigado-pelo-interesse\';
										}
										if(response.whatsapp.celular&&response.whatsapp.mensagem){
											var celular = response.whatsapp.celular;
											var mensagem = response.whatsapp.mensagem;
											linkAbrirWhatsapp(celular,mensagem);
										}
										//alert(\'Obrigado por preencher o formulário de interesse \n em breve entraremos em contato!\');
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
		return $ret;
	}
	public function frm_interesseFrontAero($config=false){
		global $tk_conta;
		$ret = false;
		//print_r($_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]);
		$config['acao'] = isset($config['acao'])?$config['acao']:'cad';
		$ret .= '<div class="card padding-none" style="padding-top:10px">';
		$ret .= '<div class="card-header" id="frm_interesseFrontAero">';
		$ret .= '<h6 class="mb-0">Tenho interesse e quero reservar/receber informações</h6>';
		$ret .= '</div>';
		$ret .= '<div class="card-body">';
						$ret .= '<form role="form" id="form_cad_user" method="post">';
						$ret .= '<div class="row">';
						$conf['origem'] 		= 'site';
						$conf['id_curso'] 	= $config['id'];
						$conf['acao'] 		= 'alt';
						$conf['size'] 		= '12';
						$diasAntes = queta_option('dias_turma_valida') ? queta_option('dias_turma_valida'):10;
						$hoje = dtBanco(CalcularDiasAnteriores(date('d/m/Y'),$diasAntes,$formato = 'd/m/Y'));
						$compleSql = " AND `inicio` >= '".$hoje."'";
						$arr_turma = sql_array("SELECT * FROM ".$GLOBALS['tab11']." WHERE `ativo`='s' AND `id_curso`='".$conf['id_curso']."' $compleSql AND ".compleDelete()." ORDER BY id ASC",'nome','id','inicio',' Inicio: ');
						$eventNoCurso = 'data-live-search="true"';
						if(!$arr_turma){
							$acc = 'selectTurma';
						}else{
							$acc = false;
						}
						$id_turma = false;
						if(Url::getURL(4)!=NULL){
							$id_turma = base64_decode(Url::getURL(4));
						}
						//$config['campos_form'][0] = array('type'=>'select','col'=>'md','size'=>'12','campos'=>'dados[curso][id_turma]-Turma','opcoes'=>$arr_turma,'selected'=>@array(@$_GET['id_turma'],''),'css'=>'','event'=>$eventNoCurso .' ' ,'obser'=>false,'outros'=>false,'class'=>'form-control selectpicker','acao'=>$acc,'sele_obs'=>'-- Selecione--','title'=>'');
						$config['campos_form'][0] = array('type'=>'select','col'=>'md','size'=>'12','campos'=>'dados[curso][id_turma]-Turma','opcoes'=>$arr_turma,'selected'=>@array(@$id_turma,''),'css'=>'','event'=>$eventNoCurso .' ' ,'obser'=>false,'outros'=>false,'class'=>'form-control ','acao'=>$acc,'sele_obs'=>'-- Selecione--','title'=>'');
						$config['campos_form'][1] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'dados[cli][Email]-email*-email','value'=>@$_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['Email'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						$config['campos_form'][2] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'dados[cli][Nome]-Nome completo*-Nome completo','value'=>@$_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['Nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						//$config['campos_form'][3] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'dados[cli][sobrenome]-Sobrenome-Sobrenome','value'=>@$_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['sobrenome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						$config['campos_form'][4] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'dados[cli][Celular]-Telefone/Whatsapp-Celular com DDD','value'=>@$_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['Celular'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						$config['campos_form'][6] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'dados[cli][canac]-CANAC-opcional ','value'=>@$_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['canac'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						if($config['categoria']=='cursos_presencias_pratico'){

						}
						$config['campos_form'][5] = array('type'=>'textarea','size'=>'12','campos'=>'dados[curso][obs]-Observações ','value'=>@$_GET['obs'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
						$ret .= formCampos($config['campos_form']);
						$ret .= queta_formfield4("hidden",'1',"dados[curso][id_curso]-", @$config['id'],"","");
						$ret .= queta_formfield4("hidden",'1',"dados[curso][origem]-", @$conf['origem'],"","");
						$ret .= queta_formfield4("hidden",'1',"dados[curso][token]-", @uniqid(),"","");
						$ret .= queta_formfield4("hidden",'1',"dados[curso][status]-", 1,"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][token]-", @uniqid(),"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][conf]-", 's',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][campo_bus]-", 'Email',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][origem]-", @$conf['origem'],"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][permissao]-", '1',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][ac]-", $config['acao'],"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][EscolhaDoc]-", 'CPF',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][sec]-", 'cad_interesse_site',"","");
						$ret .= queta_formfield4("hidden",'1',"dados[cli][tab]-", base64_encode($GLOBALS['tab15']),"","");
						if(isset($_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['id'])){
							$ret .= queta_formfield4("hidden",'1',"dados[curso][id_cliente]-", $_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['id'],"","");
						}
						$ret .= csrf();
						$ret .= '<div class="col-md-12 mens"></div>';
						$ret .= '<div class="col-md-12" style="padding:10px 10px ">';
						$ret .= '<button type="submit" class="btn btn-outline-secondary">Enviar</button>';
						$ret .= '</div>';
						$ret .= '</div>';
						$ret .= '</form>';
		$ret .= '</div>';
		$ret .= '</div>';
			$ret .= '
			<script>
				jQuery(document).ready(function () {
					var icon = \'\';
					jQuery(\'[id="dados[cli][Celular]"]\').mask(\'(99)99999-9999\');
					';
		$ret .= 'jQuery(\'#form_cad_user\').validate({
							submitHandler: function(form) {
								$.ajax({
									url: \''.RAIZ.'/app/ead/acao.php?ajax=s&acao='.$config['acao'].'&campo_bus=Email&opc=cadInteressadosSite\',
									type: form.method,
									data: jQuery(form).serialize(),
									beforeSend: function(){
										jQuery(\'#preload\').fadeIn();
									},
									async: true,
									dataType: "json",
									success: function(response) {
										jQuery(\'#preload\').fadeOut();
										jQuery(\'.mens\').html(response.salvarMatricula.mensa);
										if(response.whatsapp.celular&&response.whatsapp.mensagem){
											var celular = response.whatsapp.celular;
											var mensagem = response.whatsapp.mensagem;
											linkAbrirWhatsapp(celular,mensagem);
										}
										//alert(\'Obrigado por preencher o formulário de interesse \n em breve entraremos em contato!\');
										if(response.salvarMatricula.exec){
											window.location = \''.queta_option('dominio_site').'\';
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
		return $ret;
	}
	public function cadInteressadosSite($config=false){
		$ret = false;
		global $tk_conta;
		// if(isAdmin(1)){

		// 	dd($config);
		// }
		$cond_valid = "WHERE ".$config['dados']['cli']['campo_bus']." = '".$config['dados']['cli'][$config['dados']['cli']['campo_bus']]."' AND ".compleDelete();$type_alt = 2;
		$tabUser = base64_decode($config['dados']['cli']['tab']);
		$config['dados']['cli']['senha'] = '';
		$config2 = array(
				'tab'=>$tabUser,
				'valida'=>true,
				'condicao_validar'=>$cond_valid,
				'sqlAux'=>false,
				'ac'=>$config['dados']['cli']['ac'],
				'type_alt'=>$type_alt,
				'dadosForm' => $config['dados']['cli']
		);
		$whatsapp = buscaValorDb_SERVER('usuarios_sistemas','token',$_SESSION[SUF_SYS]['token_conta'.SUF_SYS],'celular');
		$mensagemW = 'Olá meu nome é *'.$config['dados']['cli']['Nome'].'* Tenho interesse no curso *'.buscaValorDb($GLOBALS['tab10'],'id',$config['dados']['curso']['id_curso'],'titulo').'*';
		$mensagemW .= ' '.$config['dados']['curso']['obs'];

		$ret['salvarCliente'] = json_decode(lib_salvarFormulario($config2),true);
		if($whatsapp){
				$ret['whatsapp']['celular'] = $whatsapp;
				$ret['whatsapp']['mensagem'] = $mensagemW;
		}
		if($ret['salvarCliente']['exec']){
			//se for novo cliente
			if(isset($ret['salvarCliente']['idCad'])){
				$config['dados']['curso']['id_cliente'] = $ret['salvarCliente']['idCad'];
			}
		}elseif(!$ret['salvarCliente']['exec']){
			//se nao salvou novo cliente
			if($ret['salvarCliente']['salvar']['mess']=='enc'){
				//se o cadastro de cliente ja foi encontrado
				$config['dados']['curso']['id_cliente'] = $ret['salvarCliente']['salvar']['dados_enc'][0]['id'];
			}
		}
		$ret['salvarMatricula']['exec'] = false;
		if(isset($config['dados']['curso']['id_cliente']) && !empty($config['dados']['curso']['id_cliente'])){
			$configMatricula				 			=	$config['dados']['curso'];
			$configMatricula['tab']				 	= 	base64_encode($GLOBALS['tab12']);
			//$configMatricula['id_cliente'] 			=	$config['dados']['curso']['id'];
			$configMatricula['ac'] 					=	$config['dados']['cli']['ac'];
			$configMatricula['evento']				=  'Via site';
			$configMatricula['memo']				=  'Via site';
			$configMatricula['tag']					=  json_encode(array('via_site'));
			if(isset($_SESSION[$tk_conta]['af']['autor'])){
				$configMatricula['autor']				=  $_SESSION[$tk_conta]['af']['autor'];
				$dias_seguir = 1000;
				$dataSeg 					= CalcularVencimento2(date('d/m/Y'),$dias_seguir);
				$configMatricula['seguido_por']	=  $_SESSION[$tk_conta]['af']['autor'];
				$configMatricula['data_seguir']	=  dtBanco($dataSeg).' 00:00:00';
			}
			$configMatricula['id_responsavel']	=  false;
			$configMatricula['conf']					=  $config['dados']['cli']['conf'];
			//print_r($configMatricula);exit;
			$ret['salvarMatricula'] = json_decode(salvarMatricula($configMatricula),true);
			$eviarEmail = false;
			$id_matricula = false;
			if($ret['salvarMatricula']['exec']){
				$eviarEmail = true;
				$id_matricula = $ret['salvarMatricula']['idCad'];
			}elseif($ret['salvarMatricula']['salvar']['mess']=='enc'){
				$eviarEmail = true;
				$id_matricula = $ret['salvarMatricula']['salvar']['dados_enc'][0]['id'];
			}
			if(isset($config['dados']['cli']['Nome']))
				$_SESSION[TK_CONTA]['agradecimento']['nome'] = $config['dados']['cli']['Nome'];
			if($eviarEmail){
					$email = new robo_emils;//declarado em app/email
					$emailCliente = $config['dados']['cli']['Email'];
					$nomeCliente = $config['dados']['cli']['Nome'];
					$mensagem = queta_option('mensagem_email_formulario_interesse');
					$senhaSalv = buscaValorDb($tabUser,'id',$config['dados']['curso']['id_cliente'],'senha');
					if($senhaSalv == ''){
						$mensagem .= 'Se desejar você pode criar sua conta de acesso para nossa área exclusiva, agora mesmo <br>
						<br><div align="center"><a href="|link_cria_senha|" style="padding:20px;background:orange;color:#fff;font-weight:bold;text-decoration:none;">Criar conta de acesso</a></div>';
					}
					$link_cria_senha = queta_option('dominio_site').'/account/pass/create/'.base64_encode($emailCliente);
					$mensagem = str_replace('|nome_cliente|',$nomeCliente,$mensagem);
					$mensagem = str_replace('|link_cria_senha|',$link_cria_senha,$mensagem);
					$curso = buscaValorDb($GLOBALS['tab10'],'id',$config['dados']['curso']['id_curso'],'nome');
					$Turma = buscaValorDb($GLOBALS['tab11'],'id',$config['dados']['curso']['id_turma'],'nome');
					$compleMesResp = '<br>Email: '.$emailCliente.'<br>Telefone: '.$config['dados']['cli']['Celular'].'<br>Nome: '.$nomeCliente.'<br>Curso: '.$curso.'<br>Turma: '.$Turma;
					if($id_matricula){
						$urlRegistro= RAIZ.'/cursos?sec=aW50ZXJlc3NhZG9z&list=false&regi_pg=40&pag=0&acao=alt&id='.base64_encode($id_matricula);
						$compleMesResp .= '<div align="center"><a href="'.$urlRegistro.'" target="_BLANK" style="padding:20px;background:orange;color:#fff;font-weight:bold;text-decoration:none;">visualizar</a></div>';
					}

					$config_em = array(
							'emails'=>array(
								array('email'=>$emailCliente,'nome'=>$nomeCliente),
							),
							//'Bcc'=>'fernando@maisaqui.com.br',
							'assunto'=>'Boas vindas',
							'mensagem'=>$mensagem,
							'empresa'=>'Nome do sistema',
							'post'=>false,
							'resp'=>array(
										'envia'=>true,
										'email'=>queta_option('email_gerente'),
										'nome'=>$nomeCliente,
										'mensResp'=>'Foi preenchido o formulário de interesse no sistema EAD em '.date('d/m/Y H:m:i').$compleMesResp,
										'assunto'=>'Interessado em '.$curso
							),
					);
					$ret['enviaEmail2'] = $email->enviaEmail2($config_em);
			}
		}
		return $ret;
	}
	/**
	 * Adicionar uma matricula no sistema
	 */
	public function cadMatriculado($config=false){
		$ret = false;
		global $tk_conta;
		// if(isAdmin(1)){

		// 	dd($config);
		// }
		// /*  extrutura de Dados
		// {
		// {
		// 	"dados": {
		// 			"curso": {
		// 					"id_turma":"",
		// 					"obs": "Ola meu teste",
		// 					"id_curso": 149,
		// 					"origem": "api",
		// 					"token": "636900620ff25",
		// 					"memo": "teste_api",
		// 					"token_externo": "23api1",
		// 					"status": 2
		// 			},
		// 			"cli":                 {
		// 					"Email": "api@maisaqui.com.br",
		// 					"Nome": "José",
		// 					"sobrenome": "Fernando",
		// 					"Celular": "32 99164-8202",
		// 					"Cpf": "123.456.789-09",
		// 					"token": "636900620ff31",
		// 					"senha": "mudar123",
		// 					"conf": "s",
		// 					"campo_bus": "Email",
		// 					"origem": "site",
		// 					"permissao": 1,
		// 					"ac": "cad",
		// 					"EscolhaDoc": "CPF",
		// 					"Endereco": "Rua presidente furtado",
		// 					"Numero": "25",
		// 					"Bairro": "Centro",
		// 					"Cidade": "Juiz de Fora",
		// 					"token_externo": "api23pri",
		// 					"sec": "cad_interesse_site"
		// 			}
		// 	},
		// 	"local": "form_cad_user",
		// 	"campo_bus": "id",
		// 	"campo_id": "id"
		// }
		$cond_valid = "WHERE ".$config['dados']['cli']['campo_bus']." = '".$config['dados']['cli'][$config['dados']['cli']['campo_bus']]."' AND ".compleDelete();
		$type_alt = isset($config['dados']['cli']['type_alt'])?$config['dados']['cli']['type_alt']:1;
		$tabUser = $GLOBALS['tab15'];
		$config['dados']['cli']['senha'] = isset($config['dados']['cli']['senha'])?$config['dados']['cli']['senha']:'';
		$config2 = array(
				'tab'=>$tabUser,
				'valida'=>true,
				'condicao_validar'=>$cond_valid,
				'sqlAux'=>false,
				'ac'=>$config['dados']['cli']['ac'],
				'type_alt'=>$type_alt,
				'dadosForm' => $config['dados']['cli']
		);
		$whatsapp = buscaValorDb_SERVER('usuarios_sistemas','token',$_SESSION[SUF_SYS]['token_conta'.SUF_SYS],'celular');
		$mensagemW = 'Olá meu nome é *'.$config['dados']['cli']['Nome'].'* Tenho interesse no curso *'.buscaValorDb($GLOBALS['tab10'],'id',$config['dados']['curso']['id_curso'],'titulo').'*';
		$mensagemW .= ' '.$config['dados']['curso']['obs'];
		$ret['salvarCliente'] = json_decode(lib_salvarFormulario($config2),true);
		if($whatsapp){
				$ret['whatsapp']['celular'] = $whatsapp;
				$ret['whatsapp']['mensagem'] = $mensagemW;
		}
		if($ret['salvarCliente']['exec']){
			//se for novo cliente
			if(isset($ret['salvarCliente']['idCad'])){
				$config['dados']['curso']['id_cliente'] = $ret['salvarCliente']['idCad'];
			}
		}elseif(!$ret['salvarCliente']['exec']){
			//se nao salvou novo cliente
			if($ret['salvarCliente']['salvar']['mess']=='enc'){
				//se o cadastro de cliente ja foi encontrado
				$config['dados']['curso']['id_cliente'] = $ret['salvarCliente']['salvar']['dados_enc'][0]['id'];
			}
		}

		$ret['salvarMatricula']['exec'] = false;
		if(isset($config['dados']['curso']['id_cliente']) && !empty($config['dados']['curso']['id_cliente'])){
			$configMatricula			=	$config['dados']['curso'];
			$configMatricula['tab']		= 	base64_encode($GLOBALS['tab12']);
			//$configMatricula['id_cliente'] 			=	$config['dados']['curso']['id'];
			$configMatricula['ac'] 		=	$config['dados']['cli']['ac'];
			$configMatricula['evento']	=  isset($config['dados']['curso']['evento'])?$config['dados']['curso']['evento']:'Via api';
			$configMatricula['memo']	=  isset($config['dados']['curso']['memo'])?$config['dados']['curso']['memo']:'Via api';
			$configMatricula['tag']		=  json_encode(array('via_site'));
			if(isset($_SESSION[$tk_conta]['af']['autor'])){
				$configMatricula['autor']	=  $_SESSION[$tk_conta]['af']['autor'];
				$dias_seguir = 1000;
				$dataSeg 					= CalcularVencimento2(date('d/m/Y'),$dias_seguir);
				$configMatricula['seguido_por']	=  $_SESSION[$tk_conta]['af']['autor'];
				$configMatricula['data_seguir']	=  dtBanco($dataSeg).' 00:00:00';
			}
			$configMatricula['id_responsavel']	=  false;
			$configMatricula['conf']					=  $config['dados']['cli']['conf'];

			$ret['salvarMatricula'] = json_decode(salvarMatricula($configMatricula),true);
			$eviarEmail = false;
			$id_matricula = false;
			if($ret['salvarMatricula']['exec']){
				$eviarEmail = true;
				$id_matricula = $ret['salvarMatricula']['idCad'];
			}elseif($ret['salvarMatricula']['salvar']['mess']=='enc'){
				$eviarEmail = true;
				$id_matricula = $ret['salvarMatricula']['salvar']['dados_enc'][0]['id'];
			}
			if(isset($config['dados']['cli']['Nome']))
				$_SESSION[TK_CONTA]['agradecimento']['nome'] = $config['dados']['cli']['Nome'];
			if($eviarEmail){
					$email = new robo_emils;//declarado em app/email
					$emailCliente = $config['dados']['cli']['Email'];
					$nomeCliente = $config['dados']['cli']['Nome'];
					$mensagem = queta_option('mensagem_email_formulario_interesse');
					$senhaSalv = buscaValorDb($tabUser,'id',$config['dados']['curso']['id_cliente'],'senha');
					if($senhaSalv == ''){
						$mensagem .= 'Se desejar você pode criar sua conta de acesso para nossa área exclusiva, agora mesmo <br>
						<br><div align="center"><a href="|link_cria_senha|" style="padding:20px;background:orange;color:#fff;font-weight:bold;text-decoration:none;">Criar conta de acesso</a></div>';
					}
					$link_cria_senha = queta_option('dominio_site').'/account/pass/create/'.base64_encode($emailCliente);
					$mensagem = str_replace('|nome_cliente|',$nomeCliente,$mensagem);
					$mensagem = str_replace('|link_cria_senha|',$link_cria_senha,$mensagem);
					$curso = buscaValorDb($GLOBALS['tab10'],'id',$config['dados']['curso']['id_curso'],'nome');
					$Turma = buscaValorDb($GLOBALS['tab11'],'id',$config['dados']['curso']['id_turma'],'nome');
					$compleMesResp = '<br>Email: '.$emailCliente.'<br>Telefone: '.$config['dados']['cli']['Celular'].'<br>Nome: '.$nomeCliente.'<br>Curso: '.$curso.'<br>Turma: '.$Turma;
					if($id_matricula){
						$urlRegistro= RAIZ.'/cursos?sec=aW50ZXJlc3NhZG9z&list=false&regi_pg=40&pag=0&acao=alt&id='.base64_encode($id_matricula);
						$compleMesResp .= '<div align="center"><a href="'.$urlRegistro.'" target="_BLANK" style="padding:20px;background:orange;color:#fff;font-weight:bold;text-decoration:none;">visualizar</a></div>';
					}

					$config_em = array(
							'emails'=>array(
								array('email'=>$emailCliente,'nome'=>$nomeCliente),
							),
							//'Bcc'=>'fernando@maisaqui.com.br',
							'assunto'=>'Boas vindas',
							'mensagem'=>$mensagem,
							'empresa'=>'Nome do sistema',
							'post'=>false,
							'resp'=>array(
										'envia'=>true,
										'email'=>queta_option('email_gerente'),
										'nome'=>$nomeCliente,
										'mensResp'=>'Foi preenchido o formulário de interesse no sistema EAD em '.date('d/m/Y H:m:i').$compleMesResp,
										'assunto'=>'Interessado em '.$curso
							),
					);
					$ret['enviaEmail2'] = $email->enviaEmail2($config_em);
			}
		}
		return $ret;
	}
	public function frontCurso($config=false){
		$tema = carregaArquivo($this->pastaTema().'/cursos.html');
		$conteudo_pagina = $this->abrirPagina($config);
		$config['ordenar']=" ORDER BY `ordenar` ASC";
		$cursos = $this->listCursosFront($config);
		$cursos_grade	 = $cursos['lista_produtos'];
		$resumo_pagina	 = $cursos['resumo_pagina'];
		$paginacao_site	 = $cursos['paginacao_site'];
		$ret['html'] = str_replace('{{grade_cursos}}',$cursos_grade,$tema);
		$ret['html'] = str_replace('{description}',$config['meta_descricao'],$ret['html']);
		$ret['html'] = str_replace('{descricao}',$config['obs'],$ret['html']);
		$ret['html'] = str_replace('{{paginacao_site}}',$paginacao_site,$ret['html']);
		$ret['grade_cursos'] = $cursos_grade;
		return $ret;
	}
	public function detalhesPreviewMoudulos($config=false){
		if(Url::getURL(nivel_url_site()+4)=='lecture'){
			$id_atv = base64_decode(Url::getURL(nivel_url_site()+5));

			$arr_conteudo = json_decode($config['conteudo'],true);
			$conte = $this->array_enc_key($arr_conteudo,$id_atv);
			//print_r($conte);
			if($conte['array_prev']){
				$urlPrev = '/'.Url::getURL(nivel_url_site()).'/'.Url::getURL(nivel_url_site()+1).'/'.Url::getURL(nivel_url_site()+2).'/'.Url::getURL(nivel_url_site()+3).'/lecture/'.base64_encode($conte['array_prev']['idItem']);
				$displayPrev = 'block';
			}else{
				$urlPrev = false;
				$displayPrev = 'none';
			}
			if($conte['array_next']){
				$urlNext = '/'.Url::getURL(nivel_url_site()).'/'.Url::getURL(nivel_url_site()+1).'/'.Url::getURL(nivel_url_site()+2).'/lecture/'.base64_encode($conte['array_next']['idItem']);
				$displayNext = 'block';
			}else{
				$urlNext = false;
				$displayNext = 'none';
			}
			$dadosAtividade = buscaValoresDb("SELECT * FROM ".$GLOBALS['tab39']." WHERE id ='".$id_atv."'");
			if($dadosAtividade){

			$tema0 = '
			<div class="col-md-12" style="display:block">
								<div id="js-lesson-content-player" class="lesson-content-player card 1">
									<div class="lesson-content-player-heading  card-header bg-info">

											<div class="js-fix-scroll-wrapper" style="width: 1140px; height: 52px;">
												<div class="js-fix-on-scroll" style="position: static; left: auto; top: auto; width: auto; height: auto; z-index: 10000;">
													<div class="botoes">
														<div class="media-controls">
															<a href="{urlPrev}"  class="btn btn-secondary">
																<i class="icon-arrow-left"></i>
																<span>Atividade Anterior</span>
															</a>

															<a href="{urlNext}"  class="btn btn-secondary btn-next-lesson">
																<span>Próxima Atividade</span>
																<i class="icon-arrow-right"></i>
															</a>

														</div>

													</div>
												</div>
											</div>
											<h4 class="lesson-title card-title text-light">'.$dadosAtividade[0]['nome_exibicao'].'</h4>
									</div>
									<div id="js-media-player" class="media-player card-body 1">


																	{conteudo_ativ}


															<style type="text/css">
															  #js-media-player {
																z-index: 100;
															  }
															</style>


														  <div class="js-attendance-handler">
															<div class="alert alert-warning js-alert-max-time" style="display: none;">
															  Você atingiu o máximo de horas assistidas deste curso.
															</div>
															<div class="alert alert-warning js-alert-max-attempts" style="display: none;">
															  Você atingiu o máximo de visualizações deste curso.
															</div>
														  </div>
												</div>
										</div>


										<span style="display:none">\'=</span>

										<div class="footer-navigation card-footer bg-info">
											<div class="botoes">
												<div class="media-controls">

													<a href="{urlPrev}" class="btn btn-secondary">
													  <i class="icon-arrow-left"></i>
													  <span>Atividade Anterior</span>
													</a>



													<a href="{urlNext}" class="btn btn-secondary btn-next-lesson">
													  <span>Próxima Atividade</span>
													  <i class="icon-arrow-right"></i>
													</a>

												</div>

											</div>
										</div>
									</div>

									<div class="lesson-tabs">
										<ul class="nav nav-tabs">
											<li <="" li=""></li>
										</ul>
										<div class="tab-content"></div>
		</div>
	</div>
			';

					$tema0 = str_replace('{urlPrev}',$urlPrev,$tema0);
					$tema0 = str_replace('{urlNext}',$urlNext,$tema0);
					$conteudo_ativ = false;
					if($dadosAtividade[0]['tipo'] == 'Video' && !empty($dadosAtividade[0]['video'])){
						$id_vimeo = explode('/',$dadosAtividade[0]['video']);
						$conteudo_ativ = '<div class="video-player js-video-player 3">

																				<div id="vimeo-player-container" data-vimeo-initialized="true">

																					<iframe src="https://player.vimeo.com/video/'.end($id_vimeo).'" width="100%" height="651.4285714285714" frameborder="0" title="'.$dadosAtividade[0]['nome_exibicao'].'" allow="autoplay; fullscreen" allowfullscreen="" data-ready="true"></iframe>
																				</div>

																			</div>';
					}elseif($dadosAtividade[0]['tipo'] == 'Apostila'){
						$conteudo_ativ = '<div class="col-md-12 text-left"> '.$dadosAtividade[0]['descricao'].$this->apostilas($dadosAtividade[0]).'</div>';
					}elseif($dadosAtividade[0]['tipo'] == 'Prova' || $dadosAtividade[0]['tipo'] == 'Exercicio'){
						$dadosAtividade[0]['get'] = $_GET;
						$conteudo_ativ = '<div class="col-md-12 text-left"> '.$dadosAtividade[0]['descricao'].'<span  id="exibe_questao_fazer">'.$this->provasExibe($dadosAtividade[0]).'</span></div>';
					}
					$course_contents = str_replace('{conteudo_ativ}',$conteudo_ativ,$tema0);
			}else{
				$conteudo_ativ = '<div class="col-md-12">Atividade não encontrada</div>';
				$course_contents = str_replace('{conteudo_ativ}',$conteudo_ativ,$tema0);
			}
		}else{
			$course_contents = false;
		}

		$tema = carregaArquivo($this->pastaTema().'/detalhes_preview_modulo.html');
		$ret = false;
		$ret['tema'] = str_replace('{nome_modulo}','<b>Nome do Modulo</b>: '.$config['nome_exibicao'],$tema);
		$ret['tema'] = str_replace('{description}',$config['descricao'],$ret['tema']);
		$ret['tema'] = str_replace('{descricao}',$config['descricao'],$ret['tema']);
		$ret['tema'] = str_replace('{course_contents}',$course_contents,$ret['tema']);
		if(!empty($config['conteudo'])){
			$arr_conteudo = json_decode($config['conteudo'],true);
			if(is_array($arr_conteudo)){
				$total_atividades = count($arr_conteudo);
			}else{
				$total_atividades = 0;
			}
		}else{
				$total_atividades = 0;
		}
		$ret['tema'] = str_replace('{total_atividades}',$total_atividades,$ret['tema']);
		$listAtividades = $this->listAtividades($config);
		$ret['tema'] = str_replace('{list_atividades}',$listAtividades['html'] ,$ret['tema']);
		//$carga_horaria = $config['duracao'].' '.$config['unidade_duracao'];
		//$ret['tema'] = str_replace('{carga_horaria}',$carga_horaria,$ret['tema']);
		//$valor 		 = number_format($config['valor'],2,',','.');


		//$ret['tema'] = str_replace('{professor}','<b>'.$professor.'</b>',$ret['tema']);
		//$ret['tema'] = str_replace('{professor_description}',$professor_description,$ret['tema']);
		$ret['grade_cursos'] = false;
		return $ret;
	}
	public function apostilas($config=false){
		$tema =
		'
		<div class="card" style="width: 100%;">
			  <div class="card-header">
				<i class="fa fa-download"></i> Material para Baixar
			  </div>
				<ul class="list-group" style="display: block;">
					{divLinha}
				</ul>
		</div>
		';
		$sql = "SELECT * FROM ".$GLOBALS['tab41']." WHERE id_produto = '".$config['token']."'";
		$arr_conteudo = buscaValoresDb($sql);
		$divLinha = false;
		if(is_array($arr_conteudo)){
			$active = false;
			foreach($arr_conteudo As $key=>$va){
				$partesLink = explode('/',$va['endereco']);
				$nomeArq   = end($partesLink);
				if(!empty($va['endereco'])){
					$va['endereco'] = str_replace('https://eadcontrol.com.br/school/','/',$va['endereco']);
				}
				$nome_arq = !empty($va['title']) ? $va['title'] : $nomeArq;
				$comentario = !empty($va['title2']) ? $va['title2'] : false;
				$extencao = explode('.',$nomeArq);
				$divLinha .=
					'
					<li class="list-group-item content-lesson js-content list-group-item lesson module-item" id="content-'.$va['id'].'" data-requirements="[]" data-id="'.$va['id'].'" data-level="1">
						<div id="lesson-'.$va['id'].'" class="row" data-lesson-id="'.$va['id'].'">

							<div class="col-8 px-0"><a class="lesson-title" title="baixar arquivo" target="_BLANK"  data-toggle="tooltip" href="'.$va['endereco'].'">
								<span> '.$nome_arq.' </span></a>
																																					<p>'.$comentario.'</p>
							</div>
							<div class="col-4 px-0 text-right"><a href="'.$va['endereco'].'" target="_BLANK" class="btn btn-secondary">
								<i class="fa fa-download"></i> Baixar '.$extencao[1].'</a>
							</div>
							</div>

					</li>
					';
			}
		}
		if(empty($arr_conteudo))
			$ret = false;
		else
			$ret = str_replace('{divLinha}',$divLinha,$tema);
		return $ret;
	}
	public function provasExibe($config=false){
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
		$tema = $temaHTML[5];
		$divLinha = false;
		//para ajax precisa de $config = array('token_prova','pagpr','opcao');
		$config['pagpr'] = isset($config['get']['pagpr']) ? $config['get']['pagpr'] : base64_encode(0);

		$conteudoProva = $this->conteudoProva($config);
		$ret = false;
		if($conteudoProva['exec']){
				if(isset($config['config'])){
					$config['config_arr'] = json_decode($config['config'],true);
				}
				$dadosQuestConf=false;
				if(isset($conteudoProva['dados_questao']['config'])){
					$dadosQuestConf=json_decode($conteudoProva['dados_questao']['config'],true);
				}
				$ret['espostasProva'] = $this->respostaProva($config,$opc=1);
				$pontos_prova = $ret['espostasProva']['pontos_prova'];$total_certas = $ret['espostasProva']['total_certas'];$total_erradas = $ret['espostasProva']['total_erradas'];
				$valorProva = $this->valorProva($config);
				if(isset($valorProva['totalQuestoes'])&&$valorProva['totalQuestoes']>0){
					$ret = str_replace('{divLinha}',$divLinha,$tema);
					$ret = str_replace('{nome}',$conteudoProva['dados_questao']['nome'],$ret);
					$ret = str_replace('{pontos}',@$valorProva['valorProva'],$ret);
					$ret = str_replace('{total_questoes}',$valorProva['totalQuestoes'],$ret);
					$ret = str_replace('{descricao}',$conteudoProva['dados_questao']['descricao'],$ret);
					$ret = str_replace('{pontos_questao}',@$dadosQuestConf['pontos'],$ret);
					$ret = str_replace('{conteudo_opcoes}',$conteudoProva['dados_questao']['conteudo_opcoes'],$ret);
					$ret = str_replace('{acao_corrigir}','onclick="corretorProva();"',$ret);
					$ret = str_replace('{paginaCaoProvaAluno}',$conteudoProva['dados_questao']['paginaCaoProvaAluno'],$ret);
					$ret = str_replace('{num_quetao_atual}',$conteudoProva['num_quetao_atual'],$ret);
					$ret = str_replace('{pontos_prova}',$pontos_prova,$ret);
					$ret = str_replace('{total_certas}',$total_certas,$ret);
					$ret = str_replace('{total_erradas}',$total_erradas,$ret);
				}
		}else{
			$ret = $conteudoProva['mens'];
		}
		return $ret;
	}
	public function valorProva($config=false){
		$ret['exec'] = false;
		if(isset($config['token'])){
			//requerido o token da atividade prova
			$sql="SELECT * FROM ".$GLOBALS['tab27']." WHERE token_prova = '".$config['token']."' AND ".compleDelete();
			$questoes = buscaValoresDb($sql);
			if($questoes){
				$ret['exec'] = true;
				$ret['totalQuestoes'] = count($questoes);
				$valorQuest = 0;
				foreach($questoes As $kei=>$questao){
					if(!empty($questao['config'])){
						$arr_questao = json_decode($questao['config'],true);
						if(is_array($arr_questao) && isset($arr_questao['pontos'])){
							@$valorQuest += str_replace(',','.',$arr_questao['pontos']);
						}
					}
				}
				$ret['valorProva'] = $valorQuest;
			}
		}
		return $ret;
	}
	public function modalBootstrap($titulo=false,$bt_fechar=false,$conteudo=false,$id='myModal',$tam='modal-lg'){
		$btn_fechar = false;
		if($bt_fechar){
			$btn_fechar = '<button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>';
		}
		$ret = '
		<div class="modal" tabindex="-1" role="dialog" id="'.$id.'">
		  <div class="modal-dialog '.$tam.'" role="document">
			<div class="modal-content">
			  <div class="modal-header">
				<h5 class="modal-title">'.$titulo.'</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
				  <span aria-hidden="true">&times;</span>
				</button>
			  </div>
			  <div class="modal-body">
				'.$conteudo.'
			  </div>
			  <div class="modal-footer">
				'.$btn_fechar.'
				<!--<button type="button" class="btn btn-primary">Salvar mudanças</button>-->
			  </div>
			</div>
		  </div>
		</div>
		';
		return $ret;
	}
	public function modalLeft($titulo=false,$bt_fechar=false,$conteudo=false,$id='myModal',$tam='modal-lg'){
		$btn_fechar = false;
		if($bt_fechar){
			$btn_fechar = '<button type="button" class="btn btn-secondary" data-dismiss="modal">Fechar</button>';
		}
		ob_start();
	?>
	<style>
			.modal.left .modal-dialog {
				position:fixed;
				right: 0;
				margin: auto;
				width: 320px;
				height: 100%;
				-webkit-transform: translate3d(0%, 0, 0);
				-ms-transform: translate3d(0%, 0, 0);
				-o-transform: translate3d(0%, 0, 0);
				transform: translate3d(0%, 0, 0);
			}

			.modal.left .modal-content {
				height: 100%;
				overflow-y: auto;
			}

			.modal.right .modal-body {
				padding: 15px 15px 80px;
			}

			.modal.right.fade .modal-dialog {
				left: -320px;
				-webkit-transition: opacity 0.3s linear, left 0.3s ease-out;
				-moz-transition: opacity 0.3s linear, left 0.3s ease-out;
				-o-transition: opacity 0.3s linear, left 0.3s ease-out;
				transition: opacity 0.3s linear, left 0.3s ease-out;
			}

			.modal.right.fade.show .modal-dialog {
				right: 0;
			}
			.modal.left .modal-body {
				overflow-y:auto;
			}

			/* ----- MODAL STYLE ----- */
			.modal-content {
				border-radius: 0;
				border: none;
			}

			.modal-header {
				border-bottom-color: #eeeeee;
				background-color: #fafafa;
			}

	</style>
	<div class="modal left fade" id="<?=$id?>" tabindex="" role="dialog" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div class="modal-dialog" role="document">
            <div class="modal-content">
                <div class="modal-header">
					<h5 class="modal-title"><?=$titulo?></h5>
					<button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
					  <span aria-hidden="true">&times;</span>
					</button>
				</div>
				<div class="modal-body">
                    <?=$conteudo?>
                </div>
                <div class="modal-footer">
                   <?=$btn_fechar?>
                </div>
            </div>
        </div>
    </div>
	<?
		$ret = ob_get_clean();
		/*$ret .= '
		<div class="modal left fade" tabindex="-1" role="dialog" id="'.$id.'">
		  <div class="modal-dialog '.$tam.'" role="document">
			<div class="modal-content">
			  <div class="modal-header">
				<h5 class="modal-title">'.$titulo.'</h5>
				<button type="button" class="close" data-dismiss="modal" aria-label="Fechar">
				  <span aria-hidden="true">&times;</span>
				</button>
			  </div>
			  <div class="modal-body">
				'.$conteudo.'
			  </div>
			  <div class="modal-footer">
				'.$btn_fechar.'
				<!--<button type="button" class="btn btn-primary">Salvar mudanças</button>-->
			  </div>
			</div>
		  </div>
		</div>
		';*/
		return $ret;
	}
	public function get_total_questions($prova_id=false){
		$ret = 0;
		if($prova_id){
			$token_prova = buscaValorDb($GLOBALS['tab39'],'id',$prova_id,'token');
			$ret = totalReg($GLOBALS['tab27'],"WHERE token_prova='$token_prova' AND ".compleDelete());
		}
		return $ret;
	}
	public function get_total_pontos($prova_id=false){
		$ret = 0;
		if($prova_id){
			$token_prova = buscaValorDb($GLOBALS['tab39'],'id',$prova_id,'token');
			$dd = dados_tab($GLOBALS['tab27'],'config',"WHERE token_prova='$token_prova' AND ".compleDelete());
			if($dd){
				foreach ($dd as $k => $v) {
					$arr = lib_json_array($v['config']);
					if(isset($arr['pontos'])){
						$ret +=	(double)$arr['pontos'];
					}
				}
			}
		}
		return $ret;
	}
	/**
	 * Retorna os pontos de uma questão da uma prova
	 * @param array $token token da questão..
	 * @return string $ret
	 */
	public function pontos_questao($token=''){
		// $tok = isset($config['tokenQuestao']) ? $config['tokenQuestao'] : false;
		$tok = $token;
		$ret = 0;
		if($tok){
			$json_conf = buscaValorDb('quetoes_ead','token',$tok,'config');
			if(is_string($json_conf)){
				$arr = lib_json_array($json_conf);
				$ret = isset($arr['pontos']) ? $arr['pontos'] : 0;
				if(isset($_GET['tt'])){
					// echo $sql;
					lib_print($json_conf);
					lib_print(isJson($tok));
					lib_print($arr);
				}
			}
		}
		return $ret;
	}
	/**
	 * retorna o tipo de pontos de uma prova se é dinamico ou não.
	 * @param int $id_prova
	 */
	public function pt_dinamico($id_prova=null){
		$ret = '';
		if($id_prova){
			$conf = buscaValorDb('conteudo_ead','id',$id_prova,'config');
			if(isJson($conf)){
				$arr = lib_json_array($conf);
				$ret = isset($arr['pt_dinamico']) ? $arr['pt_dinamico'] : '';
			}
		}
		return $ret;
	}
	/**
	 * Retorna um resumo da prova
	 * @param $config = array('id_atividade'=>,'id_matricula'=>,'id_cliente'=>,);
	 */
	public function resultProva($config=[]){

		$ret['html'] = false;
		$ret['nome_prova'] = '';
		$ret['aprovado'] = 'n';
		$ret['total_questoes'] = 0;
		$col = 'xs';
		$ret['config'] = $config;
		if(isset($config['id_atividade'])&&isset($config['id_matricula'])&&isset($config['id_cliente'])){
			$pt_dinamico = $this->pt_dinamico($config['id_atividade']);
			$sql = "SELECT `config`,`id` FROM ".$GLOBALS['tab47']." WHERE id_atividade= '".$config['id_atividade']."' AND id_matricula= '".$config['id_matricula']."' AND id_cliente= '".$config['id_cliente']."' AND ".compleDelete();
			$dados = buscaValoresDb($sql);
			$total_pontos = $this->get_total_pontos($config['id_atividade']);
			$total_questoes = $this->get_total_questions($config['id_atividade']);
			$ret['total_questoes'] = $total_questoes;
			$ret['total_pontos'] = $total_pontos;
			$tema1 = '
					<ul class="list-group">
					{li}
					</ul>

					';
			$tema2 = '
					<li class="list-group-item {active}">
					{conteudo}
					</li>
					';
			if(empty($dados[0]['config'])){
				$li = false;
				$conteudo = '<div class="row">
										<div class="col-'.$col.'-4">Questões</div>
										<div class="col-'.$col.'-4">Resposta</div>
										<div class="col-'.$col.'-2">Pts Questão</div>
										<div class="col-'.$col.'-2" title="pontos alcançados">Pts Alc</div>
									</div>';
				$li = str_replace('{conteudo}',$conteudo,$tema2);
				$li = str_replace('{active}','active',$li);

				$ret['html'] = str_replace('{li}',$li,$tema1);
				$ret['totalPontosDistribuidos'] = 0;
				$ret['totalAlcancado'] = 0;
			}else{
				// $ret['sql'] = $sql;
				// $ret['config'] = $config;
				// $ret['dados'] = $dados;
				// $ret['tk_prova'] = $tk_prova;
				// $tk_prova = buscaValorDb($GLOBALS['tab39'],'id',$config['id_atividade'],'token');

				$arr_config = json_decode($dados[0]['config'],true);
				if(is_array($arr_config)){
					$li = false;
					$conteudo = '<div class="row">
											<div class="col-'.$col.'-4">Questões</div>
											<div class="col-'.$col.'-4">Resposta</div>
											<div class="col-'.$col.'-2">Pts Questão</div>
											<div class="col-'.$col.'-2" title="pontos alcançados">Pts Alc</div>
										</div>';
					$li = str_replace('{conteudo}',$conteudo,$tema2);
					$li = str_replace('{active}','active',$li);
					$pontos = 0;
					$totalAlcancado = 0;
					$totalPontosDistribuidos = 0;
					$totalRespondido = 0;
					$ret['total_respondido'] = 0;
					foreach($arr_config As $ky=>$vy){
						if($pt_dinamico=='s'){
							$token = isset($vy['tokenQuestao']) ? $vy['tokenQuestao'] : '';
							$pontos = $this->pontos_questao($token);
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
							$respostaCorrecao = '<i class="fa fa-exclamation-circle"></i> Errada';
							$class = 'errada vermelho_lcf';
						}else{
							$respostaCorrecao = '';
							$class = '';
						}
						$conteudo = '<div class="row '.$class.'">
												<div class="col-'.$col.'-4">'.($vy['numQuestao']+1).'</div>
												<div class="col-'.$col.'-4"> '.$respostaCorrecao.'</div>
												<div class="col-'.$col.'-2">'.$pontos.'</div>
												<div class="col-'.$col.'-2">'.$totalAlcancado.'</div>
											</div>';
						$cont = str_replace('{conteudo}',$conteudo,$tema2);
						$cont = str_replace('{active}','',$cont);
						$li .= $cont;
						$ret['total_respondido']++;
					}
					// $aprov = ($totalAlcancado * 100)/($totalPontosDistribuidos);
					$aprov = ($totalAlcancado * 100)/($total_pontos);
					$aprov = round($aprov);
					$configAtividade = buscaValorDb($GLOBALS['tab39'],'id',$config['id_atividade'],'config');
					$nome_exibicao = buscaValorDb($GLOBALS['tab39'],'id',$config['id_atividade'],'nome_exibicao');
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
					$li .= '
					<li class="list-group-item footer">
						<div class="row">
							<div class="col-md-10">Total de pontos <b>distribuidos</b></div>
							<div class="col-md-2"><b>'.$totalPontosDistribuidos.'</b> pts</div>
						</div>
					</li>
					<li class="list-group-item footer">
						<div class="row">
							<div class="col-md-10">Total de pontos <b>alcançados</b></div>
							<div class="col-md-2"><b>'.$totalAlcancado.'</b> pts</div>
						</div>
					</li>
					<li class="list-group-item footer">
						<div class="row">
							<div class="col-md-10"><span class="tot">Total de questões: <span class="classifica-prova badge badge-warning">'.$total_questoes.'</span></div>
						</div>
					</li>
					<li class="list-group-item footer">
						<div class="row">
							<div class="col-md-10"><span class="tot">Questões respondidas: <span class="classifica-prova badge badge-info">'.$totalRespondido.'</span></div>
						</div>
					</li>
					';

					$li .= '
					<li class="list-group-item footer">
						<div class="row">
							<div class="col-md-10"><span class="apv">Aproveitamento <b>'.$aprov.' %</b></span></div>
							<div class="col-md-2"><label> </label><span class="classifica-prova badge '.$clasClassific.'">'.$classificaProva.'</span> </div>
						</div>
					</li>
					';
					$ret['badge_aprov'] = '<span class="badge '.$clasClassific.'">'.$classificaProva.' <b>'.$aprov.' %</b></span>';
					$ret['html'] = str_replace('{li}',$li,$tema1);
					$ret['totalPontosDistribuidos'] = $totalPontosDistribuidos;
					$ret['totalAlcancado'] = $totalAlcancado;
					$ret['nome'] = $nome_exibicao;
				}
			}
		}else{
			$ret = formatMensagem('ACESSO negado falta dados. entre em contato com o suporte','danger');
		}
		// if(isset($_GET['fq']))
		// dd($ret);
		return $ret;
	}
	public function respostaProva($config=false,$opc=1){
		$ret['pontos_prova'] = 0;$ret['total_certas'] = 0;$ret['total_erradas'] = 0;
		if(isset($config['configAula']['data']) && is_array($config['configAula']['data'])){
			foreach($config['configAula']['data'] As $kpt=>$vpts){
				if($vpts['respostaCorrecao'] == 'c'){
					@$ret['pontos_prova'] += str_replace(',','.',$vpts['pontosQuestao']);
					$ret['total_certas'] ++;
				}if($vpts['respostaCorrecao'] == 'e'){
					//@$ret['pontos_prova'] += str_replace(',','.',$vpts['pontosQuestao']);
					$ret['total_erradas']++;
				}
			}
		}
		return $ret;
	}
	public function conteudoProva($config=false){
		$ret['exec'] = false;
		if(isset($config['token'])){
				$eadAdmin = $this->eadAdmin;
				$campo = 'ordenar';
				$ordenar = 'ASC';
				$reg_pag	 = isset($config['reg_pag']) ? $config['reg_pag'] : 1;
				$ajax		 = isset($config['ajax']) ? $config['ajax'] : 'n';
				$exibea	 = isset($config['exibea']) ? $config['exibea'] : 'painel_questao_1';
				$pag			 = isset($config['pagpr']) ? $config['pagpr'] : base64_encode(0);
				if($ajax =='n'){
					$pag		 	 = base64_decode($pag);
					$pag		 	 = (int) $pag;
				}
				$opcao		 = isset($config['opcao']) ? $config['opcao'] : 1;
				$lin			 = isset($config['lin']) ? $config['lin'] : 'ajax=s&opc=exibeQuestProvas&';
				$arquivo	 = isset($config['arquivo']) ? $config['arquivo'] : RAIZ.'/app/ead/acao.php';
				$url = "SELECT * FROM  `".$GLOBALS['tab27']."` WHERE `token_prova` = '".$config['token']."' AND ".compleDelete() ;
				$url .= " ORDER BY `".$campo."` ".$ordenar;
				$inicial =$pag*$reg_pag;
				//$ret['Limit'] = 'inicial = '.$inicial.' pag = '.$pag.' reg_pag = '.$reg_pag;
				$dados_lista = buscaValoresDb($url);
				$urlDpag = $url." LIMIT $inicial,$reg_pag";
				$dados_pagina = buscaValoresDb($urlDpag);
				$exibe = false;

				/*
				$opcao = 1 questão normal
				$opcao = 2 correção
				$opcao = 3 questao feita
				*/
				$dadosRegistro = false;
				$ret['total_questoes'] = count($dados_lista);
				$ret['dados_questao']['opcoes'] = false;
				$ret['dados_questao']['acao_corrigir'] = 'onclick="corretorProva();"';
				$ret['num_quetao_atual'] = ($pag+1);
				if($dados_pagina){
					$ret['exec'] = true;
					//$quest_feita = quest_feita($id_curso,$id_prova,$questoes[$i]['id_questao'],$id_aluno);
					$ret['sql_pagina'] = $urlDpag;
					$ret['dados_questao'] = $dados_pagina[0];
					$prosiga = false;$opcoes=false;
					$gabarito = false;
					$config_gabarito 	= buscaValorDb($GLOBALS['tab39'],'token',$config['token'],'config');
					$config_quest 	= buscaValorDb($GLOBALS['tab27'],'token',@$config['token_questao'],'config');
					if($config_gabarito && !empty($config_gabarito)){
						$config_gabarito_arr = json_decode($config_gabarito,true);
						$gabarito = $config_gabarito_arr['gabarito'];
					}
					if(isset($ret['dados_questao']['config']) && !empty($ret['dados_questao']['config'])){
						$opcs = json_decode($ret['dados_questao']['config'],true);
						if(is_array($opcs)){
							$opcoes = $opcs['opcao'];
							$prosiga = true;
						}
					}
					if($opcoes && $prosiga){
						if(is_clientLogado() && isset($config['configAula']['data']) && is_array($config['configAula']['data'])){
							foreach($config['configAula']['data'] As $key=>$dadosResposta){
								if($dadosResposta['tokenQuestao']==$dados_pagina[0]['token']){
									$opcao = 3;
									$resposta = $dadosResposta['respostaCorrecao'];
									$config['radio_quest'] = $dadosResposta['respostaDada'];
									$gabarito = $gabarito?$gabarito: 's';
									$certa		= $dadosResposta['respostaGabarito'];
								}
							}
						}
						$i = 0;
						$timeResp = 900000;
								$radioName = 'radio_quest';
								$questoes[$i]['id_questao'] = $dados_pagina[0]['id'];
								$form = 'form_'.$questoes[$i]['id_questao'];
								if($opcao == 2){
									// if(isAdmin(1)){
									// 	dd($config_gabarito);
									// }

									if($config_quest && !empty($config_quest)){
										$config_quest_arr = json_decode($config_quest,true);
										$certa  	= $config_quest_arr['certa'];
										if($certa){
											$color_resp = "warning";
											$messReps = false;
											if(!is_adminstrator()){
												///quando for um aluno

													 $resposta = $this->corrigirQuestao($config['token_questao'],$config['radio_quest'],$certa);
													 if($resposta == 'c'){
														$color_resp = "success";
														$messReps = formatMensagem("Parabéns, você acertou!",$color_resp,$timeResp);
													 }if($resposta == 'e'){
														$color_resp = "danger";
														$messReps = formatMensagem("Resposta incorreta!",$color_resp,$timeResp);
													 }if($resposta == 'np'){
														//$color_resp = "danger";
														$messReps = formatMensagem("Teste já realizado!",$color_resp,$timeResp);
													 }
											}else{
													 $resposta = $this->corrigirQuestao($config['token_questao'],$config['radio_quest'],$certa);
													 if($resposta == 'c'){
														$color_resp = "success";
														$messReps = formatMensagem("Parabéns, você acertou!",$color_resp,$timeResp);
													 }if($resposta == 'e'){
														$color_resp = "danger";
														$messReps = formatMensagem("Resposta incorreta!",$color_resp,$timeResp);
													 }if($resposta == 'np'){
														//$color_resp = "danger";
														$messReps = formatMensagem("Teste já realizado!",$color_resp,$timeResp);
													 }
											}
											$ret['exec'] = true;
											$ret['registrar_frequen']['tokenQuestao'] 		= $dados_pagina[0]['token'];
											$ret['registrar_frequen']['respostaCorrecao'] 	= $resposta;
											$ret['registrar_frequen']['respostaDada'] 		= $config['radio_quest'];
											$ret['registrar_frequen']['respostaGabarito'] 	= $certa;
											$ret['registrar_frequen']['totalQuestoes'] 		= $ret['total_questoes'];
											$ret['registrar_frequen']['numQuestao']		 	= $pag;
											$ret['registrar_frequen']['pontosQuestao']		= $opcs['pontos'];
											//print_r($config);
											if(is_clientLogado() && isset($config['configAula'])){
												 $ret['registrarProvaAluno'] =	$this->registrarProvaAluno($ret['registrar_frequen'],$config['configAula']);//somente quando ele ja acessou a prova
											}
										}else{
											$messReps = formatMensagem("Gabarito não encotrado!",'danger');
										}
									}else{
										$messReps = formatMensagem("Questões de prova não encotrada!",'danger');
									}
								}
								if($opcao == 3){
										 //$gabarito 	= buscaValorDb($tab21,'id',$id_prova,'gabarito');
										 //$certa  	= buscaValorDb($tab23,'id_questao',$questoes[$i]['id_questao'],'certa');
										 $color_resp = "warning";
										 $messReps = false;
										 //$resposta = corrigirQuestao($quest_feita['id_questao'],$quest_feita['resposta'],$id_curso,$id_prova);
										// $resposta = $quest_feita['status'];
										 if($resposta == 'c'){
														$color_resp = "success";
														$messReps = formatMensagem("Parabéns, você acertou!",$color_resp,$timeResp);
										}if($resposta == 'e'){
														$color_resp = "danger";
														$messReps = formatMensagem("Resposta incorreta!",$color_resp,$timeResp);
										 }if($resposta == 'np'){
														//$color_resp = "danger";
														$messReps = formatMensagem("Teste já realizado!",$color_resp,$timeResp);
										}
								}
								ob_start();
								$dadosPQuest = dados_tab($GLOBALS['tab27'],'*',"WHERE `token_prova`='".$config['token']."' AND ".compleDelete()." ORDER BY id ASC");
								if($dadosPQuest){
							 ?>
							  <div class="text-subhead-2"><?=__translate('Opções (Lembre-se, Clique somente quando tiver certeza da resposta!)')?></div>
							  	<form name="resp_prova" id="resp_prova">
									<input type="hidden" name="pagpr" value="<?=$pag?>"/>
									<input type="hidden" name="token" value="<?=$config['token']?>"/>
									<input type="hidden" name="token_questao" value="<?=$dadosPQuest[$pag]['token']?>"/>
									<!-- <button type="button" onclick="ead_changeBtnConfirm()">T</button> -->
									<?
									if(isset($config_gabarito_arr)){
										echo '<input type="hidden" name="config_gabarito_arr" value="'.encodeArray($config_gabarito_arr).'">';
									}
									if(isset($config['configAula'])){
										?>
										<input type="hidden" name="configAula[id_cliente]" value="<?=$config['configAula']['id_cliente']?>"/>
										<input type="hidden" name="configAula[id_matricula]" value="<?=$config['configAula']['id_matricula']?>"/>
										<input type="hidden" name="configAula[id_atividade]" value="<?=$config['configAula']['id_atividade']?>"/>
										<?
									}
									$checked = false;$checkedcer = false;
									//TIPO DE ALTERNATIVA l PARA LETRAS n PARA NÚMEROS.
									$tipo_alternativas_prova = queta_option('tipo_alternativas_prova')?queta_option('tipo_alternativas_prova'):'l';

									$iq = 0;
									$border = false;
									$labRespCerta = false;
									$nq=count($opcoes);
									$arr_alternativas = [];
									if($tipo_alternativas_prova=='l'){
										$arr_alternativas = lib_alternatives($nq);
									}
									foreach($opcoes As $key=>$val){
										if($tipo_alternativas_prova=='l'){
											$a = $arr_alternativas[$iq];
											$iq ++;
										}else{
											$iq ++;
											$a = $iq;
										}
										if($opcao == 2){
											if($config['radio_quest'] == $iq){
												$checked = 'checked=""';
											}else{
												$checked = false;
											}
											if($gabarito=='s' && $resposta == 'e'){
												if($iq == $certa){
													$checkedcer = 'checked=""';$color_resp = "success";
													 $border = 'valid';
													 $labRespCerta = '&nbsp;<small class="badge badge-success">Resposta correta</small>';
												}else{
													$checkedcer = false;
													$color_resp = "warning";
												}
											}
											?>
											<div class="checkbox checkbox-<?=$color_resp?> checkbox-circle <?=$border?> " >
												<input type="checkbox" disabled="" name="<?=$radioName?>" id="<?=$iq?>" value="<?=$iq?>" <?=$checkedcer?> <?=$checked?> >
												<label for="<?=$iq?>">
													<span class="lista-questao"><?=$a?>)</span>
													<span class="resp">
														<?=$val?>
													</span>
											</label>
												<?=$labRespCerta?>
											</div>

											<?
												 $border = false;
												 $labRespCerta = false;
										}if($opcao == 3){
											if($config['radio_quest'] == $iq){
												$checked = 'checked=""';
											}else{
												$checked = false;
											}
											if($gabarito=='s' && $resposta == 'e'){
												if($iq == $certa){
													$checkedcer = 'checked=""';$color_resp = "success";
													 $border = 'valid';
													 $labRespCerta = '&nbsp;<small class="badge badge-success">Resposta correta</small>';
												}else{
													$checkedcer = false;
													$color_resp = "warning";
												}
											}
											?>
											<div class="checkbox checkbox-<?=$color_resp?> checkbox-circle <?=$border?> " >
												<input type="checkbox" disabled="" name="<?=$radioName?>" id="<?=$iq?>" value="<?=$iq?>" <?=$checkedcer?> <?=$checked?> >
												<label for="<?=$iq?>">
													<span class="lista-questao"><?=$a?>)</span>
													<span class="resp">
														<?=$val?>
													</span>
												</label>
												<?=$labRespCerta?>
											</div>

											<?
												 $border = false;
												 $labRespCerta = false;
										}if($opcao == 1){
											?>
											<div class="radio radio-info" data-toggle="tooltip" title="Marque aqui a Opção <?=$val?>.">
												<input type="radio" name="<?=$radioName?>" id="<?=$iq?>" value="<?=$iq?>">
												<label for="<?=$iq?>"><span class="lista-questao"><?=$a?>)</span> <?=$val?></label>
											</div>
											<?
										}
									}
								}else{
									 $messReps = formatMensagem("Questões n encotradas entre em contato com o suporte!",'danger');
								 }
								if($opcao == 2 || $opcao == 3){
										echo $messReps;
								}
								$hiddenBtnConfirmar=false;
								if($opcao == 3){
									// $hiddenBtnConfirmar='jQuery(\'#conf_resp\').hide();';
									$hiddenBtnConfirmar='ead_changeBtnConfirm();';
									// if(isset($config_gabarito_arr['repetir']) && $config_gabarito_arr['repetir']=='s'){
									// 	$hiddenBtnConfirmar .='$(\'<button type="button" id="repet_quest" class="btn btn-outline-primary" onclick="repetir_questao()" title="Repetir a questão">Repetir</button>\').insertBefore(\'#conf_resp\');';
									// }

								}
									?>
									</form>
									<script>

											jQuery(document).ready(function() {
												// jQuery('#conf_resp').click(function() {
												// 	corretorProva();
												// });
												<?=$hiddenBtnConfirmar?>
											});
									</script>
									<?
									if($opcao == 1 && !is_adminstrator()){
										$ret['dados_questao']['bt_confirm'] = '<button type="button" id="conf_resp" onclick="corretorProva();" title="'.__translate('Confirmar a resposta acima',true).'" class="btn btn-outline-secondary"><i class="fa fa-check" aria-hidden="true"></i> '.__translate('Confirmar',true).'</button>';
									}
							 }else{
								 echo formatMensagem("Nenhuma opção encontrada!",'warning');
							 }
							$ret['dados_questao']['conteudo_opcoes'] = ob_get_clean();
							$ret['dados_questao']['historico'] = false;
							if(is_clientLogado()){
								$ret['dados_questao']['historico'] = $config['configAula']; //traze o registro da prova do aluno da $tab47;
							}
							if($opcao != 2)
								$ret['dados_questao']['paginaCaoProvaAluno'] = $this->paginaCaoProvaAluno($ret['total_questoes'],$reg_pag,$pag,$lin,$arquivo,$exibea,$opcao);

				}else{
					$ret['mens'] = formatMensagem("NENHUM QUESTÃO ENCONTRADA!!","warning",400000);

				}
		}
		return $ret;
	}
	public function registrarProvaAluno($configResposta=false,$configAula=false){
		$ret['exec'] = false;
		if($configResposta && $configAula){
			$compleSql = " WHERE id_cliente = '".$configAula['id_cliente']."'  AND  id_matricula = '".$configAula['id_matricula']."'  AND id_atividade = '".$configAula['id_atividade']."' ";
			$sql = "SELECT * FROM ".$GLOBALS['tab47']." $compleSql";
			$dados = buscaValoresDb($sql);
			if($dados){
				$compleUpd = false;
				if(!empty($dados[0]['config'])){
					$regconfigSalv = json_decode($dados[0]['config'],true);
					if(is_array($regconfigSalv)){
						//print_r($regconfigSalv);
						$quest_feitas = (int) count($regconfigSalv);
						$ret['quest_feitas'] = $quest_feitas+1;
						$porcent = (100*$ret['quest_feitas'])/($configResposta['totalQuestoes']);
						$porcent = round($porcent);
						if($porcent>0){
							$compleUpd = " ,progresso='".$porcent."'";
							if($porcent==100){
								$compleUpd = ",concluido='s',progresso='".$porcent."'";
							}
						}
						$add  = true;
						foreach($regconfigSalv As $kei=>$val){
							if($val['tokenQuestao']==$configResposta['tokenQuestao']){
								$regconfigSalv[$kei] = $configResposta;
								$add = false;
							}
						}
						if($add){
							array_push($regconfigSalv,$configResposta);
						}
					}
				}else{
					$quest_feitas = 1;
					$ret['quest_feitas'] = $quest_feitas;
					$porcent = (100*$quest_feitas)/($configResposta['totalQuestoes']);
					$porcent = round($porcent);
					if($porcent>0){
							$compleUpd = " ,progresso='".$porcent."'";
							if($porcent==100){
								$compleUpd = ",concluido='s',progresso='".$porcent."'";
							}
					}
					$regconfigSalv[0] = $configResposta;
				}
				//if($confi['data']['percent']==1){
					//$compleUpd = ",concluido='s'";
				//}
				$sqlsalv = "UPDATE ".$GLOBALS['tab47']." SET `config`='".json_encode($regconfigSalv)."',`ultimo_acesso`='".$GLOBALS['dtBanco']."' $compleUpd $compleSql";
				if(is_adminstrator(1)){
					$ret['sqlsalv'] = $sqlsalv;
					$ret['regconfigSalv']=$regconfigSalv;
				}
				$ret['exec'] = salvarAlterar($sqlsalv);
			}
			$ret['dados'] = $dados;
			$ret['sql'] = $sql;
			//$ret['config'] = $confi;

		}
		return $ret;
	}
	public function corrigirQuestao($token_questao=false,$resposta=false,$certa=false){
		$ret = false;
		if($token_questao){
			if($resposta == $certa){
				$ret = 'c';
			}
			if($resposta != $certa){
				$ret = 'e';
			}
		}
		return $ret;
	}
	public function paginaCaoProvaAluno($reg_enc=0,$reg_pag=0,$pag=0,$lin='',$arquivo='lista.php',$div='cli',$opcao=1){
				global $suf_in;
				/*if($_SESSION['permissao'.$suf_in] == 5){
					$disable = 'disabled';
				}else{*/
					$disable = false;
				//}
				$paginas = ceil($reg_enc/$reg_pag);	//echo $paginas;
				$paginas++;
				$valor = "<nav class=\"text-right\"><ul class=\"pagination\">";
				if(is_clientLogado())
				$valor .= "<li class=\"page-item\"><button type=\"button\" data-toggle=\"modal\" data-target=\"#modalResultProva\" class=\"page-link btn-info\">".__translate('Resumo',true)."</button></li>";
				if($pag > 0){
					if(logadoSite()){
					$valor .= "<li class=\"page-item\"><a href=\"".lib_trataAddUrl('pagpr',base64_encode($pag-1))."\" class=\"page-link\" ><i class=\"fa fa-step-backward\"></i>&nbsp;</a></li>";
					}
				}else{
					//$valor .= "<font color=#CCCCCC>&laquo; anterior</font>";
				}
				for ($i_pag=1;$i_pag<$paginas;$i_pag++){
						if ($pag == ($i_pag-1)) {
							$valor .= "<li class=\"page-item active\"><span class=\"page-link\">$i_pag</span></li>";
						} else {
							$i_pag2 = $i_pag-1;
							$valor .= "<li class=\"page-item\"><a href=\"".lib_trataAddUrl('pagpr',base64_encode($i_pag2))."\" class=\"page-link $disable\" ><b> $i_pag</b> </a></li>";
						}
				}
				if (($pag+2) < $paginas) {
					if($opcao==2){
						$valor .= "<li class=\"page-item\"><a href=\"".lib_trataAddUrl('pagpr',base64_encode($pag+1))."\" class=\"page-link btn-primary\">".__translate('Próxima',true)." <i class=\"fa fa-chevron-right fa-fw\"></i></a></li>";
					}
				}//else {

				//}
				$valor .= "</ul></nav>";
				return $valor;
	}
	public function tempoDeCurso($id_curso=false,$id_modulo=false,$id_atividade=false){
		$ret = false;
		return $ret;
	}
	public function calcQtdConteudoLiberar($config=false,$id_matricula=false){
		//$config  = json do config do curso
		$ret['modulo_liberado']=false;
		$ret['segundosALiberar']=false;
		if($config && isJson($config) && $id_matricula){
			$arrConfigCurso = json_decode($config,true);
			if(isset($arrConfigCurso['libera_conteudo']['qtd']) && isset($arrConfigCurso['libera_conteudo']['tipo']) && isset($arrConfigCurso['libera_conteudo']['tipo_inicio']) && $arrConfigCurso['libera_conteudo']['tipo']=='periodica'){
						if($arrConfigCurso['libera_conteudo']['tipo_inicio']=='imediata'){

								$dadosMatricula = dados_tab($GLOBALS['tab12'],'data_contrato,data,data_matricula',"WHERE id = '".$id_matricula."' AND ".compleDelete());
								//$dataInicioTurma = buscaValorDb($GLOBALS['tab11'],'id',$id_turma,'inicio');
								$hoje = date('Y-m-d');
								$dataInicioTurma = $dadosMatricula[0]['data_contrato'];
								if($dataInicioTurma=='0000-00-00 00:00:00'){
									$dataInicioTurmai = explode(' ',$dadosMatricula[0]['data_matricula']);
									$dataInicioTurma = $dataInicioTurmai[0];
								}else{
									$dataInicioTurmai = explode(' ',$dadosMatricula[0]['data_contrato']);
									$dataInicioTurma = $dataInicioTurmai[0];
								}
								if(strtotime($dataInicioTurma)>strtotime($hoje)){
									$ret['modulo_liberado'] = false;
									$ret['segundosALiberar'] = 0;
								}else{
									$diasAndamentoCurso = diffDate($dataInicioTurma, $hoje, $type='D', $sep='-');
									$diasAndamentoCurso=$diasAndamentoCurso+1;
									//$segundosALiberar = ($arrConfigCurso['libera_conteudo']['qtd']*3600)*$diasAndamentoCurso;
									$ret['segundosALiberar'] = convertHorasEmSegundos($arrConfigCurso['libera_conteudo']['qtd'])*$diasAndamentoCurso;
									$ret['modulo_liberado'] = true;
								}

						}
						if($arrConfigCurso['libera_conteudo']['tipo_inicio']=='inicio_turma'){

							$id_turma = buscaValorDb($GLOBALS['tab12'],'id',$id_matricula,'id_turma');
							if($id_turma){
								$dadosTurma = dados_tab($GLOBALS['tab11'],'inicio,data,fim',"WHERE id = '".$id_turma."' AND ".compleDelete());
								//$dataInicioTurma = buscaValorDb($GLOBALS['tab11'],'id',$id_turma,'inicio');
								$hoje = date('Y-m-d');
								$dataInicioTurma = $dadosTurma[0]['inicio'];
								if($dataInicioTurma=='0000-00-00'){
									$dataInicioTurmai = explode(' ',$dadosTurma[0]['data']);
									$dataInicioTurma = $dataInicioTurmai[0];
								}
								if(strtotime($dataInicioTurma)>strtotime($hoje)){
									$ret['modulo_liberado'] = false;
									$ret['segundosALiberar'] = 0;
								}else{
									$diasAndamentoCurso = diffDate($dataInicioTurma, $hoje, $type='D', $sep='-');
									$diasAndamentoCurso=$diasAndamentoCurso+1;
									//$segundosALiberar = ($arrConfigCurso['libera_conteudo']['qtd']*3600)*$diasAndamentoCurso;
									$ret['segundosALiberar'] = convertHorasEmSegundos($arrConfigCurso['libera_conteudo']['qtd'])*$diasAndamentoCurso;
									$ret['modulo_liberado'] = true;
								}
							}
							$quantosDiasCurso = '';
						}
					}
		}
		return $ret;
	}
	public function listAtividades($config=false,$id_matricula=false,$dadosCurso=false,$modulo_liberado=false){
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
		$tema = $temaHTML[1];
		$tema2 = $temaHTML[3];
		$id_aulas=false;
		//print_r($dadosCurso);
		$arr_conteudo = json_decode($config['conteudo'],true);
		$componentes = '?mod='.base64_encode($config['id']);
		$divLinha = false;
		$segundosALiberar = false;
		$ret['link_inicio_curso'] = false;
		if(is_array($arr_conteudo)){
			$active = false;
			if(is_clientLogado() && $id_matricula){
				if(!empty($dadosCurso['config'])){
					$arrConfigCurso = json_decode($dadosCurso['config'],true);
					if(isset($arrConfigCurso['libera_conteudo']['qtd']) && isset($arrConfigCurso['libera_conteudo']['tipo']) && isset($arrConfigCurso['libera_conteudo']['tipo_inicio']) && $arrConfigCurso['libera_conteudo']['tipo']=='periodica'){
						//$modulo_liberado = false;
						if($arrConfigCurso['libera_conteudo']['tipo_inicio']=='imediata'){

								$dadosMatricula = dados_tab($GLOBALS['tab12'],'data_contrato,data,data_matricula',"WHERE id = '".$id_matricula."' AND ".compleDelete());
								//$dataInicioTurma = buscaValorDb($GLOBALS['tab11'],'id',$id_turma,'inicio');
								$hoje = date('Y-m-d');
								$dataInicioTurma = $dadosMatricula[0]['data_contrato'];
								if($dataInicioTurma=='0000-00-00 00:00:00'){
									$dataInicioTurmai = explode(' ',$dadosMatricula[0]['data_matricula']);
									$dataInicioTurma = $dataInicioTurmai[0];
								}else{
									$dataInicioTurmai = explode(' ',$dadosMatricula[0]['data_contrato']);
									$dataInicioTurma = $dataInicioTurmai[0];
								}
								if(strtotime($dataInicioTurma)>strtotime($hoje)){
									$modulo_liberado = false;
									$segundosALiberar = 0;
								}else{
									$diasAndamentoCurso = diffDate($dataInicioTurma, $hoje, $type='D', $sep='-');
									$diasAndamentoCurso=$diasAndamentoCurso+1;
									//$segundosALiberar = ($arrConfigCurso['libera_conteudo']['qtd']*3600)*$diasAndamentoCurso;
									$segundosALiberar = convertHorasEmSegundos($arrConfigCurso['libera_conteudo']['qtd'])*$diasAndamentoCurso;
									$modulo_liberado = true;
								}

						}
						if($arrConfigCurso['libera_conteudo']['tipo_inicio']=='inicio_turma'){

							$id_turma = buscaValorDb($GLOBALS['tab12'],'id',$id_matricula,'id_turma');
							if($id_turma){
								$dadosTurma = dados_tab($GLOBALS['tab11'],'inicio,data,fim',"WHERE id = '".$id_turma."' AND ".compleDelete());
								//$dataInicioTurma = buscaValorDb($GLOBALS['tab11'],'id',$id_turma,'inicio');
								$hoje = date('Y-m-d');
								$dataInicioTurma = $dadosTurma[0]['inicio'];
								if($dataInicioTurma=='0000-00-00'){
									$dataInicioTurmai = explode(' ',$dadosTurma[0]['data']);
									$dataInicioTurma = $dataInicioTurmai[0];
								}
								if(strtotime($dataInicioTurma)>strtotime($hoje)){
									$modulo_liberado = false;
									$segundosALiberar = 0;
								}else{
									$diasAndamentoCurso = diffDate($dataInicioTurma, $hoje, $type='D', $sep='-');
									$diasAndamentoCurso=$diasAndamentoCurso+1;
									//$segundosALiberar = ($arrConfigCurso['libera_conteudo']['qtd']*3600)*$diasAndamentoCurso;
									$segundosALiberar = convertHorasEmSegundos($arrConfigCurso['libera_conteudo']['qtd'])*$diasAndamentoCurso;
									$modulo_liberado = true;
								}
							}
							$quantosDiasCurso = '';
						}
					}
				}
			}
			if($modulo_liberado){
				$libera_aula = true;
			}else{
				$libera_aula = false;
			}
			$tk_conteudo = isset($config['token']) ? $config['token'] : null;
			if(is_clientLogado() && $id_matricula){
				if($tk_conteudo && $id_matricula){
					foreach($arr_conteudo As $key=>$val){
						global $tk_conta;
						$dados = isset($_SESSION['listAtividades']['dados'][$tk_conteudo][$val['idItem']]) ? $_SESSION['listAtividades']['dados'][$tk_conteudo][$val['idItem']] : buscaValoresDb("SELECT * FROM ".$GLOBALS['tab39']. " WHERE id = '".$val['idItem']."' AND ativo='s' AND ".compleDelete());
						$_SESSION['listAtividades']['dados'][$tk_conteudo][$val['idItem']] = $dados;
						$duracaoTotal = false;
						if($dados){
							$id_aulas[$key]['id'] = $dados[0]['id'];
							$id_aulas[$key]['nome'] = $dados[0]['nome_exibicao'];
							if(Url::getURL(nivel_url_site()+5)!=NULL){
								$urlAmigo5 = base64_decode(Url::getURL(nivel_url_site()+5));
								if($urlAmigo5 == $val['idItem']){
									$active = 'active';
								}else{
									$active = false;
								}
							}else{
								$active = false;
							}
							// if($id_matricula){
							// 	$progress_bar = $this->progressoFrequencia($dados[0]['id'],$id_matricula);
							// }else{
								$progress_bar = false;
							// }
							if($segundosALiberar){
								$_SESSION[$tk_conta]['matricula'][$id_matricula]['duracaoTotal'] += $dados[0]['duracao'];
								$duracaoTotal = $_SESSION[$tk_conta]['matricula'][$id_matricula]['duracaoTotal'];
								if($segundosALiberar > $duracaoTotal){
									$libera_aula = true;
								}else{
									$libera_aula = false;
								}
							}
							$_SESSION[$tk_conta]['matricula'][$id_matricula][base64_encode($val['idItem'])][base64_encode($config['id'])]['libera_aula'] = $libera_aula;
							$_SESSION[$tk_conta]['matricula'][$id_matricula][base64_encode($val['idItem'])][base64_encode($config['id'])]['duracaoTotal'] = $duracaoTotal;
							$li = str_replace('{iditem}',$val['idItem'],$tema2);
							$li = str_replace('{icon}',buscaValorDb($GLOBALS['tab7'],'nome',$dados[0]['tipo'],'icon'),$li);
							$li = str_replace('{nome_exibicao}',$dados[0]['nome_exibicao'],$li);
							$li = str_replace('{label_icon}',$dados[0]['tipo'],$li);
							$li = str_replace('{active}',$active,$li);
							$li = str_replace('{duracao}',segundosEmHoras($dados[0]['duracao']),$li);
							$li = str_replace('{progress_bar}',$progress_bar,$li);

							if($libera_aula){
								$href = '/'.Url::getURL(nivel_url_site()).'/'.Url::getURL(nivel_url_site()+1).'/'.Url::getURL(nivel_url_site()+2).'/'.Url::getURL(nivel_url_site()+3).'/lecture/'.base64_encode($val['idItem']).$componentes;
								//$href .= '#lesson-'.$val['idItem'];
								if($key==0){
									$ret['link_inicio_curso'] = $href;
								}
							}else{
								$href = 'javaScript:alert(\'Conteudo Indisponível, \n favor entre em contato com o suporte\')';
							}
							$li = str_replace('{href}',$href,$li);
							$divLinha .= $li;
						}
					}
				}
			}else{
				foreach($arr_conteudo As $key=>$val){
					global $tk_conta;
					$dados = buscaValoresDb("SELECT * FROM ".$GLOBALS['tab39']. " WHERE id = '".$val['idItem']."' AND ativo='s' AND ".compleDelete());
					$duracaoTotal = false;
					if($dados){
						$id_aulas[$key]['id'] = $dados[0]['id'];
						$id_aulas[$key]['nome'] = $dados[0]['nome_exibicao'];
						if(Url::getURL(nivel_url_site()+5)!=NULL){
							$urlAmigo5 = base64_decode(Url::getURL(nivel_url_site()+5));
							if($urlAmigo5 == $val['idItem']){
								$active = 'active';
							}else{
								$active = false;
							}
						}else{
							$active = false;
						}
						if($id_matricula){
							$progress_bar = $this->progressoFrequencia($dados[0]['id'],$id_matricula);
						}else{
							$progress_bar = false;
						}
						if($segundosALiberar){
							$_SESSION[$tk_conta]['matricula'][$id_matricula]['duracaoTotal'] += $dados[0]['duracao'];
							$duracaoTotal = $_SESSION[$tk_conta]['matricula'][$id_matricula]['duracaoTotal'];
							if($segundosALiberar > $duracaoTotal){
								$libera_aula = true;
							}else{
								$libera_aula = false;
							}
						}
						$_SESSION[$tk_conta]['matricula'][$id_matricula][base64_encode($val['idItem'])][base64_encode($config['id'])]['libera_aula'] = $libera_aula;
						$_SESSION[$tk_conta]['matricula'][$id_matricula][base64_encode($val['idItem'])][base64_encode($config['id'])]['duracaoTotal'] = $duracaoTotal;
						$li = str_replace('{iditem}',$val['idItem'],$tema2);
						$li = str_replace('{icon}',buscaValorDb($GLOBALS['tab7'],'nome',$dados[0]['tipo'],'icon'),$li);
						$li = str_replace('{nome_exibicao}',$dados[0]['nome_exibicao'],$li);
						$li = str_replace('{label_icon}',$dados[0]['tipo'],$li);
						$li = str_replace('{active}',$active,$li);
						$li = str_replace('{duracao}',segundosEmHoras($dados[0]['duracao']),$li);
						$li = str_replace('{progress_bar}',$progress_bar,$li);

						if($libera_aula){
							$href = '/'.Url::getURL(nivel_url_site()).'/'.Url::getURL(nivel_url_site()+1).'/'.Url::getURL(nivel_url_site()+2).'/'.Url::getURL(nivel_url_site()+3).'/lecture/'.base64_encode($val['idItem']).$componentes;
							//$href .= '#lesson-'.$val['idItem'];
							if($key==0){
								$ret['link_inicio_curso'] = $href;
							}
						}else{
							$href = 'javaScript:alert(\'Conteudo Indisponível, \n favor entre em contato com o suporte\')';
						}
						$li = str_replace('{href}',$href,$li);
						$divLinha .= $li;
					}
				}
			}
		}
		$ret['html'] = str_replace('{divLinha}',$divLinha,$tema);
		$ret['est'] = $id_aulas;

		return $ret;
	}
	public function listAtividades2($config=false,$id_matricula=false){
		//Somente para apresentar o conteudo
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
		$tema = $temaHTML[1];
		$tema2 = $temaHTML[3];
		$id_aulas=false;
		$arr_conteudo = json_decode($config['conteudo'],true);
		$divLinha = false;
		$segundosALiberar = false;
		if(is_array($arr_conteudo)){
			$active = false;
			foreach($arr_conteudo As $key=>$val){
				global $tk_conta;
				$dados = buscaValoresDb("SELECT * FROM ".$GLOBALS['tab39']. " WHERE id = '".$val['idItem']."'");
				$duracaoTotal = false;
				if($dados){
					$id_aulas[$key]['id'] = $dados[0]['id'];
					$id_aulas[$key]['nome'] = $dados[0]['nome_exibicao'];
					if(Url::getURL(nivel_url_site()+5)!=NULL){
						$urlAmigo5 = base64_decode(Url::getURL(nivel_url_site()+5));
						if($urlAmigo5 == $val['idItem']){
							$active = 'active';
						}else{
							$active = false;
						}
					}else{
						$active = false;
					}
					if($id_matricula){
						$progress_bar = $this->progressoFrequencia($dados[0]['id'],$id_matricula);
					}else{
						$progress_bar = false;
					}/*
					if($segundosALiberar){
						$_SESSION[$tk_conta]['matricula'][$id_matricula]['duracaoTotal'] += $dados[0]['duracao'];
						$duracaoTotal = $_SESSION[$tk_conta]['matricula'][$id_matricula]['duracaoTotal'];
						if($segundosALiberar > $duracaoTotal){
							$libera_aula = true;
						}else{
							$libera_aula = false;
						}
					}*/
					$li = str_replace('{iditem}',$val['idItem'],$tema2);
					$li = str_replace('{icon}',buscaValorDb($GLOBALS['tab7'],'nome',$dados[0]['tipo'],'icon'),$li);
					$li = str_replace('{label_icon}',$dados[0]['tipo'],$li);
					$li = str_replace('{nome_exibicao}',$dados[0]['nome_exibicao'],$li);
					$li = str_replace('{active}',$active,$li);
					$li = str_replace('{duracao}',segundosEmHoras($dados[0]['duracao']),$li);
					$li = str_replace('{progress_bar}',$progress_bar,$li);

					$href = 'javaScript:void(0)';
					$li = str_replace('{href}',$href,$li);
					$divLinha .= $li;
				}
			}
		}
		$ret['html'] = str_replace('{divLinha}',$divLinha,$tema);
		$ret['est'] = $id_aulas;
		return $ret;
	}
	public function listAtividadesGratis($config=false,$id_matricula=false){
		//Somente para apresentar o conteudo
		$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
		$temaHTML2 = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/detalhes_cursos.html'));
		$tema = $temaHTML[1];
		$tema2 = isset($temaHTML2[11])?$temaHTML2[11]:false;
		$tema3 = isset($temaHTML2[12])?$temaHTML2[12]:false;
		$id_aulas=false;
		//print_r($config);exit;
		$arr_conteudo = json_decode($config['conteudo'],true);
		$divLinha = false;
		$segundosALiberar = false;
		$ret['gratis'] = false;
		if(is_array($arr_conteudo)){
			$active = false;
			foreach($arr_conteudo As $key=>$val){
				global $tk_conta;
				$dados = buscaValoresDb("SELECT * FROM ".$GLOBALS['tab39']. " WHERE id = '".$val['idItem']."'");
				$duracaoTotal = false;
				if($dados){
					//print_r($dados[0]);
					$id_aulas[$key]['id'] = $dados[0]['id'];
					$id_aulas[$key]['nome'] = $dados[0]['nome_exibicao'];
					/*if(Url::getURL(nivel_url_site()+5)!=NULL){
						$urlAmigo5 = base64_decode(Url::getURL(nivel_url_site()+5));
						if($urlAmigo5 == $val['idItem']){
							$active = 'active';
						}else{
							$active = false;
						}
					}else{
						$active = false;
					}
					if($id_matricula){
						$progress_bar = $this->progressoFrequencia($dados[0]['id'],$id_matricula);
					}else{*/
						$progress_bar = false;
					//}
					/*
					if($segundosALiberar){
						$_SESSION[$tk_conta]['matricula'][$id_matricula]['duracaoTotal'] += $dados[0]['duracao'];
						$duracaoTotal = $_SESSION[$tk_conta]['matricula'][$id_matricula]['duracaoTotal'];
						if($segundosALiberar > $duracaoTotal){
							$libera_aula = true;
						}else{
							$libera_aula = false;
						}
					}*/
					if(isset($dados[0]['gratis'])&&$dados[0]['gratis']=='s'){
						$li = str_replace('{iditem}',$val['idItem'],$tema2);
						$ret['gratis'] = true;
					}else{
						$li = str_replace('{iditem}',$val['idItem'],$tema3);
					}
					$li = str_replace('{icon}',buscaValorDb($GLOBALS['tab7'],'nome',$dados[0]['tipo'],'icon'),$li);
					$li = str_replace('{label_icon}',$dados[0]['tipo'],$li);
					$li = str_replace('{nome_exibicao}',$dados[0]['nome_exibicao'],$li);
					$li = str_replace('{active}',$active,$li);
					$li = str_replace('{duracao}',segundosEmHoras($dados[0]['duracao']),$li);
					$li = str_replace('{progress_bar}',$progress_bar,$li);
					$href = 'javaScript:void(0)';
					if($dados[0]['tipo']=='Video' && !empty($dados[0]['video'])){
						if($dados[0]['tipo_link_video']=='v'){
							$href = 'https://player.vimeo.com/video/'.$dados[0]['video'];
						}elseif($dados[0]['tipo_link_video']=='y'){
							$href = $dados[0]['video'];
						}
					}
					$li = str_replace('{href}',$href,$li);
					$divLinha .= $li;
				}
			}
		}
		$ret['html'] = str_replace('{divLinha}',$divLinha,$tema);
		$ret['est'] = $id_aulas;
		return $ret;
	}
	public function modulosCursoGratis($config=false){
		$tema =
		'<div class="accordion" id="accordionExample">
					{divLinha}
		</div>
		';
		$divLinha = false;
		$arr_conteudo = json_decode($config['conteudo'],true);
		if(is_array($arr_conteudo)){
			foreach($arr_conteudo As $key=>$val){
				$conteudo = dados_tab($GLOBALS['tab38'],'conteudo,id,token,nome_exibicao,descricao',"WHERE id='".$val['idItem']."'");
				$listAtividades = false;
				if(!empty($conteudo[0]['conteudo'])){
					$listAtividades = $this->listAtividadesGratis($conteudo[0]);
				}
				//if(isset($listAtividades['gratis'])&& !empty($listAtividades['gratis'])){
					$show = 'show';
				//}else{
					//$show = false;
				//}
				$divLinha .=
				'<div class="card">
										<div class="card-header" id="heading'.$val['idItem'].'">
										  <h5 class="mb-0">
											<button class="btn btn-link collapsed" type="button" data-toggle="collapse" data-target="#dv'.$val['idItem'].'" aria-expanded="false" aria-controls="collapseTwo">
											  '.$conteudo[0]['nome_exibicao'].'
											</button>
										  </h5>
										</div>
										<div id="dv'.$val['idItem'].'" class="collapse '.$show.'" aria-labelledby="heading'.$val['idItem'].'" data-parent="#accordionExample">
										  <div class="card-body">
											'.$conteudo[0]['descricao'].'
											'.@$listAtividades['html'].'
										  </div>
										</div>
				</div>';
			}
		}
		$ret = str_replace('{divLinha}',$divLinha,$tema);
		return $ret;
	}
	public function modulosCurso($config=false){
		$tema =
		'<div class="accordion" id="accordionExample">
					{divLinha}
		</div>
		';
		$temaLinha = '
		<div class="card">
										<div class="card-header" id="heading{idItem}">
										  <h5 class="mb-0">
											<button class="btn btn-link collapsed" type="button" data-toggle="collapse" data-target="#dv{idItem}" aria-expanded="false" aria-controls="collapseTwo">
												{nome_exibicao}
											</button>
										  </h5>
										</div>
										<div id="dv{idItem}" class="collapse" aria-labelledby="heading{idItem}" data-parent="#accordionExample">
										  <div class="card-body">
										  {descricao}
											  {listAtividades}
										  </div>
										</div>
		</div>';
		$divLinha = false;
		$arr_conteudo = json_decode($config['conteudo'],true);
		if(is_array($arr_conteudo)){
			foreach($arr_conteudo As $key=>$val){
				$conteudo = dados_tab($GLOBALS['tab38'],'conteudo,id,token,nome_exibicao,descricao',"WHERE id='".$val['idItem']."'");
				$listAtividades = false;
				if(!empty($conteudo[0]['conteudo'])){
					$listAtividades = $this->listAtividades2($conteudo[0]);
				}
				$divLinha .= str_replace('{idItem}',$val['idItem'],$temaLinha);
				$divLinha = str_replace('{nome_exibicao}',$conteudo[0]['nome_exibicao'],$divLinha);
				$divLinha = str_replace('{descricao}',$conteudo[0]['descricao'],$divLinha);
				$divLinha = str_replace('{listAtividades}',@$listAtividades['html'],$divLinha);

			}
		}
		$ret = str_replace('{divLinha}',$divLinha,$tema);
		return $ret;
	}
	public function conteudo($config=false){
		$arquivo = $this->pastaTema().'/layout_pagina.html';
		$ret 	= carregaArquivo($arquivo);

		return $ret;
	}
	public function pastaTema(){
		$dom = explode('.', $_SERVER['HTTP_HOST']);
		if(!is_subdominio()&& isset($_SESSION['pasta_dom'])){
			$dom[0] = $_SESSION['pasta_dom'];
			$ret = dirname(dirname(dirname(dirname(__FILE__)))).'/'.$dom[0].'/'.$this->pastaTema;
		}else{
			$ret = dirname(dirname(dirname(dirname(__FILE__)))).'/'.$dom[0].'/'.$this->pastaTema;
		}
		return $ret;
	}
	public function head($config=false){
		$ret = false;
		//inicio Verifica situação financeira
		$api = new apictloja;
		$verifica_fatura = $api->verifica_faturas();
		if(isset($verifica_fatura['acao'])){
			$liberarSite = buscaValorDb_SERVER($GLOBALS['contas_usuarios'],'token',TK_CONTA,'liberar');
			if($liberarSite=='n'){
				exit;
			}
		}
		//fim Verifica situação financeira

		if(Url::getURL(nivel_url_site()) == 'preview'){
			if(!logadoSite()){

				//include dirname(__FILE__) . "/lib/login_global.php";
				echo formatMensagem('ACESSO INCORRETO EFETUE LOGIN','danger');
				include dirname(dirname(dirname(dirname(__FILE__)))) . SEPARADOR .'admin'. SEPARADOR .'app'. SEPARADOR .'form_login.php';
				exit;
			}
		}
		$arquivo = $this->pastaTema().'/head.html';
		$temaHTML = carregaArquivo($arquivo);

        $tags_head = short_code('tags_head');
		/**area tags_code */
		$ret = str_replace('{url_principal}',$this->urPrincipal,$temaHTML);
		$ret = str_replace('{meta}',$this->metaPageEAD(),$ret);
		$conf_code = isset($_REQUEST['config'])?$_REQUEST['config']:false;
		$version = Q_VERSION?Q_VERSION:'1.0.0';
		if($version){
			$version = '?ver='.$version;
		}
		// if(isAdmin(1)){
		// 	dd($version);
		// }
		if($conf_code)
		{
			$arr_conf_code = lib_json_array($conf_code);
			$tags_head .= @$arr_conf_code['tag_head'];
		}

        $ret = str_replace('{url_principal}',$this->urPrincipal,$temaHTML);
		$ret = str_replace('{meta}',$this->metaPageEAD(),$ret);
		$ret = str_replace('{tags_head}',$tags_head,$ret);
		$ret = str_replace('{version}',$version,$ret);
		if(isAero()){
			$ret .= '<link rel="manifest" href="/manifest.json" />';
		}
		return $ret;
	}
	function dadosFiltroCursos2($condicao = false,$ordenar=false,$tab10=false){
		if(!$tab10)
		global $tab10;
		$condicao .= " AND ".compleDelete();
		$sqlDados = "SELECT * FROM $tab10 $condicao $ordenar";
		$_GET['pag'] = isset($_GET['pag'] )?$_GET['pag'] :0;
		$_GET['regi_pag'] = isset($_GET['regi_pag'] )?$_GET['regi_pag'] :100;

		$inicial = $_GET['pag']*$_GET['regi_pag'];
		$sqlDadosPage = $sqlDados ." LIMIT $inicial,".$_GET['regi_pag'];
		$dados 		= buscaValoresDb($sqlDados);
		$dadosPage 	= buscaValoresDb($sqlDadosPage);

		$exibe['found'] = false;
		$exibe['sqlDados'] = $sqlDados;
		$exibe['sqlDadosPage'] = $sqlDadosPage;
		if($dados){
			if(is_array($dadosPage)){
				for($i=0;$i<count($dadosPage);$i++){
					$exibe['produtos_page'][$i] = $dadosPage[$i];
					$image_link = dadosImagemModGal('arquivo',"id_produto='".$dadosPage[$i]['token']."' AND ordem = '1'");
					if(isset($image_link[0]['url']))
						$img_url = $image_link[0]['url'];
					else
						$img_url = RAIZ.'/img/indisponivel.gif';
					$exibe['produtos_page'][$i]['img_url'] 		= $img_url;
					$exibe['produtos_page'][$i]['img_title'] 	= isset($image_link[0]['title2'])?$image_link[0]['title2']:false;
				}
			}
			$exibe['reg_enc'] = count($dados);
			$exibe['found'] = true;
		}else{
			$exibe['produtos_page']=array();
		}
		$exibe['sql'] = $sqlDadosPage;
		return $exibe;
	}
	function urlsCursosSite($pg=false,$idCategoria=false,$urlProduto=false){
		global $tab9;
		$return = queta_option('dominio_site');
		if($pg){
			//$return .= buscaValorDb('tipo_pagina','id',$tipo,'url');
			$return .= SEPARADOR.$pg;
		}
		if($idCategoria){
			$arr_tok = explode('/',$idCategoria);
			if(isset($arr_tok[1])&& !empty($arr_tok[1])){
				$return .= SEPARADOR.buscaValorDb($tab9,'token',$arr_tok[0],'url');
				$return .= SEPARADOR.buscaValorDb($tab9,'token',$arr_tok[1],'url');
			}else{
				$return .= SEPARADOR.buscaValorDb($tab9,'token',$arr_tok[0],'url');
			}
		}
		if($urlProduto){
			$return .= SEPARADOR.$urlProduto;
		}
		return $return;
	}
	/*
	function urlsCursosSite($pg=false,$idCategoria=false,$urlProduto=false){
		global $tab9,$tab76;
		$return = queta_option('dominio_site');
		if($pg){
			//$return .= buscaValorDb('tipo_pagina','id',$tipo,'url');
			$return .= SEPARADOR.$pg;
		}
		if($idCategoria){
			$return .= SEPARADOR.buscaValorDb($tab9,'id',$idCategoria,'url');
		}
		if($urlProduto){
			$return .= SEPARADOR.$urlProduto;
		}
		return $return;
	}*/
	function price_box($id_produto,$inscricao=false){
		$ecomerce = new ecomerce;
		$price_box = $ecomerce->priceBox(array('id_produto'=>$id_produto,'exibe_inscricao'=>$inscricao));
		return $price_box;
	}
	function btnInicioAula($config=false,$tipo='btn'){
		global $tk_conta;
		$ret = false;
		$ecomerce = new ecomerce;
		//echo 'btnInicioAula';exit;
		$config['id_cliente'] = isset($config['id_cliente']) ? $config['id_cliente'] :false;
		if($config['id_cliente']){
			// $verificaAlunoMatricula = verificaAlunoMatricula($config['id_cliente'],$local=false); //declarado em app/cursos
			$ignora_contrato = queta_option('ignora_contrato')?queta_option('ignora_contrato'):'n';

			/*if(is_adminstrator(1)){
					echo 'aqui em btnInicioAula';
					print_r($config);exit;
			}*/
			// lib_print($config);
			if(isset($config['status']) && $config['status']==1 && !empty($config['pagamento_asaas'])){
					if(Url::getURL(1)!='minhas-faturas'){
						$ret = '<a href="/area-do-aluno/minhas-faturas" class="btn btn-primary"><i class="fa fa-money"></i> Pagar</a>';
					}

			}elseif(isset($config['status']) && $config['status']==1 && empty($config['pagamento_asaas'])){
					//if(Url::getURL(1)!='minhas-faturas'){
						$btn_comprar = $ecomerce->btnComprar(array('id_produto'=>$config['id_curso']),'grade');
						if($btn_comprar){
							$ret =$btn_comprar;
						}else{
							$ret = '<a href="/atendimento/contato" class="btn btn-primary btn-block ir-para-curso">Entre em contato</a>';
						}
					//}

			}elseif(isset($config['status']) && $config['status']==2){
				//verifica se existe mensalidades geradas mais não pagas
				//dd($verificaFinanceiroAluno);
				$ignora_fatura_atrasada = queta_option('ignora_fatura_atrasada')?queta_option('ignora_fatura_atrasada'):'n';
				if($ignora_fatura_atrasada=='n'){
					$verificaFinanceiroAluno = verificaFinanceiroAluno($config['id_cliente'],3);
					if($verificaFinanceiroAluno['enc']){
						if(Url::getURL(1)!='minhas-faturas'){
							$ret = '<a href="/area-do-aluno/minhas-faturas" class="btn btn-primary"><i class="fa fa-money"></i> Pagar</a>';
						}else{
							$ret = @$verificaFinanceiroAluno['mens'] ;
						}
					}else{
						//Nesse caso Ja esta matriculado so faltar tranforma-lo em aluno
						if($ignora_contrato=='n'){

							$ret = '<a href="'.$this->urlsCursosSite('cursos',$config['categoria'],buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'url')).'/contrato/'.base64_encode($config['id']).'" class="btn btn-primary">Iniciar o curso <i class="fa fa-chevron-right"></i> </a>';
						}else{
							$ret = '<a href="'.$this->urlsCursosSite('cursos',$config['categoria'],buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'url')).'/iniciar-curso" class="btn btn-primary btn-block ir-para-curso"><i class="fa fa-play-circle-o fa-2x" aria-hidden="true"></i> <span class="mb-2">Ir para o curso</span></a>';
						}
					}
				}else{
					//$ignora_contrato = queta_option('ignora_contrato')?queta_option('ignora_contrato'):'n';
					if($ignora_contrato=='n'){
						$ret = '<a href="'.$this->urlsCursosSite('cursos',$config['categoria'],buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'url')).'/contrato/'.base64_encode($config['id']).'" class="btn btn-primary">Iniciar o curso <i class="fa fa-chevron-right"></i> </a>';
					}else{
						$ret = '<a href="'.$this->urlsCursosSite('cursos',$config['categoria'],buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'url')).'/iniciar-curso" class="btn btn-primary btn-block ir-para-curso"><i class="fa fa-play-circle-o fa-2x" aria-hidden="true"></i> <span class="mb-2">Ir para o curso</span></a>';
					}
				}
			}elseif(isset($config['status']) && ($config['status']==3 || $config['status']==4)){
				//Neste caso Ja é aluno
				/*if($verificaAlunoMatricula['liberado']){
				}else{


				}*/
				$ignora_contrato = queta_option('ignora_contrato')?queta_option('ignora_contrato'):'s';
				if($ignora_contrato!='s'){
					$aceitoCotrato = $this->aceitoCotrato($config);
					if(!$aceitoCotrato['aceito']){
						$ret = '<a href="'.$this->urlsCursosSite('cursos',$config['categoria'],buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'url')).'/contrato/'.base64_encode($config['id']).'" class="btn btn-primary btn-block"><i class="fa fa-play-circle-o" aria-hidden="true"></i> <span class="mb-2">Ir para o curso</span></a>';
						return $ret;
					}
				}
				$verificaProgressoAluno = $this->verificaProgressoAluno($config);
				if(isset($verificaProgressoAluno['link'])){
						$compleURL = $verificaProgressoAluno['link'];
						$ret = '<a href="'.$this->urlsCursosSite('cursos',$config['categoria'],buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'url')).'/iniciar-curso'.$compleURL.'" class="btn btn-primary btn-block ir-para-curso"><div><i class="fa fa-play-circle-o fa-2x" aria-hidden="true"></i> <span class="mb-2">Ir para o curso</span></div></a>';
				}else{
						$ret = '<a href="'.$this->urlsCursosSite('cursos',$config['categoria'],buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'url')).'/iniciar-curso" class="btn btn-primary btn-block ir-para-curso"><i class="fa fa-play-circle-o fa-2x" aria-hidden="true"></i> <span class="mb-2">Ir para o curso</span></a>';
				}
			}else{
				$ret = '<a href="/atendimento/contato" class="btn btn-primary btn-block ir-para-curso">Entre em contato</a>';
			}
		}
		if($tipo=='link'){
			$domdoc = new DOMDocument();
			$domdoc->loadHTML($ret);
			$xpath = new DOMXpath($domdoc);

			$query = "//a";
			$entries = $xpath->query($query);

			foreach ($entries as $a) {
				echo $a->getAttribute('href'), PHP_EOL;
			}
		}
		return $ret;
	}
	function aceitoCotrato($config=false){
		$ret['aceito'] = false;
		if(isset($config['contrato']) && !empty($config['contrato'])){
			$arrContrato = json_decode($config['contrato'],true);
			if(is_array($arrContrato)&&isset($arrContrato['aceito_contrato'])&&$arrContrato['aceito_contrato']=='on'){
				$ret['aceito']=true;
			}
		}
		return $ret;
	}
	function linkInicioAula($config=false){
		$ret = false;
		$config['id_curso'] = isset($config['id_curso']) ? $config['id_curso']: false;
		if($config){
			$verificaProgressoAluno = $this->verificaProgressoAluno($config);
			if(isset($verificaProgressoAluno['link'])){
				$compleURL = $verificaProgressoAluno['link'];
				$ret = 'href="'.$this->urlsCursosSite('cursos',$config['categoria'],buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'url')).'/iniciar-curso'.$compleURL.'" ';
			}else{
				//$ret = '<a href="'.queta_option('dominio_site').'/'.buscaValorDb($GLOBALS['tab76'],'id',21,'url').'/'.buscaValorDb($GLOBALS['tab76'],'id',24,'url').'/iniciar-curso/'.base64_encode($config['id_curso']).'" class="btn btn-primary"><span class="mb-2">Ir para o curso</span></a>';
				$ret = 'href="'.$this->urlsCursosSite('cursos',$config['categoria'],buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'url')).'/iniciar-curso" ';
			}
		}
		return $ret;
	}
	function verificarCursoComprado($id_curso=false,$id_cliente=false,$opc=1){
		global $tk_conta;
		$id_cliente = isset($_SESSION[$tk_conta]['id'.SUF_SYS])? $_SESSION[$tk_conta]['id'.SUF_SYS]:false;
		$ret = false;
		if($id_cliente && $id_curso && is_clientLogado()){
			if($opc==1){
				$sql="SELECT * FROM ".$GLOBALS['tab12']." WHERE `id_cliente`='".$id_cliente."' AND `id_curso`='".$id_curso."'  AND `status`>'1' AND ".compleDelete();
			}else{
				$sql="SELECT * FROM ".$GLOBALS['tab12']." WHERE `id_cliente`='".$id_cliente."' AND `id_curso`='".$id_curso."'  AND `status`>='1' AND pagamento_asaas !='' AND ".compleDelete();

			}
			//var_dump($sql);exit;
			//propriedade do cursos //cursos do aluno
			$dados 		= buscaValoresDb($sql);
			if($dados){
				$ret['dados'] 	= $dados[0];
				$ret['dados']['id_matricula'] 	= isset($dados[0]['id'])?$dados[0]['id']:false;
			}else{
				$ret['dados'] 	= $dados;
			}
			$ret['sql'] 		= $sql;
		}
		return $ret;
	}
	function verificarCursoComprado2($id_curso=false,$id_cliente=false,$opc=1){
		global $tk_conta;
		$id_cliente = isset($_SESSION[$tk_conta]['id'.SUF_SYS])? $_SESSION[$tk_conta]['id'.SUF_SYS]:false;
		$ret = false;
		if($id_cliente && $id_curso && is_clientLogado()){
			if($opc==1){
				$sql="SELECT * FROM ".$GLOBALS['tab12']." WHERE `id_cliente`='".$id_cliente."' AND `id_curso`='".$id_curso."' AND ".compleDelete();
			}else{
				$sql="SELECT * FROM ".$GLOBALS['tab12']." WHERE `id_cliente`='".$id_cliente."' AND `id_curso`='".$id_curso."' AND pagamento_asaas !='' AND ".compleDelete();

			}
			//var_dump($sql);exit;
			//propriedade do cursos //cursos do aluno
			$dados 		= buscaValoresDb($sql);
			if($dados)
				$ret['dados'] 	= $dados[0];
			else{
				$ret['dados'] 	= $dados;
			}
			$ret['sql'] 		= $sql;
		}
		return $ret;
	}
	function foreash_cursos($config_foreach,$temaPro=false,$nome_cate=false){
		$ret = false;
		if(is_array($config_foreach) && $temaPro){
			$active = false;
			$ecomerce = new ecomerce;
			foreach($config_foreach As $key=>$val){
				$progress_curso=false;
				$painel_faturas=false;
				$turmas = $this->turmasFrot($val['id']);
				$label_btn_comprar = 'Comprar';
				/*
				if(isAero()){
					$verificarCursoComprado = $this->verificarCursoComprado2($val['id'],false,2);
				}else{
					$verificarCursoComprado = $this->verificarCursoComprado2($val['id'],false,1);
				}*/
				$verificarCursoComprado = $this->verificarCursoComprado($val['id'],false,1);
				$resumoGradeCurso = $this->resumoGradeCurso($val['id']);
				//if(is_adminstrator(1))
				// lib_print($verificarCursoComprado);exit;

				if(isset($verificarCursoComprado['dados']) && $verificarCursoComprado['dados']){
					//if(isset($verificarCursoComprado['dados']['status'])&&$verificarCursoComprado['dados']['status']>1){
						$label_btn_comprar = '<i class="fa fa-play-circle-o" aria-hidden="true"></i> <span class="mb-2">Ir para o curso</span>';
						$verificarCursoComprado['dados']['categoria'] = $val['categoria'];
						$btn_comprar = $this->btnInicioAula($verificarCursoComprado['dados']);
						$link_comprar = $this->linkInicioAula($verificarCursoComprado['dados']);
					//}elseif(Url::getURL(0)=='area-do-aluno'){
						//$btn_comprar = false;
						//$link_comprar = false;
					//}else{
						//$btn_comprar = false;
						//$link_comprar = false;
					//}
					$verificaProgressoAluno = $this->verificaProgressoAluno($verificarCursoComprado['dados']);
					$pagamento_asaas = false;
					if($verificaProgressoAluno && !empty($verificarCursoComprado['dados']['pagamento_asaas'])){
						//var_dump($verificarCursoComprado['dados']['pagamento_asaas']);
						$arr_pagamento = json_decode($verificarCursoComprado['dados']['pagamento_asaas'],true);
						$formaPagamento = false;
						if(is_array($arr_pagamento) && isset($arr_pagamento['data'])){
							if($arr_pagamento['data'][0]['billingType']=='CREDIT_CARD'){
								$formaPagamento = 'Cartão de crédito';
							}
							$pagamento_asaas = '<label class="formaPagamento">Forma de pagamento:  <b>'.$formaPagamento.'</b></label> ';
							$pagamento_asaas .= '<label class="totalCount">Pagamento: '.$arr_pagamento['totalCount'].' X <b>'.$arr_pagamento['data'][0]['value'].'</b></label>';
						}
					}
					$painel_faturas = '
					<div class="col-md-12 div-matricula padding-none">
						<label>Matricula:</label> <b>'.zerofill($verificarCursoComprado['dados']['id'],6).'</b>
						'.$pagamento_asaas.'
					</div>';
					$painel_faturas .= $this->painelFaturas($verificarCursoComprado['dados']);
					$progress_curso = isset($verificaProgressoAluno['progress_bar'])?$verificaProgressoAluno['progress_bar']:false;
					$price_box['html'] = '';
					$price_box['oferta'] = '';
				}else{
					/**se não pagou ainda */

					$price_box = $this->price_box($val['id'],false);
					if(queta_option('tema_front')=='lift'){
						//$btn_comprar = false;
						//$link_comprar = false;
						$btn_comprar = $ecomerce->btnComprar(array('id_produto'=>$val['id'],true));
						$link_comprar = $ecomerce->btnComprar(array('id_produto'=>$val['id']),'link');
					}else{
						$btn_comprar = $ecomerce->btnComprar(array('id_produto'=>$val['id'],true));
						$link_comprar = $ecomerce->btnComprar(array('id_produto'=>$val['id']),'link');
					}
				}
				if($temaPro){
					$div_produtoHTML = $temaPro;
					$div_produtoHTML = str_replace('{{desc_rapida}}',lib_cortaPalavras($val['descricao'],20),$div_produtoHTML);
					$urlProduto = $this->urlsCursosSite('cursos',$val['categoria'],$val['url']);
				}
				if($key == 0){
					$div_produtoHTML = str_replace('{{active}}','active',$div_produtoHTML);
				}else{
					$div_produtoHTML = str_replace('{{active}}','',$div_produtoHTML);
				}
				$div_produtoHTML = str_replace('{{id}}',$val['id'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{nome_curso}}',$val['titulo'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{img_url}}',$val['img_url'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{url_curso_detalhes}}',$urlProduto,$div_produtoHTML);
				$categoria = buscaValorDb($GLOBALS['tab9'],'token',$val['categoria'],'label_front');
				$url_categoria = buscaValorDb($GLOBALS['tab9'],'token',$val['categoria'],'url');
				$div_produtoHTML = str_replace('{{categoria}}',$categoria,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{link_categoria}}','/cursos/'.$url_categoria,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{categ_curso}}',$categoria,$div_produtoHTML);
				//$div_produtoHTML = str_replace('{{descricao_curta}}',lib_cortaPalavras($val['descricao'],20),$div_produtoHTML);
				$div_produtoHTML = str_replace('{{descricao_curta}}','',$div_produtoHTML);
				//$professor = buscaValorDb($GLOBALS['tab1'],'id',$val['professor'],'nome');
				$professor = false;
				$div_produtoHTML = str_replace('{{btn_comprar}}',$btn_comprar,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{link_comprar}}',$link_comprar,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{label_btn_comprar}}',$label_btn_comprar,$div_produtoHTML);
				$totalTurmas = '<span>Turmas: </span><a href="'.$urlProduto.'">'.$turmas['total'].'</a>';
				$div_produtoHTML = str_replace('{{turmas_total}}',$totalTurmas,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{turmas_list}}',$turmas['list'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{oferta}}',$price_box['oferta'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{progress_curso}}',$progress_curso,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{painel_faturas}}',$painel_faturas,$div_produtoHTML);
				//$div_produtoHTML = str_replace('{{resumoGradeCurso}}',$resumoGradeCurso,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{resumoGradeCurso}}','',$div_produtoHTML);
				$div_produtoHTML = str_replace('{{painel_edit}}',$this->painel_edit_cursosSite($val['id'],$GLOBALS['tab10']),$div_produtoHTML);
				if(isset($val['mostra_preco'])){
				$div_produtoHTML = str_replace('{{prince_box}}',$price_box['html'],$div_produtoHTML);
				}else{
				$div_produtoHTML = str_replace('{{prince_box}}','',$div_produtoHTML);

				$div_produtoHTML = str_replace('{{valor_curso}}',$price_box['html'],$div_produtoHTML);

				}
				//$ret .= $temaPro;
				$ret .= $div_produtoHTML;
			}
		}
		return $ret;
	}
	function foreash_cursos2($config_foreach,$temaPro=false,$nome_cate=false){
		$ret = false;
		if(is_array($config_foreach) && $temaPro){
			$active = false;
			$ecomerce = new ecomerce;
			foreach($config_foreach As $key=>$val){
				$progress_curso=false;
				$painel_faturas=false;
				$turmas = $this->turmasFrot($val['id']);
				$label_btn_comprar = 'Comprar';
				/*
				if(isAero()){
					$verificarCursoComprado = $this->verificarCursoComprado2($val['id'],false,2);
				}else{
					$verificarCursoComprado = $this->verificarCursoComprado2($val['id'],false,1);
				}*/
				$verificarCursoComprado = $this->verificarCursoComprado($val['id'],false,1);
				$resumoGradeCurso = $this->resumoGradeCurso($val['id']);
				//if(is_adminstrator(1))
				// lib_print($verificarCursoComprado);exit;

				if(isset($verificarCursoComprado['dados']) && $verificarCursoComprado['dados']){
					//if(isset($verificarCursoComprado['dados']['status'])&&$verificarCursoComprado['dados']['status']>1){
						$label_btn_comprar = '<i class="fa fa-play-circle-o" aria-hidden="true"></i> <span class="mb-2">Ir para o curso</span>';
						$verificarCursoComprado['dados']['categoria'] = $val['categoria'];
						//Inicio botao de açao do aluno
						$btn_comprar = $this->btnInicioAula($verificarCursoComprado['dados']);
						// $link_comprar = $this->linkInicioAula($verificarCursoComprado['dados']);
						//Fim botao de açao do aluno
					//}elseif(Url::getURL(0)=='area-do-aluno'){
						// $btn_comprar = false;
						$link_comprar = false;
					//}else{
						//$btn_comprar = false;
						//$link_comprar = false;
					//}
					// inicio Progresso do aluno
					// $verificaProgressoAluno = $this->verificaProgressoAluno($verificarCursoComprado['dados']);
					// $pagamento_asaas = false;
					// if($verificaProgressoAluno && !empty($verificarCursoComprado['dados']['pagamento_asaas'])){
					// 	//var_dump($verificarCursoComprado['dados']['pagamento_asaas']);
					// 	$arr_pagamento = json_decode($verificarCursoComprado['dados']['pagamento_asaas'],true);
					// 	$formaPagamento = false;
					// 	if(is_array($arr_pagamento) && isset($arr_pagamento['data'])){
					// 		if($arr_pagamento['data'][0]['billingType']=='CREDIT_CARD'){
					// 			$formaPagamento = 'Cartão de crédito';
					// 		}
					// 		$pagamento_asaas = '<label class="formaPagamento">Forma de pagamento:  <b>'.$formaPagamento.'</b></label> ';
					// 		$pagamento_asaas .= '<label class="totalCount">Pagamento: '.$arr_pagamento['totalCount'].' X <b>'.$arr_pagamento['data'][0]['value'].'</b></label>';
					// 	}
					// }
					//fim prigresso aluno
					$painel_faturas = '
					<div class="col-md-12 div-matricula padding-none">
						<label>Matricula:</label> <b>'.zerofill($verificarCursoComprado['dados']['id'],6).'</b>
						'.$pagamento_asaas.'
					</div>';
					//Inicio faturas do aluno
					$painel_faturas .= $this->painelFaturas($verificarCursoComprado['dados']);
					//fim faturas do aluno
					$progress_curso = isset($verificaProgressoAluno['progress_bar'])?$verificaProgressoAluno['progress_bar']:false;
					$price_box['html'] = '';
					$price_box['oferta'] = '';
				}else{
					/**se não pagou ainda */

					$price_box = $this->price_box($val['id'],false);
					if(queta_option('tema_front')=='lift'){
						//$btn_comprar = false;
						//$link_comprar = false;
						$btn_comprar = $ecomerce->btnComprar(array('id_produto'=>$val['id'],true));
						$link_comprar = $ecomerce->btnComprar(array('id_produto'=>$val['id']),'link');
					}else{
						$btn_comprar = $ecomerce->btnComprar(array('id_produto'=>$val['id'],true));
						$link_comprar = $ecomerce->btnComprar(array('id_produto'=>$val['id']),'link');
					}
				}
				if($temaPro){
					$div_produtoHTML = $temaPro;
					$div_produtoHTML = str_replace('{{desc_rapida}}',lib_cortaPalavras($val['descricao'],20),$div_produtoHTML);
					$urlProduto = $this->urlsCursosSite('cursos',$val['categoria'],$val['url']);
				}
				if($key == 0){
					$div_produtoHTML = str_replace('{{active}}','active',$div_produtoHTML);
				}else{
					$div_produtoHTML = str_replace('{{active}}','',$div_produtoHTML);
				}
				$div_produtoHTML = str_replace('{{id}}',$val['id'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{nome_curso}}',$val['titulo'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{img_url}}',$val['img_url'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{url_curso_detalhes}}',$urlProduto,$div_produtoHTML);
				$categoria = buscaValorDb($GLOBALS['tab9'],'token',$val['categoria'],'label_front');
				$url_categoria = buscaValorDb($GLOBALS['tab9'],'token',$val['categoria'],'url');
				$div_produtoHTML = str_replace('{{categoria}}',$categoria,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{link_categoria}}','/cursos/'.$url_categoria,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{categ_curso}}',$categoria,$div_produtoHTML);
				//$div_produtoHTML = str_replace('{{descricao_curta}}',lib_cortaPalavras($val['descricao'],20),$div_produtoHTML);
				$div_produtoHTML = str_replace('{{descricao_curta}}','',$div_produtoHTML);
				//$professor = buscaValorDb($GLOBALS['tab1'],'id',$val['professor'],'nome');
				$professor = false;
				$div_produtoHTML = str_replace('{{btn_comprar}}',$btn_comprar,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{link_comprar}}',$link_comprar,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{label_btn_comprar}}',$label_btn_comprar,$div_produtoHTML);
				$totalTurmas = '<span>Turmas: </span><a href="'.$urlProduto.'">'.$turmas['total'].'</a>';
				$div_produtoHTML = str_replace('{{turmas_total}}',$totalTurmas,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{turmas_list}}',$turmas['list'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{oferta}}',$price_box['oferta'],$div_produtoHTML);
				$div_produtoHTML = str_replace('{{progress_curso}}',$progress_curso,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{painel_faturas}}',$painel_faturas,$div_produtoHTML);
				//$div_produtoHTML = str_replace('{{resumoGradeCurso}}',$resumoGradeCurso,$div_produtoHTML);
				$div_produtoHTML = str_replace('{{resumoGradeCurso}}','',$div_produtoHTML);
				$div_produtoHTML = str_replace('{{painel_edit}}',$this->painel_edit_cursosSite($val['id'],$GLOBALS['tab10']),$div_produtoHTML);
				if(isset($val['mostra_preco'])){
				$div_produtoHTML = str_replace('{{prince_box}}',$price_box['html'],$div_produtoHTML);
				}else{
				$div_produtoHTML = str_replace('{{prince_box}}','',$div_produtoHTML);

				$div_produtoHTML = str_replace('{{valor_curso}}',$price_box['html'],$div_produtoHTML);

				}
				//$ret .= $temaPro;
				$ret .= $div_produtoHTML;
			}
		}
		return $ret;
	}
	public function resumoGradeCurso($id_curso,$tema1=false,$tema2=false){
		$ret = false;
		$dados = dados_tab($GLOBALS['tab10'],'conteudo,id,token', " WHERE id='".$id_curso."' AND ".compleDelete());
		if($dados){
				if(!empty($dados[0]['conteudo'])){
					$tema1 = $tema1?$tema1:'<ul>{li}</ul>';
					$tema2 = $tema2?$tema2:'<li>{conteudo}</li>';
					$arr_conteudo = json_decode($dados[0]['conteudo'],true);
					if(is_array($arr_conteudo)){
						$li = false;
						$cont = false;
						foreach($arr_conteudo As $ke=>$v){
							$cont = str_replace('{conteudo}',buscaValorDb($GLOBALS['tab38'],'id',$v['idItem'],'nome_exibicao'),$tema2);
							$li .= $cont;
						}
						$ret = str_replace('{li}',$li,$tema1);
					}
				}
		}
		return $ret;
	}
	public function turmasFrot($id_curso=false){
		$diasAntes = queta_option('dias_turma_valida') ? queta_option('dias_turma_valida'):10;
		$hoje = dtBanco(CalcularDiasAnteriores(date('d/m/Y'),$diasAntes,$formato = 'd/m/Y'));
		$comple = " AND fim >= '".$hoje."' AND ".compleDelete();
		$sql = "SELECT * FROM ".$GLOBALS['tab11']." WHERE `ativo`='s' $comple AND id_curso='".$id_curso."' ORDER BY inicio ASC";
		$dados = buscaValoresDb($sql);
		// if(isAdmin(1)){
		// 	echo $sql;
		// 	dd($dados);
		// }

		$ret = false;
		$ret['list'] = false;
		$ret['total'] = 0;
		if($dados){
			$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/detalhes_cursos.html'));
			$tema = $temaHTML[2];
			$tema2 = $temaHTML[3];
			/*$tema =
			'<ul class="list-group ul-list-turmas" style="display: block;">
				{divLinha}
			</ul>
			';*/
			$divLinha = false;
			$ret['total'] = 0;
			//$ret['total'] = count($dados);
			foreach($dados As $key=>$val){
				$ret['total'] ++;
				if($val['max_alunos']>0){
					$matriculadosTurmas = totalReg($GLOBALS['tab12'],"WHERE status<'1' AND id_turma = '".$val['id']."' AND ".compleDelete());
					if($val['max_alunos'] > $matriculadosTurmas){
						$nome_turma = str_replace('{turma}','',$val['nome']);
						$nome_turma = str_replace('{Turma}','',$nome_turma);
						$link_turma = '/'.Url::getURL(nivel_url_site()).'/'.Url::getURL(nivel_url_site()+1).'/'.Url::getURL(nivel_url_site()+2).'/turmas/'.base64_encode($val['id']).'#frm_interesseFrontAero';
						$divLinha .= str_replace('{nome_turma}',$val['nome'],$tema2);
						$divLinha = str_replace('{inicio}',dataExibe($val['inicio']),$divLinha);
						$divLinha = str_replace('{fim}',dataExibe($val['fim']),$divLinha);
						$divLinha = str_replace('{max_alunos}',$val['max_alunos'],$divLinha);
						$divLinha = str_replace('{link_turma}',$link_turma,$divLinha);
					}
				}else{
						$nome_turma = str_replace('{turma}','',$val['nome']);
						$nome_turma = str_replace('{Turma}','',$nome_turma);
						$link_turma = '/'.Url::getURL(nivel_url_site()).'/'.Url::getURL(nivel_url_site()+1).'/'.Url::getURL(nivel_url_site()+2).'/turmas/'.base64_encode($val['id']).'#frm_interesseFrontAero';
						$divLinha .= str_replace('{nome_turma}',$val['nome'],$tema2);
						$divLinha = str_replace('{inicio}',dataExibe($val['inicio']),$divLinha);
						$divLinha = str_replace('{fim}',dataExibe($val['fim']),$divLinha);
						$divLinha = str_replace('{max_alunos}',$val['max_alunos'],$divLinha);
						$divLinha = str_replace('{link_turma}',$link_turma,$divLinha);

				}
			}
			$ret['list'] = str_replace('{divLinha}',$divLinha,$tema);
		}
		return $ret;
	}
	public function painel_edit_cursosSite($id,$tab='cursos'){
		$ret = false;
		if(is_adminstrator(7) && $tab){
			if($tab == $GLOBALS['tab10']){
				$sec = 'dG9kb3MtY3Vyc29z';
			}
			$url = ''.RAIZ.'/cursos/iframe?sec='.$sec.'&acao=alt&id='.base64_encode($id).'';
			$origem = '&origem='.base64_encode('site');
			$ret = '<div class="col-md-12 padding-none">
						<div class="card">
							<div class="card-header">
								<i class="fa fa-pencil" title="Editar Este curso" data-toggle="tooltip"></i> Painel de edição rápida
							</div>
							<div class="card-body">
								<a class="btn btn-outline-secondary" href="javaScript:void(0);" onClick="abrirjanelaPadrao(\''.$url.'&etp=ZXRwMQ=='.$origem.'\')"><i class="fa fa-info" title="Editar informações do curso" data-toggle="tooltip"></i></a>
								<a class="btn btn-outline-secondary" href="javaScript:void(0);" onClick="abrirjanelaPadrao(\''.$url.'&etp=ZXRwMg=='.$origem.'\')"><i class="fa fa-photo" title="Editar as imagens" data-toggle="tooltip"></i></a>

								<a class="btn btn-outline-secondary" href="javaScript:void(0);" onClick="abrirjanelaPadrao(\''.$url.'&etp=ZXRwMw=='.$origem.'\')"><i class="fa fa-th" title="Editar o conteudo" data-toggle="tooltip"></i></a>
								<a class="btn btn-outline-secondary" href="javaScript:void(0);" onClick="abrirjanelaPadrao(\''.$url.'&etp=ZXRwNA=='.$origem.'\')"><i class="fa fa-cog" title="Editar configurações do curso" data-toggle="tooltip"></i></a>
							</div>
						</div>
					</div>
					';
		}
		return $ret;
	}
	public function painel_edit_paginasSite($id){
		$ret = false;
		if(is_adminstrator(7) && Url::getURL(1)==NULL){
			$sec = 'bWVudXMtc2l0ZQ==';
			$url = ''.RAIZ.'/site/iframe?sec='.$sec.'&acao=alt&id='.base64_encode($id).'';
			$ret = '<div class="editar-pagina"><a class="btn btn-outline-secondary" href="javaScript:void(0);" onClick="abrirjanelaPadrao(\''.$url.'\')" title="Editar esta página"><i class="fa fa-pencil"></i></a></div>';
		}
		return $ret;
	}
	public function listCursosFront($config=false){
		$tema0 = false;
		$_GET['regi_pag'] = isset($_GET['regi_pag'])?$_GET['regi_pag']:9;
		$condicao = isset($config['condicao'])?$config['condicao']:" WHERE `ativo` = 's' ";
		$ordenar = isset($config['ordenar'])?$config['ordenar']:" ORDER BY `ordenar` ASC";
		$dadosProdutos = $this->dadosFiltroCursos2($condicao,$ordenar,$GLOBALS['tab10']);
		if(is_adminstrator(1))
		$ret['dadosProdutos'] = $dadosProdutos;
		$ret['lista_produtos']	= false;
		$ret['resumo_pagina'] = 0;
		$ret['paginacao_site'] =  $this->paginaCaoSite(0,$_GET['regi_pag'],$_GET['pag']);
		if($dadosProdutos['found']){
					$ret0 = $this->foreash_cursos($dadosProdutos['produtos_page'],$this->temaCursosGrade());
					$ret['lista_produtos'] =  $ret0;
					$ret['paginacao_site'] =  $this->paginaCaoSite($dadosProdutos['reg_enc'],$_GET['regi_pag'],$_GET['pag']);
					$ret['resumo_pagina']  =  $dadosProdutos['reg_enc'];
		}else{
					$ret['lista_produtos'] = '<div class="col-md-12">'.formatMensagem('<strong>Erro:</strong> Registro não encontrado','danger',40000).'</div>';
		}
		return $ret;

	}
	function  paginaCaoSite($reg_enc,$reg_pag,$pag=0){
					$paginas = ceil($reg_enc/$reg_pag);
					$paginas++;
					$valor = "<nav class=\"text-right\"><ul class=\"pagination\">";
					if($pag > 0){
						$valor .= "<li class=\"page-item\"><a class=\"page-link\" href=\"".lib_trataAddUrl('pag',($pag-1))."\"><i class=\"fa fa-step-backward\"></i></a></li>";

					}else{
						//$valor .= '<li class="page-item disabled"><a class="page-link" href="javaScript:void(0);"><i class=\"fa fa-chevron-left fa-fw\"></i></a></li>';
					}
					for ($i_pag=1;$i_pag<$paginas;$i_pag++){
							if ($pag == ($i_pag-1)) {
								$valor .= "<li class=\"page-item active\"><a class=\"page-link\" href=\"javaScript:void(0);\">$i_pag</a></li>";
							} else {
								$i_pag2 = $i_pag-1;
								$valor .= "<li class=\"page-item\"><a class=\"page-link\" href=\"".lib_trataAddUrl('pag',$i_pag2)."\" ><b> $i_pag</b> </a></li>";
							}
					}
					if (($pag+2) < $paginas) {
						$valor .= "<li  class=\"page-item\" ><a  class=\"page-link\" href=\"".lib_trataAddUrl('pag',($pag+1))."\" ><i class=\"fa fa-step-forward\"></i></a></li>";
					} else {
						//$valor .= '<li class="disabled"  class=\"page-item\"><a  class=\"page-link\" href="javaScript:void(0);">&nbsp;&raquo;</a></li>';
					}
				$valor .= "</ul></nav>";
					return $valor;
	}
	public function menu_login($config=false,$opc=1){
		global $tk_conta;
		$li_menu=false;
		$dp_conteudo = false;
		$temaHTML 	= explode('<!--separa--->',carregaArquivo($this->pastaTema().'/area_do_aluno.html'));
		$temaHTML[0] = isset($temaHTML[0]) ? $temaHTML[0] : false;
		$temaHTML[1] = isset($temaHTML[1]) ? $temaHTML[1] : false;
		$temaHTML[2] = isset($temaHTML[2]) ? $temaHTML[2] : false;
		$temaHTML[3] = isset($temaHTML[3]) ? $temaHTML[3] : false;

		$menu_login = false;
		if(is_clientLogado()){
			$arr_menu = sql_array("SELECT * FROM ".$GLOBALS['tab76']." WHERE `pai`='21' AND ".compleDelete()." ORDER BY ordenar ASC",'nome','url');
			$urlLinkArea = buscaValorDb($GLOBALS['tab76'],'id',21,'url');
			if($opc==1){
				$nome = $_SESSION[$tk_conta]['nome'.SUF_SYS];
				$login = $nome;
				foreach($arr_menu As $key=>$val){
					$href 	= queta_option('dominio_site').'/'.$urlLinkArea.'/'.$key;
					$li_menu .= str_replace('{label}',$val,$temaHTML[3]);
					$li_menu = str_replace('{icon}','fa fa-user',$li_menu);
					$li_menu = str_replace('{link}',$href,$li_menu);
				}
				$li_menu .= str_replace('{label}','Sair',$temaHTML[3]);
				$li_menu = str_replace('{icon}','fa fa-sign-out',$li_menu);
				$li_menu = str_replace('{link}','/account/sair',$li_menu);
				/*
				$li_menu          .= $this->pnCategoriasTopo($config);
					$tem = '<li class="drop-down">
											  <a href="#" ><i class="fa fa-user-circle-o fa-2x" aria-hidden="true"></i> <b class="caret"></b></a>
											  <ul class="">{dp_conteudo}</ul>
							</li>';
			$tem2 = '<li><a href="{href}">{label}</a></li>';

						$dp_conteudo .= str_replace('{href}','/area-do-aluno',$tem2);
						$dp_conteudo = str_replace('{label}','Painel',$dp_conteudo);
					foreach($arr_menu As $key=>$val){
						$href 	= queta_option('dominio_site').'/'.$urlLinkArea.'/'.$key;
						//$dp_conteudo .= '<li><a href="'.$href.'">'.$val.'</a></li>';
						$dp_conteudo .= str_replace('{href}',$href,$tem2);
						$dp_conteudo = str_replace('{label}',$val,$dp_conteudo);
					}

					$dp_conteudo .= str_replace('{href}','/account/sair',$tem2);
					$dp_conteudo = str_replace('{label}','Sair',$dp_conteudo);
					$li_menu    .= str_replace('{dp_conteudo}',$dp_conteudo,$tem);
				*/
			}
			if($opc==2){
				$temaHTML 	= explode('<!--separa--->',carregaArquivo($this->pastaTema().'/area_do_aluno_menu.html'));
				$tema1 = $temaHTML[0];
				$tema2 = $temaHTML[1];
				$li=false;
				if(Url::getURL(nivel_url_site()+1)==NULL){
						$active = 'active';
				}else{
						$active = false;
				}
				$href 	= queta_option('dominio_site').'/'.$urlLinkArea;
				$menu 	= 'Painel';
				$li0 = str_replace('{href_link}',$href,$tema2);
				$li0 = str_replace('{nome_menu}',$menu,$li0);
				$li0 = str_replace('{active}',$active,$li0);
				$li .= $li0;
				foreach($arr_menu As $key=>$val){
					$href 	= queta_option('dominio_site').'/'.$urlLinkArea.'/'.$key;
					$menu 	= $val;
					if(Url::getURL(nivel_url_site()+1)==$key){
						$active = 'active';
					}else{
						$active = false;
					}
					$li0 = str_replace('{href_link}',$href,$tema2);
					$li0 = str_replace('{nome_menu}',$menu,$li0);
					$li0 = str_replace('{active}',$active,$li0);
					$li .= $li0;
				}
				$li_menu = str_replace('{li}',$li,$tema1);
			}
		}else{
			if($opc==1){
				$login = 'Login';
				$li_menu = str_replace('{label}','Entrar',$temaHTML[3]);
				$li_menu = str_replace('{icon}','fa fa-sign-in',$li_menu);
				$li_menu = str_replace('{link}','/account/login',$li_menu);
				$li_menu .= str_replace('{label}','Cadastrar',$temaHTML[3]);
				$li_menu = str_replace('{icon}','fa fa-list',$li_menu);
				$li_menu = str_replace('{link}','/account/register',$li_menu);
			}
		}
		$menu_login = str_replace('{menu_login}',$li_menu,$temaHTML[2]);
		$menu_login = str_replace('{login}',$login,$menu_login);
		$menu_login = str_replace('{content}',$li_menu,$menu_login);
		return $menu_login;
	}
	public function menuPainelNav($config=false,$opc=1){
		$li_menu=false;
		$dp_conteudo = false;
		$temaHTML 	= explode('<!--separa--->',carregaArquivo($this->pastaTema().'/area_do_aluno.html'));
		$menu_login = false;
		if(is_clientLogado()){
			$arr_menu = sql_array("SELECT * FROM ".$GLOBALS['tab76']." WHERE `pai`='21' AND ".compleDelete()." ORDER BY ordenar ASC",'nome','url');
			$urlLinkArea = buscaValorDb($GLOBALS['tab76'],'id',21,'url');
			if($opc==1){
				if(queta_option('tema_front')=='lift'){
					$li_menu 		.= '<li><a href="/account/sair" class="button button__header button__header-border d-none d-md-block">Sair</a></li>';
					if(Url::getURL(0)!='area-do-aluno')
					$li_menu 		.= '<li><a href="/area-do-aluno" class="button button__header button__header-background btn-navbar">Área do aluno</a></li>';
				}else{
					$li_menu          .= $this->pnCategoriasTopo($config);
					$tem = '<li class="drop-down">
											  <a href="#" ><i class="fa fa-user-circle-o fa-2x" aria-hidden="true"></i> <b class="caret"></b></a>
											  <ul class="">{dp_conteudo}</ul>
							</li>';
			$tem2 = '<li><a href="{href}">{label}</a></li>';

						$dp_conteudo .= str_replace('{href}','/area-do-aluno',$tem2);
						$dp_conteudo = str_replace('{label}','Painel',$dp_conteudo);
					foreach($arr_menu As $key=>$val){
						$href 	= queta_option('dominio_site').'/'.$urlLinkArea.'/'.$key;
						//$dp_conteudo .= '<li><a href="'.$href.'">'.$val.'</a></li>';
						$dp_conteudo .= str_replace('{href}',$href,$tem2);
						$dp_conteudo = str_replace('{label}',$val,$dp_conteudo);
					}

					$dp_conteudo .= str_replace('{href}','/account/sair',$tem2);
					$dp_conteudo = str_replace('{label}','Sair',$dp_conteudo);
					$li_menu    .= str_replace('{dp_conteudo}',$dp_conteudo,$tem);
				}
			}
			if($opc==2){
				$temaHTML 	= explode('<!--separa--->',carregaArquivo($this->pastaTema().'/area_do_aluno_menu.html'));
				$tema1 = $temaHTML[0];
				$tema2 = $temaHTML[1];
				$li=false;
				if(Url::getURL(nivel_url_site()+1)==NULL){
						$active = 'active';
				}else{
						$active = false;
				}
				$href 	= queta_option('dominio_site').'/'.$urlLinkArea;
				$menu 	= 'Painel';
				$li0 = str_replace('{href_link}',$href,$tema2);
				$li0 = str_replace('{nome_menu}',$menu,$li0);
				$li0 = str_replace('{active}',$active,$li0);
				$li .= $li0;
				foreach($arr_menu As $key=>$val){
					$href 	= queta_option('dominio_site').'/'.$urlLinkArea.'/'.$key;
					$menu 	= $val;
					if(Url::getURL(nivel_url_site()+1)==$key){
						$active = 'active';
					}else{
						$active = false;
					}
					$li0 = str_replace('{href_link}',$href,$tema2);
					$li0 = str_replace('{nome_menu}',$menu,$li0);
					$li0 = str_replace('{active}',$active,$li0);
					$li .= $li0;
				}
				$li_menu = str_replace('{li}',$li,$tema1);
			}
		}else{

			if($opc==1){
					if(queta_option('tema_front')!='lift'){
						$li_menu      .= $this->pnCategoriasTopo($config);
					}
					if(isAero()){
						$li_menu 		.= '<li><a href="/account/login" class="btn btn-outline-primary button button__header button__header-background btn-navbar">Área do Aluno</a></li>';
						//$li_menu 		.= '<li><a href="/account/register" class="btn btn-primary button button__header button__header-background btn-navbar ">Cadastrar</a></li>';
					}else{
						$li_menu 		.= '<li><a href="/account/login" class="button button__header button__header-border">Entrar</a></li>';
						$li_menu 		.= '<li><a href="/account/register" class="btn btn-primary button button__header button__header-background btn-navbar ">Cadastrar</a></li>';
					}
			}
		}
		return $li_menu;
	}
	private function pnCategoriasTopo($config=false){
		$ret = false;
		$tema1 = '
		<li class="drop-down"><a href="#">Categorias</a>
                        <ul>
							{li}
                        </ul>
        </li>
		';
		$tema2 = '<li><a href="{href}">{label}</a></li>';
		$sql = "SELECT * FROM ".$GLOBALS['tab9']." WHERE ativo = 's' AND pai='0' AND ".compleDelete()." ORDER BY ordenar ASC";
		$dados = buscaValoresDb($sql);
		if($dados){
			$li = false;
			foreach($dados As $ke=>$vl){
				$li .= str_replace('{label}',ucfirst($vl['nome']),$tema2);
				$li = str_replace('{href}','/cursos/'.$vl['url'],$li);
			}
			$ret = str_replace('{li}',$li,$tema1);
		}
		return $ret;
	}
	private function carregaJsModulos($nome_modulo=false,$opc=1){
		// $version = queta_option_server('version')?queta_option_server('version'):'1.0.0';
		$version = Q_VERSION;
		if($version){
			$version = '?ver='.$version;
		}
		if($opc==1){
			$local_modulo = queta_option('urlroot').'admin/app/'.$nome_modulo.'/js_front.js';
			$url = RAIZ.'/app/'.$nome_modulo.'/js_front.js'.$version;
		}
		$ret = false;
		if($url && file_exists($local_modulo)){
			$ret = '<script type="text/javascript" src="'.$url.'"></script>';
		}
		return $ret;
	}
	private function carregaCssListaMod($opc=1){
		global $tab42;
		if($opc==1){
			$campo = 'nome';
		}else{
			$campo = 'pasta';
		}
		$urlModulos = "SELECT $campo FROM $tab42 WHERE ativo = 's' AND func_auto = 's'";
		$dados = buscaValoresDb_SERVER($urlModulos);
		$ret = false;
		//print_r($dados);
		if($dados){
			for($i=0;$i<count($dados);$i++){
				$ret .= carregaCssModulos($dados[$i][$campo],$opc);
			}
		}
		return $ret;
	}
	private function carregaJsListaMod($opc=1){
		global $tab42;
		if($opc==1){
			$campo = 'nome';
		}else{
			$campo = 'pasta';
		}
		$urlModulos = "SELECT $campo FROM $tab42 WHERE ativo = 's' AND func_auto = 's'";
		$dados = buscaValoresDb_SERVER($urlModulos);
		$ret = false;
		//print_r($dados);
		if($dados){
			for($i=0;$i<count($dados);$i++){
				$ret .= $this->carregaJsModulos($dados[$i][$campo],$opc);
			}
			$ret .= ' <script>$(document).ready(function(){$(\'.venobox\').venobox();});</script>';
		}
		return $ret;
	}
	public function body($config=false){
		$ret = false;
		$arquivo = $this->pastaTema().'/body.html';
		$value_src = false;
		$temaHTML 	= carregaArquivo($arquivo);
		$version = queta_option_server('version')?queta_option_server('version'):'1.0.0';
		if($version){
			$version = '?ver='.$version;
		}

        $tags_body_top = short_code('tags_body_top');
		$tags_body_footer = short_code('tags_body_footer');
		/**area tags_code */
		$conf_code = isset($_REQUEST['config'])?$_REQUEST['config']:false;
		if($conf_code)
		{
			$arr_conf_code = lib_json_array($conf_code);
			$tags_body_top .= @$arr_conf_code['tag_body_top'];
			$tags_body_footer .= @$arr_conf_code['tag_body_footer'];
		}

		$dadosEmpresa = buscaValoresDb_SERVER("SELECT * FROM ".$GLOBALS['contas_usuarios']." WHERE token='".$_SESSION[SUF_SYS]['token_conta'.SUF_SYS]."'");
		if($dadosEmpresa){
			$endereco_empresa = $dadosEmpresa[0]['endereco'].', '.$dadosEmpresa[0]['numero'].' '.$dadosEmpresa[0]['complemento'];
			$cidade_empresa = $dadosEmpresa[0]['cidade'].' '.$dadosEmpresa[0]['uf'];
			$pais_empresa = $dadosEmpresa[0]['pais'];
			$telefone_empresa = $dadosEmpresa[0]['celular'].' '.$dadosEmpresa[0]['telefone'];
			$email_empresa = $dadosEmpresa[0]['email'];
			$celular_empresa = $dadosEmpresa[0]['celular'];
			$celular_zap = str_replace('(','',$dadosEmpresa[0]['celular']);
			$celular_zap = str_replace(')','',$celular_zap);
			$celular_zap = str_replace('-','',$celular_zap);
			$celular_zap = '55'.$celular_zap;
		}else{
			$endereco_empresa = false;
			$cidade_empresa = false;
			$pais_empresa = false;
			$telefone_empresa = false;
			$email_empresa = false;
			$celular_empresa = false;
			$celular_zap = false;
		}
		// if(isset($_GET['te'])){
		// 	dd(short_code('logo_site_ead'));
		// }
		$ret 				= str_replace('{url_principal}',$this->urPrincipal,$temaHTML);
		$ret 				= str_replace('{logo}',short_code('logo_site_ead'),$ret);
		$ret 				= str_replace('{logo_footer}',short_code('logo_footer'),$ret);
		$ret 				= str_replace('{slogan_footer}',short_code('slogan_footer'),$ret);
		if(isset($_GET['src']) && !empty($_GET['src'])){
			$_GET['src'] = strip_tags($_GET['src']);
			$value_src = $_GET['src'];
		}
		$ret 				= str_replace('{value_src}',$value_src,$ret);
		$ret 				= str_replace('{url_baner_pagina}',@$_REQUEST['url_banner'][0]['url'],$ret);
		$ret			 	= str_replace('{url_dominio}','/',$ret);
		$ret 				= str_replace('{endereco_empresa}',$endereco_empresa,$ret);
		$ret 				= str_replace('{cidade_empresa}',$cidade_empresa,$ret);
		$ret 				= str_replace('{celular_empresa}',$celular_empresa,$ret);
		$ret 				= str_replace('{celular_zap}',$celular_zap,$ret);
		$ret 				= str_replace('{pais_empresa}',$pais_empresa,$ret);
		$ret 				= str_replace('{telefone_empresa}',$telefone_empresa,$ret);
		$ret 				= str_replace('{email_empresa}',$email_empresa,$ret);
		$ret 				= str_replace('{qrcodezap_rodape}',short_code('qrcodezap_rodape'),$ret);
		$ret				= str_replace('{{alertaTop}}',$this->alertaTop($_REQUEST),$ret);
		$ret 				= str_replace('{version}',$version,$ret);
		$dadoEmpesa = buscaValoresDb_SERVER("SELECT * FROM contas_usuarios WHERE token='".$_SESSION[SUF_SYS]['token_conta'.SUF_SYS]."'");
		$ret = str_replace('{nome-empresa}',$dadoEmpesa[0]['nome'],$ret);
		$ret = str_replace('{endereco-empresa}',$dadoEmpesa[0]['endereco'] .' '.$dadoEmpesa[0]['numero'].' '.$dadoEmpesa[0]['complemento'],$ret);
		$ret = str_replace('{email-empresa}',$dadoEmpesa[0]['email'],$ret);
		if(!empty($dadoEmpesa[0]['telefone'])){
			$telefone = '<i class="fa fa-phone"></i> <a href="tel:'.$dadoEmpesa[0]['telefone'].'">'.$dadoEmpesa[0]['telefone'].'</a>';
		}else{
			$telefone = false;
		}
		if(!empty($dadoEmpesa[0]['celular'])){
			$celular = '<i class="fa fa-whatsapp"></i> <a href="tel:'.$dadoEmpesa[0]['celular'].'">'.$dadoEmpesa[0]['celular'].'</a>';
		}else{
			$celular = false;
		}
		$ret = str_replace('{telefone-empresa}',$telefone,$ret);
		$ret = str_replace('{celular-empresa}',$celular,$ret);

		//print_r($dadosEmpresa);
		$activeI = false;
		$activeC = false;
		if(Url::getURL(nivel_url_site())==NULL){
			$activeI = 'active';
		}
		if(Url::getURL(nivel_url_site())=='cursos'){
			$activeC = 'active';
		}
		$li_menu 		= '<li class="'.$activeI.'"><a href="/" class="button button__header d-none d-md-block">Início</a></li>';
		$li_menu 		.= '<li class="'.$activeC.'"><a href="/cursos" class="button button__header d-none d-md-block">Cursos</a></li>';
		$li_menu		.= $this->menuPainelNav($config);

		//$li_menu_footer 		= '<li class="'.$activeI.'"><a href="/" class="btn btn-default">Início</a></li>';
		$li_menu_footer 		= '<li class="'.$activeC.'"><a href="/cursos">Cursos</a></li>';
		$li_menu_atendimento 		= '<li class="'.$activeC.'"><a href="/atendimento">Fale conosco</a></li>';
		$dadosTipoPg2 = dados_tab($GLOBALS['tab76'],'url,id,nome',"WHERE tipo='2' AND ativo = 's'");
		if($dadosTipoPg2){
			foreach($dadosTipoPg2 As $key=>$val){
				$li_menu_footer 		.= '<li><a href="/'.$val['url'].'">'.$val['nome'].'</a></li>';
			}
		}

		$menu_omite = false;
		if(Url::getURL(nivel_url_site())=='iframe'){
			$li_menu = false;
			$menu_omite = '<script>jQuery(function(){ jQuery(\'header,footer,.mobile-nav-toggle\').hide();});</script>';
		}
		//$curso 				= str_replace('{li_menu}',$li_menu,$ret);
		$ret 				= str_replace('{li_menu}',$li_menu,$ret);
		$ret 				= str_replace('{li_menu_footer}',$li_menu_footer,$ret);
		$ret 				= str_replace('{li_menu_atendimento}',$li_menu_atendimento,$ret);

		if(Url::getURL(nivel_url_site()+3)!=NULL){
			$intro = '<style>#main{margin-top:82px}</style>';
		}elseif(Url::getURL(nivel_url_site()+1)!=NULL){
			$intro = '<style>#main{margin-top:32px}</style>';
		}else{
			$intro = false;
		}

		//print_r(Url::getURL(nivel_url_site()));
		//exit;
		//$preload 		= '<div id="preload" style="display:none"></div>';
		$preload 		= '<div id="preload" style="display:none"><div class="lds-ring"><div></div><div></div><div></div><div></div></div></div>';
		// $version = queta_option_server('version')?queta_option_server('version'):'1.0.0';
		$version = Q_VERSION;
		if($version){
			$version = '?ver='.$version;
		}

		$siteContent =false;
		$js 				= '<raiz style="display:none;">'.RAIZ.'</raiz>';
		$js 				.= '<script src="'.RAIZ.'/js/jquery.maskMoney.js"></script>';
		$js					.= $this->carregaJsListaMod();
		$js 				.= '<script src="'.RAIZ.'/js/js.js'.$version.'"></script>';
		$js 				.= '<script src="'.RAIZ.'/app/jscolor/js.js"></script>';
		$js 				.= '<script src="'.RAIZ.'/js/bootstrap-datepicker.min.js"></script>';
		$js 				.= '<script src="'.RAIZ.'/tema/smart_admin/js/plugin/masked-input/jquery.maskedinput.min.js"></script>';
		$js 				.= '<script src="'.RAIZ.'/tema/smart_admin/js/plugin/jquery-validate/jquery.validate.min.js"></script>';
		if(Url::getURL(0)!='area-do-aluno' && Url::getURL(nivel_url_site())!='account'  && Url::getURL(nivel_url_site()+3)!='iniciar-curso' && Url::getURL(nivel_url_site()+3)!= 'comprar'){
			$addThis = queta_option('addThis')?queta_option('addThis'): 's';
			if($addThis=='s'){
				$js .= '<!-- Go to www.addthis.com/dashboard to customize your tools --><script type="text/javascript" src="//s7.addthis.com/js/300/addthis_widget.js#pubid=ra-5f223649e9d63c2d"></script>';
			}

		}
		$js					.= $menu_omite;
		//$js					.= '<script>$(function(){lib_submitConsultaSite();});</script>';
		$siteContent = $preload;
		$siteContent		.= $this->siteContent($config);
		$siteContent 		= shortCode_html($siteContent);
		$ret 				= str_replace('{site_content}',$siteContent,$ret);
		$ret 				= str_replace('{menu_login}',$this->menu_login($config),$ret);
		$ret 				= str_replace('{intro}',$intro,$ret);
        $ret 				= str_replace('{tags_body_top}',$tags_body_top,$ret);
		$ret 				= str_replace('{tags_body_footer}',$tags_body_footer,$ret);

        $ret 				= str_replace('{js}',$js,$ret);
		$btnWhatsapp = $this->btnWhatsapp(@$_REQUEST['telefoneZap'],@$_REQUEST['mensagemZap'],@$_REQUEST['labelZap']);

		$ret 				= str_replace('{btn_whatsapp}',$btnWhatsapp,$ret);
		// $ret 				= str_replace('{link_whatsapp}',short_code('link_whatsapp'),$ret);
		$link_whatsap = 'https://api.whatsapp.com/send/?phone='.$celular_zap.'&text&type=phone_number&app_absent=0';
		$ret 				= str_replace('{link_whatsapp}',$link_whatsap,$ret);


		return $ret;
	}
	public function btnWhatsapp($telefone=false,$mensagem=false,$label=false){
		$ret = false;
		if(isset($telefone)&&!empty($telefone)){
			$telefone = str_replace('(','',$telefone);
			$telefone = str_replace(')','',$telefone);
			$telefone = str_replace('-','',$telefone);
			$telefone = str_replace(' ','',$telefone);
			$telefone = '55'.$telefone;
			$mensagemZap = $mensagem? $mensagem:false;
			if($label){
				$label = '<div class="lab">'.$label.'</div><div class="arrow"></div>';
			}
			ob_start();
			?>
			<style>
				#btn_wzap {
				  width: 44px;
				  height: 44px;
				  background-color: #47c756;
				  position: fixed;
				  animation-name: wzap;
				  animation-duration: 3s;
				  bottom:15px;
				  right:15px;
				  opacity:1;
				  border-radius:50%;
				  text-align:center;
				  padding-top:3px;
				}
				#btn_wzap .lab{
					position: absolute;
					top: -46px;
					width: 112px;
					background-color: #DB0B0B;
					color: #FFF;
					right: 0;
					border-radius: 4px;
					font-size: 12px;
				}
				#btn_wzap .arrow{
					width: 0;
					height: 0;
					border-style: solid;
					border-width: 9px 7.5px 0 7.5px;
					border-color: #DB0B0B transparent transparent transparent;
					position: absolute;
					top: -10px;
					right: 15px;
					-webkit-user-select: all;
				}
				#btn_wzap a{
				  color:#FFF;
				  font-size:24px;
				}

				@keyframes wzap {
				  from{
					  background-color:blue; right:0px; bottom:15px; opacity:0;border-radius:0%;
				  }
				  to{
					  background-color:#47c756; right:15px; bottom:15px; opacity:1;border-radius:50%;
				  }
				}
				</style>
				<div id="btn_wzap"><?=$label?><a href="https://api.whatsapp.com/send?phone=<?=$telefone?>&text=<?=$mensagemZap?>" target="_blank"><i class="fa fa-whatsapp"></i></a></div>
			<?
			$ret = ob_get_clean();
		}
		return $ret;
	}
	public function array_enc_key($arr_conteudo,$value){
		$ret = false;
		$last_names = array_column($arr_conteudo, 'idItem');
		//print_r($last_names);
		$key = array_search($value,$last_names);
		$ret['key_atual'] = $key;
		$ret['key_prev'] = $ret['key_atual'] -1;
		$ret['key_next'] = $ret['key_atual'] +1;
		$ret['array_atual'] = $arr_conteudo[$ret['key_atual']];
		$ret['array_next'] =@ $arr_conteudo[$ret['key_next']];
		if($ret['key_prev']>=0){
			$ret['array_prev'] = $arr_conteudo[$ret['key_prev']];
		}else{
			$ret['array_prev'] = false;
		}
		return $ret;
	}
	public function array_enc_key2($arr_conteudo,$value){
		$ret = false;
		//$last_names = array_column($arr_conteudo, 'idItem');
		//print_r($last_names);
		$key = @array_search($value,$arr_conteudo);
		$ret['key_atual'] = $key;
		$ret['key_prev'] = $ret['key_atual'] -1;
		$ret['key_next'] = $ret['key_atual'] +1;
		$ret['array_atual'] = $arr_conteudo[$ret['key_atual']];
		$ret['array_next'] =@ $arr_conteudo[$ret['key_next']];
		if($ret['key_prev']>=0){
			$ret['array_prev'] = $arr_conteudo[$ret['key_prev']];
		}else{
			$ret['array_prev'] = false;
		}
		return $ret;
	}
	public function regitroVideoVimeo($confi=false){
		$ret['exec'] = false;
		if($confi['config']){
			$config = $confi['config'];
			$sqlsalv = false;
			$compleSql = " WHERE id_cliente = '".$config['id_cliente']."'  AND  id_matricula = '".$config['id_matricula']."'  AND id_atividade = '".$config['id_atividade']."' ";
			$sql = "SELECT * FROM ".$GLOBALS['tab47']." $compleSql";
			$dados = buscaValoresDb($sql);
			if($dados && isset($confi['data'])){
				$compleUpd = false;
				if(isset($confi['data']['percent']) && $confi['data']['percent']==1){
					$compleUpd = ",concluido='s',progresso='100'";
				}
				$sqlsalv = "UPDATE IGNORE ".$GLOBALS['tab47']." SET `config`='".json_encode($confi['data'])."',`ultimo_acesso`='".$GLOBALS['dtBanco']."' $compleUpd $compleSql";
				$ret['exec'] = salvarAlterar($sqlsalv);
			}
			$ret['dados'] = $dados;
			if(isset($_GET['fq'])){
				$ret['sql'] = $sql;
				$ret['sqlsalv'] = $sqlsalv;
			}
			$ret['config'] = $confi;

		}
		return $ret;
	}
	public function marcarComoAssistida($id_atividade,$token_matricula){
		$ret['exec'] = false;
		if($id_atividade && $token_matricula){
			$dm = dados_tab($GLOBALS['tab12'],'*',"WHERE token='$token_matricula'");
			if($dm){
				$ret['dm'] = $dm;
				$dm = $dm[0];
				$config = [
					'id_matricula' => $dm['id'],
					'id_cliente' => $dm['id_cliente'],
					'id_atividade' => $id_atividade,
					'concluido' => 's',
					// 'data' =>,
				];
				$ret['config'] = $config;
				$ret['data'] = ['percent'=>1];
				$regitroVideoYt = $this->regitroVideoYt($ret);
				$ret['regitroVideoYt'] = $regitroVideoYt;
				if($regitroVideoYt['exec']){
					$ret['exec'] = $regitroVideoYt['exec'];

				}
			}
		}
		return $ret;
	}
	public function regitroVideoYt($confi=false){
		$ret['exec'] = false;
		if(isset($confi['config'])){
			$config = $confi['config'];
			$compleSql = " WHERE id_cliente = '".$config['id_cliente']."'  AND  id_matricula = '".$config['id_matricula']."'  AND id_atividade = '".$config['id_atividade']."' ";
			$sql = "SELECt * FROM ".$GLOBALS['tab47']." $compleSql";
			$dados = buscaValoresDb($sql);
			$ret['dados'] = $dados;
			if($dados && isset($confi['data']['seconds']) && isset($confi['data']['duration'])){
				$compleUpd = false;
				if($confi['data']['seconds']==$confi['data']['duration']){
					$compleUpd = ",concluido='s',progresso='100'";
				}
				$percent = (($confi['data']['seconds']*100)/($confi['data']['duration']))/100;
				$percent = str_replace(',','.',$percent);
				$confi['data']['percent'] = $percent;
				$sqlsalv = "UPDATE ".$GLOBALS['tab47']." SET `config`='".json_encode($confi['data'])."',`ultimo_acesso`='".$GLOBALS['dtBanco']."' $compleUpd $compleSql";
				$ret['exec'] = salvarAlterar($sqlsalv);
			}elseif($dados && isset($config['concluido']) && $config['concluido']=='s'){
				$compleUpd = false;
				// if($confi['data']['seconds']==$confi['data']['duration']){
					$compleUpd = ",concluido='s',progresso='100'";
				// }
				// $percent = (($confi['data']['seconds']*100)/($confi['data']['duration']))/100;
				// $percent = str_replace(',','.',$percent);
				// $confi['data']['percent'] = $percent;
				$sqlsalv = "UPDATE ".$GLOBALS['tab47']." SET `config`='".json_encode($confi['data'])."',`ultimo_acesso`='".$GLOBALS['dtBanco']."' $compleUpd $compleSql";
				$ret['sqlsalv'] = $sqlsalv;
				$ret['exec'] = salvarAlterar($sqlsalv);
			}
			$ret['dados'] 	= $dados;
			$ret['sql'] 	= $sql;
			$ret['config'] 	= $confi;

		}
		return $ret;
	}
	public function resumoCurso($config=false){
		$ret['pontos'] 			= 0;
		$ret['totalProvas'] 	= 0;
		$ret['totalQuestoes'] 	= 0;
		if(isset($config['id_curso'])){
			$conteudo = dados_tab($GLOBALS['tab10'],'conteudo,token',"WHERE id='".$config['id_curso']."' AND ".compleDelete());
			$simbolo = '%';
			$color  = false;
			if(isset($config['id_matricula'])){
			$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
				$temaProgress = isset($temaHTML[11])?$temaHTML[11]:'
				<div class="progress" title="{progress}{simbolo} completo">
					<div class="progress-bar {color}" title="{progress}{simbolo} completo" role="progressbar"  style="width: {progress}{simbolo}" aria-valuenow="{progress}" aria-valuemin="0" aria-valuemax="100">{progress}{simbolo}</div>
				</div>
				';
				$ret['aproveitamento']['pontos_alcancados']	=0;
				$ret['aproveitamento']['pontos_perdidos']	=0;
				$ret['aproveitamento']['certas']			=0;
				$ret['aproveitamento']['erradas']			=0;
				$ret['aproveitamento']['list']				=false;
				$progres_alcancado = str_replace('{progress}',0,$temaProgress);
				$progres_alcancado = str_replace('{simbolo}',$simbolo,$progres_alcancado);
				$progres_alcancado = str_replace('{color}',$color,$progres_alcancado);

				$progres_realizado = str_replace('{progress}',0,$temaProgress);
				$progres_realizado = str_replace('{simbolo}',$simbolo,$progres_realizado);
				$progres_realizado = str_replace('{color}',$color,$progres_realizado);
				$ret['aproveitamento']['porcentagem']['alcancado']  = $progres_alcancado;
				$ret['aproveitamento']['porcentagem']['realizado']	= $progres_realizado;

				$ret['aproveitamento']['progress_bar']['alcancado']= false;
				$ret['aproveitamento']['progress_bar']['realizado']= false;
				$ret['realizado']					       	= 0;
			}
			if(isset($conteudo[0]['conteudo'])){
				$arr_conteudo = lib_json_array($conteudo[0]['conteudo']);
				$tipo_conteudo_ead = 'Prova';
				if(is_array($arr_conteudo)){
					foreach($arr_conteudo As $km=>$vm){
						if(isset($vm['idItem'])&&isset($vm['tab'])){
							$conteudoModulo = dados_tab($vm['tab'],'conteudo',"WHERE id='".$vm['idItem']."'  AND ativo='s' AND ".compleDelete());
							//lib_print($conteudoModulo);exit;
							if(isset($conteudoModulo[0]['conteudo'])){

								$arr_conteudoMod = lib_json_array($conteudoModulo[0]['conteudo']);
								if(is_array($arr_conteudoMod)){
									foreach($arr_conteudoMod As $katv=>$vatv){
										$provas = dados_tab($vatv['tab'],'token,config',"WHERE id='".$vatv['idItem']."' AND (tipo='$tipo_conteudo_ead' OR tipo='Exercicio' ) AND ativo='s' AND ".compleDelete());
										if(!empty($provas[0]['token'])){
											$arr_pontos = $this->valorProva($provas[0]);
											if(isset($arr_pontos['valorProva'])){
												$ret['pontos'] += $arr_pontos['valorProva'];
												$ret['totalProvas']++;
												$ret['totalQuestoes'] += $arr_pontos['totalQuestoes'];
												if(isset($config['id_matricula'])){
													$aprov = dados_tab($GLOBALS['tab47'],'config',"WHERE id_matricula='".$config['id_matricula']."' AND id_atividade='".$vatv['idItem']."' AND tipo='$tipo_conteudo_ead' AND id_curso='".$config['id_curso']."'");
													if($aprov){
														$arr_aprov = lib_json_array($aprov[0]['config']);
														if(is_array($arr_aprov)){
															$ret['aproveitamento']['list']=$arr_aprov;
															foreach($arr_aprov As $kp=>$vp){
																if(isset($vp['respostaCorrecao'])&&isset($vp['pontosQuestao'])){
																	if($vp['respostaCorrecao']=='c'){
																		$ret['aproveitamento']['pontos_alcancados'] += (int)$vp['pontosQuestao'];
																		$ret['aproveitamento']['certas'] ++;
																	}elseif($vp['respostaCorrecao']=='e'){
																		$ret['aproveitamento']['pontos_perdidos'] += (int)$vp['pontosQuestao'];
																		@$ret['aproveitamento']['erradas'] ++;
																	}
																	$ret['realizado']++;
																}
															}
														}
													}
												}
											}

										}
									}
								}
							}
						}
					}
					if(isset($ret['realizado'])&&$ret['totalQuestoes']){
						$realizado = ($ret['realizado']*100)/$ret['totalQuestoes'];
						$ret['aproveitamento']['porcentagem']['realizado']=round($realizado);
						$color_border = 'border-primary';
						$progres_realizado = str_replace('{progress}',$ret['aproveitamento']['porcentagem']['realizado'],$temaProgress);
						$progres_realizado = str_replace('{simbolo}',$simbolo,$progres_realizado);
						$progres_realizado = str_replace('{valor}',$ret['aproveitamento']['porcentagem']['realizado'],$progres_realizado);
						$progres_realizado = str_replace('{label}',__translate('Provas realizadas',true),$progres_realizado);
						$progres_realizado = str_replace('{label_geral}',__translate('Provas realizadas',true),$progres_realizado);
						$progres_realizado = str_replace('{color}',$color,$progres_realizado);
						$progres_realizado = str_replace('{color_border}',$color_border,$progres_realizado);
						$ret['aproveitamento']['progress_bar']['realizado']	= $progres_realizado;

					}
					if($ret['aproveitamento']['pontos_alcancados']&&$ret['pontos']){
						$color_border = 'border-success';
						$alcancado = ($ret['aproveitamento']['pontos_alcancados']*100)/$ret['pontos'];
						$ret['aproveitamento']['porcentagem']['alcancado'] = round($alcancado);
						$progres_alcancado = str_replace('{progress}',$ret['aproveitamento']['porcentagem']['alcancado'],$temaProgress);
						$progres_alcancado = str_replace('{valor}',$ret['aproveitamento']['porcentagem']['alcancado'],$progres_alcancado);
						$progres_alcancado = str_replace('{label}',__translate('Aproveitamento',true),$progres_alcancado);
						$progres_alcancado = str_replace('{label_geral}',__translate('Aproveitamento',true),$progres_alcancado);
						$progres_alcancado = str_replace('{simbolo}',$simbolo,$progres_alcancado);
						$progres_alcancado = str_replace('{color}',$color,$progres_alcancado);
						$progres_alcancado = str_replace('{color_border}',$color_border,$progres_alcancado);
						$ret['aproveitamento']['progress_bar']['alcancado']  = $progres_alcancado;

					}else{
						$ret['aproveitamento']['porcentagem']['alcancado']=0;
					}
				}
			}
			//$confPr['token'] = '5dd3e2bce69f5';
			//$valorProva = $this->valorProva($confPr);
		}
		return $ret;
	}
	public function verificaProgressoAluno($config=false){
		$ret = false;
		$id_matricula = isset($config['id']) ? $config['id'] : false;
		$config['id_cliente'] = isset($config['id_cliente']) ? $config['id_cliente'] : false;
		$config['id_curso'] = isset($config['id_curso']) ? $config['id_curso'] : false;
		if($config['id_cliente'] && $config['id_curso'] && $id_matricula){
			global $tk_conta;
			$ret['progress_bar']=false;
			$ret['progress_bar']=false;
			//Buscar na frequencia o primeiro registro de atividade em que o progresso está menor que 100
			$sql = "SELECT * FROM ".$GLOBALS['tab47']." WHERE `concluido`='s' AND `id_curso`='".$config['id_curso']."' AND `id_cliente`='".$config['id_cliente']."' ORDER BY id DESC Limit 1";
			$dados = buscaValoresDb($sql);
			// dd($config);
			if($dados){
					$temaHTML = explode('<!--separa--->',carregaArquivo($this->pastaTema().'/iniciar_curso_ead.html'));
					$grade = !empty($dados[0]['grade'])?$dados[0]['grade']:false;
					$totalVideosAssistidos = NULL;
					$totalVideos = 0;
					$totalProva = 0;
					$totalExercicio = 0;
					if($grade){
						$arr_grade=json_decode($grade,true);
						if(is_array($arr_grade)){
							// lib_print($arr_grade);
							if(!isset($_SESSION[$id_matricula]['conteudo']['link_parou'])){
								foreach($arr_grade As $kei=>$val){
									$dadosFreq = explode(';',$val);
									$check = totalReg($GLOBALS['tab47'],"WHERE `concluido`='s' AND id_cliente='".$config['id_cliente']."' AND id_matricula='".$dados[0]['id_matricula']."' AND id_atividade='".$dadosFreq[1]."' AND id_modulo='".$dadosFreq[0]."' " );
									if(!$check){
										$link 		= '/lecture/'.base64_encode($dadosFreq[1]).'?mod='.base64_encode($dadosFreq[0]).'';
										$_SESSION[$id_matricula]['conteudo']['link_parou'] = $link;
										$ret['link'] 		= $link;
										break;
									}
								}
							}
							foreach($arr_grade As $ke=>$va){
								$dadosFreq = explode(';',$va);
								// $check = totalReg($GLOBALS['tab47'],"WHERE `concluido`='s' AND id_cliente='".$config['id_cliente']."' AND id_matricula='".$dados[0]['id_matricula']."' AND id_atividade='".$dadosFreq[1]."' AND id_modulo='".$dadosFreq[0]."' " );
								$totalVid = isset($_SESSION[$id_matricula]['conteudo'][$dadosFreq[1]]['totalVid']) ? $_SESSION[$id_matricula]['conteudo'][$dadosFreq[1]]['totalVid'] : totalReg($GLOBALS['tab39'],"WHERE id='".$dadosFreq[1]."' AND tipo='Video'");
								$totalPro = isset($_SESSION[$id_matricula]['conteudo'][$dadosFreq[1]]['totalPro']) ? $_SESSION[$id_matricula]['conteudo'][$dadosFreq[1]]['totalPro'] :  totalReg($GLOBALS['tab39'],"WHERE id='".$dadosFreq[1]."' AND tipo='Prova'");
								$totalExe = isset($_SESSION[$id_matricula]['conteudo'][$dadosFreq[1]]['totalExe']) ? $_SESSION[$id_matricula]['conteudo'][$dadosFreq[1]]['totalExe'] :  totalReg($GLOBALS['tab39'],"WHERE id='".$dadosFreq[1]."' AND tipo='Exercicio'");
								$_SESSION[$id_matricula]['conteudo'][$dadosFreq[1]]['totalVid'] = $totalVid;
								$_SESSION[$id_matricula]['conteudo'][$dadosFreq[1]]['totalPro'] = $totalPro;
								$_SESSION[$id_matricula]['conteudo'][$dadosFreq[1]]['totalExe'] = $totalExe;
								if($totalVid)
									$totalVideos ++;
								if($totalPro)
									$totalProva ++;
								if($totalExe)
									$totalExercicio ++;

							}

							$atividadesRealizadas = totalReg($GLOBALS['tab47'],"WHERE `concluido`='s' AND id_cliente='".$config['id_cliente']."' AND id_matricula='".$dados[0]['id_matricula']."' " );
							$totalVideosAssistidos = totalReg($GLOBALS['tab47'],"WHERE `concluido`='s' AND tipo='Video' AND id_cliente='".$config['id_cliente']."' AND id_matricula='".$dados[0]['id_matricula']."' " );
							$totalProvaAssitidas = totalReg($GLOBALS['tab47'],"WHERE `concluido`='s' AND tipo='Prova' AND id_cliente='".$config['id_cliente']."' AND id_matricula='".$dados[0]['id_matricula']."' " );

							$totalExercicioAssitidos = totalReg($GLOBALS['tab47'],"WHERE `concluido`='s' AND tipo='Exercicio' AND id_cliente='".$config['id_cliente']."' AND id_matricula='".$dados[0]['id_matricula']."' " );

							$ret['totalAtividades'] = count($arr_grade);
							$totalAtividades = (int)$ret['totalAtividades'];
							$ret['atividadesRealizadas'] = $atividadesRealizadas;
							$porcentagem_videos = NULL;
							$porcentagem_provas = NULL;
							$porcentagem_exercicio = NULL;

							if($ret['totalAtividades']>0){
								$dm = dados_tab($GLOBALS['tab12'],'*',"WHERE id='$id_matricula'");
								// $id_cliente = buscaValorDb($GLOBALS['tab12'],'id',$id_matricula,'id_cliente');~
								// $id_cliente = isset($dm[0]['id_cliente']) ? $dm[0]['id_cliente'] : 0;
								$id_curso = isset($dm[0]['id_curso']) ? $dm[0]['id_curso'] : 0;
								$id_turma = isset($dm[0]['id_turma']) ? $dm[0]['id_turma'] : 0;
								$total_atv_cronograma = (new EAD)->total_atividade_cronograma($id_curso,$id_turma);
								$totalAtividades += $total_atv_cronograma;
								$porcentagem = ($atividadesRealizadas * 100)/$totalAtividades;
								$progress = round($porcentagem);

								$porcentagem_videos = ($totalVideosAssistidos * 100)/$totalVideos;
								$progress_videos = round($porcentagem_videos);

								$porcentagem_provas = ($totalProvaAssitidas * 100)/$totalProva;
								$progress_provas = round($porcentagem_provas);
								if($totalExercicio){
									$porcentagem_exercicio = ($totalExercicioAssitidos * 100)/$totalExercicio;
								}else{
									$porcentagem_exercicio = 0;
								}
								$progress_exercicio = round($porcentagem_exercicio);

							}else{
								$progress = 0;
								$progress_videos = 0;
								$progress_provas = 0;
								$progress_provas = 0;
								$progress_exercicio = 0;
							}
							//if(isset($ret['resumoCurso']['aproveitamento']['porcentagem']['alcancado'])){
								//$progress_provas = $ret['resumoCurso']['aproveitamento']['porcentagem']['alcancado'];
							//}
							$color 			= 'bg-danger';
							$color_border 	= 'border-danger';

							$color_videos_bg 			= 'bg-danger';
							$color_videos_border 	= 'border-danger';

							$color_prova_bg 			= 'bg-danger';
							$color_prova_border 	= 'border-danger';
							$token = buscaValorDb($GLOBALS['tab12'],'id',$dados[0]['id_matricula'],'token');
							$_SESSION[$tk_conta]['token_matricula'] = base64_encode($token);
							if($progress==100){
								$color 			= 'bg-success';
								$color_border 	= 'border-success';
								$_SESSION[$tk_conta]['token_matricula'] = base64_encode(buscaValorDb($GLOBALS['tab12'],'id',$dados[0]['id_matricula'],'token'));
							}elseif($progress>=50 && $progress <100){
								$color 			= 'bg-warning';
								$color_border 	= 'border-warning';
							}
							if($progress_videos ==100 || $progress_provas ==100){
								$color_videos_bg 		= 'bg-success';
								$color_videos_border 	= 'border-success';

								$color_prova_bg 		= 'bg-success';
								$color_prova_border 	= 'border-success';
							}elseif(($progress_videos>=50 && $progress_videos <100)||($progress_provas>=50 && $progress_provas <100)){
								$color_videos_bg 			= 'bg-warning';
								$color_videos_border 	= 'border-warning';

								$color_prova_bg 			= 'bg-warning';
								$color_prova_border 	= 'border-warning';
							}
							$ret['link_certificado'] = 'javaScript:void(0);';
							$targetCertificado = 'q-solicit="certificado"';
							$disabledBtnCert = '';
							//$progress = 99;
							$btn_certificado = '<a class="btn btn-primary {disabled}" href="{link_certificado}">'.__translate('Certificado',true).'</a>';
							$configCurso = buscaValorDb($GLOBALS['tab10'],'id',$config['id_curso'],'config');
							if($configCurso&&!empty($configCurso)){
								$arr_confCurso = json_decode($configCurso,true);
								if(isset($arr_confCurso['certificado']['gera']) && $arr_confCurso['certificado']['gera']=='auto'){
									if(isset($arr_confCurso['certificado']['requisito']) && $progress >=$arr_confCurso['certificado']['requisito']){
										if(isset($_SESSION[$tk_conta]['token_matricula'])){
											$ret['link_certificado'] = RAIZ.'/app/gerador_pdf?pg=documento&modelo=NWQ3OThmZmQyNWZlMg==&token_matricula='.$_SESSION[$tk_conta]['token_matricula'];
											$targetCertificado = 'target="_BLANK"';
										}
									}else{
											$targetCertificado = 'disable="disabled"';
											$disabledBtnCert = 'disabled';
									}
								}else{
									$ret['link_certificado'] = 'javaScript:void(0);';
								}
							}else{
								$ret['link_certificado'] = 'javaScript:void(0);';
							}
							$temaProgressFreq = isset($config['temaProgressFreq'])?$config['temaProgressFreq']: '<div class="progress" title="{progress}{simbolo} completo">
							  <div class="progress-bar {color}" title="{progress}{simbolo} completo" role="progressbar"  style="width: {progress}{simbolo}" aria-valuenow="{progress}" aria-valuemin="0" aria-valuemax="100">{progress}{simbolo}</div>
							</div>';
							$tema_progress_bar_geral = isset($temaHTML[11])?$temaHTML[11]: '<div class="progress" title="{progress}% completo">
							  <div class="progress-bar {color}" title="{progress}{simbolo} completo" role="progressbar"  style="width: {progress}{simbolo}" aria-valuenow="{progress}" aria-valuemin="0" aria-valuemax="100">{progress}{simbolo}</div>
							</div>';
							if(Url::getURL(3)=='iniciar-curso'){
								$temaBtnCert = isset($config['temaBtnCert'])?$config['temaBtnCert']: '<a href="{link_certificado}" {targetCertificado} title="Certificado.." token="{token}" class="btn btn-secondary {disabledBtnCert}">Certificado</a>';

							}else{
								$temaBtnCert = false;
							}
							$label_bar_geral = __translate('Geral',true);
							$ret['btn_certificado'] = str_replace('{link_certificado}',$ret['link_certificado'],$temaBtnCert);
							$ret['btn_certificado'] = str_replace('{targetCertificado}',$targetCertificado,$ret['btn_certificado']);
							$ret['btn_certificado'] = str_replace('{token}',$token,$ret['btn_certificado']);
							$ret['btn_certificado'] = str_replace('{disabledBtnCert}',$disabledBtnCert,$ret['btn_certificado']);
							$ret['btn_certificado'] = str_replace('{disabledBtnCert}',$disabledBtnCert,$ret['btn_certificado']);

							$ret['progress_bar'] .= str_replace('{progress}',$progress,$temaProgressFreq);
							$ret['progress_bar'] = str_replace('{color}',$color,$ret['progress_bar']);
							$ret['progress_bar'] = str_replace('{token}',$token,$ret['progress_bar']);
							$ret['progress_bar'] = str_replace('{simbolo}','%',$ret['progress_bar']);
							$ret['progress_bar'] = str_replace('{color_border}',$color_border,$ret['progress_bar']);

							$ret['progress_bar_geral'] = str_replace('{progress}',$progress,$tema_progress_bar_geral);
							$ret['progress_bar_geral'] = str_replace('{color}',@$color,$ret['progress_bar_geral']);
							$ret['progress_bar_geral'] = str_replace('{token}',$token,$ret['progress_bar_geral']);
							$ret['progress_bar_geral'] = str_replace('{simbolo}','%',$ret['progress_bar_geral']);
							$ret['progress_bar_geral'] = str_replace('{color_border}',$color_border,$ret['progress_bar_geral']);
							$ret['progress_bar_geral'] = str_replace('{label_geral}',$label_bar_geral,$ret['progress_bar_geral']);

							$label_bar_geral = __translate('Videoaulas',true);
							$ret['progress_bar_videos'] = str_replace('{progress}',$progress_videos,$tema_progress_bar_geral);
							$ret['progress_bar_videos'] = str_replace('{color}',@$color_videos_bg,$ret['progress_bar_videos']);
							$ret['progress_bar_videos'] = str_replace('{token}',$token,$ret['progress_bar_videos']);
							$ret['progress_bar_videos'] = str_replace('{simbolo}','%',$ret['progress_bar_videos']);
							$ret['progress_bar_videos'] = str_replace('{color_border}',$color_videos_border,$ret['progress_bar_videos']);
							$ret['progress_bar_videos'] = str_replace('{label_geral}',$label_bar_geral,$ret['progress_bar_videos']);

							$label_bar_geral = __translate('Provas',true);
							$ret['progress_bar_provas'] = str_replace('{progress}',$progress_provas,$tema_progress_bar_geral);
							$ret['progress_bar_provas'] = str_replace('{color}',@$color_videos,$ret['progress_bar_provas']);
							$ret['progress_bar_provas'] = str_replace('{token}',$token,$ret['progress_bar_provas']);
							$ret['progress_bar_provas'] = str_replace('{simbolo}','%',$ret['progress_bar_provas']);
							$ret['progress_bar_provas'] = str_replace('{color_border}',$color_border,$ret['progress_bar_provas']);
							$ret['progress_bar_provas'] = str_replace('{label_geral}',$label_bar_geral,$ret['progress_bar_provas']);

							 //echo $ret['progress_bar_provas'];
						}
					}
					$ret['atividadeCompleta'] = $dados[0];
					$ret['sqlCom'] = $sql;
			}else{
				$sql = "SELECT * FROM ".$GLOBALS['tab47']." WHERE `concluido`!='s' AND `id_curso`='".$config['id_curso']."' AND `id_cliente`='".$config['id_cliente']."' ORDER BY id ASC Limit 1";
				$dados = buscaValoresDb($sql);
				if($dados){
					$ret['atividadeIncompleta'] = $dados[0];
					$ret['sqlInc'] = $sql;
					$ret['link'] 		= '/lecture/'.base64_encode($dados[0]['id_atividade']).'?mod='.base64_encode($dados[0]['id_modulo']).'';
				}
			}
		}
		// if(isset($_GET['fe1'])){
		// 	dd($ret);
		// }
		return $ret;
	}
	public function painelFaturas($config=false){
		$ret = false;
		if(isset($config['id_cliente']) && $config['id_curso']){
			global $tk_conta;
			//Buscar na frequencia o primeiro registro de atividade em que o progresso está menor que 100
			$ref_compra = isset($config['token'])?$config['token']:false;
			$idCliente = isset($config['id_cliente'])?$config['id_cliente']:false;
			if($ref_compra){
				$comple = "WHERE `id_cliente` = '".$idCliente."' AND ref_compra = '".$ref_compra."'";
			}else{
				$comple = false;
			}
			$sql = "SELECT * FROM ".$GLOBALS['lcf_entradas']." $comple ORDER BY `id` ASC";
			$dados = buscaValoresDb($sql);
			if($dados && $comple){
				$id_matricula = buscaValorDb($GLOBALS['tab12'],'token',$ref_compra,'id');
				$config['sec'] = isset($config['sec'])?$config['sec']:'lcf_entradas';
				$config['compleAjax'] = isset($config['compleAjax'])?$config['compleAjax']:"&local=matri";
				$config['dados_list'] = isset($config['dados_list'])?$config['dados_list'] : encodeArray(array('id_cliente'=>$idCliente,'ref_compra'=>$ref_compra));

				$arr_status = sql_array("SELECT * FROM status ORDER BY id DESC",'nome','abv');
				$tema = '
					<raiz_lis style="display:none;">'.RAIZ.'</raiz_lis>
					<style>
						#list_contas{
							width:100%;
						}
						[ct-dbclick="true"]{
							cursor:pointer;
						}
					</style>
					<div class="table-responsive">
					<table class="table table-hover table-sm" id="list_contas">
						<thead class="jss507">
							<tr class="jss508 jss511">';
							$tema .= '
								<th class="jss513 jss514 jss520 hidden-print" style="width:1%">
									<div>Status</div>
								</th>
								<!--<th class="jss513" style="width:5%"><div>Id</div></th>-->
								<th class="jss513" style="width:5%"><div>Vencimento</div></th>
								<th class="jss513" style="width:35%"><div>Descrição</div></th>
								<!--<th class="jss513" scope="col"><div>Pago</div></th>-->
								<th class="jss513" style="width:5%"><div>Valor</div></th>';
					$tema .='<th class="jss513 hidden-print"  style="width:10%"><div align="center">Ação</div></th>
								<th class="jss513" style="width:1%"><div>Pagamento</div></th>
							</tr>
						</thead>
						<tbody class="jss526">{{table}}
						</tbody>
					</table>
					</div>
					<script>
						function acaoEditV(id,acao,sec){
							var sec  = sec;
							var idalt = id;
							var dados = jQuery(\'#dados_list\'+sec).html();
							var tab = \'lcf_entradas\';
							jqaddPd(\''.RAIZ.'/app/lcf/acao.php?ajax=s&dados_list=\'+dados+\'&id=\'+idalt+\'&sec=\'+sec+\'&tab=\'+btoa(tab)+\'&acao=\'+acao+\'&opc=form_lancamentos\',\'exibe_formulario\');
							jQuery(\'#myModal\').modal(\'show\');
						}
						function pagarContaLoc(tab,form,opc_pag){
								$.ajax({
											url: \''.RAIZ.'/app/lcf/acao.php?ajax=s&opc=pagar&pago=s&sec='.$config['sec'].$config['compleAjax'].'&opc_pag=\'+opc_pag+\'&tab=\'+btoa(tab)+\'&acao=alt\',
											type: \'GET\',
											beforeSend: function(){
												jQuery(\'#preload\').fadeIn();
											},
											data: jQuery(form).serialize(),
											async: true,
											dataType: "json",
											success: function(response) {
												jQuery(\'#preload\').fadeOut();
												jQuery(\'.mens\').html(response.mens);
												if(response.exec){
													if(response.list){
														//jQuery(\'#exibe_lacamentos\').html(response.list.table);
														jQuery(\'#exibe_list_faturas\').html(response.list);
														recibo();
														';
													$tema  .= '
													}
													var btn_press = jQuery(\'#btn-ac\').html();
													if(btn_press==\'finalizar\'){
														jQuery(\'#myModal\').modal(\'hide\');
													}
												}
											},
											error: function(error){
												jQuery(\'#preload\').fadeOut();
												alert(error);
											}
								});
						}
						jQuery(document).ready(function() {
							recibo();
							jQuery(\'[quet-ac="pagar"]\').on(\'click\',function(){
									var idalt = jQuery(this).attr(\'quet-id\');
									var tab = jQuery(this).data(\'tipo\');
									tab = \'lcf_\'+tab+\'s\';
									jQuery(\'#modal_delete\').modal(\'show\');
									jqaddPd(\''.RAIZ.'/app/lcf/acao.php?ajax=s&id=\'+idalt+\'&dados_list='.$config['dados_list'].'&tab=\'+btoa(tab)+\'&sec='.$config['sec'].'&opc=painelPagamento\',\'cont_modal_delete\');
							});
					';
						$regi_por_pg = 4;
					if(count($dados) > 13){
					$tema .= '
							jQuery("#list_contas").DataTable( {
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
					$arr_status = sql_array("SELECT * FROM status ORDER BY id DESC",'nome','abv');
					foreach($dados As $kei=>$valo){
						if($valo['conta'] == 2){
							$sec = 'lcf_caixa';
						}else{
							$sec = 'lcf_entradas';
						}
						if($valo['local'] == 'matri' && !empty($valo['ref_compra']) && $valo['categoria'] == $GLOBALS['categoriaMensalidade']){
							$iconBt = '<i class="fa fa-pencil"></i>';
							$acaoAb = 'alt';
						}else{
							$iconBt = '<i class="fa fa-eye"></i>';
							$acaoAb = 'view';
						}
						$btAcao = false;
						$statusPag = statusPag($valo);
						if($valo['pago']=='s'){
							$btAcao = '<button type="button" quet-ac="recibo_matricula" que-id_matricula="'.@$id_matricula.'" que-id="'.$valo['id'].'" class="btn btn-light" title="'.__translate('Imprimir recibo',true).'"><i class="fa fa-print"></i></button>';
						}else{
							if(!empty($valo['reg_asaas'])){
								$reg_asaas = json_decode($valo['reg_asaas'],true);
								if(isset($reg_asaas['bankSlipUrl']) && !empty($reg_asaas['bankSlipUrl']))
								$btAcao .= '<a href="'.$reg_asaas['bankSlipUrl'].'" target="_BLANK" class="btn btn-light" title="Imprimir boleto"><i class="fa fa-barcode"></i></a>';
							}
						}
						//$btAcao .= $statusPag['bt_pagar'];
						//$btAcao .= '<button type="button" data-tipo="'.$valo['tipo'].'" onclick="acaoEditV(\''.$valo['id'].'\',\''.$acaoAb.'\',\''.$sec.'\')" class="btn btn-default" title="'.__translate('Editar fatura',true).'">'.$iconBt.'</button>';

						$tr .= '<tr quet-id="'.$valo['id'].'" data-tipo="'.$valo['tipo'].'" quet-sec="'.$sec.'" ct-dbclick="true" ondblclick="acaoEditV(\''.$valo['id'].'\',\''.$acaoAb.'\',\''.$sec.'\')">';
						$dt_pagamento = false;
						if($valo['pago']=='s'){
							$dt_pagamento = dataExibe($valo['data_pagamento']);
						}
						$descricao = str_replace('<span class="hidden-screen">'.zerofill($config['id'],6).'</span>','',$valo['descricao']);
						$descricao = strip_tags($descricao);
						$descricao = str_replace('N: '.zerofill($config['id'],6).'','',$descricao);
						$tr .= '
									<td class="jss513 jss515 jss520 hidden-print ">
										<div class="status-div">
											'.$statusPag['pago'].'
										</div>
									</td>
									<!--<td class="jss513 jss515 jss520" title="Dois cliques para ver detalhes">'.$valo['id'].'</td>-->
									<td class="jss513 jss515 jss520 color-valor" title="Dois cliques para ver detalhes">'.dataExibe($valo['vencimento']).'</td>
									<td class="jss513 jss515 jss520 color-valor">'.$descricao.'</td>
									<td class="jss513 jss515 jss520 color-valor" title="Dois cliques para ver detalhes">'.number_format($valo['valor'],'2',',','.').'</td>
									';
						$tr .= '	<td class="jss513 jss515 jss520 color-valor hidden-print"><div align="right"> '.$btAcao.'</div></td>
									<td class="jss513 jss515 jss520 color-valor" title="Dois cliques para ver detalhes">'.$dt_pagamento.'</td>
								</tr>
						';
					}
				}
				$ret = str_replace('{{table}}',$tr,$tema);
				$ret .= modalBootstrap2($titulo='Cadastro de receitas',$bt_fechar=false,'exibe_formulario',$id='myModal',$tam='modal-xl');
				$ret .= modalBootstrap2($titulo=false,$fechar=false,'cont_modal_delete',$id='modal_delete',$tam='modal-xs');
			}
		}
		//print_r($ret);
		return $ret;
	}

	public function contrato($config=false){
		$ret = false;global $tk_conta;
		//$frmPendenciasContrato = $this->frmPendenciasContrato($config);
		//$ret = $frmPendenciasContrato['html'];
		$config['acao']='alt';
		$verificaAlunoMatricula = verificaAlunoMatricula($_SESSION[$tk_conta]['dados_cliente'.SUF_SYS]['id'],$local='contrato');
		// $stepTab = '
		// <div class="col-md-12 text-center" align="center">
		// 	<ul class="nav nav-pills">
		// 		  <li class="nav-item">
		// 			<a class="nav-link disabled" href="#">'.__translate('1 - Matrícula',true).'</a>
		// 		  </li>
		// 		  <li class="nav-item">
		// 			<a class="nav-link active" href="#">'.__translate('2 - Contrato',true).'</a>
		// 		  </li>
		// 		  <li class="nav-item">
		// 			<a class="nav-link" href="#">'.__translate('3 - Iniciar curso',true).'</a>
		// 		  </li>
		// 	</ul>
		// </div>
		// ';
		$conteudo = '';//$stepTab;
		$conteudo .= '<div class="col-md-12">'.$verificaAlunoMatricula['mens'];
		$conteudo .= $this->frm_editPerfil($config).'</div>';
		$arquivo = $this->pastaTema().'/layout_pagina.html';
		$tema 	= carregaArquivo($arquivo);
		$ret = str_replace('{grade_cursos}',$conteudo,$tema);
		return $ret;
	}
	public function frmPendenciasContrato($config){
		global $tk_conta;
		$ret = false;
		$ret['html']=false;
		if(!is_clientLogado()){
			return $ret;
		}
		$dadosMatricula = dados_tab($GLOBALS['tab12'],'*',"WHERE id='".$config['id_matricula']."' AND ".compleDelete());
		$config = $_SESSION[$tk_conta]['dados_cliente'.SUF_SYS];
		$config['acao'] = isset($config['acao'])?$config['acao']:'alt';
		//print_r($dadosMatricula);
		$ret['html'] = '
		<style>
			.legendStyle{
				font-size:1.0rem;
			}
			fieldset{
				border:solid 1px #eeeeee
			}
		</style>

		';
		$ret['html'] .= '<style>';
		$ret['html'] .= '<div class="row">';
		$ret['html'] .= '<div class="col-md-12 padding-none">';
		$ret['html'] .= '<form id="frmPendenciasContrato">';
		//$config['campos_form'][0] = array('type'=>'email','col'=>'md','size'=>'12','campos'=>'Email-email*-','value'=>@$config['Email'],'css'=>false,'event'=>'que-em '.$disableEmail. ' required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_pr'][1] = array('type'=>'text','col'=>'md','size'=>'5','campos'=>'Nome-Primeiro nome*-','value'=>@$config['Nome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_pr'][2] = array('type'=>'text','col'=>'md','size'=>'6','campos'=>'sobrenome-Sobrenome*-','value'=>@$config['sobrenome'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_pr'][3] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Celular-celular*-','value'=>@$config['Celular'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_pr'][6] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'DtNasc2-D. Nascimento-','value'=>@$config['DtNasc2'],'css'=>false,'event'=>' required data-lng="pt"','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_pr'][7] = array('type'=>'text','col'=>'md','size'=>'3','campos'=>'Ident-D. Identidade-','value'=>@$config['Ident'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							//$config['campos_form_pr'][4] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Cpf-Cpf*-','value'=>@$config['Cpf'],'css'=>false,'event'=>'required '.$disableEmail,'clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_se'][1] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Cep-CEP*-','value'=>@$config['Cep'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_se'][2] = array('type'=>'text','col'=>'md','size'=>'9','campos'=>'Endereco-Endereço*-','value'=>@$config['Endereco'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_se'][3] = array('type'=>'text','col'=>'md','size'=>'2','campos'=>'Numero-N.°*-','value'=>@$config['Numero'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_se'][6] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Bairro-Bairro*-','value'=>@$config['Bairro'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$config['campos_form_se'][7] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Cidade-Cidade*-','value'=>@$config['Cidade'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							//$config['campos_form_se'][8] = array('type'=>'text','col'=>'md','size'=>'12','campos'=>'Celular-Celular*-','value'=>@$config['Celular'],'css'=>false,'event'=>'required','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							//$config['campos_form'][1] = array('type'=>'textarea','size'=>'6','campos'=>'dados[cab][descricao]-Descrição ','value'=>@$_GET['descricao'],'css'=>false,'event'=>'','clrw'=>false,'obs'=>false,'outros'=>false,'class'=>false,'title'=>false);
							$informacoes = formCampos($config['campos_form_pr']);
							//$ret .= formCampos($config['campos_form_pr']);
							//$ret .= formCampos($config['campos_form_se']);
		//$informacoes = '<div class="col-sm-12"><label><input '.$checkboxExge_turma.' type="checkbox" name="dados[cab][config][exigir_turma]" value="s"> Vender somente com turma disponível</label></div>';
		$configPainelnfo = array('titulo'=>'Informações','conteudo'=>$informacoes,'id'=>'dadosInf','in'=>'show','div_select'=>'dadosInf','condiRight'=>false,'tam'=>'12 painel-pn-inf');
		$ret['html'] .= lib_painelCollapse($configPainelnfo);
		$ret['html'] .= '<div class="col-md-12"><button type="submit" class="btn btn-outline-secondary">Salvar</button></div>';
		//$ret .= queta_formfield4("hidden",'1',"token-", @uniqid(),"","");
							$ret['html'] .= queta_formfield4("hidden",'1',"conf-", 's',"","");
							$ret['html'] .= queta_formfield4("hidden",'1',"campo_bus-", 'Email',"","");
							$ret['html'] .= queta_formfield4("hidden",'1',"permissao-", '1',"","");
							$ret['html'] .= queta_formfield4("hidden",'1',"ac-", $config['acao'],"","");
							$ret['html'] .= queta_formfield4("hidden",'1',"id-", $config['id'],"","");
							$ret['html'] .= queta_formfield4("hidden",'1',"EscolhaDoc-", 'CPF',"","");
							$ret['html'] .= queta_formfield4("hidden",'1',"sec-", 'cad_clientes_site',"","");
							//$ret['html'] .= queta_formfield4("hidden",'1',"pg-", $config['pg'],"","");
							$ret['html'] .= queta_formfield4("hidden",'1',"tab-", base64_encode($GLOBALS['tab15']),"","");
		$ret['html'] .= '</form>';
		$ret['html'] .= '
			<script>
				jQuery(document).ready(function () {
					var icon = \'\';
					jQuery(\'[id="Celular"]\').mask(\'(99)99999-9999\');
					jQuery(\'[id="Cpf"]\').mask(\'999.999.999-99\');
					jQuery(\'[id="Cep"]\').mask(\'99999-999\');
					';
		$ret['html'] .= 'jQuery(\'#frmPendenciasContrato\').validate({
							submitHandler: function(form) {
								$.ajax({
									url: \''.RAIZ.'/app/clientes/acao.php?ajax=s&acao='.$config['acao'].'&campo_bus=Email\',
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
										if(response.exec){
											//window.location = \''.queta_option('dominio_site').'\';

											/*if(response.list){
												jQuery(\'#exibe_list\').html(response.list);
												jQuery("#myModal2").modal("hide");
											}*/

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
								},Cpf: {
									cpf: true
								}
							},
							messages: {
								nome: {
									required: icon+" '.__translate('Por favor preencher este campo',true).'"
								},Cpf: {
									required: icon+" '.__translate('Por favor preencher este campo',true).'"
								}
							}
					});
				});
			</script>';
		$ret['html'] .= '</div>';
		$ret['html'] .= '</div>';
		return $ret;
	}
	public function testeFront($config=false){
		$ret = false;
		$ret = carregaArquivo($this->pastaTema().'/teste.html');

		//$ret = ob_get_clean();
		return $ret;
	}
	public function gravaVarSessaoOrigem($origem=false){
		$ret = false;
		if($origem && TK_CONTA){
			$_SESSION[SUF_SYS][TK_CONTA]['origem'] = $origem;
			$ret = true;
		}
		return $ret;
	}
}
