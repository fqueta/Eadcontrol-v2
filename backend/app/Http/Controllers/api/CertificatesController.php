<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Matricula;
use App\Models\Option;
use App\Services\Qlib;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class CertificatesController extends Controller
{
    /**
     * generatePdf
     * pt-BR: Gera o PDF do certificado para uma matrícula específica.
     *        Carrega o modelo do banco, resolve placeholders e injeta QR Code.
     * en-US: Generates certificate PDF for a specific enrollment.
     *        Loads template from DB, resolves placeholders and injects QR Code.
     */
    public function generatePdf($matriculaId)
    {
        try {
            $matricula = Matricula::with(['student', 'course'])->find($matriculaId);

            if (!$matricula) {
                return response()->json(['error' => 'Matrícula não encontrada'], 404);
            }

            // Carrega o modelo definido em Option
            $model = Option::where('name', 'certificateTemplate')->first();
            $config = $model ? json_decode($model->value, true) : [];

            $title = $config['title'] ?? 'Certificado de Conclusão';
            $body = $config['body'] ?? 'Certificamos que {studentName} concluiu o curso {courseName}...';
            $footerLeft = $config['footerLeft'] ?? 'Coordenador';
            $footerRight = $config['footerRight'] ?? 'Diretor';
            $bgUrl = $config['bgUrl'] ?? '';
            $signatureLeftUrl = $config['signatureLeftUrl'] ?? '';
            $signatureRightUrl = $config['signatureRightUrl'] ?? '';
            $accentColor = $config['accentColor'] ?? '#111827';
            $qrPosition = $config['qrPosition'] ?? 'integrated';
            $logoPosition = $config['logoPosition'] ?? 'integrated';

            // Prepara placeholders
            $studentName = $matricula->student ? ($matricula->student->name . ' ' . $matricula->student->lastname) : 'Aluno';
            $courseName = $matricula->course ? $matricula->course->nome : 'Curso';
            $completionDate = $matricula->data_conclusao ? date('d/m/Y', strtotime($matricula->data_conclusao)) : date('d/m/Y');
            $hours = ($matricula->course->carga_horaria ?? $matricula->course->duracao) ?: 'Carga horária não definida';
            if (is_numeric($hours)) $hours .= ' horas';

            // Busca Datas de Início e Fim (Primeira e Última atividade concluída)
            $progressData = \Illuminate\Support\Facades\DB::table('activity_progress')
                ->where('id_matricula', $matriculaId)
                ->where('completed', 1)
                ->selectRaw('MIN(updated_at) as first_completed, MAX(updated_at) as last_completed')
                ->first();

            $startDate = $progressData && $progressData->first_completed 
                ? date('d/m/Y', strtotime($progressData->first_completed)) 
                : $completionDate; // fallback
            
            $endDate = $progressData && $progressData->last_completed 
                ? date('d/m/Y', strtotime($progressData->last_completed)) 
                : $completionDate; // fallback

            /**
             * imgToDataUri
             * pt-BR: Converte imagem (local ou remota) para base64 para evitar erros de renderização no DomPDF.
             */
            $imgToDataUri = function ($url) {
                if (empty($url)) return '';
                try {
                    // Se for caminho local do storage
                    if (str_contains($url, 'storage/')) {
                        $path = str_replace(url('/storage'), storage_path('app/public'), $url);
                        if (file_exists($path)) {
                            $data = file_get_contents($path);
                            $type = pathinfo($path, PATHINFO_EXTENSION);
                            return 'data:image/' . $type . ';base64,' . base64_encode($data);
                        }
                    }
                    
                    // Se for URL remota (ex: QR Server ou S3)
                    $opts = [
                        "http" => [
                            "method" => "GET",
                            "header" => "User-Agent: PHP\r\n"
                        ]
                    ];
                    $context = stream_context_create($opts);
                    $data = @file_get_contents($url, false, $context);
                    
                    if ($data === false && function_exists('curl_init')) {
                        $ch = curl_init();
                        curl_setopt($ch, CURLOPT_URL, $url);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
                        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
                        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                        curl_setopt($ch, CURLOPT_USERAGENT, 'PHP');
                        $data = curl_exec($ch);
                        curl_close($ch);
                    }

                    if ($data === false) return '';
                    $base64 = base64_encode($data);
                    return 'data:image/png;base64,' . $base64;
                } catch (\Exception $e) {
                    Log::error('imgToDataUri failed: ' . $e->getMessage(), ['url' => $url]);
                    return '';
                }
            };

            $logoUrl = Qlib::get_logo_url();
            $logoBase64 = $imgToDataUri($logoUrl);
            $logoHtml = '<img src="' . ($logoBase64 ?: $logoUrl) . '" style="max-height: 60px;" />';

            $placeholders = [
                'studentName' => '<strong>' . $studentName . '</strong>',
                'courseName' => '<strong>' . $courseName . '</strong>',
                'completionDate' => $completionDate,
                'startDate' => $startDate,
                'endDate' => $endDate,
                'hours' => $hours,
                'logo' => ($logoPosition === 'integrated') ? $logoHtml : '',
                'startData' => $startDate,
                'endData' => $endDate,
            ];

            $bgBase64 = $imgToDataUri($bgUrl);
            $sigLeftBase64 = $imgToDataUri($signatureLeftUrl);
            $sigRightBase64 = $imgToDataUri($signatureRightUrl);

            // Geração do link de validação seguro (Apontando para o Frontend)
            $hash = substr(hash_hmac('sha256', $matricula->id, config('app.key')), 0, 16);
            $frontendUrl = env('FRONTEND_URL', 'eaddemo.localhost:4000');
            // Garante o protocolo http://
            if (!str_starts_with($frontendUrl, 'http')) {
                $frontendUrl = 'http://' . $frontendUrl;
            }
            $validationUrl = $frontendUrl . '/certificado/validar/' . $matricula->id . '/' . $hash;
            $qrCodeUrl = "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=" . urlencode($validationUrl);
            $qrCodeBase64 = $imgToDataUri($qrCodeUrl);
            $qrImgHtml = '<img src="' . ($qrCodeBase64 ?: $qrCodeUrl) . '" style="width: 90px; height: 90px; display: block;" />';

            // Se for integrado, resolve o placeholder. Se não for, limpa o placeholder do corpo
            if ($qrPosition === 'integrated') {
                $placeholders['qrcode'] = '<img src="' . ($qrCodeBase64 ?: $qrCodeUrl) . '" style="width: 90px; height: 90px; display: inline-block; vertical-align: middle; margin: 5px;" />';
            } else {
                $placeholders['qrcode'] = '';
            }

            // Resolve placeholders no corpo do texto
            $bodyResolved = preg_replace_callback('/\{(.*?)\}/', function ($m) use ($placeholders) {
                $key = $m[1] ?? '';
                return $placeholders[$key] ?? $m[0];
            }, $body);

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
                'qrPosition' => $qrPosition,
                'qrImgHtml' => $qrImgHtml,
                'logoPosition' => $logoPosition,
                'logoHtml' => $logoHtml
            ])->render();

            Pdf::setOptions([
                'isRemoteEnabled' => true, 
                'isHtml5ParserEnabled' => true,
            ]);
            
            $pdf = Pdf::loadHTML($html);
            $pdf->setPaper('A4', 'landscape');

            return $pdf->stream('certificado_' . $matriculaId . '.pdf');

        } catch (\Exception $e) {
            Log::error('Erro ao gerar PDF: ' . $e->getMessage());
            return response()->json(['error' => 'Erro interno ao gerar PDF: ' . $e->getMessage()], 500);
        }
    }

    /**
     * saveTemplate
     * pt-BR: Salva as configurações do modelo de certificado na tabela options.
     * en-US: Saves certificate template settings in the options table.
     */
    public function saveTemplate(Request $request)
    {
        try {
            $data = $request->only([
                'title', 'body', 'footerLeft', 'footerRight', 
                'signatureLeftUrl', 'signatureRightUrl', 'bgUrl', 
                'accentColor', 'qrPosition', 'logoPosition'
            ]);

            Option::updateOrCreate(
                ['name' => 'certificateTemplate'],
                ['value' => json_encode($data)]
            );

            return response()->json(['message' => 'Modelo salvo com sucesso']);
        } catch (\Exception $e) {
            Log::error('Erro ao salvar modelo: ' . $e->getMessage());
            return response()->json(['error' => 'Erro ao salvar modelo: ' . $e->getMessage()], 500);
        }
    }

    /**
     * getTemplate
     * pt-BR: Retorna o modelo atual para o frontend.
     */
    public function getTemplate()
    {
        $model = Option::where('name', 'certificateTemplate')->first();
        return response()->json([
            'config' => $model ? json_decode($model->value, true) : []
        ]);
    }

    /**
     * validateCertificate
     * pt-BR: Valida um certificado publicamente através do QR Code.
     *        Verifica se o hash de segurança é autêntico antes de retornar os dados.
     */
    public function validateCertificate($enrollmentId, $hash)
    {
        try {
            // Verifica integridade do link
            $expectedHash = substr(hash_hmac('sha256', $enrollmentId, config('app.key')), 0, 16);
            
            if ($hash !== $expectedHash) {
                return response()->json(['error' => 'Link de validação inválido ou alterado.'], 403);
            }

            $matricula = Matricula::with(['student', 'course'])->find($enrollmentId);

            if (!$matricula) {
                return response()->json(['error' => 'Certificado não encontrado.'], 404);
            }

            // Busca Datas de Início e Fim (Primeira e Última atividade concluída)
            $progressData = \Illuminate\Support\Facades\DB::table('activity_progress')
                ->where('id_matricula', $enrollmentId)
                ->where('completed', 1)
                ->selectRaw('MIN(updated_at) as first_completed, MAX(updated_at) as last_completed')
                ->first();

            $completionDate = $matricula->data_conclusao 
                ? $matricula->data_conclusao 
                : ($progressData->last_completed ?? now()->toDateString());

            $hours = ($matricula->course->carga_horaria ?? $matricula->course->duracao) ?: 'N/A';
            if (is_numeric($hours)) $hours .= ' horas';

            // Busca a logo da escola usando o helper Qlib
            $logoUrl = Qlib::get_logo_url();

            // Link seguro para abrir o PDF (Público, usando o hash)
            $pdfUrl = url('/api/v1/certificates/public/view/' . $enrollmentId . '/' . $hash);

            return response()->json([
                'valid' => true,
                'validated_at' => now()->toIso8601String(),
                'logoUrl' => $logoUrl,
                'enrollment' => [
                    'id' => $matricula->id,
                    'student_name' => $matricula->student ? ($matricula->student->name . ' ' . $matricula->student->lastname) : 'N/A',
                    'student_email' => $matricula->student ? $matricula->student->email : '',
                    'course_name' => $matricula->course ? $matricula->course->nome : 'N/A',
                    'hours' => $hours,
                    'completion_date' => substr($completionDate, 0, 10), // Apenas YYYY-MM-DD
                    'status' => 'Concluído/Válido',
                    'situation' => 'Ativa',
                    'preferencias' => [
                        'certificate_url' => $pdfUrl
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Erro ao validar certificado: ' . $e->getMessage());
            return response()->json(['error' => 'Erro interno na validação.'], 500);
        }
    }

    /**
     * publicView
     * pt-BR: Permite visualizar o PDF do certificado publicamente se o hash for válido.
     */
    public function publicView($enrollmentId, $hash)
    {
        try {
            $expectedHash = substr(hash_hmac('sha256', $enrollmentId, config('app.key')), 0, 16);
            if ($hash !== $expectedHash) {
                return response()->json(['error' => 'Acesso não autorizado.'], 403);
            }

            return $this->generatePdf($enrollmentId);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Erro ao abrir certificado.'], 500);
        }
    }
}
