<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Curso;
use App\Models\Product;
use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SeoController extends Controller
{
    /**
     * Resolve base URL tenant-aware (usa host original + scheme)
     * Inclui porta quando não é padrão (ex: 4000 em dev) via getHttpHost()
     * para que links do sitemap apontem para o frontend (hair.localhost:4000)
     * e não para :80 onde nada escuta (NS_ERROR_CONNECTION_REFUSED).
     */
    private function baseUrl(Request $request): string
    {
        $scheme = $request->getScheme() ?: 'https';
        // X-Forwarded-Proto header (via nginx)
        $forwarded = $request->header('X-Forwarded-Proto');
        if ($forwarded) $scheme = explode(',', $forwarded)[0];
        // X-Forwarded-Host preserva host:port original quando via proxy
        $forwardedHost = $request->header('X-Forwarded-Host');
        if ($forwardedHost) {
            $host = explode(',', $forwardedHost)[0];
            $host = trim($host);
        } else {
            // getHttpHost inclui porta (ex: hair.localhost:4000) enquanto getHost() não
            $host = $request->getHttpHost();
        }
        // Normaliza: remove porta padrão 80/443 para produção
        if (preg_match('/^(.+):(80|443)$/', $host, $m)) {
            // Em https a porta 443 é implícita; em http 80 também
            $port = $m[2];
            if (($scheme === 'http' && $port === '80') || ($scheme === 'https' && $port === '443')) {
                $host = $m[1];
            }
        }
        return rtrim($scheme . '://' . $host, '/');
    }

    private function tenantCacheKey(string $suffix, Request $request): string
    {
        $tenantId = 'central';
        try {
            if (function_exists('tenant') && tenant()) {
                $tenantId = tenant('id') ?? $request->getHost();
            } else {
                $tenantId = $request->getHost();
            }
        } catch (\Throwable $e) {
            $tenantId = $request->getHost();
        }
        return 'seo_' . $suffix . '_' . md5($tenantId);
    }

    /**
     * GET /robots.txt
     * pt-BR: Gera robots.txt tenant-aware (Disallow /admin /aluno /api)
     */
    public function robots(Request $request)
    {
        $base = $this->baseUrl($request);
        $content = implode("\n", [
            "User-agent: *",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /aluno",
            "Disallow: /api",
            "Disallow: /admin/",
            "Disallow: /aluno/",
            "Disallow: /api/",
            "",
            "Sitemap: {$base}/sitemap.xml",
            "",
        ]);
        return response($content, 200)->header('Content-Type', 'text/plain; charset=utf-8');
    }

    /**
     * GET /sitemap.xml
     * pt-BR: Gera sitemap.xml apenas com registros ativos e publicados
     */
    public function sitemap(Request $request)
    {
        // Geração sem cache com tags (file store não suporta tagging sob tenancy)
        // Cache tenant-aware seria ideal com redis, mas em dev/file gera exceção "This cache store does not support tagging"
        $xml = (function () use ($request) {
            $base = $this->baseUrl($request);
            $now = now()->toAtomString();

            $urls = [];

            // Home (highest priority)
            $urls[] = [
                'loc' => $base . '/',
                'lastmod' => $now,
                'changefreq' => 'daily',
                'priority' => '1.0',
            ];
            // Collections
            $urls[] = [
                'loc' => $base . '/cursos',
                'lastmod' => $now,
                'changefreq' => 'daily',
                'priority' => '0.8',
            ];
            $urls[] = [
                'loc' => $base . '/produtos',
                'lastmod' => $now,
                'changefreq' => 'daily',
                'priority' => '0.7',
            ];

            // Cursos: apenas ativos e publicados (resposta 4)
            try {
                $cursos = Curso::where('ativo', 's')
                    ->where('publicar', 's')
                    ->limit(5000)
                    ->get(['slug', 'updated_at', 'id']);
                foreach ($cursos as $c) {
                    $slug = $c->slug ?: $c->id;
                    if (!$slug) continue;
                    $urls[] = [
                        'loc' => $base . '/cursos/' . $slug,
                        'lastmod' => $c->updated_at ? $c->updated_at->toAtomString() : $now,
                        'changefreq' => 'weekly',
                        'priority' => '0.6',
                    ];
                    // Detalhes variation
                    $urls[] = [
                        'loc' => $base . '/cursos/' . $slug . '/detalhes',
                        'lastmod' => $c->updated_at ? $c->updated_at->toAtomString() : $now,
                        'changefreq' => 'weekly',
                        'priority' => '0.5',
                    ];
                }
            } catch (\Throwable $e) {
                // ignore
            }

            // Produtos: post_status = publish (ativo)
            try {
                $products = Product::where('post_status', 'publish')
                    ->limit(5000)
                    ->get(['post_name', 'updated_at', 'ID']);
                foreach ($products as $p) {
                    $slug = $p->post_name ?: $p->ID;
                    if (!$slug) continue;
                    $urls[] = [
                        'loc' => $base . '/produtos/' . $slug,
                        'lastmod' => $p->updated_at ? $p->updated_at->toAtomString() : $now,
                        'changefreq' => 'weekly',
                        'priority' => '0.5',
                    ];
                }
            } catch (\Throwable $e) {}

            // Pages: publish
            try {
                $pages = Page::where('post_status', 'publish')
                    ->limit(5000)
                    ->get(['post_name', 'updated_at']);
                foreach ($pages as $pg) {
                    $slug = $pg->post_name;
                    if (!$slug) continue;
                    $urls[] = [
                        'loc' => $base . '/pagina/' . $slug,
                        'lastmod' => $pg->updated_at ? $pg->updated_at->toAtomString() : $now,
                        'changefreq' => 'weekly',
                        'priority' => '0.4',
                    ];
                }
            } catch (\Throwable $e) {}

            // Build XML
            $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
            $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
            foreach ($urls as $u) {
                $xml .= "  <url>\n";
                $xml .= "    <loc>" . e($u['loc']) . "</loc>\n";
                $xml .= "    <lastmod>" . e($u['lastmod']) . "</lastmod>\n";
                $xml .= "    <changefreq>" . e($u['changefreq']) . "</changefreq>\n";
                $xml .= "    <priority>" . e($u['priority']) . "</priority>\n";
                $xml .= "  </url>\n";
            }
            $xml .= '</urlset>';
            return $xml;
        })();

        return response($xml, 200)->header('Content-Type', 'application/xml; charset=utf-8');
    }
}
