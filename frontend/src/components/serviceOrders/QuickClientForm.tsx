import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { object, z } from "zod";
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
import { Loader2, User, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";
import { clientsService } from "@/services/clientsService";

/**
 * Schema de validação para cadastro rápido de cliente
 */
const quickClientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type QuickClientFormData = z.infer<typeof quickClientSchema>;

/**
 * Interface para dados do cliente criado
 */
interface CreatedClient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

/**
 * Props do componente QuickClientForm
 */
interface QuickClientFormProps {
  onClientCreated: (client: CreatedClient) => void;
  onCancel: () => void;
}

/**
 * Formulário de cadastro rápido de cliente
 * Permite criar um cliente com informações básicas
 */
export default function QuickClientForm({ onClientCreated, onCancel }: QuickClientFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<QuickClientFormData>({
    resolver: zodResolver(quickClientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
    },
  });

  /**
   * Submete o formulário e cria o cliente
   */
  const onSubmit = async (data: QuickClientFormData) => {
    try {
      setIsLoading(true);

      // Prepara os dados para envio
      const clientData = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
      };

      // Cria o cliente
      const response = await clientsService.create(clientData);
      
      // Chama callback com dados do cliente criado
      onClientCreated({
        id: response.id,
        name: response.name,
        email: response.email,
        phone: response.phone,
      });
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      if(Array.isArray(error)) {
        object.keys(error).forEach((key) => {
          form.setError(key, {
            message: error[key][0],
          });
          // toast.error(error[key][0]);
        });
        toast.error(error[0].message);
      }

      toast.error("Erro ao cadastrar cliente. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho do passo */}
      <div className="text-center">
        <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4">
          <User className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Passo 1: Cadastro do Cliente</h2>
        <p className="text-gray-600">
          Informe os dados básicos do cliente para continuar
        </p>
      </div>

      {/* Formulário */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nome completo do cliente"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Telefone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Phone className="h-4 w-4 inline mr-1" />
                    Telefone
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="(11) 99999-9999"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Endereço */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Endereço
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Endereço completo"
                      {...field}
                      disabled={isLoading}
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
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Informações adicionais sobre o cliente..."
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
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                "Próximo Passo"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Nota informativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Dica:</strong> Apenas o nome é obrigatório. Você pode preencher
          as outras informações posteriormente na edição do cliente.
        </p>
      </div>
    </div>
  );
}