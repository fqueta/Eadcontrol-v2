import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useCreateAircraft } from "@/hooks/aircraft";
import { useClientsList } from "@/hooks/clients";
import { useToast } from "@/hooks/use-toast";
import { AircraftForm } from "@/components/aircraft/AircraftForm";

// Schema de validação para aeronave (reutilizado do Aircraft.tsx)
const aircraftSchema = z.object({
  client_id: z.string().min(1, 'Proprietário é obrigatório'),
  matricula: z.string().min(1, 'Matrícula é obrigatória'),
  config: z.string().optional().default(''),
  description: z.string().optional().default(''),
  active: z.boolean().default(true)
});

type AircraftFormData = z.infer<typeof aircraftSchema>;

interface QuickCreateAircraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAircraftCreated: (aircraft: any) => void;
}

/**
 * Modal para cadastro rápido de aeronave durante criação de ordem de serviço
 * Permite criar uma nova aeronave sem sair do formulário principal
 */
export function QuickCreateAircraftModal({
  open,
  onOpenChange,
  onAircraftCreated,
}: QuickCreateAircraftModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hooks para dados e mutações
  const { data: clientsData, isLoading: isLoadingClients } = useClientsList();
  const createAircraftMutation = useCreateAircraft();
  const { toast } = useToast();
  
  // Formulário com validação
  const form = useForm<AircraftFormData>({
    resolver: zodResolver(aircraftSchema),
    defaultValues: {
      client_id: "",
      matricula: "",
      config: "",
      description: "",
      active: true,
    },
  });

  /**
   * Submete o formulário de criação de aeronave
   */
  const handleSubmit = async (data: AircraftFormData) => {
    try {
      setIsSubmitting(true);
      
      const result = await createAircraftMutation.mutateAsync({
        client_id: data.client_id,
        matricula: data.matricula,
        config: data.config || null,
        description: data.description || null,
        active: data.active,
      });
      
      toast({
        title: "Sucesso",
        description: "Aeronave criada com sucesso!",
      });
      
      // Notifica o componente pai sobre a nova aeronave
      onAircraftCreated(result);
      
      // Fecha o modal e reseta o formulário
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Erro ao criar aeronave:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar aeronave. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Cancela a criação e fecha o modal
   */
  const handleCancel = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Cadastrar Nova Aeronave
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para criar uma nova aeronave rapidamente.
          </DialogDescription>
        </DialogHeader>
        
        <AircraftForm
          form={form}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          editingAircraft={null}
          clients={clientsData || { data: [] }}
          isLoadingClients={isLoadingClients}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}