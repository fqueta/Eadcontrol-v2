<?php

namespace App\Http\Controllers;

use App\Models\FinancialAccount;
use App\Models\Category;
use App\Services\PermissionService;
use App\Services\Qlib;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use App\Enums\PaymentMethod;

/**
 * Controller para gerenciar contas financeiras (a receber e a pagar)
 */
class FinancialAccountController extends Controller
{
    protected PermissionService $permissionService;
    public $routeName;
    public $sec;
    /**
     * Tipo de conta financeira (payable ou receivable)
     * Pode ser definido externamente para filtrar operações
     */
    protected $type;

    /**
     * Define o tipo de conta financeira
     */
    public function setType($type)
    {
        if (in_array($type, ['payable', 'receivable'])) {
            $this->type = $type;
        }
        return $this;
    }

    /**
     * Obtém o tipo de conta financeira
     */
    public function getType()
    {
        return $this->type;
    }

    public function __construct()
    {
        $this->routeName = request()->route()->getName();
        $this->permissionService = new PermissionService();
        $this->sec = request()->segment(3);
        $rota = request()->segment(4);
        if($rota=='accounts-receivable'){
            $this->type = 'receivable';
        }elseif($rota=='accounts-payable'){
            $this->type = 'payable';
        }
    }

    /**
     * Listar todas as contas financeiras
     */
    public function index(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = FinancialAccount::query()
            ->with(['category', 'serviceOrder'])
            ->orderBy($order_by, $order);

        // Aplicar filtros
        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        } elseif ($this->type) {
            // Usar tipo definido na propriedade se não especificado na request
            $query->where('type', $this->type);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->input('category_id'));
        }
        if ($request->filled('customer_name')) {
            $query->where('customer_name', 'like', '%' . $request->input('customer_name') . '%');
        }
        if ($request->filled('supplier_name')) {
            $query->where('supplier_name', 'like', '%' . $request->input('supplier_name') . '%');
        }
        if ($request->filled('description')) {
            $query->where('description', 'like', '%' . $request->input('description') . '%');
        }
        if ($request->filled('payment_method')) {
            $query->paymentMethod($request->input('payment_method'));
        }
        if ($request->filled('due_date_from') && $request->filled('due_date_to')) {
            $query->dueBetween($request->input('due_date_from'), $request->input('due_date_to'));
        }
        if ($request->filled('overdue') && $request->boolean('overdue')) {
            $query->overdue();
        }
        if ($request->filled('priority')) {
            $query->byPriority($request->input('priority'));
        }
        if ($request->filled('client_id')) {
            $query->byClient($request->input('client_id'));
        }
        if ($request->filled('contract_number')) {
            $query->where('contract_number', 'like', '%' . $request->input('contract_number') . '%');
        }
        if ($request->filled('invoice_number')) {
            $query->where('invoice_number', 'like', '%' . $request->input('invoice_number') . '%');
        }

        $accounts = $query->paginate($perPage);

        // Transformar dados para o formato esperado pelo frontend
        $accounts->getCollection()->transform(function ($account) {
            return $this->transformAccount($account);
        });

        return response()->json($accounts);
    }

    /**
     * Criar uma nova conta financeira
     */
    public function store(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('create')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $validated = $this->validateFinancialAccountRequest($request);

        // Verificar se a validação retornou uma resposta de erro
        if ($validated instanceof \Illuminate\Http\JsonResponse) {
            return $validated;
        }

        // dd($user);
        // Mapear campos usando o método centralizado
        $accountData = $this->mapRequestToModel($validated, $this->type);

        // Adicionar campos específicos para criação
        $accountData['token'] = Qlib::token();
        $accountData['status'] = 'pending'; // Status padrão

        // Determinar tipo baseado na rota, categoria ou request
        if (!isset($accountData['type'])) {
            if ($this->type && in_array($this->type, ['payable', 'receivable'])) {
                $accountData['type'] = $this->type;
            } else {
                $category = Category::find($validated['category']);
                $config = json_decode($category->config ?? '{}', true);
                $accountData['type'] = $config['type'] === 'income' ? 'receivable' : 'payable';
            }
        }

        // Definir valores padrão para campos específicos
        $accountData['excluido'] = false;
        $accountData['deletado'] = false;

        $account = FinancialAccount::create($accountData);
        $account->load(['category', 'serviceOrder']);

        return response()->json([
            'data'    => $this->transformAccount($account),
            'message' => 'Conta financeira criada com sucesso',
            'status'  => 201,
        ], 201);
    }

    /**
     * Exibir uma conta financeira específica
     */
    public function show(Request $request, string $id)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $account = FinancialAccount::with(['category', 'serviceOrder'])
            ->where('id', $id)
            ->firstOrFail();

        return response()->json($this->transformAccount($account));
    }

    /**
     * Atualizar uma conta financeira específica
     */
    public function update(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $account = FinancialAccount::where('id', $id)->firstOrFail();

        $validated = $this->validateFinancialAccountRequest($request, true);

        // Verificar se a validação retornou uma resposta de erro
        if ($validated instanceof \Illuminate\Http\JsonResponse) {
            return $validated;
        }

        // Mapear campos usando o método centralizado
        $updateData = $this->mapRequestToModel($validated, $this->type);
        $account->update($updateData);
        $account->refresh();
        $account->load(['category', 'serviceOrder']);

        return response()->json([
            'data'    => $this->transformAccount($account),
            'message' => 'Conta financeira atualizada com sucesso',
            'status'  => 200,
        ]);
    }

    /**
     * Atualiza o status de uma conta a pagar para "paga".
     * Endpoint: PATCH /financial/accounts-payable/{id}/pay
     * Body esperado:
     *  - paymentDate: string (YYYY-MM-DD)
     *  - paymentMethod: string (um dos PaymentMethod)
     */
    public function pay(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Buscar a conta
        $account = FinancialAccount::where('id', $id)->firstOrFail();

        // Garantir que é conta a pagar
        if (!$account->isPayable()) {
            return response()->json([
                'message' => 'Apenas contas a pagar podem ser marcadas como pagas por esta rota',
                'status'  => 400,
            ], 400);
        }

        // Validar entrada específica para pagamento
        $validator = Validator::make($request->all(), [
            'paymentDate'   => ['required', 'date'],
            'paymentMethod' => ['required', 'string', Rule::in(PaymentMethod::values())],
        ], [
            'paymentDate.required'   => 'A data de pagamento é obrigatória',
            'paymentDate.date'       => 'A data de pagamento deve ser uma data válida',
            'paymentMethod.required' => 'O método de pagamento é obrigatório',
            'paymentMethod.in'       => 'O método de pagamento selecionado é inválido',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados de validação inválidos',
                'errors'  => $validator->errors(),
                'status'  => 422,
            ], 422);
        }

        $data = $validator->validated();

        // Atualizar campos de pagamento e status
        $account->payment_method = $data['paymentMethod'];
        $account->payment_date   = $data['paymentDate'];
        $account->status         = 'paid';
        // Se não houver valor pago, assumir o total
        if (empty($account->paid_amount) || $account->paid_amount <= 0) {
            $account->paid_amount = $account->amount;
        }
        $account->save();

        $account->refresh();
        $account->load(['category', 'serviceOrder']);

        return response()->json([
            'data'    => $this->transformAccount($account),
            'message' => 'Pagamento registrado com sucesso',
            'status'  => 200,
        ]);
    }

    /**
     * Atualiza o status de uma conta a receber para "recebida".
     * Endpoint: PATCH /financial/accounts-receivable/{id}/receive
     * Body esperado:
     *  - receivedDate: string (YYYY-MM-DD)
     *  - paymentMethod: string (um dos PaymentMethod)
     */
    public function receive(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        // Buscar a conta
        $account = FinancialAccount::where('id', $id)->firstOrFail();

        // Garantir que é conta a receber
        if (!$account->isReceivable()) {
            return response()->json([
                'message' => 'Apenas contas a receber podem ser marcadas como recebidas por esta rota',
                'status'  => 400,
            ], 400);
        }

        // Validar entrada específica para recebimento
        $validator = Validator::make($request->all(), [
            'receivedDate'  => ['required', 'date'],
            'paymentMethod' => ['required', 'string', Rule::in(PaymentMethod::values())],
        ], [
            'receivedDate.required'  => 'A data de recebimento é obrigatória',
            'receivedDate.date'      => 'A data de recebimento deve ser uma data válida',
            'paymentMethod.required' => 'O método de pagamento é obrigatório',
            'paymentMethod.in'       => 'O método de pagamento selecionado é inválido',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados de validação inválidos',
                'errors'  => $validator->errors(),
                'status'  => 422,
            ], 422);
        }

        $data = $validator->validated();

        // Atualizar campos de pagamento e status
        $account->payment_method = $data['paymentMethod'];
        // O modelo usa payment_date como data de pagamento/recebimento
        $account->payment_date   = $data['receivedDate'];
        $account->status         = 'paid';
        // Se não houver valor recebido, assumir o total
        if (empty($account->paid_amount) || $account->paid_amount <= 0) {
            $account->paid_amount = $account->amount;
        }
        $account->save();

        $account->refresh();
        $account->load(['category', 'serviceOrder']);

        return response()->json([
            'data'    => $this->transformAccount($account),
            'message' => 'Recebimento registrado com sucesso',
            'status'  => 200,
        ]);
    }

    /**
     * Cancela uma conta a receber.
     * Endpoint: PATCH /financial/accounts-receivable/{id}/cancel
     * Não requer body; marca status como 'cancelled' e limpa dados de pagamento.
     */
    public function cancel(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('edit')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $account = FinancialAccount::where('id', $id)->firstOrFail();

        // Garantir que é conta a receber
        if (!$account->isReceivable()) {
            return response()->json([
                'message' => 'Apenas contas a receber podem ser canceladas por esta rota',
                'status'  => 400,
            ], 400);
        }

        // Se já está paga, impedir cancelamento direto
        if ($account->isPaid()) {
            return response()->json([
                'message' => 'Não é possível cancelar uma conta já marcada como paga',
                'status'  => 409,
            ], 409);
        }

        // Atualizar status e limpar campos de pagamento
        $account->status = 'cancelled';
        $account->payment_date = null;
        // $account->payment_method = null;
        $account->paid_amount = 0;
        $account->save();

        $account->refresh();
        $account->load(['category', 'serviceOrder']);

        return response()->json([
            'data'    => $this->transformAccount($account),
            'message' => 'Conta a receber cancelada com sucesso',
            'status'  => 200,
        ]);
    }

    /**
     * Mover conta financeira para a lixeira
     */
    public function destroy(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $account = FinancialAccount::where('id', $id)->firstOrFail();

        // Mover para lixeira em vez de excluir permanentemente
        $account->update([
            'deletado' => true,
            'reg_deletado' => json_encode([
                'usuario' => $user->id,
                'nome' => $user->name,
                'created_at' => now(),
            ])
        ]);

        return response()->json([
            'message' => 'Conta financeira movida para a lixeira com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Listar contas financeiras na lixeira
     */
    public function trash(Request $request)
    {
        $user = request()->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('view')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $perPage = $request->input('per_page', 10);
        $order_by = $request->input('order_by', 'created_at');
        $order = $request->input('order', 'desc');

        $query = FinancialAccount::withoutGlobalScope('notDeleted')
            ->with(['category', 'serviceOrder'])
            ->where('deletado', true)
            ->orderBy($order_by, $order);

        // Aplicar filtro de tipo se definido
        if ($this->type) {
            $query->where('type', $this->type);
        }

        if ($request->filled('customer_name')) {
            $query->where('customer_name', 'like', '%' . $request->input('customer_name') . '%');
        }

        $accounts = $query->paginate($perPage);

        $accounts->getCollection()->transform(function ($account) {
            return $this->transformAccount($account);
        });

        return response()->json($accounts);
    }

    /**
     * Restaurar conta financeira da lixeira
     */
    public function restore(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $account = FinancialAccount::withoutGlobalScope('notDeleted')
            ->where('id', $id)
            ->where('deletado', true)
            ->firstOrFail();

        $account->update([
            'deletado' => false,
            'reg_deletado' => null
        ]);

        return response()->json([
            'message' => 'Conta financeira restaurada com sucesso',
            'status' => 200
        ]);
    }

    /**
     * Excluir permanentemente uma conta financeira
     */
    public function forceDelete(Request $request, string $id)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }
        if (!$this->permissionService->isHasPermission('delete')) {
            return response()->json(['error' => 'Acesso negado'], 403);
        }

        $account = FinancialAccount::withoutGlobalScope('notDeleted')
            ->where('id', $id)
            ->where('deletado', true)
            ->firstOrFail();

        $account->forceDelete();

        return response()->json([
            'message' => 'Conta financeira excluída permanentemente',
            'status' => 200
        ]);
    }

    /**
     * Mapear campos da requisição para campos do modelo
     */
    private function mapRequestToModel(array $requestData, $typeFromRoute = null)
    {
        $mappedData = [];

        // Definir tipo baseado na rota se disponível
        if ($typeFromRoute && in_array($typeFromRoute, ['payable', 'receivable'])) {
            $mappedData['type'] = $typeFromRoute;
        }

        // Mapeamento direto de campos
        if (isset($requestData['amount'])) {
            $mappedData['amount'] = $requestData['amount'];
        }
        if (isset($requestData['category'])) {
            $mappedData['category_id'] = $requestData['category'];
        }
        if (isset($requestData['customerName'])) {
            $mappedData['customer_name'] = $requestData['customerName'];
        }
        if (isset($requestData['supplierName'])) {
            $mappedData['supplier_name'] = $requestData['supplierName'];
        }
        if (isset($requestData['description'])) {
            $mappedData['description'] = $requestData['description'];
        }
        if (isset($requestData['dueDate'])) {
            $mappedData['due_date'] = $requestData['dueDate'];
        }
        if (isset($requestData['installments'])) {
            $mappedData['installments'] = $requestData['installments'];
        }
        if (isset($requestData['invoiceNumber'])) {
            $mappedData['invoice_number'] = $requestData['invoiceNumber'];
        }
        if (isset($requestData['contractNumber'])) {
            $mappedData['contract_number'] = $requestData['contractNumber'];
        }
        if (isset($requestData['notes'])) {
            $mappedData['notes'] = $requestData['notes'];
        }
        if (isset($requestData['paymentMethod'])) {
            $mappedData['payment_method'] = $requestData['paymentMethod'];
        }
        if (isset($requestData['recurrence'])) {
            $mappedData['recurrence'] = $requestData['recurrence'];
        }
        if (isset($requestData['serviceOrderId'])) {
            $mappedData['service_order_id'] = $requestData['serviceOrderId'];
        }
        if (isset($requestData['type'])) {
            $mappedData['type'] = $requestData['type'];
        }
        if (isset($requestData['status'])) {
            $mappedData['status'] = $requestData['status'];
        }
        if (isset($requestData['paymentDate'])) {
            $mappedData['payment_date'] = $requestData['paymentDate'];
        }
        if (isset($requestData['paidAmount'])) {
            $mappedData['paid_amount'] = $requestData['paidAmount'];
        }
        if (isset($requestData['discountAmount'])) {
            $mappedData['discount_amount'] = $requestData['discountAmount'];
        }
        if (isset($requestData['interestAmount'])) {
            $mappedData['interest_amount'] = $requestData['interestAmount'];
        }
        if (isset($requestData['priority'])) {
            $mappedData['priority'] = $requestData['priority'];
        }
        if (isset($requestData['clientId'])) {
            $mappedData['client_id'] = $requestData['clientId'];
        }

        return $mappedData;
    }

    /**
     * Transformar conta para o formato esperado pelo frontend
     */
    private function transformAccount($account)
    {
        return [
            'id'              => $account->id,
            'amount'          => $account->amount,
            'category'        => $account->category_id,
            'customerName'    => $account->customer_name,
            'supplierName'    => $account->supplier_name,
            'description'     => $account->description,
            'dueDate'         => $account->due_date,
            'installments'    => $account->installments,
            'invoiceNumber'   => $account->invoice_number,
            'contractNumber'  => $account->contract_number,
            'notes'           => $account->notes,
            'paymentMethod'   => $account->payment_method,
            'recurrence'      => $account->recurrence,
            'serviceOrderId'  => $account->service_order_id,
            'type'            => $account->type,
            'status'          => $account->status,
            'paymentDate'     => $account->payment_date,
            'paidAmount'      => $account->paid_amount,
            'discountAmount'  => $account->discount_amount,
            'interestAmount'  => $account->interest_amount,
            'priority'        => $account->priority,
            'clientId'        => $account->client_id,
            'token'           => $account->token,
            'created_at'      => $account->created_at,
            'updated_at'      => $account->updated_at,
            'isOverdue'       => $account->isOverdue(),
            'isPaid'          => $account->isPaid(),
            'remainingAmount' => $account->getRemainingAmountAttribute(),
            'netAmount'       => $account->getNetAmountAttribute(),
            'isPayable'       => $account->isPayable(),
            'isReceivable'    => $account->isReceivable(),
            // Relacionamentos
            'categoryData'    => $account->category ? [
                'id'   => $account->category->id,
                'name' => $account->category->name,
                'type' => json_decode($account->category->config ?? '{}', true)['type'] ?? 'expense'
            ] : null,
            'serviceOrderData' => $account->serviceOrder ? [
                'id'     => $account->serviceOrder->id,
                'number' => $account->serviceOrder->number ?? $account->serviceOrder->id
            ] : null,
            'clientData' => $account->client ? [
                'id'   => $account->client->id,
                'name' => $account->client->name
            ] : null,
        ];
    }

    /**
     * Sanitizar dados de entrada
     */
    private function sanitizeInput($data)
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = trim($value);
            }
        }
        return $data;
    }

    /**
     * Obter regras de validação do FinancialAccountRequest
     */
    private function getValidationRules($isUpdate = false)
    {
        $rules = [
            'amount' => 'required|numeric|min:0.01|max:999999999.99',
            'category' => 'required|exists:categories,id',
            'customerName' => 'nullable|string|max:255',
            'description' => 'required|string|min:3|max:500',
            // 'dueDate' => 'required|date|after_or_equal:today',
            'dueDate' => 'required|date',
            'installments' => 'nullable|integer|min:1|max:999',
            'invoiceNumber' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:1000',
            'paymentMethod' => 'required|string|in:cash,credit_card,debit_card,bank_transfer,pix,check,other',
            'recurrence' => 'nullable|string|in:none,daily,weekly,monthly,yearly',
            'serviceOrderId' => 'nullable|exists:service_orders,id',
            'type' => 'nullable|string|in:receivable,payable',
            'status' => 'nullable|string|in:pending,paid,overdue,cancelled',
            'paymentDate' => 'nullable|date',
            'paidAmount' => 'nullable|numeric|min:0|max:999999999.99',
            'supplierName' => 'nullable|string|max:255',
            'priority' => 'nullable|string|in:low,medium,high',
            // Valida cliente diretamente em users com permission_id = 7
            'clientId' => 'nullable|exists:users,id,permission_id,7',
            'contractNumber' => 'nullable|string|max:100',
            'discountAmount' => 'nullable|numeric|min:0|max:999999999.99',
            'interestAmount' => 'nullable|numeric|min:0|max:999999999.99'
        ];

        // Para updates, tornar campos opcionais
        if ($isUpdate) {
            $rules['amount'] = 'sometimes|required|numeric|min:0.01|max:999999999.99';
            $rules['category'] = 'sometimes|required|exists:categories,id';
            $rules['description'] = 'sometimes|required|string|min:3|max:500';
            $rules['dueDate'] = 'sometimes|required|date';
            $rules['paymentMethod'] = 'sometimes|required|string|in:cash,credit_card,debit_card,bank_transfer,pix,check,other';
        }

        return $rules;
    }

    /**
     * Obter mensagens de validação do FinancialAccountRequest
     */
    private function getValidationMessages()
    {
        return [
            'amount.required' => 'O valor é obrigatório',
            'amount.numeric' => 'O valor deve ser um número',
            'amount.min' => 'O valor deve ser maior que zero',
            'amount.max' => 'O valor não pode exceder R$ 999.999.999,99',
            'category.required' => 'A categoria é obrigatória',
            'category.exists' => 'A categoria selecionada é inválida',
            'description.required' => 'A descrição é obrigatória',
            'description.min' => 'A descrição deve ter pelo menos 3 caracteres',
            'description.max' => 'A descrição não pode exceder 500 caracteres',
            'dueDate.required' => 'A data de vencimento é obrigatória',
            'dueDate.date' => 'A data de vencimento deve ser uma data válida',
            'dueDate.after_or_equal' => 'A data de vencimento não pode ser anterior a hoje',
            'installments.integer' => 'O número de parcelas deve ser um número inteiro',
            'installments.min' => 'O número de parcelas deve ser pelo menos 1',
            'installments.max' => 'O número de parcelas não pode exceder 999',
            'invoiceNumber.max' => 'O número da fatura não pode exceder 100 caracteres',
            'notes.max' => 'As observações não podem exceder 1000 caracteres',
            'paymentMethod.required' => 'O método de pagamento é obrigatório',
            'paymentMethod.in' => 'O método de pagamento selecionado é inválido',
            'recurrence.in' => 'A recorrência selecionada é inválida',
            'serviceOrderId.exists' => 'A ordem de serviço selecionada é inválida',
            'type.in' => 'O tipo de conta selecionado é inválido',
            'status.in' => 'O status selecionado é inválido',
            'paymentDate.date' => 'A data de pagamento deve ser uma data válida',
            'paidAmount.numeric' => 'O valor pago deve ser um número',
            'paidAmount.min' => 'O valor pago não pode ser negativo',
            'paidAmount.max' => 'O valor pago não pode exceder R$ 999.999.999,99',
            'supplierName.max' => 'O nome do fornecedor não pode exceder 255 caracteres',
            'priority.in' => 'A prioridade selecionada é inválida',
            'clientId.exists' => 'O cliente selecionado é inválido',
            'contractNumber.max' => 'O número do contrato não pode exceder 100 caracteres',
            'discountAmount.numeric' => 'O valor do desconto deve ser um número',
            'discountAmount.min' => 'O valor do desconto não pode ser negativo',
            'discountAmount.max' => 'O valor do desconto não pode exceder R$ 999.999.999,99',
            'interestAmount.numeric' => 'O valor dos juros deve ser um número',
            'interestAmount.min' => 'O valor dos juros não pode ser negativo',
            'interestAmount.max' => 'O valor dos juros não pode exceder R$ 999.999.999,99'
        ];
    }

    /**
     * Validar requisição de conta financeira usando Validator::make
     */
    private function validateFinancialAccountRequest(Request $request, $isUpdate = false)
    {
        $rules = $this->getValidationRules($isUpdate);
        $messages = $this->getValidationMessages();

        // Processar dados da requisição
        $data = $request->all();

        // Se o request não contém os dados esperados, tentar diferentes métodos
        if (count($data) <= 1) {
            // Tentar usar $request->json() primeiro
            $jsonData = $request->json()->all();
            if (!empty($jsonData)) {
                $data = array_merge($data, $jsonData);
            } else {
                // Fallback para decodificação manual
                $rawContent = $request->getContent();
                if ($rawContent) {
                    // Corrigir codificação UTF-8
                    $cleanContent = mb_convert_encoding($rawContent, 'UTF-8', 'UTF-8');
                    $decodedData = json_decode($cleanContent, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decodedData)) {
                        $data = array_merge($data, $decodedData);
                    }
                }
            }
        }

         \Log::info('Data being validated:', $data);
         $validator = Validator::make($data, $rules, $messages);
        // Validações customizadas
        $validator->after(function ($validator) use ($request) {
            // Validação customizada: valor pago não pode ser maior que o valor total
            if ($request->filled('paidAmount') && $request->filled('amount')) {
                if ($request->paidAmount > $request->amount) {
                    $validator->errors()->add('paidAmount', 'O valor pago não pode ser maior que o valor total');
                }
            }

            // Validação customizada: se status é 'paid', deve ter data de pagamento
            if ($request->status === 'paid' && !$request->filled('paymentDate')) {
                $validator->errors()->add('paymentDate', 'A data de pagamento é obrigatória quando o status é "pago"');
            }

            // Validação customizada: se tem data de pagamento, deve ter valor pago
            if ($request->filled('paymentDate') && !$request->filled('paidAmount')) {
                $validator->errors()->add('paidAmount', 'O valor pago é obrigatório quando há data de pagamento');
            }

            // Validação customizada: parcelas só fazem sentido para recorrência mensal ou anual
            if ($request->filled('installments') && $request->installments > 1) {
                if (!in_array($request->recurrence, ['monthly', 'yearly'])) {
                    $validator->errors()->add('installments', 'Parcelas só são permitidas para recorrência mensal ou anual');
                }
            }
        });

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Dados de validação inválidos',
                'errors' => $validator->errors(),
                'status' => 422
            ], 422);
        }

        return $validator->validated();
    }

}
