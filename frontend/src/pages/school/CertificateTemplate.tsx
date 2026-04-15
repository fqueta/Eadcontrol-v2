import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useCertificateTemplate, useSaveCertificateTemplate } from '@/hooks/certificates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal';
import { ImagePlus, Save, Layout } from 'lucide-react';
import { RichTextEditor } from '@/components/ui/RichTextEditor';

/**
 * CertificateTemplate
 * pt-BR: Página para criação/edição de modelo de certificado. Salva modelo no backend
 *        e oferece pré-visualização em tempo real da renderização final.
 * en-US: Page to create/edit certificate template. Saves template to backend
 *        and offers real-time preview of the final rendering.
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
  // en-US: Loads template from backend.
  useEffect(() => {
    if (backendTemplate) {
      console.log('[CertificateTemplate] Hydrating from backend:', backendTemplate);
      const tpl = (backendTemplate as any).config || {};
      
      // Se o tpl for um array vazio (erro de cast comum), pula
      if (Array.isArray(tpl) && tpl.length === 0) return;

      if (tpl.title) setTitle(String(tpl.title));
      if (tpl.body) setBody(String(tpl.body));
      if (tpl.footerLeft) setFooterLeft(String(tpl.footerLeft));
      if (tpl.footerRight) setFooterRight(String(tpl.footerRight));
      if (tpl.signatureLeftUrl !== undefined) setSignatureLeftUrl(String(tpl.signatureLeftUrl || ''));
      if (tpl.signatureRightUrl !== undefined) setSignatureRightUrl(String(tpl.signatureRightUrl || ''));
      if (tpl.bgUrl !== undefined) setBgUrl(String(tpl.bgUrl || ''));
      if (tpl.accentColor) setAccentColor(String(tpl.accentColor));
    } else {
      try {
        const raw = localStorage.getItem('certificateTemplate');
        if (raw) {
          const tpl = JSON.parse(raw);
          if (tpl.title) setTitle(tpl.title);
          // ... etc
        }
      } catch {}
    }
  }, [backendTemplate]);

  // pt-BR: Pré-visualização com placeholders de exemplo.
  // en-US: Preview using example placeholders.
  const preview = useMemo(() => {
    const sample = {
      studentName: 'Aluno Exemplo',
      courseName: 'Curso Interativo de Gestão',
      completionDate: '01/02/2025',
      hours: '40 horas',
      qrcode: `<div class="inline-flex flex-col items-center justify-center border-2 border-dashed border-gray-300 w-[90px] h-[90px] rounded-lg shadow-sm bg-white pointer-events-none align-middle my-2">
                <span class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">QR CODE</span>
                <span class="text-[7px] text-gray-400">dinâmico</span>
               </div>`
    } as Record<string, string>;
    return body.replace(/\{(.*?)\}/g, (_, key) => sample[key] ?? `{${key}}`);
  }, [body]);

  // pt-BR: Salva o modelo no backend (fallback localStorage em erro).
  // en-US: Saves template to backend (fallback to localStorage on error).
  async function handleSave() {
    const payload = { title, body, footerLeft, footerRight, signatureLeftUrl, signatureRightUrl, bgUrl, accentColor };
    try {
      await saveTemplate.mutateAsync(payload);
      toast({ title: 'Modelo salvo', description: 'Modelo de certificado salvo no backend com sucesso.' });
    } catch (e) {
      try {
        localStorage.setItem('certificateTemplate', JSON.stringify(payload));
        toast({ title: 'Modelo salvo localmente', description: 'Backend indisponível, modelo salvo no navegador.' });
      } catch {
        toast({ title: 'Falha ao salvar', description: 'Não foi possível salvar o modelo.', variant: 'destructive' });
      }
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto auto-rows-min">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Modelo de Certificado</h1>
          <p className="text-muted-foreground text-sm">
            Personalize a aparência do certificado emitido aos alunos.
          </p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Editor Settings Form */}
        <div className="xl:col-span-5 space-y-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Detalhes e Textos</CardTitle>
              <CardDescription>
                Utilize as varíaveis {'{studentName}'}, {'{courseName}'}, {'{completionDate}'}, {'{hours}'} e {'{qrcode}'} para tornar o texto dinâmico.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Título do Certificado</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Certificado de Conclusão" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Corpo do Texto (HTML)</label>
                <RichTextEditor 
                  value={body} 
                  onChange={(html) => setBody(html)} 
                  placeholder="Escreva o texto do certificado aqui..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Assinatura Esquerda</label>
                  <Input value={footerLeft} onChange={(e) => setFooterLeft(e.target.value)} placeholder="Coordenador" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Assinatura Direita</label>
                  <Input value={footerRight} onChange={(e) => setFooterRight(e.target.value)} placeholder="Diretor" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Assinatura Esquerda (Imagem URL)</label>
                  <div className="flex gap-2">
                    <Input value={signatureLeftUrl} onChange={(e) => setSignatureLeftUrl(e.target.value)} placeholder="https://.../assinatura1.png" className="flex-1" />
                    <Button 
                      variant="outline" size="icon" 
                      onClick={() => { setMediaTarget('sigLeft'); setIsMediaModalOpen(true); }}
                      title="Selecionar assinatura"
                    >
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">Assinatura Direita (Imagem URL)</label>
                  <div className="flex gap-2">
                    <Input value={signatureRightUrl} onChange={(e) => setSignatureRightUrl(e.target.value)} placeholder="https://.../assinatura2.png" className="flex-1" />
                    <Button 
                      variant="outline" size="icon" 
                      onClick={() => { setMediaTarget('sigRight'); setIsMediaModalOpen(true); }}
                      title="Selecionar assinatura"
                    >
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Imagem de fundo (Background)</label>
                  <div className="flex gap-2">
                    <Input 
                      value={bgUrl} 
                      onChange={(e) => setBgUrl(e.target.value)} 
                      placeholder="https://.../meu-certificado.png" 
                      className="flex-1"
                    />
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => { setMediaTarget('bg'); setIsMediaModalOpen(true); }}
                      title="Selecionar imagem da biblioteca"
                    >
                      <ImagePlus className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Cor do Título</label>
                  <div className="h-10 w-[80px] rounded-md border p-1 overflow-hidden focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                    <input 
                      type="color" 
                      value={accentColor} 
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-full w-full border-0 p-0 cursor-pointer bg-transparent" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview Pane */}
        <div className="xl:col-span-7 bg-muted/30 border rounded-xl overflow-hidden p-4 sm:p-8 flex flex-col items-center justify-center min-h-[500px]">
          <div className="w-full max-w-[1000px]">
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 ml-1 flex items-center justify-between">
              <span>Pré-visualização do PDF Final</span>
              <span>Proporção A4 (Paisagem)</span>
            </div>
            
            {/* The A4 Canvas Simulation */}
            <div 
              className="bg-white shadow-xl relative w-full border overflow-hidden" 
              style={{ aspectRatio: '297 / 210' }} // A4 landscape aspect ratio approx
            >
              {bgUrl && (
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat" 
                  style={{ backgroundImage: `url(${bgUrl})` }} 
                />
              )}
              
              {/* Content layer */}
              <div className="relative z-10 w-full h-full p-8 md:p-14 flex flex-col items-center justify-center text-center">
                <h2 className="text-2xl md:text-5xl font-bold mb-6 md:mb-10 drop-shadow-sm" style={{ color: accentColor }}>
                  {title || 'Sem Título'}
                </h2>
                
                <div 
                  className="text-sm md:text-xl md:leading-relaxed max-w-[85%] mx-auto w-full prose prose-sm md:prose-xl" 
                  style={{ color: '#374151', textShadow: '0px 0.5px 1px rgba(255,255,255,0.7)' }}
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
                
                <div className="absolute bottom-6 md:bottom-16 left-0 right-0 px-12 md:px-24 grid grid-cols-2 gap-12 md:gap-24">
                  <div className="text-center flex flex-col justify-end items-center" style={{ minHeight: '80px' }}>
                    {signatureLeftUrl && (
                      <img src={signatureLeftUrl} className="h-[40px] md:h-[60px] object-contain mb-1" alt="Assinatura" />
                    )}
                    <div className="border-t border-gray-400 mb-2 md:mb-3 w-full"></div>
                    <div className="text-[10px] md:text-sm font-medium text-gray-600">{footerLeft || ' '}</div>
                  </div>
                  <div className="text-center flex flex-col justify-end items-center" style={{ minHeight: '80px' }}>
                    {signatureRightUrl && (
                      <img src={signatureRightUrl} className="h-[40px] md:h-[60px] object-contain mb-1" alt="Assinatura" />
                    )}
                    <div className="border-t border-gray-400 mb-2 md:mb-3 w-full"></div>
                    <div className="text-[10px] md:text-sm font-medium text-gray-600">{footerRight || ' '}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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