<?php

namespace App\Services\Ai;

use App\Models\AiAgent;
use App\Models\Curso;
use App\Models\Product;
use App\Services\Qlib;
use Illuminate\Support\Str;

/**
 * Monta o contexto do catálogo (cursos e produtos) para o agente responder
 * com valores e links reais da instituição.
 */
class CatalogContextService
{
    /**
     * Retorna um bloco de texto com cursos e produtos ativos.
     * Retorna string vazia quando o agente não usa catálogo ou não há itens.
     */
    public function build(AiAgent $agent): string
    {
        if (!$agent->useCatalog()) {
            return '';
        }

        $sections = [];
        $frontend = rtrim((string) (Qlib::get_frontend_url() ?: config('app.url')), '/');

        // ─── Cursos ────────────────────────────────────────────────────────
        try {
            $cursos = Curso::query()
                ->where('ativo', 's')
                ->where('publicar', 's')
                ->where('excluido', 'n')
                ->orderByDesc('updated_at')
                ->limit((int) $agent->setting('catalog_courses_limit', 40))
                ->get(['id', 'nome', 'titulo', 'slug', 'descricao', 'valor', 'parcelas', 'valor_parcela', 'duracao', 'unidade_duracao', 'categoria']);

            if ($cursos->isNotEmpty()) {
                $lines = $cursos->map(function (Curso $curso) use ($frontend) {
                    $title = $curso->titulo ?: $curso->nome;
                    $link = $frontend . '/cursos/' . ($curso->slug ?: $curso->id);
                    $details = [];

                    if ($curso->valor !== null && (float) $curso->valor > 0) {
                        $details[] = 'valor R$ ' . number_format((float) $curso->valor, 2, ',', '.');
                    }

                    if ((int) $curso->parcelas > 1 && (float) $curso->valor_parcela > 0) {
                        $details[] = $curso->parcelas . 'x de R$ ' . number_format((float) $curso->valor_parcela, 2, ',', '.');
                    }

                    if ((int) $curso->duracao > 0) {
                        $details[] = 'duração ' . $curso->duracao . ' ' . ($curso->unidade_duracao ?: 'h');
                    }

                    if ($curso->categoria) {
                        $details[] = 'categoria ' . $curso->categoria;
                    }

                    $description = Str::limit(trim(strip_tags((string) $curso->descricao)), 220);

                    return '- Curso: ' . $title
                        . ($details ? ' | ' . implode(' | ', $details) : '')
                        . ($description ? ' | ' . $description : '')
                        . ' | link: ' . $link;
                });

                $sections[] = "CURSOS DISPONÍVEIS:\n" . $lines->implode("\n");
            }
        } catch (\Throwable $e) {
            // Catálogo é opcional; nunca derruba o atendimento.
        }

        // ─── Produtos da loja ──────────────────────────────────────────────
        try {
            $products = Product::query()
                ->where('post_type', 'products')
                ->where('post_status', 'publish')
                ->orderByDesc('created_at')
                ->limit((int) $agent->setting('catalog_products_limit', 40))
                ->get(['ID', 'post_title', 'post_excerpt', 'post_content', 'post_name', 'post_value2']);

            if ($products->isNotEmpty()) {
                $lines = $products->map(function (Product $product) use ($frontend) {
                    $description = Str::limit(trim(strip_tags((string) ($product->post_excerpt ?: $product->post_content))), 180);
                    $price = (float) ($product->post_value2 ?? 0);

                    return '- Produto: ' . $product->post_title
                        . ($price > 0 ? ' | preço R$ ' . number_format($price, 2, ',', '.') : '')
                        . ($description ? ' | ' . $description : '')
                        . ' | link: ' . $frontend . '/produtos/' . $product->post_name;
                });

                $sections[] = "PRODUTOS DA LOJA:\n" . $lines->implode("\n");
            }
        } catch (\Throwable $e) {
            // idem
        }

        if (empty($sections)) {
            return '';
        }

        return "### Catálogo da instituição\n" . implode("\n\n", $sections);
    }
}
