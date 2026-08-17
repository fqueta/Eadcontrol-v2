<?php

namespace App\Http\Controllers\api;

use App\Http\Controllers\Controller;
use App\Models\StockEntry;
use App\Models\StockMovement;
use App\Services\PermissionService;
use App\Services\Stock\StockService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/**
 * StockEntryController
 * pt-BR: Lançamentos de estoque (notas internas de entrada/saída) + livro de
 * movimentações. Auxílio logístico — não emite documento fiscal.
 */
class StockEntryController extends Controller
{
    protected $permissionService;
    protected $stockService;

    public function __construct()
    {
        $this->permissionService = new PermissionService;
        $this->stockService = new StockService;
    }

    /**
     * Lista os lançamentos (cabeçalho) com filtros.
     */
    public function index(Request $request)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $query = StockEntry::with(['movements'])->orderBy('id', 'desc');

        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('movement_date', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('movement_date', '<=', $request->date_to);
        }
        if ($request->has('search') && $request->search) {
            $term = $request->search;
            $query->where(function ($q) use ($term) {
                $q->where('supplier_name', 'like', "%{$term}%")
                    ->orWhere('document_number', 'like', "%{$term}%")
                    ->orWhere('notes', 'like', "%{$term}%");
            });
        }

        $perPage = $request->input('limit', 50);

        return response()->json($query->paginate($perPage));
    }

    /**
     * Detalha um lançamento com suas linhas de movimentação.
     */
    public function show(string $id)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $entry = StockEntry::with(['movements.product', 'createdBy'])->find($id);
        if (!$entry) {
            return response()->json(['message' => 'Lançamento não encontrado'], 404);
        }

        return response()->json([
            'data' => $this->transformEntry($entry),
            'message' => 'ok',
        ]);
    }

    /**
     * Cria um lançamento de estoque com suas linhas.
     */
    public function store(Request $request)
    {
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validator = Validator::make($request->all(), [
            'type' => 'required|in:inicial,entrada,saida,ajuste',
            'movement_date' => 'required|date',
            'supplier_name' => 'nullable|string|max:255',
            'document_number' => 'nullable|string|max:100',
            'document_type' => 'nullable|string|max:60',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.line_type' => 'required_if:type,ajuste|in:entrada,saida',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
            'items.*.unit_price' => 'nullable|numeric|min:0',
            'items.*.reason' => 'nullable|string|max:255',
        ], [
            'items.required' => 'Informe pelo menos um produto no lançamento.',
            'items.*.quantity.min' => 'A quantidade deve ser maior que zero.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Erro de validação',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        try {
            $entry = $this->stockService->processEntry([
                'type' => $validated['type'],
                'supplier_name' => $validated['supplier_name'] ?? null,
                'document_number' => $validated['document_number'] ?? null,
                'document_type' => $validated['document_type'] ?? null,
                'movement_date' => $validated['movement_date'],
                'notes' => $validated['notes'] ?? null,
                'created_by' => $request->user()?->id,
            ], $validated['items']);

            return response()->json([
                'data' => $this->transformEntry($entry->load(['movements.product', 'createdBy'])),
                'message' => 'Lançamento registrado com sucesso',
                'status' => 201,
            ], 201);
        } catch (\RuntimeException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'errors' => ['stock' => [$e->getMessage()]],
            ], 422);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao registrar lançamento: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Cancela um lançamento revertendo as movimentações (estorno espelhado).
     */
    public function cancel(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $entry = StockEntry::find($id);
        if (!$entry) {
            return response()->json(['message' => 'Lançamento não encontrado'], 404);
        }

        if ($entry->status === 'cancelada') {
            return response()->json(['message' => 'Lançamento já está cancelado'], 422);
        }

        try {
            $this->stockService->reverseEntry($entry);

            return response()->json([
                'message' => 'Lançamento cancelado e estoque estornado',
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Erro ao cancelar lançamento: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Exclui (soft delete) um lançamento.
     */
    public function destroy(Request $request, string $id)
    {
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $entry = StockEntry::find($id);
        if (!$entry) {
            return response()->json(['message' => 'Lançamento não encontrado'], 404);
        }

        if ($entry->status === 'processada') {
            return response()->json([
                'message' => 'Cancele o lançamento antes de excluir para estornar o estoque.',
            ], 422);
        }

        $entry->delete();

        return response()->json(['message' => 'Lançamento excluído com sucesso']);
    }

    /**
     * Livro de movimentações com filtros.
     */
    public function movements(Request $request)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $query = StockMovement::with(['product', 'entry'])->orderBy('id', 'desc');

        if ($request->has('product_id') && $request->product_id) {
            $query->where('product_id', $request->product_id);
        }
        if ($request->has('type') && $request->type) {
            $query->where('type', $request->type);
        }
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }
        if ($request->has('search') && $request->search) {
            $term = $request->search;
            $query->whereHas('product', function ($q) use ($term) {
                $q->where('post_title', 'like', "%{$term}%");
            });
        }

        $perPage = $request->input('limit', 100);

        $items = $query->paginate($perPage)->through(function (StockMovement $movement) {
            return [
                'id' => $movement->id,
                'entry_id' => $movement->entry?->id,
                'product_id' => $movement->product_id,
                'product_name' => $movement->product?->name,
                'type' => $movement->type,
                'quantity' => $movement->quantity,
                'unit_cost' => $movement->unit_cost,
                'unit_price' => $movement->unit_price,
                'total_cost' => $movement->total_cost,
                'entry_type' => $movement->entry?->type,
                'entry_document' => $movement->entry?->document_number,
                'entry_status' => $movement->entry?->status,
                'service_order_id' => $movement->service_order_id,
                'appointment_id' => $movement->appointment_id,
                'reason' => $movement->reason,
                'created_by' => $movement->created_by,
                'created_at' => $movement->created_at?->toDateTimeString(),
            ];
        });

        return response()->json($items);
    }

    /**
     * Resumo de estoque por produto (saldo, custo, alerta de mínimo).
     */
    public function summary(Request $request)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $summary = collect($this->stockService->summary());

        if ($request->has('only_low') && $request->boolean('only_low')) {
            $summary = $summary->where('low', true)->values();
        }
        if ($request->has('search') && $request->search) {
            $term = mb_strtolower($request->search);
            $summary = $summary->filter(fn ($item) => mb_strpos(mb_strtolower((string) $item['name']), $term) !== false)->values();
        }

        return response()->json(['data' => $summary]);
    }

    /**
     * Saldo e custo médio de um único produto.
     */
    public function balance(Request $request, string $productId)
    {
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $balance = $this->stockService->balanceFor((int) $productId);

        return response()->json(['data' => $balance]);
    }

    /**
     * Formata um lançamento para a API.
     */
    protected function transformEntry(StockEntry $entry): array
    {
        return [
            'id' => $entry->id,
            'type' => $entry->type,
            'typeLabel' => $this->typeLabel($entry->type),
            'supplier_name' => $entry->supplier_name,
            'document_number' => $entry->document_number,
            'document_type' => $entry->document_type,
            'movement_date' => $entry->movement_date?->toDateString(),
            'total_amount' => $entry->total_amount,
            'status' => $entry->status,
            'notes' => $entry->notes,
            'created_by' => $entry->created_by,
            'created_by_name' => $entry->createdBy?->name,
            'created_at' => $entry->created_at?->toDateTimeString(),
            'items' => $entry->movements->map(function (StockMovement $movement) {
                return [
                    'movement_id' => $movement->id,
                    'product_id' => $movement->product_id,
                    'product_name' => $movement->product?->name,
                    'line_type' => $movement->type,
                    'quantity' => $movement->quantity,
                    'unit_cost' => $movement->unit_cost,
                    'unit_price' => $movement->unit_price,
                    'reason' => $movement->reason,
                ];
            }),
        ];
    }

    protected function typeLabel(string $type): string
    {
        $labels = [
            'inicial' => 'Estoque inicial',
            'entrada' => 'Entrada',
            'saida' => 'Saída',
            'ajuste' => 'Ajuste',
        ];

        return $labels[$type] ?? $type;
    }
}