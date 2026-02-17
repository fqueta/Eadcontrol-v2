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
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, ArrowLeft, ChevronRight, FileText, Search, Globe, Save, LayoutTemplate } from "lucide-react";

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
    await createMutation.mutateAsync(values as any);
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
            <span className="text-primary italic">Nova</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <LayoutTemplate className="h-8 w-8 text-primary" />
            Nova Página
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Crie uma nova página institucional para o seu site.</p>
        </div>
        <div className="flex items-center gap-3">
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
        <CardContent className="p-8 space-y-8">
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
                disabled={createMutation.isPending}
                className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black shadow-lg shadow-primary/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
              >
                {createMutation.isPending ? (
                    <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Criando...</span>
                    </>
                ) : (
                    <>
                        <Save className="h-4 w-4" />
                        <span>Criar Página</span>
                    </>
                )}
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
