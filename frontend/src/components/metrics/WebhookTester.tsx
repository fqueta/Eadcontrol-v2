import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface WebhookTesterProps {
  defaultUrl?: string;
}

export function WebhookTester({ defaultUrl = "" }: WebhookTesterProps) {
  const [webhookUrl, setWebhookUrl] = useState(defaultUrl);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isValidUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      // Only allow HTTPS for security (except localhost for development)
      if (urlObj.protocol !== 'https:' && !urlObj.hostname.includes('localhost')) {
        return false;
      }
      // Block common internal/private IP ranges to prevent SSRF
      const hostname = urlObj.hostname;
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('192.168.') ||
        hostname === '::1'
      ) {
        // Allow localhost only in development
        return hostname === 'localhost' || hostname === '127.0.0.1';
      }
      return true;
    } catch {
      return false;
    }
  };

  const handleTrigger = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!webhookUrl) {
      toast({
        title: "URL obrigatória",
        description: "Informe o endpoint do webhook do n8n/Zapier/Make.",
        variant: "destructive",
      });
      return;
    }

    if (!isValidUrl(webhookUrl)) {
      toast({
        title: "URL inválida",
        description: "Use apenas URLs HTTPS válidas de serviços externos confiáveis.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log("Triggering webhook:", webhookUrl);

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // no-cors garante compatibilidade ampla (Zapier/Make). Para n8n, remova se seu endpoint tiver CORS liberado.
        mode: "no-cors",
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          triggered_from: window.location.origin,
          source: "interajai",
          type: "test",
        }),
      });

      toast({
        title: "Requisição enviada",
        description:
          "Enviamos o POST para o webhook. Verifique o histórico/execução no seu n8n/Zapier/Make.",
      });
    } catch (error) {
      console.error("Error triggering webhook:", error);
      toast({
        title: "Erro ao enviar",
        description: "Falha ao chamar o webhook. Confira a URL e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-3 text-foreground">Integração por Webhook</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Funciona com n8n (node Webhook), Zapier e Make. Para n8n, habilite "Respond immediately" e, se desejar, valide token via header/query.
      </p>
      <form onSubmit={handleTrigger} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="webhookUrl">URL do Webhook</Label>
          <Input
            id="webhookUrl"
            placeholder="https://seu-n8n/webhook/minha-automacao"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={isLoading} className="min-w-32">
            {isLoading ? "Enviando..." : "Enviar teste"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setWebhookUrl("");
            }}
          >
            Limpar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Observação: usando no-cors não há resposta legível no navegador. Confirme no painel do seu provedor de automação.
        </p>
      </form>
    </Card>
  );
}
