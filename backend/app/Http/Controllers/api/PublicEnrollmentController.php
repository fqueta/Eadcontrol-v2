<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Matricula;
use App\Notifications\WelcomeNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Controlador para cadastro público de cliente e matrícula automática.
 * EN: Public controller to register a client and auto-enroll in a course.
 */
class PublicEnrollmentController extends Controller
{
    /**
     * Registra um cliente e cria uma matrícula no curso informado (padrão: id 2).
     * EN: Register a client and create an enrollment in the given course (default: id 2).
     */
    public function registerAndEnroll(Request $request)
    {
        // Mapear possíveis nomes de campos do payload
        $email = $request->input('email');
        $name = $request->input('name');
        $password = $request->input('password');
        $phone = $request->input('phone', $request->input('celular'));
        $privacyAccepted = $request->boolean('privacyAccepted');
        $termsAccepted = $request->boolean('termsAccepted');

        // Validação básica do payload público
        $validator = Validator::make([
            'email' => $email,
            'name' => $name,
            'password' => $password,
            'phone' => $phone,
            'privacyAccepted' => $privacyAccepted,
            'termsAccepted' => $termsAccepted,
        ], [
            'email' => ['required','email', 'unique:users,email'],
            'name' => ['required','string','max:255'],
            'password' => ['required','string','min:6'],
            'phone' => ['nullable','string','max:32', 'unique:users,celular'],
            'privacyAccepted' => ['required','boolean', Rule::in([true])],
            'termsAccepted' => ['required','boolean', Rule::in([true])],
        ], [
            'privacyAccepted.in' => 'É necessário aceitar a política de privacidade.',
            'termsAccepted.in' => 'É necessário aceitar os termos de uso.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Sanitização simples
        $email = trim($email);
        $name = trim($name);
        $phone = is_string($phone) ? preg_replace('/\D/', '', $phone) : null;

        // Criar cliente com permission_id=7 (forçado pelo modelo Client::creating)
        $client = new Client();
        $client->tipo_pessoa = 'pf';
        $client->name = $name;
        $client->email = $email;
        $client->password = Hash::make($password);
        $client->status = 'actived';
        $client->genero = 'ni';
        $client->ativo = 's';
        $client->config = [
            'privacyAccepted' => true,
            'termsAccepted' => true,
        ];
        if ($phone) {
            // Campo é 'celular' na tabela users; não está em fillable, atribuir direto
            $client->setAttribute('celular', $phone);
        }
        $client->save();

        // Criar matrícula com curso padrão id=2 (pode ser sobrescrito via query/body)
        // Add id_turma com padrão 0 para atender ao schema que exige valor (sem default)
        $courseId = (int) ($request->input('id_curso', 2));
        $turmaId = (int) ($request->input('id_turma', 0));
        $matricula = new Matricula();
        $matricula->id_cliente = $client->id;
        $matricula->id_curso = $courseId;
        $matricula->id_turma = $turmaId; // 0 indica sem turma associada
        // Não definir 'status' explicitamente para usar o default da tabela ('a')
        $matricula->save();

        // Disparar e-mail de boas vindas
        $client->notify(new WelcomeNotification($courseId));

        return response()->json([
            'message' => 'Cliente cadastrado e matrícula criada com sucesso',
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'celular' => $client->getAttribute('celular'),
            ],
            'matricula' => [
                'id' => $matricula->id,
                'id_curso' => $matricula->id_curso,
                'id_cliente' => $matricula->id_cliente,
            ],
        ], 201);
    }

    /**
     * registerInterest
     * pt-BR: Registra interesse público com dados mínimos, criando cliente (se não existir)
     *        e uma matrícula com situação "Interessado" (código 'int'). Não requer login.
     * en-US: Registers public interest with minimal data, creating client (if missing)
     *        and an enrollment set to "Interested" situation ('int'). No authentication required.
     */
    public function registerInterest(Request $request)
    {
        // Map fields from payload
        $email = trim((string) $request->input('email'));
        $name = trim((string) $request->input('name', $request->input('fullName')));
        $phone = $request->input('phone', $request->input('celular'));
        $courseId = (int) ($request->input('id_curso', $request->input('course_id', 0)));
        $turmaId = (int) ($request->input('id_turma', 0));

        // Basic validation (email required, name required). Allow existing email.
        $validator = Validator::make([
            'email' => $email,
            'name' => $name,
            'phone' => $phone,
            'id_curso' => $courseId,
        ], [
            'email' => ['required','email'],
            'name' => ['required','string','max:255'],
            'phone' => ['nullable','string','max:32'],
            'id_curso' => ['nullable','integer','min:0'],
        ]);
        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Normalize phone (digits only)
        $phone = is_string($phone) ? preg_replace('/\D/', '', $phone) : null;

        // Find existing client or create a minimal record
        $client = Client::where('email', $email)->first();
        if (!$client) {
            $client = new Client();
            $client->tipo_pessoa = 'pf';
            $client->name = $name;
            $client->email = $email;
            // Random password for lead; user can reset later
            $client->password = Hash::make(bin2hex(random_bytes(6)));
            $client->status = 'actived';
            $client->genero = 'ni';
            $client->ativo = 's';
            $client->config = [
                'isLead' => true,
                'source' => 'public_interest',
            ];
            if ($phone) {
                $client->setAttribute('celular', $phone);
            }
            $client->save();
        } else {
            // Update phone if not set
            if ($phone && !$client->getAttribute('celular')) {
                $client->setAttribute('celular', $phone);
                $client->save();
            }
        }

        // Resolve situation id for 'Interessado' (post_name='int')
        $situacaoId = DB::table('posts')
            ->where('post_type', 'situacao_matricula')
            ->where('post_name', 'int')
            ->value('ID');

        // Create enrollment with minimal fields
        $matricula = new Matricula();
        $matricula->id_cliente = $client->id;
        if ($courseId > 0) {
            $matricula->id_curso = $courseId;
        }
        $matricula->id_turma = $turmaId; // 0 indicates no class associated
        if ($situacaoId) {
            $matricula->situacao_id = (int) $situacaoId;
        }
        $matricula->save();

        // Optionally send Welcome email if course id provided
        if ($courseId > 0) {
            $client->notify(new WelcomeNotification($courseId));
        }

        return response()->json([
            'message' => 'Interesse registrado com sucesso',
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'celular' => $client->getAttribute('celular'),
            ],
            'matricula' => [
                'id' => $matricula->id,
                'id_curso' => $matricula->id_curso,
                'id_cliente' => $matricula->id_cliente,
                'situacao_id' => $matricula->situacao_id,
            ],
        ], 201);
    }
}
