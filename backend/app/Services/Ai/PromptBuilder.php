<?php

namespace App\Services\Ai;

use App\Models\AiAgent;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Services\Qlib;

/**
 * Monta o array de mensagens enviado ao LLM.
 */
class PromptBuilder
{
    public function __construct(private CatalogContextService $catalog) {}

    /**
     * @param  array<int, array{content: string, score: float, source: ?string}>  $ragResults
     * @return array<int, array{role: string, content: string}>
     */
    public function build(
        AiAgent $agent,
        ?AiConversation $conversation,
        string $userMessage,
        array $ragResults = [],
        ?string $catalogContext = null
    ): array {
        $messages = [
            ['role' => 'system', 'content' => $this->systemPrompt($agent, $ragResults, $catalogContext)],
        ];

        if ($conversation) {
            $messages = array_merge($messages, $this->history($conversation));
        }

        $messages[] = ['role' => 'user', 'content' => $userMessage];

        return $messages;
    }

    private function systemPrompt(AiAgent $agent, array $ragResults, ?string $catalogContext): string
    {
        $company = Qlib::qoption('app_institution_name')
            ?: Qlib::qoption('company_name')
            ?: config('app.name', 'nossa instituição');

        $prompt = trim((string) $agent->system_prompt);

        $blocks = [];

        $blocks[] = "Você é {$agent->name}, agente de atendimento virtual de {$company} no WhatsApp.";

        if ($prompt !== '') {
            $blocks[] = "### Instruções do agente\n{$prompt}";
        }

        $blocks[] = "### Regras de atendimento\n"
            . "- Responda em português do Brasil, de forma cordial, objetiva e humana.\n"
            . "- Use mensagens curtas (idealmente até 600 caracteres), próprias para WhatsApp.\n"
            . "- Não use tabelas, HTML, blocos de código ou markdown pesado. Negrito com *asteriscos* é permitido.\n"
            . "- Faça no máximo uma pergunta por mensagem.\n"
            . "- Nunca invente preços, prazos, links ou informações que não estejam no contexto.\n"
            . "- Se não souber a resposta, ofereça transferir para um atendente humano.\n"
            . "- Não peça senhas, dados de cartão ou documentos sensíveis.";

        if (!empty($ragResults)) {
            $blocks[] = "### Base de conhecimento relevante\n"
                . collect($ragResults)->values()->map(function ($result, $index) {
                    return '[' . ($index + 1) . '] ' . trim($result['content']);
                })->implode("\n")
                . "\nUse essas informações quando forem pertinentes à pergunta.";
        }

        if (!empty($catalogContext)) {
            $blocks[] = $catalogContext
                . "\nUse o catálogo acima para informar cursos, produtos, valores e links quando o contato perguntar.";
        }

        return implode("\n\n", array_filter($blocks));
    }

    /**
     * @return array<int, array{role: string, content: string}>
     */
    private function history(AiConversation $conversation): array
    {
        $limit = (int) config('ai.defaults.history_messages', 12);

        $messages = $conversation->messages()
            ->orderByDesc('id')
            ->limit($limit)
            ->get()
            ->reverse()
            ->filter(fn (AiMessage $message) => in_array($message->role, ['user', 'assistant', 'human_agent'], true))
            ->map(function (AiMessage $message) {
                $content = trim((string) $message->content);

                if ($content === '') {
                    $content = match ($message->mediaType()) {
                        'audio'    => '[Áudio recebido]',
                        'image'    => '[Imagem recebida]',
                        'video'    => '[Vídeo recebido]',
                        'document' => '[Documento recebido]',
                        default    => '[Mídia recebida]',
                    };
                }

                return [
                    'role'    => $message->role === 'user' ? 'user' : 'assistant',
                    'content' => $content,
                ];
            })
            ->values()
            ->all();

        // Remove a última mensagem do usuário (ela é enviada explicitamente no build()).
        if (!empty($messages) && end($messages)['role'] === 'user') {
            array_pop($messages);
        }

        return $messages;
    }
}
