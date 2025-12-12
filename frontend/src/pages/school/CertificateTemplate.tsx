import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

/**
 * CertificateTemplate
 * pt-BR: Página para criação/edição de modelo de certificado. Salva modelo no localStorage
 *        e oferece pré-visualização. Futuramente, pode persistir no backend.
 * en-US: Page to create/edit certificate template. Saves template to localStorage
 *        and offers a preview. In the future, can persist to backend.
 */
export default function CertificateTemplate() {
  const { toast } = useToast();
  const [title, setTitle] = useState('Certificado de Conclusão');
  const [body, setBody] = useState(
    'Certificamos que {studentName} concluiu o curso {courseName} em {completionDate}, com carga horária de {hours} horas.'
  );
  const [footerLeft, setFooterLeft] = useState('Coordenador');
  const [footerRight, setFooterRight] = useState('Diretor');
  const [bgUrl, setBgUrl] = useState('');
  const [accentColor, setAccentColor] = useState('#111827');

  // pt-BR: Carrega modelo existente do localStorage ao montar.
  // en-US: Loads existing template from localStorage on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('certificateTemplate');
      if (raw) {
        const tpl = JSON.parse(raw);
        setTitle(String(tpl.title || title));
        setBody(String(tpl.body || body));
        setFooterLeft(String(tpl.footerLeft || footerLeft));
        setFooterRight(String(tpl.footerRight || footerRight));
        setBgUrl(String(tpl.bgUrl || ''));
        setAccentColor(String(tpl.accentColor || accentColor));
      }
    } catch (e) {
      console.warn('Failed to parse certificate template from localStorage');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // pt-BR: Pré-visualização com placeholders de exemplo.
  // en-US: Preview using example placeholders.
  const preview = useMemo(() => {
    const sample = {
      studentName: 'Aluno Exemplo',
      courseName: 'Curso de Exemplo',
      completionDate: '01/02/2025',
      hours: '40',
    } as Record<string, string>;
    return body.replace(/\{(.*?)\}/g, (_, key) => sample[key] ?? `{${key}}`);
  }, [body]);

  // pt-BR: Salva o modelo no localStorage.
  // en-US: Saves the template to localStorage.
  function handleSave() {
    const payload = { title, body, footerLeft, footerRight, bgUrl, accentColor };
    try {
      localStorage.setItem('certificateTemplate', JSON.stringify(payload));
      toast({ title: 'Modelo salvo', description: 'O modelo de certificado foi salvo com sucesso.' });
    } catch (e) {
      toast({ title: 'Falha ao salvar', description: 'Não foi possível salvar o modelo (localStorage).', variant: 'destructive' });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Modelo de Certificado</h1>
        <p className="text-muted-foreground">Defina o layout e os textos do certificado. Use placeholders: {`{studentName}`}, {`{courseName}`}, {`{completionDate}`}, {`{hours}`}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Título</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Certificado de Conclusão" />
          </div>
          <div>
            <label className="text-sm font-medium">Texto (com placeholders)</label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Assinatura esquerda</label>
              <Input value={footerLeft} onChange={(e) => setFooterLeft(e.target.value)} placeholder="Coordenador" />
            </div>
            <div>
              <label className="text-sm font-medium">Assinatura direita</label>
              <Input value={footerRight} onChange={(e) => setFooterRight(e.target.value)} placeholder="Diretor" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Imagem de fundo (URL)</label>
              <Input value={bgUrl} onChange={(e) => setBgUrl(e.target.value)} placeholder="https://.../bg.png" />
            </div>
            <div>
              <label className="text-sm font-medium">Cor de destaque</label>
              <Input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave}>Salvar modelo</Button>
          </div>
        </div>

        <div>
          <div className="border rounded-md overflow-hidden">
            <div className="p-6 bg-white" style={{ backgroundImage: bgUrl ? `url(${bgUrl})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <h2 className="text-xl font-bold" style={{ color: accentColor }}>{title}</h2>
              <p className="mt-3 text-sm leading-6" style={{ color: '#374151' }}>{preview}</p>
              <div className="mt-12 grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="border-t" style={{ borderColor: '#9CA3AF' }}></div>
                  <div className="text-xs mt-2" style={{ color: '#6B7280' }}>{footerLeft}</div>
                </div>
                <div className="text-center">
                  <div className="border-t" style={{ borderColor: '#9CA3AF' }}></div>
                  <div className="text-xs mt-2" style={{ color: '#6B7280' }}>{footerRight}</div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">A visualização usa dados de exemplo. O PDF do aluno substituirá os placeholders com dados da matrícula.</p>
        </div>
      </div>
    </div>
  );
}