<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AeronavesSeeder extends Seeder
{
	/**
	 * Insere ou atualiza uma aeronave ajustando o payload ao schema atual.
	 *
	 * - Remove campos obsoletos: 'data', 'atualizado', 'sociedade'.
	 * - Garante que 'autor' seja persistido como string (big string).
	 * - Converte 'ordenar' para inteiro.
	 * - Normaliza 'hora_rescisao' para decimal válido ou null.
	 * - Normaliza JSON: 'config' e 'pacotes' vazios ou inválidos viram null.
	 * - Normaliza enums: 'ativo', 'publicar', 'excluido', 'deletado' inválidos usam default.
	 * - Se 'id' numérico existir: usa updateOrInsert para evitar duplicidade de chave.
	 */
	private function insertAeronave(array $row): void
	{
		// Remover campos fora do schema atual
		unset($row['data'], $row['atualizado'], $row['sociedade']);

		// ID: se não for numérico, remove para usar autoincremento
		if (array_key_exists('id', $row)) {
			if (is_numeric($row['id'])) {
				$row['id'] = (int) $row['id'];
			} else {
				unset($row['id']);
			}
		}

		// Remover placeholders onde o valor é apenas o nome da coluna (com ou sem crase/aspas)
		$keysToNullIfPlaceholder = [
			'autor', 'token', 'ficha', 'url', 'meta_descricao', 'obs', 'descricao',
			'excluido_por', 'deletado_por', 'reg_excluido', 'reg_deletado', 'tipo'
		];
		foreach ($keysToNullIfPlaceholder as $k) {
			if (array_key_exists($k, $row) && is_string($row[$k]) && $this->looksLikePlaceholder($row[$k], $k)) {
				unset($row[$k]);
			}
		}

		// Nome é NOT NULL: se vier placeholder, substituir por string vazia
		if (array_key_exists('nome', $row) && is_string($row['nome']) && $this->looksLikePlaceholder($row['nome'], 'nome')) {
			$row['nome'] = '';
		}

		// Autor como string (big string)
		if (array_key_exists('autor', $row)) {
			$row['autor'] = is_null($row['autor']) ? null : (string) $row['autor'];
		}

		// Ordenar como inteiro, placeholder vira 0
		if (array_key_exists('ordenar', $row)) {
			if (is_string($row['ordenar']) && $this->looksLikePlaceholder($row['ordenar'], 'ordenar')) {
				$row['ordenar'] = 0;
			} else {
				$row['ordenar'] = is_numeric($row['ordenar']) ? (int) $row['ordenar'] : 0;
			}
		} else {
			$row['ordenar'] = 0;
		}

		// hora_rescisao: normalizar para decimal válido ou null
		if (array_key_exists('hora_rescisao', $row)) {
			$v = $row['hora_rescisao'];
			if (is_string($v) && $this->looksLikePlaceholder($v, 'hora_rescisao')) {
				$row['hora_rescisao'] = null;
			} else if (is_string($v)) {
				$normalized = str_replace(',', '.', trim($v));
				if ($normalized === '' || strtolower($normalized) === 'null') {
					$row['hora_rescisao'] = null;
				} else if (is_numeric($normalized)) {
					$row['hora_rescisao'] = number_format((float)$normalized, 2, '.', '');
				} else {
					$row['hora_rescisao'] = null;
				}
			} else if (is_numeric($v)) {
				$row['hora_rescisao'] = number_format((float)$v, 2, '.', '');
			} else {
				$row['hora_rescisao'] = null;
			}
		}

		// Normaliza JSON: config
		if (array_key_exists('config', $row)) {
			$cfg = $row['config'];
			if (!is_string($cfg) || trim($cfg) === '' || !$this->isValidJsonString($cfg)) {
				$row['config'] = null;
			}
		}

		// Normaliza JSON: pacotes
		if (array_key_exists('pacotes', $row)) {
			$pkg = $row['pacotes'];
			if (!is_string($pkg) || trim($pkg) === '' || !$this->isValidJsonString($pkg)) {
				$row['pacotes'] = null;
			}
		}

		// Normaliza enums para valores válidos ('s'|'n'); caso contrário, usa defaults da tabela
		foreach (['ativo' => 's', 'publicar' => 'n', 'excluido' => 'n', 'deletado' => 'n'] as $flag => $default) {
			if (array_key_exists($flag, $row)) {
				$val = is_string($row[$flag]) ? strtolower(trim($row[$flag])) : $row[$flag];
				if ($val !== 's' && $val !== 'n') {
					// Remover para que aplique o default da coluna
					unset($row[$flag]);
				}
			}
		}

		// Inserir ou atualizar evitando duplicidade de PK
		if (array_key_exists('id', $row) && is_int($row['id'])) {
			DB::table('aeronaves')->updateOrInsert(['id' => $row['id']], $row);
		} else {
			DB::table('aeronaves')->insert($row);
		}
	}

	/**
	 * Verifica se uma string é um JSON válido.
	 * Check if given string is valid JSON.
	 */
	private function isValidJsonString($value): bool
	{
		if (!is_string($value)) {
			return false;
		}
		json_decode($value, true);
		return json_last_error() === JSON_ERROR_NONE;
	}

	/**
	 * Detecta se um valor parece ser um placeholder igual ao nome da coluna,
	 * potencialmente envolto por crases/aspas.
	 */
	private function looksLikePlaceholder(mixed $value, string $column): bool
	{
		if (!is_string($value)) {
			return false;
		}
		$trimmed = trim($value);
		$normalized = trim($trimmed, " `\"'\t\n\r");
		return strtolower($normalized) === strtolower($column);
	}
	/**
	 * Run the database seeders.
	 *
	 * @return void
	 */
	public function run()
	{
		$this->insertAeronave([
			'id' => "6",
			'nome' => "Paulistinha",
			'codigo' => "NE56",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\"},\"6\":{\"horas_livre\":\"R$ 500,00\",\"horas_livre_dolar\":\"U$ 96,00\",\"tabela-hora-padao\":\"R$ 900,00\",\"tabela-hora-padao_dolar\":\"U$ 172,81\",\"hora-avulsa\":\"R$ 600,00\",\"hora-avulsa_dolar\":\"U$ 115,21\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "5c2280d606784",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "\r\n                                    Paulistinha\r\n                                    Designativo: NES6-C\r\n                                    Tipo/Missão: treinamento/turismo\r\n                                    Fabricante: Companhia Aeronáutica Paulista\r\n                                    Tribulação: 1 piloto e 1 passageiro\r\n                                    DIMENSÕES:\r\n                                    Comprimento: 6,76m\r\n                                    Largura: 10,76m\r\n                                    Altura: 2,08m\r\n                                    PROPULSÃO:\r\n                                    Motor: Avco Lycoming O - 235 - N24, Lycoming 115 hp\r\n                                    Curabitur nec nunc nec mauris ullamcorper auctor:\r\n                                    Lorem ipsum dolor sit amet, \r\nconsectetur adipiscing elit. Vestibulum non lectus vitae augue congue \r\ndignissim ut nec ligula. Nullam imperdiet pharetra quam at lacinia. \r\nSuspendisse elementum turpis et ipsum pulvinar tempus. Sed facilisis vel\r\n arcu ac hendrerit. Pellentesque tempus convallis orci nec vulputate. \r\nDonec condimentum arcu vel sem commodo, vel facilisis enim varius. \r\nCurabitur vulputate, magna vel porta fermentum, ligula magna consectetur\r\n velit, blandit elementum quam felis iaculis lectus. Etiam posuere eu \r\nnisl eu semper. Donec a lacus sodales tellus rutrum ultricies sed sit \r\namet dui. Morbi pretium accumsan ipsum, eget vulputate neque volutpat \r\nin. Fusce volutpat rhoncus orci et pretium. Nam a lectus venenatis, \r\nvehicula felis venenatis, pellentesque ligula.\r\n",
			'url' => "paulistinha",
			'meta_descricao' => "O Paulistinha CAP-4 é um monomotor de asa alta fabricado pela Companhia Aeronáutica Paulista. Nos modelos CAP-4 e, posteriormente, pela Neiva no modelo P-56 C, é considerado um dos aviões treinadores de maior sucesso no Brasil desde a década de 50, já tendo formado diversas gerações de pilotos de avião.",
			'data' => "2018-12-25",
			'atualizado' => "2023-04-03 08:04:21",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"15\",\"preco_litro\":\"16,30\",\"ativar\":\"s\"},\"video\":\"https://www.youtube.com/watch?v=Zcd2uHMsDcg\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Paulistinha CAP-4 é um monomotor de asa alta fabricado pela Companhia Aeronáutica Paulista. Nos modelos CAP-4 e, posteriormente, pela Neiva no modelo P-56 C, é considerado um dos aviões treinadores de maior sucesso no Brasil desde a década de 50, já tendo formado diversas gerações de pilotos de avião.O Paulistinha CAP-4 é um monomotor a pistão, de asa alta, fabricado pela Companhia Aeronáutica Paulista. Nos modelos CAP-4 e posteriormente pela Neiva no modelo P-56 C, é considerado um dos aviões treinadores de maior sucesso no Brasil, já tendo formado diversas gerações de pilotos. Seu projeto foi coordenado por Romeu Corsini, da USP.Em 1955 a Neiva adquiriu os direitos de fabricação da aeronave, lançando uma versão batizada de Paulistinha 56 ou Neiva 56. A Força Aérea Brasileira operou a versão Neiva desta aeronave entre 1959 e 1967.É um avião monomotor de asa alta semi-cantiléver, de madeira revestida em tela e fuselagem em tubos de aço, também com revestimento em tela, trem de pouso fixo convencional, hélice de passo fixo e acomodação para dois pilotos em tandem.NEIVA PAULISTINHAAeronave homolagada VFR diurnahora avulsa:&nbsp;R$900,00&nbsp;por hora sem combustívelConsumo Horário: 15 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "8",
			'nome' => "Uirapuru T-23",
			'codigo' => "A122",
			'pacotes' => "{\"1\":{\"horas_livre\":\"R$ 299,00\",\"tabela-hora-padao\":\"R$ 882,00\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "5c22876c1ed70",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "uirapuru-t-23",
			'meta_descricao' => "O Uirapuru é um monoplano construído em liga leve, com trem de pouso tipo triciclo e bequilha móvel. Chegou a ser testado pela Força Aérea Brasileira.",
			'data' => "2018-12-25",
			'atualizado' => "2021-09-11 09:09:53",
			'obs' => "",
			'config' => "{\"video\":\"https://www.youtube.com/watch?v=v0bfxpkqfPc\"}",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Aerotec T-23 Uirapuru ou Aerotec 122 é um dos primeiros projetos da Aerotec S.A. estabelecida em 1962 em São José dos Campos, foi um avião biposto com duplo comando para treinamento primário que foi denominado Aerotec A-122 Uirapuru . O Uirapuru é um monoplano construído em liga leve, com trem de pouso tipo triciclo e bequilha móvel.O primeiro protótipo foi equipado com motor a pistão Avco Lycoming 0-235-C1 de 108 hp sendo logo em seguida substituído por um 0-320-A de 150 hp. A Força Aérea Brasileira encomendou inicialmente 30 unidades designando-o T-23 com um motor padrão 0-320-B2B e a produção militar , totalizou 126 unidades, sendo 100 para a FAB, 18 para a Bolívia e mais 8 para o Paraguai, muitos deles ainda em serviço, já a versão civil foram construídas 25 unidades designadas A-122B , quando em 1977 se encerrou a produção, haviam sido fabricadas 155 aeronaves. Em fim dos anos 70, a Aerotec desenvolveu o A-132 Tangará, também avião de treinamento primário baseado no Uirapuru com asas redesenhadas, construção da fuselagem simplificada e novo layout da cabine, mas com o mesmo motor. A Força Aérea Brasileira chegou a testar o modelo mas não fez nenhuma encomenda desse modelo.UIRAPURU T-23Aeronave homolagada VFR diurnahora avulsa: R$962,00 por horaConsumo Horário: 30 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"13/04/2023 20:04:51\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Uirapuru T-23\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "9",
			'nome' => "Aeroboero 180",
			'codigo' => "AB18",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"tabela-promocional\":\"R$ 500,00\",\"tabela-promocional_dolar\":\"U$ 89,68\",\"hora-seca\":\"R$ 550,00\",\"hora-seca_dolar\":\"U$ 101,63\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "137",
			'token' => "5c2289226284d",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "aeroboero-180",
			'meta_descricao' => "O AB-180 é equipado com um motor de 180, que o permite ser usado tanto em vôos de instrução quanto no reboque de planadores.",
			'data' => "2018-12-25",
			'atualizado' => "2024-08-01 15:08:18",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"25\",\"preco_litro\":\"16,30\",\"ativar\":\"s\"},\"prefixos\":[\"pp-gao\"]}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "900.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Aero Boero 180 é a versão mais potente do AB-115. Diferentemente deste e de seu motor Lycoming de 115 cavalos, o AB-180 é equipado com um motor de 180, que o permite ser usado tanto em vôos de instrução quanto no reboque de planadores.O Aero Boero 180 é uma aeronave asa alta de fabricação argentina utilizada no reboque de planadores. Possui uma melhor aerodinâmica, e é mais potente que o Aero Boero 115. O seu primeiro exemplar voou no ano de 1967, tendo a sua produção até o ano 2000.O Aeroboero 180 &lbrack;AB18&rbrack; é uma aeronave muito utilizada para treinamento, que também pode ser utilizada para reboque de planadores.Com seu motor de 180hp, permite voar a velocidades maiores que o AB11, possuindo também maior razão de subida. Por possuir trem de pouso no estilo convencional, torna a pilotagem bastante desafiadora, o que auxilia na formação de pilotos com grande sensibilidade de voo, o chamado “pé e mão”.AEROBOERO 180Aeronave homolagada VFR diurnahora avulsa: R$800,00 por hora sem combustívelConsumo Horário: 30 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "14",
			'nome' => "Tupi 160",
			'codigo' => "PA28",
			'pacotes' => "{\"1\":{\"horas_livre\":\"R$ 399,00\",\"tabela-hora-padao\":\"R$ 882,00\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "5c23b4eb4f9f9",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "tupi-160",
			'meta_descricao' => "De fabricação nacional asa baixa, de fácil pilotagem e com excelente desempenho no treinamento, devidamente equipada para a realização tanto de voos visuais como por instrumentos.",
			'data' => "2018-12-26",
			'atualizado' => "2021-08-26 09:08:20",
			'obs' => "",
			'config' => "{\"video\":\"https://www.youtube.com/watch?v=22BxIcGca6U\"}",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "Aeronave de 4 lugares. O Embraer EMB-712 \"Tupi\" é um avião monomotor comercial a \r\npistão, produzido no Brasil pela Embraer e posteriormente por sua \r\nsubsidiária Neiva, sob licença da norte-americana Piper Aircraft. Na \r\nverdade este é o nome brasileiro do modelo Archer II.Lançado em \r\n1979 no Brasil, em 1980 já era considerado o mais barato e simples avião\r\n de turismo do país, além de ser econômico e apresentar alto nível de \r\nsegurança, o que proporcionou grande aceitação entre os aeroclubes e o \r\nmercado nacional, com um total de 145 unidades fabricadas. Com quatro lugares, incluindo piloto, foi utilizado como avião de turismo e de treinamento. \r\nSua fuselagem é do tipo monocoque, com estrutura primária de liga de \r\nalumínio. Equipado com asa semi-afilada, o monomotor EMB-712 Tupi pode \r\natingir a velocidade de 207 km/h, com seu motor Lycoming de 180.O Tupi é uma aeronave de fabricação nacional, de asa baixa, de fácil pilotagem e com excelente desempenho no treinamento de pilotos. Comporta até quatro ocupantes, devidamente equipada para a realização tanto de voos visuais como por instrumentos.O Piper Arrow é uma econômica aeronave monomotor a pistão de pequeno porte, com construção convencional metálica e com asa baixa, com capacidade para transportar com razoável conforto um piloto e três passageiros, em viagens intermunicipais e interestaduais &lbrack;rotas domésticas&rbrack;, projetada e fabricada em larga escala nos Estados Unidos a partir da década de 1960 pela então Piper Aircraft &lbrack;atualmente New Piper Aircraft&rbrack;, que utilizou como base o modesto projeto de aeronave monomotor a pistão Piper Cherokee, do mesmo fabricante.Sem grandes pretensões de tornar o Piper Cherokee uma aeronave sofisticada para atender às exigências de consumidores e usuários de altíssimo poder aquisitivo, a então Piper Aircraft deu continuidade, na década de 1960, ao desenvolvimento do modesto projeto denominado PA-28, com o lançamento da sua versão melhorada Piper Arrow, com trem de pouso retrátil. Até o final da década de 1980, o Piper Arrow cumpria as pretensões da Piper Aircraft e, atualmente, ainda cumpre praticamente as mesmas pretensões da New Piper de competir no mercado aeronáutico mundial de aviação geral, treinamento e táxi aéreo com uma aeronave relativamente barata, muito econômica, com acabamento simples, fácil de pilotar, projetada para viagens tranquilas com o uso responsável dos instrumentos de bordo, planejadas antecipadamente com cuidado pelo piloto.Atualmente, é possível equipar em oficinas homologadas o Piper Arrow com o stormscope, o GPS e o TCAS, PFD e MFD Aspen ou Garmin 500, entre outros. Na versão mais recente do Arrow, o GPS está disponível de fábrica, integrado ao EFIS &lbrack;Electronic Flight Instrument System&rbrack;, mas o stormscope e o TCAS podem ser adquiridos e instalados em oficinas. O stormscope, o GPS e o TCAS são instrumentos de fundamental importância para viagens seguras e tranquilas, sem surpresas desagradáveis na rota.O Piper Arrow faz parte da família PA-28, lançada pela Piper Aircraft na década de 1960 com a versão Piper Cherokee e, posteriormente, na década de 1970, com os modelos Piper Warrior, Piper Archer e Piper Dakota. No total, incluindo as versões licenciadas para fabricação por outros fabricantes em outros países, incluindo o Brasil, são mais de 32.000 unidades vendidas até hoje, um gigantesco sucesso de vendas, um fenômeno impressionante, é um dos projetos mais conhecidos de aeronaves leves a pistão do mundo, é comum vê-las em hangares ou pátios de aeródromos e aeroportos de cidades do interior.EMBRAER TUPIAeronave homolagada VFR diurna/noturnahora avulsa: R$962,00 por horaConsumo Horário: 30 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"13/04/2023 20:04:51\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Tupi 160\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "17",
			'nome' => "Cessna 172",
			'codigo' => "C172",
			'pacotes' => "{\"1\":{\"revalidacoes-mnte\":\"R$ 900,00\",\"revalidacoes-mnte_dolar\":\"U$ 156,77\",\"piloto-comercial-mlte-ifr\":\"R$ 700,00\",\"piloto-comercial-mlte-ifr_dolar\":\"U$ 120,88\",\"hora-seca\":\"R$ 700,00\",\"hora-seca_dolar\":\"U$ 154,91\",\"piloto-privado-aviao\":\"R$ 700,00\",\"piloto-privado-aviao_dolar\":\"U$ 120,88\",\"piloto-comercial-mnte-ifr-\":\"R$ 700,00\",\"piloto-comercial-mnte-ifr-_dolar\":\"U$ 122,83\",\"instrutor-de-voo\":\"R$ 700,00\",\"instrutor-de-voo_dolar\":\"U$ 120,48\",\"revalidacoes-inva\":\"R$ 900,00\",\"revalidacoes-inva_dolar\":\"U$ 165,25\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "5c271a2d5c219",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "cessna-172",
			'meta_descricao' => "Tem a reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável. Com baixa carga alar &lbrack;peso / área das asas&rbrack; e asas de perfil convencional de alta sustentação.",
			'data' => "2018-12-29",
			'atualizado' => "2025-08-18 12:08:43",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"25\",\"preco_litro\":\"15,52\",\"ativar\":\"s\"},\"prefixos\":[\"pt-csw\",\"pr-kvb\"]}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "900.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Cessna 172 tem reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável, é apreciada para voo de lazer e viagem. Com baixa carga alar &lbrack;peso / área das asas&rbrack; e asas de perfil convencional de alta sustentação, pode operar em pistas curtas e mal preparadas &lbrack;saibro, cascalho, grama, etc&rbrack;.Os flaps são do tipo slotted &lbrack;fenda&rbrack;, e defletem em ângulo de até 40 graus. A atuação dos mesmos é elétrica, com motor instalado na asa direita comandado através de switch no painel.As asas são do tipo alta semi-cantilever e o trem de pouso é do tipo triciclo, fixo, com amortecedores do tipo lâmina no trem principal e hidráulico no trem do nariz e rodas carenadas.O design do Cessna 172 transpira simplicidade e praticidade. O alarme de perda de sustentação, que em outras aeronaves é um dispositivo elétrico, neste Cessna é um mecanismo aerodinâmico, um apito no bordo de ataque acionado pela sucção do ar para fora da asa, sucção esta causada pela depressão barométrica no bordo de ataque da asa. Acontecimento característico da perda de sustentação. As asas altas, por sua vez, abrigam os tanques de combustível. Isto permite a alimentação do motor por gravidade, sem a necessidade de uma bomba de combustível adicional &lbrack;boost pump ou auxiliary pump&rbrack; elétrica. Os amortecedores também mostram a simplicidade do design da Cessna. Do tipo lâmina de aço, os amortecedores do trem de pouso principal não possuem nenhum mecanismo hidráulico como em outras aeronaves da mesma categoria, como os monomotores de asa baixa da Piper Aircraft.CESSNA 172Aeronave homolagada IFR diurna/noturnahora avulsa: R$850,00 por hora sem combustívelConsumo Horário: 30 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "18",
			'nome' => "Cessna 152",
			'codigo' => "C152",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"hora-seca\":\"R$ 600,00\",\"hora-seca_dolar\":\"U$ 107,29\",\"piloto-privado-aviao\":\"R$ 600,00\",\"piloto-privado-aviao_dolar\":\"U$ 107,29\",\"piloto-comercial-mnte-ifr-\":\"R$ 600,00\",\"piloto-comercial-mnte-ifr-_dolar\":\"U$ 106,53\",\"instrutor-de-voo\":\"R$ 500,00\",\"instrutor-de-voo_dolar\":\"U$ 89,41\",\"revalidacoes-inva\":\"\",\"revalidacoes-inva_dolar\":\"\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "5c2b9279ae5b9",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "cessna-152",
			'meta_descricao' => "Tem a reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável. Com baixa carga alar &lbrack;peso / área das asas&rbrack; e asas de perfil convencional de alta sustentação.",
			'data' => "2019-01-01",
			'atualizado' => "2025-09-04 14:09:39",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"16\",\"preco_litro\":\"15,52\",\"ativar\":\"s\"},\"prefixos\":[\"PR-MLU\",\"PR-HNA\",\"PR-AES\",\"PT-AVU\",\"Pr-KNF\"]}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "800.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Cessna 152 tem reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável, é apreciada para voo de lazer e viagem. Com baixa carga alar &lbrack;peso / área das asas&rbrack; e asas de perfil convencional de alta sustentação, pode operar em pistas curtas e mal preparadas &lbrack;saibro, cascalho, grama, etc&rbrack;.Os flaps são do tipo slotted &lbrack;fenda&rbrack;, e defletem em ângulo de até 40 graus. A atuação dos mesmos é elétrica, com motor instalado na asa direita comandado através de switch no painel.As asas são do tipo alta semi-cantilever e o trem de pouso é do tipo triciclo, fixo, com amortecedores do tipo lâmina no trem principal e hidráulico no trem do nariz e rodas carenadas.O design do Cessna 152 transpira simplicidade e praticidade. O alarme de perda de sustentação, que em outras aeronaves é um dispositivo elétrico, neste Cessna é um mecanismo aerodinâmico, um apito no bordo de ataque acionado pela sucção do ar para fora da asa, sucção esta causada pela depressão barométrica no bordo de ataque da asa. Acontecimento característico da perda de sustentação. As asas altas, por sua vez, abrigam os tanques de combustível. Isto permite a alimentação do motor por gravidade, sem a necessidade de uma bomba de combustível adicional &lbrack;boost pump ou auxiliary pump&rbrack; elétrica. Os amortecedores também mostram a simplicidade do design da Cessna. Do tipo lâmina de aço, os amortecedores do trem de pouso principal não possuem nenhum mecanismo hidráulico como em outras aeronaves da mesma categoria, como os monomotores de asa baixa da Piper Aircraft.CESSNA 152homologada VFR diurna/noturnahora avulsa: R$800,00 por hora sem combustívelConsumo Horário: 20 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "19",
			'nome' => "Seneca II",
			'codigo' => "PA34",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"moeda\":\"BRL\",\"limite\":\"1\"}}",
			'autor' => "95",
			'token' => "5c2b931301f8a",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "EMB-810C / PA34&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; &nbsp;Tripulação&nbsp; &nbsp;&nbsp;1 PilotoCapacidade&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;5 PassageirosAltura3,02 mEnvergadura11,86 mComprimento8,72 mPeso Vazio Básico1280 kgCarga Útil792 kgPeso Máximo de Decolagem2073 kgPeso Máximo de Pouso1970 kgVelocidade de CruzeiroAproximadamente 160 kts&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;Velocidade Máxima Flape 10138 ktsVelocidade Máxima Flape 25121 ktsVelocidade Máxima Flape 40107 ktsVelocidade Mínima de Controle no Ar66 ktsVelocidade de Melhor Razão de Subida89 ktsVelocidade Máxima para Trem de Pouso129 ktsMotorizaçãoContinental TSIO-360&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;Potência Máxima215 HP &lbrack;12.000 ft&rbrack;Pressão de Admissão Máxima40 pol. HgRotação Máxima2575 RPMTeto de Serviço25.000 ftCapacidade de Combustível484 litros &lbrack;465 litros utilizáveis&rbrack;Consumo Médio &lbrack;AVGAS&rbrack;Aproximadamente 85 l/h &lbrack;75% Potência&rbrack;Razão de SubidaAproximadamente 500 ft/min",
			'url' => "seneca-ii",
			'meta_descricao' => "Uma aeronave bimotor executiva a pistão de pequeno porte, com capacidade para transportar com razoável conforto um piloto e cinco passageiros em viagens intermunicipais e interestaduais.",
			'data' => "2019-01-01",
			'atualizado' => "2024-09-13 10:09:19",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"60\",\"preco_litro\":\"15,52\",\"ativar\":\"s\"},\"prefixos\":[\"PT-EMR\",\"PT-MCS\"]}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "3000.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Seneca II é uma aeronave bimotor executiva a pistão de pequeno porte, com capacidade para transportar com razoável conforto um piloto e cinco passageiros em viagens intermunicipais e interestaduais. Respondendo às críticas sobre a qualidade de comportamento da aeronave, a Piper introduziu o PA-34-200T Seneca II. A aeronave foi certificada em 18 de julho de 1974 e lançada como modelo de 1975.O novo modelo incorporou mudanças nos controles de solo da aeronave, ailerons mais alongados e balanceados e a adição de um “anti-servo” no leme. O “T” na designação do novo modelo reflete uma mudança para um motor turbocharged &lbrack;motor com turbocompressor&rbrack;, seis cilindros Continental TSIO-360E ou ainda EB para uma performance melhorada, principalmente acima de 5.000 metros de altitude.No Seneca II a Piper manteve o modelo contra-rotativo de seu irmão mais velho Seneca I. O Seneca II também possibilitava a montagem dos assentos em club seating dos quais os assentos do centro ficaram virados para trás e os dois assentos traseiros para frente, permitindo uma configuração mais confortável. O peso máximo de decolagem foi aumentado para 2.073 kg &lbrack;aprox. 4.570 libras&rbrack;. O peso máximo de pouso dessa versão é de 1.969 kg &lbrack;aprox. 4.342 libras&rbrack;.EMBRAER SENECA IIAeronave homologada IFR RNAV diurna/noturnahora avulsa: R$3.000,00 por hora sem combustívelConsumo Horário: 80 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "20",
			'nome' => "Simulador MNTE GA-18",
			'codigo' => "GA18",
			'pacotes' => "{\"1\":{\"revalidacoes-mnte\":\"R$ 300,00\",\"revalidacoes-mnte_dolar\":\"U$ 52,26\",\"piloto-comercial-mlte-ifr\":\"R$ 150,00\",\"piloto-comercial-mlte-ifr_dolar\":\"U$ 25,90\",\"hora-seca\":\"R$ 300,00\",\"hora-seca_dolar\":\"U$ 51,64\",\"piloto-comercial-mnte-ifr-\":\"R$ 150,00\",\"piloto-comercial-mnte-ifr-_dolar\":\"U$ 25,90\",\"moeda\":\"BRL\",\"limite\":\"1\"}}",
			'autor' => "141",
			'token' => "5c2b966c9eefe",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "Dimensões A x L x C1,45mts 1,45mts 1,60mtsSistema visualTelevisãoEstação de instruçãoOKPainelDigitalGPSOpcional",
			'url' => "simulador-mnte-ga-18",
			'meta_descricao' => "Simulador de vôo Monomotor single-place com completa instrumentação IFR incluindo HSI/RMI e opção de configuração com VOR ILS/VOR 2 e ADF.",
			'data' => "2019-01-01",
			'atualizado' => "2025-08-08 20:08:53",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"\",\"preco_litro\":\"\",\"ativar\":\"s\"},\"prefixos\":[\"\"]}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "300.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "Simulador de vôo Monomotor single-place com completa instrumentação IFR incluindo HSI/RMI e opção de configuração com VOR ILS/VOR 2 e ADF. É certificado AATD pela ANAC seguindo regulamentação AC-061-136 da FAA e abate 20h em C.I.V nos currículos homologados de treinamento IFR, 5h em currículo de vôo VFR PP/PC e 50h em currículo de treinamento PLA. O GA-18 reproduz com fidelidade as características de performance e aerodinâmica do CESSNA C182 230T. Inclui no simulador uma completa e avançada estação de instrução, televisão para sistema visual, sistema de comunicação PTT instrutor-aluno e caixas de som e possibilidade de conexão GPS &lbrack;real ou simulado&rbrack;.Abate 20h em C.I.V nos currículos homologados de treinamento IFR.Abate 5h em currículo de voo VFR PC.Abate 35h em currículo de treinamento PLA.SIMULADOR MNTEhomolagado IFRhora avulsa: R$400,00 por horasolicite seu orçamento clicando aqui.",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "21",
			'nome' => "Simulador MLTE SBPA",
			'codigo' => "SBPA",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"piloto-comercial-mlte-ifr\":\"R$ 150,00\",\"piloto-comercial-mlte-ifr_dolar\":\"U$ 25,90\",\"hora-seca\":\"R$ 300,00\",\"hora-seca_dolar\":\"U$ 51,64\",\"revalidacoes-mlte\":\"R$ 300,00\",\"revalidacoes-mlte_dolar\":\"U$ 52,26\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "5c332c39e0630",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "simulador-mlte-sbpa",
			'meta_descricao' => "Simulador de vôo Multimotor single-place com completa instrumentação IFR incluindo HSI/RMI e opção de configuração com VOR ILS/VOR 2 e ADF.",
			'data' => "2019-01-07",
			'atualizado' => "2025-04-02 14:04:48",
			'obs' => "",
			'config' => "{\"video\":\"https://www.youtube.com/watch?v=zQgCoAgxHFI\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "300.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "Simulador de voo AATD, MULTIMOTOR bi-place com completa instrumentação IFR incluindo HSI/RMI e opção de configuração com VOR ILS/VOR 2 e ADF. É certificado AATD &lbrack;Advanced Aviation Training Device&rbrack; pela ANAC, seguindo regulamentação AC-061-136 da FAA. O AATD reproduz com fidelidade as características de performance e aerodinâmica do Seneca V. Inclui uma completa e avançada estação de instrução, retroprojetor ou televisão para sistema visual, sistema de comunicação PTT &lbrack;Push to Talk&rbrack; instrutor-aluno e caixas de som e possibilidade de conexão GPS &lbrack;real ou simulado&rbrack;. Este simulador abate 20 horas em CIV &lbrack;Caderneta Individual de Voo&rbrack; nos currículos homologados de treinamento IFR, 5 horas em currículo de voo VFR &lbrack;Piloto Privado e Comercial&rbrack; e 50 horas em currículo de treinamento PLA &lbrack;Piloto de Linhas Aérea&rbrack;.SIMULADOR MLTEhomolagado IFRhora avulsa: R$400,00 por horasolicite seu orçamento clicando aqui.",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "22",
			'nome' => "Corisco Aspirado",
			'codigo' => "EMB711",
			'pacotes' => "{\"1\":{\"horas_livre\":\"R$ 785,00\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "5c597b4aa85de",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "corisco-aspirado",
			'meta_descricao' => "Equipado com motor Lycoming de 200 HP, desenvolve velocidade máxima de 265 km/h. Pode transportar quatro pessoas, incluindo o piloto. Conta com isolamento acústico e ventilação controlada.",
			'data' => "2019-02-05",
			'atualizado' => "2021-10-23 10:10:22",
			'obs' => "",
			'config' => "{\"video\":\"https://www.youtube.com/watch?v=ToIqywLvFls\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Embraer EMB-711 “Corisco” é um avião monomotor comercial a pistão, produzido no Brasil pela Embraer e posteriormente por sua subsidiária Neiva, sob licença da Piper Aircraft.Trata-se do Cherokee Arrow II.Equipado com motor Lycoming de 200 HP, desenvolve velocidade máxima de 265 km/h. Pode transportar quatro pessoas, incluindo o piloto. Conta com isolamento acústico e ventilação controlada.O modelo com cauda em “T”, onde o conjunto estabilizador horizontal é montado no topo do estabilizador vertical, o que evita o sopro das hélices e garante menor nível de vibração e ruído.Em 1980 foi lançado o EMB 711 ST – Corisco II, ou Corisco Turbo, com turbocompressor e acabamento melhorado, que aumentou sua velocidade máxima para 330 km/h.Bem aceito entre os aeroclubes brasileiros, além de uso para turismo, teve 477 unidades comercializadas.EMBRAER CORISCOAeronave homolagada IFR RNAV diurna/noturnahora avulsa: R$1.490,00 por hora com combustívelhora avulsa: R$988,00 por hora sem combustívelConsumo Horário: 60 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"13/04/2023 20:04:51\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Corisco Aspirado\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "23",
			'nome' => "RV-9",
			'codigo' => "RV9",
			'pacotes' => "{\"1\":{\"horas_c_comb\":\"R$ 900,00\",\"horas_s_comb\":\"R$ 900,00\",\"horas_livre\":\"R$ 900,00\",\"horas_tab5\":\"R$ 900,00\",\"tabela-hora-padao\":\"R$ 900,00\",\"tabela-promocional\":\"R$ 900,00\",\"limite\":\"1\"}}",
			'autor' => "59",
			'token' => "5c597bf0d8773",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "rv-9",
			'meta_descricao' => "Projetado como um avião de turismo de dois lugares, lado a lado. Possui maior estabilidade e economia. Como tal, a potência do design é de 118-160 e o protótipo foi equipado com um motor Lycoming O-235 de 118 hp &lbrack;88 kW&rbrack; como prova de conceito para a potência mais baixa.",
			'data' => "2019-02-05",
			'atualizado' => "2021-04-28 11:04:26",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O arquiteto da linha do avião de Van, Richard VanGrunsven, projetou o RV-9 como um desvio dos conceitos da série RV anterior. Os primeiros membros da série RV, começando com o assento único RV-3, foram todos projetados para ter capacidade de movimentação de luz, acrobacia aérea, além de rápidas velocidades de cruzeiro e recursos do STOL. O RV-9 foi projetado desde o início como um avião de turismo de dois lugares, lado a lado, e, como tal, deixa de lado as capacidades acrobáticas e o manuseio mais leve para maior estabilidade e economia. Como tal, a potência do design é de 118-160 e o protótipo foi equipado com um motor Lycoming O-235 de 118 hp &lbrack;88 kW&rbrack; como prova de conceito para a potência mais baixa.Como resultado das lições aprendidas ao longo dos anos na produção dos cinco primeiros projetos da série RV e da mudança no papel para esta aeronave, o design do RV-9 incorporou muitas mudanças em relação aos projetos anteriores.O RV-9A foi o primeiro a usar o que os componentes da Van chamam de “orifício correspondente”, em que as peças da estrutura são formadas no contorno necessário e têm todos os orifícios dos rebites localizados com precisão. Os gabaritos de montagem normalmente usados ​​para garantir o alinhamento não são necessários e o tempo de construção é muito reduzido. Modelos posteriores, como o RV-7 e o RV-10, usam essa mesma técnica de fabricação.Comparado com o semelhante RV-7, o RV-9 tem uma asa de maior amplitude e maior proporção usando um aerofólio Roncz. O RV-9 tem uma velocidade de estol lento, comparável ao Cessna 150, e manuseio dócil adequado para pilotos de baixa temporada. A velocidade de cruzeiro é um TAS muito respeitável de 167 mph &lbrack;269 km / h&rbrack;, mesmo com o motor de 118 hp &lbrack;88 kW&rbrack;.O RV-9 compartilha muitas partes comuns com o RV-7 e o RV-8, o que reduz os custos de produção. Como essas aeronaves, o RV-9 usa um projeto assistido por computador para produzir um kit com furos de rebite pré-perfurados, reduzindo muito o tempo de montagem para o construtor.O RV-9 é único na história da aeronave de Van, em que a versão RV-9A do trem de triciclo foi pilotada primeiro em 15 de junho de 2000, três anos antes da versão da roda traseira ter voado. O último trem de pouso convencional equipado RV-9 foi inicialmente pilotado por seu projetista em 2002. O RV-9A possui trem de pouso de aço de mola circular sólido com o tubo de montagem da roda de nariz soldado ao suporte do motor. Como em todas as aeronaves RV equipadas com a roda do nariz, a roda do nariz é livre e a aeronave é manobrada com diferencial de frenagem. Os freios são montados convencionalmente nos dedos do pedal do leme.Em novembro de 2014, 935 RV-9s e RV-9As haviam sido concluídos e estavam voando.",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"13/04/2023 20:04:51\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|RV-9\"}",
			'reg_deletado' => "&rbrack;;",
		]);

		$this->insertAeronave([
			'id' => "INSERT INTO `aeronaves` &lbrack;`id`",
			'nome' => "`nome`",
			'codigo' => "`codigo`",
			'pacotes' => "`pacotes`",
			'autor' => "`autor`",
			'token' => "`token`",
			'ativo' => "`ativo`",
			'publicar' => "`publicar`",
			'ficha' => "`ficha`",
			'url' => "`url`",
			'meta_descricao' => "`meta_descricao`",
			'data' => "`data`",
			'atualizado' => "`atualizado`",
			'obs' => "`obs`",
			'config' => "`config`",
			'sociedade' => "`sociedade`",
			'hora_rescisao' => "`hora_rescisao`",
			'ordenar' => "`ordenar`",
			'excluido' => "`excluido`",
			'excluido_por' => "`excluido_por`",
			'deletado' => "`deletado`",
			'deletado_por' => "`deletado_por`",
			'descricao' => "`descricao`",
			'reg_excluido' => "`reg_excluido`",
			'reg_deletado' => "`reg_deletado`&rbrack; VALUES",
		]);

		$this->insertAeronave([
			'id' => "24",
			'nome' => "Cessna 150",
			'codigo' => "C150",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"hora-seca\":\"R$ 800,00\",\"hora-seca_dolar\":\"U$ 137,70\",\"piloto-privado-aviao\":\"R$ 600,00\",\"piloto-privado-aviao_dolar\":\"U$ 104,64\",\"instrutor-de-voo\":\"R$ 600,00\",\"instrutor-de-voo_dolar\":\"U$ 102,48\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "5c76cca8d33d4",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "cessna-150",
			'meta_descricao' => "Graças ao peso bruto leve de 680 kg e a fuselagem traseira mais aerodinâmica, eles sobem mais rápido, têm os tetos mais altos e exigem as pistas mais curtas. Eles têm uma velocidade de cruzeiro de 109 nós &lbrack;202 km / h&rbrack;, mais rápido do que qualquer outro ano modelo, tanto dos 150 quanto dos 152.",
			'data' => "2019-02-27",
			'atualizado' => "2025-07-18 16:07:46",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"16\",\"preco_litro\":\"15,52\",\"ativar\":\"s\"},\"prefixos\":[\"PR-SCA\",\"PR-TJG\",\"PR-JTG\",\"PR-CJZ\"]}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "800.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O desenvolvimento do Modelo 150 começou em meados da década de 1950 com a decisão da Cessna Aircraft de produzir um sucessor do popular Cessna 140 que terminou a produção em 1951. As principais mudanças no design 150 foram o uso de trem de pouso triciclo, que é mais fácil aprender a usar do que o trem de pouso da roda traseira do Cessna 140 e substituir as pontas das asas arredondadas e os estabilizadores horizontais e verticais por perfis mais modernos e quadrados. Além disso, as abas de asa estreita e articulada dos 140 foram substituídas por abas Fowler maiores e muito mais eficazes.O protótipo do Cessna 150 voou pela primeira vez em 12 de setembro de 1957, com a produção começando em setembro de 1958 na fábrica de Cessna em Wichita, Kansas. 1.764 aeronaves também foram produzidas pela Reims Aviation sob licença na França. Estes 150 fabricados na França foram designados Reims F-150, o “F” indica que eles foram construídos na França.Os 150s fabricados nos Estados Unidos foram todos produzidos com o motor Continental O-200-A de 100 cv &lbrack;75 kW&rbrack;, mas a aeronave construída por Reims é movida por um Continental O-200-As fabricado pela Rolls Royce. Algumas versões têm motores Continental O-240-A.Todos os Cessna 150 têm abas muito eficazes que se estendem por 40 graus.Os aviões de melhor desempenho na frota de 150 e 152 são o Cessna 150B 1962 e o Cessna 150C 1963. Graças ao peso bruto leve de 680 kg e a fuselagem traseira mais aerodinâmica, eles sobem mais rápido, têm os tetos mais altos e exigem as pistas mais curtas. Eles têm uma velocidade de cruzeiro de 109 nós &lbrack;202 km / h&rbrack;, mais rápido do que qualquer outro ano modelo, tanto dos 150 quanto dos 152.Todos os modelos de 1966 em diante têm portas maiores e maior espaço para bagagem. Com o Modelo 150G de 1967, as portas foram inclinadas para fora 1,5 polegadas &lbrack;38 mm&rbrack; de cada lado para proporcionar mais espaço no cotovelo da cabine.CESSNA 150homologada VFR diurna/noturnahora avulsa:&nbsp;R$800,00&nbsp;por hora sem combustívelConsumo Horário: 20 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "28",
			'nome' => "PPA TODOS OS MODELOS DE ACFT",
			'codigo' => "ALL",
			'pacotes' => "{\"1\":{\"horas_c_comb\":\"R$ 499,00\",\"horas_s_comb\":\"R$ 499,00\",\"horas_fumec\":\"R$ 499,00\",\"horas_livre\":\"R$ 499,00\",\"horas_tab5\":\"R$ 499,00\",\"limite\":\"1\"},\"2\":{\"horas_c_comb\":\"R$ 485,00\",\"horas_s_comb\":\"R$ 479,00\",\"horas_fumec\":\"R$ 475,00\",\"horas_livre\":\"R$ 469,00\",\"horas_tab5\":\"R$ 465,00\",\"limite\":\"10\"},\"3\":{\"horas_c_comb\":\"R$ 475,00\",\"horas_s_comb\":\"R$ 469,00\",\"horas_fumec\":\"R$ 465,00\",\"horas_livre\":\"R$ 459,00\",\"horas_tab5\":\"R$ 455,00\",\"limite\":\"20\"},\"4\":{\"horas_c_comb\":\"R$ 455,00\",\"horas_s_comb\":\"R$ 449,00\",\"horas_fumec\":\"R$ 445,00\",\"horas_livre\":\"R$ 439,00\",\"horas_tab5\":\"R$ 435,00\",\"limite\":\"40\"},\"5\":{\"horas_c_comb\":\"R$ 435,00\",\"horas_s_comb\":\"R$ 429,00\",\"horas_fumec\":\"R$ 425,00\",\"horas_livre\":\"R$ 419,00\",\"horas_tab5\":\"R$ 415,00\",\"limite\":\"70\"}}",
			'autor' => "210",
			'token' => "5cb4ad7904706",
			'ativo' => "s",
			'publicar' => "n",
			'ficha' => "",
			'url' => "",
			'meta_descricao' => "",
			'data' => "2019-04-15",
			'atualizado' => "0000-00-00 00:00:00",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"59\",\"excluido_data\":\"27/04/2020 19:04:23\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|  PPA TODOS OS MODELOS DE ACFT\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "29",
			'nome' => "PCA TODOS OS MODELOS DE ACFT",
			'codigo' => "",
			'pacotes' => "{\"1\":{\"horas_c_comb\":\"R$ 499,00\",\"horas_s_comb\":\"R$ 499,00\",\"horas_fumec\":\"R$ 499,00\",\"horas_livre\":\"R$ 499,00\",\"horas_tab5\":\"R$ 499,00\",\"limite\":\"1\"},\"2\":{\"horas_c_comb\":\"R$ 485,00\",\"horas_s_comb\":\"R$ 479,00\",\"horas_fumec\":\"R$ 475,00\",\"horas_livre\":\"R$ 469,00\",\"horas_tab5\":\"R$ 465,00\",\"limite\":\"10\"},\"3\":{\"horas_c_comb\":\"R$ 475,00\",\"horas_s_comb\":\"R$ 469,00\",\"horas_fumec\":\"R$ 465,00\",\"horas_livre\":\"R$ 459,00\",\"horas_tab5\":\"R$ 455,00\",\"limite\":\"20\"},\"4\":{\"horas_c_comb\":\"R$ 455,00\",\"horas_s_comb\":\"R$ 449,00\",\"horas_fumec\":\"R$ 445,00\",\"horas_livre\":\"R$ 439,00\",\"horas_tab5\":\"R$ 435,00\",\"limite\":\"40\"},\"5\":{\"horas_c_comb\":\"R$ 435,00\",\"horas_s_comb\":\"R$ 429,00\",\"horas_fumec\":\"R$ 425,00\",\"horas_livre\":\"R$ 419,00\",\"horas_tab5\":\"R$ 415,00\",\"limite\":\"70\"}}",
			'autor' => "22",
			'token' => "5ce5618e3b265",
			'ativo' => "s",
			'publicar' => "n",
			'ficha' => "",
			'url' => "",
			'meta_descricao' => "",
			'data' => "2019-05-22",
			'atualizado' => "0000-00-00 00:00:00",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"59\",\"excluido_data\":\"27/04/2020 19:04:23\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|PCA TODOS OS MODELOS DE ACFT\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "30",
			'nome' => "Diamond DA-20",
			'codigo' => "DA20",
			'pacotes' => "{\"1\":{\"horas_c_comb\":\"R$ 900,00\",\"horas_s_comb\":\"R$ 900,00\",\"horas_fumec\":\"R$ 900,00\",\"horas_livre\":\"R$ 900,00\",\"horas_tab5\":\"R$ 900,00\",\"tabela-hora-padao\":\"R$ 900,00\",\"tabela-futura\":\"R$ 900,00\",\"tabela-promocional\":\"R$ 900,00\",\"limite\":\"1\"}}",
			'autor' => "59",
			'token' => "5d124fcd1f158",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "diamond-da-20",
			'meta_descricao' => "Elegante, esportivo, de fácil manutenção e utilizado em todo o mundo pelas principais escolas de aviação, o DA20 é a escolha certa para quem deseja uma aeronave de baixo custo operacional e extremamente segura.",
			'data' => "2019-06-25",
			'atualizado' => "2021-04-28 11:04:26",
			'obs' => "",
			'config' => "{\"video\":\"https://www.youtube.com/watch?v=CAXKF22Sbe8\"}",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "Elegante, esportivo, de fácil manutenção e utilizado em todo o mundo pelas principais escolas de aviação, o DA20 é a escolha certa para quem deseja uma aeronave de baixo custo operacional e extremamente segura. Tornou-se a aeronave padrão da Academia da Força Aérea dos EUA nos últimos dez anos e é apreciado pelas escolas de voo em todo o mundo por sua robustez, desempenho e economia. Pela sua versatilidade, pode ser utilizado tanto por pilotos em estágio inicial como em ambientes mais desafiadores, pois garante toda a segurança necessária.O Diamond DV20 / DA20-C1 Eclipse é uma aeronave leve de aviação geral de triciclo de dois lugares concebida na Áustria. Desenvolvido e fabricado pela fabricante de aviões austríaca Diamond Aircraft, foi originalmente produzido na Áustria como o DV20. O DV20 compartilha muitos recursos do antigo Diamond HK36 Super Dimona.DIAMOND DA-20Aeronave homolagada VFR diurnahora avulsa: R$900,00 por horasolicite seu orçamento clicando aqui.",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"13/04/2023 20:04:50\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Diamond DA-20\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "31",
			'nome' => "Voo Panoramico",
			'codigo' => "VPN",
			'pacotes' => "{\"1\":{\"horas_c_comb\":\"R$ 400,00\",\"horas_s_comb\":\"R$ 400,00\",\"horas_fumec\":\"R$ 400,00\",\"horas_livre\":\"R$ 400,00\",\"limite\":\"1\"}}",
			'autor' => "210",
			'token' => "5d1bc74e081cf",
			'ativo' => "s",
			'publicar' => "n",
			'ficha' => "",
			'url' => "",
			'meta_descricao' => "",
			'data' => "2019-07-02",
			'atualizado' => "0000-00-00 00:00:00",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"22\",\"excluido_data\":\"27/04/2020 18:04:17\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Voo Panoramico\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "32",
			'nome' => "INVA TODOS OS MODELOS DE ACFT",
			'codigo' => "",
			'pacotes' => "{\"1\":{\"horas_c_comb\":\"R$ 499,00\",\"horas_s_comb\":\"R$ 499,00\",\"horas_fumec\":\"R$ 499,00\",\"horas_livre\":\"R$ 499,00\",\"horas_tab5\":\"R$ 499,00\",\"limite\":\"1\"},\"2\":{\"horas_c_comb\":\"R$ 485,00\",\"horas_s_comb\":\"R$ 479,00\",\"horas_fumec\":\"R$ 475,00\",\"horas_livre\":\"R$ 469,00\",\"horas_tab5\":\"R$ 465,00\",\"limite\":\"10\"},\"3\":{\"horas_c_comb\":\"R$ 475,00\",\"horas_s_comb\":\"R$ 469,00\",\"horas_fumec\":\"R$ 465,00\",\"horas_livre\":\"R$ 459,00\",\"horas_tab5\":\"R$ 455,00\",\"limite\":\"20\"},\"4\":{\"horas_c_comb\":\"R$ 455,00\",\"horas_s_comb\":\"R$ 449,00\",\"horas_fumec\":\"R$ 445,00\",\"horas_livre\":\"R$ 439,00\",\"horas_tab5\":\"R$ 435,00\",\"limite\":\"40\"},\"5\":{\"horas_c_comb\":\"R$ 435,00\",\"horas_s_comb\":\"R$ 429,00\",\"horas_fumec\":\"R$ 425,00\",\"horas_livre\":\"R$ 419,00\",\"horas_tab5\":\"R$ 415,00\",\"limite\":\"70\"}}",
			'autor' => "22",
			'token' => "5ddc50dccab86",
			'ativo' => "s",
			'publicar' => "n",
			'ficha' => "",
			'url' => "inva-todos-os-modelos-de-acft3",
			'meta_descricao' => "",
			'data' => "2019-11-25",
			'atualizado' => "0000-00-00 00:00:00",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"59\",\"excluido_data\":\"27/04/2020 19:04:23\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|INVA TODOS OS MODELOS DE ACFT\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "33",
			'nome' => "aeronave teste2451",
			'codigo' => "4587",
			'pacotes' => "{\"1\":{\"horas_c_comb\":\"R$ 50,00\",\"horas_s_comb\":\"R$ 48,55\",\"horas_fumec\":\"R$ 12,22\",\"horas_livre\":\"R$ 4,55\",\"horas_tab5\":\"\",\"limite\":\"100\"},\"2\":{\"horas_c_comb\":\"R$ 4,22\",\"horas_s_comb\":\"R$ 7,85\",\"horas_fumec\":\"R$ 111,11\",\"horas_livre\":\"R$ 45,12\",\"horas_tab5\":\"\",\"limite\":\"5\"},\"5\":{\"horas_c_comb\":\"\",\"horas_s_comb\":\"\",\"horas_fumec\":\"\",\"horas_livre\":\"\",\"horas_tab5\":\"\",\"limite\":\"\"}}",
			'autor' => "22",
			'token' => "5e345e78d9c61",
			'ativo' => "s",
			'publicar' => "n",
			'ficha' => "",
			'url' => "aeronave-teste2451",
			'meta_descricao' => "",
			'data' => "2020-01-31",
			'atualizado' => "0000-00-00 00:00:00",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"59\",\"excluido_data\":\"27/04/2020 19:04:23\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|aeronave teste2451\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "34",
			'nome' => "Nova aeronam",
			'codigo' => "",
			'pacotes' => "{\"1\":{\"horas_c_comb\":\"\",\"horas_s_comb\":\"\",\"horas_fumec\":\"\",\"limite\":\"10\"},\"2\":{\"horas_c_comb\":\"\",\"horas_s_comb\":\"\",\"horas_fumec\":\"\",\"limite\":\"15\"}}",
			'autor' => "22",
			'token' => "5e34de64580a4",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "teste",
			'url' => "nova-aeronam",
			'meta_descricao' => "mteste de teste",
			'data' => "2020-01-31",
			'atualizado' => "0000-00-00 00:00:00",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "descrição de teste    ",
			'reg_excluido' => "{\"excluidopor\":\"22\",\"excluido_data\":\"27/04/2020 18:04:16\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Nova aeronam\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "35",
			'nome' => "Tupi 180",
			'codigo' => "EMB712",
			'pacotes' => "{\"3\":{\"horas_livre\":\"R$ 550,00\",\"horas_livre_dolar\":\"U$ 100,00\",\"tabela-hora-padao\":\"R$ 800,00\",\"tabela-hora-padao_dolar\":\"U$ 120,00\",\"hora-avulsa\":\"R$ 600,00\",\"hora-avulsa_dolar\":\"U$ 110,00\",\"tabela-seca--01\":\"R$ 500,00\",\"tabela-seca--01_dolar\":\"U$ 95,00\",\"seca-02\":\"R$ 450,00\",\"seca-02_dolar\":\"U$ 85,50\",\"seca-03\":\"R$ 400,00\",\"seca-03_dolar\":\"U$ 76,00\",\"seca-promocional\":\"R$ 250,00\",\"seca-promocional_dolar\":\"U$ 47,50\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "5e99bc361d8d9",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "tupi-180",
			'meta_descricao' => "O Tupi é uma aeronave de fabricação nacional, de asa baixa, de fácil pilotagem e com excelente desempenho no treinamento de pilotos.",
			'data' => "2020-04-17",
			'atualizado' => "2022-09-10 09:09:27",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"25\",\"preco_litro\":\"16,30\",\"ativar\":\"s\"},\"video\":\"https://www.youtube.com/watch?v=iogXv74u0BQ\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"\",\"socios\":\"\"}",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "Aeronave de 4 lugares. O Tupi é uma aeronave de fabricação nacional, de asa baixa, de fácil pilotagem e com excelente desempenho no treinamento de pilotos. Comporta até quatro ocupantes, devidamente equipada para a realização tanto de voos visuais como por instrumentos.O Piper Arrow é uma econômica aeronave monomotor a pistão de pequeno porte, com construção convencional metálica e com asa baixa, com capacidade para transportar com razoável conforto um piloto e três passageiros, em viagens intermunicipais e interestaduais &lbrack;rotas domésticas&rbrack;, projetada e fabricada em larga escala nos Estados Unidos a partir da década de 1960 pela então Piper Aircraft &lbrack;atualmente New Piper Aircraft&rbrack;, que utilizou como base o modesto projeto de aeronave monomotor a pistão Piper Cherokee, do mesmo fabricante.Sem grandes pretensões de tornar o Piper Cherokee uma aeronave sofisticada para atender às exigências de consumidores e usuários de altíssimo poder aquisitivo, a então Piper Aircraft deu continuidade, na década de 1960, ao desenvolvimento do modesto projeto denominado PA-28, com o lançamento da sua versão melhorada Piper Arrow, com trem de pouso retrátil. Até o final da década de 1980, o Piper Arrow cumpria as pretensões da Piper Aircraft e, atualmente, ainda cumpre praticamente as mesmas pretensões da New Piper de competir no mercado aeronáutico mundial de aviação geral, treinamento e táxi aéreo com uma aeronave relativamente barata, muito econômica, com acabamento simples, fácil de pilotar, projetada para viagens tranquilas com o uso responsável dos instrumentos de bordo, planejadas antecipadamente com cuidado pelo piloto.Atualmente, é possível equipar em oficinas homologadas o Piper Arrow com o stormscope, o GPS e o TCAS, PFD e MFD Aspen ou Garmin 500, entre outros. Na versão mais recente do Arrow, o GPS está disponível de fábrica, integrado ao EFIS &lbrack;Electronic Flight Instrument System&rbrack;, mas o stormscope e o TCAS podem ser adquiridos e instalados em oficinas. O stormscope, o GPS e o TCAS são instrumentos de fundamental importância para viagens seguras e tranquilas, sem surpresas desagradáveis na rota.O Piper Arrow faz parte da família PA-28, lançada pela Piper Aircraft na década de 1960 com a versão Piper Cherokee e, posteriormente, na década de 1970, com os modelos Piper Warrior, Piper Archer e Piper Dakota. No total, incluindo as versões licenciadas para fabricação por outros fabricantes em outros países, incluindo o Brasil, são mais de 32.000 unidades vendidas até hoje, um gigantesco sucesso de vendas, um fenômeno impressionante, é um dos projetos mais conhecidos de aeronaves leves a pistão do mundo, é comum vê-las em hangares ou pátios de aeródromos e aeroportos de cidades do interior.EMBRAER TUPIAeronave homolagada IFR diurna/noturnahora avulsa: R$450,00 por hora sem combustívelConsumo Horário: 30 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"13/04/2023 20:04:50\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Tupi 180\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "36",
			'nome' => "Tupi 140",
			'codigo' => "PA28",
			'pacotes' => "{\"1\":{\"horas_livre\":\"R$ 500,00\",\"horas_livre_dolar\":\"\",\"tabela-hora-padao\":\"R$ 882,00\",\"tabela-hora-padao_dolar\":\"\",\"hora-avulsa\":\"\",\"hora-avulsa_dolar\":\"\",\"seca-promocional\":\"\",\"seca-promocional_dolar\":\"\",\"tabela-seca-35-horas-de-voo\":\"\",\"tabela-seca-35-horas-de-voo_dolar\":\"\",\"moeda\":\"BRL\",\"limite\":\"1\"}}",
			'autor' => "137",
			'token' => "5ec5d5ad8b956",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "tupi-140",
			'meta_descricao' => "Tupi 140\r\nAs aeronaves Piper PA-28 são aviões monomotor a pistão de pequeno porte, com construção convencional metálica e com asa baixa, com capacidade para transportar, com razoável conforto, um piloto e três passageiros, em viagens intermunicipais e interestaduais &lbrack;rotas domésticas&rbrack;, projetada e fabricada em larga escala nos Estados Unidos a partir da década de 1960 pela Piper Aircraft.\r\n\r\nEm 1971, a Piper lançou uma variante, do Cherokee 140, chamada Cherokee Cruiser 2 + 2, que agora possuía 4 assentos.\r\n\r\nO Arrow II teve sua produção iniciada em 1972, apresentando um aumento no comprimento de 1,27 m com o propósito de aumentar o espaço para as pernas dos passageiros do banco traseiro. Em 1977, a Piper apresentou o Arrow III &lbrack;PA-28R-201&rbrack;, que apresentava uma asa semi-cônica e um estabilizador mais longo, um recurso de design que havia sido introduzido anteriormente com sucesso no PA-28-181 e fornecia melhor manuseio em baixa velocidade. Também apresentava tanques de combustível maiores, aumentando a capacidade de 50 para 77 galões.\r\n\r\nEm 1974, a Piper mudou os nomes de marketing de alguns dos modelos Cherokee novamente, renomeando o Cruiser 2 + 2 simplesmente como Cherokee Cruiser, e o Challenger para o Archer &lbrack;modelo PA-28-181&rbrack;. No mesmo ano a Piper re-introduziu o Cherokee 150, renomeando-o como Cherokee Warrior &lbrack;PA-28-151&rbrack; e dando-lhe uma fuselagem mais comprida e uma nova asa semi-cônica.",
			'data' => "2020-05-20",
			'atualizado' => "2022-12-07 16:12:53",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"30\",\"preco_litro\":\"15,00\",\"ativar\":\"\"},\"video\":\"https://www.youtube.com/watch?v=Sm0IX4vKTUw&feature=youtu.be\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"n\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "As aeronaves Piper PA-28 são aviões monomotor a pistão de pequeno porte, com construção convencional metálica e com asa baixa, com capacidade para transportar, com razoável conforto, um piloto e três passageiros, em viagens intermunicipais e interestaduais &lbrack;rotas domésticas&rbrack;, projetada e fabricada em larga escala nos Estados Unidos a partir da década de 1960 pela Piper Aircraft.Em 1971, a Piper lançou uma variante, do Cherokee 140, chamada Cherokee Cruiser 2 + 2, que agora possuía 4 assentos.O Arrow II teve sua produção iniciada em 1972, apresentando um aumento no comprimento de 1,27 m com o propósito de aumentar o espaço para as pernas dos passageiros do banco traseiro. Em 1977, a Piper apresentou o Arrow III &lbrack;PA-28R-201&rbrack;, que apresentava uma asa semi-cônica e um estabilizador mais longo, um recurso de design que havia sido introduzido anteriormente com sucesso no PA-28-181 e fornecia melhor manuseio em baixa velocidade. Também apresentava tanques de combustível maiores, aumentando a capacidade de 50 para 77 galões.Em 1974, a Piper mudou os nomes de marketing de alguns dos modelos Cherokee novamente, renomeando o Cruiser 2 + 2 simplesmente como Cherokee Cruiser, e o Challenger para o Archer &lbrack;modelo PA-28-181&rbrack;. No mesmo ano a Piper re-introduziu o Cherokee 150, renomeando-o como Cherokee Warrior &lbrack;PA-28-151&rbrack; e dando-lhe uma fuselagem mais comprida e uma nova asa semi-cônica.EMBRAER TUPIAeronave homolagada VFR real diurna/noturnahora avulsa: R$962,00 por horaConsumo Horário: 30 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"13/04/2023 20:04:50\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Tupi 140\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "37",
			'nome' => "Simulador Boeing 737-800NG",
			'codigo' => "B737",
			'pacotes' => "{\"1\":{\"custo_real\":\"105.84\",\"custo_dolar\":\"21.64\",\"horas_livre\":\"R$ 350,00\",\"horas_livre_dolar\":\"U$ 71,58\",\"tabela-hora-padao\":\"\",\"tabela-hora-padao_dolar\":\"\",\"hora-avulsa\":\"R$ 350,00\",\"hora-avulsa_dolar\":\"U$ 71,58\",\"moeda\":\"BRL\",\"limite\":\"1\"}}",
			'autor' => "137",
			'token' => "5f9eb06337649",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "simulador-boeing-737-800ng",
			'meta_descricao' => "https://aeroclubejf.com.br/cursos/cusos-mistos/jet-training-boeing-737-800",
			'data' => "2020-11-01",
			'atualizado' => "2023-08-07 16:08:45",
			'obs' => "",
			'config' => "{\"video\":\"https://www.youtube.com/watch?v=LOhWXJUJe6Y&t=8s\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"n\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "SIMULADOR ESTÁTICO COM AS MESMAS DIMENSÕES E EQUIPAMENTOS DE UMA CABINE REALFabricado no Brasil, o simulador do Boeing 737-800NG foi um projeto desenvolvido em uma parceira entre o Aeroclube de Juiz de Fora e a Embrasim. Criou-se um simulador com o máximo de realidade possível exigida para um treinamento de familiarização com a aeronave. A cabine é em tamanho real e possui todos os comandos do FMC, MCP e comandos de voo. Para a base de cenários e para operação de CDU, MCO e EFIS utiliza o Xplane 10.Utilizado no Curso de Jet Training com o objetivo de desenvolver conhecimentos em aeronaves a jato, gerenciamento, coordenação de cabine, trabalho em equipe e rotina operacional de empresas aéreas, para alunos que já terminaram o curso de Piloto Comercial e possuem noções de voo por Instrumentos. &lbrack;IFR&rbrack;SIMULADOR B737-800hora avulsa: R$350,00 por hora",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "38",
			'nome' => "Acro Sport II 180",
			'codigo' => "ACRO",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\"}}",
			'autor' => "137",
			'token' => "5fa5caf5a1462",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "acro-sport-ii-180",
			'meta_descricao' => "",
			'data' => "2020-11-06",
			'atualizado' => "2024-03-11 15:03:36",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"40\",\"preco_litro\":\"17,53\",\"ativar\":\"s\"},\"prefixos\":[\"pt-ZJF\"]}",
			'sociedade' => "{\"ativar\":\"s\",\"credito_horas_mensais\":\"10\",\"valor_credito_horas_unitario\":\"900,00\",\"valor_credito_horas_mensais\":\"9.000,00\",\"socios\":\"6055cd7da0a59,613a6ecccf659,,613145c9b79a2,,,\"}",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Acro Sport II é um avião biposto biplano monomotor derivado diretamente do modelo anterior o Acro Sport I, foi desenvolvido pelo entusiasta aviador estadunidense Paul Poberezny na década de 1970 para construção amadora. O Acro Sport II é um biplano com envergadura pequena com trem de pouso convencional e é tipicamente construído com cockpit aberto e com carenagem no trem de pouso. Sua estrutura é coberta por lona, a fuselagem e trem de pouso são tubulares em aço, com estruturas das asas em madeira, motor 180 Hp com injeção direta sistema Cristian para voo invertido suportando até 6Gs positivos e até 3Gs negativos.",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "39",
			'nome' => "Tupi 180",
			'codigo' => "PA28",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"revalidacoes-mnte\":\"R$ 900,00\",\"revalidacoes-mnte_dolar\":\"U$ 156,77\",\"piloto-comercial-mlte-ifr\":\"R$ 700,00\",\"piloto-comercial-mlte-ifr_dolar\":\"U$ 120,88\",\"hora-seca\":\"R$ 900,00\",\"hora-seca_dolar\":\"U$ 154,91\",\"piloto-privado-aviao\":\"R$ 700,00\",\"piloto-privado-aviao_dolar\":\"U$ 120,88\",\"piloto-comercial-mnte-ifr-\":\"R$ 700,00\",\"piloto-comercial-mnte-ifr-_dolar\":\"U$ 120,88\",\"instrutor-de-voo\":\"R$ 700,00\",\"instrutor-de-voo_dolar\":\"U$ 120,48\",\"plano-de-formacao---ciencias-aeronauticas\":\"R$ 900,00\",\"plano-de-formacao---ciencias-aeronauticas_dolar\":\"U$ 154,91\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "114",
			'token' => "5fa96eb88594c",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "tupi-180",
			'meta_descricao' => "",
			'data' => "2020-11-09",
			'atualizado' => "2025-08-07 14:08:29",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"20\",\"preco_litro\":\"\",\"ativar\":\"s\"},\"prefixos\":[\"PT-NXJ\",\"PT-RPE\"]}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"10\",\"valor_credito_horas_unitario\":\"\",\"valor_credito_horas_mensais\":\"0,00\",\"socios\":\"613145c9b79a2,,613145c9b79a2,613145c9b79a2,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,\"}",
			'hora_rescisao' => "900.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "Aeronave de 4 lugares. O Tupi é uma aeronave de fabricação americana, de asa baixa, de fácil pilotagem e com excelente desempenho no treinamento de pilotos. Comporta até quatro ocupantes, devidamente equipada para a realização tanto de voos visuais como por instrumentos.O Piper Arrow é uma econômica aeronave monomotor a pistão de pequeno porte, com construção convencional metálica e com asa baixa, com capacidade para transportar com razoável conforto um piloto e três passageiros, em viagens intermunicipais e interestaduais &lbrack;rotas domésticas&rbrack;, projetada e fabricada em larga escala nos Estados Unidos a partir da década de 1960 pela então Piper Aircraft &lbrack;atualmente New Piper Aircraft&rbrack;, que utilizou como base o modesto projeto de aeronave monomotor a pistão Piper Cherokee, do mesmo fabricante.Sem grandes pretensões de tornar o Piper Cherokee uma aeronave sofisticada para atender às exigências de consumidores e usuários de altíssimo poder aquisitivo, a então Piper Aircraft deu continuidade, na década de 1960, ao desenvolvimento do modesto projeto denominado PA-28, com o lançamento da sua versão melhorada Piper Arrow, com trem de pouso retrátil. Até o final da década de 1980, o Piper Arrow cumpria as pretensões da Piper Aircraft e, atualmente, ainda cumpre praticamente as mesmas pretensões da New Piper de competir no mercado aeronáutico mundial de aviação geral, treinamento e táxi aéreo com uma aeronave relativamente barata, muito econômica, com acabamento simples, fácil de pilotar, projetada para viagens tranquilas com o uso responsável dos instrumentos de bordo, planejadas antecipadamente com cuidado pelo piloto.Atualmente, é possível equipar em oficinas homologadas o Piper Arrow com o stormscope, o GPS e o TCAS, PFD e MFD Aspen ou Garmin 500, entre outros. Na versão mais recente do Arrow, o GPS está disponível de fábrica, integrado ao EFIS &lbrack;Electronic Flight Instrument System&rbrack;, mas o stormscope e o TCAS podem ser adquiridos e instalados em oficinas. O stormscope, o GPS e o TCAS são instrumentos de fundamental importância para viagens seguras e tranquilas, sem surpresas desagradáveis na rota.O Piper Arrow faz parte da família PA-28, lançada pela Piper Aircraft na década de 1960 com a versão Piper Cherokee e, posteriormente, na década de 1970, com os modelos Piper Warrior, Piper Archer e Piper Dakota. No total, incluindo as versões licenciadas para fabricação por outros fabricantes em outros países, incluindo o Brasil, são mais de 32.000 unidades vendidas até hoje, um gigantesco sucesso de vendas, um fenômeno impressionante, é um dos projetos mais conhecidos de aeronaves leves a pistão do mundo, é comum vê-las em hangares ou pátios de aeródromos e aeroportos de cidades do interior.Piper CherokeeAeronave homologada IFR Noturnahora avulsa: R$900,00 por hora &lbrack;Seca&rbrack;Consumo Horário: 30 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "40",
			'nome' => "Combustível",
			'codigo' => "Avgas",
			'pacotes' => "{\"1\":{\"horas_livre\":\"\",\"tabela-hora-padao\":\"\",\"tabela-futura\":\"R$ 11,03\",\"limite\":\"1\"}}",
			'autor' => "22",
			'token' => "6079b45908ad2",
			'ativo' => "s",
			'publicar' => "n",
			'ficha' => "",
			'url' => "combustivel",
			'meta_descricao' => "",
			'data' => "2021-04-16",
			'atualizado' => "2021-09-09 18:09:53",
			'obs' => "",
			'config' => "{\"video\":\"\"}",
			'sociedade' => "{\"ativar\":\"n\",\"socios\":\",\"}",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"14\",\"excluido_data\":\"02/10/2021 19:10:16\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Combustu00edvel\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "41",
			'nome' => "C150 /  C152",
			'codigo' => "C152Rp",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"horas_livre\":\"R$ 370,00\",\"horas_livre_dolar\":\"U$ 75,10\",\"tabela-hora-padao\":\"\",\"tabela-hora-padao_dolar\":\"\",\"hora-avulsa\":\"\",\"hora-avulsa_dolar\":\"U$ 0\",\"moeda\":\"BRL\",\"limite\":\"\"}}",
			'autor' => "14",
			'token' => "63bf0a1a77238",
			'ativo' => "n",
			'publicar' => "n",
			'ficha' => "",
			'url' => "c150-/--c152",
			'meta_descricao' => "Tem a reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável. Com baixa carga alar &lbrack;peso / área das asas&rbrack; e asas de perfil convencional de alta sustentação.",
			'data' => "2023-01-11",
			'atualizado' => "2023-06-06 11:06:56",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"14.5\",\"preco_litro\":\"\",\"ativar\":\"s\"},\"video\":\"\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"n\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Cessna 152 tem reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável, é apreciada para voo de lazer e viagem. Com baixa carga alar &lbrack;peso / área das asas&rbrack; e asas de perfil convencional de alta sustentação, pode operar em pistas curtas e mal preparadas &lbrack;saibro, cascalho, grama, etc&rbrack;.Os flaps são do tipo slotted &lbrack;fenda&rbrack;, e defletem em ângulo de até 40 graus. A atuação dos mesmos é elétrica, com motor instalado na asa direita comandado através de switch no painel.As asas são do tipo alta semi-cantilever e o trem de pouso é do tipo triciclo, fixo, com amortecedores do tipo lâmina no trem principal e hidráulico no trem do nariz e rodas carenadas.O design do Cessna 152 transpira simplicidade e praticidade. O alarme de perda de sustentação, que em outras aeronaves é um dispositivo elétrico, neste Cessna é um mecanismo aerodinâmico, um apito no bordo de ataque acionado pela sucção do ar para fora da asa, sucção esta causada pela depressão barométrica no bordo de ataque da asa. Acontecimento característico da perda de sustentação. As asas altas, por sua vez, abrigam os tanques de combustível. Isto permite a alimentação do motor por gravidade, sem a necessidade de uma bomba de combustível adicional &lbrack;boost pump ou auxiliary pump&rbrack; elétrica. Os amortecedores também mostram a simplicidade do design da Cessna. Do tipo lâmina de aço, os amortecedores do trem de pouso principal não possuem nenhum mecanismo hidráulico como em outras aeronaves da mesma categoria, como os monomotores de asa baixa da Piper Aircraft.CESSNA 152homologada VFR diurna/noturnaConsumo Horário: 20 Litros por Hora &lbrack;aproximadamente&rbrack;solicite seu orçamento clicando aqui.",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"07/08/2023 20:08:28\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|C150 /  C152\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "42",
			'nome' => "CESSNA 152 – IFR NOTURNO",
			'codigo' => "Cessna 152",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\"}}",
			'autor' => "95",
			'token' => "64d178a8de90f",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "cessna-152-–-ifr-noturno",
			'meta_descricao' => "Tem a reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável. Com baixa carga alar &lbrack;peso / área das asas&rbrack; e asas de perfil convencional de alta sustentação.",
			'data' => "2023-08-07",
			'atualizado' => "2025-02-10 15:02:56",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"20\",\"preco_litro\":\"\",\"ativar\":\"s\"},\"video\":\"\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"n\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "800.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Cessna 152 tem reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável, é apreciada para voo de lazer e viagem. Com baixa carga alar &lbrack;peso/área das asas&rbrack; e asas de perfil convencional de alta sustentação, pode operar em pistas curtas e mal preparadas &lbrack;saibro, cascalho, grama, etc&rbrack;.Os flaps são do tipo slotted &lbrack;fenda&rbrack;, e defletem em ângulo de até 40 graus. A atuação dos mesmos é elétrica, com motor instalado na asa direita comandado através de switch no painel.As asas são do tipo alta semi-cantilever e o trem de pouso é do tipo triciclo, fixo, com amortecedores do tipo lâmina no trem principal e hidráulico no trem do nariz e rodas carenadas.O design do Cessna 152 transpira simplicidade e praticidade. O alarme de perda de sustentação, que em outras aeronaves é um dispositivo elétrico, neste Cessna é um mecanismo aerodinâmico, um apito no bordo de ataque acionado pela sucção do ar para fora da asa, sucção esta causada pela depressão barométrica no bordo de ataque da asa. Acontecimento característico da perda de sustentação. As asas altas, por sua vez, abrigam os tanques de combustível. Isto permite a alimentação do motor por gravidade, sem a necessidade de uma bomba de combustível adicional &lbrack;boost pump ou auxiliary pump&rbrack; elétrica. Os amortecedores também mostram a simplicidade do design da Cessna. Do tipo lâmina de aço, os amortecedores do trem de pouso principal não possuem nenhum mecanismo hidráulico como em outras aeronaves da mesma categoria, como os monomotores de asa baixa da Piper Aircraft.CESSNA 152HOMOLOGADA IFR DIURNA/NOTURNAHORA AVULSA: R$900,00 POR HORA SEM COMBUSTÍVELCONSUMO HORÁRIO: 20 LITROS POR HORA &lbrack;APROXIMADAMENTE&rbrack;",
			'reg_excluido' => "{\"excluidopor\":\"14\",\"excluido_data\":\"07/08/2023 20:08:12\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|CESSNA 152 u2013 IFR NOTURNO\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "43",
			'nome' => "Cessna 152 - IFR NOTURNO",
			'codigo' => "Cessna 152",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "95",
			'token' => "64d17a70c8b97",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "cessna-152---ifr-noturno",
			'meta_descricao' => "Tem a reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável. Com baixa carga alar &lbrack;peso / área das asas&rbrack; e asas de perfil convencional de alta sustentação.",
			'data' => "2023-08-07",
			'atualizado' => "2025-02-10 15:02:55",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"12\",\"preco_litro\":\"\",\"ativar\":\"s\"},\"video\":\"\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"n\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "800.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O Cessna 152 tem reputação de aeronave extremamente fácil de pilotar e robusta. Bastante estável, é apreciada para voo de lazer e viagem. Com baixa carga alar &lbrack;peso/área das asas&rbrack; e asas de perfil convencional de alta sustentação, pode operar em pistas curtas e mal preparadas &lbrack;saibro, cascalho, grama, etc&rbrack;.Os flaps são do tipo slotted &lbrack;fenda&rbrack;, e defletem em ângulo de até 40 graus. A atuação dos mesmos é elétrica, com motor instalado na asa direita comandado através de switch no painel.As asas são do tipo alta semi-cantilever e o trem de pouso é do tipo triciclo, fixo, com amortecedores do tipo lâmina no trem principal e hidráulico no trem do nariz e rodas carenadas.O design do Cessna 152 transpira simplicidade e praticidade. O alarme de perda de sustentação, que em outras aeronaves é um dispositivo elétrico, neste Cessna é um mecanismo aerodinâmico, um apito no bordo de ataque acionado pela sucção do ar para fora da asa, sucção esta causada pela depressão barométrica no bordo de ataque da asa. Acontecimento característico da perda de sustentação. As asas altas, por sua vez, abrigam os tanques de combustível. Isto permite a alimentação do motor por gravidade, sem a necessidade de uma bomba de combustível adicional &lbrack;boost pump ou auxiliary pump&rbrack; elétrica. Os amortecedores também mostram a simplicidade do design da Cessna. Do tipo lâmina de aço, os amortecedores do trem de pouso principal não possuem nenhum mecanismo hidráulico como em outras aeronaves da mesma categoria, como os monomotores de asa baixa da Piper Aircraft.CESSNA 152HOMOLOGADA IFR DIURNA/NOTURNAHORA AVULSA:&nbsp;R$900,00&nbsp;POR HORA SEM COMBUSTÍVELCONSUMO HORÁRIO: 20 LITROS POR HORA &lbrack;APROXIMADAMENTE&rbrack;",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"29/08/2023 11:08:41\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Cessna 152 - IFR NOTURNO\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "44",
			'nome' => "Twin Comanche PA-30",
			'codigo' => "PA-30",
			'pacotes' => "{\"1\":{\"piloto-comercial-mlte-ifr\":\"R$ 1.728,58\",\"piloto-comercial-mlte-ifr_dolar\":\"U$ 298,51\",\"hora-seca\":\"R$ 1.950,00\",\"hora-seca_dolar\":\"U$ 602,42\",\"multimotor\":\"R$ 1.728,58\",\"multimotor_dolar\":\"U$ 304,30\",\"revalidacoes-mlte\":\"R$ 3.066,00\",\"revalidacoes-mlte_dolar\":\"U$ 539,05\",\"moeda\":\"USD\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "64d17b788ef7b",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "twin-comanche-pa-30",
			'meta_descricao' => "",
			'data' => "2023-08-07",
			'atualizado' => "2025-07-30 15:07:51",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"50\",\"preco_litro\":\"\",\"ativar\":\"s\"},\"prefixos\":[\"PR-IHL\"]}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"n\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "3500.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "A Aeronave Twin Comanche PA-30 é um exemplo notável de elegância combinada com eficiência nos céus da aviação. Com sua reputação sólida e impressionante desempenho, ela atrai a atenção de pilotos que buscam uma experiência de voo cativante e confiável. Dotada de estabilidade excepcional e capacidade de resposta, a Twin Comanche PA-30 é uma escolha popular tanto para voos recreativos quanto para viagens emocionantes.Seu projeto de baixa carga alar e asas convencionais de alta sustentação a tornam uma aeronave versátil que pode operar em uma variedade de pistas, incluindo aquelas mais curtas e mal preparadas, como saibro, cascalho e grama. Essa versatilidade permite que os pilotos explorem destinos emocionantes e desafiadores, levando a Twin Comanche PA-30 aos limites de sua capacidade.Os flaps slotted, que podem defletir em ângulos impressionantes de até 40 graus, são um dos destaques dessa aeronave. Controlados eletricamente, eles estão estrategicamente localizados na asa direita e podem ser facilmente ajustados por meio de um interruptor no painel. Esses flaps proporcionam um controle extra durante as fases críticas de aproximação e aterrissagem, permitindo que os pilotos operem com confiança em diversas condições de voo.Com asas alta semi-cantilever e um trem de pouso triciclo, a Twin Comanche PA-30 oferece uma experiência de voo suave e estável. Os amortecedores do tipo lâmina no trem principal e o sistema hidráulico no trem do nariz contribuem para uma aterrissagem controlada e confortável. Além disso, suas rodas carenadas aprimoram a aerodinâmica e adicionam um toque de estilo ao design global da aeronave.O Twin Comanche PA-30 abraça a simplicidade e a praticidade em seu projeto, refletindo em características que melhoram a segurança e a confiabilidade do voo. Seu alarme de perda de sustentação é um exemplo impressionante de engenharia aerodinâmica, consistindo em um mecanismo de apito no bordo de ataque, ativado pela pressão atmosférica e sucção do ar. Esse recurso vital alerta os pilotos sobre a perda potencial de sustentação, proporcionando um nível adicional de segurança durante as operações.Além disso, a Twin Comanche PA-30 possui um design inteligente de asas que abrigam os tanques de combustível, permitindo a alimentação do motor por gravidade e eliminando a necessidade de uma bomba de combustível elétrica adicional. Essa abordagem de engenharia simplificada é um testemunho da dedicação à eficiência e confiabilidade.Em conclusão, a Aeronave Twin Comanche PA-30 é um exemplo exemplar de desempenho, elegância e praticidade na aviação. Seja para aventuras emocionantes ou voos tranquilos, a Twin Comanche PA-30 continua a inspirar pilotos a explorar os céus com confiança, provando-se como uma verdadeira obra-prima de engenharia e design aeronáutico.TWIN COMANCHEHomologada IFR diurna/noturnaHora avulsa: R$3.000,00 por hora sem combustívelConsumo Horário: 40 Litros por Hora &lbrack;aproximadamente&rbrack;",
			'reg_excluido' => "",
			'reg_deletado' => "&rbrack;;",
		]);

		$this->insertAeronave([
			'id' => "INSERT INTO `aeronaves` &lbrack;`id`",
			'nome' => "`nome`",
			'codigo' => "`codigo`",
			'pacotes' => "`pacotes`",
			'autor' => "`autor`",
			'token' => "`token`",
			'ativo' => "`ativo`",
			'publicar' => "`publicar`",
			'ficha' => "`ficha`",
			'url' => "`url`",
			'meta_descricao' => "`meta_descricao`",
			'data' => "`data`",
			'atualizado' => "`atualizado`",
			'obs' => "`obs`",
			'config' => "`config`",
			'sociedade' => "`sociedade`",
			'hora_rescisao' => "`hora_rescisao`",
			'ordenar' => "`ordenar`",
			'excluido' => "`excluido`",
			'excluido_por' => "`excluido_por`",
			'deletado' => "`deletado`",
			'deletado_por' => "`deletado_por`",
			'descricao' => "`descricao`",
			'reg_excluido' => "`reg_excluido`",
			'reg_deletado' => "`reg_deletado`&rbrack; VALUES",
		]);

		$this->insertAeronave([
			'id' => "45",
			'nome' => "Uirapuru - T-23",
			'codigo' => "T-23",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"piloto-comercial-mlte-ifr\":\"R$ 600,00\",\"piloto-comercial-mlte-ifr_dolar\":\"U$ 103,27\",\"hora-seca\":\"R$ 600,00\",\"hora-seca_dolar\":\"U$ 106,26\",\"moeda\":\"BRL\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "64d17cb86ff7b",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "uirapuru---t-23",
			'meta_descricao' => "",
			'data' => "2023-08-07",
			'atualizado' => "2025-05-12 14:05:57",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"25\",\"preco_litro\":\"\",\"ativar\":\"s\"},\"prefixos\":[\"PT-LMW\",\"PT-GAC\"]}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"n\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "900.00",
			'ordenar' => "0",
			'excluido' => "n",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "O AEROTEC 122 é um avião para dois tripulantes, destinado ao treinamento primário de pilotos. O primeiro protótipo &lbrack;PP-ZTF&rbrack; voou em 1965, sendo que os aparelhos seguintes sofreram modificações significativas para atenderem às necessidades do Ministério da Aeronáutica, que adquiriu mais de 70 aviões para a Academia da Força Aérea Brasileira, em 1969.Período de Utilização: 1968 até os dias atuais.Aeronave ainda utilizada pelo Aeroclube de Brasília &lbrack;ICAO SWUZ&rbrack;, sediado na cidade de Luziânia-GO, pelo Aeroclube de Poços de Caldas &lbrack;ICAO SBPC&rbrack;, sediado na cidade de Poços de Caldas-MG e pelo Aeroclube de Juiz de Fora &lbrack;ICAO SBJF&rbrack;, sediado na cidade de Juiz de Fora-MG.Emprego: Treinamento Primário.Modelos: A-122A &lbrack;Militar&rbrack; e A-122B &lbrack;Civil&rbrack;.Quantidade Total Produzida: 126.Designação: T-23 &lbrack;FAB&rbrack;.Matrículas FAB: 0940 a 0999 e 1730 a 1745.DimensõesEnvergadura: 8,5 mComprimento: 6,5 mAltura: 2,6 mPesoPeso bruto de decolagem: 840 kgMotorLycoming 0-320-B2B com 4 cilindros opostos horizontais. Carter úmido, refrigerado a ar, sem redução entre hélice e eixo, desenvolve potencia de 160 HP a 2700 RPM ao nível do mar, nas condições de atmosfera padrão. &lbrack;ISA&rbrack;T-23Homologada VFR diurna/noturnaHora avulsa: R$900,00 por hora sem combustívelConsumo Horário: 30 Litros por Hora &lbrack;aproximadamente&rbrack;",
			'reg_excluido' => "",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "46",
			'nome' => "Cessna 172 R",
			'codigo' => "Cessna 172 R",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"moeda\":\"BRL\",\"limite\":\"\"},\"2\":{\"moeda\":\"BRL\",\"limite\":\"\"}}",
			'autor' => "95",
			'token' => "64e89fab41455",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "cessna-172-r",
			'meta_descricao' => "",
			'data' => "2023-08-25",
			'atualizado' => "2025-02-10 15:02:56",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"20\",\"preco_litro\":\"\",\"ativar\":\"s\"},\"video\":\"\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"n\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "900.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"137\",\"excluido_data\":\"28/08/2023 15:08:53\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Cessna 172 R\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "47",
			'nome' => "Cessna 152 / Intensivo",
			'codigo' => "",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"moeda\":\"BRL\",\"limite\":\"1\"},\"2\":{\"moeda\":\"BRL\",\"limite\":\"\"}}",
			'autor' => "95",
			'token' => "65033c50dcda6",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "cessna-152-/-intensivo",
			'meta_descricao' => "",
			'data' => "2023-09-14",
			'atualizado' => "2025-02-10 15:02:56",
			'obs' => "",
			'config' => "{\"combustivel\":{\"consumo_hora\":\"169.56\",\"preco_litro\":\"\",\"ativar\":\"s\"},\"video\":\"\"}",
			'sociedade' => "{\"ativar\":\"n\",\"credito_horas_mensais\":\"\",\"valor_credito_horas_unitario\":\"n\",\"valor_credito_horas_mensais\":\"n\",\"socios\":\"\"}",
			'hora_rescisao' => "800.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"14\",\"excluido_data\":\"14/09/2023 14:09:16\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Cessna 152 / Intensivo\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "48",
			'nome' => "Teorico de PPA",
			'codigo' => "",
			'pacotes' => "{\"1\":{\"moeda\":\"BRL\",\"limite\":\"1\"}}",
			'autor' => "95",
			'token' => "67d21884cc2f7",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "teorico-de-ppa",
			'meta_descricao' => "",
			'data' => "2025-03-12",
			'atualizado' => "2025-08-26 13:08:31",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "397.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"14\",\"excluido_data\":\"13/03/2025 12:03:53\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Teorico de PPA\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "49",
			'nome' => "Teorico de PCA",
			'codigo' => "",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"plano-de-formacao---ciencias-aeronauticas\":\"R$ 4,75\",\"plano-de-formacao---ciencias-aeronauticas_dolar\":\"U$ 0,82\",\"moeda\":\"BRL\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "67d2189eb09d4",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "teorico-de-pca",
			'meta_descricao' => "",
			'data' => "2025-03-12",
			'atualizado' => "2025-03-12 21:03:53",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"14\",\"excluido_data\":\"13/03/2025 12:03:53\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Teorico de PCA\"}",
			'reg_deletado' => "",
		]);

		$this->insertAeronave([
			'id' => "50",
			'nome' => "Teorico de INVA",
			'codigo' => "",
			'pacotes' => "{\"1\":{\"custo_real\":\"0\",\"custo_dolar\":\"0\",\"plano-de-formacao---ciencias-aeronauticas\":\"R$ 23,00\",\"plano-de-formacao---ciencias-aeronauticas_dolar\":\"U$ 3,97\",\"moeda\":\"BRL\",\"limite\":\"1\"}}",
			'autor' => "14",
			'token' => "67d218bee27fd",
			'ativo' => "s",
			'publicar' => "s",
			'ficha' => "",
			'url' => "teorico-de-inva",
			'meta_descricao' => "",
			'data' => "2025-03-12",
			'atualizado' => "2025-03-12 21:03:53",
			'obs' => "",
			'config' => "",
			'sociedade' => "",
			'hora_rescisao' => "0.00",
			'ordenar' => "0",
			'excluido' => "s",
			'excluido_por' => "",
			'deletado' => "n",
			'deletado_por' => "",
			'descricao' => "",
			'reg_excluido' => "{\"excluidopor\":\"14\",\"excluido_data\":\"13/03/2025 12:03:53\",\"tab\":\"aeronaves\",\"nome\":\"Aeronaves|Teorico de INVA\"}",
			'reg_deletado' => "",
		]);
	}
}
