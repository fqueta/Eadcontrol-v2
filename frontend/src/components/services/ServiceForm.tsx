import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { SKILL_LEVELS, TIME_UNITS } from "@/types/services";

// Form validation schema
const serviceSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  price: z.number().min(0.01, "Preço deve ser maior que 0"),
  estimatedDuration: z.number().min(1, "Duração estimada deve ser maior que 0"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  active: z.boolean(),
  requiresMaterials: z.boolean(),
  skillLevel: z.enum(["basic", "intermediate", "advanced", "expert"], {
    required_error: "Nível de habilidade é obrigatório"
  }),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

interface Category {
  id?: string | number;
  name?: string;
}

interface Unit {
  id?: number;
  name?: string;
  label?: string;
  value?: string;
}

interface ServiceFormProps {
  form: UseFormReturn<ServiceFormData>;
  onSubmit: (data: ServiceFormData) => void;
  isSubmitting: boolean;
  categories: Category[];
  units: Unit[];
  isLoadingCategories: boolean;
  isLoadingUnits: boolean;
  categoriesError: any;
  unitsError: any;
  onCancel: () => void;
  isEditing: boolean;
}

/**
 * Componente de formulário para criação e edição de serviços
 * Inclui validação de dados e interface responsiva
 */
export default function ServiceForm({
  form,
  onSubmit,
  isSubmitting,
  categories,
  units,
  isLoadingCategories,
  isLoadingUnits,
  categoriesError,
  unitsError,
  onCancel,
  isEditing
}: ServiceFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nome do Serviço */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Serviço *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Digite o nome do serviço"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Categoria */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting || isLoadingCategories}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoriesError ? (
                    <SelectItem value="__error__" disabled>
                      Erro ao carregar categorias
                    </SelectItem>
                  ) : isLoadingCategories ? (
                    <SelectItem value="__loading__" disabled>
                      Carregando...
                    </SelectItem>
                  ) : categories.length === 0 ? (
                    <SelectItem value="__empty__" disabled>
                      Nenhuma categoria encontrada
                    </SelectItem>
                  ) : (
                    categories.map((category) => (
                      <SelectItem
                        key={category.id || category.name}
                        value={String(category.id) || `category_${category.id}`}
                      >
                        {category.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Descrição */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva o serviço (opcional)"
                className="resize-none"
                {...field}
                disabled={isSubmitting}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Preço */}
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Preço (R$) *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nível de Habilidade */}
        <FormField
          control={form.control}
          name="skillLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nível de Habilidade *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {SKILL_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Duração Estimada */}
        <FormField
          control={form.control}
          name="estimatedDuration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Duração Estimada *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="60"
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unidade de Tempo */}
        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unidade de Tempo *</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting || isLoadingUnits}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma unidade" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {unitsError ? (
                    <SelectItem value="__units_error__" disabled>
                      Erro ao carregar unidades
                    </SelectItem>
                  ) : isLoadingUnits ? (
                    <SelectItem value="__units_loading__" disabled>
                      Carregando...
                    </SelectItem>
                  ) : units.length === 0 ? (
                    TIME_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label}
                      </SelectItem>
                    ))
                  ) : (
                    units.map((unit) => (
                      <SelectItem
                        key={unit.id || unit.value}
                        value={unit.value || unit.name || `unit_${unit.id}`}
                      >
                        {unit.label || unit.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Switches */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="requiresMaterials"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Requer Materiais</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Este serviço necessita de materiais específicos
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Serviço Ativo</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Serviço disponível para contratação
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEditing
              ? "Atualizando..."
              : "Criando..."
            : isEditing
            ? "Atualizar Serviço"
            : "Criar Serviço"}
        </Button>
      </div>
      </form>
    </Form>
  );
}

export { serviceSchema };
export type { Category, Unit };