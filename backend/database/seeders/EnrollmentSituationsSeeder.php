<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class EnrollmentSituationsSeeder extends Seeder
{
    /**
     * Executa o seed das situações de matrícula usando a tabela `posts`.
     * EN: Seeds enrollment situations into `posts` table.
     *
     * Campos mapeados:
     * - post_type = 'situacao_matricula'
     * - post_title  <= Nome amigável (e.g. 'Interessado')
     * - post_name   <= Código/slug curto (e.g. 'int')
     * - post_excerpt<= Grupo/coleção (e.g. 'interessados')
     * - post_status <= Ativo ('s' ou 'n')
     * - menu_order  <= Ordem de exibição
     * - post_content<= Descrição
     * EN: Field mapping above.
     */
    public function run(): void
    {
        $postType = 'situacao_matricula';

        // Lista oficial de situações
        $items = [
            // [id, title, code, group, ativo, order, to_ping, pinged, excluido, deletado, description]
            [1, 'Interessado', 'int', 'interessados', 's', 1, 'n', '', 'n', '', 'Pessoas que têm o tiveram algum interesse'],
            [2, 'Matriculado', 'mat', 'matriculados', 's', 2, 'n', '', 'n', '', 'Pessoas Matriculadas que a turma não começou, ou que ainda não assinaram o contrato'],
            [3, 'Realocar', 'alu', 'Realocar', 's', 6, 'n', '', 'n', '', 'Pessoa Matriculada que já pagou e assinou o contrato mais não compareceram no dia de inicio da turma'],
            [4, 'Cursando', 'cur', '', 's', 3, 'n', '', 'n', '', 'Que esta Cursando '],
            [5, 'Cursos Concluído', 'ccn', '', 's', 4, 'n', '', 'n', '', 'que ja concluiu'],
            [6, 'Black List', 'blt', 'black_list', 's', 8, 'n', '', 'n', '', 'que está na lista negra por ter débitos'],
            [7, 'Sequencia LTV', 'ltv', 'sequencia_ltv', 's', 5, 'n', '', 'n', '', 'Sequencia '],
            [8, 'Rescisão de contrato', 'rc', 'sequencia_ltv', 's', 7, 'n', '', 'n', '', 'Sequencia '],
            [9, 'Contrato cancelado', 'cn', 'contrato_cancelado', 's', 7, 'n', '', 'n', '', 'Contrato cancelado'],
        ];

        // Tokens de post_name para limpeza controlada
        $postNames = array_map(fn($i) => $i[2], $items);

        // Remove registros do mesmo post_type que não estão na lista
        DB::table('posts')
            ->where('post_type', $postType)
            ->whereNotIn('post_name', $postNames)
            ->delete();

        // Insere/atualiza cada item
        foreach ($items as [$id, $title, $code, $group, $ativo, $order, $toPing, $pinged, $excluido, $deletado, $description]) {
            DB::table('posts')->updateOrInsert(
                [
                    'post_name' => $code,
                    'post_type' => $postType,
                ],
                [
                    // Conteúdo e identificação
                    'post_title'      => $title,
                    'post_content'    => $description,
                    'post_excerpt'    => $group,
                    // Status e ordenação
                    'post_status'     => $ativo, // 's' ou 'n'
                    'menu_order'      => (int) $order,
                    // Flags e ping
                    'to_ping'         => $toPing ?: 'n',
                    'pinged'          => $pinged,
                    'excluido'        => $excluido ?: 'n',
                    'deletado'        => $deletado ?: 'n',
                    // Metadados
                    'comment_status'  => 'closed',
                    'ping_status'     => 'closed',
                    // Timestamps
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ]
            );
        }
    }
}