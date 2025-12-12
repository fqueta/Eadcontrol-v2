import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plane, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { aircraftService } from "@/services/aircraftService";

/**
 * Schema de validação para cadastro rápido de aeronave
 */
const quickAircraftSchema = z.object({
  matricula: z.string().min(1, "Matrícula é obrigatória"),
  modelo: z.string().optional(),
  fabricante: z.string().optional(),
  ano_fabricacao: z.string().optional(),
  horas_voo: z.string().optional(),
  observacoes: z.string().optional(),
});

type QuickAircraftFormData = z.infer<typeof quickAircraftSchema>;

/**
 * Interface para dados da aeronave criada
 */
interface CreatedAircraft {
  id: string;
  matricula: string;
  client_id: string;
}

/**
 * Props do componente QuickAircraftForm
 */
interface QuickAircraftFormProps {
  clientId: string;
  onAircraftCreated: (aircraft: CreatedAircraft) => void;
  onCancel: () => void;
}

/**
 * Formulário de cadastro rápido de aeronave
 * Permite criar uma aeronave vinculada ao cliente
 */
export default function QuickAircraftForm({ 
  clientId, 
  onAircraftCreated, 
  onCancel 
}: QuickAircraftFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<QuickAircraftFormData>({
    resolver: zodResolver(quickAircraftSchema),
    defaultValues: {
      matricula: "",
      modelo: "",
      fabricante: "",
      ano_fabricacao: "",
      horas_voo: "",
      observacoes: "",
    },
  });

  /**
   * Submete o formulário e cria a aeronave
   */
  const onSubmit = async (data: QuickAircraftFormData) => {
    try {
      setIsLoading(true);

      // Prepara os dados para envio
      const aircraftData = {
        matricula: data.matricula,
        modelo: data.modelo || undefined,
        fabricante: data.fabricante || undefined,
        ano_fabricacao: data.ano_fabricacao ? parseInt(data.ano_fabricacao) : undefined,
        horas_voo: data.horas_voo ? parseFloat(data.horas_voo) : undefined,
        observacoes: data.observacoes || undefined,
        client_id: clientId,
      };

      // Cria a aeronave
      const response = await aircraftService.create(aircraftData);
      
      // Chama callback com dados da aeronave criada
      onAircraftCreated({
        id: response.id,
        matricula: response.matricula,
        client_id: response.client_id,
      });
    } catch (error) {
      console.error("Erro ao criar aeronave:", error);
      toast.error("Erro ao cadastrar aeronave. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do passo */}
      <div className="text-center">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
          <Plane className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Passo 2: Cadastro da Aeronave</h2>
        <p className="text-gray-600">
          Informe os dados da aeronave que será vinculada ao cliente
        </p>
      </div>

      {/* Formulário */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Matrícula */}
            <FormField
              control={form.control}
              name="matricula"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matrícula *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: PT-ABC"
                      {...field}
                      disabled={isLoading}
                      className="uppercase"
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Modelo */}
            <FormField
              control={form.control}
              name="modelo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Modelo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Cessna 172"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Fabricante */}
            <FormField
              control={form.control}
              name="fabricante"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fabricante</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Cessna"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ano de Fabricação */}
            <FormField
              control={form.control}
              name="ano_fabricacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano de Fabricação</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 2020"
                      {...field}
                      disabled={isLoading}
                      min="1900"
                      max={new Date().getFullYear()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Horas de Voo */}
            <FormField
              control={form.control}
              name="horas_voo"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Horas de Voo</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Ex: 1500.5"
                      {...field}
                      disabled={isLoading}
                      min="0"
                      step="0.1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Observações */}
          <FormField
            control={form.control}
            name="observacoes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Informações adicionais sobre a aeronave..."
                    className="min-h-[80px]"
                    {...field}
                    disabled={isLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Botões de ação */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Finalizar"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Dica:</strong> Apenas a matrícula é obrigatória. Você pode preencher
          as outras informações posteriormente na edição da aeronave.
        </p>
      </div>
    </div>
  );
}