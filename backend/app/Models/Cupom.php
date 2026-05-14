<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Cupom extends Model
{
    use HasFactory;

    protected $table = 'cupons';

    protected $fillable = [
        'codigo',
        'tipo',
        'valor_desconto',
        'validade_inicio',
        'validade_fim',
        'limite_uso',
        'usos',
        'valor_minimo',
        'ativo',
        'descricao',
        'cursos_ids',
        'excluido',
        'deletado',
        'excluido_por',
        'deletado_por',
        'reg_excluido',
        'reg_deletado',
    ];

    protected $casts = [
        'validade_inicio' => 'datetime',
        'validade_fim' => 'datetime',
        'reg_excluido' => 'array',
        'reg_deletado' => 'array',
        'valor_desconto' => 'decimal:2',
        'valor_minimo' => 'decimal:2',
    ];

    public function cursos(): BelongsToMany
    {
        return $this->belongsToMany(Curso::class, 'cupom_curso', 'cupom_id', 'curso_id');
    }

    protected static function booted()
    {
        static::addGlobalScope('notDeleted', function (Builder $builder) {
            $builder->where(function ($q) {
                $q->whereNull('excluido')->orWhere('excluido', '!=', 's');
            })->where(function ($q) {
                $q->whereNull('deletado')->orWhere('deletado', '!=', 's');
            });
        });
    }

    /**
     * Valida se o cupom está válido para uso.
     * Retorna array com status e mensagens.
     */
    public function validar(float $valorCompra, ?int $cursoId = null): array
    {
        if ($this->ativo !== 's') {
            return ['valido' => false, 'mensagem' => 'Cupom inativo.'];
        }

        $agora = now();

        if ($this->validade_inicio && $agora->lt($this->validade_inicio)) {
            return ['valido' => false, 'mensagem' => 'Cupom ainda não está válido.'];
        }

        if ($this->validade_fim && $agora->gt($this->validade_fim)) {
            return ['valido' => false, 'mensagem' => 'Cupom expirado.'];
        }

        if ($this->limite_uso !== null && $this->usos >= $this->limite_uso) {
            return ['valido' => false, 'mensagem' => 'Limite de uso do cupom atingido.'];
        }

        if ($this->valor_minimo !== null && $valorCompra < (float) $this->valor_minimo) {
            return [
                'valido' => false,
                'mensagem' => 'Valor mínimo para este cupom é R$ ' . number_format((float) $this->valor_minimo, 2, ',', '.'),
            ];
        }

        if ($cursoId) {
            $ids = $this->cursos()->pluck('cursos.id')->toArray();
            if (!empty($ids) && !in_array($cursoId, $ids)) {
                return ['valido' => false, 'mensagem' => 'Cupom não é válido para este curso.'];
            }
        }

        if ($this->tipo === 'fixo' && (float) $this->valor_desconto > $valorCompra) {
            return [
                'valido' => false,
                'mensagem' => 'O desconto do cupom é maior que o valor do curso.',
            ];
        }

        return ['valido' => true, 'mensagem' => 'Cupom válido.'];
    }

    /**
     * Calcula o valor do desconto baseado no tipo do cupom.
     */
    public function calcularDesconto(float $valorCompra): float
    {
        if ($this->tipo === 'percentual') {
            $desconto = $valorCompra * ((float) $this->valor_desconto / 100);
        } else {
            $desconto = (float) $this->valor_desconto;
        }

        return min($desconto, $valorCompra);
    }

    /**
     * Incrementa o contador de usos do cupom.
     */
    public function incrementarUso(): void
    {
        $this->increment('usos');
    }
}
