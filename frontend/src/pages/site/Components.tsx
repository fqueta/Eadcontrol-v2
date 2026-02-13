import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useContentTypesApi } from "@/hooks/contentTypes";
import type { ContentTypeItem } from "@/services/contentTypesService";

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  active: z.boolean().default(true),
  kind: z.enum(["banner", "lista", "carrossel"], {
    required_error: "Selecione um tipo",
    invalid_type_error: "Tipo inválido",
  }),
  config: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Components() {
  const { useList, useCreate, useUpdate, useDelete } = useContentTypesApi();
  const { data, isLoading, error } = useList({ per_page: 10, order_by: "created_at", order: "desc" });
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const deleteMutation = useDelete();

  const items = useMemo(() => {
    const arr = data?.data || [];
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContentTypeItem | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      active: true,
      kind: "banner",
      config: "",
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      description: "",
      active: true,
      kind: "banner",
      config: "",
    });
    setOpen(true);
  };

  const openEdit = (item: ContentTypeItem) => {
    setEditing(item);
    form.reset({
      name: item.name || "",
      description: item.description || "",
      active: !!item.active,
      kind: (item.kind as any) || "banner",
      config: item.config ? JSON.stringify(item.config, null, 2) : "",
    });
    setOpen(true);
  };

  const handleSubmit = async (values: FormData) => {
    const payload = {
      name: values.name,
      description: values.description,
      active: values.active,
      kind: values.kind,
      config: values.config ? safeParseJson(values.config) : undefined,
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: String(editing.id), data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setOpen(false);
  };

  const safeParseJson = (txt: string) => {
    try {
      const obj = JSON.parse(txt);
      return obj && typeof obj === "object" ? obj : {};
    } catch {
      return {};
    }
  };

  const handleDelete = async (id: string | number) => {
    await deleteMutation.mutateAsync(String(id));
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Componentes do Site</h1>
          <p className="text-sm text-muted-foreground">Tipos de conteúdo para usar nas páginas (banner, lista, carrossel).</p>
        </div>
        <Button onClick={openCreate}>Novo Componente</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Publicado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5}>Carregando…</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5}>Erro ao carregar</TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>Nenhum componente encontrado</TableCell>
              </TableRow>
            ) : (
              items.map((it) => (
                <TableRow key={String(it.id)}>
                  <TableCell>{it.name}</TableCell>
                  <TableCell className="text-muted-foreground">{it.kind}</TableCell>
                  <TableCell className="text-muted-foreground">{it.slug}</TableCell>
                  <TableCell>{it.active ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(it)}>Editar</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(it.id)}>Excluir</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Componente" : "Novo Componente"}</DialogTitle>
            <DialogDescription>Defina o tipo de conteúdo e configurações.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <Input {...form.register("name")} placeholder="Nome do componente" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo *</label>
                <select
                  className="border rounded-md h-9 px-2"
                  {...form.register("kind")}
                >
                  <option value="banner">Banner</option>
                  <option value="lista">Lista</option>
                  <option value="carrossel">Carrossel</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea {...form.register("description")} placeholder="Descrição do componente (opcional)" className="min-h-[100px]" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Config (JSON)</label>
              <Textarea {...form.register("config")} placeholder='{"schema":[...],"defaults":{...}}' className="min-h-[140px]" />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Publicado</div>
                <div className="text-xs text-muted-foreground">Disponível para uso</div>
              </div>
              <Switch checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", v)} />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editing ? (updateMutation.isPending ? "Atualizando..." : "Atualizar") : (createMutation.isPending ? "Criando..." : "Criar")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
