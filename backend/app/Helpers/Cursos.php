<?php

namespace App\Helpers;

use App\Models\Curso;

class Cursos
{
    /**
     * PT: Retorna o tipo do curso a partir do ID informado.
     * Regra: o campo `tipo` é um inteiro entre 1 e 4.
     * 1 => Teórico EAD; 2 => Prático; 3 => Especialização; 4 => Semi-presencial.
     * Caso `tipo` esteja fora do intervalo ou ausente, faz fallback pela `categoria`:
     * - cursos_online, cursos_presencias_teorico => Teórico EAD
     * - cursos_presencias_pratico, cursos_presencias => Prático
     * - cursos_semi_presencias => Semi-presencial
     * Retorna null quando não for possível determinar.
     * EN: Return course type by ID.
     * Rule: `tipo` is an integer in [1..4].
     * 1 => Theoretical EAD; 2 => Practical; 3 => Specialization; 4 => Blended.
     * If `tipo` is out-of-range or missing, fallback using `categoria` mapping above.
     * Returns null when type cannot be inferred.
     *
     * @param int|string $cursoId ID do curso
     * @return string|null Rótulo do tipo de curso ou null se não encontrado
     */
    public static function tipoCursoPorId(int|string $cursoId): ?string
    {
        $curso = Curso::find($cursoId);
        if (!$curso) {
            return null;
        }

        $raw = $curso->tipo;
        // Se não houver tipo explícito, tentamos fallback por categoria
        if ($raw === null || $raw === '') {
            return self::mapCategoriaToTipo((string)($curso->categoria ?? ''));
        }

        // Normaliza e valida intervalo [1..4]
        $num = is_numeric((string) $raw) ? (int) $raw : null;
        if ($num === null || $num < 1 || $num > 4) {
            // Fallback por categoria quando tipo não está no intervalo esperado
            return self::mapCategoriaToTipo((string)($curso->categoria ?? ''));
        }

        // Mapeamento fixo 1..4
        $map = [
            1 => 'Teórico EAD',
            2 => 'Prático',
            3 => 'Especialização',
            4 => 'Semi-presencial',
        ];
        return $map[$num] ?? null;
    }

    /**
     * PT: Mapeia a categoria do curso para um rótulo de tipo.
     * EN: Maps course category to a type label.
     *
     * @param string $categoria Categoria do curso
     * @return string|null Rótulo do tipo ou null se desconhecida
     */
    private static function mapCategoriaToTipo(string $categoria): ?string
    {
        $categoria = trim($categoria);
        if ($categoria === '') {
            return null;
        }

        $mapCat = [
            'cursos_online' => 'Teórico EAD',
            'cursos_presencias_teorico' => 'Teórico EAD',
            'cursos_presencias_pratico' => 'Prático',
            'cursos_presencias' => 'Prático',
            'cursos_semi_presencias' => 'Semi-presencial',
        ];

        return $mapCat[$categoria] ?? null;
    }
    /**Metodo para retornar o numero do tipo de curso quando o ID é informado */
    public static function get_tipo(int|string $cursoId): ?int
    {
        $curso = Curso::find($cursoId);
        if (!$curso) {
            return null;
        }

        $raw = $curso->tipo;
        return is_numeric((string) $raw) ? (int) $raw : null;
    }

}
