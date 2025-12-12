<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreTurmaRequest;
use App\Http\Requests\UpdateTurmaRequest;
use App\Models\Turma;
use App\Models\Curso;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;

class TurmaController extends Controller
{
    /**
     * Serviço de permissões.
     * EN: Permissions service.
     */
    protected PermissionService $permissionService;

    /**
     * Construtor: inicializa serviço de permissões.
     * EN: Constructor: initialize permissions service.
     */
    public function __construct()
    {
        $this->permissionService = new PermissionService();
    }
    /**
     * Controller de Turmas com CRUD e lixeira (PT/EN).
     *
     * PT: Lista, cria, mostra, atualiza e remove turmas.
     *     Inclui endpoints de lixeira (trash, restore, forceDelete).
     * EN: Lists, creates, shows, updates and removes classes.
     *     Includes trash endpoints (trash, restore, forceDelete).
     */

    /**
     * Lista turmas com paginação e filtros.
     * EN: List classes with pagination and filters.
     *
     * Parâmetros suportados (query):
     * - per_page: número de itens por página (default: 10)
     * - page: página atual (default: 1; gerenciado automaticamente pelo paginator)
     * - q: termo de busca por nome
     * - include_trashed: boolean para incluir registros marcados como excluídos/deletados
     * - id_curso: filtra turmas pertencentes a um curso específico
     *
     * Supported query parameters:
     * - per_page: items per page (default: 10)
     * - page: current page (default: 1; automatically handled by paginator)
     * - q: search term for name
     * - include_trashed: boolean to include soft-deleted/excluded records
     * - id_curso: filter classes belonging to a specific course
     */
    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = (int) ($request->get('per_page', 10));
        $includeTrashed = filter_var($request->input('include_trashed', false), FILTER_VALIDATE_BOOLEAN);
        $query = $includeTrashed
            ? Turma::query() // Sem escopo global definido; aplica filtro abaixo somente quando necessário
            : Turma::query()->where('excluido', 'n')->where('deletado', 'n');

        // Filtro por nome
        if ($search = $request->string('q')->toString()) {
            $query->where('nome', 'like', "%{$search}%");
        }

        // Filtro por curso (id_curso)
        $idCurso = $request->input('id_curso');
        if ($idCurso !== null && $idCurso !== '') {
            if (is_numeric($idCurso)) {
                $query->where('id_curso', (int) $idCurso);
            } else {
                // Ignora valores não numéricos para evitar erro; poderia retornar 422 se preferir
            }
        }

        return response()->json($query->orderBy('id', 'desc')->paginate($perPage));
    }

    /**
     * Criar (ou atualizar por id) uma turma.
     * EN: Create (or update by id) a class.
     */
    public function store(StoreTurmaRequest $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $data = $request->validated();

        // PT: Validação de integridade: curso precisa existir no tenant atual.
        // EN: Integrity check: course must exist in the current tenant.
        if (!isset($data['id_curso']) || !Curso::where('id', $data['id_curso'])->exists()) {
            return response()->json([
                'error' => 'Curso inválido',
                'details' => ['id_curso' => 'Curso não existe no tenant atual'],
            ], 422);
        }

        // Defaults: autor, token, ativo
        if (!isset($data['autor']) || $data['autor'] === null || $data['autor'] === '') {
            $data['autor'] = $user->id;
        }
        if (!isset($data['token']) || $data['token'] === null || $data['token'] === '') {
            $data['token'] = Qlib::token();
        }
        if (!isset($data['ativo']) || $data['ativo'] === null || $data['ativo'] === '') {
            $data['ativo'] = 's';
        }

        // PT: Normalizar campos conforme StoreTurmaRequest (datas e números).
        // EN: Normalize fields according to StoreTurmaRequest (dates and numbers).
        $data['inicio'] = $this->normalizeDateInput($data['inicio'] ?? null);
        $data['fim'] = $this->normalizeDateInput($data['fim'] ?? null);
        $data['max_alunos'] = $this->normalizeIntegerInput($data['max_alunos'] ?? null);
        $data['min_alunos'] = $this->normalizeIntegerInput($data['min_alunos'] ?? null);
        $data['duracao'] = $this->normalizeIntegerInput($data['duracao'] ?? null);
        $data['unidade_duracao'] = isset($data['unidade_duracao']) ? $this->normalizeStringInput($data['unidade_duracao']) : null;

        // PT: Se 'id' vier preenchido, consulta por ID; se encontrar, atualiza; caso contrário, cria com o ID informado.
        // EN: If 'id' is provided, look up by ID; if found, update; otherwise, create with the given ID.
        // dd($data);
        if (isset($data['id']) && is_numeric($data['id'])) {
            $id = (int) $data['id'];
            $existing = Turma::find($id);
            if ($existing) {
                $existing->fill($data);
                $existing->save();
                return response()->json([
                    'data' => $existing,
                    'message' => 'Turma atualizada com sucesso',
                    'status' => 201,
                ], 201);
            }

            $turma = new Turma();
            $turma->id = $id; // preserva o ID explícito vindo da requisição
            $turma->fill($data);
            $turma->save();
            return response()->json([
                'data' => $turma,
                'message' => 'Turma criada com sucesso',
                'status' => 201,
            ], 201);
        }

        $turma = Turma::create($data);
        return response()->json([
            'data' => $turma,
            'message' => 'Turma criada com sucesso',
            'status' => 201,
        ], 201);
    }

    /**
     * Exibir uma turma específica.
     * EN: Show a specific class.
     */
    public function show(int $id)
    {
        // Opcional: checagem de autenticação/permissão como no CursoController
        $turma = Turma::where('id', $id)
            ->where('deletado', 'n')
            ->first();
        if (!$turma) {
            return response()->json(['message' => 'Turma não encontrada'], 404);
        }
        return response()->json($turma);
    }

    /**
     * Atualizar uma turma específica.
     * EN: Update a specific class.
     */
    public function update(UpdateTurmaRequest $request, int $id)
    {
        // Opcional: checagem de autenticação/permissão como no CursoController
        $turma = Turma::find($id);
        if (!$turma) {
            return response()->json(['message' => 'Turma não encontrada'], 404);
        }

        // PT: Normalizar entradas conforme as regras do UpdateTurmaRequest
        // EN: Normalize inputs according to UpdateTurmaRequest rules
        $data = $request->validated();
        $data['inicio'] = $this->normalizeDateInput($data['inicio'] ?? null);
        $data['fim'] = $this->normalizeDateInput($data['fim'] ?? null);
        $data['max_alunos'] = $this->normalizeIntegerInput($data['max_alunos'] ?? null);
        $data['min_alunos'] = $this->normalizeIntegerInput($data['min_alunos'] ?? null);
        $data['duracao'] = $this->normalizeIntegerInput($data['duracao'] ?? null);
        if (array_key_exists('unidade_duracao', $data)) {
            $data['unidade_duracao'] = $this->normalizeStringInput($data['unidade_duracao']);
        }

        $turma->update($data);
        return response()->json($turma);
    }

    /**
     * Excluir uma turma pelo id (lixeira ou permanente com force=true).
     * EN: Delete a class by id (trash or permanent with force=true).
     */
    public function destroy(Request $request, int $id)
    {
        $turma = Turma::find($id);
        if (!$turma) {
            return response()->json(['message' => 'Turma não encontrada'], 404);
        }
        // Se a query tiver force=true, exclui definitivamente
        $force = filter_var($request->input('force', false), FILTER_VALIDATE_BOOLEAN);
        if ($force) {
            $turma->delete();
            return response()->json([
                'message' => 'Turma excluída permanentemente',
            ], 200);
        }

        // Caso contrário, marca como excluída (lixeira)
        $registro = [
            'por' => (string) optional($request->user())->id,
            'ip' => $request->ip(),
            'data' => now()->toISOString(),
        ];
        $turma->update([
            'excluido' => 's',
            'deletado' => 's',
            'reg_excluido' => $registro,
            'reg_deletado' => $registro,
        ]);
        return response()->json([
            'message' => 'Turma movida para a lixeira',
            'data' => $turma->fresh(),
        ], 200);
    }

    /**
     * Listar turmas na lixeira.
     * EN: List classes in the trash.
     */
    public function trash(Request $request)
    {
        $perPage = (int) ($request->get('per_page', 10));
        $query = Turma::query()
            ->where(function ($q) {
                $q->where('excluido', 's')
                  ->orWhere('deletado', 's');
            })
            ->orderBy('id', 'desc');
        return response()->json($query->paginate($perPage));
    }

    /**
     * Restaurar turma da lixeira.
     * EN: Restore class from trash.
     */
    public function restore(int $id)
    {
        $turma = Turma::find($id);
        if (!$turma) {
            return response()->json(['message' => 'Turma não encontrada'], 404);
        }
        $turma->excluido = 'n';
        $turma->deletado = 'n';
        $turma->reg_excluido = null;
        $turma->reg_deletado = null;
        $turma->save();
        return response()->json(['message' => 'Turma restaurada']);
    }

    /**
     * Exclusão permanente de uma turma que está na lixeira.
     * EN: Permanently delete a class that is in the trash.
     */
    public function forceDelete(int $id)
    {
        $turma = Turma::find($id);
        if (!$turma) {
            return response()->json(['message' => 'Turma não encontrada'], 404);
        }
        $turma->delete();
        return response()->json(['message' => 'Turma excluída permanentemente com sucesso'], 200);
    }

    /**
     * PT: Normaliza uma data de entrada para o formato ISO 'Y-m-d'.
     *     Aceita 'd/m/Y' (ex.: 31/12/2027), strings vazias viram null.
     * EN: Normalize an input date to ISO 'Y-m-d'.
     *     Accepts 'd/m/Y' (e.g., 31/12/2027); empty strings become null.
     */
    private function normalizeDateInput($value): ?string
    {
        if ($value === null) return null;
        if (is_string($value)) {
            $trim = trim($value);
            if ($trim === '' || $trim === '0000-00-00') return null;
            // d/m/Y -> Y-m-d
            if (preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $trim)) {
                $dt = \DateTime::createFromFormat('d/m/Y', $trim);
                if ($dt !== false) {
                    return $dt->format('Y-m-d');
                }
                return null;
            }
            return $trim; // assume já em formato aceito
        }
        // Aceita DateTime/Carbon
        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }
        return null;
    }

    /**
     * PT: Normaliza uma hora para o formato 'H:i:s'. Aceita 'H:i' e strings vazias.
     * EN: Normalize a time value to 'H:i:s'. Accepts 'H:i' and empty strings.
     */
    private function normalizeTimeInput($value): ?string
    {
        if ($value === null) return null;
        if (is_string($value)) {
            $trim = trim($value);
            if ($trim === '') return null;
            // H:i -> H:i:s
            if (preg_match('/^\d{2}:\d{2}$/', $trim)) {
                return $trim . ':00';
            }
            // Já está em H:i:s
            if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $trim)) {
                return $trim;
            }
            return null;
        }
        return null;
    }

    /**
     * PT: Normaliza um valor para inteiro, aceitando strings numéricas; vazio vira null.
     * EN: Normalize a value to integer, accepting numeric strings; empty becomes null.
     */
    private function normalizeIntegerInput($value): ?int
    {
        if ($value === null) return null;
        if (is_string($value)) {
            $trim = trim($value);
            if ($trim === '') return null;
            if (is_numeric($trim)) return (int) $trim;
            return null;
        }
        if (is_numeric($value)) return (int) $value;
        return null;
    }

    /**
     * PT: Normaliza um texto removendo espaços; vazio vira null.
     * EN: Normalize a text by trimming; empty becomes null.
     */
    private function normalizeStringInput($value): ?string
    {
        if ($value === null) return null;
        if (is_string($value)) {
            $trim = trim($value);
            return $trim === '' ? null : $trim;
        }
        return null;
    }
}
