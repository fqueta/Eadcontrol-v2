import { useEffect, useState } from "react";
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
import { useNavigate, useParams, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, ChevronRight, FileText, Search, Globe, Save, LayoutTemplate, ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const pageSchema = z.object({
  name: z.string().min(2),
  content: z.string().optional(),
  active: z.boolean().default(true),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type PageFormData = z.infer<typeof pageSchema>;

export default function PageEdit() {
  const { useGetById, useUpdate } = usePagesApi();
  const updateMutation = useUpdate();
  const navigate = useNavigate();
  const params = useParams();
  const id = String(params.id || "");
  const { data: page, isLoading } = useGetById(id);
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

  useEffect(() => {
    if (page) {
      form.reset({
        name: page.title || "",
        content: page.content || "",
        active: !!page.active,
        metaTitle: page.metaTitle || "",
        metaDescription: page.metaDescription || "",
      });
    }
  }, [page]);

  const handleSubmit = async (values: PageFormData) => {
    await updateMutation.mutateAsync({ id, data: values });
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
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground/60">
            <Link to="/admin" className="hover:text-primary transition-colors">Administração</Link>
            <ChevronRight className="h-3 w-3" />
            <Link to="/admin/site/menus-site" className="hover:text-primary transition-colors">Páginas</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary italic">Editar</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <LayoutTemplate className="h-8 w-8 text-primary" />
            Editar Página
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Gerencie o conteúdo e configurações desta página.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200 dark:border-slate-800 mr-2">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/pagina/${(page as any)?.slug || ""}`)}
                disabled={!page?.active || !page?.slug}
                className="h-9 rounded-lg font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 gap-2"
                title="Ver no site"
            >
                <ExternalLink className="h-4 w-4" />
                <span className="sr-only md:not-sr-only">Ver</span>
            </Button>
            <div className="w-px bg-slate-200 dark:bg-slate-800 my-1 mx-1" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                const slug = (page as any)?.slug;
                if (!slug) return;
                const full = `${window.location.origin}/pagina/${slug}`;
                navigator.clipboard.writeText(full).then(
                    () => toast.success("Link público copiado"),
                    () => toast.error("Não foi possível copiar o link")
                );
                }}
                disabled={!page?.active || !page?.slug}
                className="h-9 rounded-lg font-bold text-muted-foreground hover:text-primary hover:bg-primary/5 gap-2"
                title="Copiar link"
            >
                <Copy className="h-4 w-4" />
                <span className="sr-only md:not-sr-only">Copiar</span>
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            onClick={() => navigate("/admin/site/menus-site")}
            className="rounded-xl h-11 px-6 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
      <Card className="border-none shadow-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-black tracking-tight">Conteúdo da Página</CardTitle>
              <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 leading-none mt-1">
                Informações principais e layout
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                <p className="text-sm font-bold text-muted-foreground animate-pulse">Carregando dados da página...</p>
             </div>
          ) : (
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
            <div className="space-y-3">
              <div className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Título da Página</div>
              <Input 
                {...form.register("name")} 
                placeholder="Ex: Sobre Nós" 
                className="h-14 text-lg font-bold rounded-xl bg-white dark:bg-slate-900 border-none shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 px-4"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Conteúdo e Mídia</div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleInsertImage} className="h-9 text-xs font-bold rounded-lg border-primary/20 hover:bg-primary/5 hover:text-primary transition-all">
                    Inserir Imagem
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowPreview((v) => !v)}
                    className="h-9 px-3 text-xs font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {showPreview ? <EyeOff className="w-3.5 h-3.5 mr-2" /> : <Eye className="w-3.5 h-3.5 mr-2" />}
                    {showPreview ? "Ocultar Preview" : "Mostrar Preview"}
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
                 <RichTextEditor
                   value={form.watch("content") || ""}
                   onChange={(html) => form.setValue("content", html, { shouldDirty: true })}
                   placeholder="Escreva o conteúdo da sua página aqui..."
                 />
              </div>
            </div>

            {showPreview && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Pré-visualização</div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 prose max-w-none bg-white dark:bg-slate-900 shadow-sm">
                  <div dangerouslySetInnerHTML={{ __html: form.watch("content") || "" }} />
                </div>
              </div>
            )}
            
            <div className="grid gap-6 p-6 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                        <Search className="h-4 w-4" />
                    </div>
                     <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Otimização para Buscadores (SEO)</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                         <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Meta Title</div>
                         <Input {...form.register("metaTitle")} placeholder="Título para resultados do Google" className="h-11 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700" />
                    </div>
                     <div className="space-y-2">
                         <div className="flex items-center justify-between">
                            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Visibilidade</div>
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider ${form.watch("active") ? "text-emerald-600" : "text-muted-foreground"}`}>
                                    {form.watch("active") ? "Publicado" : "Rascunho"}
                                </span>
                                <Switch checked={form.watch("active")} onCheckedChange={(v) => form.setValue("active", v)} />
                            </div>
                         </div>
                         <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs text-muted-foreground">
                            Defina se esta página estará visível publicamente em seu site.
                         </div>
                    </div>
                </div>
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Meta Description</div>
                  <Textarea {...form.register("metaDescription")} placeholder="Descrição curta para resultados de busca" className="min-h-[80px] rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 resize-none" />
                </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="ghost" onClick={() => navigate("/admin/site/menus-site")} className="mr-4 rounded-xl font-bold text-muted-foreground hover:text-foreground">Cancelar</Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black shadow-lg shadow-primary/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                {updateMutation.isPending ? (
                    <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Atualizando...</span>
                    </>
                ) : (
                    <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Salvar Alterações</span>
                    </>
                )}
              </Button>
            </div>
          </form>
          )}
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
