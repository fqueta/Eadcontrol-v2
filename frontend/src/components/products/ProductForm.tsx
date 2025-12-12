import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";
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

// Form validation schema
const productSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  category: z.string().min(1, "Categoria é obrigatória"),
  salePrice: z.number().min(0, "Preço de venda deve ser maior ou igual a 0"),
  costPrice: z.number().min(0, "Preço de custo deve ser maior ou igual a 0"),
  stock: z.number().int().min(0, "Estoque deve ser maior ou igual a 0"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  active: z.boolean(),
  image: z.string().url("Deve ser uma URL válida").optional().or(z.literal("")),
  points: z.number().min(0, "Pontos devem ser maior ou igual a 0"),
  rating: z.number().min(0).max(5, "Avaliação deve estar entre 0 e 5").optional(),
  reviews: z.number().int().min(0, "Número de avaliações deve ser maior ou igual a 0").optional(),
  availability: z.enum(["available", "limited", "unavailable"], {
    required_error: "Disponibilidade é obrigatória",
  }),
  terms: z.array(z.string()).min(1, "Pelo menos um termo deve ser adicionado"),
  validUntil: z.string().optional(),
});

export type ProductFormData = z.infer<typeof productSchema>;

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

interface ProductFormProps {
  form: UseFormReturn<ProductFormData>;
  onSubmit: (data: ProductFormData) => void;
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

export function ProductForm({
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
}: ProductFormProps) {
  // console.log('categories', categories);
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Nome do Produto</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome do produto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Descrição do produto (opcional)" 
                    className="resize-none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingCategories || !!categoriesError}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingCategories ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Carregando categorias...
                      </div>
                    ) : categoriesError ? (
                      <div className="p-2 text-sm text-destructive">
                        Erro ao carregar categorias
                      </div>
                    ) : !categories || categories.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Nenhuma categoria disponível
                      </div>
                    ) : (
                      categories?.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      )) || []
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Link da Imagem</FormLabel>
                <FormControl>
                  <Input 
                    type="url"
                    placeholder="https://exemplo.com/imagem.jpg (opcional)" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de Venda</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço de Custo</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estoque</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoadingUnits || !!unitsError}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma unidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {isLoadingUnits ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Carregando unidades...
                      </div>
                    ) : unitsError ? (
                      <div className="p-2 text-sm text-destructive">
                        Erro ao carregar unidades
                      </div>
                    ) : !units || units.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        Nenhuma unidade disponível
                      </div>
                    ) : (
                      units?.map((unit) => (
                        <SelectItem key={unit.value || unit.id} value={String(unit.value || unit.label || unit.name)}>
                          {unit.label || unit.name}
                        </SelectItem>
                      )) || []
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pontos</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Avaliação (0-5)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1"
                    min="0"
                    max="5"
                    placeholder="0.0" 
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="reviews"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Avaliações</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="availability"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disponibilidade</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a disponibilidade" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Disponível</SelectItem>
                    <SelectItem value="limited">Limitado</SelectItem>
                    <SelectItem value="unavailable">Indisponível</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => {
              const [newTerm, setNewTerm] = useState("");
              
              const addTerm = () => {
                if (newTerm.trim() && !field.value?.includes(newTerm.trim())) {
                  field.onChange([...(field.value || []), newTerm.trim()]);
                  setNewTerm("");
                }
              };
              
              const removeTerm = (termToRemove: string) => {
                field.onChange(field.value?.filter(term => term !== termToRemove) || []);
              };
              
              return (
                <FormItem>
                  <FormLabel>Termos e Condições</FormLabel>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Adicionar termo"
                        value={newTerm}
                        onChange={(e) => setNewTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTerm())}
                      />
                      <Button type="button" onClick={addTerm} variant="outline">
                        Adicionar
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {field.value?.map((term, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {term}
                          <X 
                            className="h-3 w-3 cursor-pointer" 
                            onClick={() => removeTerm(term)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          <FormField
            control={form.control}
            name="validUntil"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Válido Até (opcional)</FormLabel>
                <FormControl>
                  <Input 
                    type="date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Produto Ativo</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Produto disponível para venda
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


        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export { productSchema };
export type { Category, Unit };