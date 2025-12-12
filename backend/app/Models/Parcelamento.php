<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class Parcelamento extends Model
{
    /**
     * Nome da tabela.
     */
    protected $table = 'parcelamentos';

    /**
     * Campos permitidos para atribuição em massa.
     */
    protected $fillable = [
        'id_curso',
        'nome',
        'slug',
        'ativo',
        'qtd_parcelas',
        'valor_total',
        'valor_parcela',
        'entrada',
        'desconto',
        'juros_percent',
        'tipo_juros',
        'metodo_pagamento',
        'periodicidade',
        'inicio_vigencia',
        'fim_vigencia',
        'obs',
        'config',
        // Lixeira
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
        'qtd_parcelas' => 'integer',
        'valor_total' => 'decimal:2',
        'valor_parcela' => 'decimal:2',
        'entrada' => 'decimal:2',
        'desconto' => 'decimal:2',
        'juros_percent' => 'decimal:3',
        'inicio_vigencia' => 'date',
        'fim_vigencia' => 'date',
        'config' => 'array',
        'reg_excluido' => 'array',
        'reg_deletado' => 'array',
    ];

    /**
     * Escopo global para ocultar registros excluídos/deletados.
     */
    protected static function booted()
    {
        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $table = $builder->getModel()->getTable();
            $builder->where(function($q) use ($table) {
                $q->whereNull($table.'.excluido')->orWhere($table.'.excluido', '!=', 's');
            })->where(function($q) use ($table) {
                $q->whereNull($table.'.deletado')->orWhere($table.'.deletado', '!=', 's');
            });
        });
    }

    /**
     * Normaliza valores decimais recebendo vírgula ou ponto.
     */
    private function normalizeDecimal(mixed $value): ?string
    {
        if ($value === null || $value === '') { return null; }
        $normalized = is_string($value) ? str_replace(',', '.', trim($value)) : (string) $value;
        if (!is_numeric($normalized)) { return null; }
        return number_format((float) $normalized, 2, '.', '');
    }

    /**
     * Setters para campos decimais.
     */
    public function setValorTotalAttribute($value): void { $this->attributes['valor_total'] = $this->normalizeDecimal($value); }
    public function setValorParcelaAttribute($value): void { $this->attributes['valor_parcela'] = $this->normalizeDecimal($value); }
    public function setEntradaAttribute($value): void { $this->attributes['entrada'] = $this->normalizeDecimal($value); }
    public function setDescontoAttribute($value): void { $this->attributes['desconto'] = $this->normalizeDecimal($value); }

    /**
     * Define enum 'ativo' aceitando somente 's' | 'n'.
     */
    public function setAtivoAttribute($value): void
    {
        $v = is_string($value) ? strtolower(trim($value)) : $value;
        $this->attributes['ativo'] = ($v === 's' || $v === 'n') ? $v : 's';
    }

    /**
     * Relação com curso.
     */
    public function curso()
    {
        return $this->belongsTo(Curso::class, 'id_curso');
    }

    /**
     * Relação N:N com matrículas através da tabela pivot.
     * EN: Many-to-many relation to enrollments via pivot table.
     */
    public function matriculas()
    {
        return $this->belongsToMany(Matricula::class, 'matricula_parcelamento', 'parcelamento_id', 'matricula_id')->withTimestamps();
    }
}