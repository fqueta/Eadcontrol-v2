import React, { useEffect, useMemo, useState } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
// HMR Force Update: Refreshing editor components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  useCertificateTemplate,
  useSaveCertificateTemplate,
  useCertificateModels,
  useCreateCertificateModel,
  useUpdateCertificateModel,
  useDeleteCertificateModel,
  useCertificateBackgrounds,
  useCreateCertificateBackground,
  useDeleteCertificateBackground,
} from '@/hooks/certificates';
import { useTurmasList } from '@/hooks/turmas';
import { coursesService } from '@/services/coursesService';
import { turmasService } from '@/services/turmasService';
import { Combobox, useComboboxOptions } from '@/components/ui/combobox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal';
import { ImagePlus, Save, Layout, Edit3, Eye, QrCode, Plus, Trash2, Layers, Loader2, GraduationCap, Check, X } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';

/**
 * CertificateTemplate
 * pt-BR: Página para criação/edição de modelos de certificado. Suporta múltiplos
 *        modelos, cada um podendo estar vinculado (ou não) a uma turma.
 * en-US: Page to create/edit certificate templates. Supports multiple models,
 *        each one optionally bound to a class (turma).
 */
export default function CertificateTemplate() {
  const { toast } = useToast();
  const { data: backendTemplate } = useCertificateTemplate({
    refetchOnMount: 'always',
    staleTime: 0
  });
  const saveTemplate = useSaveCertificateTemplate();
  const { data: modelsData } = useCertificateModels({ refetchOnMount: 'always', staleTime: 0 });
  const createModel = useCreateCertificateModel();
  const updateModel = useUpdateCertificateModel();
  const deleteModel = useDeleteCertificateModel();

  const backgroundsQuery = useCertificateBackgrounds({ staleTime: 60 * 1000 });
  const createBackground = useCreateCertificateBackground();
  const deleteBackground = useDeleteCertificateBackground();

  const backgrounds = ((backgroundsQuery.data as any)?.data || []) as any[];

  const models = ((modelsData as any)?.data || []) as any[];

  // Modelo selecionado: 'global' = modelo padrão (Option legada); senão id do modelo
  const [selectedId, setSelectedId] = useState<string>('global');
  const [modelName, setModelName] = useState('Modelo de Certificado');
  const [modelTurma, setModelTurma] = useState<string>('');

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('Modelo de Certificado');
  const [newTurma, setNewTurma] = useState<string>('');

  // Delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [title, setTitle] = useState('Certificado de Conclusão');
  const [showTitle, setShowTitle] = useState(true);
  const [body, setBody] = useState(
    'Certificamos que {studentName} concluiu o curso {courseName} em {completionDate}, com carga horária de {hours}.'
  );
  const [footerLeft, setFooterLeft] = useState('Coordenador');
  const [footerRight, setFooterRight] = useState('Diretor');
  const [signatureLeftUrl, setSignatureLeftUrl] = useState('');
  const [signatureRightUrl, setSignatureRightUrl] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#111827');
  const [qrPosition, setQrPosition] = useState('integrated');
  const [logoPosition, setLogoPosition] = useState('integrated');
  const [marginTop, setMarginTop] = useState(8);
  const [marginRight, setMarginRight] = useState(8);
  const [marginBottom, setMarginBottom] = useState(8);
  const [marginLeft, setMarginLeft] = useState(8);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'bg' | 'sigLeft' | 'sigRight'>('bg');

  // Busca turmas para o modal de criação
  const [turmaSearch, setTurmaSearch] = useState<string>('');
  const turmasQuery = useTurmasList(
    { page: 1, per_page: 200, search: turmaSearch || undefined },
    { staleTime: 5 * 60 * 1000 }
  );
  const turmaItems = ((turmasQuery.data as any)?.data || (turmasQuery.data as any)?.items || []) as any[];
  const turmaOptions = useComboboxOptions(turmaItems, 'id', 'nome', undefined, (t: any) =>
    t?.curso?.nome ? `Curso: ${t.curso.nome}` : undefined
  );

  // Cadastro rápido de turma a partir do modal de criação de modelo
  // pt-BR: Abre dialog com campos mínimos (nome + curso) para criar a turma
  //        sem sair da tela de modelos de certificado.
  // en-US: Opens a dialog with minimal fields (name + course) to create the class
  //        without leaving the certificate models screen.
  const queryClient = useQueryClient();
  const [isQuickTurmaOpen, setIsQuickTurmaOpen] = useState(false);
  const [quickTurmaNome, setQuickTurmaNome] = useState('');
  const [quickTurmaCurso, setQuickTurmaCurso] = useState('');
  const [quickTurmaInicio, setQuickTurmaInicio] = useState('');
  const [quickTurmaFim, setQuickTurmaFim] = useState('');
  const [quickTurmaCidade, setQuickTurmaCidade] = useState('');
  const [isCreatingQuickTurma, setIsCreatingQuickTurma] = useState(false);
  const [quickCourseSearch, setQuickCourseSearch] = useState('');

  const quickCoursesQuery = useQuery({
    queryKey: ['cursos', 'quick', 200, quickCourseSearch],
    queryFn: async () => coursesService.listCourses({ page: 1, per_page: 200, search: quickCourseSearch || undefined }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const quickCourseItems = ((quickCoursesQuery.data as any)?.data || (quickCoursesQuery.data as any)?.items || []) as any[];
  const quickCourseOptions = useComboboxOptions(quickCourseItems, 'id', 'nome', undefined, (c: any) => String(c?.titulo || ''));

  const handleQuickCreateTurma = async () => {
    if (!quickTurmaNome.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe o nome da turma.', variant: 'destructive' });
      return;
    }
    if (!quickTurmaCurso) {
      toast({ title: 'Curso obrigatório', description: 'Selecione o curso da turma.', variant: 'destructive' });
      return;
    }
    setIsCreatingQuickTurma(true);
    try {
      const created = await turmasService.createTurma({
        token: '',
        id_curso: Number(quickTurmaCurso),
        nome: quickTurmaNome.trim(),
        inicio: quickTurmaInicio || null,
        fim: quickTurmaFim || null,
        Cidade: quickTurmaCidade || null,
        ativo: 's',
        excluido: 'n',
        deletado: 'n',
        config: {} as any,
      } as any);
      const newId = created?.id ?? created?.data?.id;
      queryClient.invalidateQueries({ queryKey: ['turmas'] });
      setNewTurma(String(newId));
      setIsQuickTurmaOpen(false);
      setQuickTurmaNome('');
      setQuickTurmaCurso('');
      setQuickTurmaInicio('');
      setQuickTurmaFim('');
      setQuickTurmaCidade('');
      toast({ title: 'Turma criada', description: 'Turma criada e vinculada ao modelo.' });
    } catch (err: any) {
      const msg = String(err?.body?.message || err?.body?.errors || err?.message || 'Falha ao criar turma');
      toast({ title: 'Falha ao criar turma', description: msg, variant: 'destructive' });
    } finally {
      setIsCreatingQuickTurma(false);
    }
  };

  const selectedModel = useMemo(
    () => models.find((m) => String(m.id) === String(selectedId)) || null,
    [models, selectedId]
  );

  /**
   * applyConfig
   * pt-BR: Aplica um objeto de configuração do template aos estados do editor.
   * en-US: Applies a template config object to the editor states.
   */
  function applyConfig(tpl: any) {
    if (!tpl || (Array.isArray(tpl) && tpl.length === 0)) return;
    if (tpl.title !== undefined) setTitle(String(tpl.title));
    if (tpl.showTitle !== undefined) setShowTitle(Boolean(tpl.showTitle));
    if (tpl.body !== undefined) setBody(String(tpl.body));
    if (tpl.footerLeft !== undefined) setFooterLeft(String(tpl.footerLeft));
    if (tpl.footerRight !== undefined) setFooterRight(String(tpl.footerRight));
    if (tpl.signatureLeftUrl !== undefined) setSignatureLeftUrl(String(tpl.signatureLeftUrl || ''));
    if (tpl.signatureRightUrl !== undefined) setSignatureRightUrl(String(tpl.signatureRightUrl || ''));
    if (tpl.bgUrl !== undefined) setBgUrl(String(tpl.bgUrl || ''));
    if (tpl.accentColor !== undefined) setAccentColor(String(tpl.accentColor || '#111827'));
    if (tpl.qrPosition !== undefined) setQrPosition(String(tpl.qrPosition || 'integrated'));
    if (tpl.logoPosition !== undefined) setLogoPosition(String(tpl.logoPosition || 'integrated'));
    if (tpl.marginTop !== undefined) setMarginTop(Number(tpl.marginTop));
    if (tpl.marginRight !== undefined) setMarginRight(Number(tpl.marginRight));
    if (tpl.marginBottom !== undefined) setMarginBottom(Number(tpl.marginBottom));
    if (tpl.marginLeft !== undefined) setMarginLeft(Number(tpl.marginLeft));
  }

  // pt-BR: Carrega o modelo selecionado (global ou por turma).
  useEffect(() => {
    if (selectedId === 'global') {
      const tpl = (backendTemplate as any)?.config || {};
      setModelName('Modelo Padrão (Global)');
      setModelTurma('');
      applyConfig(tpl);
    } else if (selectedModel) {
      setModelName(String(selectedModel.name || 'Modelo de Certificado'));
      setModelTurma(selectedModel.id_turma ? String(selectedModel.id_turma) : '');
      applyConfig(selectedModel.config || {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, backendTemplate, models]);

  // Componente visual do QR Code Placeholder
  const QrPlaceholder = ({ className }: { className?: string }) => (
    <div className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 w-[90px] h-[90px] rounded-lg shadow-sm bg-white pointer-events-none ${className}`}>
      <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter leading-none">QR Code</span>
      <span className="text-[7px] text-gray-300 italic leading-none">dinâmico</span>
    </div>
  );

  // Componente visual do Logo Placeholder
  const LogoPlaceholder = ({ className }: { className?: string }) => (
    <div className={`flex flex-col items-center justify-center border-2 border-dashed border-gray-300 w-[120px] h-[60px] rounded-lg shadow-sm bg-white/50 backdrop-blur-sm pointer-events-none ${className}`}>
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">LOGO</span>
    </div>
  );

  // pt-BR: Pré-visualização com placeholders de exemplo.
  const preview = useMemo(() => {
    const sample = {
      studentName: 'Aluno Exemplo',
      courseName: 'Curso Interativo de Gestão',
      completionDate: '01/02/2025',
      startDate: '01/01/2025',
      endDate: '01/02/2025',
      hours: '40 horas',
      logo: logoPosition === 'integrated' ? `<div class="inline-flex items-center justify-center border-2 border-dashed border-gray-300 w-[100px] h-[40px] rounded shadow-sm bg-white/40 pointer-events-none align-middle mx-2 uppercase text-[8px] font-bold text-gray-500">LOGO</div>` : '',
      qrcode: qrPosition === 'integrated' ? `<div class="inline-flex flex-col items-center justify-center border-2 border-dashed border-gray-300 w-[80px] h-[80px] rounded-lg shadow-sm bg-white pointer-events-none align-middle my-2 mx-auto">
                <span class="text-[8px] font-bold text-gray-400 uppercase tracking-tighter leading-none">QR CODE</span>
               </div>` : ''
    } as Record<string, string>;
    return body.replace(/\{(.*?)\}/g, (_, key) => sample[key] ?? `{${key}}`);
  }, [body, qrPosition, logoPosition]);

  const logoFixedStyles = useMemo(() => {
    switch (logoPosition) {
      case 'top-left':     return "absolute top-8 left-8 z-20";
      case 'top-center':   return "absolute top-8 left-1/2 -translate-x-1/2 z-20";
      case 'top-right':    return "absolute top-8 right-8 z-20";
      case 'bottom-left':  return "absolute bottom-8 left-8 z-20";
      case 'bottom-center':return "absolute bottom-32 left-1/2 -translate-x-1/2 z-20";
      case 'bottom-right': return "absolute bottom-8 right-8 z-20";
      default: return "";
    }
  }, [logoPosition]);

  const qrFixedStyles = useMemo(() => {
    switch (qrPosition) {
      case 'top-left':     return "absolute top-8 left-8 z-20";
      case 'top-center':   return "absolute top-8 left-1/2 -translate-x-1/2 z-20";
      case 'top-right':    return "absolute top-8 right-8 z-20";
      case 'bottom-left':  return "absolute bottom-8 left-8 z-20";
      case 'bottom-center':return "absolute bottom-32 left-1/2 -translate-x-1/2 z-20"; // Above signatures
      case 'bottom-right': return "absolute bottom-8 right-8 z-20";
      default: return "";
    }
  }, [qrPosition]);

  function buildPayload() {
    return {
      title, showTitle, body, footerLeft, footerRight, signatureLeftUrl, signatureRightUrl,
      bgUrl, accentColor, qrPosition, logoPosition, marginTop, marginRight, marginBottom, marginLeft
    };
  }

  async function handleAddBackground(url: string) {
    try {
      await createBackground.mutateAsync({ name: 'Imagem de Fundo', url });
      toast({ title: 'Imagem adicionada', description: 'Imagem de fundo adicionada à galeria.' });
    } catch (e: any) {
      const msg = String(e?.body?.message || e?.body?.errors || e?.message || 'Falha ao adicionar imagem');
      toast({ title: 'Falha ao adicionar', description: msg, variant: 'destructive' });
    }
  }

  async function handleDeleteBackground(bg: any) {
    try {
      await deleteBackground.mutateAsync(bg.id);
      if (bgUrl === String(bg.url || '')) setBgUrl('');
      toast({ title: 'Imagem removida', description: 'Imagem de fundo removida da galeria.' });
    } catch (e: any) {
      const msg = String(e?.body?.message || e?.body?.errors || e?.message || 'Falha ao remover imagem');
      toast({ title: 'Falha ao remover', description: msg, variant: 'destructive' });
    }
  }

  async function handleSave() {
    const payload = buildPayload();
    try {
      if (selectedId === 'global') {
        await saveTemplate.mutateAsync(payload);
      } else if (selectedModel) {
        await updateModel.mutateAsync({
          id: selectedModel.id,
          name: modelName,
          id_turma: modelTurma ? Number(modelTurma) : null,
          config: payload,
        });
      }
      toast({ title: 'Modelo salvo', description: 'Modelo de certificado salvo no backend com sucesso.' });
    } catch (e) {
      toast({ title: 'Falha ao salvar', description: 'Não foi possível salvar o modelo.', variant: 'destructive' });
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      toast({ title: 'Nome obrigatório', description: 'Informe um nome para o modelo.', variant: 'destructive' });
      return;
    }
    try {
      const created = await createModel.mutateAsync({
        name: newName.trim(),
        id_turma: newTurma ? Number(newTurma) : null,
        config: buildPayload(),
      });
      setNewName('Modelo de Certificado');
      setNewTurma('');
      setIsCreateOpen(false);
      const createdId = created?.id ?? created?.data?.id;
      if (createdId) {
        setSelectedId(String(createdId));
      }
      toast({ title: 'Modelo criado', description: 'Novo modelo criado com sucesso.' });
    } catch (e: any) {
      const msg = String(e?.body?.message || e?.body?.errors || e?.message || 'Falha ao criar modelo');
      toast({ title: 'Falha ao criar', description: msg, variant: 'destructive' });
    }
  }

  async function handleDelete() {
    if (!selectedModel) return;
    try {
      await deleteModel.mutateAsync(selectedModel.id);
      setSelectedId('global');
      setIsDeleteOpen(false);
      toast({ title: 'Modelo excluído', description: 'Modelo removido com sucesso.' });
    } catch (e) {
      toast({ title: 'Falha ao excluir', description: 'Não foi possível excluir o modelo.', variant: 'destructive' });
    }
  }

  const isGlobal = selectedId === 'global';

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto auto-rows-min font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Layout className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Modelos de Certificado</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Crie modelos globais ou vinculados a uma turma. A matrícula usará o modelo da sua turma.
          </p>
        </div>
        <div className="flex gap-2">
          {!isGlobal && selectedModel && (
            <Button variant="destructive" className="gap-2 shadow-sm px-4" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Excluir
            </Button>
          )}
          <Button onClick={handleSave} className="gap-2 shadow-sm px-6">
            <Save className="h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      {/* Model Selector */}
      <Card className="shadow-sm border-2">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-end gap-4">
          <div className="space-y-2 flex-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Layers className="h-3.5 w-3.5" /> Modelo sendo editado
            </Label>
            <Select
              value={selectedId}
              onValueChange={(v) => setSelectedId(v)}
            >
              <SelectTrigger className="w-full h-11 bg-muted/20 border-2">
                <SelectValue placeholder="Selecione um modelo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Modelo Padrão (Global)</SelectItem>
                {models.map((m) => (
                  <SelectItem key={String(m.id)} value={String(m.id)}>
                    {m.name}{m.turma_nome ? ` — Turma: ${m.turma_nome}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!isGlobal && selectedModel && (
            <div className="space-y-2 md:w-72">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do modelo</Label>
              <Input value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="Ex: Certificado Turma 2024" />
            </div>
          )}

          <Button variant="outline" className="gap-2 shadow-sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Modelo
          </Button>
        </CardContent>
        {!isGlobal && selectedModel && (
          <div className="px-4 pb-4">
            <Badge variant={selectedModel.id_turma ? 'default' : 'secondary'}>
              {selectedModel.id_turma ? `Vinculado à turma: ${selectedModel.turma_nome || selectedModel.id_turma}` : 'Modelo sem turma (não utilizado automaticamente)'}
            </Badge>
          </div>
        )}
      </Card>

      <Tabs defaultValue="editor" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-[400px] grid-cols-2 shadow-sm border h-11">
            <TabsTrigger value="editor" className="gap-2 text-sm font-semibold transition-all">
              <Edit3 className="h-4 w-4" />
              1. Editar Conteúdo
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2 text-sm font-semibold transition-all">
              <Eye className="h-4 w-4" />
              2. Visualizar Real
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <Card className="shadow-sm border-2">
                <CardHeader className="bg-muted/10 pb-4">
                  <CardTitle className="text-xl">Conteúdo do Certificado</CardTitle>
                  <CardDescription>
                    O texto abaixo será renderizado com formatação HTML. Utilize: {'{logo}'}, {'{studentName}'}, {'{courseName}'}, {'{startDate}'}, {'{endDate}'}, {'{completionDate}'}, {'{hours}'} e {'{qrcode}'}.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Título do Certificado</label>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="show-title" className="text-xs text-muted-foreground cursor-pointer">Exibir título</Label>
                        <Switch id="show-title" checked={showTitle} onCheckedChange={setShowTitle} />
                      </div>
                    </div>
                    {showTitle && (
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Certificado de Conclusão"
                        className="text-lg font-semibold h-12"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Corpo do Texto (Editor HTML)</label>
                    <RichTextEditor
                      value={body}
                      onChange={(html) => setBody(html)}
                      placeholder="Escreva o texto do certificado aqui..."
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-2">
                <CardHeader className="bg-muted/10 pb-4">
                  <CardTitle className="text-xl">Rodapé e Assinaturas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 p-4 border rounded-xl bg-muted/5 transition-colors hover:bg-muted/10 group">
                      <label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                         <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                         Assinatura Esquerda
                      </label>
                      <div className="space-y-3">
                        <Input value={footerLeft} onChange={(e) => setFooterLeft(e.target.value)} placeholder="Cargo / Nome" />
                        <div className="flex gap-2">
                          <Input value={signatureLeftUrl} onChange={(e) => setSignatureLeftUrl(e.target.value)} placeholder="URL da Imagem ou Caminho" className="text-xs font-mono" />
                          <Button variant="outline" size="icon" onClick={() => { setMediaTarget('sigLeft'); setIsMediaModalOpen(true); }}><ImagePlus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 p-4 border rounded-xl bg-muted/5 transition-colors hover:bg-muted/10 group">
                      <label className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                         <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                         Assinatura Direita
                      </label>
                      <div className="space-y-3">
                        <Input value={footerRight} onChange={(e) => setFooterRight(e.target.value)} placeholder="Cargo / Nome" />
                        <div className="flex gap-2">
                          <Input value={signatureRightUrl} onChange={(e) => setSignatureRightUrl(e.target.value)} placeholder="URL da Imagem ou Caminho" className="text-xs font-mono" />
                          <Button variant="outline" size="icon" onClick={() => { setMediaTarget('sigRight'); setIsMediaModalOpen(true); }}><ImagePlus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="shadow-sm border-2 overflow-hidden sticky top-6">
                <CardHeader className="bg-primary/5 border-b">
                  <CardTitle className="text-lg">Configurações Visuais</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ImagePlus className="h-3 w-3" /> Galeria de Fundos (A4)
                    </label>
                    {backgrounds.length > 0 && (
                      <div className="grid grid-cols-2 gap-2">
                        {backgrounds.map((bg: any) => (
                          <button
                            key={String(bg.id)}
                            type="button"
                            onClick={() => setBgUrl(String(bg.url || ''))}
                            className={`relative aspect-[297/210] rounded-lg overflow-hidden border-2 transition-all group/thumb ${
                              bgUrl === String(bg.url || '')
                                ? 'border-primary ring-2 ring-primary/30'
                                : 'border-slate-200 hover:border-primary/60'
                            }`}
                            title={bg.name || 'Imagem de fundo'}
                          >
                            <img
                              src={bg.url}
                              alt={bg.name || 'Imagem de fundo'}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            {bgUrl === String(bg.url || '') && (
                              <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center shadow">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBackground(bg);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.stopPropagation();
                                  handleDeleteBackground(bg);
                                }
                              }}
                              className="absolute bottom-1 right-1 h-6 w-6 rounded-md bg-black/50 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                              title="Remover da galeria"
                            >
                              <Trash2 className="h-3 w-3" />
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} placeholder="https://..." className="flex-1 overflow-hidden text-ellipsis shadow-none" />
                      <Button variant="secondary" size="icon" onClick={() => { setMediaTarget('bg'); setIsMediaModalOpen(true); }}><ImagePlus className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight italic">Selecione uma imagem da galeria ou use o botão lateral para abrir a biblioteca do sistema.</p>
                    {bgUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-xs font-bold"
                        onClick={() => handleAddBackground(bgUrl)}
                        disabled={createBackground.isPending || backgrounds.some((bg: any) => bg.url === bgUrl)}
                      >
                        {createBackground.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        {backgrounds.some((bg: any) => bg.url === bgUrl) ? 'Já está na galeria' : 'Adicionar à galeria'}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ImagePlus className="h-3 w-3" /> Posição da Logo
                    </label>
                    <Select value={logoPosition} onValueChange={setLogoPosition}>
                      <SelectTrigger className="w-full h-11 bg-muted/20 border-2">
                        <SelectValue placeholder="Escolha a posição" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="integrated">Integrada no texto (Shortcode)</SelectItem>
                        <SelectItem value="top-left">Topo Esquerda</SelectItem>
                        <SelectItem value="top-center">Topo Centralizado</SelectItem>
                        <SelectItem value="top-right">Topo Direita</SelectItem>
                        <SelectItem value="bottom-left">Rodapé Esquerda</SelectItem>
                        <SelectItem value="bottom-center">Rodapé Centralizado</SelectItem>
                        <SelectItem value="bottom-right">Rodapé Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <QrCode className="h-3 w-3" /> Posição do QR Code
                    </label>
                    <Select value={qrPosition} onValueChange={setQrPosition}>
                      <SelectTrigger className="w-full h-11 bg-muted/20 border-2">
                        <SelectValue placeholder="Escolha a posição" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="integrated">Integrado no texto (Shortcode)</SelectItem>
                        <SelectItem value="top-left">Topo Esquerda</SelectItem>
                        <SelectItem value="top-center">Topo Centralizado</SelectItem>
                        <SelectItem value="top-right">Topo Direita</SelectItem>
                        <SelectItem value="bottom-left">Rodapé Esquerda</SelectItem>
                        <SelectItem value="bottom-center">Rodapé Centralizado</SelectItem>
                        <SelectItem value="bottom-right">Rodapé Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Margens do Conteúdo (mm)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Superior</label>
                        <Input type="number" min={0} max={80} value={marginTop} onChange={(e) => setMarginTop(Number(e.target.value))} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Direita</label>
                        <Input type="number" min={0} max={80} value={marginRight} onChange={(e) => setMarginRight(Number(e.target.value))} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Inferior</label>
                        <Input type="number" min={0} max={80} value={marginBottom} onChange={(e) => setMarginBottom(Number(e.target.value))} className="h-9 text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted-foreground">Esquerda</label>
                        <Input type="number" min={0} max={80} value={marginLeft} onChange={(e) => setMarginLeft(Number(e.target.value))} className="h-9 text-sm" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cor de Destaque (Título)</label>
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-20 rounded-lg border-2 p-1 bg-background shadow-sm overflow-hidden flex items-center">
                        <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-[200%] w-[200%] cursor-pointer border-0 translate-x-[-25%] translate-y-[-25%]" />
                      </div>
                      <code className="bg-muted px-2 py-1 rounded text-[10px] font-mono uppercase tracking-widest">{accentColor}</code>
                    </div>
                  </div>

                  <div className="pt-6 border-t mt-6">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Shortcodes Disponíveis</h4>
                    <div className="flex flex-wrap gap-2">
                      {['logo', 'studentName', 'courseName', 'completionDate', 'startDate', 'endDate', 'hours', 'qrcode'].map(tag => (
                        <span key={tag} className="px-2 py-1 bg-accent/50 text-accent-foreground text-[10px] font-mono rounded border font-bold block transition-all hover:scale-105">
                          {'{'}{tag}{'}'}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="animate-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col items-center gap-6">
             <div className="bg-muted/20 border-2 border-dashed rounded-3xl p-4 md:p-12 w-full flex justify-center shadow-inner overflow-hidden relative">
                {/* Real Size Simulation */}
                <div
                  className="bg-white shadow-[0_30px_70px_rgba(0,0,0,0.2)] relative w-full max-w-[1280px] border ring-1 ring-black/5 rounded-sm"
                  style={{ aspectRatio: '297 / 210' }}
                >
                  {bgUrl && (
                    <div className="absolute inset-0 z-0 bg-no-repeat" style={{ backgroundImage: `url(${bgUrl})`, backgroundSize: '100% 100%' }} />
                  )}

                  {/* Fixed Position QR Code */}
                  {qrPosition !== 'integrated' && (
                    <QrPlaceholder className={qrFixedStyles} />
                  )}

                  {/* Fixed Position Logo */}
                  {logoPosition !== 'integrated' && (
                    <LogoPlaceholder className={logoFixedStyles} />
                  )}

                  <div className="relative z-10 w-full h-full flex flex-col items-center justify-center text-center" style={{ padding: `${marginTop * 4.3}px ${marginRight * 4.3}px ${marginBottom * 4.3}px ${marginLeft * 4.3}px` }}>
                    {showTitle && (
                      <h2 className="text-3xl md:text-6xl font-black mb-8 md:mb-14 tracking-tight drop-shadow-sm select-none" style={{ color: accentColor }}>
                        {title || 'CERTIFICADO'}
                      </h2>
                    )}

                    <div
                      className="text-lg md:text-3xl md:leading-[1.4] max-w-[90%] mx-auto w-full prose prose-sm md:prose-2xl font-serif text-gray-800 select-none antialiased"
                      style={{ textShadow: '0px 0.5px 1px rgba(255,255,255,0.8)' }}
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />

                    <div className="absolute bottom-12 md:bottom-24 left-0 right-0 px-24 md:px-48 grid grid-cols-2 gap-24 md:gap-48">
                      <div className="text-center flex flex-col justify-end items-center" style={{ minHeight: '120px' }}>
                        {signatureLeftUrl && <img src={signatureLeftUrl} className="h-[60px] md:h-[100px] object-contain mb-3 drop-shadow-sm" alt="Assinatura" />}
                        <div className="border-t-2 border-gray-900 mb-3 w-full opacity-30"></div>
                        <div className="text-xs md:text-lg font-bold text-gray-800 uppercase tracking-widest leading-none drop-shadow-sm">{footerLeft || ' '}</div>
                      </div>
                      <div className="text-center flex flex-col justify-end items-center" style={{ minHeight: '120px' }}>
                        {signatureRightUrl && <img src={signatureRightUrl} className="h-[60px] md:h-[100px] object-contain mb-3 drop-shadow-sm" alt="Assinatura" />}
                        <div className="border-t-2 border-gray-900 mb-3 w-full opacity-30"></div>
                        <div className="text-xs md:text-lg font-bold text-gray-800 uppercase tracking-widest leading-none drop-shadow-sm">{footerRight || ' '}</div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
             <div className="text-center max-w-lg mb-12 flex flex-col items-center gap-2">
                <div className="bg-primary/10 text-primary p-3 rounded-full mb-2">
                   <Eye className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-lg">Simulação de Alta Resolução</h3>
                <p className="text-sm text-muted-foreground italic">
                   Esta é uma representação fiel do documento final. O PDF oficial será gerado com estas proporções e alta qualidade de impressão.
                </p>
             </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Model Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo modelo de certificado</DialogTitle>
            <DialogDescription>
              Crie um modelo e opcionalmente vincule a uma turma. O editor será carregado com o layout atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome do modelo</Label>
              <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Certificado Turma 2024" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-turma">Turma (opcional)</Label>
              <Combobox
                options={[
                  { value: '__new_turma__', label: 'Criar nova turma', description: 'Cadastro rápido sem sair da tela' },
                  ...turmaOptions,
                ]}
                value={newTurma}
                onValueChange={(v) => {
                  if (v === '__new_turma__') {
                    setNewTurma('');
                    setIsQuickTurmaOpen(true);
                  } else {
                    setNewTurma(v);
                  }
                }}
                placeholder="Nenhuma (modelo padrão)"
                searchPlaceholder="Buscar turma ou criar nova..."
                onSearch={(term) => setTurmaSearch(term)}
                searchTerm={turmaSearch}
                loading={turmasQuery.isLoading}
                className="truncate w-full"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createModel.isPending}>
              {createModel.isPending ? 'Criando...' : 'Criar modelo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Create Turma Dialog */}
      <Dialog open={isQuickTurmaOpen} onOpenChange={setIsQuickTurmaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Nova turma (cadastro rápido)
            </DialogTitle>
            <DialogDescription>
              Crie a turma com os campos mínimos. Ela será vinculada ao modelo após a criação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="quick-turma-nome">Nome da turma *</Label>
              <Input
                id="quick-turma-nome"
                value={quickTurmaNome}
                onChange={(e) => setQuickTurmaNome(e.target.value)}
                placeholder="Ex: Turma 2024 - Manhã"
              />
            </div>
            <div className="space-y-2">
              <Label>Curso *</Label>
              <Combobox
                options={quickCourseOptions}
                value={quickTurmaCurso}
                onValueChange={(v) => setQuickTurmaCurso(v)}
                placeholder="Selecione o curso..."
                searchPlaceholder="Buscar curso..."
                onSearch={(term) => setQuickCourseSearch(term)}
                searchTerm={quickCourseSearch}
                loading={quickCoursesQuery.isLoading}
                className="truncate w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="quick-turma-inicio">Início</Label>
                <Input
                  id="quick-turma-inicio"
                  type="date"
                  value={quickTurmaInicio}
                  onChange={(e) => setQuickTurmaInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quick-turma-fim">Término</Label>
                <Input
                  id="quick-turma-fim"
                  type="date"
                  value={quickTurmaFim}
                  onChange={(e) => setQuickTurmaFim(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-turma-cidade">Cidade</Label>
              <Input
                id="quick-turma-cidade"
                value={quickTurmaCidade}
                onChange={(e) => setQuickTurmaCidade(e.target.value)}
                placeholder="Cidade da turma"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsQuickTurmaOpen(false)} disabled={isCreatingQuickTurma}>Cancelar</Button>
            <Button
              type="button"
              onClick={handleQuickCreateTurma}
              disabled={isCreatingQuickTurma || !quickTurmaNome.trim() || !quickTurmaCurso}
            >
              {isCreatingQuickTurma && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreatingQuickTurma ? 'Criando...' : 'Criar turma'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Model Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir modelo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o modelo "{selectedModel?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={deleteModel.isPending}>
              {deleteModel.isPending ? 'Excluindo...' : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MediaLibraryModal
        open={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        defaultFilters={{ mime: 'image/' }}
        onSelect={(item) => {
          const url = item.file?.url || item.url || '';
          if (mediaTarget === 'bg') setBgUrl(url);
          else if (mediaTarget === 'sigLeft') setSignatureLeftUrl(url);
          else if (mediaTarget === 'sigRight') setSignatureRightUrl(url);
          setIsMediaModalOpen(false);
        }}
      />
    </div>
  );
}
