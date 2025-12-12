<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class Curso extends Model
{
    /**
     * Nome da tabela.
     */
    protected $table = 'cursos';

    /**
     * Atributos liberados para atribuição em massa.
     */
    protected $fillable = [
        'nome',
        'titulo',
        'slug',
        'descricao',
        'obs',
        'professor',
        'ativo',
        'destaque',
        'publicar',
        'duracao',
        'unidade_duracao',
        'tipo',
        'categoria',
        'token',
        'autor',
        'config',
        'modulos',
        'inscricao',
        'valor',
        'parcelas',
        'valor_parcela',
        // Campos de lixeira
        'excluido',
        'deletado',
        'excluido_por',
        'deletado_por',
        'reg_excluido',
        'reg_deletado',
    ];

    /**
     * Casts de atributos.
     */
    protected $casts = [
        'config' => 'array',
        'modulos' => 'array',
        'duracao' => 'integer',
        'parcelas' => 'integer',
        'reg_excluido' => 'array',
        'reg_deletado' => 'array',
    ];

    /**
     * Escopo global para ocultar registros marcados como excluídos/deletados.
     */
    protected static function booted()
    {
        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });
    }

    /**
     * Normaliza valor decimal aceitando vírgula e ponto.
     */
    private function normalizeDecimal(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_string($value)) {
            $normalized = str_replace(',', '.', trim($value));
        } else {
            $normalized = (string) $value;
        }
        if (!is_numeric($normalized)) {
            return null;
        }
        return number_format((float) $normalized, 2, '.', '');
    }

    /**
     * Define 'inscricao' com normalização de decimal.
     */
    public function setInscricaoAttribute($value): void
    {
        $this->attributes['inscricao'] = $this->normalizeDecimal($value);
    }

    /**
     * Define 'valor' com normalização de decimal.
     */
    public function setValorAttribute($value): void
    {
        $this->attributes['valor'] = $this->normalizeDecimal($value);
    }

    /**
     * Define 'valor_parcela' com normalização de decimal.
     */
    public function setValorParcelaAttribute($value): void
    {
        $this->attributes['valor_parcela'] = $this->normalizeDecimal($value);
    }

    /**
     * Define enum 'ativo' aceitando somente 's' | 'n'.
     */
    public function setAtivoAttribute($value): void
    {
        $v = is_string($value) ? strtolower(trim($value)) : $value;
        $this->attributes['ativo'] = ($v === 's' || $v === 'n') ? $v : 'n';
    }

    /**
     * Define enum 'destaque' aceitando somente 's' | 'n'.
     */
    public function setDestaqueAttribute($value): void
    {
        $v = is_string($value) ? strtolower(trim($value)) : $value;
        $this->attributes['destaque'] = ($v === 's' || $v === 'n') ? $v : 'n';
    }

    /**
     * Define enum 'publicar' aceitando somente 's' | 'n'.
     */
    public function setPublicarAttribute($value): void
    {
        $v = is_string($value) ? strtolower(trim($value)) : $value;
        $this->attributes['publicar'] = ($v === 's' || $v === 'n') ? $v : 'n';
    }

    /**
     * Limpa strings removendo crases e espaços.
     */
    private function stripTicks(?string $value): ?string
    {
        if ($value === null) return null;
        $trimmed = trim($value);
        return trim($trimmed, " `\"'\t\n\r");
    }

    /**
     * Define 'nome' sanitizado.
     */
    public function setNomeAttribute($value): void
    {
        $this->attributes['nome'] = $this->stripTicks((string) $value) ?? '';
    }

    /**
     * Define 'titulo' sanitizado.
     */
    public function setTituloAttribute($value): void
    {
        $this->attributes['titulo'] = $this->stripTicks($value);
    }

    /**
     * Define 'token' sanitizado.
     */
    public function setTokenAttribute($value): void
    {
        $this->attributes['token'] = $this->stripTicks($value);
    }

    /**
     * Define 'autor' como string sanitizada.
     */
    public function setAutorAttribute($value): void
    {
        $this->attributes['autor'] = $this->stripTicks(is_null($value) ? null : (string) $value);
    }

    /**
     * Sanitiza recursivamente strings em um array (remove crases/aspas).
     */
    private function sanitizeArrayStrings(mixed $value): mixed
    {
        if (is_array($value)) {
            $out = [];
            foreach ($value as $k => $v) {
                $out[$k] = $this->sanitizeArrayStrings($v);
            }
            return $out;
        }
        if (is_string($value)) {
            return $this->stripTicks($value);
        }
        return $value;
    }

    /**
     * Define 'config' aceitando objeto/array, removendo crases (ex.: video com `...`).
     */
    public function setConfigAttribute($value): void
    {
        $arr = null;
        if (is_array($value)) {
            $arr = $value;
        } elseif (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            $arr = is_array($decoded) ? $decoded : null;
        }
        if ($arr === null) {
            $this->attributes['config'] = null;
            return;
        }
        $clean = $this->sanitizeArrayStrings($arr);
        // Atribui como JSON; cast cuidará do decode ao ler
        $this->attributes['config'] = json_encode($clean);
    }


    /**
     * Define 'modulos' como array sanitizado com tipos coerentes.
     * Converte 'limite' para inteiro quando possível e limpa strings.
     * Aceita array nativo ou string JSON.
     */
    public function setModulosAttribute($value): void
    {
        $arr = null;
        if (is_array($value)) {
            $arr = $value;
        } elseif (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            $arr = is_array($decoded) ? $decoded : null;
        }
        if ($arr === null) {
            $this->attributes['modulos'] = null;
            return;
        }

        $cleanModules = [];
        // PT: Helpers locais para validação/normalização de conteúdo.
        // EN: Local helpers for content validation/normalization.
        $isLikelyUrl = function($s) {
            if (!is_string($s) || $s === '') return false;
            $s = trim($s);
            if (Str::startsWith($s, ['http://', 'https://'])) {
                return filter_var($s, FILTER_VALIDATE_URL) !== false;
            }
            return false;
        };
        $limitText = function($s, $max = 600) {
            if (!is_string($s)) return $s;
            $plain = strip_tags($s);
            return Str::limit($plain, $max, '...');
        };
        foreach ($arr as $mod) {
            if (!is_array($mod)) {
                // Ignora itens não array
                continue;
            }
            $m = $this->sanitizeArrayStrings($mod);
            // Normalizar limite para inteiro quando aplicável
            if (isset($m['limite']) && $m['limite'] !== null) {
                $m['limite'] = is_numeric($m['limite']) ? (int) $m['limite'] : 0;
            }
            // Sanitizar lista 'aviao' quando presente
            if (isset($m['aviao'])) {
                if (is_array($m['aviao'])) {
                    $avClean = [];
                    foreach ($m['aviao'] as $av) {
                        $avClean[] = is_string($av) ? $this->stripTicks($av) : $av;
                    }
                    $m['aviao'] = $avClean;
                } elseif (is_string($m['aviao']) && $m['aviao'] !== '') {
                    $decodedAv = json_decode($m['aviao'], true);
                    $m['aviao'] = is_array($decodedAv) ? $decodedAv : [];
                } else {
                    $m['aviao'] = [];
                }
            }

            // PT: Normaliza campos pesados no nível do módulo para evitar inflar o JSON
            // EN: Normalize heavy fields at module level to avoid inflating JSON
            if (isset($m['content']) && is_string($m['content'])) {
                $m['content'] = $isLikelyUrl($m['content']) ? trim($m['content']) : null;
            }
            if (isset($m['description']) && is_string($m['description'])) {
                if (Str::length($m['description']) > 1000) {
                    $m['description'] = $limitText($m['description']);
                }
            }
            if (isset($m['duration'])) {
                if (is_string($m['duration']) && is_numeric($m['duration'])) {
                    $m['duration'] = (string) (int) $m['duration'];
                } elseif (is_int($m['duration'])) {
                    $m['duration'] = (string) $m['duration'];
                }
            }

            // PT: Normaliza atividades internas para manter apenas dados essenciais e URLs válidas
            // EN: Normalize inner activities to keep only essential data and valid URLs
            if (isset($m['atividades']) && is_array($m['atividades'])) {
                $acts = [];
                foreach ($m['atividades'] as $act) {
                    if (!is_array($act)) continue;
                    $a = $this->sanitizeArrayStrings($act);
                    if (isset($a['description']) && is_string($a['description']) && Str::length($a['description']) > 1000) {
                        $a['description'] = $limitText($a['description']);
                    }
                    if (isset($a['content'])) {
                        $a['content'] = $isLikelyUrl($a['content']) ? trim($a['content']) : null;
                    }
                    if (isset($a['duration'])) {
                        if (is_string($a['duration']) && is_numeric($a['duration'])) {
                            $a['duration'] = (string) (int) $a['duration'];
                        } elseif (is_int($a['duration'])) {
                            $a['duration'] = (string) $a['duration'];
                        }
                    }
                    $acts[] = $a;
                }
                $m['atividades'] = $acts;
            }
            $cleanModules[] = $m;
        }

        $this->attributes['modulos'] = json_encode($cleanModules);
    }

    /**
     * Define 'duracao' como inteiro seguro.
     */
    public function setDuracaoAttribute($value): void
    {
        $this->attributes['duracao'] = is_numeric($value) ? (int) $value : 0;
    }

    /**
     * Define 'parcelas' como inteiro seguro.
     */
    public function setParcelasAttribute($value): void
    {
        $this->attributes['parcelas'] = is_numeric($value) ? (int) $value : 1;
    }

    /**
     * Gera um slug único para cursos.
     * EN: Generate a unique slug for courses.
     *
     * Regras:
     * - Baseado em `Str::slug($title)`.
     * - Evita colisão iterando sufixos `-N` até ser único.
     * - Em updates, pode ignorar o próprio registro via `$ignoreId`.
     *
     * @param string $title      Base para o slug.
     * @param int|null $ignoreId ID a ser ignorado na checagem (em updates).
     * @return string            Slug único.
     */
    public function generateSlug($title, ?int $ignoreId = null): string
    {
        $base = Str::slug((string) $title);
        if ($base === '') {
            $base = 'curso';
        }

        $candidate = $base;
        $suffix = 0;

        // Itera sufixos até encontrar um slug único
        // EN: Iterate suffix until finding a unique slug
        while (
            static::withoutGlobalScope('notDeleted')
                ->when($ignoreId !== null, function ($q) use ($ignoreId) {
                    $q->where('id', '!=', $ignoreId);
                })
                ->where('slug', $candidate)
                ->exists()
        ) {
            $suffix++;
            $candidate = $base . '-' . $suffix;
        }

        return $candidate;
    }
}