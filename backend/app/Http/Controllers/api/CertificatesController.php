<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Post;
use App\Models\Matricula;

class CertificatesController extends Controller
{
    /**
     * getTemplate
     * pt-BR: Retorna o template de certificado salvo em `posts` com `post_type=certificado`.
     * en-US: Returns the certificate template saved in `posts` with `post_type=certificado`.
     */
    public function getTemplate(Request $request)
    {
        $post = Post::ofType('certificado')->published()->first();
        if (!$post) {
            return response()->json([
                'exists' => false,
                'message' => 'Nenhum template de certificado encontrado',
                'config' => null,
            ], 200);
        }

        return response()->json([
            'exists' => true,
            'id' => $post->ID,
            'post_title' => $post->post_title,
            'config' => $post->config ?? [],
        ]);
    }

    /**
     * saveTemplate
     * pt-BR: Salva/atualiza o template de certificado em `posts` com `post_type=certificado`.
     * en-US: Saves/updates the certificate template in `posts` with `post_type=certificado`.
     */
    public function saveTemplate(Request $request)
    {
        // Aceita qualquer JSON e persiste em `config`.
        $payload = $request->json()->all();
        if (!is_array($payload)) {
            return response()->json(['error' => 'Payload inválido'], 422);
        }

        // Validação mínima de estrutura do template.
        // PT: Permite schema flexível, mas valida tipos básicos para campos comuns.
        // EN: Allows flexible schema while validating basic types for common fields.
        $rules = [
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string'],
            'accentColor' => ['nullable', 'string', 'max:32'],
            'fields' => ['nullable', 'array'],
            'fields.*.key' => ['nullable', 'string', 'max:64'],
            'fields.*.label' => ['nullable', 'string', 'max:255'],
            'fields.*.value' => ['nullable'],
            'layout' => ['nullable', 'array'],
        ];
        $validator = Validator::make($payload, $rules);
        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validação falhou',
                'messages' => $validator->errors(),
            ], 422);
        }

        // Upsert do registro de certificado.
        $post = Post::ofType('certificado')->first();
        if (!$post) {
            $post = new Post();
            $post->post_type = 'certificado';
            $post->post_status = 'publish';
            $post->post_title = 'Modelo de Certificado';
            $post->post_name = $post->generateSlug($post->post_title);
        }

        $post->config = $validator->validated() ?: $payload;
        $post->save();

        return response()->json([
            'saved' => true,
            'id' => $post->ID,
            'post_title' => $post->post_title,
            'config' => $post->config,
        ], 200);
    }

    /**
     * validateCertificate
     * pt-BR: Valida um certificado por ID de matrícula e retorna dados básicos da matrícula.
     * en-US: Validates a certificate by enrollment ID and returns basic enrollment data.
     */
    public function validateCertificate(string $enrollmentId)
    {
        $matricula = Matricula::find($enrollmentId);
        if (!$matricula) {
            return response()->json([
                'valid' => false,
                'message' => 'Matrícula não encontrada',
            ], 404);
        }

        // Considera válido se status indicar conclusão ou se possuir URL de certificado nas preferências.
        $preferencias = [];
        if (!empty($matricula->preferencias)) {
            $preferencias = is_array($matricula->preferencias)
                ? $matricula->preferencias
                : json_decode($matricula->preferencias, true) ?? [];
        }

        $status = strtolower((string)($matricula->status ?? ''));
        $hasCertificateUrl = !empty($preferencias['certificate_url'] ?? null);
        $isConcluded = $hasCertificateUrl
            || str_contains($status, 'conclu')
            || str_contains($status, 'finaliz')
            || str_contains($status, 'complet');

        return response()->json([
            'valid' => (bool)$isConcluded,
            'enrollment' => [
                'id' => $matricula->id,
                'student_name' => $matricula->cliente_nome ?? null,
                'course_name' => $matricula->curso_nome ?? null,
                'status' => $matricula->status,
                'preferencias' => $preferencias,
            ],
        ]);
    }
}