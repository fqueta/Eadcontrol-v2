import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import RichTextEditor from "@/components/ui/RichTextEditor";
import MediaLibraryModal from "@/components/media/MediaLibraryModal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePagesApi } from "@/hooks/pages";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

const pageSchema = z.object({
  name: z.string().min(2),
  content: z.string().optional(),
  active: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type PageFormData = z.infer<typeof pageSchema>;

export default function PageCreate() {
  const { useCreate } = usePagesApi();
  const createMutation = useCreate();
  const navigate = useNavigate();
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

  const handleSubmit = async (values: PageFormData) => {
    await createMutation.mutateAsync(values);
    navigate("/admin/site/menus-site");
  };

  const handleInsertImage = () => setMediaOpen(true);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nova Página</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/site/menus-site")}>Voltar</Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Cadastro de Página</CardTitle>
          <CardDescription>Preencha as informações abaixo.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Título *</div>
              <Input {...form.register("name")} placeholder="Título da página" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Conteúdo</div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleInsertImage}>Inserir Imagem</Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPreview((v) => !v)}
                    className="h-8 px-2"
                  >
                    {showPreview ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showPreview ? "Ocultar Preview" : "Mostrar Preview"}
                  </Button>
                </div>
              </div>
              <RichTextEditor
                value={form.watch("content") || ""}
                onChange={(html) => form.setValue("content", html, { shouldDirty: true })}
                placeholder="Conteúdo da página"
              />
            </div>

            {showPreview && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Pré-visualização</div>
                <div className="border rounded-md p-4 prose max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: form.watch("content") || "" }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Publicado</div>
                  <div className="text-xs text-muted-foreground">Disponível publicamente</div>
                </div>
                <Switch checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", v)} />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Meta Title</div>
                <Input {...form.register("metaTitle")} placeholder="Título SEO (opcional)" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Meta Description</div>
              <Textarea {...form.register("metaDescription")} placeholder="Descrição SEO (opcional)" className="min-h-[100px]" />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate("/admin/site/menus-site")}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <MediaLibraryModal
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSelect={handleSelectMedia}
        defaultFilters={{ mime: "image/" }}
      />
    </div>
  );
}
