import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover, PopoverTrigger, PopoverContent,
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { currencyApplyMask, currencyRemoveMaskToString } from '@/lib/masks/currency';
import { cupomService, CupomRecord, CursoOption } from "@/services/cupomService";

const formSchema = z.object({
  codigo: z.string().min(1, "Código obrigatório").max(50),
  tipo: z.enum(["percentual", "fixo"]),
  valor_desconto: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  validade_inicio: z.string().optional(),
  validade_fim: z.string().optional(),
  limite_uso: z.coerce.number().min(0).optional().or(z.literal("")),
  valor_minimo: z.coerce.number().min(0).optional().or(z.literal("")),
  ativo: z.enum(["s", "n"]),
  descricao: z.string().optional(),
  cursos: z.array(z.number()).optional(),
});

export type CupomFormValues = z.infer<typeof formSchema>;

interface CupomDescontoFormProps {
  initialData?: CupomRecord | null;
  onSubmit: (data: CupomFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export default function CupomDescontoForm({ initialData, onSubmit, isSubmitting }: CupomDescontoFormProps) {
  const [cursosDisponiveis, setCursosDisponiveis] = useState<CursoOption[]>([]);
  const [cursosLoading, setCursosLoading] = useState(false);
  const [cursosPopoverOpen, setCursosPopoverOpen] = useState(false);
  const [valorMinimoMask, setValorMinimoMask] = useState("");

  const form = useForm<CupomFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      codigo: "",
      tipo: "percentual",
      valor_desconto: 0,
      ativo: "s",
      descricao: "",
      cursos: [],
    },
  });

  const selectedCursos = form.watch("cursos") || [];

  useEffect(() => {
    if (initialData) {
      setValorMinimoMask(
        initialData.valor_minimo
          ? currencyApplyMask(String(Math.round(Number(initialData.valor_minimo) * 100)), 'pt-BR', 'BRL')
          : ""
      );
      form.reset({
        codigo: initialData.codigo,
        tipo: initialData.tipo,
        valor_desconto: Number(initialData.valor_desconto),
        validade_inicio: initialData.validade_inicio ? initialData.validade_inicio.slice(0, 16) : "",
        validade_fim: initialData.validade_fim ? initialData.validade_fim.slice(0, 16) : "",
        limite_uso: initialData.limite_uso ?? undefined,
        valor_minimo: initialData.valor_minimo ? Number(initialData.valor_minimo) : undefined,
        ativo: initialData.ativo,
        descricao: initialData.descricao || "",
        cursos: initialData.cursos?.map((c) => c.id) || [],
      });
    } else {
      setValorMinimoMask("");
      form.reset({
        codigo: "",
        tipo: "percentual",
        valor_desconto: 0,
        validade_inicio: "",
        validade_fim: "",
        limite_uso: undefined,
        valor_minimo: undefined,
        ativo: "s",
        descricao: "",
        cursos: [],
      });
    }
  }, [initialData, form]);

  useEffect(() => {
    setCursosLoading(true);
    cupomService.cursosDisponiveis()
      .then(setCursosDisponiveis)
      .catch(() => setCursosDisponiveis([]))
      .finally(() => setCursosLoading(false));
  }, []);

  const toggleCurso = (id: number) => {
    const current = form.getValues("cursos") || [];
    if (current.includes(id)) {
      form.setValue("cursos", current.filter((v) => v !== id), { shouldValidate: true });
    } else {
      form.setValue("cursos", [...current, id], { shouldValidate: true });
    }
  };

  const handleFormSubmit = async (data: CupomFormValues) => {
    const payload: any = { ...data };
    if (!payload.validade_inicio) delete payload.validade_inicio;
    if (!payload.validade_fim) delete payload.validade_fim;
    if (!payload.limite_uso && payload.limite_uso !== 0) delete payload.limite_uso;
    if (valorMinimoMask) {
      payload.valor_minimo = Number(currencyRemoveMaskToString(valorMinimoMask));
    } else {
      delete payload.valor_minimo;
    }
    await onSubmit(payload);
  };

  return (
    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="codigo">Código do Cupom</Label>
        <Input
          id="codigo"
          placeholder="Ex: PROMO10"
          className="uppercase font-mono font-bold"
          {...form.register("codigo")}
          onChange={(e) => form.setValue("codigo", e.target.value.toUpperCase())}
        />
        {form.formState.errors.codigo && (
          <p className="text-xs text-red-500">{form.formState.errors.codigo.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Select
            value={form.watch("tipo")}
            onValueChange={(v) => form.setValue("tipo", v as any)}
          >
            <SelectTrigger id="tipo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentual">Percentual (%)</SelectItem>
              <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="valor_desconto">Valor do Desconto</Label>
          <Input
            id="valor_desconto"
            type="number"
            step="0.01"
            placeholder={form.watch("tipo") === "percentual" ? "Ex: 10" : "Ex: 50"}
            {...form.register("valor_desconto")}
          />
          {form.formState.errors.valor_desconto && (
            <p className="text-xs text-red-500">{form.formState.errors.valor_desconto.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="validade_inicio">Início da Validade</Label>
          <Input id="validade_inicio" type="datetime-local" {...form.register("validade_inicio")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="validade_fim">Fim da Validade</Label>
          <Input id="validade_fim" type="datetime-local" {...form.register("validade_fim")} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="limite_uso">Limite de Usos</Label>
          <Input id="limite_uso" type="number" placeholder="Ilimitado" {...form.register("limite_uso")} />
        </div>
        <div className="space-y-2">
          <Label>Valor Mínimo</Label>
          <Input
            placeholder="Sem mínimo"
            value={valorMinimoMask}
            onChange={(e) => setValorMinimoMask(currencyApplyMask(e.target.value, 'pt-BR', 'BRL'))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Cursos Aplicáveis</Label>
        <Popover open={cursosPopoverOpen} onOpenChange={setCursosPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between h-auto min-h-[2.5rem]">
              {cursosLoading && selectedCursos.length === 0 ? (
                <span className="text-muted-foreground">Carregando cursos...</span>
              ) : selectedCursos.length === 0 ? (
                <span className="text-muted-foreground">Todos os cursos</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedCursos.slice(0, 3).map((id) => {
                    const c = cursosDisponiveis.find((c) => c.id === id);
                    return c ? (
                      <Badge key={id} variant="secondary" className="text-xs">{c.titulo}</Badge>
                    ) : null;
                  })}
                  {selectedCursos.length > 3 && (
                    <Badge variant="secondary" className="text-xs">+{selectedCursos.length - 3}</Badge>
                  )}
                </div>
              )}
              <ChevronsUpDown className="w-4 h-4 ml-2 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Buscar curso..." />
              <CommandList>
                <CommandEmpty>Nenhum curso encontrado.</CommandEmpty>
                <CommandGroup>
                  {cursosDisponiveis.map((curso) => (
                    <CommandItem
                      key={curso.id}
                      value={curso.titulo}
                      onSelect={() => toggleCurso(curso.id)}
                    >
                      <Checkbox
                        checked={selectedCursos.includes(curso.id)}
                        className="mr-2"
                      />
                      {curso.titulo}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          Se nenhum curso for selecionado, o cupom vale para todos os cursos.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição</Label>
        <Textarea id="descricao" placeholder="Descrição interna do cupom" {...form.register("descricao")} />
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor="ativo">Ativo</Label>
        <Switch
          id="ativo"
          checked={form.watch("ativo") === "s"}
          onCheckedChange={(v) => form.setValue("ativo", v ? "s" : "n")}
        />
      </div>

      <div className="flex justify-end gap-4 pt-4">
        <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
          {isSubmitting ? "Salvando..." : initialData ? "Atualizar Cupom" : "Criar Cupom"}
        </Button>
      </div>
    </form>
  );
}
