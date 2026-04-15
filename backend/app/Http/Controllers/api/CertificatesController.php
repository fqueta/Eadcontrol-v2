<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Models\Post;
use App\Models\Matricula;
use App\Models\Curso;
use App\Models\User;
use App\Services\Qlib;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class CertificatesController extends Controller
{
    /**
     * getTemplate
     * pt-BR: Retorna o template de certificado salvo em `posts` com `post_type=certificado`.
     * en-US: Returns the certificate template saved in `posts` with `post_type=certificado`.
     */
    public function getTemplate(Request $request)
    {
        $post = Post::ofType('certificado')->first();
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
        // pt-BR: Log para depuração de payload.
        // en-US: Debug log for payload.
        \Illuminate\Support\Facades\Log::info('CertificatesController@saveTemplate', [
            'tenant' => tenancy()->tenant->id ?? 'no-tenant',
            'payload' => $request->json()->all()
        ]);

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
            'footerLeft' => ['nullable', 'string', 'max:255'],
            'footerRight' => ['nullable', 'string', 'max:255'],
            'signatureLeftUrl' => ['nullable', 'string'],
            'signatureRightUrl' => ['nullable', 'string'],
            'bgUrl' => ['nullable', 'string'],
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
        $matricula = Matricula::join('cursos', 'matriculas.id_curso', '=', 'cursos.id')
            ->leftJoin('turmas', 'matriculas.id_turma', '=', 'turmas.id')
            ->leftJoin('users', 'matriculas.id_cliente', '=', 'users.id')
            ->leftJoin('users as consultores', 'matriculas.id_consultor', '=', 'consultores.id')
            ->leftJoin('posts', 'matriculas.situacao_id', '=', 'posts.id')
            ->select(
                'matriculas.*',
                'cursos.nome as curso_nome',
                'cursos.titulo as curso_titulo',
                'cursos.tipo as curso_tipo',
                'cursos.duracao as curso_duracao',
                'cursos.unidade_duracao as curso_unidade_duracao',
                'turmas.nome as turma_nome',
                'users.name as cliente_nome',
                'users.email as cliente_email',
                'consultores.name as consultor_nome',
                'posts.post_title as situacao'
            )
            ->find($enrollmentId);
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

        $studentName = (string)($matricula->cliente_nome
            ?? $matricula->aluno_nome
            ?? $matricula->nome
            ?? '');

        $courseName = (string)($matricula->curso_nome
            ?? $matricula->nome_curso
            ?? ($matricula->curso_titulo ?? null)
            ?? '');

        $hours = (string)($matricula->curso_carga_horaria
            ?? $matricula->carga_horaria
            ?? ($matricula->curso_duracao ? ($matricula->curso_duracao . ' ' . ($matricula->curso_unidade_duracao ?? '')) : '')
            ?? '');

        $courseCompletedAt = null;
        try {
            $meta = Qlib::get_matriculameta($matricula->id, 'dt_conclusao_matricula');
            if (!empty($meta)) {
                $courseCompletedAt = Carbon::parse((string)$meta)->toIso8601String();
            }
        } catch (\Throwable $e) {
            $courseCompletedAt = null;
        }

        $lastActivityAccessAt = null;
        try {
            $raw = DB::table('activity_progress')->where('id_matricula', $matricula->id)->max('updated_at');
            if (!empty($raw)) {
                $lastActivityAccessAt = Carbon::parse((string)$raw)->toIso8601String();
            }
        } catch (\Throwable $e) {
            $lastActivityAccessAt = null;
        }

        // pt-BR: "Conclusão" pública pode ser exibida como último acesso da última atividade.
        //        Também retornamos a data oficial de conclusão (100%) quando existir.
        $completionDate = $lastActivityAccessAt ?: $courseCompletedAt;
        $certificateIssuedAt = $courseCompletedAt ?: $lastActivityAccessAt;

        return response()->json([
            'valid' => (bool)$isConcluded,
            'enrollment' => [
                'id' => $matricula->id,
                'student_id' => $matricula->id_cliente ?? null,
                'course_id' => $matricula->id_curso ?? null,
                'student_name' => $studentName ?: null,
                'student_email' => $matricula->cliente_email ?? null,
                'course_name' => $courseName ?: null,
                'course_type' => $matricula->curso_tipo ?? null,
                'class_id' => $matricula->id_turma ?? null,
                'class_name' => $matricula->turma_nome ?? null,
                'consultant_id' => $matricula->id_consultor ?? null,
                'consultant_name' => $matricula->consultor_nome ?? null,
                'situation' => $matricula->situacao ?? null,
                'hours' => $hours ?: null,
                'completion_date' => $completionDate ?: null,
                'course_completed_at' => $courseCompletedAt,
                'last_activity_access_at' => $lastActivityAccessAt,
                'certificate_issued_at' => $certificateIssuedAt,
                'status' => $matricula->status,
                'preferencias' => $preferencias,
            ],
            'validated_at' => now()->toIso8601String(),
        ]);
    }

    public function generatePdf(string $enrollmentId, Request $request)
    {
        try {
            Log::info('CertificatesController@generatePdf start', [
                'enrollmentId' => $enrollmentId,
                'tenant' => tenancy()->tenant->id ?? 'no-tenant',
                'user' => auth()->id()
            ]);

            // Usar as relações que REALMENTE existem no modelo Matricula
            $matricula = Matricula::with([
                'student', 
                'course'
            ])->find($enrollmentId);

            if (!$matricula) {
                Log::warning('CertificatesController@generatePdf: Matricula not found', ['id' => $enrollmentId]);
                return response()->json(['error' => 'Matrícula não encontrada'], 404);
            }

            $post = Post::ofType('certificado')->published()->first();
            $config = $post ? ($post->config ?? []) : [];

            // Resolvendo dados reais da matrícula usando fallbacks seguros
            $studentModel = $matricula->student ?? $matricula->cliente;
            $courseModel = $matricula->course ?? $matricula->curso;

            if (!$studentModel || !$courseModel) {
                Log::error('Student or Course relationship not resolved', [
                    'student' => !!$studentModel,
                    'course' => !!$courseModel,
                    'matricula_id' => $matricula->id
                ]);
            }

            $studentName = (string)($studentModel->name ?? $studentModel->nome ?? $matricula->cliente_nome ?? 'Aluno');
            $courseName = (string)($courseModel->nome ?? $courseModel->titulo ?? $matricula->curso_nome ?? 'Curso');
            
            // Carga horária
            $hours = '0';
            if ($courseModel) {
                $courseConfig = $courseModel->config ?? [];
                $hours = (string)($courseConfig['workload'] ?? $courseModel->carga_horaria ?? $courseModel->duracao ?? '0');
            }
            
            // Data de conclusão
            $completionDate = (string)($matricula->data_conclusao ?? $matricula->conclusao_data ?? '');
            if (!empty($completionDate)) {
                $completionDate = \Illuminate\Support\Carbon::parse($completionDate)->format('d/m/Y');
            } else {
                $completionDate = \Illuminate\Support\Carbon::now()->format('d/m/Y');
            }

            $placeholders = [
                'studentName' => $studentName,
                'courseName' => $courseName,
                'hours' => $hours,
                'completionDate' => $completionDate,
            ];

            $title = (string)($config['title'] ?? 'CERTIFICADO');
            $body = (string)($config['body'] ?? 'Certificamos que {studentName} concluiu o curso {courseName}.');
            $footerLeft = (string)($config['footerLeft'] ?? '');
            $footerRight = (string)($config['footerRight'] ?? '');
            $bgUrl = (string)($config['bgUrl'] ?? '');
            $accentColor = (string)($config['accentColor'] ?? '#111827');
            $signatureLeftUrl = (string)($config['signatureLeftUrl'] ?? '');
            $signatureRightUrl = (string)($config['signatureRightUrl'] ?? '');

            // RESOLVER IMAGENS PARA BASE64
            $imgToDataUri = function($url) {
                if (empty($url)) return '';
                try {
                    // Se for URL de asset do tenancy e estiver no mesmo servidor
                    if (str_contains($url, '/tenancy/assets/')) {
                        $parts = explode('/tenancy/assets/', $url);
                        $assetPath = end($parts);
                        $fullPath = storage_path('app/public/' . $assetPath);
                        if (file_exists($fullPath)) {
                            $ext = pathinfo($fullPath, PATHINFO_EXTENSION);
                            return 'data:image/' . ($ext ?: 'png') . ';base64,' . base64_encode(file_get_contents($fullPath));
                        }
                    }

                    // Fallback para URL HTTP se parecer uma URL
                    if (str_starts_with($url, 'http')) {
                        $resp = Http::timeout(5)->get($url);
                        if ($resp->successful()) {
                            return 'data:' . $resp->header('Content-Type') . ';base64,' . base64_encode($resp->body());
                        }
                    }
                    
                    // Se for caminho relativo público
                    if (!str_starts_with($url, 'http')) {
                        $path = public_path($url);
                        if (file_exists($path)) {
                            $ext = pathinfo($path, PATHINFO_EXTENSION);
                            return 'data:image/' . ($ext ?: 'png') . ';base64,' . base64_encode(file_get_contents($path));
                        }
                    }

                    return $url;
                } catch (\Exception $e) {
                    Log::error('imgToDataUri failed: ' . $e->getMessage(), ['url' => $url]);
                    return $url;
                }
            };

            $bgBase64 = $imgToDataUri($bgUrl);
            $sigLeftBase64 = $imgToDataUri($signatureLeftUrl);
            $sigRightBase64 = $imgToDataUri($signatureRightUrl);

            // Geração do QR Code e adição ao placeholder qrcode
            $validationUrl = url('/certificado/validar/' . urlencode($matricula->id));
            $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . urlencode($validationUrl);
            $qrCodeBase64 = $imgToDataUri($qrCodeUrl);
            
            $placeholders['qrcode'] = '<img src="' . ($qrCodeBase64 ?: $qrCodeUrl) . '" style="width: 90px; height: 90px; display: inline-block; vertical-align: middle; margin: 5px;" />';

            // Resolve placeholders no corpo do texto
            $bodyResolved = preg_replace_callback('/\{(.*?)\}/', function ($m) use ($placeholders) {
                $key = $m[1] ?? '';
                return $placeholders[$key] ?? $m[0];
            }, $body);

            // Verifica se o qrcode já foi inserido via shortcode para não duplicar na view se quisermos
            $hasQrShortcode = str_contains($body, '{qrcode}');

            $html = view('certificates.pdf', [
                'title' => $title,
                'body' => $bodyResolved,
                'footerLeft' => $footerLeft,
                'footerRight' => $footerRight,
                'bgUrl' => $bgBase64 ?: $bgUrl,
                'accentColor' => $accentColor,
                'signatureLeftUrl' => $sigLeftBase64 ?: $signatureLeftUrl,
                'signatureRightUrl' => $sigRightBase64 ?: $signatureRightUrl,
                'validationUrl' => $validationUrl,
                'qrCodeBase64' => $qrCodeBase64 ?: $qrCodeUrl,
                'hasQrShortcode' => $hasQrShortcode,
            ])->render();

            Pdf::setOptions([
                'isRemoteEnabled' => true, 
                'isHtml5ParserEnabled' => true,
            ]);
            
            $pdf = Pdf::loadHTML($html);
            $pdf->setPaper('A4', 'landscape');

            return $pdf->download('certificado_' . $matricula->id . '.pdf');
        } catch (\Exception $e) {
            Log::error('Error generating PDF: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'error' => 'Erro interno ao gerar PDF: ' . $e->getMessage()
            ], 500);
        }
    }
}
