import React, { useEffect, useMemo, useState } from 'react';
// HMR Force Update: Refreshing editor components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCertificateTemplate, useSaveCertificateTemplate } from '@/hooks/certificates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal';
import { ImagePlus, Save, Layout, Edit3, Eye } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * CertificateTemplate
 * pt-BR: Página para criação/edição de modelo de certificado. Salva modelo no backend
 *        e oferece pré-visualização em tempo real via abas para evitar distorção.
 * en-US: Page to create/edit certificate template. Saves template to backend
 *        and offers real-time preview via tabs to avoid distortion.
 */
export default function CertificateTemplate() {
  const { toast } = useToast();
  const { data: backendTemplate, isLoading } = useCertificateTemplate({
    refetchOnMount: 'always',
    staleTime: 0
  });
  const saveTemplate = useSaveCertificateTemplate();
  
  const [title, setTitle] = useState('Certificado de Conclusão');
  const [body, setBody] = useState(
    'Certificamos que {studentName} concluiu o curso {courseName} em {completionDate}, com carga horária de {hours}.'
  );
  const [footerLeft, setFooterLeft] = useState('Coordenador');
  const [footerRight, setFooterRight] = useState('Diretor');
  const [signatureLeftUrl, setSignatureLeftUrl] = useState('');
  const [signatureRightUrl, setSignatureRightUrl] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#111827');
  
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaTarget, setMediaTarget] = useState<'bg' | 'sigLeft' | 'sigRight'>('bg');

  // pt-BR: Carrega modelo do backend.
  useEffect(() => {
    if (backendTemplate) {
      const tpl = (backendTemplate as any).config || {};
      if (Array.isArray(tpl) && tpl.length === 0) return;

      if (tpl.title) setTitle(String(tpl.title));
      if (tpl.body) setBody(String(tpl.body));
      if (tpl.footerLeft) setFooterLeft(String(tpl.footerLeft));
      if (tpl.footerRight) setFooterRight(String(tpl.footerRight));
      if (tpl.signatureLeftUrl !== undefined) setSignatureLeftUrl(String(tpl.signatureLeftUrl || ''));
      if (tpl.signatureRightUrl !== undefined) setSignatureRightUrl(String(tpl.signatureRightUrl || ''));
      if (tpl.bgUrl !== undefined) setBgUrl(String(tpl.bgUrl || ''));
      if (tpl.accentColor) setAccentColor(String(tpl.accentColor));
    }
  }, [backendTemplate]);

  // pt-BR: Pré-visualização com placeholders de exemplo.
  const preview = useMemo(() => {
    const sample = {
      studentName: 'Aluno Exemplo',
      courseName: 'Curso Interativo de Gestão',
      completionDate: '01/02/2025',
      hours: '40 horas',
      qrcode: `<div class="inline-flex flex-col items-center justify-center border-2 border-dashed border-gray-300 w-[90px] h-[90px] rounded-lg shadow-sm bg-white pointer-events-none align-middle my-2 mx-auto">
                <span class="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">QR CODE</span>
                <span class="text-[7px] text-gray-300 italic">dinâmico</span>
               </div>`
    } as Record<string, string>;
    return body.replace(/\{(.*?)\}/g, (_, key) => sample[key] ?? `{${key}}`);
  }, [body]);

  async function handleSave() {
    const payload = { title, body, footerLeft, footerRight, signatureLeftUrl, signatureRightUrl, bgUrl, accentColor };
    try {
      await saveTemplate.mutateAsync(payload);
      toast({ title: 'Modelo salvo', description: 'Modelo de certificado salvo no backend com sucesso.' });
    } catch (e) {
      toast({ title: 'Falha ao salvar', description: 'Não foi possível salvar o modelo.', variant: 'destructive' });
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto auto-rows-min">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Layout className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Modelo de Certificado</h1>
          </div>
          <p className="text-muted-foreground text-sm font-medium">
            Personalize o layout e as informações dinâmicas do certificado.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} className="gap-2 shadow-sm px-6">
            <Save className="h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </div>

      <Tabs defaultValue="editor" className="w-full">
        <div className="flex justify-center mb-6">
          <TabsList className="grid w-[400px] grid-cols-2 shadow-sm border h-11">
            <TabsTrigger value="editor" className="gap-2 text-sm font-semibold">
              <Edit3 className="h-4 w-4" />
              1. Editar Conteúdo
            </TabsTrigger>
            <TabsTrigger value="preview" className="gap-2 text-sm font-semibold">
              <Eye className="h-4 w-4" />
              2. Visualizar Real
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="editor" className="space-y-6 animate-in fade-in transition-all duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <Card className="shadow-sm border-2">
                <CardHeader className="bg-muted/10 pb-4">
                  <CardTitle className="text-xl">Conteúdo do Certificado</CardTitle>
                  <CardDescription>
                    O texto abaixo será renderizado exatamente com essa formatação. Utilize as tags dinâmicas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Título do Certificado</label>
                    <Input 
                      value={title} 
                      onChange={(e) => setTitle(e.target.value)} 
                      placeholder="Ex: Certificado de Conclusão" 
                      className="text-lg font-semibold h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Corpo do Texto (Editor HTML)</label>
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
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/5">
                      <label className="text-sm font-bold uppercase tracking-wider text-primary">Assinatura Esquerda</label>
                      <div className="space-y-3">
                        <Input value={footerLeft} onChange={(e) => setFooterLeft(e.target.value)} placeholder="Cargo / Nome" />
                        <div className="flex gap-2">
                          <Input value={signatureLeftUrl} onChange={(e) => setSignatureLeftUrl(e.target.value)} placeholder="URL da Imagem" className="text-xs" />
                          <Button variant="outline" size="icon" onClick={() => { setMediaTarget('sigLeft'); setIsMediaModalOpen(true); }}><ImagePlus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/5">
                      <label className="text-sm font-bold uppercase tracking-wider text-primary">Assinatura Direita</label>
                      <div className="space-y-3">
                        <Input value={footerRight} onChange={(e) => setFooterRight(e.target.value)} placeholder="Cargo / Nome" />
                        <div className="flex gap-2">
                          <Input value={signatureRightUrl} onChange={(e) => setSignatureRightUrl(e.target.value)} placeholder="URL da Imagem" className="text-xs" />
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
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <ImagePlus className="h-4 w-4" /> Imagem de Fundo (A4)
                    </label>
                    <div className="flex gap-2">
                      <Input value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} placeholder="https://..." className="flex-1 overflow-hidden text-ellipsis" />
                      <Button variant="secondary" size="icon" onClick={() => { setMediaTarget('bg'); setIsMediaModalOpen(true); }}><ImagePlus className="h-4 w-4" /></Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Recomendado: JPG ou PNG em 3508x2480px (300dpi).</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cor de Destaque (Título)</label>
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-24 rounded-lg border-2 p-1 bg-background shadow-sm">
                        <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="h-full w-full cursor-pointer rounded bg-transparent border-0" />
                      </div>
                      <code className="bg-muted px-2 py-1 rounded text-xs font-mono uppercase tracking-widest">{accentColor}</code>
                    </div>
                  </div>

                  <div className="pt-6 border-t mt-6">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Variáveis Disponíveis</h4>
                    <div className="flex flex-wrap gap-2">
                      {['studentName', 'courseName', 'completionDate', 'hours', 'qrcode'].map(tag => (
                        <span key={tag} className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-mono rounded border border-blue-100 font-bold block">
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

        <TabsContent value="preview" className="animate-in slide-in-from-bottom-4 transition-all duration-500">
          <div className="flex flex-col items-center gap-6">
             <div className="bg-muted/20 border-2 border-dashed rounded-2xl p-4 md:p-12 w-full flex justify-center shadow-inner overflow-hidden">
                {/* Real Size Simulation */}
                <div 
                  className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.15)] relative w-full max-w-[1280px] border ring-1 ring-black/5" 
                  style={{ aspectRatio: '297 / 210' }}
                >
                  {bgUrl && (
                    <div className="absolute inset-0 z-0 bg-no-repeat" style={{ backgroundImage: `url(${bgUrl})`, backgroundSize: '100% 100%' }} />
                  )}
                  
                  <div className="relative z-10 w-full h-full p-12 md:p-24 flex flex-col items-center justify-center text-center">
                    <h2 className="text-3xl md:text-6xl font-black mb-8 md:mb-14 tracking-tight drop-shadow-sm" style={{ color: accentColor }}>
                      {title || 'CERTIFICADO'}
                    </h2>
                    
                    <div 
                      className="text-lg md:text-3xl md:leading-[1.4] max-w-[90%] mx-auto w-full prose prose-sm md:prose-2xl font-serif text-gray-800" 
                      style={{ textShadow: '0px 0.5px 1px rgba(255,255,255,0.8)' }}
                      dangerouslySetInnerHTML={{ __html: preview }}
                    />
                    
                    <div className="absolute bottom-12 md:bottom-24 left-0 right-0 px-24 md:px-48 grid grid-cols-2 gap-24 md:gap-48">
                      <div className="text-center flex flex-col justify-end items-center" style={{ minHeight: '120px' }}>
                        {signatureLeftUrl && <img src={signatureLeftUrl} className="h-[60px] md:h-[100px] object-contain mb-3" alt="Assinatura" />}
                        <div className="border-t-2 border-gray-900 mb-3 w-full opacity-30"></div>
                        <div className="text-xs md:text-lg font-bold text-gray-800 uppercase tracking-widest">{footerLeft || ' '}</div>
                      </div>
                      <div className="text-center flex flex-col justify-end items-center" style={{ minHeight: '120px' }}>
                        {signatureRightUrl && <img src={signatureRightUrl} className="h-[60px] md:h-[100px] object-contain mb-3" alt="Assinatura" />}
                        <div className="border-t-2 border-gray-900 mb-3 w-full opacity-30"></div>
                        <div className="text-xs md:text-lg font-bold text-gray-800 uppercase tracking-widest">{footerRight || ' '}</div>
                      </div>
                    </div>
                  </div>
                </div>
             </div>
             <div className="text-center max-w-lg mb-12">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                   <Eye className="h-4 w-4" /> 
                   A visualização acima é uma simulação de alta fidelidade. O PDF final respeitará estas proporções.
                </p>
             </div>
          </div>
        </TabsContent>
      </Tabs>

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