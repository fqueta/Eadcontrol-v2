import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePagesApi } from "@/hooks/pages";
import type { Page } from "@/services/pagesService";
import RichTextEditor from "@/components/ui/RichTextEditor";
import MediaLibraryModal from "@/components/media/MediaLibraryModal";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const pageSchema = z.object({
  name: z.string().min(2),
  content: z.string().optional(),
  active: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type PageFormData = z.infer<typeof pageSchema>;

export default function MenusSite() {
  const { useList, useCreate, useUpdate, useDelete } = usePagesApi();
  const { data, isLoading, error } = useList({ per_page: 10, order_by: "created_at", order: "desc" });
  const createMutation = useCreate();
  const updateMutation = useUpdate();
  const deleteMutation = useDelete();
  const navigate = useNavigate();

  const pages = useMemo(() => {
    const arr = data?.data || [];
    return Array.isArray(arr) ? arr : [];
  }, [data]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Page | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const form = useForm<PageFormData>({
    resolver: zodResolver(pageSchema),
    defaultValues: {
      name: "",
      content: "",
      active: true,
      metaTitle: "",
      metaDescription: "",
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({
      name: "",
      content: "",
      active: true,
      metaTitle: "",
      metaDescription: "",
    });
    setOpen(true);
  };

  const openEdit = (page: Page) => {
    setEditing(page);
    form.reset({
      name: page.title || "",
      content: page.content || "",
      active: !!page.active,
      metaTitle: page.metaTitle || "",
      metaDescription: page.metaDescription || "",
    });
    setOpen(true);
  };

  const handleSubmit = async (values: PageFormData) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: String(editing.id), data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setOpen(false);
  };

  const handleDelete = async (id: string | number) => {
    await deleteMutation.mutateAsync(String(id));
  };
  
  const handleInsertImage = () => {
    setMediaOpen(true);
  };
  const handleSelectMedia = (item: any) => {
    const url =
      item?.file?.url ||
      item?.url ||
      item?.config?.file?.url ||
      item?.data?.file?.url ||
      item?.data?.url ||
      item?.data?.data?.file?.url ||
      item?.data?.data?.url ||
      "";
    const title = item?.title || item?.name || "";
    const current = form.getValues("content") || "";
    const imgHtml = `<p><img src="${url}" alt="${title}"></p>`;
    form.setValue("content", current ? `${current}\n${imgHtml}` : imgHtml, { shouldDirty: true });
    setMediaOpen(false);
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Páginas do Site</h1>
          <p className="text-sm text-muted-foreground">Gerencie páginas públicas do site.</p>
        </div>
        <Button onClick={() => navigate("/admin/site/pages/create")}>Nova Página</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Publicado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>Carregando…</TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={4}>Erro ao carregar</TableCell>
              </TableRow>
            ) : pages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4}>Nenhuma página encontrada</TableCell>
              </TableRow>
            ) : (
              pages.map((p) => (
                <TableRow key={String(p.id)}>
                  <TableCell>{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">{p.slug}</TableCell>
                  <TableCell>{p.active ? "Sim" : "Não"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/site/pages/${p.id}/edit`)}>Editar</Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/pagina/${p.slug}`)}
                      disabled={!p.active}
                    >
                      Ver no site
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const full = `${window.location.origin}/pagina/${p.slug}`;
                        navigator.clipboard.writeText(full).then(
                          () => toast.success("Link público copiado"),
                          () => toast.error("Não foi possível copiar o link")
                        );
                      }}
                      disabled={!p.active}
                    >
                      Copiar link
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>Excluir</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Página" : "Nova Página"}</DialogTitle>
            <DialogDescription>Preencha os dados da página.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input {...form.register("name")} placeholder="Título da página" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Conteúdo</label>
                <Button type="button" variant="outline" onClick={handleInsertImage}>
                  Inserir Imagem
                </Button>
              </div>
              <RichTextEditor
                value={form.watch("content") || ""}
                onChange={(html) => form.setValue("content", html, { shouldDirty: true })}
                placeholder="Conteúdo da página"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Pré-visualização</div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPreview((v) => !v)}
                  className="h-8 px-2"
                >
                  {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                  {showPreview ? "Ocultar" : "Mostrar"}
                </Button>
              </div>
              {showPreview && (
                <div className="border rounded-md p-4 prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: form.watch("content") || "" }} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Publicado</div>
                  <div className="text-xs text-muted-foreground">Disponível publicamente</div>
                </div>
                <Switch checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", v)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Meta Title</label>
                <Input {...form.register("metaTitle")} placeholder="Título SEO (opcional)" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Meta Description</label>
              <Textarea {...form.register("metaDescription")} placeholder="Descrição SEO (opcional)" className="min-h-[100px]" />
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
      
      <MediaLibraryModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={handleSelectMedia}
        defaultFilters={{ mime: "image/" }}
      />
    </div>
  );
}
