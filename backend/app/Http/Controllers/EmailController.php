<?php

namespace App\Http\Controllers;

use App\Models\NotificationRecipient;
use App\Notifications\WelcomeEmailNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Log;

/**
 * EmailController
 * pt-BR: Controlador para endpoints de envio de e-mails.
 * en-US: Controller for email sending endpoints.
 */
class EmailController extends Controller
{
    /**
     * sendWelcome
     * pt-BR: Envia e-mail de boas-vindas utilizando o canal Brevo.
     * en-US: Sends welcome email using Brevo channel.
     */
    public function sendWelcome(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'name' => ['required', 'string', 'min:2'],
            'course_title' => ['nullable', 'string'],
            'course_id' => ['nullable'],
        ]);

        $recipient = new NotificationRecipient($validated['email'], $validated['name']);
        $courseTitle = $validated['course_title'] ?? 'seu curso';
        $courseId = $validated['course_id'] ?? null;

        try {
            $result = Notification::send($recipient, new WelcomeEmailNotification($validated['name'], $courseTitle, $courseId));
            // O canal Brevo retorna array simplificado; expor status amigável
            Log::info('EmailController: Welcome email dispatched', ['email' => $validated['email'], 'course_title' => $courseTitle]);
            return response()->json([
                'success' => true,
                'message' => 'Welcome email sent',
                'data' => $result,
            ]);
        } catch (\Throwable $e) {
            Log::error('EmailController: Welcome email failed', ['error' => $e->getMessage()]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to send welcome email',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}