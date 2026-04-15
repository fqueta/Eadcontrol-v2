import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEnrollment } from '@/hooks/enrollments';
import { useCertificateTemplate } from '@/hooks/certificates';
import { Download, Printer } from 'lucide-react';
import { generateCertificatePdf } from '@/lib/certificates/generateCertificatePdf';

/**
 * CertificateView
 * pt-BR: Página de certificado do aluno, renderizável e imprimível. Usa o modelo salvo
 *        no backend e substitui placeholders com dados da matrícula. Suporta visualização
 *        em paisagem (Landscape) para impressão direta ou download via backend.
 * en-US: Student certificate page, renderable and printable. Uses template
 *        from backend and replaces placeholders with enrollment data. Supports
 *        Landscape view for direct printing or download via backend.
 */
export default function CertificateView() {
  const { enrollmentId } = useParams();
  const id = String(enrollmentId || '');

  // pt-BR: Carrega matrícula por ID.
  // en-US: Loads enrollment by ID.
  const { data: enrollment } = useEnrollment(id, { enabled: !!id });

  // pt-BR: Carrega modelo do backend (fallback localStorage) e aplica placeholders.
  // en-US: Loads template from backend (fallback localStorage) and applies placeholders.
  const [template, setTemplate] = useState({
    title: 'Certificado de Conclusão',
    body: 'Certificamos que {studentName} concluiu o curso {courseName} em {completionDate}, com carga horária de {hours}.',
    footerLeft: 'Coordenador',
    footerRight: 'Diretor',
    signatureLeftUrl: '',
    signatureRightUrl: '',
    bgUrl: '',
    accentColor: '#111827',
  } as any);
  const { data: backendTemplate } = useCertificateTemplate();

  useEffect(() => {
    if (backendTemplate) {
      setTemplate((backendTemplate as any).config);
      return;
    }
    try {
      const raw = localStorage.getItem('certificateTemplate');
      if (raw) setTemplate(JSON.parse(raw));
    } catch {}
  }, [backendTemplate]);

  // pt-BR: Resolve dados da matrícula para placeholders.
  // en-US: Resolves enrollment data for placeholders.
  const placeholders = useMemo(() => {
    const studentName = String((enrollment as any)?.student_name || (enrollment as any)?.name || (enrollment as any)?.cliente_nome || '');
    const courseName = String((enrollment as any)?.course_name || (enrollment as any)?.curso_nome || '');
    const hours = String((enrollment as any)?.hours || (enrollment as any)?.curso_carga_horaria || (enrollment as any)?.carga_horaria || '');
    const completionDate = String((enrollment as any)?.completion_date || (enrollment as any)?.data_conclusao || '');
    return { studentName, courseName, hours, completionDate } as Record<string, string>;
  }, [enrollment]);

  // pt-BR: Aplica placeholders ao corpo do certificado.
  // en-US: Applies placeholders to the certificate body.
  const bodyResolved = useMemo(() => {
    return String(template?.body || '').replace(/\{(.*?)\}/g, (_, key) => placeholders[key] ?? `{${key}}`);
  }, [template, placeholders]);

  // pt-BR: Ação para impressão via diálogo do navegador.
  // en-US: Action to print via browser print dialog.
  function handlePrint() {
    window.print();
  }

  // pt-BR: Ação para baixar o PDF gerado pelo backend (DOMPDF).
  // en-US: Action to download the backend-generated PDF (DOMPDF).
  async function handleDownloadApi() {
    if (!id) return;
    try {
      await generateCertificatePdf({
        enrollmentId: id,
        studentName: placeholders.studentName || 'Aluno',
        courseTitle: placeholders.courseName || 'Curso',
        workloadLabel: placeholders.hours || '---',
      });
    } catch (err) {
      console.error('Falha ao baixar PDF:', err);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 no-print p-4">
      <div className="max-w-[1100px] mx-auto mb-6 flex justify-between items-center no-print">
        <div>
           <h2 className="text-xl font-bold text-slate-800">Visualização do Certificado</h2>
           <p className="text-sm text-slate-500">#{id} - {placeholders.studentName}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleDownloadApi} className="gap-2">
            <Download className="h-4 w-4" /> Baixar PDF
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      {/* The Certificate Canvas - A4 Landscape (approx 297x210mm) */}
      <div className="mx-auto bg-white shadow-2xl relative overflow-hidden" style={{ width: '297mm', height: '210mm', minWidth: '297mm' }}>
        {template?.bgUrl && (
          <div
            className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-center"
            style={{ backgroundImage: `url(${template.bgUrl})` }}
          />
        )}
        
        <div className="relative z-10 w-full h-full p-16 md:p-24 flex flex-col items-center justify-center text-center">
          <h1 
            className="text-4xl md:text-6xl font-bold mb-8 md:mb-12" 
            style={{ color: template?.accentColor || '#111827' }}
          >
            {template?.title}
          </h1>
          
          <p 
            className="text-lg md:text-2xl leading-relaxed max-w-[90%] mx-auto" 
            style={{ color: '#374151' }}
          >
            {bodyResolved}
          </p>
          
          {/* QR Code Validation */}
          <div className="mt-8 md:mt-12 flex justify-center">
            <img
              alt="QR Code"
              className="w-24 h-24 md:w-32 md:h-32 opacity-90"
              src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(`${window.location.origin}/certificado/validar/${encodeURIComponent(id)}`)}`}
            />
          </div>

          <div className="absolute bottom-12 md:bottom-20 left-0 right-0 px-24 md:px-40 grid grid-cols-2 gap-24 md:gap-40">
            <div className="text-center flex flex-col justify-end items-center" style={{ minHeight: '100px' }}>
              {template?.signatureLeftUrl && (
                <img src={template.signatureLeftUrl} className="h-12 md:h-20 object-contain mb-2" alt="Assinatura" />
              )}
              <div className="border-t border-gray-400 w-full mb-2"></div>
              <div className="text-xs md:text-sm font-medium text-gray-600">{template?.footerLeft}</div>
            </div>
            <div className="text-center flex flex-col justify-end items-center" style={{ minHeight: '100px' }}>
              {template?.signatureRightUrl && (
                <img src={template.signatureRightUrl} className="h-12 md:h-20 object-contain mb-2" alt="Assinatura" />
              )}
              <div className="border-t border-gray-400 w-full mb-2"></div>
              <div className="text-xs md:text-sm font-medium text-gray-600">{template?.footerRight}</div>
            </div>
          </div>
        </div>
      </div>

      {/* pt-BR: CSS de impressão para formato A4 Paisagem e ocultar UI de controle */}
      {/* en-US: Print CSS for A4 Landscape and hide control UI */}
      <style>
        {`
          @media print {
            .no-print { display: none; }
            @page { size: A4 landscape; margin: 0; }
            body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; background: none; }
            html, body, #root { height: 100%; width: 100%; overflow: hidden; }
            .mx-auto { margin: 0 !important; border: none !important; box-shadow: none !important; }
          }
        `}
      </style>
    </div>
  );
}