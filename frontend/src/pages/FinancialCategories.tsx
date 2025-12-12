/**
 * Página de gerenciamento de categorias financeiras
 * CRUD completo para administração de categorias de receitas e despesas
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  FolderTree,
  FolderOpen,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useToast } from "../hooks/use-toast";

// Hooks e serviços específicos para categorias financeiras
import {
  useFinancialCategoriesList,
  useCreateFinancialCategory,
  useUpdateFinancialCategory,
  useDeleteFinancialCategory,
} from "../hooks/financialCategories";
import {
  FinancialCategory,
  CreateFinancialCategoryInput,
  UpdateFinancialCategoryInput,
  FinancialCategoryFormData,
  TransactionType,
  FINANCIAL_CATEGORY_COLORS,
  FINANCIAL_CATEGORY_TYPES,
} from "../types/financial";

// Schema de validação do formulário
const financialCategorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().max(500, "Descrição muito longa").optional(),
  type: z.enum([TransactionType.INCOME, TransactionType.EXPENSE], {
    required_error: "Tipo é obrigatório",
  }),
  color: z.string().min(1, "Cor é obrigatória"),
  parentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

/**
 * Componente principal de gerenciamento de categorias financeiras
 */
export default function FinancialCategories() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<FinancialCategory | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Hooks para operações CRUD
  const { data: categoriesResponse, isLoading: isLoadingCategories } = useFinancialCategoriesList({
    search: searchTerm || undefined,
    type: typeFilter === "all" ? undefined : typeFilter,
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
    limit: 50,
  });

  const categories = categoriesResponse?.data || [];

  // Formulário
  const form = useForm<FinancialCategoryFormData>({
    resolver: zodResolver(financialCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      type: TransactionType.EXPENSE,
      color: FINANCIAL_CATEGORY_COLORS[0],
      parentId: "",
      isActive: true,
    },
  });

  // Mutações
  const createMutation = useCreateFinancialCategory();
  const updateMutation = useUpdateFinancialCategory();
  const deleteMutation = useDeleteFinancialCategory();

  // Handlers
  const handleNewCategory = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      description: "",
      type: TransactionType.EXPENSE,
      color: FINANCIAL_CATEGORY_COLORS[0],
      parentId: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEditCategory = (category: FinancialCategory) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      type: category.type,
      color: category.color,
      parentId: category.parentId || "",
      isActive: category.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    
    try {
      await deleteMutation.mutateAsync(deletingCategory.id);
      setDeletingCategory(null);
    } catch (error) {
      // Erro já tratado no hook de mutação
    }
  };

  const onSubmit = async (data: FinancialCategoryFormData) => {
    try {
      if (editingCategory) {
        const updateData: UpdateFinancialCategoryInput = {
          name: data.name,
          description: data.description || undefined,
          type: data.type,
          color: data.color,
          parentId: data.parentId || undefined,
          isActive: data.isActive,
        };
        await updateMutation.mutateAsync({ id: editingCategory.id, data: updateData });
      } else {
        const createData: CreateFinancialCategoryInput = {
          name: data.name,
          description: data.description || undefined,
          type: data.type,
          color: data.color,
          parentId: data.parentId || undefined,
          isActive: data.isActive,
        };
        await createMutation.mutateAsync(createData);
      }
      setIsDialogOpen(false);
      setEditingCategory(null);
      form.reset();
    } catch (error) {
      // Erro já tratado nos hooks de mutação
    }
  };

  // Filtros e estatísticas
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (category.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || category.type === typeFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && category.isActive) ||
      (statusFilter === "inactive" && !category.isActive);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => c.isActive).length;
  const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME).length;
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE).length;

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categorias Financeiras</h1>
          <p className="text-muted-foreground">
            Gerencie as categorias de receitas e despesas
          </p>
        </div>
        <Button onClick={handleNewCategory}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Categorias</CardTitle>
            <FolderTree className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias Ativas</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCategories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{incomeCategories}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expenseCategories}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Use os filtros abaixo para encontrar categorias específicas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar categorias..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value={TransactionType.INCOME}>Receitas</SelectItem>
                <SelectItem value={TransactionType.EXPENSE}>Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de categorias */}
      <Card>
        <CardHeader>
          <CardTitle>Categorias ({filteredCategories.length})</CardTitle>
          <CardDescription>
            Lista de todas as categorias financeiras cadastradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingCategories ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Carregando categorias...
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Nenhuma categoria encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={category.type === TransactionType.INCOME ? "default" : "destructive"}
                      >
                        {category.type === TransactionType.INCOME ? "Receita" : "Despesa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm text-muted-foreground">{category.color}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {category.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {category.isActive ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={category.isActive ? "text-green-600" : "text-gray-400"}>
                          {category.isActive ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingCategory(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de criação/edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory 
                ? "Edite as informações da categoria financeira."
                : "Crie uma nova categoria para organizar suas receitas e despesas."
              }
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da categoria" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FINANCIAL_CATEGORY_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor *</FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {FINANCIAL_CATEGORY_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={`w-8 h-8 rounded-full border-2 ${
                              field.value === color ? "border-gray-900" : "border-gray-300"
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => field.onChange(color)}
                          />
                        ))}
                      </div>
                      <FormControl>
                        <Input
                          placeholder="#000000"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e.target.value);
                          }}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição da categoria (opcional)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Categoria Ativa</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        Categorias inativas não aparecerão nas listagens
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
              
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : editingCategory ? "Salvar" : "Criar"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deletingCategory?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}