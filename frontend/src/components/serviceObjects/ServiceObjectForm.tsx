import { useMemo } from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import type { ServiceObjectRecord } from '@/services/serviceObjectsService';
import type { ClientRecord } from '@/types/clients';

interface ServiceObjectFormProps {
  form: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  editingServiceObject: ServiceObjectRecord | null;
  clients: ClientRecord[];
  isLoadingClients: boolean;
  isSubmitting: boolean;
}

export function ServiceObjectForm({
  form,
  onSubmit,
  onCancel,
  editingServiceObject,
  clients,
  isLoadingClients,
  isSubmitting,
}: ServiceObjectFormProps) {
  // Garantir que clients seja sempre um array válido
  const clientsList = Array.isArray(clients) ? clients : [];
  const type = form.watch('type');
  
  const identifierLabel = useMemo(() => {
    return type === 'automovel' ? 'Placa/Chassi' : 'Matrícula/Nº Série';
  }, [type]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="client_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoadingClients}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
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
          
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="aeronave">Aeronave</SelectItem>
                    <SelectItem value="automovel">Automóvel</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="identifier_primary"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{identifierLabel}</FormLabel>
                <FormControl>
                  <Input placeholder={identifierLabel} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="manufacturer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fabricante</FormLabel>
                <FormControl>
                  <Input placeholder="Ex.: Toyota, Cessna" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modelo</FormLabel>
                <FormControl>
                  <Input placeholder="Ex.: Corolla, 172" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ano</FormLabel>
                <FormControl>
                  <Input placeholder="Ex.: 2020" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor</FormLabel>
                <FormControl>
                  <Input placeholder="Ex.: Prata, Branco" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Notas adicionais" 
                    className="min-h-[80px]"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              editingServiceObject ? 'Atualizar' : 'Cadastrar'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}