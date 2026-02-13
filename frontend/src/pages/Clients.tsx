import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { 
  Plus, 
  Search
} from "lucide-react";
import { getBrazilianStates } from '@/lib/qlib';
import { 
  useClientsList, 
  useCreateClient, 
  useUpdateClient,
  useDeleteClient,
  useForceDeleteClient
} from '@/hooks/clients';
import { generateMockClients } from '@/mocks/clients';
import { useQueryClient } from '@tanstack/react-query';
import { ClientRecord, CreateClientInput } from '@/types/clients';
import { ClientForm } from '@/components/clients/ClientForm';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { useDebounce } from '@/hooks/useDebounce';
import { Switch } from "@/components/ui/switch";
interface ApiDeleteResponse {
  exec: boolean;
  message: string;
  status: number;
}
// Utility functions for validation
const isValidCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cleanCPF.charAt(10));
};

const isValidCNPJ = (cnpj: string): boolean => {
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length !== 14 || /^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleanCNPJ.charAt(12))) return false;
  
  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(cleanCNPJ.charAt(i)) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  return digit2 === parseInt(cleanCNPJ.charAt(13));
};

/**
 * isValidPhone
 * pt-BR: Valida telefone aceitando DDI; entre 10 e 15 dígitos.
 * en-US: Validates phone accepting country code; between 10 and 15 digits.
 */
const isValidPhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
};

const isValidCEP = (cep: string): boolean => {
  const cleanCEP = cep.replace(/\D/g, '');
  return cleanCEP.length === 8;
};

// Enhanced form validation schema
// pt-BR: Atualiza regra para tornar CPF opcional em Pessoa Física;
//        mantém CNPJ e Razão Social obrigatórios em Pessoa Jurídica.
// en-US: Updates rule to make CPF optional for Natural Person;
//        keeps CNPJ and Corporate Name required for Legal Entity.
const clientSchema = z.object({
  tipo_pessoa: z.enum(["pf", "pj"], {
    errorMap: () => ({ message: "Selecione o tipo de pessoa" })
  }),
  email: z.string()
    .min(1, "Email é obrigatório")
    .email("Formato de email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres"),
  name: z.string()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras e espaços"),
  cpf: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    return isValidCPF(val);
  }, "CPF inválido"),
  cnpj: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    return isValidCNPJ(val);
  }, "CNPJ inválido"),
  razao: z.string().optional(),
  genero: z.enum(["m", "f", "ni"], {
    errorMap: () => ({ message: "Selecione o gênero" })
  }),
  status: z.enum(["actived", "inactived", "pre_registred"], {
    errorMap: () => ({ message: "Selecione o status" })
  }),
  autor: z.string().optional(),
  config: z.object({
    nome_fantasia: z.string().nullable().optional(),
    celular: z.string().nullable().optional().refine((val) => {
      if (!val || val.trim() === '') return true;
      return isValidPhone(val);
    }, "Número de celular inválido"),
    telefone_residencial: z.string().nullable().optional().refine((val) => {
      if (!val || val.trim() === '') return true;
      return isValidPhone(val);
    }, "Número de telefone residencial inválido"),
    rg: z.string().nullable().optional().refine((val) => {
      if (!val || val.trim() === '') return true;
      const cleanRG = val.replace(/\D/g, '');
      return cleanRG.length >= 7 && cleanRG.length <= 9;
    }, "RG deve ter entre 7 e 9 dígitos"),
    nascimento: z.string().nullable().optional().refine((val) => {
      if (!val || val.trim() === '') return true;
      const birthDate = new Date(val);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 0 && age <= 120;
    }, "Data de nascimento inválida"),
    escolaridade: z.string().nullable().optional(),
    profissao: z.string().nullable().optional(),
    tipo_pj: z.string().nullable().optional(),
    cep: z.string().nullable().optional().refine((val) => {
      if (!val || val.trim() === '') return true;
      return isValidCEP(val);
    }, "CEP deve ter 8 dígitos"),
    endereco: z.string().nullable().optional(),
    numero: z.string().nullable().optional(),
    complemento: z.string().nullable().optional(),
    bairro: z.string().nullable().optional(),
    cidade: z.string().nullable().optional().refine((val) => {
      if (!val || val.trim() === '') return true;
      return /^[a-zA-ZÀ-ÿ\s]+$/.test(val);
    }, "Cidade deve conter apenas letras e espaços"),
    uf: z.string().nullable().optional(),
    observacoes: z.string().nullable().optional().refine((val) => {
      if (!val || val.trim() === '') return true;
      return val.length <= 500;
    }, "Observações devem ter no máximo 500 caracteres"),
    // pt-BR: Suporta envio de Funil e Etapa
    // en-US: Keep Funnel and Stage in submission payload
    funnelId: z.string().nullable().optional(),
    stage_id: z.string().nullable().optional(),
  }),
}).refine((data) => {
  // Conditional validation: CNPJ and razao required for PJ; CPF optional for PF
  if (data.tipo_pessoa === 'pj') {
    return data.cnpj && data.cnpj.trim() !== '' && data.razao && data.razao.trim() !== '';
  }
  return true;
}, {
  message: "CNPJ e Razão Social são obrigatórios para Pessoa Jurídica.",
  path: ['tipo_pessoa']
});

type ClientFormData = z.infer<typeof clientSchema>;

// Brazilian states for the select dropdown
const brazilianStates = getBrazilianStates();

/**
 * Página de Clientes
 * Lista, busca e filtra clientes. Inclui filtro de lixeira via `excluido=s`.
 */
export default function Clients() {
  // State for search, dialogs, and client operations
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
  const [clientToDelete, setClientToDelete] = useState<ClientRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(100);
  // Filtro de lixeira (excluido=s)
  const [showTrash, setShowTrash] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  // React Query: fetch clients with pagination and debounced search
  /**
   * Força refetch ao alternar lixeira e evita dados frescos impedirem nova chamada.
   * - staleTime: 0 para considerar dados sempre "stale" e refetch na montagem
   * - refetchOnMount: 'always' para garantir nova requisição
   * - keepPreviousData: mantém UI responsiva entre alternâncias
   */
  const clientsQuery = useClientsList(
    {
      page: currentPage,
      per_page: pageSize,
      search: debouncedSearchTerm,
      excluido: showTrash ? 's' : undefined,
    },
    {
      staleTime: 0,
      refetchOnMount: 'always',
      keepPreviousData: true,
    }
  );
  /**
   * Fonte de dados efetiva
   * pt-BR: Quando `VITE_USE_MOCK_CLIENTS` é 'true', usa dados mockados para facilitar o design.
   * en-US: When `VITE_USE_MOCK_CLIENTS` is 'true', uses mocked data to ease UI design.
   */
  const useMock = import.meta.env.VITE_USE_MOCK_CLIENTS === 'true';
  const mockClients = useMemo(() => {
    if (!useMock) return [] as ClientRecord[];
    return generateMockClients({ funnelId: 'default', stageIds: ['stage-a', 'stage-b', 'stage-c'], total: 24 });
  }, [useMock]);
  const effectiveClients: ClientRecord[] = useMock ? mockClients : (clientsQuery.data?.data || []);
  
  /**
   * Refaz a busca quando 'showTrash' muda para garantir que a API seja chamada.
   */
  useEffect(() => {
    clientsQuery.refetch();
  }, [showTrash]);
  // console.log('clientsQuery:', clientsQuery);
  // Compute total pages from API response (or mocks)
  const totalPages = useMock
    ? Math.max(1, Math.ceil(effectiveClients.length / pageSize))
    : (clientsQuery?.data?.last_page || 1);
  // Reset to first page when search or status filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, showTrash]);
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();

  // Form setup with zod validation
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      tipo_pessoa: "pf",
      email: "",
      name: "",
      cpf: "",
      cnpj: "",
      razao: "",
      genero: "ni",
      status: "actived",
      autor: "",
      config: {
        nome_fantasia: "",
        celular: "",
        telefone_residencial: "",
        rg: "",
        nascimento: "",
        escolaridade: "",
        profissao: "",
        tipo_pj: "",
        cep: "",
        endereco: "",
        numero: "",
        complemento: "",
        bairro: "",
        cidade: "",
        uf: "",
        observacoes: "",
        // pt-BR: Inicializa Funil e Etapa para submissão consistente
        // en-US: Initialize Funnel and Stage to ensure consistent submission
        funnelId: "",
        stage_id: "",
      },
    },
  });

  // Handle opening new client dialog - memoized for performance
  const handleNewClient = useCallback(() => {
    navigate('/admin/clients/create');
  }, [navigate]);
  // console.log('Autor inicial:', form.getValues());
  // Handle opening edit dialog - memoized for performance
  const handleEditClient = useCallback((client: ClientRecord) => {
    setEditingClient(client);
    form.reset({
      tipo_pessoa: client.tipo_pessoa,
      email: client.email,
      name: client.name,
      cpf: client.cpf || "",
      cnpj: client.cnpj || "",
      razao: client.razao || "",
      genero: client.genero,
      status: client.status,
      autor: client.autor || "",
      config: {
        nome_fantasia: client.config?.nome_fantasia || "",
        celular: client.config?.celular || "",
        telefone_residencial: client.config?.telefone_residencial || "",
        rg: client.config?.rg || "",
        nascimento: client.config?.nascimento || "",
        escolaridade: client.config?.escolaridade || "",
        profissao: client.config?.profissao || "",
        tipo_pj: client.config?.tipo_pj || "",
        cep: client.config?.cep || "",
        endereco: client.config?.endereco || "",
        numero: client.config?.numero || "",
        complemento: client.config?.complemento || "",
        bairro: client.config?.bairro || "",
        cidade: client.config?.cidade || "",
        uf: client.config?.uf || "",
        observacoes: client.config?.observacoes || "",
        // pt-BR: Carrega Funil e Etapa existentes
        // en-US: Load existing Funnel and Stage
        funnelId: client.config?.funnelId || "",
        stage_id: client.config?.stage_id || "",
      },
    });
    setIsDialogOpen(true);
  }, [form]);
  
  // Handle delete confirmation - memoized for performance
  const handleDeleteClient = useCallback((client: ClientRecord) => {
    setClientToDelete(client);
    setOpenDeleteDialog(true);
  }, []);
  
  // Confirm client deletion - memoized for performance
  const confirmDeleteClient = useCallback(() => {
    if (clientToDelete) {
      deleteClientMutation.mutate(clientToDelete.id, {
        onSuccess: (res) => {
          const response: ApiDeleteResponse = res as unknown as ApiDeleteResponse;
          // console.log('Resposta de sucesso:', response);
          // Verifica se a operação foi executada com sucesso
          if (response.exec) {
            toast({
              title: "Sucesso",
              description: response.message,
            });
            setOpenDeleteDialog(false);
            setClientToDelete(null);
            // Invalida e recarrega a query de clientes para atualizar a lista
            queryClient.invalidateQueries({ queryKey: ['clients'] });
          } else {
            toast({
              title: "Erro",
              description: response.message || "Não foi possível excluir o cliente",
              variant: "destructive",
            });
          }
        },
        onError: (error) => {
          // Função para determinar mensagem de erro específica
          const getErrorMessage = () => {
            const errorWithStatus = error as Error & { status?: number };
            switch (errorWithStatus.status) {
              case 400:
                return "Não é possível excluir este cliente. Verifique se não há dependências.";
              case 404:
                return "Cliente não encontrado. Pode ter sido removido por outro usuário.";
              case 409:
                return "Cliente não pode ser excluído pois possui registros vinculados.";
              case 500:
                return "Erro interno do servidor. Tente novamente em alguns minutos.";
              case 403:
                return "Você não tem permissão para excluir este cliente.";
              case 401:
                return "Sua sessão expirou. Faça login novamente.";
              default:
                return error.message || "Ocorreu um erro inesperado ao excluir o cliente.";
            }
          };
          
          toast({
            title: "Erro ao excluir cliente",
            description: getErrorMessage(),
            variant: "destructive",
          });
        },
      });
    }
  }, [clientToDelete, deleteClientMutation, toast]);

  /**
   * Submit client update payload.
   * Ensures `config.funnelId` and `config.stage_id` remain in the request body.
   * Windows/VSCode friendly: logs dev payload for quick Network tab checks.
   */
  const onSubmit = (data: ClientFormData) => {
    console.log('Dados do formulário:', data);
    console.log('Campo autor:', data.autor);
    const clientData = {
      tipo_pessoa: data.tipo_pessoa,
      email: data.email,
      name: data.name,
      cpf: data.tipo_pessoa === 'pf' ? data.cpf : undefined,
      cnpj: data.tipo_pessoa === 'pj' ? data.cnpj : undefined,
      razao: data.tipo_pessoa === 'pj' ? data.razao : undefined,
      genero: data.genero,
      status: data.status,
      autor: data.autor,
      config: data.config,
    };
    // Dados enviados para API em modo de desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log('Dados enviados para API:', clientData);
    }
    
    // Helper: normaliza o caminho de campo vindo da API para o nome usado no formulário
    /**
     * normalizeFieldPath
     * pt-BR: Converte a chave de erro da API para o caminho esperado pelo react-hook-form.
     * en-US: Converts API error keys to the path expected by react-hook-form.
     */
    const normalizeFieldPath = (field: string): string => {
      if (!field) return field;
      if (field.includes('.')) return field; // já é caminho pontuado
      const configFields = new Set([
        'nome_fantasia','celular','telefone_residencial','telefone_comercial','rg','nascimento',
        'escolaridade','profissao','tipo_pj','cep','endereco','numero','complemento','bairro',
        'cidade','uf','observacoes','funnelId','stage_id'
      ]);
      if (configFields.has(field)) return `config.${field}`;
      return field;
    };

    // Helper: extrai dados de erro do BaseApiService mantendo compatibilidade
    /**
     * extractErrorData
     * pt-BR: Extrai e normaliza o payload de erro retornado pelo serviço (body/response.data).
     * en-US: Extracts and normalizes the error payload returned by the service (body/response.data).
     */
    const extractErrorData = (error: any) => {
      let errorData = error?.body ?? error?.response?.data;
      if (typeof errorData === 'string') {
        try { errorData = JSON.parse(errorData); } catch { /* noop */ }
      }
      return errorData;
    };
    /**
     * formatValidationDescription
     * pt-BR: Gera a descrição do toast listando os campos e mensagens de validação
     *        vindos do servidor.
     * en-US: Generates the toast description listing fields and validation messages
     *        coming from the server.
     */
    const formatValidationDescription = (
      errors: Record<string, string[]>,
      baseMessage?: string
    ): string => {
      const toLabel = (field: string) => field.replace(/^config\./, '');
      const lines = Object.entries(errors).map(([field, msgs]) => {
        const firstMsg = Array.isArray(msgs) ? msgs[0] : String(msgs);
        return `- ${toLabel(field)}: ${firstMsg}`;
      });
      const header = baseMessage || 'Erro de validação';
      return `${header}\n${lines.join('\n')}`;
    };

    if (editingClient) {
      updateClientMutation.mutate(
        {
          id: editingClient.id,
          data: clientData
        },
        {
          onSuccess: () => {
            toast({
              title: "Cliente atualizado",
              description: `Cliente ${data.name} atualizado com sucesso`,
            });
            setIsDialogOpen(false);
            setEditingClient(null);
            form.reset();
          },
          onError: (error: any) => {
            // Primeiro tenta tratar erros de validação estruturados
            const errorData = extractErrorData(error);
            if (errorData && errorData.errors) {
              Object.keys(errorData.errors).forEach((field) => {
                const fieldErrors = errorData.errors[field];
                if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
                  const path = normalizeFieldPath(field);
                  form.setError(path as any, { type: 'server', message: fieldErrors[0] });
                }
              });
              toast({
                title: "Erro de validação",
                description: formatValidationDescription(errorData.errors, errorData.message),
                variant: "destructive",
              });
              return;
            }
            
            // Função para determinar mensagem de erro específica
            const getErrorMessage = () => {
              const errorWithStatus = error as Error & { status?: number };
              
              switch (errorWithStatus.status) {
                case 400:
                  return "Dados inválidos. Verifique as informações preenchidas.";
                case 409:
                  return "Já existe um cliente com este CPF/CNPJ ou email.";
                case 422:
                  return "Dados não processáveis. Verifique os campos obrigatórios.";
                case 500:
                  return "Erro interno do servidor. Tente novamente em alguns minutos.";
                case 403:
                  return "Você não tem permissão para atualizar clientes.";
                case 401:
                  return "Sua sessão expirou. Faça login novamente.";
                default:
                  return error.message || "Ocorreu um erro inesperado ao atualizar o cliente.";
              }
            };
            
            toast({
              title: "Erro ao atualizar cliente",
              description: getErrorMessage(),
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createClientMutation.mutate(
        clientData as CreateClientInput,
        {
          onSuccess: () => {
            toast({
              title: "Cliente criado",
              description: `Cliente ${data.name} criado com sucesso`,
            });
            setIsDialogOpen(false);
            form.reset();
          },
          onError: (error: any) => {
            // Trata erros de validação estruturados primeiro
            const errorData = extractErrorData(error);
            if (errorData && errorData.errors) {
              Object.keys(errorData.errors).forEach((field) => {
                const fieldErrors = errorData.errors[field];
                if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
                  const path = normalizeFieldPath(field);
                  form.setError(path as any, { type: 'server', message: fieldErrors[0] });
                }
              });
              toast({
                title: "Erro de validação",
                description: formatValidationDescription(errorData.errors, errorData.message),
                variant: "destructive",
              });
              return;
            }

            // Fallback para mensagens genéricas
            const errorWithStatus = error as Error & { status?: number };
            const description = (() => {
              switch (errorWithStatus.status) {
                case 400:
                  return "Dados inválidos. Verifique as informações preenchidas.";
                case 409:
                  return "Já existe um cliente com este CPF/CNPJ ou email.";
                case 422:
                  return "Dados não processáveis. Verifique os campos obrigatórios.";
                case 500:
                  return "Erro interno do servidor. Tente novamente em alguns minutos.";
                case 403:
                  return "Você não tem permissão para criar clientes.";
                case 401:
                  return "Sua sessão expirou. Faça login novamente.";
                default:
                  return error.message || "Ocorreu um erro inesperado ao criar o cliente.";
              }
            })();
            toast({ title: "Erro ao criar cliente", description, variant: "destructive" });
          },
        }
      );
    }
  };

  // Handle dialog cancellation - memoized for performance
  const onCancel = useCallback(() => {
    setIsDialogOpen(false);
    setEditingClient(null);
    form.reset();
  }, [form]);

  // Filter clients based on search term and status - memoized for performance
  const filteredClients = useMemo(() => {
    const searchTermLower = searchTerm.toLowerCase();
    return effectiveClients.filter((client) => {
      const document = client.tipo_pessoa === 'pf' ? client.cpf : client.cnpj;
      
      // Filter by search term (redundant check, ensures UI consistency)
      const matchesSearch = (
        client.name.toLowerCase().includes(searchTermLower) ||
        (client.email && client.email.toLowerCase().includes(searchTermLower)) ||
        (document && document.toLowerCase().includes(searchTermLower)) ||
        (client.celular && client.celular.includes(searchTermLower)) ||
        (client.config?.celular && client.config.celular.includes(searchTermLower))
      );
      
      // Filter by status
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [effectiveClients, searchTerm, statusFilter]);

  // Handle force delete - memoized for performance
  const { mutate: forceDeleteClient } = useForceDeleteClient();

  const handleForceDelete = useCallback((client: ClientRecord) => {
    if (confirm(`Tem certeza que deseja excluir permanentemente o cliente ${client.name}? Esta ação não pode ser desfeita.`)) {
      forceDeleteClient(client.id);
    }
  }, [forceDeleteClient]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Clientes</h1>
        <Button onClick={handleNewClient}>
          <Plus className="mr-2 h-4 w-4" /> Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {useMock ? effectiveClients.length : (clientsQuery.data?.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clientes cadastrados no sistema
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {effectiveClients.filter(client => client.status === 'actived').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clientes com status ativo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pré-registrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {effectiveClients.filter(client => client.status === 'pre_registred').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clientes pré-registrados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clientes Inativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {effectiveClients.filter(client => client.status === 'inactived').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Clientes com status inativo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Gerencie seus clientes, visualize informações e histórico de atividades.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="actived">Ativados</SelectItem>
                  <SelectItem value="pre_registred">Pré-registrados</SelectItem>
                  <SelectItem value="inactived">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Toggle Lixeira */}
            <div className="flex items-center gap-2">
              <Switch
                checked={showTrash}
                onCheckedChange={setShowTrash}
                aria-label="Mostrar registros na lixeira"
              />
              <span className="text-sm">Lixeira</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(useMock ? false : clientsQuery.isLoading) ? (
            <div className="flex justify-center items-center py-8">
              <p>Carregando clientes...</p>
            </div>
          ) : (!useMock && clientsQuery.isError) ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro ao carregar clientes</h3>
                <p className="text-gray-600 mb-4 max-w-md">
                  {(() => {
                    const errorWithStatus = clientsQuery.error as Error & { status?: number };
                    switch (errorWithStatus?.status) {
                      case 500:
                        return "Erro interno do servidor. Tente novamente em alguns minutos.";
                      case 403:
                        return "Você não tem permissão para visualizar os clientes.";
                      case 401:
                        return "Sua sessão expirou. Faça login novamente.";
                      default:
                        return clientsQuery.error?.message || "Ocorreu um erro inesperado ao carregar a lista de clientes.";
                    }
                  })()}
                </p>
                <Button 
                  onClick={() => clientsQuery.refetch()} 
                  variant="outline"
                  className="mr-2"
                >
                  <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Tentar novamente
                </Button>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <p>Nenhum cliente encontrado.</p>
            </div>
          ) : (
            <ClientsTable 
              clients={filteredClients}
              onEdit={handleEditClient}
              onDelete={handleDeleteClient}
              isLoading={useMock ? false : clientsQuery.isLoading}
              trashEnabled={showTrash}
            />
          )}
          {/* Pagination */}
          {((useMock ? effectiveClients.length > 0 : (clientsQuery.data && clientsQuery.data.total > 0)) && totalPages > 1) && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Página {currentPage} de {totalPages}</p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} 
                  disabled={currentPage <= 1 || clientsQuery.isLoading}
                >
                  Anterior
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} 
                  disabled={currentPage >= totalPages || clientsQuery.isLoading}
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {editingClient
                ? "Atualize as informações do cliente no formulário abaixo."
                : "Preencha as informações do novo cliente."}
            </DialogDescription>
          </DialogHeader>
          <ClientForm form={form} onSubmit={onSubmit} onCancel={onCancel} editingClient={editingClient} />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente {clientToDelete?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button 
              onClick={confirmDeleteClient} 
              className="bg-red-600 hover:bg-red-700"
              variant="destructive"
            >
              Excluir
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}