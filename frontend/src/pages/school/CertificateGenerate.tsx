import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useUpdateEnrollment } from '@/hooks/enrollments';
import { useToast } from '@/hooks/use-toast';

/**
 * CertificateGenerate
 * pt-BR: Página administrativa simples para vincular a URL de certificado a uma matrícula.
 *        Usa a rota pública do aluno `/aluno/certificado/:id` e salva em `preferencias.certificate_url`.
 * en-US: Simple admin page to link certificate URL to an enrollment.
 *        Uses student route `/aluno/certificado/:id` and saves into `preferencias.certificate_url`.
 */
export default function CertificateGenerate() {
  const [enrollmentId, setEnrollmentId] = useState('');
  const { toast } = useToast();
  const updateEnrollment = useUpdateEnrollment();

  // pt-BR: Gera URL e salva na matrícula.
  // en-US: Generates URL and saves into enrollment.
  async function handleGenerate() {
    const id = String(enrollmentId || '').trim();
    if (!id) {
      toast({ title: 'Informe a matrícula', description: 'Digite o ID da matrícula para gerar o certificado.', variant: 'destructive' });
      return;
    }
    const url = `${window.location.origin}/aluno/certificado/${encodeURIComponent(id)}`;
    try {
      await updateEnrollment.mutateAsync({ id, data: { preferencias: { certificate_url: url } } } as any);
      toast({ title: 'Certificado vinculado', description: `URL registrada na matrícula #${id}.` });
    } catch (e) {
      toast({ title: 'Falha ao salvar', description: 'Não foi possível vincular o certificado.', variant: 'destructive' });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Gerar/Vincular Certificado</h1>
        <p className="text-muted-foreground">Informe o ID da matrícula para vincular a página de certificado do aluno.</p>
      </div>
      <div className="flex items-end gap-3 max-w-md">
        <div className="flex-1">
          <label className="text-sm font-medium">ID da Matrícula</label>
          <Input value={enrollmentId} onChange={(e) => setEnrollmentId(e.target.value)} placeholder="Ex.: 123" />
        </div>
        <Button onClick={handleGenerate} disabled={updateEnrollment.isLoading}>Vincular certificado</Button>
      </div>
      <p className="text-xs text-muted-foreground">Após vincular, o aluno poderá acessar em “Área do Aluno” pelos atalhos de certificado (quando disponível).</p>
    </div>
  );
}