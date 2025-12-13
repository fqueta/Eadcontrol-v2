import React from 'react';
import { useParams } from 'react-router-dom';
import { useEnrollment } from '@/hooks/enrollments';

/**
 * CertificateValidate
 * pt-BR: Página pública simples para validar um certificado por ID de matrícula.
 * en-US: Simple public page to validate a certificate by enrollment ID.
 */
export default function CertificateValidate() {
  const { enrollmentId } = useParams();
  const id = String(enrollmentId || '');
  const { data: enrollment, isLoading, error } = useEnrollment(id, { enabled: !!id });

  const hasCertificate = Boolean((enrollment as any)?.preferencias?.certificate_url);
  const statusText = String((enrollment as any)?.status || '').toLowerCase();
  const isConcluded = statusText.includes('conclu') || statusText.includes('finaliz') || statusText.includes('complet') || hasCertificate;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Validação de Certificado</h1>
      {isLoading && <p>Carregando...</p>}
      {error && <p className="text-red-600">Erro ao carregar matrícula.</p>}
      {!isLoading && !error && (
        <div className="space-y-3">
          <p><strong>Matrícula:</strong> {id}</p>
          <p><strong>Aluno:</strong> {String((enrollment as any)?.student_name || (enrollment as any)?.name || '-')}</p>
          <p><strong>Curso:</strong> {String((enrollment as any)?.course_name || (enrollment as any)?.curso_nome || '-')}</p>
          <p><strong>Status:</strong> {String((enrollment as any)?.status || '-')}</p>
          <p>
            <strong>Certificado válido:</strong> {isConcluded ? 'Sim' : 'Não'}
            {isConcluded && hasCertificate && (
              <>
                {' '}(<a href={(enrollment as any)?.preferencias?.certificate_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">ver certificado</a>)
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}