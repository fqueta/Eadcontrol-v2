import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, ImageIcon } from "lucide-react";
import { useState, useCallback } from "react";
import { currencyApplyMask, currencyRemoveMaskToNumber } from "@/lib/masks/currency";
import { fileStorageService, type FileStorageItem } from "@/services/fileStorageService";
import MediaLibraryModal from "@/components/media/MediaLibraryModal";
import { ImageUpload } from "@/components/lib/ImageUpload";
import {
  Form,
  FormControl,
  FormDescription,
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
  salePrice: z.string().refine((v) => currencyRemoveMaskToNumber(v) >= 0, "Preço de venda deve ser maior ou igual a 0"),
  costPrice: z.string().refine((v) => currencyRemoveMaskToNumber(v) >= 0, "Preço de custo deve ser maior ou igual a 0"),
  stock: z.number().int().min(0, "Estoque deve ser maior ou igual a 0"),
  unit: z.string().min(1, "Unidade é obrigatória"),
  active: z.boolean(),
  image: z.string().url("Deve ser uma URL válida").optional().or(z.literal("")),
  rating: z.number().min(0).max(5, "Avaliação deve estar entre 0 e 5").optional(),
  reviews: z.number().int().min(0, "Número de avaliações deve ser maior ou igual a 0").optional(),
  availability: z.enum(["available", "limited", "unavailable"], {
    required_error: "Disponibilidade é obrigatória",
  }),
  validUntil: z.string().optional(),
  destaque: z.string().optional().default("n"),
  parcelas: z.string().optional(),
  valor_parcela: z.string().optional(),
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
  hideActions?: boolean;
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
  isEditing,
  hideActions = false
}: ProductFormProps) {
  const [mediaOpen, setMediaOpen] = useState(false);
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
                  <RichTextEditor
                    value={field.value || ''}
                    onChange={field.onChange}
                    placeholder="Descrição do produto (opcional)"
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
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingCategories || !!categoriesError}>
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
                <FormLabel>Imagem do Produto</FormLabel>
                <FormDescription>
                  Recomendado: imagem em formato quadrado (proporção 1:1, ex: 800x800 pixels) para evitar que a imagem seja cortada nas páginas do site.
                </FormDescription>
                <FormControl>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setMediaOpen(true)}
                        className="rounded-xl font-bold bg-primary/5 text-primary hover:bg-primary/10 border-primary/20"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Abrir Biblioteca
                      </Button>
                      {field.value && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-xl font-semibold text-muted-foreground hover:text-red-500"
                          onClick={() => field.onChange('')}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                    <div className="p-1 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/30">
                      <ImageUpload
                        name="image"
                        label=""
                        value={field.value || ''}
                        onChange={(val) => field.onChange(val || '')}
                        onUpload={async (file: File) => {
                          const resp: any = await fileStorageService.upload(file);
                          const url = typeof resp === 'string' ? resp : (resp?.url ?? resp?.data?.url ?? resp?.data?.data?.url);
                          if (!url) throw new Error('URL não retornada');
                          field.onChange(url);
                          return url;
                        }}
                        maxSize={5}
                        className="border-none shadow-none bg-transparent"
                      />
                    </div>
                    {field.value && (
                      <div className="aspect-video rounded-2xl border-2 border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center shadow-inner relative group max-w-xs">
                        <img
                          src={field.value}
                          alt="Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                  </div>
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
                    placeholder="R$ 0,00"
                    value={field.value || ''}
                    onChange={(e) => {
                      const v = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                      field.onChange(v);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="parcelas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número Máximo de Parcelas</FormLabel>
                <FormControl>
                  <Select
                    value={field.value || '1'}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="valor_parcela"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor da Parcela</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="R$ 0,00"
                    value={field.value || ''}
                    onChange={(e) => {
                      const v = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                      field.onChange(v);
                    }}
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
                    placeholder="R$ 0,00"
                    value={field.value || ''}
                    onChange={(e) => {
                      const v = currencyApplyMask(e.target.value, 'pt-BR', 'BRL');
                      field.onChange(v);
                    }}
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
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingUnits || !!unitsError}>
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
                <Select onValueChange={field.onChange} value={field.value}>
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

          <FormField
            control={form.control}
            name="destaque"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Produto em Destaque</FormLabel>
                  <div className="text-sm text-muted-foreground">
                    Exibir este produto na vitrine da página inicial
                  </div>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value === 's'}
                    onCheckedChange={(checked) => field.onChange(checked ? 's' : 'n')}
                  />
                </FormControl>
              </FormItem>
            )}
          />


        </div>

        {!hideActions && (
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
            </Button>
          </div>
        )}
      </form>

      <MediaLibraryModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={(item: FileStorageItem) => {
          const finalUrl = item?.file?.url || item?.url || fileStorageService.downloadUrl(item.id);
          form.setValue('image', finalUrl || '');
          setMediaOpen(false);
        }}
        defaultFilters={{ mime: 'image' }}
      />
    </Form>
  );
}

export { productSchema };
export type { Category, Unit };