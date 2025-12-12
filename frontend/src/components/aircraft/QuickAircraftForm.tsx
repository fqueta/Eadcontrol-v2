import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Plane, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { aircraftService } from '@/services/aircraftService';
import { AircraftForm } from '@/components/aircraft/AircraftForm';
import { useClientsList } from '@/hooks/clients';

// Schema de validação para aeronave
const aircraftSchema = z.object({
  client_id: z.string().min(1, 'Cliente é obrigatório'),
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  config: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().default(true),
});

type AircraftFormData = z.infer<typeof aircraftSchema>;

interface QuickAircraftFormProps {
  clientId: string;
  clientName: string;
  onAircraftCreated: (aircraft: any) => void;
  onCancel: () => void;
}

/**
 * Formulário de cadastro rápido de aeronave (Passo 2)
 * Reutiliza o componente AircraftForm existente com dados do cliente pré-carregados
 */
export function QuickAircraftForm({ clientId, clientName, onAircraftCreated, onCancel }: QuickAircraftFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  // Hook para carregar lista de clientes
  const { data: clientsData, isLoading: isLoadingClients } = useClientsList();

  // Configuração do formulário com validação
  const form = useForm<AircraftFormData>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      client_id: clientId,
      matricula: '',
      config: '',
      description: '',
      active: true,
    },
  });

  // Preenche automaticamente o client_id quando o componente é montado
  useEffect(() => {
    form.setValue('client_id', clientId);
  }, [clientId, form]);

  /**
   * Submete o formulário de criação de aeronave
   */
  const handleSubmit = async (data: AircraftFormData) => {
    try {
      setIsSubmitting(true);
      
      const result = await aircraftService.create({
        client_id: data.client_id,
        matricula: data.matricula,
        config: data.config || '',
        description: data.description || '',
        active: data.active,
      });
      
      toast({
        title: "Aeronave criada com sucesso!",
        description: `A aeronave ${data.matricula} foi cadastrada para ${clientName}.`,
      });
      
      // Notifica o componente pai sobre a nova aeronave
      onAircraftCreated(result);
    } catch (error) {
      console.error('Erro ao criar aeronave:', error);
      toast({
        title: "Erro ao criar aeronave",
        description: "Ocorreu um erro ao cadastrar a aeronave. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Manipula o cancelamento voltando ao passo anterior
   */
  const handleCancel = () => {
    onCancel();
  };

  return (
    <div className="space-y-6">
      {/* Indicador de progresso */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Passo 2 de 3</span>
          <span>67%</span>
        </div>
        <Progress value={67} className="h-2" />
      </div>

      {/* Card do formulário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5" />
            Cadastro de Aeronave
          </CardTitle>
          <CardDescription>
            Cadastre a aeronave para o cliente <strong>{clientName}</strong>.
            Preencha as informações básicas da aeronave.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Reutiliza o componente AircraftForm existente */}
          <AircraftForm
            form={form}
            onSubmit={handleSubmit}
            clients={clientsData || { data: [] }}
            isLoadingClients={isLoadingClients}
          />
          
          {/* Botões de ação customizados para o fluxo rápido */}
          <div className="flex justify-between pt-4 mt-6 border-t">
            <Button type="button" variant="outline" onClick={handleCancel}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button 
              type="button" 
              onClick={() => form.handleSubmit(handleSubmit)()}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Próximo: Criar Ordem'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dica informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Plane className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Dica sobre Aeronaves
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                A matrícula é obrigatória e deve seguir o padrão brasileiro (PT-XXX) ou internacional.
                Você pode usar o botão "Consultar RAB" para buscar dados automaticamente.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}