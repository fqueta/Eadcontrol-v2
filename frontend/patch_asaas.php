<?php
$file = '/home/fernando/Eadcontrol-v2/backend/app/Services/Payment/AsaasPaymentGateway.php';
$content = file_get_contents($file);

$search = <<<EOT
    public function processPayment(Matricula \$matricula, array \$paymentData): array
    {
        \$client = \$matricula->student;
        \$course = \$matricula->course;
        \$courseTitle = \$course->titulo;
        \$price = \$matricula->total;

        // 1. Garantir que o cliente existe no Asaas e obter o ID
        \$customerId = \$this->ensureAsaasCustomer(\$client);

        // 2. Preparar payload de cobrança
        \$billingType = strtoupper(\$paymentData['billingType'] ?? 'UNDEFINED');
        \$dueDate = now()->addDays(1)->format('Y-m-d');

        \$payload = [
            'customer' => \$customerId,
            'billingType' => \$billingType,
            'dueDate' => \$dueDate,
            'description' => "Pagamento do curso {\$courseTitle}",
            'externalReference' => (string) \$matricula->id,
        ];

        // 3. Adicionar dados específicos por tipo de pagamento
        if (\$billingType === 'CREDIT_CARD') {
            \$payload['creditCard'] = \$paymentData['creditCard'];
            \$payload['creditCardHolderInfo'] = \$paymentData['creditCardHolderInfo'];
            \$payload['remoteIp'] = request()->ip();
        }

        if (!empty(\$paymentData['installmentCount']) && (int) \$paymentData['installmentCount'] > 1) {
            \$payload['installmentCount'] = (int) \$paymentData['installmentCount'];
            \$payload['totalValue'] = \$price;
        } else {
            \$payload['value'] = \$price;
        }

        // Gravar requisição nos logs
        \App\Services\Qlib::update_matriculameta(\$matricula->id, 'requisicao_asaas', json_encode(\$payload));
        \App\Services\Qlib::logMatriculaEvent(\$matricula->id, 'payment_request', "Iniciando requisição de pagamento via {\$billingType}", [
            'payload' => \$payload,
            'billing_type' => \$billingType
        ]);

        // 4. Realizar a chamada para a API do Asaas
        \$response = Http::withHeaders([
            'access_token' => \$this->apiKey,
        ])->post("{\$this->apiUrl}/payments", \$payload);

        \$payment = \$response->json();
        
        // Gravar resposta nos logs
        \App\Services\Qlib::update_matriculameta(\$matricula->id, 'resposta_asaas', json_encode(\$payment));
        \App\Services\Qlib::logMatriculaEvent(\$matricula->id, 'payment_response', "Resposta da API do Asaas recebida", [
            'status_code' => \$response->status(),
            'response' => \$payment,
            'success' => \$response->successful()
        ]);

        if (\$response->failed()) {
            Log::error('Asaas Direct Payment Failed', \$payment);
            throw new \Exception("Falha ao processar pagamento no Asaas. " . (\$payment['errors'][0]['description'] ?? ''));
        }

        // 4.5. Criar faturas locais em "contas a receber" (financial_accounts)
        try {
            \$installments = (int) (\$paymentData['installmentCount'] ?? \$payment['installmentCount'] ?? 1);
            \$this->createLocalInvoices(\$matricula, \$payment, \$billingType, \$installments, (float) \$price, \$dueDate);
        } catch (\Throwable \$ex) {
            Log::error("Failed to create local financial accounts for Matricula {\$matricula->id}: " . \$ex->getMessage());
        }

        // 5. Se a resposta foi sucesso e o pagamento for cartão, mudar status para matriculado (mat)
        \$authResponse = null;
        if (\$billingType === 'CREDIT_CARD' && isset(\$payment['status']) && (\$payment['status'] === 'CONFIRMED' || \$payment['status'] === 'RECEIVED')) {
            \$situacao_id_mat = \App\Services\Qlib::buscaValorDb('posts', 'post_name', 'mat', 'ID');
            \$matricula->situacao_id = \$situacao_id_mat;
            \$matricula->save();

            // Gerar token para auto-login
            \$token = \$client->createToken('checkout-auto-login')->plainTextToken;
            \$pid = \$client->permission_id;
            \$menu = (new \App\Http\Controllers\MenuController)->getMenus(\$pid);
            
            \$authResponse = [
                'user' => \$client,
                'token' => \$token,
                'menu' => \$menu,
                'permissions' => [], 
            ];

            // Enviar e-mail de boas-vindas (Sucesso de Compra)
            try {
                \$client->notify(new \App\Notifications\WelcomeEmailNotification(
                    \$client->name,
                    \$courseTitle,
                    \$course->id,
                    \$course->slug
                ));
                Log::info("Welcome email (Success) sent to {\$client->email} after CC approval.");
            } catch (\Exception \$e) {
                Log::error("Failed to send welcome email after CC approval: " . \$e->getMessage());
            }

            // Notificar administradores da nova venda
            try {
                \$admins = \App\Models\User::where('permission_id', '<', 3)->get();
                if (\$admins->isNotEmpty()) {
                    \Illuminate\Support\Facades\Notification::send(\$admins, new \App\Notifications\NewSaleAdminNotification(\$matricula));
                    Log::info("Admin sale notification sent for Matricula {\$matricula->id} after CC approval.");
                }
            } catch (\Exception \$e) {
                Log::error("Failed to send admin sale notification after CC approval: " . \$e->getMessage());
            }
        }

        // 6. Se for PIX, buscar o QR Code se não estiver na resposta principal
        if (\$billingType === 'PIX' && !isset(\$payment['pix'])) {
            \$pixResponse = Http::withHeaders([
                'access_token' => \$this->apiKey,
            ])->get("{\$this->apiUrl}/payments/{\$payment['id']}/pixQrCode");

            if (\$pixResponse->successful()) {
                \$payment['pix'] = \$pixResponse->json();
            }
        }

        // 7. Enviar e-mail de pagamento pendente para PIX e BOLETO
        if (in_array(\$billingType, ['PIX', 'BOLETO'])) {
            \$pixCode = \$payment['pix']['payload'] ?? \$payment['pixQrCode'] ?? null;
            \$boletoUrl = \$payment['bankSlipUrl'] ?? null;

            try {
                \$client->notify(new \App\Notifications\PendingPaymentNotification(
                    \$client->name,
                    \$courseTitle,
                    \$billingType,
                    \$pixCode,
                    \$boletoUrl
                ));
                Log::info("Pending payment email sent to {\$client->email} for {\$billingType}");
            } catch (\Exception \$e) {
                Log::error("Failed to send pending payment email: " . \$e->getMessage());
            }
        }

        return \$payment;
    }
EOT;

$replace = <<<EOT
    public function processPayment(Matricula \$matricula, array \$paymentData): array
    {
        \$client = \$matricula->student;
        \$course = \$matricula->course;
        \$courseTitle = \$course->titulo;

        // Extrai dados de configuração
        \$splitEnrollment = \$paymentData['splitEnrollment'] ?? false;
        \$enrollmentFee = (float) (\$paymentData['courseInscricao'] ?? 0);
        \$courseValue = (float) (\$paymentData['courseValor'] ?? 0);
        \$discountValue = (float) (\$paymentData['discountValue'] ?? 0);

        \$customerId = \$this->ensureAsaasCustomer(\$client);
        \$billingType = strtoupper(\$paymentData['billingType'] ?? 'UNDEFINED');
        \$dueDate = now()->addDays(1)->format('Y-m-d');

        // Payload base
        \$basePayload = [
            'customer' => \$customerId,
            'billingType' => \$billingType,
            'dueDate' => \$dueDate,
            'externalReference' => (string) \$matricula->id,
        ];

        if (\$billingType === 'CREDIT_CARD') {
            \$basePayload['creditCard'] = \$paymentData['creditCard'];
            \$basePayload['creditCardHolderInfo'] = \$paymentData['creditCardHolderInfo'];
            \$basePayload['remoteIp'] = request()->ip();
        }

        // Determina cobranças
        \$charges = [];

        if (\$splitEnrollment && \$enrollmentFee > 0) {
            \$finalCourseValue = \$courseValue;
            \$finalEnrollmentFee = \$enrollmentFee;

            if (\$discountValue > 0) {
                if (\$discountValue <= \$finalCourseValue) {
                    \$finalCourseValue -= \$discountValue;
                } else {
                    \$remDiscount = \$discountValue - \$finalCourseValue;
                    \$finalCourseValue = 0;
                    \$finalEnrollmentFee = max(0, \$finalEnrollmentFee - \$remDiscount);
                }
            }

            if (\$finalEnrollmentFee > 0) {
                \$charges[] = [
                    'type' => 'enrollment',
                    'price' => \$finalEnrollmentFee,
                    'installments' => 1,
                    'payload' => array_merge(\$basePayload, [
                        'description' => "Taxa de Matrícula - {\$courseTitle}",
                        'value' => \$finalEnrollmentFee,
                        'externalReference' => \$matricula->id . "_enrollment"
                    ])
                ];
            }

            if (\$finalCourseValue > 0) {
                \$coursePayload = array_merge(\$basePayload, [
                    'description' => "Mensalidades - {\$courseTitle}",
                    'externalReference' => \$matricula->id . "_course"
                ]);
                \$installments = 1;
                if (!empty(\$paymentData['installmentCount']) && (int) \$paymentData['installmentCount'] > 1) {
                    \$installments = (int) \$paymentData['installmentCount'];
                    \$coursePayload['installmentCount'] = \$installments;
                    \$coursePayload['totalValue'] = \$finalCourseValue;
                } else {
                    \$coursePayload['value'] = \$finalCourseValue;
                }
                \$charges[] = [
                    'type' => 'course',
                    'price' => \$finalCourseValue,
                    'installments' => \$installments,
                    'payload' => \$coursePayload
                ];
            }
        } else {
            // Pagamento unificado padrão
            \$price = \$matricula->total;
            \$stdPayload = array_merge(\$basePayload, [
                'description' => "Pagamento do curso {\$courseTitle}",
            ]);
            \$installments = 1;
            if (!empty(\$paymentData['installmentCount']) && (int) \$paymentData['installmentCount'] > 1) {
                \$installments = (int) \$paymentData['installmentCount'];
                \$stdPayload['installmentCount'] = \$installments;
                \$stdPayload['totalValue'] = \$price;
            } else {
                \$stdPayload['value'] = \$price;
            }
            \$charges[] = [
                'type' => 'standard',
                'price' => \$price,
                'installments' => \$installments,
                'payload' => \$stdPayload
            ];
        }

        \$results = [];
        \$hasSuccess = false;

        foreach (\$charges as \$charge) {
            \App\Services\Qlib::logMatriculaEvent(\$matricula->id, 'payment_request', "Iniciando requisição (\{\$charge['type']}) via {\$billingType}", [
                'payload' => \$charge['payload']
            ]);

            \$response = Http::withHeaders([
                'access_token' => \$this->apiKey,
            ])->post("{\$this->apiUrl}/payments", \$charge['payload']);

            \$payment = \$response->json();

            \App\Services\Qlib::logMatriculaEvent(\$matricula->id, 'payment_response', "Resposta Asaas (\{\$charge['type']})", [
                'response' => \$payment,
                'success' => \$response->successful()
            ]);

            if (\$response->failed()) {
                Log::error("Asaas Direct Payment Failed (\{\$charge['type']})", \$payment);
                throw new \Exception("Falha ao processar {\$charge['type']} no Asaas. " . (\$payment['errors'][0]['description'] ?? ''));
            }

            // Gerar faturas locais
            try {
                \$this->createLocalInvoices(\$matricula, \$payment, \$billingType, \$charge['installments'], \$charge['price'], \$dueDate);
            } catch (\Throwable \$ex) {
                Log::error("Falha ao criar financial_account local (Matricula {\$matricula->id}): " . \$ex->getMessage());
            }

            // Se for PIX, busca QR Code
            if (\$billingType === 'PIX' && !isset(\$payment['pix'])) {
                \$pixResponse = Http::withHeaders([
                    'access_token' => \$this->apiKey,
                ])->get("{\$this->apiUrl}/payments/{\$payment['id']}/pixQrCode");

                if (\$pixResponse->successful()) {
                    \$payment['pix'] = \$pixResponse->json();
                }
            }

            \$results[\$charge['type']] = \$payment;
            
            if (\$billingType === 'CREDIT_CARD' && isset(\$payment['status']) && (\$payment['status'] === 'CONFIRMED' || \$payment['status'] === 'RECEIVED')) {
                \$hasSuccess = true;
            }
        }

        // Se pelo menos um pagamento (matrícula ou curso) no cartão foi aprovado, libera o aluno.
        // Ou se foi unificado e aprovado.
        if (\$hasSuccess) {
            \$situacao_id_mat = \App\Services\Qlib::buscaValorDb('posts', 'post_name', 'mat', 'ID');
            \$matricula->situacao_id = \$situacao_id_mat;
            \$matricula->save();

            // Notificações e Emails
            try {
                \$client->notify(new \App\Notifications\WelcomeEmailNotification(
                    \$client->name,
                    \$courseTitle,
                    \$course->id,
                    \$course->slug
                ));
            } catch (\Exception \$e) {}
            
            try {
                \$admins = \App\Models\User::where('permission_id', '<', 3)->get();
                if (\$admins->isNotEmpty()) {
                    \Illuminate\Support\Facades\Notification::send(\$admins, new \App\Notifications\NewSaleAdminNotification(\$matricula));
                }
            } catch (\Exception \$e) {}
        }

        // E-mail de pendente para PIX/Boleto
        if (in_array(\$billingType, ['PIX', 'BOLETO'])) {
            // Pega o primeiro pixCode e boletoUrl (se houver matrícula separada, enviaremos do standard ou do course)
            \$mainPayment = \$results['standard'] ?? \$results['enrollment'] ?? null;
            if (\$mainPayment) {
                \$pixCode = \$mainPayment['pix']['payload'] ?? \$mainPayment['pixQrCode'] ?? null;
                \$boletoUrl = \$mainPayment['bankSlipUrl'] ?? null;
                try {
                    \$client->notify(new \App\Notifications\PendingPaymentNotification(
                        \$client->name,
                        \$courseTitle,
                        \$billingType,
                        \$pixCode,
                        \$boletoUrl
                    ));
                } catch (\Exception \$e) {}
            }
        }

        // Retorna formato adaptado para compatibilidade
        if (isset(\$results['standard'])) {
            return \$results['standard'];
        }

        return [
            'type' => 'split',
            'enrollment' => \$results['enrollment'] ?? null,
            'course' => \$results['course'] ?? null,
        ];
    }
EOT;

$new_content = str_replace($search, $replace, $content);
file_put_contents($file, $new_content);
echo "Replaced OK\n";
