import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import { Plus, Search } from "lucide-react";
import { 
  usePartnersList, 
  useCreatePartner, 
  useUpdatePartner,
  useDeletePartner
} from '@/hooks/partners';
import { PartnerRecord, CreatePartnerInput } from '@/types/partners';
import { PartnerForm } from '@/components/partners/PartnerForm';
import { PartnersTable } from '@/components/partners/PartnersTable';

/**
 * Schema de validação para formulário de parceiros
 * Baseado no schema de clientes com adaptações
 */
const partnerSchema = z.object({
  tipo_pessoa: z.enum(["pf", "pj"]),
  email: z.string().email('Email inválido'),
  name: z.string().min(1, 'Nome é obrigatório'),
  password: z.string().optional().refine((val) => {
    if (!val || val === '') return true; // Permite vazio
    return val.length >= 6; // Se preenchido, deve ter pelo menos 6 caracteres
  }, {
    message: 'Password deve ter pelo menos 6 caracteres'
  }),
  cpf: z.string().optional(),
  cnpj: z.string().optional(),
  razao: z.string().optional(),
  genero: z.enum(["m", "f", "ni"]),
  ativo: z.enum(["s", "n"]),
  config: z.object({
    nome_fantasia: z.string().nullable().optional(),
    celular: z.string().nullable().optional(),
    telefone_residencial: z.string().nullable().optional(),
    telefone_comercial: z.string().nullable().optional(),
    rg: z.string().nullable().optional(),
    nascimento: z.string().nullable().optional(),
    escolaridade: z.string().nullable().optional(),
    profissao: z.string().nullable().optional(),
    tipo_pj: z.string().nullable().optional(),
    cep: z.string().nullable().optional(),
    endereco: z.string().nullable().optional(),
    numero: z.string().nullable().optional(),
    complemento: z.string().nullable().optional(),
    bairro: z.string().nullable().optional(),
    cidade: z.string().nullable().optional(),
    uf: z.string().nullable().optional(),
    observacoes: z.string().nullable().optional(),
  }),
});

type PartnerFormData = z.infer<typeof partnerSchema>;

/**
 * Página principal de gerenciamento de parceiros
 * Implementa CRUD completo com listagem, criação, edição e exclusão
 */
export default function Partners() {
  // State para busca, diálogos e operações de parceiros
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<PartnerRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const { toast } = useToast();
  const navigate = useNavigate();

  // React Query hooks para operações de parceiros
  const partnersQuery = usePartnersList({
    page: currentPage,
    per_page: pageSize,
  });
  const createPartnerMutation = useCreatePartner();
  const updatePartnerMutation = useUpdatePartner();
  const deletePartnerMutation = useDeletePartner();

  // Configuração do formulário com validação zod
  const form = useForm<PartnerFormData>({
    resolver: zodResolver(partnerSchema),
    defaultValues: {
      tipo_pessoa: "pf",
      email: "",
      name: "",
      cpf: "",
      cnpj: "",
      razao: "",
      genero: "ni",
      ativo: "s",
      config: {
        nome_fantasia: "",
        celular: "",
        telefone_residencial: "",
        telefone_comercial: "",
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
      },
    },
  });
  const link_admin:string = 'admin';
  /**
   * Abre diálogo para criação de novo parceiro
   */
  const handleNewPartner = () => {
    setEditingPartner(null);
    form.reset({
      tipo_pessoa: "pf",
      email: "",
      name: "",
      cpf: "",
      cnpj: "",
      razao: "",
      genero: "ni",
      ativo: "s",
      config: {
        nome_fantasia: "",
        celular: "",
        telefone_residencial: "",
        telefone_comercial: "",
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
      },
    });
    setIsDialogOpen(true);
  };

  /**
   * Abre diálogo para edição de parceiro existente
   */
  const handleEditPartner = (partner: PartnerRecord) => {
    setEditingPartner(partner);
    form.reset({
      tipo_pessoa: partner.tipo_pessoa,
      email: partner.email,
      name: partner.name,
      cpf: partner.cpf || "",
      cnpj: partner.cnpj || "",
      razao: partner.razao || "",
      genero: partner.genero,
      ativo: partner.ativo,
      config: {
        nome_fantasia: partner.config?.nome_fantasia || "",
        celular: partner.config?.celular || "",
        telefone_residencial: partner.config?.telefone_residencial || "",
        telefone_comercial: partner.config?.telefone_comercial || "",
        rg: partner.config?.rg || "",
        nascimento: partner.config?.nascimento || "",
        escolaridade: partner.config?.escolaridade || "",
        profissao: partner.config?.profissao || "",
        tipo_pj: partner.config?.tipo_pj || "",
        cep: partner.config?.cep || "",
        endereco: partner.config?.endereco || "",
        numero: partner.config?.numero || "",
        complemento: partner.config?.complemento || "",
        bairro: partner.config?.bairro || "",
        cidade: partner.config?.cidade || "",
        uf: partner.config?.uf || "",
        observacoes: partner.config?.observacoes || "",
      },
    });
    setIsDialogOpen(true);
  };
  
  /**
   * Abre diálogo de confirmação para exclusão
   */
  const handleDeletePartner = (partner: PartnerRecord) => {
    setPartnerToDelete(partner);
    setOpenDeleteDialog(true);
  };
  
  /**
   * Confirma e executa a exclusão do parceiro
   */
  const confirmDeletePartner = () => {
    if (partnerToDelete) {
      deletePartnerMutation.mutate(partnerToDelete.id, {
        onSuccess: () => {
          toast({
            title: "Parceiro excluído",
            description: "Parceiro excluído com sucesso",
          });
          setOpenDeleteDialog(false);
          setPartnerToDelete(null);
        },
        onError: (error) => {
          toast({
            title: "Erro ao excluir parceiro",
            description: `Ocorreu um erro: ${error.message}`,
            variant: "destructive",
          });
        },
      });
    }
  };

  /**
   * Processa submissão do formulário (criação ou edição)
   */
  const onSubmit = (data: PartnerFormData) => {
    // Validação manual do password na criação
    if (!editingPartner && (!data.password || data.password.length < 6)) {
      toast({
        title: "Erro de validação",
        description: "Password é obrigatório e deve ter pelo menos 6 caracteres na criação",
        variant: "destructive",
      });
      return;
    }

    const partnerData: any = {
      tipo_pessoa: data.tipo_pessoa,
      email: data.email,
      name: data.name,
      cpf: data.tipo_pessoa === 'pf' ? data.cpf : undefined,
      cnpj: data.tipo_pessoa === 'pj' ? data.cnpj : undefined,
      razao: data.tipo_pessoa === 'pj' ? data.razao : undefined,
      genero: data.genero,
      ativo: data.ativo,
      config: data.config,
    };

    // Incluir password apenas se fornecido
    if (data.password && data.password.trim() !== '') {
      partnerData.password = data.password;
    }
    if (editingPartner) {
      updatePartnerMutation.mutate(
        {
          id: editingPartner.id,
          data: partnerData
        },
        {
          onSuccess: () => {
            toast({
              title: "Parceiro atualizado",
              description: `Parceiro ${data.name} atualizado com sucesso`,
            });
            setIsDialogOpen(false);
            setEditingPartner(null);
            form.reset();
          },
          onError: (error) => {
            toast({
              title: "Erro ao atualizar parceiro",
              description: `Ocorreu um erro: ${error.message}`,
              variant: "destructive",
            });
          },
        }
      );
    } else {
      createPartnerMutation.mutate(
        partnerData as CreatePartnerInput,
        {
          onSuccess: () => {
            toast({
              title: "Parceiro criado",
              description: `Parceiro ${data.name} criado com sucesso`,
            });
            setIsDialogOpen(false);
            form.reset();
          },
          onError: (error) => {
            toast({
              title: "Erro ao criar parceiro",
              description: `Ocorreu um erro: ${error.message}`,
              variant: "destructive",
            });
          },
        }
      );
    }
  };

  /**
   * Cancela operação e fecha diálogo
   */
  const onCancel = () => {
    setIsDialogOpen(false);
    setEditingPartner(null);
    form.reset();
  };

  /**
   * Filtra parceiros baseado no termo de busca
   */
  const filteredPartners = useMemo(() => {
    if (!partnersQuery.data?.data) return [];
    
    const searchTermLower = searchTerm.toLowerCase();
    return partnersQuery.data.data.filter((partner) => {
      const document = partner.tipo_pessoa === 'pf' ? partner.cpf : partner.cnpj;
      return (
        partner.name.toLowerCase().includes(searchTermLower) ||
        (partner.email && partner.email.toLowerCase().includes(searchTermLower)) ||
        (document && document.toLowerCase().includes(searchTermLower))
      );
    });
  }, [partnersQuery.data, searchTerm]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Parceiros</h1>
        <Button onClick={handleNewPartner}>
          <Plus className="mr-2 h-4 w-4" /> Novo Parceiro
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Parceiros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partnersQuery.data?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Parceiros cadastrados no sistema
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Parceiros Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partnersQuery.data?.data?.filter(partner => partner.ativo === 's').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Parceiros com status ativo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pessoa Física</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partnersQuery.data?.data?.filter(partner => partner.tipo_pessoa === 'pf').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Parceiros pessoa física
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pessoa Jurídica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {partnersQuery.data?.data?.filter(partner => partner.tipo_pessoa === 'pj').length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Parceiros pessoa jurídica
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Parceiros */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Parceiros</CardTitle>
          <CardDescription>
            Gerencie seus parceiros, visualize informações e histórico de atividades.
          </CardDescription>
          <div className="flex items-center mt-4">
            <Search className="h-4 w-4 mr-2 opacity-50" />
            <Input
              placeholder="Buscar por nome, email ou documento..."
              className="max-w-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {partnersQuery.isLoading ? (
            <div className="flex justify-center items-center py-8">
              <p>Carregando parceiros...</p>
            </div>
          ) : partnersQuery.isError ? (
            <div className="flex justify-center items-center py-8 text-red-500">
              <p>Erro ao carregar parceiros: {partnersQuery.error.message}</p>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="flex justify-center items-center py-8">
              <p>Nenhum parceiro encontrado.</p>
            </div>
          ) : (
            <PartnersTable 
              partners={filteredPartners}
              onEdit={handleEditPartner}
              onDelete={handleDeletePartner}
              onView={(partner) => navigate(`/${link_admin}/partners/${partner.id}`)}
              isLoading={partnersQuery.isLoading}
            />
          )}
        </CardContent>
      </Card>

      {/* Diálogo do Formulário de Parceiro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPartner ? "Editar Parceiro" : "Novo Parceiro"}</DialogTitle>
            <DialogDescription>
              {editingPartner
                ? "Atualize as informações do parceiro no formulário abaixo."
                : "Preencha as informações do novo parceiro."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <PartnerForm form={form} isLoading={createPartnerMutation.isPending || updatePartnerMutation.isPending} />
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createPartnerMutation.isPending || updatePartnerMutation.isPending}>
                {editingPartner ? "Atualizar" : "Criar"} Parceiro
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={openDeleteDialog} onOpenChange={setOpenDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o parceiro {partnerToDelete?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeletePartner} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}