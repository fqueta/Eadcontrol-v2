import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import * as z from "zod";
import { Form } from "@/components/ui/form";
import { useCreateClient } from '@/hooks/clients';
import { CreateClientInput } from '@/types/clients';
import { ClientForm } from '@/components/clients/ClientForm';
import { useAuth } from '@/contexts/AuthContext';
import { FormActionBar } from '@/components/common/FormActionBar';

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
 * pt-BR: Valida telefone aceitando DDI; entre 10 e 15 dígitos (E.164).
 * en-US: Validates phone accepting country code; between 10 and 15 digits (E.164).
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
const clientSchema = z.object({
  tipo_pessoa: z.enum(["pf", "pj"], {
    errorMap: () => ({ message: "Selecione o tipo de pessoa" })
  }),
  email: z.string()
    .min(1, "Email é obrigatório")
    .email("Formato de email inválido")
    .max(100, "Email deve ter no máximo 100 caracteres"),
  password: z.string().optional().refine((val) => {
    if (!val || val.trim() === '') return true;
    return val.length >= 6;
  }, "Senha deve ter pelo menos 6 caracteres").refine((val) => {
    if (!val || val.trim() === '') return true;
    return val.length <= 50;
  }, "Senha deve ter no máximo 50 caracteres"),
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

/**
 * Página para criação de novos clientes
 * Permite cadastrar um novo cliente com todas as informações necessárias
 */
/**
 * ClientCreate
 * pt-BR: Página de criação de cliente com barra de ações fixa.
 * en-US: Client creation page with a fixed bottom action bar.
 */
export default function ClientCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const createClientMutation = useCreateClient();

  // Form setup with zod validation
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      tipo_pessoa: "pf",
      email: "",
      password: "",
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
        funnelId: "",
        stage_id: "",
      },
    },
  });

  // Define o usuário logado como autor padrão
  useEffect(() => {
    if (user?.id) {
      form.setValue('autor', user.id);
    }
  }, [user, form]);

  /**
   * Prefill from URL query params
   * pt-BR: Lê `funnelId` e `stage_id` da URL e define como valores do formulário.
   * en-US: Reads `funnelId` and `stage_id` from the URL and sets them in the form.
   */
  const location = useLocation();
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const funnelIdParam = searchParams.get('funnelId');
    const stageIdParam = searchParams.get('stage_id');
    if (funnelIdParam) {
      form.setValue('config.funnelId', funnelIdParam);
    }
    if (stageIdParam) {
      form.setValue('config.stage_id', stageIdParam);
    }
  }, [location.search, form]);

  /**
   * Manipula o envio do formulário de criação de cliente
   * @param data - Dados do formulário validados pelo Zod
   */
  /**
   * onSubmit
   * pt-BR: Submete os dados do formulário e, opcionalmente, redireciona após salvar.
   * en-US: Submits form data and optionally redirects after save.
   * @param data - Dados do formulário validados.
   * @param options - Opções para controlar pós-salvamento.
   */
  const onSubmit = (data: ClientFormData, options?: { redirectAfterSave?: boolean }) => {
    const clientData = {
      tipo_pessoa: data.tipo_pessoa,
      email: data.email,
      ...(data.password && data.password.trim() !== '' && { password: data.password }),
      name: data.name,
      // CPF opcional para PF: só envia se preenchido
      cpf: data.tipo_pessoa === 'pf' && data.cpf?.trim() ? data.cpf : undefined,
      cnpj: data.tipo_pessoa === 'pj' ? data.cnpj : undefined,
      razao: data.tipo_pessoa === 'pj' ? data.razao : undefined,
      genero: data.genero,
      status: data.status,
      autor: data.autor,
      // Inclui informações de atendimento no config
      config: data.config,
    };
    
    // Helpers: normalização e extração de erros
    /**
     * normalizeFieldPath
     * pt-BR: Converte a chave de erro da API para o caminho esperado pelo react-hook-form.
     * en-US: Converts API error keys to the path expected by react-hook-form.
     */
    const normalizeFieldPath = (field: string): string => {
      if (!field) return field;
      if (field.includes('.')) return field;
      const configFields = new Set([
        'nome_fantasia','celular','telefone_residencial','telefone_comercial','rg','nascimento',
        'escolaridade','profissao','tipo_pj','cep','endereco','numero','complemento','bairro',
        'cidade','uf','observacoes','funnelId','stage_id'
      ]);
      if (configFields.has(field)) return `config.${field}`;
      return field;
    };
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
     * pt-BR: Monta a descrição do toast com a lista de campos de validação
     *        e suas mensagens retornadas pelo servidor.
     * en-US: Builds the toast description listing validation fields and
     *        their messages returned by the server.
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

    createClientMutation.mutate(
      clientData as CreateClientInput,
      {
        onSuccess: () => {
          toast({
            title: "Cliente criado",
            description: `Cliente ${data.name} criado com sucesso`,
          });
          const shouldRedirect = options?.redirectAfterSave ?? true;
          if (shouldRedirect) {
            navigate('/admin/clients');
          }
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
                return (error as Error).message || "Ocorreu um erro inesperado ao criar o cliente.";
            }
          })();
          toast({ title: "Erro ao criar cliente", description, variant: "destructive" });
        },
      }
    );
  };

  /**
   * Manipula o cancelamento da criação
   * Navega de volta para a lista de clientes
   */
  const onCancel = () => {
    navigate('/admin/clients');
  };

  /**
   * handleSaveAndStay
   * pt-BR: Salva e permanece na página para continuar editando.
   * en-US: Saves and stays on the page to continue editing.
   */
  const handleSaveAndStay = () => {
    form.handleSubmit((data) => onSubmit(data, { redirectAfterSave: false }))();
  };

  /**
   * handleSaveAndExit
   * pt-BR: Salva e retorna para a lista de clientes.
   * en-US: Saves and returns to the clients list.
   */
  const handleSaveAndExit = () => {
    form.handleSubmit((data) => onSubmit(data, { redirectAfterSave: true }))();
  };

  return (
    <div className="container mx-auto py-6 space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/admin/clients')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Novo Cliente</h1>
          <p className="text-muted-foreground">
            Preencha as informações para cadastrar um novo cliente
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Cliente</CardTitle>
          <CardDescription>
            Preencha todos os campos obrigatórios para cadastrar o cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => onSubmit(data, { redirectAfterSave: true }))} className="space-y-6">
              <ClientForm
                form={form}
                onSubmit={(data) => onSubmit(data, { redirectAfterSave: true })}
                onCancel={onCancel}
                editingClient={null}
              />
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Fixed bottom action bar (reusable component) */}
      <FormActionBar
        mode="create"
        fixed
        onBack={onCancel}
        onSaveContinue={handleSaveAndStay}
        onSaveExit={handleSaveAndExit}
      />
    </div>
  );
}