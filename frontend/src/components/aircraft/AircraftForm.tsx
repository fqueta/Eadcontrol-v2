import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Search } from "lucide-react";
import type { Client } from "@/types/index";
import type { AircraftRecord } from "@/types/aircraft";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface AircraftFormProps {
  form: UseFormReturn<any>;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  editingAircraft?: AircraftRecord | null;
  clients: {data: Client[]};
  isLoadingClients: boolean;
  isSubmitting: boolean;
}

/**
 * Componente de formulário para aeronaves
 * @param props - Propriedades do componente
 */
export function AircraftForm({
  form,
  onSubmit,
  onCancel,
  editingAircraft,
  clients,
  isLoadingClients,
  isSubmitting
}: AircraftFormProps) {
  // Garantir que clients seja sempre um array válido
  const clientsList = Array.isArray(clients.data) ? clients.data : [];
  const [isConsultingRAB, setIsConsultingRAB] = useState(false);
  const [rabData, setRabData] = useState<any>(null);
  const { toast } = useToast();

  /**
   * Função para consultar dados da aeronave no RAB
   */
  const handleConsultRAB = async () => {
    const matricula = form.getValues('matricula');
    
    if (!matricula || matricula.trim() === '') {
      toast({
        title: "Erro",
        description: "Por favor, preencha o campo matrícula antes de consultar o RAB.",
        variant: "destructive",
      });
      return;
    }

    setIsConsultingRAB(true);
    
    try {
      const response = await fetch(`https://api.aeroclubejf.com.br/api/v1/rab?matricula=${matricula.trim()}`);
      
      if (!response.ok) {
        throw new Error(`Erro na consulta: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.exec && data.data) {
         // Carregar os dados no campo config como JSON
         form.setValue('config', JSON.stringify(data.data));
         
         // Armazenar os dados para exibir na tabela
         setRabData(data.data);
         
         toast({
           title: "Sucesso",
           description: "Dados do RAB carregados com sucesso!",
         });
       } else {
         setRabData(null);
         toast({
           title: "Aviso",
           description: "Nenhum dado encontrado para esta matrícula no RAB.",
           variant: "destructive",
         });
       }
    } catch (error) {
       console.error('Erro ao consultar RAB:', error);
       setRabData(null);
       toast({
         title: "Erro",
         description: "Erro ao consultar dados no RAB. Tente novamente.",
         variant: "destructive",
       });
     } finally {
       setIsConsultingRAB(false);
     }
   };

   /**
    * Função para renderizar a tabela com os dados do RAB
    */
   const renderRabTable = () => {
     if (!rabData) return null;

     return (
       <div className="mt-4 border rounded-lg overflow-hidden">
         <div className="bg-gray-50 px-4 py-2 border-b">
           <h3 className="text-sm font-medium text-gray-900">Dados do RAB</h3>
         </div>
         <div className="max-h-48 overflow-y-auto">
           <table className="w-full text-sm">
             <tbody>
               {Object.entries(rabData).map(([key, value], index) => (
                 <tr key={key} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                   <td className="px-4 py-2 font-medium text-gray-900 border-r">
                     {key}
                   </td>
                   <td className="px-4 py-2 text-gray-700">
                     {String(value)}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       </div>
     );
   };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Campo hidden para config */}
        <FormField
          control={form.control}
          name="config"
          render={({ field }) => (
            <FormItem className="hidden">
              <FormControl>
                <Input type="hidden" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Proprietário (Client Select) */}
        <FormField
          control={form.control}
          name="client_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proprietário *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o proprietário" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {isLoadingClients ? (
                    <SelectItem value="__loading__" disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Carregando...
                    </SelectItem>
                  ) : clientsList.length === 0 ? (
                    <SelectItem value="__no_clients__" disabled>
                      Nenhum cliente cadastrado
                    </SelectItem>
                  ) : (
                    clientsList.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Matrícula */}
        <FormField
          control={form.control}
          name="matricula"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Matrícula *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Digite a matrícula da aeronave"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Botão Consultar RAB */}
        <div className="flex justify-start">
          <Button
            type="button"
            variant="outline"
            onClick={handleConsultRAB}
            disabled={isConsultingRAB}
            className="flex items-center gap-2"
          >
            {isConsultingRAB ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Consultando RAB...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Consultar RAB
              </>
            )}
          </Button>
        </div>

         {/* Tabela com dados do RAB */}
         {renderRabTable()}

         {/* Descrição */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Digite uma descrição da aeronave (opcional)"
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo Active - Switch Toggle */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Status da Aeronave
                </FormLabel>
                <div className="text-sm text-muted-foreground">
                  Ativar ou desativar o cadastro desta aeronave
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Botões de ação */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editingAircraft ? 'Atualizando...' : 'Criando...'}
              </>
            ) : (
              editingAircraft ? 'Atualizar' : 'Criar'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}