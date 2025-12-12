import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useEnrollment } from '@/hooks/enrollments';

/**
 * CertificateView
 * pt-BR: Página de certificado do aluno, renderizável e imprimível. Usa o modelo salvo
 *        em localStorage e substitui placeholders com dados da matrícula.
 * en-US: Student certificate page, renderable and printable. Uses template
 *        from localStorage and replaces placeholders with enrollment data.
 */
export default function CertificateView() {
  const { enrollmentId } = useParams();
  const id = String(enrollmentId || '');

  // pt-BR: Carrega matrícula por ID.
  // en-US: Loads enrollment by ID.
  const { data: enrollment } = useEnrollment(id, { enabled: !!id });

  // pt-BR: Carrega modelo de certificado do localStorage e aplica placeholders.
  // en-US: Loads certificate template and applies placeholders.
  const [template, setTemplate] = useState({
    title: 'Certificado de Conclusão',
    body: 'Certificamos que {studentName} concluiu o curso {courseName} em {completionDate}, com carga horária de {hours} horas.',
    footerLeft: 'Coordenador',
    footerRight: 'Diretor',
    bgUrl: '',
    accentColor: '#111827',
  } as any);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('certificateTemplate');
      if (raw) setTemplate(JSON.parse(raw));
    } catch (e) {
      // fallback permanece com default
    }
  }, []);

  // pt-BR: Resolve dados da matrícula para placeholders.
  // en-US: Resolves enrollment data for placeholders.
  const placeholders = useMemo(() => {
    const studentName = String((enrollment as any)?.student_name || (enrollment as any)?.name || '');
    const courseName = String((enrollment as any)?.course_name || (enrollment as any)?.curso_nome || '');
    const hours = String((enrollment as any)?.curso_carga_horaria || (enrollment as any)?.carga_horaria || '');
    const completionDate = String((enrollment as any)?.completion_date || (enrollment as any)?.data_conclusao || '');
    return { studentName, courseName, hours, completionDate } as Record<string, string>;
  }, [enrollment]);

  // pt-BR: Aplica placeholders ao corpo do certificado.
  // en-US: Applies placeholders to the certificate body.
  const bodyResolved = useMemo(() => {
    return String(template?.body || '').replace(/\{(.*?)\}/g, (_, key) => placeholders[key] ?? `{${key}}`);
  }, [template, placeholders]);

  // pt-BR: Ação para impressão/geração de PDF via diálogo do navegador.
  // en-US: Action to print/generate PDF via browser print dialog.
  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-4">
      <div className="flex justify-end mb-4 no-print">
        <Button onClick={handlePrint}>Baixar/Imprimir PDF</Button>
      </div>
      <div className="mx-auto bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
        <div
          className="p-12"
          style={{
            backgroundImage: template?.bgUrl ? `url(${template.bgUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <h1 className="text-3xl font-bold text-center" style={{ color: template?.accentColor || '#111827' }}>{template?.title}</h1>
          <p className="mt-8 text-lg leading-8 text-center" style={{ color: '#374151' }}>{bodyResolved}</p>
          <div className="mt-32 grid grid-cols-2 gap-24">
            <div className="text-center">
              <div className="border-t" style={{ borderColor: '#9CA3AF' }}></div>
              <div className="text-sm mt-2" style={{ color: '#6B7280' }}>{template?.footerLeft}</div>
            </div>
            <div className="text-center">
              <div className="border-t" style={{ borderColor: '#9CA3AF' }}></div>
              <div className="text-sm mt-2" style={{ color: '#6B7280' }}>{template?.footerRight}</div>
            </div>
          </div>
        </div>
      </div>

      {/* pt-BR: CSS de impressão para formato A4 e ocultar UI de controle */}
      {/* en-US: Print CSS for A4 and hide control UI */}
      <style>
        {`
          @media print {
            .no-print { display: none; }
            @page { size: A4; margin: 0; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            html, body, #root { height: auto; }
          }
        `}
      </style>
    </div>
  );
}